import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    competitionSeason: {
      findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    marketV2Cycle: { findMany: vi.fn().mockResolvedValue([]) },
    marketV2Listing: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    marketV2Bid: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    fantasyLeague: { findMany: vi.fn().mockResolvedValue([]) },
    adminAuditEvent: { create: vi.fn() },
    ingestionJob: { create: vi.fn() },
  };
  return {
    transaction,
    catalogFindUnique: vi.fn(),
    transactionRunner: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
  };
});

vi.mock("./db", () => ({
  db: {
    fabCompetitionCatalog: { findUnique: mocks.catalogFindUnique },
    $transaction: mocks.transactionRunner,
  },
}));
vi.mock("./market-offer-invalidation", () => ({ cancelCompetitionNegotiations: vi.fn().mockResolvedValue(undefined) }));

import { disableCompetitionFantasy, enableCompetitionFantasy } from "./ingestion-admin";

const catalogId = "11111111-1111-4111-8111-111111111111";
const seasonId = "22222222-2222-4222-8222-222222222222";

describe("fantasy activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.catalogFindUnique.mockResolvedValue({
      id: catalogId, categoryCompetitionId: "10027", competitionSeasonId: seasonId, monitored: true,
    });
    mocks.transaction.competitionSeason.findUniqueOrThrow.mockResolvedValue({ fantasyEnabled: false, fantasyRole: "disabled" });
    mocks.transaction.competitionSeason.findFirst.mockResolvedValue({ id: "another-primary" });
    mocks.transaction.ingestionJob.create.mockResolvedValue({ id: "job-1" });
  });

  it("activates only the selected monitored season, audits and enqueues its first sync", async () => {
    const result = await enableCompetitionFantasy("admin-id", catalogId);
    expect(mocks.transaction.competitionSeason.update).toHaveBeenCalledWith({
      where: { id: seasonId }, data: { fantasyEnabled: true, fantasyRole: "validation" },
    });
    expect(mocks.transaction.adminAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "COMPETITION_FANTASY_ENABLE", resourceId: catalogId }),
    });
    expect(mocks.transaction.ingestionJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "COMPETITION", target: { categoryId: "10027" } }),
    });
    expect(result).toMatchObject({ alreadyEnabled: false, jobId: "job-1" });
  });

  it("rejects unmonitored competitions without changing fantasy state", async () => {
    mocks.catalogFindUnique.mockResolvedValue({
      id: catalogId, categoryCompetitionId: "10027", competitionSeasonId: seasonId, monitored: false,
    });
    await expect(enableCompetitionFantasy("admin-id", catalogId)).rejects.toMatchObject({ code: "MONITORED_COMPETITION_REQUIRED" });
    expect(mocks.transactionRunner).not.toHaveBeenCalled();
  });
});

describe("fantasy suspension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.catalogFindUnique.mockResolvedValue({ id: catalogId, categoryCompetitionId: "10027", competitionSeasonId: seasonId, monitored: true });
    mocks.transaction.competitionSeason.findUniqueOrThrow.mockResolvedValue({ fantasyEnabled: true, fantasyRole: "primary" });
    mocks.transaction.competitionSeason.findFirst.mockResolvedValue({ id: "another-season" });
  });

  it("disables the selected season and promotes a deterministic replacement", async () => {
    await expect(disableCompetitionFantasy("admin-id", catalogId, "10027")).resolves.toEqual({ alreadyDisabled: false });
    expect(mocks.transaction.competitionSeason.update).toHaveBeenCalledWith({
      where: { id: seasonId }, data: { fantasyEnabled: false, fantasyRole: "disabled" },
    });
    expect(mocks.transaction.marketV2Listing.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "OPEN", cycle: { status: "OPEN" }, playerRegistration: { competitionSeasonId: seasonId } } }));
    expect(mocks.transaction.competitionSeason.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { fantasyEnabled: true, id: { not: seasonId } }, orderBy: { id: "asc" },
    }));
    expect(mocks.transaction.competitionSeason.update).toHaveBeenCalledWith({
      where: { id: "another-season" }, data: { fantasyRole: "primary" },
    });
    expect(mocks.transaction.adminAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "COMPETITION_FANTASY_DISABLE", resourceId: catalogId, result: "SUCCESS" }),
    });
  });

  it("is idempotent and does not change any season again", async () => {
    mocks.transaction.competitionSeason.findUniqueOrThrow.mockResolvedValue({ fantasyEnabled: false, fantasyRole: "disabled" });
    await expect(disableCompetitionFantasy("admin-id", catalogId, "10027")).resolves.toEqual({ alreadyDisabled: true });
    expect(mocks.transaction.competitionSeason.update).not.toHaveBeenCalled();
    expect(mocks.transaction.adminAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: "DUPLICATE" }),
    });
  });

  it("requires the exact FAB category ID before disabling", async () => {
    await expect(disableCompetitionFantasy("admin-id", catalogId, "9955")).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
    expect(mocks.transactionRunner).not.toHaveBeenCalled();
  });
});
