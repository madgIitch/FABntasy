from __future__ import annotations

import json
import os
import socket
from collections.abc import Callable
from typing import Any

from .boxscore import sync_competition_stats, sync_game_stats
from .client import FabCancelledError, FabClient, FabResponseError
from .discovery import sync_competition_teams
from .fantasy_lifecycle import FantasyLifecycleSummary, FantasyLifecycleTransportError
from .repository import SportsRepository
from .schedule import ScheduleContractError, sync_competition_games


def worker_identity() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"[:128]


def heartbeat(repository: SportsRepository, worker_id: str, version: str = "0.7.0") -> None:
    repository.connection.execute(
        """INSERT INTO ingestion_heartbeats (worker_id, seen_at, version)
        VALUES (%s, CURRENT_TIMESTAMP, %s) ON CONFLICT (worker_id)
        DO UPDATE SET seen_at=CURRENT_TIMESTAMP, version=EXCLUDED.version""",
        (worker_id, version),
    )


def claim_job(repository: SportsRepository, worker_id: str) -> dict[str, Any] | None:
    with repository.connection.transaction():
        row = repository.connection.execute(
            """SELECT id, type, target, requested_by_id FROM ingestion_jobs WHERE status='QUEUED'
            ORDER BY requested_at FOR UPDATE SKIP LOCKED LIMIT 1"""
        ).fetchone()
        if row is None:
            return None
        repository.connection.execute(
            """UPDATE ingestion_jobs SET status='RUNNING', claimed_by=%s,
            started_at=CURRENT_TIMESTAMP, heartbeat_at=CURRENT_TIMESTAMP WHERE id=%s""",
            (worker_id, row[0]),
        )
        return {"id": row[0], "type": row[1], "target": row[2] if isinstance(row[2], dict) else json.loads(row[2]), "requested_by_id": row[3]}


def _round_game_ids(repository: SportsRepository, category_id: str, round_number: int) -> list[str]:
    competition_season_id, _ = repository.resolve_competition_selection(category_id)
    rows = repository.connection.execute(
        """SELECT e.external_id FROM games g JOIN external_ids e ON e.entity_id=g.id
        AND e.source='FAB' AND e.entity_type='game'
        WHERE g.competition_season_id=%s AND g.round_number=%s ORDER BY e.external_id""",
        (competition_season_id, round_number),
    ).fetchall()
    return [str(row[0]) for row in rows]


def execute_job(
    job: dict[str, Any],
    client: FabClient,
    repository: SportsRepository,
    fantasy_lifecycle: Callable[[object], FantasyLifecycleSummary] | None = None,
) -> dict[str, int]:
    target = job["target"]
    if job["type"] == "GAME":
        game_id = str(target["gameId"])
        competition_season_id = repository.get_game_stats_context(game_id)[
            "competition_season_id"
        ]
        summary = sync_game_stats(client, repository, external_game_id=game_id)
        counters = {"games": summary.games, "rejected": summary.rejected}
        return _advance_fantasy(
            counters, competition_season_id,
            fantasy_lifecycle if repository.is_fantasy_selected(competition_season_id) else None,
        )
    category_id = str(target["categoryId"])
    try:
        competition_season_id, _ = repository.resolve_competition_selection(category_id)
    except ValueError:
        if job["type"] != "COMPETITION":
            raise
        repository.ensure_monitored_competition(category_id)
        competition_season_id, _ = repository.resolve_competition_selection(category_id)
    if job["type"] == "ROUND":
        round_number = int(target["roundNumber"])
        schedule = sync_competition_games(client, repository, category_competition_id=category_id, round_number=round_number)
        rejected = 0
        for game_id in _round_game_ids(repository, category_id, round_number):
            rejected += sync_game_stats(client, repository, external_game_id=game_id).rejected
        return _advance_fantasy(
            {"games": schedule.games, "rejected": rejected},
            competition_season_id,
            fantasy_lifecycle if repository.is_fantasy_selected(competition_season_id) else None,
        )
    failure: Exception | None = None
    counters: dict[str, int] = {}
    with repository.advisory_lock("sync_all", competition_season_id) as acquired:
        if not acquired:
            raise IngestionLockedError("competition ingestion is already running")
        try:
            teams = sync_competition_teams(client, repository, category_competition_id=category_id)
            games = sync_competition_games(client, repository, category_competition_id=category_id)
            stats = sync_competition_stats(client, repository, category_competition_id=category_id)
            counters = _advance_fantasy(
                {"teams": teams.teams, "games": games.games, "rejected": stats.rejected},
                competition_season_id,
                fantasy_lifecycle if repository.is_fantasy_selected(competition_season_id) else None,
            )
        except Exception as error:  # noqa: BLE001 - commit successful earlier phases before reporting failure
            failure = error
    if failure is not None:
        raise failure
    return counters


