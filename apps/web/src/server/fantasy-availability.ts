import { Prisma, type PrismaClient } from "@prisma/client";

export class FantasyCompetitionDisabledError extends Error {
  readonly code = "COMPETITION_DISABLED";
  readonly status = 409;
  constructor() { super("COMPETITION_DISABLED"); }
}

/** Hold a shared row lock until the caller's transaction commits, excluding a concurrent disable. */
export async function requireFantasyCompetition(
  tx: Prisma.TransactionClient | PrismaClient,
  competitionSeasonId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ fantasy_enabled: boolean }>>(Prisma.sql`
    SELECT fantasy_enabled FROM competition_seasons
    WHERE id=${competitionSeasonId}::uuid FOR SHARE
  `);
  if (rows.length !== 1 || !rows[0].fantasy_enabled) throw new FantasyCompetitionDisabledError();
}
