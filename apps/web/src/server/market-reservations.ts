import type { Prisma } from "@prisma/client";

export async function activeOfferReservations(tx: Prisma.TransactionClient, buyerTeamId: string, now = new Date(), excludeProposalId?: string, excludePlayerRegistrationId?: string) {
  const proposals = await tx.marketOfferProposal.findMany({
    where: { proposerTeamId: buyerTeamId, status: "ACTIVE", expiresAt: { gt: now }, id: excludeProposalId ? { not: excludeProposalId } : undefined, thread: { buyerTeamId, status: "OPEN", playerRegistrationId: excludePlayerRegistrationId ? { not: excludePlayerRegistrationId } : undefined } },
    select: { amountCredits: true, thread: { select: { playerRegistration: { select: { teamRegistrationId: true } } } } },
  });
  return { amount: proposals.reduce((sum, proposal) => sum + proposal.amountCredits, 0n), count: proposals.length, teamIds: proposals.map(proposal => proposal.thread.playerRegistration.teamRegistrationId) };
}
