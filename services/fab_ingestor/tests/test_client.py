import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Lock

import pytest

from fab_ingestor.auth import FileCredentialStore
from fab_ingestor.client import (
    Credentials,
    FabAuthRefreshError,
    FabCancelledError,
    FabClient,
    FabContractError,
    FabMatchUnavailableError,
    FabResponseError,
    FabTransportError,
    MemoryCredentialStore,
)


def response(payload, status=200):
    return status, json.dumps(payload).encode()


def test_register_device_validates_and_persists_credentials():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, fields, timeout))
        return response({"resultado": "correcto", "id_dispositivo": 123, "key": "new-secret"})

    store = MemoryCredentialStore()
    credentials = FabClient(store, transport=transport, min_interval=0).register_device()

    assert credentials == Credentials("123", "new-secret")
    assert store.load() == credentials
    assert calls[0][0].endswith("/dispositivo.ashx")
    assert calls[0][1]["accion"] == "registrar"
    assert calls[0][1]["plataforma"] == "ANDROID"
    assert calls[0][1]["tipo_dispositivo"] == "PHONE"
    assert calls[0][1]["version"] == "5.0.27"
    assert len(calls[0][1]["uid"]) == 16


def test_register_device_rejects_incomplete_response():
    client = FabClient(MemoryCredentialStore(), transport=lambda *_: response({"resultado": "correcto"}))
    with pytest.raises(FabResponseError, match="invalid response"):
        client.register_device()


def test_team_roster_uses_current_device_handle_and_validates_rows():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", "misjugadores": [{"Nombre": "Ejemplo"}]})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport, min_interval=0,
    )
    assert client.get_team_players("current-team-handle") == [{"Nombre": "Ejemplo"}]
    assert calls[0][0].endswith("/v2/equipo.ashx")
    assert calls[0][1]["accion"] == "jugadores"
    assert calls[0][1]["id_equipo"] == "current-team-handle"

    invalid = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=lambda *_: response({"resultado": "correcto", "misjugadores": [None]}),
        min_interval=0,
    )
    with pytest.raises(FabContractError):
        invalid.get_team_players("team")


@pytest.mark.parametrize(
    ("method", "action", "collection"),
    [
        ("search_match", "buscarPartido", "partidos"),
        ("search_category", "buscarCategoria", "categorias"),
        ("search_team", "buscarEquipo", "equipos"),
    ],
)
def test_searches_use_form_fields_and_rotate_key(method, action, collection):
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({collection: [{"Id": "1"}], "numeroMaximoResultados": 20, "key": "rotated"})

    store = MemoryCredentialStore(Credentials("device-secret", "old-secret"))
    result = getattr(FabClient(store, transport=transport, min_interval=0), method)("Sevilla")

    assert result == [{"Id": "1"}]
    assert calls[0][0].endswith("/v2/busqueda.ashx")
    assert calls[0][1]["accion"] == action
    assert calls[0][1]["skip"] == "0"
    assert store.load() == Credentials("device-secret", "rotated")


def test_pagination_is_sequential_and_uses_server_page_size():
    skips = []

    def transport(url, fields, timeout):
        skips.append(fields["skip"])
        page = [{"Id": fields["skip"]}] * (2 if fields["skip"] == "0" else 1)
        return response({"equipos": page, "numeroMaximoResultados": 2})

    client = FabClient(MemoryCredentialStore(Credentials("d", "k")), transport=transport, min_interval=0)
    assert len(client.search_team("x")) == 3
    assert skips == ["0", "2"]


def test_pagination_rejects_a_repeated_non_empty_page():
    def transport(url, fields, timeout):
        return response({"categorias": [{"Id": "same"}], "numeroMaximoResultados": 1})

    client = FabClient(MemoryCredentialStore(Credentials("d", "k")), transport=transport, min_interval=0)
    with pytest.raises(FabResponseError, match="repeated a page"):
        client.search_category("")


