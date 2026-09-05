from __future__ import annotations

import json
import random
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import ClassVar, Protocol


class FabError(RuntimeError):
    """Base error whose message is always safe to log."""


class FabResponseError(FabError):
    pass


class FabTransportError(FabError):
    pass


@dataclass(frozen=True)
class Credentials:
    device_id: str
    key: str


class CredentialStore(Protocol):
    def load(self) -> Credentials | None: ...

    def replace(self, credentials: Credentials) -> None: ...


class MemoryCredentialStore:
    def __init__(self, credentials: Credentials | None = None) -> None:
        self._credentials = credentials

    def load(self) -> Credentials | None:
        return self._credentials

    def replace(self, credentials: Credentials) -> None:
        self._credentials = credentials


Transport = Callable[[str, Mapping[str, str], float], tuple[int, bytes]]


def _urllib_transport(url: str, fields: Mapping[str, str], timeout: float) -> tuple[int, bytes]:
    body = urllib.parse.urlencode(fields).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "FABntasy-ingestor/0.1 (+responsible-data-sync)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except (urllib.error.URLError, TimeoutError) as error:
        raise FabTransportError("FAB request failed or timed out") from error


class FabClient:
    SEARCH_ACTIONS: ClassVar[dict[str, str]] = {
        "match": "buscarPartido",
        "category": "buscarCategoria",
        "team": "buscarEquipo",
    }

    def __init__(
        self,
        credential_store: CredentialStore,
        *,
        base_url: str = "https://appaficion.andaluzabaloncesto.org",
        transport: Transport = _urllib_transport,
        timeout: float = 10.0,
        max_retries: int = 3,
        min_interval: float = 0.25,
        sleeper: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._store = credential_store
        self._base_url = base_url.rstrip("/")
        self._transport = transport
        self._timeout = timeout
        self._max_retries = max_retries
        self._min_interval = min_interval
        self._sleep = sleeper
        self._clock = clock
        self._last_request_at: float | None = None

    def register_device(self) -> Credentials:
        payload = self._post(
            "/dispositivo.ashx",
            {
                "accion": "registrar",
                "uid": secrets.token_hex(8),
                "plataforma": "ANDROID",
                "tipo_dispositivo": "PHONE",
                "version": "5.0.27",
            },
            authenticated=False,
        )
        if str(payload.get("resultado", "")).lower() != "correcto":
            raise FabResponseError("FAB device registration was rejected")
        device_id, key = payload.get("id_dispositivo"), payload.get("key")
        valid_device = isinstance(device_id, (str, int)) and bool(str(device_id))
        if not valid_device or not isinstance(key, str) or not key:
            raise FabResponseError("FAB device registration returned an invalid response")
        credentials = Credentials(str(device_id), key)
        self._store.replace(credentials)
        return credentials

    def search_match(self, text: str, *, page_size: int = 20) -> list[dict]:
        return self._search("match", text, page_size)

    def search_category(
        self,
        text: str,
        *,
        page_size: int = 20,
        payload_sink: Callable[[dict], None] | None = None,
    ) -> list[dict]:
        return self._search("category", text, page_size, payload_sink=payload_sink)

    def search_team(self, text: str, *, page_size: int = 20) -> list[dict]:
        return self._search("team", text, page_size)

    def get_team_phases(self, team_id: str) -> dict:
        if not team_id:
            raise ValueError("team_id cannot be empty")
        payload = self._post(
            "/v2/equipo.ashx",
            {"accion": "fasesGrupos", "id_equipo": team_id},
        )
        phases = payload.get("listaFasesGrupo")
        if str(payload.get("resultado", "")).lower() != "correcto" or not isinstance(phases, list):
            raise FabResponseError("FAB team phases returned an invalid response")
        return payload

    def get_category_phases(
        self,
        category_competition_id: str,
        *,
        payload_sink: Callable[[dict], None] | None = None,
    ) -> dict:
        if not category_competition_id:
            raise ValueError("category_competition_id cannot be empty")
        payload = self._post(
            "/v2/categoria.ashx",
            {
                "accion": "fasesGrupos",
                "id_categoria_competicion": category_competition_id,
            },
        )
        if payload_sink is not None:
            payload_sink(payload)
        phases = payload.get("listaFasesGrupo")
        if str(payload.get("resultado", "")).lower() != "correcto" or not isinstance(phases, list):
            raise FabResponseError("FAB category phases returned an invalid response")
        return payload

    def get_category_teams(
        self,
        phase_id: str,
        group_id: str,
        phase_type: str,
        *,
        matchday: str = "",
        window: str = "",
        payload_sink: Callable[[dict], None] | None = None,
    ) -> list[dict]:
        if not phase_id or not group_id or not phase_type:
            raise ValueError("phase_id, group_id and phase_type cannot be empty")
        payload = self._post(
            "/v2/categoria.ashx",
            {
                "accion": "equipos",
                "id_fase": phase_id,
                "id_grupo": group_id,
                "jornada": matchday,
                "tipo_fase": phase_type,
                "ventana": window,
            },
        )
        if payload_sink is not None:
            payload_sink(payload)
        teams = payload.get("equipos")
        if str(payload.get("resultado", "")).lower() != "correcto" or not isinstance(teams, list):
            raise FabResponseError("FAB category teams returned an invalid response")
        if not all(isinstance(team, dict) for team in teams):
            raise FabResponseError("FAB category teams returned invalid items")
        return teams

    def get_category_matchdays(
        self,
        category_competition_id: str,
        phase_id: str,
        *,
        group_id: str = "",
        round_id: str = "",
        payload_sink: Callable[[dict], None] | None = None,
    ) -> list[dict]:
        payload = self._category_schedule_request(
            "Jornadas",
            category_competition_id,
            phase_id,
            group_id=group_id,
            round_id=round_id,
        )
        if payload_sink is not None:
            payload_sink(payload)
        matchdays = payload.get("ListaJornadas")
        if str(payload.get("resultado", "")).lower() != "correcto" or not isinstance(
            matchdays, list
        ):
            raise FabResponseError("FAB category matchdays returned an invalid response")
        if not all(isinstance(matchday, dict) for matchday in matchdays):
            raise FabResponseError("FAB category matchdays returned invalid items")
        return matchdays

    def get_category_matches(
        self,
        category_competition_id: str,
        phase_id: str,
        *,
        group_id: str = "",
        round_id: str = "",
        payload_sink: Callable[[dict], None] | None = None,
    ) -> list[dict]:
        payload = self._category_schedule_request(
            "horariosJornadas",
            category_competition_id,
            phase_id,
            group_id=group_id,
            round_id=round_id,
        )
        if payload_sink is not None:
            payload_sink(payload)
        matches = payload.get("partidos")
        if str(payload.get("resultado", "")).lower() != "correcto" or not isinstance(matches, list):
            raise FabResponseError("FAB category matches returned an invalid response")
        if not all(isinstance(match, dict) for match in matches):
            raise FabResponseError("FAB category matches returned invalid items")
        return matches

    def _category_schedule_request(
        self,
        action: str,
        category_competition_id: str,
        phase_id: str,
        *,
        group_id: str,
        round_id: str,
    ) -> dict:
        if not category_competition_id or not phase_id:
            raise ValueError("category_competition_id and phase_id cannot be empty")
        if bool(group_id) == bool(round_id):
            raise ValueError("exactly one of group_id or round_id is required")
        return self._post(
            "/v2/categoria.ashx",
            {
                "accion": action,
                "id_categoria_competicion": category_competition_id,
                "id_fase": phase_id,
                "id_grupo": group_id if not round_id else "",
                "id_ronda": round_id,
                "fecha_inicial": "",
                "fecha_final": "",
            },
        )

    def _search(
        self,
        resource: str,
        text: str,
        page_size: int,
        *,
        payload_sink: Callable[[dict], None] | None = None,
    ) -> list[dict]:
        if page_size <= 0:
            raise ValueError("page_size must be positive")
        action = self.SEARCH_ACTIONS[resource]
        items: list[dict] = []
        skip = 0
        while True:
            payload = self._post(
                "/v2/busqueda.ashx",
                {"accion": action, "texto": text, "skip": str(skip)},
            )
            if payload_sink is not None:
                payload_sink(payload)
            page = self._extract_page(payload, resource)
            items.extend(page)
            server_page_size = payload.get("numeroMaximoResultados", page_size)
            try:
                step = int(server_page_size)
            except (TypeError, ValueError):
                step = page_size
            if step <= 0:
                step = page_size
            if not page or len(page) < step:
                return items
            skip += step

    @staticmethod
    def _extract_page(payload: dict, resource: str) -> list[dict]:
        candidates = {
            "match": ("partidos", "Partidos"),
            "category": ("categorias", "Categorias"),
            "team": ("equipos", "Equipos"),
        }[resource]
        for key in candidates:
            value = payload.get(key)
            if isinstance(value, list) and all(isinstance(item, dict) for item in value):
                return value
        raise FabResponseError("FAB search returned an invalid response")

    def _post(self, path: str, fields: Mapping[str, str], *, authenticated: bool = True) -> dict:
        request_fields = dict(fields)
        if authenticated:
            credentials = self._store.load()
            if credentials is None:
                raise FabResponseError("FAB credentials are not configured")
            request_fields.update(id_dispositivo=credentials.device_id, key=credentials.key)

        for attempt in range(self._max_retries + 1):
            self._rate_limit()
            try:
                status, raw = self._transport(self._base_url + path, request_fields, self._timeout)
            except FabTransportError:
                if attempt >= self._max_retries:
                    raise
                self._sleep(self._backoff(attempt))
                continue
            if status == 429 or 500 <= status < 600:
                if attempt >= self._max_retries:
                    raise FabTransportError(f"FAB request failed with HTTP {status}")
                self._sleep(self._backoff(attempt))
                continue
            if status < 200 or status >= 300:
                raise FabTransportError(f"FAB request failed with HTTP {status}")
            try:
                payload = json.loads(raw)
            except (json.JSONDecodeError, UnicodeDecodeError) as error:
                raise FabResponseError("FAB returned invalid JSON") from error
            if not isinstance(payload, dict):
                raise FabResponseError("FAB returned an invalid response")
            self._rotate_key(payload)
            return payload
        raise AssertionError("retry loop exhausted")

    def _rotate_key(self, payload: dict) -> None:
        new_key = payload.get("key")
        current = self._store.load()
        if isinstance(new_key, str) and new_key and current is not None and new_key != current.key:
            self._store.replace(Credentials(current.device_id, new_key))

    def _rate_limit(self) -> None:
        now = self._clock()
        if self._last_request_at is not None:
            remaining = self._min_interval - (now - self._last_request_at)
            if remaining > 0:
                self._sleep(remaining)
        self._last_request_at = self._clock()

    @staticmethod
    def _backoff(attempt: int) -> float:
        return min(8.0, 0.5 * (2**attempt)) + random.uniform(0, 0.1)
