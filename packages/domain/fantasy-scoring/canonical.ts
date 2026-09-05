import { createHash } from "node:crypto";
import { SNAPSHOT_FIELDS, type CanonicalBoxscoreSnapshot } from "./types";

export function canonicalSnapshotJson(snapshot: CanonicalBoxscoreSnapshot): string {
  const stats = Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, snapshot.stats[field]]));
  return JSON.stringify({ schemaVersion: snapshot.schemaVersion, playerGameStatId: snapshot.playerGameStatId, playerId: snapshot.playerId, gameId: snapshot.gameId, competitionId: snapshot.competitionId, competitionSeasonId: snapshot.competitionSeasonId, roundNumber: snapshot.roundNumber, stats });
}

export function sourceStatsVersion(snapshot: CanonicalBoxscoreSnapshot): string {
  return createHash("sha256").update(canonicalSnapshotJson(snapshot), "utf8").digest("hex");
}
