from __future__ import annotations

import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class FantasyLifecycleTransportError(RuntimeError):
    pass


@dataclass(frozen=True)
class FantasyLifecycleSummary:
    eligible_rounds: int
    rounds_processed: int


class FantasyLifecycleClient:
    def __init__(self, url: str, secret: str, *, timeout: float = 15.0) -> None:
        self.url = url.rstrip("/")
        self.secret = secret
        self.timeout = timeout

    def advance(self, competition_season_id: object) -> FantasyLifecycleSummary:
        payload = json.dumps({"competitionSeasonId": str(competition_season_id)}).encode()
        request = Request(
            self.url,
            data=payload,
            method="POST",
            headers={"Authorization": f"Bearer {self.secret}", "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode())
        except (HTTPError, URLError, TimeoutError, ValueError) as error:
            raise FantasyLifecycleTransportError("fantasy lifecycle request failed") from error
        if body.get("schemaVersion") != "canastio-fantasy-lifecycle.v1":
            raise FantasyLifecycleTransportError("fantasy lifecycle contract mismatch")
        processed = body.get("processed", [])
        return FantasyLifecycleSummary(int(body.get("eligibleRounds", 0)), len(processed))
