import type { Prisma, PrismaClient } from "@prisma/client";
import { FantasyCompetitionDisabledError, requireFantasyCompetition } from "./fantasy-availability";

type Client = Prisma.TransactionClient | PrismaClient;

/** The selected editions are immutable after league creation. The legacy column is its calendar anchor. */
export async function selectedSeasonIds(client: Client, leagueId: string): Promise<string[]> {
  const league = await client.fantasyLeague.findUnique({
    where: { id: leagueId },
    select: { competitionSeasonId: true, selectedSeasons: { select: { competitionSeasonId: true } } },
  });
  if (!league) return [];
  // Legacy fixtures and databases awaiting the additive migration retain the original edition.
  return league.selectedSeasons.length
    ? league.selectedSeasons.map(item => item.competitionSeasonId)
    : [league.competitionSeasonId];
}

export async function requireSelectedSeason(client: Client, leagueId: string, competitionSeasonId: string): Promise<boolean> {
  const ids = await selectedSeasonIds(client, leagueId);
  if (!ids.includes(competitionSeasonId)) return false;
  await requireFantasyCompetition(client, competitionSeasonId);
  return true;
}

/** Keeps a league usable while at least one of its selected editions is enabled. */
export async function requireAvailableLeagueSeason(client: Client, leagueId: string): Promise<string> {
  const ids = await selectedSeasonIds(client, leagueId);
  const enabled = await client.competitionSeason.findFirst({
    where: { id: { in: ids }, fantasyEnabled: true },
    orderBy: { id: "asc" }, select: { id: true },
  });
  if (!enabled) throw new FantasyCompetitionDisabledError();
  await requireFantasyCompetition(client, enabled.id);
  return enabled.id;
}
