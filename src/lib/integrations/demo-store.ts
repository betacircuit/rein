import type { IntegrationConnection } from "@/domain/integrations/model";
import { GOOGLE_CALENDAR_SCOPE } from "@/domain/integrations/model";
import { readDemoSession } from "@/lib/auth/session";

const globalForIntegrations = globalThis as typeof globalThis & {
  studentOsIntegrationStore?: Map<string, IntegrationConnection[]>;
};
const store =
  globalForIntegrations.studentOsIntegrationStore ?? new Map<string, IntegrationConnection[]>();
globalForIntegrations.studentOsIntegrationStore = store;

function initial(ownerId: string): IntegrationConnection[] {
  return [
    {
      id: "calendar-mock",
      ownerId,
      kind: "google_calendar",
      provider: "mock",
      status: "connected",
      scopes: [GOOGLE_CALENDAR_SCOPE],
      lastAttemptAt: "2026-09-03T09:00:00+09:00",
      lastSuccessAt: "2026-09-03T09:00:00+09:00",
      errorCode: null,
      errorMessage: null,
    },
  ];
}

export async function readDemoIntegrationConnections() {
  const session = await readDemoSession();
  if (!session) return null;
  const connections = store.get(session.userId) ?? initial(session.userId);
  store.set(session.userId, connections);
  return structuredClone(connections);
}

export async function saveDemoIntegrationConnections(connections: IntegrationConnection[]) {
  const session = await readDemoSession();
  if (!session || connections.some((item) => item.ownerId !== session.userId))
    throw new Error("현재 세션과 연동 소유자가 일치하지 않아요.");
  store.set(session.userId, structuredClone(connections));
}

export function purgeDemoIntegrationConnections(userId: string) {
  store.delete(userId);
}
