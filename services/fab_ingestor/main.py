from fab_ingestor.config import Settings


def main() -> None:
    settings = Settings()
    print(f"FAB ingestor ready (mode={'mock' if settings.is_mock else 'live'})")

if __name__ == "__main__":
    main()
