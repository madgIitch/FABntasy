import { randomUUID } from "node:crypto";

type AuthLogDetails = Record<string, boolean | number | string | null | undefined>;

export function newAuthOperation(flow: string) {
  return { flow, operationId: randomUUID(), startedAt: Date.now() };
}

export function authDebug(operation: ReturnType<typeof newAuthOperation>, event: string, details: AuthLogDetails = {}) {
  console.info("auth.debug", { flow: operation.flow, event, operationId: operation.operationId, elapsedMs: Date.now() - operation.startedAt, ...details });
}

export function authDebugError(operation: ReturnType<typeof newAuthOperation>, event: string, details: AuthLogDetails) {
  console.warn("auth.debug", { flow: operation.flow, event, operationId: operation.operationId, elapsedMs: Date.now() - operation.startedAt, ...details });
}
