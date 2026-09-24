from contextlib import contextmanager
from datetime import datetime
from threading import Event
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from fab_ingestor.client import (
    FabAuthExpiredError,
    FabAuthRefreshError,
    FabContractError,
    FabTransportError,
)
from fab_ingestor.orchestrator import (
    CircuitBreaker,
    CircuitOpenError,
    IngestionOrchestrator,
    JourneyWindow,
    RetryPolicy,
    Scheduler,
    install_signal_handlers,
    parse_journey_windows,
)


class Repository:
    def __init__(self, *, acquired=True):
        self.acquired = acquired
        self.runs = []
        self.finished = []

    def list_selected_competitions(self):
        return [("season", "category")]

    def is_fantasy_selected(self, competition_season_id):
        return True

    def is_roster_enabled(self, competition_season_id):
        return True

    def is_fantasy_lifecycle_due(self, competition_season_id):
        return True

    def start_ingestion_run(self, job, competition):
        run_id = f"run-{len(self.runs)}"
        self.runs.append((run_id, job, competition))
        return run_id

    def finish_ingestion_run(self, run_id, **values):
        self.finished.append((run_id, values))

    @contextmanager
    def advisory_lock(self, job, competition):
        yield self.acquired


def test_sync_all_runs_each_phase_and_records_only_counters(monkeypatch):
    repository = Repository()
    calls = []

    monkeypatch.setattr(
        "fab_ingestor.orchestrator.sync_competition_teams",
        lambda *_, **__: calls.append("competition") or {"teams": 4},
    )
    monkeypatch.setattr(
        "fab_ingestor.orchestrator.sync_competition_games",
        lambda *_, **__: calls.append("schedule") or {"games": 3},
    )
    monkeypatch.setattr(
        "fab_ingestor.orchestrator.sync_competition_stats",
        lambda *_, **__: calls.append("stats") or {"players": 12},
    )
    monkeypatch.setattr(
        "fab_ingestor.orchestrator.sync_competition_rosters",
        lambda *_, **__: calls.append("roster") or {"observed": 8},
    )

    summary = IngestionOrchestrator(object(), repository).sync_all()

    assert calls == ["competition", "roster", "schedule", "stats"]
    assert (summary.competitions, summary.phases_succeeded, summary.phases_failed) == (1, 4, 0)
    phase_results = [values for _, values in repository.finished if "counters" in values][:-1]
    assert phase_results == [
        {"status": "succeeded", "counters": {"teams": 4}},
        {"status": "succeeded", "counters": {"observed": 8}},
        {"status": "succeeded", "counters": {"games": 3}},
        {"status": "succeeded", "counters": {"players": 12}},
    ]


def test_sync_all_records_safe_trigger_in_run_name(monkeypatch):
    repository = Repository()
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_games", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_stats", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_rosters", lambda *_, **__: {})

    IngestionOrchestrator(object(), repository).sync_all(trigger="startup")

    assert repository.runs[0][1] == "sync_all_startup"
    assert {job for _, job, _ in repository.runs[1:]} == {"competition", "roster", "schedule", "stats"}


def test_sync_all_advances_fantasy_only_after_successful_stats(monkeypatch):
    repository = Repository()
    calls = []
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_games", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_stats", lambda *_, **__: calls.append("stats") or {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_rosters", lambda *_, **__: calls.append("roster") or {})

    summary = IngestionOrchestrator(
        object(), repository, fantasy_lifecycle=lambda season: calls.append(("fantasy", season)) or {"rounds": 1}
    ).sync_all()

    assert calls == ["roster", "stats", ("fantasy", "season")]
    assert summary.phases_succeeded == 5


def test_monitored_competition_sync_does_not_advance_fantasy(monkeypatch):
    repository = Repository()
    repository.is_fantasy_selected = lambda _: False
    repository.is_roster_enabled = lambda _: False
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_games", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_stats", lambda *_, **__: {})

    summary = IngestionOrchestrator(
        object(), repository, fantasy_lifecycle=lambda _: pytest.fail("must not run")
    ).sync_all()

    assert summary.phases_succeeded == 3


def test_preseason_sync_skips_fantasy_lifecycle(monkeypatch):
    repository = Repository()
    repository.is_fantasy_lifecycle_due = lambda _: False
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_games", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_stats", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_rosters", lambda *_, **__: {})

    summary = IngestionOrchestrator(
        object(), repository, fantasy_lifecycle=lambda _: pytest.fail("preseason has no scoring")
    ).sync_all()

    assert summary.phases_succeeded == 4
    assert summary.phases_failed == 0


def test_sync_all_does_not_advance_fantasy_when_stats_fails(monkeypatch):
    repository = Repository()
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_games", lambda *_, **__: {})
    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_stats", lambda *_, **__: (_ for _ in ()).throw(ValueError("bad stats")))

    summary = IngestionOrchestrator(
        object(), repository, fantasy_lifecycle=lambda _: pytest.fail("must not run")
    ).sync_all()

    assert summary.phases_failed == 1


def test_locked_sync_is_skipped_without_running_phases(monkeypatch):
    repository = Repository(acquired=False)
    monkeypatch.setattr(
        "fab_ingestor.orchestrator.sync_competition_teams",
        lambda *_args, **_kwargs: pytest.fail("phase must not run"),
    )
    summary = IngestionOrchestrator(object(), repository).sync_all()
    assert summary.skipped_locked == 1
    assert repository.finished == [("run-0", {"status": "skipped_locked"})]


