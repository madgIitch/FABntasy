import { createClient } from "../../../src/lib/supabase/server";
import { NotificationError, notificationSettings, revokeSubscription, saveSubscription, setPreference } from "../../../src/server/notifications";

async function actor() { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) throw new NotificationError("UNAUTHORIZED", 401); return user.id; }
const response = (data: unknown, status = 200) => Response.json({ schemaVersion: "notification-settings.v1", data }, { status });
const failure = (error: unknown) => { const known = error instanceof NotificationError; return Response.json({ error: known ? error.code : "INTERNAL_ERROR" }, { status: known ? error.status : 500 }); };
function assertSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) throw new NotificationError("INVALID_ORIGIN", 403); }
export async function GET() { try { return response(await notificationSettings(await actor())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); return response(await saveSubscription(await actor(), await request.json(), request.headers.get("user-agent")), 201); } catch (error) { return failure(error); } }
export async function PATCH(request: Request) { try { assertSameOrigin(request); const body = await request.json(); return response(await setPreference(await actor(), body.intent, body.enabled)); } catch (error) { return failure(error); } }
export async function DELETE(request: Request) { try { assertSameOrigin(request); let endpoint: unknown; try { endpoint = (await request.json()).endpoint; } catch {} return response(await revokeSubscription(await actor(), endpoint)); } catch (error) { return failure(error); } }
