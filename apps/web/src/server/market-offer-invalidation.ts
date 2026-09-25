import type { Prisma } from "@prisma/client";

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
  const leagues = await tx.fantasyLeague.findMany({ where: { competitionSeasonId }, select: { id: true } });
  for (const league of leagues) await cancelLeagueNegotiations(tx, league.id);
}

export async function cancelLeagueNegotiations(tx: Tx, leagueId: string) {
  const threads = await tx.marketOfferThread.findMany({ where: { leagueId, status: "OPEN" }, select: { id: true } });
  await tx.marketOfferProposal.updateMany({ where: { threadId: { in: threads.map(thread => thread.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketOfferThread.updateMany({ where: { leagueId, status: "OPEN" }, data: { status: "INVALID" } });
  const listings = await tx.marketTransferListing.findMany({ where: { leagueId, status: "OPEN" }, select: { id: true } });
  await tx.marketSystemOffer.updateMany({ where: { listingId: { in: listings.map(listing => listing.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketTransferListing.updateMany({ where: { leagueId, status: "OPEN" }, data: { status: "INVALID" } });
}
