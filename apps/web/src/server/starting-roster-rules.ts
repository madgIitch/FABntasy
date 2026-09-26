import { Prisma } from "@prisma/client";
import { COLD_START_RULES } from "../../../../packages/domain/fantasy-team";

export async function startingRosterRules(tx: Prisma.TransactionClient, competitionSeasonId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM competition_seasons WHERE id = ${competitionSeasonId}::uuid FOR UPDATE`);
  await tx.fantasyRosterRuleSet.updateMany({ where: { competitionSeasonId, status: "ACTIVE", NOT: { identifier: COLD_START_RULES.identifier, version: COLD_START_RULES.version } }, data: { status: "SUPERSEDED" } });
  return tx.fantasyRosterRuleSet.upsert({
    where: { competitionSeasonId_identifier_version: { competitionSeasonId, identifier: COLD_START_RULES.identifier, version: COLD_START_RULES.version } },
    update: { status: "ACTIVE" },
    create: {
      competitionSeasonId, identifier: COLD_START_RULES.identifier, version: COLD_START_RULES.version,
      budgetCredits: BigInt(COLD_START_RULES.budgetCredits), rosterSize: COLD_START_RULES.rosterSize,
      starterCount: COLD_START_RULES.starters, substituteCount: COLD_START_RULES.substitutes,
      maxPerRealTeam: COLD_START_RULES.maxPerRealTeam, positionLimits: COLD_START_RULES.positionLimits,
      coldStartPriceCredits: BigInt(COLD_START_RULES.coldStartPriceCredits),
    },
  });
}
