from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from .client import FabClient
from .repository import SportsRepository


class BoxscoreContractError(RuntimeError):
    pass


@dataclass(frozen=True)
class BoxscoreSyncSummary:
    games: int
    players_created: int
    players_updated: int
    rejected: int


STAT_FIELDS = {
    "starter": ("quintetotitular", "bool"),
    "minutes_played": ("tiempo_jugado", "decimal"),
    "milliseconds_played": ("milisegundos_jugados", "int"),
    "points": ("puntos", "int"),
    "free_throws_made": ("canasta1p", "int"),
    "free_throws_attempted": ("tiro1p", "int"),
    "two_pointers_made": ("canasta2p", "int"),
    "two_pointers_attempted": ("tiro2p", "int"),
    "three_pointers_made": ("canasta3p", "int"),
    "three_pointers_attempted": ("tiro3p", "int"),
    "offensive_rebounds": ("reboteofensivo", "int"),
    "defensive_rebounds": ("rebotedefensivo", "int"),
    "rebounds": ("rebotes", "int"),
    "assists": ("asistencias", "int"),
    "steals": ("recuperaciones", "int"),
    "turnovers": ("perdidas", "int"),
    "blocks": ("taponescometidos", "int"),
    "blocks_received": ("taponesrecibidos", "int"),
    "fouls_committed": ("faltascometidas", "int"),
    "fouls_received": ("faltasrecibidas", "int"),
    "valuation": ("valoracion", "int"),
    "plus_minus": ("masMenos", "int"),
}


def sync_game_stats(
    client: FabClient, repository: SportsRepository, *, external_game_id: str
) -> BoxscoreSyncSummary:
    context = repository.get_game_stats_context(external_game_id)
    if context["status"] != "finished" or not context["has_statistics"]:
        raise BoxscoreContractError("game is not eligible for final statistics")

    captured: list[dict] = []
    payload = client.get_match_stats(external_game_id, payload_sink=captured.append)
    with repository.connection.transaction():
        repository.save_raw_payload(
            endpoint="/v2/envivo/estadisticas.ashx",
            entity_type="game_statistics",
            external_id=external_game_id,
            http_status=200,
            payload=captured[0],
        )

    stats = payload["estadisticas"]
    game_payload = payload["partido"]
    sides = (
        (
            "home",
            stats.get("estadisticasequipolocal"),
            context["home_registration_id"],
            _text(game_payload.get("idlocal")),
        ),
        (
            "away",
            stats.get("estadisticasequipovisitante"),
            context["away_registration_id"],
            _text(game_payload.get("idvisitante")),
        ),
    )
    if any(not isinstance(rows, list) or not rows for _, rows, _, _ in sides):
        raise BoxscoreContractError("FAB boxscore is incomplete")
    _validate_score_totals(game_payload, sides)

    stable_ids: set[str] = set()
    seen_registration_ids = set()
    created = updated = 0
    with repository.connection.transaction():
        for side, rows, team_registration_id, expected_team_id in sides:
            assert isinstance(rows, list)
            for index, row in enumerate(rows):
                if not isinstance(row, dict):
                    raise BoxscoreContractError("FAB boxscore contains an invalid player")
                name = _text(row.get("nombre"))
                if name is None:
                    raise BoxscoreContractError("FAB boxscore player has no name")
                row_team_id = _text(row.get("idequipo"))
                if expected_team_id and row_team_id and row_team_id != expected_team_id:
                    raise BoxscoreContractError("FAB boxscore player belongs to the wrong team")
                component_id = _text(row.get("componente_id"))
                if component_id:
                    player_external_id = f"component:{component_id}"
                    if player_external_id in stable_ids:
                        raise BoxscoreContractError("FAB boxscore repeats a stable player identity")
                    stable_ids.add(player_external_id)
                    provisional = False
                else:
                    player_external_id = f"provisional:{external_game_id}:{side}:{index}"
                    provisional = True
                registration_id, was_created = repository.upsert_player_registration(
                    player_external_id=player_external_id,
                    display_name=name,
                    provisional=provisional,
                    team_registration_id=team_registration_id,
                    competition_season_id=context["competition_season_id"],
                    shirt_number=_text(row.get("dorsal")),
                )
                seen_registration_ids.add(registration_id)
                values = {
                    "game_id": context["game_id"],
                    "player_registration_id": registration_id,
                    **_map_stats(row),
                }
                repository.upsert_from_external(
                    source="FAB",
                    entity_type="player_game_stat",
                    external_id=f"{external_game_id}:{registration_id}",
                    values=values,
                )
                created += int(was_created)
                updated += int(not was_created)
        repository.delete_game_stats_except(context["game_id"], seen_registration_ids)
        repository.mark_game_stats_final(context["game_id"])
    return BoxscoreSyncSummary(1, created, updated, 0)


