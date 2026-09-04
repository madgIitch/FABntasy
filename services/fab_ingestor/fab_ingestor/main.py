import argparse

from .auth import FileCredentialStore
from .client import Credentials, FabClient
from .config import Settings


def main() -> None:
    parser = argparse.ArgumentParser(description="FABntasy FAB ingestor")
    parser.add_argument("command", nargs="?", choices=("status", "register-device"), default="status")
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing device identity (normally this should not be used)",
    )
    args = parser.parse_args()
    settings = Settings.from_env()
    store = FileCredentialStore(settings.credentials_file)

    if args.command == "register-device":
        if store.load() is not None and not args.force:
            print("FAB device is already registered; existing credentials were kept")
            return
        FabClient(store).register_device()
        print(f"FAB device registered and stored securely in {settings.credentials_file}")
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
