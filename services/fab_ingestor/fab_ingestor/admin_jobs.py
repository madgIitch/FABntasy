from __future__ import annotations

import json
import os
import socket
from typing import Any

from .boxscore import sync_competition_stats, sync_game_stats
from .client import FabCancelledError, FabClient
from .discovery import sync_competition_teams
from .fantasy_lifecycle import FantasyLifecycleTransportError
from .repository import SportsRepository
from .schedule import sync_competition_games


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


def execute_job(job: dict[str, Any], client: FabClient, repository: SportsRepository) -> dict[str, int]:
    target = job["target"]
    if job["type"] == "GAME":
        summary = sync_game_stats(client, repository, external_game_id=str(target["gameId"]))
        return {"games": summary.games, "rejected": summary.rejected}
    category_id = str(target["categoryId"])
    if job["type"] == "ROUND":
        round_number = int(target["roundNumber"])
        schedule = sync_competition_games(client, repository, category_competition_id=category_id, round_number=round_number)
        rejected = 0
        for game_id in _round_game_ids(repository, category_id, round_number):
            rejected += sync_game_stats(client, repository, external_game_id=game_id).rejected
        return {"games": schedule.games, "rejected": rejected}
    teams = sync_competition_teams(client, repository, category_competition_id=category_id)
    games = sync_competition_games(client, repository, category_competition_id=category_id)
    stats = sync_competition_stats(client, repository, category_competition_id=category_id)
    return {"teams": teams.teams, "games": games.games, "rejected": stats.rejected}


def run_one_job(client: FabClient, repository: SportsRepository, worker_id: str) -> bool:
    heartbeat(repository, worker_id)
    job = claim_job(repository, worker_id)
    if job is None:
        return False
    try:
        counters = execute_job(job, client, repository)
        repository.connection.execute(
            """UPDATE ingestion_jobs SET status='SUCCEEDED', counters=%s,
            finished_at=CURRENT_TIMESTAMP, heartbeat_at=CURRENT_TIMESTAMP WHERE id=%s""",
            (json.dumps(counters), job["id"]),
        )
        repository.connection.execute(
            """INSERT INTO admin_audit_events (id, actor_profile_id, action, resource_type, resource_id, result)
            VALUES (gen_random_uuid(), %s, 'INGESTION_JOB_COMPLETE', 'INGESTION_JOB', %s, 'SUCCESS')""",
            (job["requested_by_id"], job["id"]),
        )
    except Exception as error:  # noqa: BLE001 - every job failure must reach a terminal state
        if isinstance(error, FabCancelledError):
            code = "WORKER_TERMINATED"
        elif isinstance(error, FantasyLifecycleTransportError):
            code = "FANTASY_LIFECYCLE_TRANSPORT"
        else:
            code = type(error).__name__.upper()[:64]
        repository.connection.execute(
            """UPDATE ingestion_jobs SET status='FAILED', error_code=%s,
            finished_at=CURRENT_TIMESTAMP, heartbeat_at=CURRENT_TIMESTAMP WHERE id=%s""",
            (code, job["id"]),
        )
        repository.connection.execute(
            """INSERT INTO admin_audit_events (id, actor_profile_id, action, resource_type, resource_id, result, reason)
            VALUES (gen_random_uuid(), %s, 'INGESTION_JOB_COMPLETE', 'INGESTION_JOB', %s, 'FAILED', %s)""",
            (job["requested_by_id"], job["id"], code),
        )
    return True


def run_worker(client: FabClient, repository: SportsRepository, *, once: bool, stop_event: Any) -> None:
    worker_id = worker_identity()
    while not stop_event.is_set():
        worked = run_one_job(client, repository, worker_id)
        if once:
            return
        if not worked:
            stop_event.wait(5)