def _validate_score_totals(game_payload: dict[str, Any], sides: tuple) -> None:
    """Reject internally inconsistent payloads instead of guessing player stats.

    Copa Delegación has returned complete-looking player rows whose aggregate is
    exactly twice the authoritative scoreboard. Dividing individual rows is not
    safe because several counting stats are odd, so the payload remains RAW and
    retriable until FAB publishes a coherent revision.
    """
    expected = (game_payload.get("tanteo_local"), game_payload.get("tanteo_visitante"))
    for (_, rows, _, _), score in zip(sides, expected, strict=True):
        if score in (None, ""):
            continue
        try:
            scoreboard = int(score)
            player_total = sum(int(row.get("puntos") or 0) for row in rows)
        except (TypeError, ValueError) as error:
            raise BoxscoreContractError("FAB boxscore score total is invalid") from error
        if player_total != scoreboard:
            raise BoxscoreContractError("FAB player points do not match the final score")


def sync_competition_stats(
    client: FabClient,
    repository: SportsRepository,
    *,
    category_competition_id: str,
    force: bool = False,
) -> BoxscoreSyncSummary:
    competition_season_id, _ = repository.resolve_competition_selection(category_competition_id)
    total = BoxscoreSyncSummary(0, 0, 0, 0)
    for external_game_id in repository.list_eligible_stats_games(
        competition_season_id, force=force
    ):
        try:
            result = sync_game_stats(client, repository, external_game_id=external_game_id)
        except BoxscoreContractError:
            total = BoxscoreSyncSummary(
                total.games, total.players_created, total.players_updated, total.rejected + 1
            )
        else:
            total = BoxscoreSyncSummary(
                total.games + result.games,
                total.players_created + result.players_created,
                total.players_updated + result.players_updated,
                total.rejected,
            )
    return total


def _map_stats(row: dict[str, Any]) -> dict[str, Any]:
    mapped: dict[str, Any] = {}
    for target, (source, kind) in STAT_FIELDS.items():
        value = row.get(source)
        if value is None or value == "":
            mapped[target] = None
        elif kind == "bool":
            mapped[target] = str(value).strip().casefold() in {"1", "true", "si", "sí"}
        elif kind == "decimal":
            mapped[target] = _minutes(value, source)
        else:
            try:
                mapped[target] = int(value)
            except (TypeError, ValueError) as error:
                raise BoxscoreContractError(f"FAB player statistic {source} is invalid") from error
    return mapped


def _text(value: Any) -> str | None:
    if value is None or not str(value).strip():
        return None
    return str(value).strip()


def _minutes(value: Any, source: str) -> Decimal:
    text = str(value).strip()
    if ":" in text:
        parts = text.split(":")
        if len(parts) != 2:
            raise BoxscoreContractError(f"FAB player statistic {source} is invalid")
        try:
            minutes, seconds = int(parts[0]), int(parts[1])
        except ValueError as error:
            raise BoxscoreContractError(f"FAB player statistic {source} is invalid") from error
        if minutes < 0 or not 0 <= seconds < 60:
            raise BoxscoreContractError(f"FAB player statistic {source} is invalid")
        return Decimal(minutes) + Decimal(seconds) / Decimal(60)
    try:
        return Decimal(text.replace(",", "."))
    except InvalidOperation as error:
        raise BoxscoreContractError(f"FAB player statistic {source} is invalid") from error
