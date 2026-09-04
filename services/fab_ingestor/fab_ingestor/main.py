from .config import Settings


def main() -> None:
    settings = Settings.from_env()
    print(f"FAB ingestor ready (mode={settings.mode})")


if __name__ == "__main__":
    main()
