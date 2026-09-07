"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  readDemoIntegrationConnections,
  saveDemoIntegrationConnections,
} from "@/lib/integrations/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";
import { readDemoSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit";

async function state() {
  assertSafeRuntime(readRuntimeSafetyConfig(process.env));
  const connections = await readDemoIntegrationConnections();
  if (!connections) throw new Error("로컬 세션이 만료됐어요.");
  return connections;
}

export async function updateMockConnectionAction(formData: FormData) {
  const session = await readDemoSession();
  if (!session) throw new Error("로컬 세션이 만료됐어요.");
  enforceRateLimit({ key: `integration:${session.userId}`, limit: 20, windowMs: 60_000 });
  const parsed = z
    .object({
      connectionId: z.enum(["calendar-mock", "bank-mock"]),
      intent: z.enum(["sync", "disconnect", "connect", "simulate_stale", "simulate_error"]),
    })
    .parse({ connectionId: formData.get("connectionId"), intent: formData.get("intent") });
  const connections = await state();
  const now = new Date().toISOString();
  await saveDemoIntegrationConnections(
    connections.map((item) => {
      if (item.id !== parsed.connectionId) return item;
      if (parsed.intent === "disconnect")
        return {
          ...item,
          status: "revoked" as const,
          lastAttemptAt: now,
          errorCode: null,
          errorMessage: null,
        };
      if (parsed.intent === "simulate_stale")
        return {
          ...item,
          status: "connected" as const,
          lastAttemptAt: "2026-08-01T09:00:00+09:00",
          lastSuccessAt: "2026-08-01T09:00:00+09:00",
          errorCode: null,
          errorMessage: null,
        };
      if (parsed.intent === "simulate_error")
        return {
          ...item,
          status: "error" as const,
          lastAttemptAt: now,
          errorCode: "mock_timeout",
          errorMessage: "연결 시간이 초과됐어요. 다시 동기화해 주세요.",
        };
      return {
        ...item,
        status: "connected" as const,
        lastAttemptAt: now,
        lastSuccessAt: now,
        errorCode: null,
        errorMessage: null,
      };
    }),
  );
  revalidatePath("/settings/integrations");
}
