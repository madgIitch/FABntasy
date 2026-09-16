import json
from contextlib import nullcontext
from decimal import Decimal
from pathlib import Path

import pytest

from fab_ingestor.boxscore import BoxscoreContractError, sync_competition_stats, sync_game_stats
from fab_ingestor.client import FabMatchUnavailableError, FabResponseError

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "fab_boxscore.json").read_text(encoding="utf-8")
)

FIXTURE["partido"]["tanteo_local"] = 12
FIXTURE["partido"]["tanteo_visitante"] = 8

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
        self.partial = False
        self.live = []
        self.cached_payload = None

    def get_latest_valid_game_statistics_payload(self, external_game_id):
        return self.cached_payload

    def get_game_stats_context(self, external_game_id):
        return {
            "game_id": "game",
            "competition_season_id": "season",
            "home_registration_id": "home-registration",
            "away_registration_id": "away-registration",
            "status": "finished",
            "has_statistics": True,
            "home_score": 12,
            "away_score": 8,
        }

    def advisory_game_lock(self, external_game_id):
        return nullcontext(True)

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

    def mark_game_stats_partial(self, game_id):
        self.partial = True

    def reconcile_live_game(self, game_id, **values):
        self.live.append(values)
        return True

    def delete_game_stats_except(self, game_id, registration_ids):
        self.stats = {
            key: value
            for key, value in self.stats.items()
            if value["player_registration_id"] in registration_ids
        }

class InvalidResponseClient:
    def __init__(self, payload):
        self.payload = payload

    def get_match_stats(self, match_id, *, payload_sink):
        payload_sink(self.payload)
        raise FabResponseError(
            "FAB match statistics returned an invalid response"
        )


class PreJsonInvalidResponseClient:
    def get_match_stats(self, match_id, *, payload_sink):
        payload_sink(
            {
                "_diagnostic": True,
                "http_status": 200,
                "body": "<html>upstream error</html>",
                "body_truncated": False,
                "parse_error": "invalid_json",
            }
        )
        raise FabResponseError("FAB returned invalid JSON")


class UnavailableMatchClient:
    def get_match_stats(self, match_id, *, payload_sink):
        payload_sink({"resultado": "error", "error": "Id no válido"})
        raise FabMatchUnavailableError("FAB match is no longer available")


def test_competition_stats_rejects_removed_match_and_continues():
    repository = Repository()
    repository.resolve_competition_selection = lambda _: ("season", "opaque")
    repository.list_eligible_stats_games = lambda *_args, **_kwargs: ["removed-game"]
    stale = []
    repository.mark_game_stale_after_unavailable = stale.append

    result = sync_competition_stats(
        UnavailableMatchClient(), repository, category_competition_id="10468"
    )

    assert result.rejected == 1
    assert result.games == 0
    assert stale == ["removed-game"]


def test_competition_stats_does_not_hide_other_fab_response_errors():
    repository = Repository()
    repository.resolve_competition_selection = lambda _: ("season", "opaque")
    repository.list_eligible_stats_games = lambda *_args, **_kwargs: ["broken-game"]

    with pytest.raises(FabResponseError):
        sync_competition_stats(
            InvalidResponseClient({"resultado": "error", "error": "other"}),
            repository,
            category_competition_id="10468",
        )

def test_finished_schedule_wins_over_stale_live_status():
    payload = json.loads(json.dumps(FIXTURE))
    payload["partido"]["estado_partido"] = "COMENZADO"

    repository = Repository()

    sync_game_stats(
        Client(payload),
        repository,
        external_game_id="opaque-game",
    )

    assert repository.live[-1]["status"] == "finished"
    assert repository.final is True
    assert repository.partial is False

def test_finished_game_can_fall_back_to_last_valid_raw_payload():
    cached = json.loads(json.dumps(FIXTURE))
    cached["partido"]["estado_partido"] = "COMENZADO"

    repository = Repository()
    repository.cached_payload = cached

    rejected = {
        "resultado": "error",
        "error": "statistics unavailable",
    }

    result = sync_game_stats(
        InvalidResponseClient(rejected),
        repository,
        external_game_id="opaque-game",
    )

    assert result.games == 1
    assert repository.final is True

    # La respuesta inválida actual también queda guardada para diagnóstico.
    assert any(
        row["payload"].get("resultado") == "error"
        for row in repository.raw
    )


