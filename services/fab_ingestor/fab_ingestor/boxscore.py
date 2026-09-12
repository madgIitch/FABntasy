from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
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
    "technical_fouls": ("tecnicas", "int"),
    "valuation": ("valoracion", "int"),
    "plus_minus": ("masMenos", "int"),
}


def sync_game_stats(
    client: FabClient, repository: SportsRepository, *, external_game_id: str
) -> BoxscoreSyncSummary:
    with repository.advisory_game_lock(external_game_id) as acquired:
        if not acquired:
            return BoxscoreSyncSummary(0, 0, 0, 0)
        return _sync_game_stats_unlocked(
            client, repository, external_game_id=external_game_id
        )


def _sync_game_stats_unlocked(
    client: FabClient, repository: SportsRepository, *, external_game_id: str
) -> BoxscoreSyncSummary:
    context = repository.get_game_stats_context(external_game_id)
    if not context["has_statistics"]:
        raise BoxscoreContractError("game does not expose statistics")

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
    live_status = _normalize_live_status(game_payload.get("estado_partido"), context["status"])
    live_updated_at = _parse_fab_timestamp(game_payload.get("fechaultimaactualizacion"))
    periods = game_payload.get("periodos")
    if periods is not None and not isinstance(periods, list):
        raise BoxscoreContractError("FAB live periods are invalid")
    home_score = _optional_int(game_payload.get("tanteo_local"), "tanteo_local")
    away_score = _optional_int(game_payload.get("tanteo_visitante"), "tanteo_visitante")
    with repository.connection.transaction():
        repository.reconcile_live_game(
            context["game_id"], status=live_status,
            source_status=_text(game_payload.get("estado_partido")),
            home_score=home_score, away_score=away_score,
            score_by_period=periods,
            source_score={"ResultadoLocal": home_score, "ResultadoVisitante": away_score,
                          "ResultadosPeriodo": periods} if home_score is not None or away_score is not None else None,
            updated_at=live_updated_at,
        )
    is_final = live_status == "finished"
    sides = (
        (
            "home",
            _player_rows(stats, "estadisticasequipolocal", "estadisticasEquipoLocal"),
            context["home_registration_id"],
            _text(game_payload.get("idlocal")),
        ),
        (
            "away",
            _player_rows(stats, "estadisticasequipovisitante", "estadisticasEquipoVisitante"),
            context["away_registration_id"],
            _text(game_payload.get("idvisitante")),
        ),
    )
    if is_final and any(not rows for _, rows, _, _ in sides):
        raise BoxscoreContractError("FAB boxscore is incomplete")
    if is_final:
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
                    **_map_stats(row, partial=not is_final),
                }
                repository.upsert_from_external(
                    source="FAB",
                    entity_type="player_game_stat",
                    external_id=f"{external_game_id}:{registration_id}",
                    values=values,
                )
                created += int(was_created)
                updated += int(not was_created)
        if is_final:
            repository.delete_game_stats_except(context["game_id"], seen_registration_ids)
            repository.mark_game_stats_final(context["game_id"])
        elif seen_registration_ids:
            repository.mark_game_stats_partial(context["game_id"])
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


def _map_stats(row: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    mapped: dict[str, Any] = {}
    for target, (source, kind) in STAT_FIELDS.items():
        value = row.get(source)
        if value is None or value == "":
            if not partial:
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


def _stats_rows(stats: dict[str, Any], *keys: str) -> list[Any]:
    for key in keys:
        value = stats.get(key)
        if isinstance(value, list):
            return value
    return []


def _player_rows(stats: dict[str, Any], *keys: str) -> list[Any]:
    """Return individual performances, excluding FAB's aggregate totals row."""
    return [
        row
        for row in _stats_rows(stats, *keys)
        if not (
            isinstance(row, dict)
            and (_text(row.get("nombre")) or "").casefold() == "totales"
        )
    ]


def _optional_int(value: Any, field: str) -> int | None:
    if value in (None, "", "-"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise BoxscoreContractError(f"FAB live {field} is invalid") from error


def _parse_fab_timestamp(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    match = re.fullmatch(r"/Date\((-?\d+)(?:[+-]\d{4})?\)/", str(value).strip())
    if match is None:
        raise BoxscoreContractError("FAB live update timestamp is invalid")
    milliseconds = int(match.group(1))
    return None if milliseconds <= 0 else datetime.fromtimestamp(milliseconds / 1000, UTC)


def _normalize_live_status(value: Any, fallback: str) -> str:
    normalized = (_text(value) or "").casefold()
    if normalized in {"finalizado", "terminado"}:
        return "finished"
    if normalized in {"comenzado", "en juego", "en directo"}:
        return "live"
    if normalized in {"aplazado", "suspendido"}:
        return "postponed"
    if normalized in {"no comenzado", "programado"}:
        return "scheduled"
    return fallback


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
