from __future__ import annotations

import signal
import time
from collections.abc import Callable, Mapping
from dataclasses import asdict, dataclass
from datetime import datetime
from datetime import time as wall_time
from threading import Event
from typing import Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

import psycopg

from .boxscore import BoxscoreContractError, sync_competition_stats
from .client import FabCancelledError, FabClient, FabResponseError, FabTransportError
from .discovery import CompetitionDiscoveryError, sync_competition_catalog, sync_competition_teams
from .fantasy_lifecycle import FantasyLifecycleTransportError
from .observability import Observability
from .observability import category as observability_category
from .repository import SportsRepository
from .schedule import ScheduleContractError, sync_competition_games


class CircuitOpenError(RuntimeError):
    pass


@dataclass(frozen=True)
class RetryPolicy:
    attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 8.0


@dataclass
class CircuitBreaker:
    failure_threshold: int = 3
    recovery_seconds: float = 300.0
    failures: int = 0
    opened_at: float | None = None

    def before_call(self, now: float) -> None:
        if self.opened_at is None:
            return
        if now - self.opened_at >= self.recovery_seconds:
            self.failures = 0
            self.opened_at = None
            return
        raise CircuitOpenError("FAB circuit breaker is open")

    def succeeded(self) -> None:
        self.failures = 0
        self.opened_at = None

    def failed(self, now: float) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.opened_at = now


@dataclass(frozen=True)
class OrchestratorSummary:
    competitions: int = 0
    phases_succeeded: int = 0
    phases_failed: int = 0
    skipped_locked: int = 0


@dataclass(frozen=True)
class JourneyWindow:
    weekdays: frozenset[int]
    starts_at: wall_time
    ends_at: wall_time

    def contains(self, value: datetime) -> bool:
        current = value.timetz().replace(tzinfo=None)
        if self.starts_at <= self.ends_at:
            return value.weekday() in self.weekdays and self.starts_at <= current <= self.ends_at
        previous_day = (value.weekday() - 1) % 7
        return (value.weekday() in self.weekdays and current >= self.starts_at) or (
            previous_day in self.weekdays and current <= self.ends_at
        )


class IngestionOrchestrator:
    def __init__(
        self,
        client: FabClient,
        repository: SportsRepository,
        *,
        retry_policy: RetryPolicy | None = None,
        breaker: CircuitBreaker | None = None,
        sleeper: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        fantasy_lifecycle: Callable[[Any], Any] | None = None,
        observability: Observability | None = None,
    ) -> None:
        self.client = client
        self.repository = repository
        self.retry_policy = retry_policy or RetryPolicy()
        self.breaker = breaker or CircuitBreaker()
        self.sleeper = sleeper
        self.clock = clock
        self.fantasy_lifecycle = fantasy_lifecycle
        self.observability = observability or Observability(enabled=False)

    def sync_all(
        self,
        *,
        force_stats: bool = False,
        stop_event: Event | None = None,
        trigger: Literal["manual", "startup", "scheduled"] = "manual",
    ) -> OrchestratorSummary:
        summary = OrchestratorSummary()
        catalog_scan_due = getattr(self.repository, "catalog_scan_due", lambda: False)
        if catalog_scan_due():
            with self.repository.advisory_lock("competition_catalog", UUID(int=0)) as acquired:
                if acquired:
                    try:
                        self._retry(lambda: sync_competition_catalog(self.client, self.repository))
                    except Exception as error:  # noqa: BLE001 - catalog visibility must not block selected competitions
                        self.observability.emit(
                            component="INGESTOR",
                            operation="competition_catalog",
                            result="ERROR",
                            error_category=observability_category(error),
                        )
        for competition_season_id, category_id in self.repository.list_selected_competitions():
            if stop_event is not None and stop_event.is_set():
                break
            run_id = self.repository.start_ingestion_run(
                f"sync_all_{trigger}", competition_season_id
            )
            with self.repository.advisory_lock("sync_all", competition_season_id) as acquired:
                if not acquired:
                    self.repository.finish_ingestion_run(run_id, status="skipped_locked")
                    summary = _add(summary, skipped_locked=1)
                    continue
                phase_ok = phase_failed = 0
                phases = [
                    (
                        "competition",
                        lambda category_id=category_id: sync_competition_teams(
                            self.client,
                            self.repository,
                            category_competition_id=category_id,
                        ),
                    ),
                    (
                        "schedule",
                        lambda category_id=category_id: sync_competition_games(
                            self.client,
                            self.repository,
                            category_competition_id=category_id,
                        ),
                    ),
                    (
                        "stats",
                        lambda category_id=category_id: sync_competition_stats(
                            self.client,
                            self.repository,
                            category_competition_id=category_id,
                            force=force_stats,
                        ),
                    ),
                ]
                if self.fantasy_lifecycle:
                    phases.append((
                        "fantasy_lifecycle",
                        lambda competition_season_id=competition_season_id: self.fantasy_lifecycle(competition_season_id),
                    ))
                for name, operation in phases:
                    if stop_event is not None and stop_event.is_set():
                        break
                    if self._run_phase(name, competition_season_id, operation):
                        phase_ok += 1
                    else:
                        phase_failed += 1
                        break
                status = "cancelled" if stop_event is not None and stop_event.is_set() else (
                    "failed" if phase_failed else "succeeded"
                )
                self.repository.finish_ingestion_run(
                    run_id,
                    status=status,
                    counters={"phases_succeeded": phase_ok, "phases_failed": phase_failed},
                    error_code="PHASE_FAILED" if phase_failed else None,
                )
                summary = _add(
                    summary,
                    competitions=1,
                    phases_succeeded=phase_ok,
                    phases_failed=phase_failed,
                )
        return summary

    def _run_phase(
        self,
        name: str,
        competition_season_id: Any,
        operation: Callable[[], Any],
    ) -> bool:
        run_id = self.repository.start_ingestion_run(name, competition_season_id)
        try:
            result = self._retry(operation)
        except Exception as error:  # noqa: BLE001 - orchestration boundary redacts all failures
            self.observability.emit(component="INGESTOR", operation=name, result="ERROR", error_category=observability_category(error))
            self.repository.finish_ingestion_run(
                run_id, status="failed", error_code=_error_code(error)
            )
            return False
        counters = _safe_counters(result)
        self.repository.finish_ingestion_run(run_id, status="succeeded", counters=counters)
        self.observability.emit(component="INGESTOR", operation=name, result="SUCCESS", error_category="NONE")
        return True

    def _retry(self, operation: Callable[[], Any]) -> Any:
        last_error: Exception | None = None
        for attempt in range(self.retry_policy.attempts):
            self.breaker.before_call(self.clock())
            try:
                result = operation()
            except (FabTransportError, FantasyLifecycleTransportError, psycopg.OperationalError) as error:
                last_error = error
                self.breaker.failed(self.clock())
                if attempt + 1 >= self.retry_policy.attempts:
                    raise
                delay = min(
                    self.retry_policy.max_delay,
                    self.retry_policy.initial_delay * (2**attempt),
                )
                self.sleeper(delay)
            else:
                self.breaker.succeeded()
                return result
        assert last_error is not None
        raise last_error