def test_pre_json_failure_is_preserved_with_its_http_status():
    repository = Repository()

    with pytest.raises(FabResponseError, match="invalid JSON"):
        sync_game_stats(
            PreJsonInvalidResponseClient(),
            repository,
            external_game_id="opaque-game",
        )

    assert repository.raw == [
        {
            "endpoint": "/v2/envivo/estadisticas.ashx",
            "entity_type": "game_statistics",
            "external_id": "opaque-game",
            "http_status": 200,
            "payload": {
                "_diagnostic": True,
                "http_status": 200,
                "body": "<html>upstream error</html>",
                "body_truncated": False,
                "parse_error": "invalid_json",
            },
        }
    ]

def test_cached_snapshot_cannot_finalize_with_wrong_score():
    cached = json.loads(json.dumps(FIXTURE))

    repository = Repository()
    repository.cached_payload = cached

    original_context = repository.get_game_stats_context

    def context(game_id):
        values = original_context(game_id)
        values["home_score"] = 999
        return values

    repository.get_game_stats_context = context

    rejected = {
        "resultado": "error",
        "error": "statistics unavailable",
    }

    with pytest.raises(
        BoxscoreContractError,
        match="does not match final schedule",
    ):
        sync_game_stats(
            InvalidResponseClient(rejected),
            repository,
            external_game_id="opaque-game",
        )

    assert repository.final is False

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

    original_context = repository.get_game_stats_context

    def context(game_id):
        values = original_context(game_id)
        values["home_score"] = 6
        values["away_score"] = 4
        return values

    repository.get_game_stats_context = context

    with pytest.raises(
        BoxscoreContractError,
        match="do not match",
    ):
        sync_game_stats(
            Client(payload),
            repository,
            external_game_id="opaque-game",
        )

    assert len(repository.raw) == 1
    assert repository.stats == {}
    assert repository.final is False


def test_fab_totals_rows_are_excluded_before_validation_and_persistence():
    payload = json.loads(json.dumps(FIXTURE))
    for key in ("estadisticasequipolocal", "estadisticasequipovisitante"):
        player_rows = payload["estadisticas"][key]
        totals = json.loads(json.dumps(player_rows[0]))
        totals.update(
            nombre="  TOTALES  ",
            componente_id="aggregate-totals",
            dorsal=None,
            puntos=sum(int(row.get("puntos") or 0) for row in player_rows),
        )
        player_rows.append(totals)

    repository = Repository()
    result = sync_game_stats(Client(payload), repository, external_game_id="opaque-game")

    assert result.players_created == 2
    assert len(repository.players) == len(repository.stats) == 2
    assert all(player["display_name"].strip().casefold() != "totales" for player in repository.players.values())
    assert repository.final is True


def test_live_score_is_persisted_without_player_rows():
    payload = {
        "resultado": "correcto",
        "partido": {
            "estado_partido": "COMENZADO",
            "tanteo_local": 21,
            "tanteo_visitante": 24,
            "periodos": [{"periodo": 1, "tanteo_periodo_local": 21, "tanteo_periodo_visitante": 24}],
            "fechaultimaactualizacion": "/Date(1789150665117)/",
            "idlocal": "team-home",
            "idvisitante": "team-away",
        },
        "estadisticas": {"estadisticasequipolocal": [], "estadisticasequipovisitante": []},
    }
    repository = Repository()
    repository.get_game_stats_context = lambda _: {
        "game_id": "game", "competition_season_id": "season",
        "home_registration_id": "home-registration", "away_registration_id": "away-registration",
        "status": "scheduled", "has_statistics": True,
    }

    result = sync_game_stats(Client(payload), repository, external_game_id="opaque-game")

    assert result.games == 1
    assert repository.live[-1]["status"] == "live"
    assert (repository.live[-1]["home_score"], repository.live[-1]["away_score"]) == (21, 24)
    assert repository.stats == {}
    assert repository.final is repository.partial is False


def test_live_player_rows_are_partial_and_do_not_delete_disappearing_players():
    payload = json.loads(json.dumps(FIXTURE))
    payload["partido"]["estado_partido"] = "COMENZADO"
    payload["partido"]["fechaultimaactualizacion"] = "/Date(1789150665117)/"
    payload["estadisticas"]["estadisticasequipovisitante"] = []
    payload["estadisticas"]["estadisticasequipolocal"][0].pop("asistencias", None)
    repository = Repository()
    repository.get_game_stats_context = lambda _: {
        "game_id": "game", "competition_season_id": "season",
        "home_registration_id": "home-registration", "away_registration_id": "away-registration",
        "status": "live", "has_statistics": True,
    }

    sync_game_stats(Client(payload), repository, external_game_id="opaque-game")

    assert repository.partial is True
    assert repository.final is False
    stat = next(iter(repository.stats.values()))
    assert "assists" not in stat
