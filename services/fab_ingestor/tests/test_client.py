import json

import pytest

from fab_ingestor.auth import FileCredentialStore
from fab_ingestor.client import (
    Credentials,
    FabClient,
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


def test_file_store_replaces_credentials_atomically(tmp_path):
    path = tmp_path / "private" / "credentials.json"
    store = FileCredentialStore(path)
    store.replace(Credentials("device", "first"))
    store.replace(Credentials("device", "second"))
    assert store.load() == Credentials("device", "second")
    assert list(path.parent.iterdir()) == [path]