def test_429_and_5xx_retry_with_bounded_backoff(monkeypatch):
    statuses = iter([429, 503, 200])
    sleeps = []
    monkeypatch.setattr("fab_ingestor.client.random.uniform", lambda *_: 0)

    def transport(url, fields, timeout):
        status = next(statuses)
        return response({"categorias": []}, status)

    client = FabClient(
        MemoryCredentialStore(Credentials("d", "k")),
        transport=transport,
        max_retries=2,
        min_interval=0,
        sleeper=sleeps.append,
    )
    assert client.search_category("x") == []
    assert sleeps == [0.5, 1.0]


def test_4xx_is_not_retried_and_does_not_leak_credentials():
    attempts = 0

    def transport(url, fields, timeout):
        nonlocal attempts
        attempts += 1
        return 401, b"body containing key-secret"

    client = FabClient(MemoryCredentialStore(Credentials("device-secret", "key-secret")), transport=transport)
    with pytest.raises(FabTransportError) as captured:
        client.search_match("x")
    assert attempts == 1
    assert "device-secret" not in str(captured.value)
    assert "key-secret" not in str(captured.value)


def test_timeout_is_retried_then_reported_without_details():
    attempts = 0

    def transport(url, fields, timeout):
        nonlocal attempts
        attempts += 1
        raise FabTransportError("FAB request failed or timed out")

    client = FabClient(
        MemoryCredentialStore(Credentials("d", "k")),
        transport=transport,
        max_retries=1,
        min_interval=0,
        sleeper=lambda _: None,
    )
    with pytest.raises(FabTransportError, match="timed out"):
        client.search_match("x")
    assert attempts == 2


def test_cancellation_stops_before_transport_call():
    client = FabClient(
        MemoryCredentialStore(Credentials("d", "k")),
        transport=lambda *_: pytest.fail("transport must not run"),
        cancellation_check=lambda: True,
    )
    with pytest.raises(FabCancelledError, match="cancelled"):
        client.search_match("x")


def test_team_phases_uses_confirmed_endpoint_and_fields():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", "listaFasesGrupo": [], "key": "rotated"})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport,
        min_interval=0,
    )
    assert client.get_team_phases("opaque-team")["listaFasesGrupo"] == []
    assert calls[0][0].endswith("/v2/equipo.ashx")
    assert calls[0][1]["accion"] == "fasesGrupos"
    assert calls[0][1]["id_equipo"] == "opaque-team"


def test_category_phases_uses_apk_confirmed_endpoint_and_fields():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", "listaFasesGrupo": []})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport,
        min_interval=0,
    )
    assert client.get_category_phases("opaque-category")["listaFasesGrupo"] == []
    assert calls[0][0].endswith("/v2/categoria.ashx")
    assert calls[0][1]["accion"] == "fasesGrupos"
    assert calls[0][1]["id_categoria_competicion"] == "opaque-category"


def test_category_teams_uses_apk_confirmed_form_contract():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", "equipos": [{"Id": "team-1"}]})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport,
        min_interval=0,
    )
    assert client.get_category_teams("phase", "group", "LIGA") == [{"Id": "team-1"}]
    assert calls[0][0].endswith("/v2/categoria.ashx")
    assert calls[0][1] == {
        "accion": "equipos",
        "id_fase": "phase",
        "id_grupo": "group",
        "jornada": "",
        "tipo_fase": "LIGA",
        "ventana": "",
        "id_dispositivo": "device",
        "key": "secret",
    }


@pytest.mark.parametrize(
    ("method", "action", "collection"),
    [
        ("get_category_matchdays", "Jornadas", "ListaJornadas"),
        ("get_category_matches", "horariosJornadas", "partidos"),
    ],
)
def test_category_schedule_uses_apk_confirmed_contract(method, action, collection):
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", collection: []})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport,
        min_interval=0,
    )
    assert getattr(client, method)("category", "phase", group_id="group") == []
    assert calls[0][0].endswith("/v2/categoria.ashx")
    assert calls[0][1] == {
        "accion": action,
        "id_categoria_competicion": "category",
        "id_fase": "phase",
        "id_grupo": "group",
        "id_ronda": "",
        "fecha_inicial": "",
        "fecha_final": "",
        "id_dispositivo": "device",
        "key": "secret",
    }


