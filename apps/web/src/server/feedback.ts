import { db } from "./db";
export const FEEDBACK_CATEGORIES = ["BUG", "IDEA", "DATA", "OTHER"] as const;
export class FeedbackError extends Error { constructor(public code: string, public status = 400) { super(code); } }
const recent = new Map<string, number[]>();
export function parseFeedback(input: unknown) {
  const value = input as Record<string, unknown>; const category = value?.category, text = typeof value?.text === "string" ? value.text.trim() : "", key = value?.idempotencyKey;
  if (!FEEDBACK_CATEGORIES.includes(category as typeof FEEDBACK_CATEGORIES[number]) || text.length < 3 || text.length > 1000 || typeof key !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(key)) throw new FeedbackError("INVALID_FEEDBACK");
  const consent = value.technicalContextConsent === true; const technicalContext = consent ? { route: typeof value.route === "string" ? value.route.split("?")[0].slice(0,80) : undefined, release: (process.env.CANASTIO_RELEASE ?? "dev").slice(0,64) } : undefined;
  return { category: category as string, text, idempotencyKey: key, technicalContextConsent: consent, technicalContext };
}
export async function createFeedback(authUserId: string, input: unknown, now = Date.now()) {
  if (process.env.CANASTIO_FEEDBACK_ENABLED !== "true") throw new FeedbackError("FEEDBACK_DISABLED", 503);
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } }); if (!profile) throw new FeedbackError("UNAUTHENTICATED", 401);
  const attempts = (recent.get(profile.id) ?? []).filter(time => now-time < 60_000); if (attempts.length >= 5) throw new FeedbackError("RATE_LIMITED", 429); recent.set(profile.id, [...attempts, now]);
  const data = parseFeedback(input);
  try { return await db.userFeedback.create({ data: { ...data, userProfileId: profile.id } }); } catch (error) { if ((error as {code?:string}).code === "P2002") return db.userFeedback.findUnique({ where: { userProfileId_idempotencyKey: { userProfileId: profile.id, idempotencyKey: data.idempotencyKey } } }); throw error; }
}
