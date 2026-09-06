import json
from contextlib import nullcontext
from decimal import Decimal
from pathlib import Path

import pytest

from fab_ingestor.boxscore import BoxscoreContractError, sync_game_stats

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "fab_boxscore.json").read_text(encoding="utf-8")
)


class Connection:
    def transaction(self):
        return nullcontext()


class Client:
    def __init__(self, payload=FIXTURE):
        self.payload = payload

    def get_match_stats(self, match_id, *, payload_sink):
        payload_sink(self.payload)
        return self.payload


class Repository:
    connection = Connection()

    def __init__(self):
        self.players = {}
        self.stats = {}
        self.raw = []
        self.final = False

    def get_game_stats_context(self, external_game_id):
        return {
            "game_id": "game",
            "competition_season_id": "season",
            "home_registration_id": "home-registration",
            "away_registration_id": "away-registration",
            "status": "finished",
            "has_statistics": True,
        }

    def save_raw_payload(self, **values):
        self.raw.append(values)

    def upsert_player_registration(self, **values):
        key = (values["player_external_id"], values["team_registration_id"])
        created = key not in self.players
        self.players[key] = values
        return str(key), created

    def upsert_from_external(self, *, external_id, values, **_):
        self.stats[external_id] = values
        return external_id

    def mark_game_stats_final(self, game_id):
        self.final = True

    def delete_game_stats_except(self, game_id, registration_ids):
        self.stats = {
            key: value
            for key, value in self.stats.items()
            if value["player_registration_id"] in registration_ids
        }


def test_boxscore_maps_nullable_stats_and_is_idempotent():
    repository = Repository()
    first = sync_game_stats(Client(), repository, external_game_id="opaque-game")
    second = sync_game_stats(Client(), repository, external_game_id="opaque-game")

    assert (first.players_created, first.players_updated) == (2, 0)
    assert (second.players_created, second.players_updated) == (0, 2)
    assert len(repository.players) == len(repository.stats) == 2
    visitor = next(v for v in repository.stats.values() if v["points"] == 8)
    local = next(v for v in repository.stats.values() if v["points"] == 12)
    assert local["minutes_played"] == Decimal("21.5")
    assert visitor["assists"] is None
    assert visitor["rebounds"] is None
    assert repository.final is True
    assert len(repository.raw) == 2


def test_missing_component_id_is_scoped_to_game_team_and_slot():
    repository = Repository()
    sync_game_stats(Client(), repository, external_game_id="opaque-game")
    provisional = next(v for v in repository.players.values() if v["provisional"])
    assert provisional["player_external_id"] == "provisional:opaque-game:away:0"


def test_incomplete_boxscore_is_preserved_but_not_published():
    payload = json.loads(json.dumps(FIXTURE))
    payload["estadisticas"]["estadisticasequipovisitante"] = []
    repository = Repository()

    with pytest.raises(BoxscoreContractError, match="incomplete"):
        sync_game_stats(Client(payload), repository, external_game_id="opaque-game")
    assert len(repository.raw) == 1
    assert repository.stats == {}
    assert repository.final is False


def test_duplicate_stable_player_identity_rolls_back_before_final_marker():
    payload = json.loads(json.dumps(FIXTURE))
    payload["estadisticas"]["estadisticasequipovisitante"][0]["componente_id"] = "anon-local-1"
    repository = Repository()

    with pytest.raises(BoxscoreContractError, match="repeats"):
        sync_game_stats(Client(payload), repository, external_game_id="opaque-game")
    assert repository.final is False


def test_player_on_wrong_team_is_rejected():
    payload = json.loads(json.dumps(FIXTURE))
    payload["estadisticas"]["estadisticasequipovisitante"][0]["idequipo"] = "team-home"
    repository = Repository()

    with pytest.raises(BoxscoreContractError, match="wrong team"):
        sync_game_stats(Client(payload), repository, external_game_id="opaque-game")
    assert repository.final is False


def test_player_totals_must_match_authoritative_scoreboard():
    payload = json.loads(json.dumps(FIXTURE))
    payload["partido"]["tanteo_local"] = 6
    payload["partido"]["tanteo_visitante"] = 4
    repository = Repository()

    with pytest.raises(BoxscoreContractError, match="do not match"):
        sync_game_stats(Client(payload), repository, external_game_id="opaque-game")
    assert len(repository.raw) == 1
    assert repository.stats == {}
    assert repository.final is False