def test_category_schedule_requires_exactly_one_group_or_round():
    client = FabClient(MemoryCredentialStore(Credentials("device", "secret")))
    with pytest.raises(ValueError, match="exactly one"):
        client.get_category_matchdays("category", "phase")
    with pytest.raises(ValueError, match="exactly one"):
        client.get_category_matches("category", "phase", group_id="group", round_id="round")


def test_match_stats_uses_confirmed_form_contract_and_validates_shape():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        return response({"resultado": "correcto", "estadisticas": {}, "partido": {}})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=transport,
        min_interval=0,
    )
    assert client.get_match_stats("opaque-game")["resultado"] == "correcto"
    assert calls == [
        (
            "https://appaficion.andaluzabaloncesto.org/v2/envivo/estadisticas.ashx",
            {"id_partido": "opaque-game", "id_dispositivo": "device", "key": "secret"},
        )
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {"resultado": "error", "estadisticas": {}, "partido": {}},
        {"resultado": "correcto", "estadisticas": []},
        {"resultado": "correcto", "estadisticas": {}, "partido": []},
    ],
)
def test_match_stats_rejects_incomplete_responses(payload):
    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=lambda *_: response(payload),
        min_interval=0,
    )
    with pytest.raises(FabResponseError, match="invalid response"):
        client.get_match_stats("opaque-game")


def test_match_stats_classifies_removed_match_without_exposing_payload():
    payload = {"resultado": "error", "error": "Id no válido"}
    captured = []
    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=lambda *_: response(payload),
        min_interval=0,
    )

    with pytest.raises(FabMatchUnavailableError, match="no longer available") as caught:
        client.get_match_stats("opaque-game", payload_sink=captured.append)

    assert caught.value.code == "MATCH_UNAVAILABLE"
    assert captured == [payload]


@pytest.mark.parametrize(
    ("raw", "parse_error"),
    [
        (b"<html>temporarily unavailable</html>", "invalid_json"),
        (b"[]", "non_object_json"),
    ],
)
def test_match_stats_captures_safe_pre_json_diagnostic(raw, parse_error):
    captured = []
    if parse_error == "invalid_json":
        raw += b" device-secret key-secret"
    client = FabClient(
        MemoryCredentialStore(Credentials("device-secret", "key-secret")),
        transport=lambda *_: (200, raw),
        min_interval=0,
    )

    with pytest.raises(FabResponseError):
        client.get_match_stats("opaque-game", payload_sink=captured.append)

    assert captured == [
        {
            "_diagnostic": True,
            "http_status": 200,
            "body": (
                "<html>temporarily unavailable</html> [REDACTED] [REDACTED]"
                if parse_error == "invalid_json"
                else "[]"
            ),
            "body_truncated": False,
            "parse_error": parse_error,
        }
    ]


def test_match_stats_truncates_pre_json_diagnostic_body():
    captured = []
    client = FabClient(
        MemoryCredentialStore(Credentials("device", "secret")),
        transport=lambda *_: (200, b"x" * (FabClient.DIAGNOSTIC_BODY_LIMIT + 1)),
        min_interval=0,
    )

    with pytest.raises(FabResponseError):
        client.get_match_stats("opaque-game", payload_sink=captured.append)

    assert len(captured[0]["body"]) == FabClient.DIAGNOSTIC_BODY_LIMIT
    assert captured[0]["body_truncated"] is True


def test_file_store_replaces_credentials_atomically(tmp_path):
    path = tmp_path / "private" / "credentials.json"
    store = FileCredentialStore(path)
    store.replace(Credentials("device", "first"))
    store.replace(Credentials("device", "second"))
    assert store.load() == Credentials("device", "second")
    assert list(path.parent.iterdir()) == [path]


