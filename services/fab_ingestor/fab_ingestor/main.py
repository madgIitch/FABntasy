import argparse
import json
import os
from threading import Event

from .admin_jobs import run_worker
from .auth import FileCredentialStore
from .boxscore import sync_competition_stats, sync_game_stats
from .client import Credentials, FabClient
from .config import Settings
from .discovery import discover_categories, select_competition, sync_competition_teams
from .fantasy_lifecycle import FantasyLifecycleClient
from .orchestrator import (
    CircuitBreaker,
    IngestionOrchestrator,
    RetryPolicy,
    Scheduler,
    install_signal_handlers,
    parse_journey_windows,
)
from .repository import SportsRepository
from .schedule import sync_competition_games


def main() -> None:
    parser = argparse.ArgumentParser(description="FABntasy FAB ingestor")
    parser.add_argument(
        "command",
        nargs="?",
        choices=(
            "status",
            "register-device",
            "probe-auth",
            "discover-categories",
            "select-competition",
            "sync-competition-teams",
            "sync-competition-games",
            "sync-game-stats",
            "sync-competition-stats",
            "sync-all",
            "run-scheduler",
            "run-admin-worker",
            "grant-ingestion-admin",
        ),
        default="status",
    )
    parser.add_argument("--query", default="Sevilla")
    parser.add_argument("--category-id")
    parser.add_argument("--game-id")
    parser.add_argument("--force-stats", action="store_true")
    parser.add_argument("--once", action="store_true", help="process at most one queued admin job")
    parser.add_argument("--auth-user-id", help="Supabase auth UUID to grant ingestion administration")
    parser.add_argument("--season", default=os.getenv("FAB_ACTIVE_SEASON", "2026/2027"))
    parser.add_argument("--role", choices=("validation", "primary"), default="validation")
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing device identity (normally this should not be used)",
    )
    args = parser.parse_args()
    settings = Settings.from_env()
    store = FileCredentialStore(settings.credentials_file)
    if settings.mode == "live":
        try:
            store.assert_writable()
        except OSError as error:
            raise SystemExit("FAB credential directory must be persistent and writable in live mode") from error
        if store.load() is None and settings.device_id is not None and settings.key is not None:
            store.replace(Credentials(settings.device_id, settings.key))

    if args.command == "grant-ingestion-admin":
        if not settings.database_url or not args.auth_user_id:
            parser.error("grant-ingestion-admin requires DATABASE_URL and --auth-user-id")
        with SportsRepository.connect(settings.database_url) as repository:
            row = repository.connection.execute(
                """INSERT INTO admin_grants (id, user_profile_id, role, granted_at, revoked_at)
                SELECT gen_random_uuid(), id, 'INGESTION_ADMIN', CURRENT_TIMESTAMP, NULL
                FROM user_profiles WHERE auth_user_id=%s::uuid
                ON CONFLICT (user_profile_id, role) DO UPDATE SET revoked_at=NULL, granted_at=CURRENT_TIMESTAMP
                RETURNING id""",
                (args.auth_user_id,),
            ).fetchone()
        if row is None:
            raise SystemExit("No user profile exists for that auth UUID")
        print("INGESTION_ADMIN grant active")
        return

    if args.command in {"sync-all", "run-scheduler", "run-admin-worker"}:
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to run ingestion")
        stop_event = Event()
        install_signal_handlers(stop_event)
        with SportsRepository.connect(settings.database_url) as repository:
            orchestrator = IngestionOrchestrator(
                FabClient(
                    store,
                    timeout=settings.request_timeout_seconds,
                    cancellation_check=stop_event.is_set,
                    auto_refresh_credentials=settings.auto_refresh_credentials,
                ),
                repository,
                retry_policy=RetryPolicy(
                    attempts=settings.retry_attempts,
                    initial_delay=settings.retry_initial_delay_seconds,
                    max_delay=settings.retry_max_delay_seconds,
                ),
                breaker=CircuitBreaker(
                    failure_threshold=settings.circuit_failure_threshold,
                    recovery_seconds=settings.circuit_recovery_seconds,
                ),
                fantasy_lifecycle=(FantasyLifecycleClient(
                    settings.fantasy_lifecycle_url,
                    settings.internal_job_secret,
                    timeout=settings.request_timeout_seconds,
                ).advance if settings.fantasy_lifecycle_url and settings.internal_job_secret else None),
            )
            if args.command == "run-admin-worker":
                print("FAB admin job worker started")
                run_worker(
                    FabClient(
                        store,
                        timeout=settings.request_timeout_seconds,
                        cancellation_check=stop_event.is_set,
                        auto_refresh_credentials=settings.auto_refresh_credentials,
                    ),
                    repository,
                    once=args.once,
                    stop_event=stop_event,
                )
                print("FAB admin job worker stopped")
            elif args.command == "sync-all":
                summary = orchestrator.sync_all(
                    force_stats=args.force_stats, stop_event=stop_event
                )
                print(
                    "Ingestion synchronized "
                    f"(competitions={summary.competitions}, "
                    f"phases_succeeded={summary.phases_succeeded}, "
                    f"phases_failed={summary.phases_failed}, "
                    f"skipped_locked={summary.skipped_locked})"
                )
                if summary.phases_failed:
                    raise SystemExit(1)
            else:
                scheduler = Scheduler(
                    orchestrator,
                    idle_minutes=settings.scheduler_idle_minutes,
                    active_seconds=settings.scheduler_active_seconds,
                    windows=parse_journey_windows(settings.journey_windows),
                )
                print("FAB ingestion scheduler started")
                scheduler.run(stop_event)
                print("FAB ingestion scheduler stopped")
        return

    if args.command in {"sync-game-stats", "sync-competition-stats"}:
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to sync statistics")
        if args.command == "sync-game-stats" and not args.game_id:
            parser.error("sync-game-stats requires --game-id")
        if args.command == "sync-competition-stats" and not args.category_id:
            parser.error("sync-competition-stats requires --category-id")
        with SportsRepository.connect(settings.database_url) as repository:
            client = FabClient(store, auto_refresh_credentials=settings.auto_refresh_credentials)
            summary = (
                sync_game_stats(client, repository, external_game_id=str(args.game_id))
                if args.command == "sync-game-stats"
                else sync_competition_stats(
                    client, repository, category_competition_id=str(args.category_id)
                )
            )
        print(
            "Statistics synchronized "
            f"(games={summary.games}, players_created={summary.players_created}, "
            f"players_updated={summary.players_updated}, rejected={summary.rejected})"
        )
        return

    if args.command == "sync-competition-games":
        if not args.category_id:
            parser.error("sync-competition-games requires --category-id")
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to sync competition games")
        with SportsRepository.connect(settings.database_url) as repository:
            summary = sync_competition_games(
                FabClient(store, auto_refresh_credentials=settings.auto_refresh_credentials),
                repository,
                category_competition_id=str(args.category_id),
            )
        print(
            "Competition games synchronized "
            f"(groups={summary.groups}, matchdays={summary.matchdays}, games={summary.games}, "
            f"created={summary.created}, updated={summary.updated}, stale={summary.stale}, "
            f"skipped_byes={summary.skipped_byes})"
        )
        return

    if args.command == "sync-competition-teams":
        if not args.category_id:
            parser.error("sync-competition-teams requires --category-id")
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to sync a competition")
        with SportsRepository.connect(settings.database_url) as repository:
            summary = sync_competition_teams(
                FabClient(store, auto_refresh_credentials=settings.auto_refresh_credentials),
                repository,
                category_competition_id=str(args.category_id),
            )
        print(
            "Competition teams synchronized "
            f"(phases={summary.phases}, groups={summary.groups}, teams={summary.teams}, "
            f"skipped_placeholders={summary.skipped_placeholders})"
        )
        return

    if args.command == "register-device":
        if store.load() is not None and not args.force:
            print("FAB device is already registered; existing credentials were kept")
            return
        FabClient(store).register_device()
        print(f"FAB device registered and stored securely in {settings.credentials_file}")
        return

    if args.command == "probe-auth":
        if settings.mode != "live":
            raise SystemExit("probe-auth requires INGESTOR_MODE=live")
        if FabClient(store, auto_refresh_credentials=False).probe_credentials():
            print("FAB credential probe succeeded")
            return
        raise SystemExit("FAB credential probe confirmed an expired identity")

    if args.command in {"discover-categories", "select-competition"}:
        client = FabClient(store, auto_refresh_credentials=settings.auto_refresh_credentials)
        payloads: list[dict] = []
        candidates = discover_categories(client, args.query, payload_sink=payloads.append)
        if args.command == "discover-categories":
            print(json.dumps([candidate.__dict__ for candidate in candidates], ensure_ascii=False, indent=2))
            return
        if not args.category_id:
            parser.error("select-competition requires --category-id")
        matches = [
            candidate
            for candidate in candidates
            if candidate.category_competition_id == str(args.category_id)
        ]
        if len(matches) != 1:
            raise SystemExit("category ID did not resolve to exactly one FAB candidate")
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to select a competition")
        with SportsRepository.connect(settings.database_url) as repository:
            for payload in payloads:
                repository.save_raw_payload(
                    endpoint="/v2/busqueda.ashx",
                    entity_type="category_discovery",
                    external_id=str(args.category_id),
                    http_status=200,
                    payload=payload,
                )
            internal_id = select_competition(
                repository,
                matches[0],
                season_name=args.season,
                role=args.role,
            )
        print(f"Competition selected as {args.role} (internal_id={internal_id})")
        return

    stored = store.load()
    env_credentials = (
        Credentials(settings.device_id, settings.key)
        if settings.device_id is not None and settings.key is not None
        else None
    )
    credential_state = "configured" if stored is not None or env_credentials is not None else "not configured"
    print(f"FAB ingestor ready (mode={settings.mode}, credentials={credential_state})")


if __name__ == "__main__":
    main()
