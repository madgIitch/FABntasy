import argparse
import json
import os

from .auth import FileCredentialStore
from .client import Credentials, FabClient
from .config import Settings
from .discovery import discover_categories, select_competition, sync_competition_teams
from .repository import SportsRepository


def main() -> None:
    parser = argparse.ArgumentParser(description="FABntasy FAB ingestor")
    parser.add_argument(
        "command",
        nargs="?",
        choices=(
            "status",
            "register-device",
            "discover-categories",
            "select-competition",
            "sync-competition-teams",
        ),
        default="status",
    )
    parser.add_argument("--query", default="Sevilla")
    parser.add_argument("--category-id")
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

    if args.command == "sync-competition-teams":
        if not args.category_id:
            parser.error("sync-competition-teams requires --category-id")
        if not settings.database_url:
            raise SystemExit("DATABASE_URL is required to sync a competition")
        with SportsRepository.connect(settings.database_url) as repository:
            summary = sync_competition_teams(
                FabClient(store),
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

    if args.command in {"discover-categories", "select-competition"}:
        client = FabClient(store)
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
