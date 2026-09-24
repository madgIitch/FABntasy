from __future__ import annotations

from unittest.mock import MagicMock, Mock

from fab_ingestor.admin_jobs import claim_job, execute_job, run_one_job
from fab_ingestor.boxscore import BoxscoreSyncSummary
from fab_ingestor.fantasy_lifecycle import FantasyLifecycleSummary


def test_claim_uses_skip_locked_and_marks_running():
    connection = Mock()
    connection.transaction.return_value.__enter__ = Mock()
    connection.transaction.return_value.__exit__ = Mock(return_value=False)
    connection.execute.return_value.fetchone.return_value = ("job-1", "GAME", {"gameId": "fab-1"}, "admin-1")
    repository = Mock(connection=connection)
    job = claim_job(repository, "worker-1")
    assert job == {"id": "job-1", "type": "GAME", "target": {"gameId": "fab-1"}, "requested_by_id": "admin-1"}
    assert "FOR UPDATE SKIP LOCKED" in connection.execute.call_args_list[0].args[0]
    assert "status='RUNNING'" in connection.execute.call_args_list[1].args[0]


def test_empty_queue_is_safe():
    connection = Mock()
    connection.transaction.return_value.__enter__ = Mock()
    connection.transaction.return_value.__exit__ = Mock(return_value=False)
    connection.execute.return_value.fetchone.return_value = None
    assert claim_job(Mock(connection=connection), "worker-1") is None


def test_job_failure_records_only_stable_error_code(monkeypatch):
    repository = Mock()
    monkeypatch.setattr("fab_ingestor.admin_jobs.heartbeat", Mock())
    monkeypatch.setattr("fab_ingestor.admin_jobs.claim_job", Mock(return_value={"id": "job-1", "type": "GAME", "target": {"gameId": "fab-1"}, "requested_by_id": "admin-1"}))
    monkeypatch.setattr("fab_ingestor.admin_jobs.execute_job", Mock(side_effect=RuntimeError("secret body")))
    assert run_one_job(Mock(), repository, "worker-1") is True
    query, params = repository.connection.execute.call_args_list[0].args
    assert "status='FAILED'" in query
    assert params == ("RUNTIMEERROR", "job-1")
    assert "secret body" not in str(params)


def test_game_job_advances_fantasy_after_ingestion(monkeypatch):
    repository = Mock()
    repository.get_game_stats_context.return_value = {
        "competition_season_id": "season-1"
    }
    monkeypatch.setattr(
        "fab_ingestor.admin_jobs.sync_game_stats",
        Mock(return_value=BoxscoreSyncSummary(1, 2, 3, 0)),
    )
    lifecycle = Mock(return_value=FantasyLifecycleSummary(1, 1))

    counters = execute_job(
        {"type": "GAME", "target": {"gameId": "fab-1"}},
        Mock(),
        repository,
        lifecycle,
    )

    lifecycle.assert_called_once_with("season-1")
    assert counters == {
        "games": 1,
        "rejected": 0,
        "fantasyEligibleRounds": 1,
        "fantasyRoundsProcessed": 1,
    }


def test_game_job_does_not_advance_fantasy_when_ingestion_fails(monkeypatch):
    repository = Mock()
    repository.get_game_stats_context.return_value = {
        "competition_season_id": "season-1"
    }
    monkeypatch.setattr(
        "fab_ingestor.admin_jobs.sync_game_stats",
        Mock(side_effect=RuntimeError("ingestion failed")),
    )
    lifecycle = Mock()

    try:
        execute_job(
            {"type": "GAME", "target": {"gameId": "fab-1"}},
            Mock(),
            repository,
            lifecycle,
        )
    except RuntimeError:
        pass
    else:
        raise AssertionError("failed ingestion was accepted")

    lifecycle.assert_not_called()


def test_monitored_competition_job_links_without_fantasy_and_reuses_sync_lock(monkeypatch):
    repository = Mock()
    repository.resolve_competition_selection.side_effect = [
        ValueError("not linked"), ("season-1", "opaque-1")
    ]
    repository.advisory_lock.return_value = MagicMock()
    repository.advisory_lock.return_value.__enter__.return_value = True
    repository.is_fantasy_selected.return_value = False
    monkeypatch.setattr("fab_ingestor.admin_jobs.sync_competition_teams", Mock(return_value=Mock(teams=4)))
    monkeypatch.setattr("fab_ingestor.admin_jobs.sync_competition_games", Mock(return_value=Mock(games=3)))
    monkeypatch.setattr("fab_ingestor.admin_jobs.sync_competition_stats", Mock(return_value=Mock(rejected=0)))
    lifecycle = Mock()

    counters = execute_job(
        {"type": "COMPETITION", "target": {"categoryId": "9955"}},
        Mock(), repository, lifecycle,
    )

    repository.ensure_monitored_competition.assert_called_once_with("9955")
    repository.advisory_lock.assert_called_once_with("sync_all", "season-1")
    lifecycle.assert_not_called()
    assert counters == {"teams": 4, "games": 3, "rejected": 0}
