from fab_ingestor.config import Settings


def test_mock_mode_does_not_require_fab_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    assert Settings.from_env().mode == "mock"
    assert str(Settings.from_env().credentials_file).endswith("fab-credentials.json")


def test_live_mode_requires_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", "missing-test-credentials.json")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    try:
        Settings.from_env()
    except ValueError as error:
        assert "credentials" in str(error)
    else:
        raise AssertionError("live mode accepted missing credentials")


def test_live_mode_accepts_persisted_credentials(monkeypatch, tmp_path):
    credentials_file = tmp_path / "credentials.json"
    credentials_file.write_text('{"device_id":"device","key":"secret"}', encoding="utf-8")
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", str(credentials_file))
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)

    assert Settings.from_env().mode == "live"
