import { createClient } from "../../../src/lib/supabase/server";
import { NotificationError, notificationSettings, revokeSubscription, saveSubscription, setPreference } from "../../../src/server/notifications";

async function actor() { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) throw new NotificationError("UNAUTHORIZED", 401); return user.id; }
const response = (data: unknown, status = 200) => Response.json({ schemaVersion: "notification-settings.v1", data }, { status });
const failure = (error: unknown) => { const known = error instanceof NotificationError; return Response.json({ error: known ? error.code : "INTERNAL_ERROR" }, { status: known ? error.status : 500 }); };
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin || origin !== new URL(request.url).origin) throw new NotificationError("INVALID_ORIGIN", 403); }
function rejectClientIdentity(body: unknown) { if (body && typeof body === "object" && "userId" in body) throw new NotificationError("CLIENT_IDENTITY_FORBIDDEN", 400); return body; }
export async function GET(request: Request) { try { const deviceId = new URL(request.url).searchParams.get("deviceId"); return response(await notificationSettings(await actor(), deviceId)); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); const body = rejectClientIdentity(await request.json()); return response(await saveSubscription(await actor(), body, request.headers.get("user-agent")), 201); } catch (error) { return failure(error); } }
export async function PATCH(request: Request) { try { assertSameOrigin(request); const body = rejectClientIdentity(await request.json()) as {intent?:unknown;enabled?:unknown}; return response(await setPreference(await actor(), body.intent, body.enabled)); } catch (error) { return failure(error); } }
export async function DELETE(request: Request) { try { assertSameOrigin(request); let body: unknown; try { body = rejectClientIdentity(await request.json()); } catch (error) { if (error instanceof NotificationError) throw error; } return response(await revokeSubscription(await actor(), body)); } catch (error) { return failure(error); } }