def test_expired_identity_is_probed_refreshed_and_replayed_once():
    calls = []

    def transport(url, fields, timeout):
        calls.append((url, dict(fields)))
        if url.endswith("/dispositivo.ashx"):
            return response({"resultado": "correcto", "id_dispositivo": "new-device", "key": "new-key"})
        if fields["id_dispositivo"] == "old-device":
            return response({"resultado": "error", "error": "Faltan parámetros"})
        return response({"categorias": [], "numeroMaximoResultados": 20})

    store = MemoryCredentialStore(Credentials("old-device", "old-key"))
    client = FabClient(
        store, transport=transport, min_interval=0, auto_refresh_credentials=True
    )

    assert client.search_category("Sevilla") == []
    assert store.load() == Credentials("new-device", "new-key")
    assert len(calls) == 4  # original, probe, registration and one replay


def test_successful_probe_classifies_original_failure_as_contract_error():
    calls = []

    def transport(url, fields, timeout):
        calls.append(url)
        if len(calls) == 1:
            return response({"resultado": "error", "error": "Faltan parametros"})
        return response({"resultado": "correcto", "categorias": []})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "key")),
        transport=transport,
        min_interval=0,
        auto_refresh_credentials=True,
    )
    with pytest.raises(FabContractError):
        client.search_category("Sevilla")
    assert len(calls) == 2


def test_public_probe_is_read_only_and_does_not_register_an_expired_identity():
    calls = []

    def transport(url, fields, timeout):
        calls.append(url)
        return response({"resultado": "error", "error": "Faltan parámetros"})

    client = FabClient(
        MemoryCredentialStore(Credentials("device", "key")),
        transport=transport,
        min_interval=0,
        auto_refresh_credentials=True,
    )
    assert client.probe_credentials() is False
    assert calls == ["https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx"]


def test_refreshed_identity_is_never_replayed_more_than_once():
    calls = []

    def transport(url, fields, timeout):
        calls.append(url)
        if url.endswith("/dispositivo.ashx"):
            return response({"resultado": "correcto", "id_dispositivo": "new", "key": "new"})
        return response({"resultado": "error", "error": "Faltan parámetros"})

    client = FabClient(
        MemoryCredentialStore(Credentials("old", "old")),
        transport=transport,
        min_interval=0,
        auto_refresh_credentials=True,
    )
    with pytest.raises(FabAuthRefreshError):
        client.search_category("Sevilla")
    assert len(calls) == 4


def test_file_store_writability_preflight_leaves_no_probe(tmp_path):
    store = FileCredentialStore(tmp_path / "credentials" / "fab.json")
    store.assert_writable()
    assert list((tmp_path / "credentials").iterdir()) == []


def test_concurrent_workers_converge_on_one_registered_identity(tmp_path):
    store = FileCredentialStore(tmp_path / "shared" / "fab.json")
    store.replace(Credentials("old-device", "old-key"))
    probes = Barrier(2)
    counter_lock = Lock()
    registrations = 0

    def transport(url, fields, timeout):
        nonlocal registrations
        if url.endswith("/dispositivo.ashx"):
            with counter_lock:
                registrations += 1
            return response({"resultado": "correcto", "id_dispositivo": "new-device", "key": "new-key"})
        if fields["id_dispositivo"] == "old-device":
            if fields.get("texto") == "Sevilla":
                probes.wait(timeout=2)
            return response({"resultado": "error", "error": "Faltan parámetros"})
        return response({"categorias": [], "numeroMaximoResultados": 20})

    def run(text):
        return FabClient(
            store, transport=transport, min_interval=0, auto_refresh_credentials=True
        ).search_category(text)

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert list(executor.map(run, ["Córdoba", "Granada"])) == [[], []]
    assert registrations == 1
    assert store.load() == Credentials("new-device", "new-key")
