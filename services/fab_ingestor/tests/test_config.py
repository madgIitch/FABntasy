import pytest

from fab_ingestor.config import Settings


def test_mock_mode_does_not_require_fab_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    assert Settings.from_env().mode == "mock"
    assert str(Settings.from_env().credentials_file).endswith("fab-credentials.json")


def test_live_mode_requires_credentials(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_AUTO_CREDENTIAL_REFRESH", "false")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", "missing-test-credentials.json")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)
    try:
        Settings.from_env()
    except ValueError as error:
        assert "credentials" in str(error)
    else:
        raise AssertionError("live mode accepted missing credentials")


def test_live_mode_can_bootstrap_credentials_when_auto_refresh_is_enabled(monkeypatch, tmp_path):
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_AUTO_CREDENTIAL_REFRESH", "true")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", str(tmp_path / "credentials.json"))
    monkeypatch.setenv("DATABASE_URL", "postgresql://db.test/app?sslmode=require")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)

    assert Settings.from_env().auto_refresh_credentials is True


def test_live_mode_accepts_persisted_credentials(monkeypatch, tmp_path):
    credentials_file = tmp_path / "credentials.json"
    credentials_file.write_text('{"device_id":"device","key":"secret"}', encoding="utf-8")
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", str(credentials_file))
    monkeypatch.setenv("DATABASE_URL", "postgresql://db.test/app?sslmode=require")
    monkeypatch.delenv("FAB_DEVICE_ID", raising=False)
    monkeypatch.delenv("FAB_KEY", raising=False)

    assert Settings.from_env().mode == "live"


def test_live_mode_requires_tls_and_https(monkeypatch, tmp_path):
    credentials_file = tmp_path / "credentials.json"
    credentials_file.write_text('{"device_id":"device","key":"secret"}', encoding="utf-8")
    monkeypatch.setenv("INGESTOR_MODE", "live")
    monkeypatch.setenv("FAB_CREDENTIALS_FILE", str(credentials_file))
    monkeypatch.setenv("DATABASE_URL", "postgresql://db.test/app")
    with pytest.raises(ValueError, match="TLS"):
        Settings.from_env()
    monkeypatch.setenv("DATABASE_URL", "postgresql://db.test/app?sslmode=require")
    monkeypatch.setenv("CANASTIO_FANTASY_LIFECYCLE_URL", "http://web.test/internal")
    monkeypatch.setenv("CANASTIO_INTERNAL_JOB_SECRET", "sentinel")
    with pytest.raises(ValueError, match="HTTPS"):
        Settings.from_env()


def test_scheduler_defaults_and_ranges(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("FAB_SCHEDULER_IDLE_MINUTES", raising=False)
    monkeypatch.delenv("FAB_SCHEDULER_ACTIVE_SECONDS", raising=False)
    settings = Settings.from_env()
    assert settings.scheduler_idle_minutes == 120
    assert settings.scheduler_active_seconds == 30
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

    monkeypatch.setenv("FAB_SCHEDULER_IDLE_MINUTES", "120")
    monkeypatch.setenv("FAB_SCHEDULER_ACTIVE_SECONDS", "29")
    with pytest.raises(ValueError, match="ACTIVE_SECONDS"):
        Settings.from_env()


def test_fantasy_lifecycle_configuration_must_be_complete(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.setenv("CANASTIO_FANTASY_LIFECYCLE_URL", "https://canastio.test/api/internal/fantasy/lifecycle")
    monkeypatch.delenv("CANASTIO_INTERNAL_JOB_SECRET", raising=False)
    with pytest.raises(ValueError, match="INTERNAL_JOB_SECRET"):
        Settings.from_env()


def test_shared_secret_can_exist_without_enabling_lifecycle(monkeypatch):
    monkeypatch.setenv("INGESTOR_MODE", "mock")
    monkeypatch.delenv("CANASTIO_FANTASY_LIFECYCLE_URL", raising=False)
    monkeypatch.setenv("CANASTIO_INTERNAL_JOB_SECRET", "shared-secret")
    assert Settings.from_env().fantasy_lifecycle_url is None
