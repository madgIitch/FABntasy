import json

from fab_ingestor.fantasy_lifecycle import FantasyLifecycleClient


class Response:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self):
        return json.dumps({
            "schemaVersion": "canastio-fantasy-lifecycle.v1",
            "eligibleRounds": 2,
            "processed": [{"roundNumber": 1}, {"roundNumber": 2}],
        }).encode()


def test_lifecycle_client_sends_server_secret_and_returns_safe_counters(monkeypatch):
    captured = {}

    def open_request(request, timeout):
        captured["authorization"] = request.headers["Authorization"]
        captured["payload"] = json.loads(request.data)
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setattr("fab_ingestor.fantasy_lifecycle.urlopen", open_request)
    result = FantasyLifecycleClient("https://canastio.test/internal", "secret", timeout=7).advance("season-id")

    assert result.eligible_rounds == 2
    assert result.rounds_processed == 2
    assert captured == {
        "authorization": "Bearer secret",
        "payload": {"competitionSeasonId": "season-id"},
        "timeout": 7,
    }