def test_phase_failure_is_stored_as_code_without_exception_message(monkeypatch):
    repository = Repository()

    def fail(*_args, **_kwargs):
        raise ValueError("credential-like sensitive detail")

    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", fail)
    summary = IngestionOrchestrator(object(), repository).sync_all()
    assert summary.phases_failed == 1
    serialized = repr(repository.finished)
    assert "credential-like" not in serialized
    assert "UNEXPECTED" in serialized


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (FabAuthExpiredError("secret"), "FAB_AUTH_EXPIRED"),
        (FabAuthRefreshError("secret"), "FAB_AUTH_REFRESH_FAILED"),
        (FabContractError("secret"), "FAB_CONTRACT_ERROR"),
    ],
)
def test_fab_credential_failures_are_persisted_as_safe_codes(monkeypatch, error, code):
    repository = Repository()

    def fail(*_args, **_kwargs):
        raise error

    monkeypatch.setattr("fab_ingestor.orchestrator.sync_competition_teams", fail)
    IngestionOrchestrator(object(), repository).sync_all()
    serialized = repr(repository.finished)
    assert code in serialized
    assert "secret" not in serialized


def test_transient_failures_retry_with_backoff_and_open_circuit():
    sleeps = []
    orchestrator = IngestionOrchestrator(
        object(),
        Repository(),
        retry_policy=RetryPolicy(attempts=3, initial_delay=1, max_delay=2),
        breaker=CircuitBreaker(failure_threshold=3, recovery_seconds=60),
        sleeper=sleeps.append,
        clock=lambda: 0.0,
    )

    with pytest.raises(FabTransportError):
        orchestrator._retry(lambda: (_ for _ in ()).throw(FabTransportError("secret")))
    assert sleeps == [1, 2]
    with pytest.raises(CircuitOpenError):
        orchestrator.breaker.before_call(3)


def test_journey_windows_use_madrid_time_and_handle_overnight_and_dst():
    timezone = ZoneInfo("Europe/Madrid")
    windows = parse_journey_windows("FRI 22:00-02:00,SUN 08:00-23:00")
    assert windows[0].contains(datetime(2026, 9, 5, 1, 0, tzinfo=timezone))
    assert windows[1].contains(datetime(2026, 10, 25, 10, 0, tzinfo=timezone))
    with pytest.raises(ValueError, match="FAB_JOURNEY_WINDOWS"):
        parse_journey_windows("FUNDAY 10:00-11:00")


def test_scheduler_uses_active_interval_and_stops_without_new_cycle():
    timezone = ZoneInfo("Europe/Madrid")
    scheduler = Scheduler(
        object(),
        idle_minutes=120,
        active_seconds=30,
        windows=(JourneyWindow(frozenset({5}), datetime.min.time(), datetime.max.time()),),
        now=lambda: datetime(2026, 9, 5, 12, 0, tzinfo=timezone),
    )
    assert scheduler.interval_seconds() == 30
    stopped = Event()
    stopped.set()
    scheduler.run(stopped)


def test_scheduler_counts_active_interval_from_cycle_start(monkeypatch):
    timezone = ZoneInfo("Europe/Madrid")
    clock = iter((100.0, 112.0))
    stopped = Event()
    scheduler = Scheduler(
        SimpleNamespace(sync_all=lambda **_: stopped.set()),
        idle_minutes=120,
        active_seconds=30,
        windows=(JourneyWindow(frozenset({5}), datetime.min.time(), datetime.max.time()),),
        now=lambda: datetime(2026, 9, 5, 12, 0, tzinfo=timezone),
        monotonic=lambda: next(clock),
    )
    waits = []
    monkeypatch.setattr(stopped, "wait", waits.append)
    scheduler.run(stopped)
    assert waits == [18]


def test_scheduler_runs_startup_once_then_continues_periodically(monkeypatch):
    timezone = ZoneInfo("Europe/Madrid")
    calls = []
    sync_count = 0
    clock = iter((100.0, 101.0, 200.0, 201.0))

    class TwoCycleStop:
        def is_set(self):
            return sync_count >= 2

        def wait(self, seconds):
            calls.append(("wait", seconds))

    stop = TwoCycleStop()

    def sync_all(**kwargs):
        nonlocal sync_count
        sync_count += 1
        calls.append(("sync", kwargs["trigger"]))

    scheduler = Scheduler(
        SimpleNamespace(sync_all=sync_all),
        idle_minutes=60,
        active_seconds=30,
        windows=(),
        now=lambda: datetime(2026, 9, 16, 12, 0, tzinfo=timezone),
        monotonic=lambda: next(clock),
    )

    scheduler.run(stop)  # type: ignore[arg-type]

    assert calls == [
        ("sync", "startup"),
        ("wait", 3599.0),
        ("sync", "scheduled"),
        ("wait", 3599.0),
    ]


def test_signal_handlers_request_controlled_stop(monkeypatch):
    handlers = {}
    monkeypatch.setattr(
        "fab_ingestor.orchestrator.signal.signal",
        lambda signum, handler: handlers.__setitem__(signum, handler),
    )
    stopped = Event()
    install_signal_handlers(stopped)
    assert len(handlers) == 2
    next(iter(handlers.values()))(0, None)
    assert stopped.is_set()
