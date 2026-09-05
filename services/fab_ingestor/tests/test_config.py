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


def test_scheduler_defaults_and_ranges(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("FAB_SCHEDULER_IDLE_MINUTES", raising=False)
    monkeypatch.delenv("FAB_SCHEDULER_ACTIVE_MINUTES", raising=False)
    settings = Settings.from_env()
    assert settings.scheduler_idle_minutes == 120
    assert settings.scheduler_active_minutes == 10
    assert settings.request_timeout_seconds == 10
    assert settings.retry_attempts == 3
    assert settings.retry_initial_delay_seconds == 1
    assert settings.retry_max_delay_seconds == 8
    assert settings.circuit_failure_threshold == 3
    assert settings.circuit_recovery_seconds == 300

    monkeypatch.setenv("FAB_SCHEDULER_IDLE_MINUTES", "30")
    try:
        Settings.from_env()
    except ValueError as error:
        assert "IDLE" in str(error)
    else:
        raise AssertionError("invalid idle scheduler interval was accepted")
