from unittest.mock import Mock

from fab_ingestor.repository import normalized_player_name
from fab_ingestor.roster import sync_competition_rosters


def _team(stable_id="119626"):
    return {
        "Id": "device-team", "IdEquipoNotificacion": stable_id,
        "Nombre": "CB Ejemplo", "Categoria": "LIGA NACIONAL N1 MAS",
        "Temporada": "Temporada 2026/2027",
    }


def _player(name):
    return {
        "Id": "device-player", "Nombre": name, "NombreEquipo": "CB Ejemplo",
        "Categoria": "LIGA NACIONAL N1 MAS", "Temporada": "Temporada 2026/2027",
    }


def _client(rows):
    client = Mock()
    client.search_category.return_value = [
        {"Id": "device-category", "IdCompeticionCategoria": 10027}
    ]
    client.get_category_phases.return_value = {
        "listaFasesGrupo": [
            {"IdFase": "phase", "TipoFase": "LIGA", "Grupos": [{"IdGrupo": "group"}]}
        ]
    }
    client.get_category_teams.return_value = [_team()]
    client.get_team_players.return_value = rows
    return client


def _repository():
    repository = Mock()
    repository.resolve_competition_selection.return_value = ("season-id", "old-handle")
    repository.competition_search_terms.return_value = ["N1 MAS"]
    repository.resolve_roster_team_registration.return_value = "team-registration-id"
    repository.upsert_roster_player.return_value = ("registration-id", True, "ROSTER_ONLY")
    return repository


def test_empty_fab_roster_is_unavailable_and_preserves_existing_data():
    client, repository = _client([]), _repository()
    summary = sync_competition_rosters(client, repository, category_competition_id="10027")
    assert summary.teams == 1
    assert summary.unavailable == 1
    assert summary.observed == 0
    repository.upsert_roster_player.assert_not_called()


def test_published_pregame_roster_uses_stable_team_and_provisional_identity():
    client, repository = _client([_player("María Pérez")]), _repository()
    summary = sync_competition_rosters(client, repository, category_competition_id="10027")
    assert (summary.observed, summary.created, summary.unavailable) == (1, 1, 0)
    repository.resolve_roster_team_registration.assert_called_once_with(
        "season-id", "CB Ejemplo", "119626"
    )
    repository.upsert_roster_player.assert_called_once_with(
        competition_season_id="season-id",
        team_registration_id="team-registration-id",
        display_name="María Pérez",
    )


def test_same_team_homonyms_are_not_merged():
    client, repository = _client([_player("María Pérez"), _player("MARIA PEREZ")]), _repository()
    summary = sync_competition_rosters(client, repository, category_competition_id="10027")
    assert summary.ambiguous == 2
    repository.upsert_roster_player.assert_not_called()
    assert repository.mark_roster_name_conflict.call_count == 2


def test_name_normalization_keeps_compound_surnames_and_removes_accents():
    assert normalized_player_name("  María-Luisa  Pérez  Gómez ") == "maria luisa perez gomez"
