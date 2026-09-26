import type { Prisma } from "@prisma/client";
import { selectedSeasonIds } from "./league-competition-seasons";

type Tx = Prisma.TransactionClient;

export async function invalidatePlayerNegotiations(tx: Tx, leagueId: string, playerRegistrationId: string) {
  const threads = await tx.marketOfferThread.findMany({ where: { leagueId, playerRegistrationId, status: "OPEN" }, select: { id: true } });
  await tx.marketOfferProposal.updateMany({ where: { threadId: { in: threads.map(thread => thread.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketOfferThread.updateMany({ where: { leagueId, playerRegistrationId, status: "OPEN" }, data: { status: "INVALID" } });
  const listings = await tx.marketTransferListing.findMany({ where: { leagueId, playerRegistrationId, status: "OPEN" }, select: { id: true } });
  await tx.marketSystemOffer.updateMany({ where: { listingId: { in: listings.map(listing => listing.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketTransferListing.updateMany({ where: { leagueId, playerRegistrationId, status: "OPEN" }, data: { status: "INVALID" } });
}

export async function cancelCompetitionNegotiations(tx: Tx, competitionSeasonId: string) {
  const leagues = await tx.fantasyLeague.findMany({ where: { OR: [{ competitionSeasonId }, { selectedSeasons: { some: { competitionSeasonId } } }] }, select: { id: true } });
  for (const league of leagues) {
    const enabled = await tx.competitionSeason.findFirst({ where: { id: { in: await selectedSeasonIds(tx, league.id) }, fantasyEnabled: true }, select: { id: true } });
    if (!enabled) { await cancelLeagueNegotiations(tx, league.id); continue; }
    const [threads, listings] = await Promise.all([
      tx.marketOfferThread.findMany({ where: { leagueId: league.id, status: "OPEN", playerRegistration: { competitionSeasonId } }, select: { playerRegistrationId: true } }),
      tx.marketTransferListing.findMany({ where: { leagueId: league.id, status: "OPEN", playerRegistration: { competitionSeasonId } }, select: { playerRegistrationId: true } }),
    ]);
    for (const id of new Set([...threads, ...listings].map(item => item.playerRegistrationId))) await invalidatePlayerNegotiations(tx, league.id, id);
  }
}

export async function cancelLeagueNegotiations(tx: Tx, leagueId: string) {
  const threads = await tx.marketOfferThread.findMany({ where: { leagueId, status: "OPEN" }, select: { id: true } });
  await tx.marketOfferProposal.updateMany({ where: { threadId: { in: threads.map(thread => thread.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketOfferThread.updateMany({ where: { leagueId, status: "OPEN" }, data: { status: "INVALID" } });
  const listings = await tx.marketTransferListing.findMany({ where: { leagueId, status: "OPEN" }, select: { id: true } });
  await tx.marketSystemOffer.updateMany({ where: { listingId: { in: listings.map(listing => listing.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketTransferListing.updateMany({ where: { leagueId, status: "OPEN" }, data: { status: "INVALID" } });
}
