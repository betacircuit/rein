import { z } from "zod";

import {
  suggestSubscriptionMatches,
  type SubscriptionState,
} from "@/domain/subscriptions/model";
import { readDemoSession } from "@/lib/auth/session";
import { readDemoMoneyState } from "@/lib/money/demo-store";

const bigint = z.bigint();
const subscriptionStateSchema = z.object({
  userId: z.string().min(8),
  householdId: z.string().min(1),
  members: z.array(
    z.object({ id: z.string().min(1), name: z.string().min(1), isCurrentUser: z.boolean() }),
  ),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      householdId: z.string().nullable(),
      scope: z.enum(["private", "household"]),
      payerMemberId: z.string().nullable(),
      paymentAccountId: z.string().nullable(),
      name: z.string(),
      providerName: z.string().nullable(),
      planName: z.string().nullable(),
      category: z.enum([
        "ai_software",
        "cloud_storage",
        "education",
        "entertainment",
        "communication",
        "fitness",
        "news",
        "other",
      ]),
      status: z.enum(["trial", "active", "paused", "cancelled", "ended"]),
      decision: z.enum(["keep", "review", "cancel_candidate"]),
      decisionNote: z.string().nullable(),
      decisionUpdatedAt: z.string().nullable(),
      amount: bigint,
      currency: z.literal("KRW"),
      billingCycle: z.enum([
        "weekly",
        "monthly",
        "quarterly",
        "semiannual",
        "yearly",
        "custom_days",
      ]),
      customCycleDays: z.number().int().positive().nullable(),
      startedOn: z.string(),
      billingAnchorOn: z.string(),
      nextBillingOn: z.string(),
      trialEndsOn: z.string().nullable(),
      cancelByOn: z.string().nullable(),
      autoRenews: z.boolean(),
      descriptorAliases: z.array(z.string()),
      reminderDaysBefore: z.array(z.number().int().min(0).max(365)),
      serviceUrl: z.string().nullable(),
      notes: z.string().nullable(),
      lastUsedOn: z.string().nullable(),
      cancelledAt: z.string().nullable(),
      endedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  splits: z.array(
    z.object({
      subscriptionId: z.string(),
      memberId: z.string(),
      shareBasisPoints: z.number().int().min(0).max(10_000),
    }),
  ),
  priceHistory: z.array(
    z.object({
      id: z.string(),
      subscriptionId: z.string(),
      effectiveOn: z.string(),
      amount: bigint,
      currency: z.literal("KRW"),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  occurrences: z.array(
    z.object({
      id: z.string(),
      subscriptionId: z.string(),
      periodStart: z.string(),
      periodEnd: z.string(),
      dueOn: z.string(),
      expectedAmount: bigint,
      priceHistoryId: z.string(),
      status: z.enum(["scheduled", "unmatched", "paid", "skipped", "refunded"]),
      matchedTransactionId: z.string().nullable(),
      sharedExpenseId: z.string().nullable(),
      paidAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  suggestions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      transactionId: z.string(),
      occurrenceId: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.object({
        amount: z.string(),
        descriptor: z.string(),
        account: z.string(),
        timing: z.string(),
      }),
      status: z.enum(["suggested", "confirmed", "dismissed"]),
      confirmedAt: z.string().nullable(),
      dismissedAt: z.string().nullable(),
    }),
  ),
  sharedExpenses: z.array(
    z.object({
      id: z.string(),
      householdId: z.string(),
      occurrenceId: z.string(),
      transactionId: z.string(),
      payerMemberId: z.string(),
      amount: bigint,
      splits: z.array(z.object({ memberId: z.string(), amount: bigint })),
      createdAt: z.string(),
    }),
  ),
});

const globalForSubscriptions = globalThis as typeof globalThis & {
  studentOsSubscriptionStore?: Map<string, SubscriptionState>;
};
const subscriptionStore =
  globalForSubscriptions.studentOsSubscriptionStore ?? new Map<string, SubscriptionState>();
globalForSubscriptions.studentOsSubscriptionStore = subscriptionStore;

function defaultState(userId: string): SubscriptionState {
  return {
    userId,
    householdId: "household-demo",
    members: [
      { id: "member-owner", name: "나", isCurrentUser: true },
      { id: "member-roommate", name: "룸메이트", isCurrentUser: false },
    ],
    subscriptions: [],
    splits: [],
    priceHistory: [],
    occurrences: [],
    suggestions: [],
    sharedExpenses: [],
  };
}

export async function refreshSubscriptionSuggestions(state: SubscriptionState) {
  const money = await readDemoMoneyState();
  if (!money) return state;
  const settled = state.suggestions.filter((item) => item.status !== "suggested");
  const generated = suggestSubscriptionMatches({ state, transactions: money.transactions });
  return {
    ...state,
    suggestions: [
      ...settled,
      ...generated.filter((item) => !settled.some((old) => old.id === item.id)),
    ],
  };
}

export async function readDemoSubscriptionState(): Promise<SubscriptionState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  const stored = subscriptionStore.get(session.userId);
  if (stored) return structuredClone(stored);
  const initial = await refreshSubscriptionSuggestions(defaultState(session.userId));
  subscriptionStore.set(session.userId, initial);
  return structuredClone(initial);
}

export async function saveDemoSubscriptionState(state: SubscriptionState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId)
    throw new Error("현재 세션과 구독 데이터 소유자가 일치하지 않아요.");
  const parsed = subscriptionStateSchema.parse(state);
  subscriptionStore.set(state.userId, structuredClone(parsed) as SubscriptionState);
}

export function purgeDemoSubscriptionState(userId: string) {
  subscriptionStore.delete(userId);
}