class IngestionLockedError(RuntimeError):
    pass


def _advance_fantasy(
    counters: dict[str, int],
    competition_season_id: object,
    fantasy_lifecycle: Callable[[object], FantasyLifecycleSummary] | None,
) -> dict[str, int]:
    if fantasy_lifecycle is None:
        return counters
    summary = fantasy_lifecycle(competition_season_id)
    return {
        **counters,
        "fantasyEligibleRounds": summary.eligible_rounds,
        "fantasyRoundsProcessed": summary.rounds_processed,
    }


def run_one_job(
    client: FabClient,
    repository: SportsRepository,
    worker_id: str,
    fantasy_lifecycle: Callable[[object], FantasyLifecycleSummary] | None = None,
) -> bool:
    heartbeat(repository, worker_id)

    job = claim_job(repository, worker_id)
    if job is None:
        return False

    try:
        counters = execute_job(job, client, repository, fantasy_lifecycle)

        repository.connection.execute(
            """UPDATE ingestion_jobs
            SET status='SUCCEEDED',
                counters=%s,
                finished_at=CURRENT_TIMESTAMP,
                heartbeat_at=CURRENT_TIMESTAMP
            WHERE id=%s""",
            (
                json.dumps(counters),
                job["id"],
            ),
        )

        repository.connection.execute(
            """INSERT INTO admin_audit_events
            (
                id,
                actor_profile_id,
                action,
                resource_type,
                resource_id,
                result
            )
            VALUES (
                gen_random_uuid(),
                %s,
                'INGESTION_JOB_COMPLETE',
                'INGESTION_JOB',
                %s,
                'SUCCESS'
            )""",
            (
                job["requested_by_id"],
                job["id"],
            ),
        )

    except Exception as error:  # noqa: BLE001
        if isinstance(error, FabCancelledError):
            code = "WORKER_TERMINATED"

        elif isinstance(error, FantasyLifecycleTransportError):
            code = "FANTASY_LIFECYCLE_TRANSPORT"

        elif isinstance(error, IngestionLockedError):
            code = "INGESTION_LOCKED"

        elif isinstance(error, ScheduleContractError):
            code = error.code[:64]

        elif isinstance(error, FabResponseError):
            code = getattr(
                error,
                "code",
                "FAB_RESPONSE",
            )

        else:
            code = type(error).__name__.upper()[:64]

        repository.connection.execute(
            """UPDATE ingestion_jobs
            SET status='FAILED',
                error_code=%s,
                finished_at=CURRENT_TIMESTAMP,
                heartbeat_at=CURRENT_TIMESTAMP
            WHERE id=%s""",
            (
                code,
                job["id"],
            ),
        )

        repository.connection.execute(
            """INSERT INTO admin_audit_events
            (
                id,
                actor_profile_id,
                action,
                resource_type,
                resource_id,
                result,
                reason
            )
            VALUES (
                gen_random_uuid(),
                %s,
                'INGESTION_JOB_COMPLETE',
                'INGESTION_JOB',
                %s,
                'FAILED',
                %s
            )""",
            (
                job["requested_by_id"],
                job["id"],
                code,
            ),
        )

    return True


def run_worker(
    client: FabClient,
    repository: SportsRepository,
    *,
    once: bool,
    stop_event: Any,
    fantasy_lifecycle: Callable[[object], FantasyLifecycleSummary] | None = None,
) -> None:
    worker_id = worker_identity()
    while not stop_event.is_set():
        worked = run_one_job(client, repository, worker_id, fantasy_lifecycle)
        if once:
            return
        if not worked:
            stop_event.wait(5)
