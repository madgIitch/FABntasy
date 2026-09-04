from fab_ingestor.config import Settings


def test_mock_mode_does_not_require_fab_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    assert Settings.from_env().mode == "mock"


def test_live_mode_requires_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    try:
        Settings.from_env()
    except ValueError as error:
        assert "credentials" in str(error)
    else:
        raise AssertionError("live mode accepted missing credentials")
