from fab_ingestor.config import Settings


def test_default_mode_is_mock() -> None:
    assert Settings().is_mock