class Scheduler:
    def __init__(
        self,
        orchestrator: IngestionOrchestrator,
        *,
        idle_minutes: int,
        active_seconds: int,
        windows: tuple[JourneyWindow, ...],
        timezone: str = "Europe/Madrid",
        now: Callable[[], datetime] | None = None,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        if not 60 <= idle_minutes <= 180:
            raise ValueError("idle interval must be between 60 and 180 minutes")
        if not 30 <= active_seconds <= 900:
            raise ValueError("active interval must be between 30 and 900 seconds")
        self.orchestrator = orchestrator
        self.idle_minutes = idle_minutes
        self.active_seconds = active_seconds
        self.windows = windows
        self.timezone = ZoneInfo(timezone)
        self.now = now or (lambda: datetime.now(self.timezone))
        self.monotonic = monotonic

    def interval_seconds(self) -> int:
        active = any(window.contains(self.now().astimezone(self.timezone)) for window in self.windows)
        return self.active_seconds if active else 60 * self.idle_minutes

    def run(self, stop_event: Event) -> None:
        trigger: Literal["startup", "scheduled"] = "startup"
        while not stop_event.is_set():
            cycle_started = self.monotonic()
            self.orchestrator.sync_all(stop_event=stop_event, trigger=trigger)
            trigger = "scheduled"
            elapsed = self.monotonic() - cycle_started
            stop_event.wait(max(0, self.interval_seconds() - elapsed))


WEEKDAYS = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}


def parse_journey_windows(value: str) -> tuple[JourneyWindow, ...]:
    windows = []
    for item in filter(None, (part.strip() for part in value.split(","))):
        try:
            days, hours = item.split(" ", 1)
            start, end = hours.split("-", 1)
            weekdays = frozenset(WEEKDAYS[day] for day in days.split("+"))
            windows.append(
                JourneyWindow(
                    weekdays,
                    wall_time.fromisoformat(start),
                    wall_time.fromisoformat(end),
                )
            )
        except (KeyError, ValueError) as error:
            raise ValueError("invalid FAB_JOURNEY_WINDOWS") from error
    return tuple(windows)


def install_signal_handlers(stop_event: Event) -> None:
    def stop(_signum: int, _frame: Any) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)


def _safe_counters(result: Any) -> dict[str, int]:
    if hasattr(result, "__dataclass_fields__"):
        values = asdict(result)
    elif isinstance(result, Mapping):
        values = dict(result)
    else:
        return {}
    return {
        str(key): value
        for key, value in values.items()
        if isinstance(value, int) and not isinstance(value, bool)
    }


def _error_code(error: Exception) -> str:
    if isinstance(error, FabCancelledError):
        return "CANCELLED"
    if isinstance(error, CircuitOpenError):
        return "CIRCUIT_OPEN"
    if isinstance(error, FabTransportError):
        return "FAB_TRANSPORT"
    if isinstance(error, FantasyLifecycleTransportError):
        return "FANTASY_LIFECYCLE_TRANSPORT"
    if isinstance(error, FabResponseError):
        return getattr(error, "code", "FAB_RESPONSE")
    if isinstance(
        error, (CompetitionDiscoveryError, ScheduleContractError, BoxscoreContractError)
    ):
        return "CONTRACT"
    if isinstance(error, psycopg.Error):
        return "DATABASE"
    return "UNEXPECTED"


def _add(summary: OrchestratorSummary, **changes: int) -> OrchestratorSummary:
    values = asdict(summary)
    for key, value in changes.items():
        values[key] += value
    return OrchestratorSummary(**values)
