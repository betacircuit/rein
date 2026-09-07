import { z } from "zod";

import type { GrowState } from "@/domain/grow/model";
import { toKrw } from "@/domain/money/krw";
import { readDemoSession } from "@/lib/auth/session";

const ruleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed"),
    value: z.bigint().nonnegative(),
    cap: z.bigint().nonnegative(),
  }),
  z.object({
    type: z.literal("percentage"),
    valueBasisPoints: z.bigint().min(0n).max(10_000n),
    cap: z.bigint().nonnegative(),
  }),
]);
const stateSchema = z.object({
  userId: z.string(),
  plan: z.object({
    id: z.string(),
    ownerId: z.string(),
    reserveAccountId: z.string(),
    contributionAccountId: z.string(),
    safetyReserveTarget: z.bigint().nonnegative(),
    rule: ruleSchema,
    isActive: z.boolean(),
    updatedAt: z.string(),
  }),
  contributions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      planId: z.string(),
      month: z.string(),
      plannedAmount: z.bigint().nonnegative(),
      completedAmount: z.bigint().nonnegative(),
      status: z.enum(["pending", "partially_completed", "completed", "skipped", "cancelled"]),
      transferGroupIds: z.array(z.string()),
      updatedAt: z.string(),
    }),
  ),
  dismissedInsightIds: z.array(z.string()),
});

const globalForGrow = globalThis as typeof globalThis & {
  studentOsGrowStore?: Map<string, GrowState>;
};
const growStore = globalForGrow.studentOsGrowStore ?? new Map<string, GrowState>();
globalForGrow.studentOsGrowStore = growStore;

export async function readDemoGrowState(): Promise<GrowState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  const stored = growStore.get(session.userId);
  if (stored) return structuredClone(stored);
  const now = "2026-09-03T00:00:00.000Z";
  const initial: GrowState = {
    userId: session.userId,
    plan: {
      id: "grow-plan-demo",
      ownerId: session.userId,
      reserveAccountId: "",
      contributionAccountId: "",
      safetyReserveTarget: toKrw(4_500_000),
      rule: { type: "percentage", valueBasisPoints: 2_000n, cap: toKrw(150_000) },
      isActive: true,
      updatedAt: now,
    },
    contributions: [],
    dismissedInsightIds: [],
  };
  growStore.set(session.userId, initial);
  return structuredClone(initial);
}

export async function saveDemoGrowState(state: GrowState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId || state.plan.ownerId !== session.userId) {
    throw new Error("현재 세션과 Grow 계획 소유자가 일치하지 않아요.");
  }
  const parsed = stateSchema.parse(state) as unknown as GrowState;
  growStore.set(state.userId, structuredClone(parsed));
}

export function purgeDemoGrowState(userId: string) {
  growStore.delete(userId);
}
