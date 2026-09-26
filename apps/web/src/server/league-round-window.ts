import type { Prisma, PrismaClient } from "@prisma/client";
import { selectedSeasonIds } from "./league-competition-seasons";

type Client = Prisma.TransactionClient | PrismaClient;
type AnchorGame = { roundNumber: number | null; scheduledAt: Date | null };

/** League rounds follow the first scheduled game of each round in the primary edition. */
export function roundWindow(games: AnchorGame[], roundNumber: number): { startsAt: Date; endsAt: Date | null } | null {
  const starts = new Map<number, Date>();
  for (const game of games) {
    if (game.roundNumber === null || !game.scheduledAt) continue;
    const current = starts.get(game.roundNumber);
    if (!current || game.scheduledAt < current) starts.set(game.roundNumber, game.scheduledAt);
  }
  const startsAt = starts.get(roundNumber);
  if (!startsAt) return null;
  const next = [...starts.entries()].filter(([number]) => number > roundNumber).sort(([a], [b]) => a - b)[0]?.[1] ?? null;
  if (next && next <= startsAt) return null;
  return { startsAt, endsAt: next };
}

export async function leagueRoundGames(client: Client, leagueId: string, roundNumber: number) {
  const league = await client.fantasyLeague.findUnique({ where: { id: leagueId }, select: { competitionSeasonId: true } });
  if (!league) return null;
  const anchors = await client.game.findMany({
    where: { competitionSeasonId: league.competitionSeasonId, syncStatus: "active", roundNumber: { gte: roundNumber } },
    select: { roundNumber: true, scheduledAt: true },
  });
  const seasonIds = await selectedSeasonIds(client, leagueId);
  const singleEdition = seasonIds.length === 1;
  const window = roundWindow(anchors, roundNumber) ?? (singleEdition ? (() => {
    const startsAt = anchors.filter(game => game.roundNumber === roundNumber && game.scheduledAt).map(game => game.scheduledAt!).sort((a, b) => a.getTime() - b.getTime())[0];
    return startsAt ? { startsAt, endsAt: null } : null;
  })() : null);
  if (!window) return null;
  const games = await client.game.findMany({
    where: singleEdition
      ? { competitionSeasonId: seasonIds[0], syncStatus: "active", roundNumber }
      : { competitionSeasonId: { in: seasonIds }, competitionSeason: { fantasyEnabled: true }, syncStatus: "active", scheduledAt: { gte: window.startsAt, ...(window.endsAt ? { lt: window.endsAt } : {}) } },
    select: { id: true, competitionSeasonId: true, status: true, sourceStatus: true, scheduledAt: true, homeTeamId: true, awayTeamId: true },
  });
  return { ...window, games };
}
