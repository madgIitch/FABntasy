from unittest.mock import MagicMock

from fab_ingestor.repository import SportsRepository


def test_unlinked_monitored_competition_gets_disabled_season():
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = (
        "opaque-9955", "Senior Masculino", "Primera Provincial", "Sevilla", None, None
    )
    repository = SportsRepository(connection)
    repository.resolve_external_id = MagicMock(return_value=None)
    repository.upsert_federation = MagicMock(return_value="federation-1")
    repository.upsert_from_external = MagicMock(side_effect=["competition-1", "season-1", "competition-season-1"])
    repository.upsert_external_id = MagicMock()

    assert repository.ensure_monitored_competition("9955") == "competition-season-1"

    season = repository.upsert_from_external.call_args_list[1].kwargs
    competition_season = repository.upsert_from_external.call_args_list[2].kwargs
    assert season["values"]["name"] == "FAB catalog 9955"
    assert competition_season["source"] == "FAB_CATEGORY_COMPETITION"
    assert "fantasy_enabled" not in competition_season["values"]
    assert "fantasy_role" not in competition_season["values"]
    repository.upsert_external_id.assert_called_once_with(
        source="FAB", entity_type="competition_season",
        external_id="opaque-9955", entity_id="competition-season-1",
    )
    assert any("SET competition_season_id=%s" in call.args[0] for call in connection.execute.call_args_list)


def test_selected_competition_is_relinked_without_changing_its_role():
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = (
        "opaque-9955", "Senior Masculino", "Primera Provincial", "Sevilla", None, None
    )
    repository = SportsRepository(connection)
    repository.resolve_external_id = MagicMock(return_value="selected-season")
    repository.upsert_from_external = MagicMock()
    repository.upsert_external_id = MagicMock()

    assert repository.ensure_monitored_competition("9955") == "selected-season"
    repository.upsert_from_external.assert_not_called()


def test_scheduler_includes_monitored_competitions():
    connection = MagicMock()
    connection.execute.return_value.fetchall.side_effect = [
        [("9955",)], [("season-1", "9955")],
    ]
    repository = SportsRepository(connection)
    repository.ensure_monitored_competition = MagicMock()

    assert repository.list_selected_competitions() == [("season-1", "9955")]
    repository.ensure_monitored_competition.assert_called_once_with("9955")
    assert "c.monitored=TRUE" in connection.execute.call_args_list[1].args[0]


def test_monitored_competition_resolves_with_current_catalog_opaque_id():
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = ("season-1", "opaque-9955")

    assert SportsRepository(connection).resolve_competition_selection("9955") == (
        "season-1", "opaque-9955"
    )
    query = connection.execute.call_args.args[0]
    assert "c.monitored = TRUE" in query
    assert "cs.fantasy_role IN ('validation', 'primary') OR c.id IS NOT NULL" in query


def test_linked_monitored_competition_keeps_current_fab_identity():
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = (
        "opaque-9955", "Senior Masculino", "Primera Provincial", "Sevilla", None,
        "competition-season-1",
    )
    repository = SportsRepository(connection)
    repository.upsert_external_id = MagicMock()

    assert repository.ensure_monitored_competition("9955") == "competition-season-1"
    repository.upsert_external_id.assert_called_once_with(
        source="FAB", entity_type="competition_season",
        external_id="opaque-9955", entity_id="competition-season-1",
    )
