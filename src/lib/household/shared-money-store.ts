import { z } from "zod";

import type { HouseholdMoneyState, SharedExpense } from "@/domain/household/shared-money";
import { toKrw } from "@/domain/money/krw";
import { readDemoSession } from "@/lib/auth/session";
import { readDemoMoneyState, saveDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

const expenseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  createdByMemberId: z.string(),
  payerMemberId: z.string(),
  sourceKind: z.enum(["manual", "transaction", "subscription"]),
  sourceSubscriptionOccurrenceId: z.string().nullable(),
  linkedTransactionId: z.string().nullable(),
  category: z.enum([
    "rent",
    "management_fee",
    "electricity",
    "gas",
    "water",
    "internet",
    "household_goods",
    "shared_grocery",
    "subscription",
    "other",
  ]),
  kind: z.enum(["charge", "refund"]),
  description: z.string().min(1),
  amount: z.bigint().positive(),
  incurredOn: z.string(),
  dueOn: z.string().nullable(),
  status: z.enum(["draft", "confirmed", "settled", "void"]),
  notes: z.string().nullable(),
  splits: z.array(z.object({ memberId: z.string(), amount: z.bigint().nonnegative() })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const stateSchema = z.object({
  userId: z.string().min(8),
  householdId: z.string(),
  currentMemberId: z.string(),
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      displayName: z.string(),
      isCurrentUser: z.boolean(),
      status: z.literal("active"),
    }),
  ),
  expenses: z.array(expenseSchema),
  settlements: z.array(
    z.object({
      id: z.string(),
      householdId: z.string(),
      fromMemberId: z.string(),
      toMemberId: z.string(),
      periodStart: z.string(),
      periodEnd: z.string(),
      amountDue: z.bigint().positive(),
      status: z.enum(["open", "partially_paid", "paid", "void"]),
      dueOn: z.string().nullable(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  settlementAllocations: z.array(
    z.object({
      id: z.string(),
      settlementId: z.string(),
      ownerUserId: z.string(),
      transactionId: z.string(),
      amount: z.bigint().positive(),
      createdByMemberId: z.string(),
      createdAt: z.string(),
    }),
  ),
});

const globalForSharedMoney = globalThis as typeof globalThis & {
  studentOsSharedMoneyStore?: Map<string, HouseholdMoneyState>;
};
const sharedMoneyStore =
  globalForSharedMoney.studentOsSharedMoneyStore ?? new Map<string, HouseholdMoneyState>();
globalForSharedMoney.studentOsSharedMoneyStore = sharedMoneyStore;

function defaultState(userId: string, persona: "owner" | "roommate"): HouseholdMoneyState {
  const ownerIsCurrent = persona === "owner";
  const currentMemberId = ownerIsCurrent ? "member-owner" : "member-roommate";
  return {
    userId,
    householdId: "household-demo",
    currentMemberId,
    members: [
      {
        id: "member-owner",
        userId: ownerIsCurrent ? userId : "demo-owner-user",
        displayName: "재원",
        isCurrentUser: ownerIsCurrent,
        status: "active",
      },
      {
        id: "member-roommate",
        userId: ownerIsCurrent ? "demo-roommate-user" : userId,
        displayName: "민수",
        isCurrentUser: !ownerIsCurrent,
        status: "active",
      },
    ],
    expenses: [],
    settlements: [],
    settlementAllocations: [],
  };
}

async function ensurePhaseSixMoneyFixtures(userId: string, householdId: string) {
  const money = await readDemoMoneyState();
  if (!money || money.userId !== userId) return;
  const now = "2026-09-03T03:00:00.000Z";
  const fixtures = [
    {
      id: "transaction-household-rent",
      ownerId: userId,
      accountId: "account-bank",
      categoryCode: "housing",
      scope: "household" as const,
      householdId,
      direction: "outflow" as const,
      kind: "expense" as const,
      amount: toKrw(700_000),
      occurredAt: "2026-09-01T09:00:00+09:00",
      counterparty: "집주인",
      descriptor: "9월 월세",
      memo: null,
      source: "mock_sync" as const,
      externalTransactionId: "mock-household-rent-202609",
      importFingerprint: null,
      transferGroupId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "transaction-roommate-settlement",
      ownerId: userId,
      accountId: "account-bank",
      categoryCode: null,
      scope: "private" as const,
      householdId: null,
      direction: "inflow" as const,
      kind: "income" as const,
      amount: toKrw(200_000),
      occurredAt: "2026-09-03T10:00:00+09:00",
      counterparty: "민수",
      descriptor: "9월 월세 정산",
      memo: null,
      source: "mock_sync" as const,
      externalTransactionId: "mock-roommate-settlement-202609",
      importFingerprint: null,
      transferGroupId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "transaction-utility-candidate",
      ownerId: userId,
      accountId: "account-bank",
      categoryCode: null,
      scope: "private" as const,
      householdId: null,
      direction: "outflow" as const,
      kind: "expense" as const,
      amount: toKrw(54_321),
      occurredAt: "2026-09-03T08:00:00+09:00",
      counterparty: "서울전력",
      descriptor: "9월 전기요금",
      memo: null,
      source: "mock_sync" as const,
      externalTransactionId: "mock-utility-202609",
      importFingerprint: null,
      transferGroupId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const missing = fixtures.filter(
    (fixture) => !money.transactions.some((transaction) => transaction.id === fixture.id),
  );
  if (missing.length > 0)
    await saveDemoMoneyState({ ...money, transactions: [...money.transactions, ...missing] });
}

async function withSubscriptionBridge(state: HouseholdMoneyState) {
  const subscriptions = await readDemoSubscriptionState();
  if (!subscriptions || subscriptions.householdId !== state.householdId) return state;
  const bridged: SharedExpense[] = subscriptions.sharedExpenses.map((expense) => {
    const occurrence = subscriptions.occurrences.find((item) => item.id === expense.occurrenceId);
    const subscription = subscriptions.subscriptions.find(
      (item) => item.id === occurrence?.subscriptionId,
    );
    return {
      id: expense.id,
      householdId: expense.householdId,
      createdByMemberId: expense.payerMemberId,
      payerMemberId: expense.payerMemberId,
      sourceKind: "subscription",
      sourceSubscriptionOccurrenceId: expense.occurrenceId,
      linkedTransactionId: expense.transactionId,
      category: "subscription",
      kind: "charge",
      description: subscription?.name ?? "공동 구독",
      amount: expense.amount,
      incurredOn: occurrence?.dueOn ?? expense.createdAt.slice(0, 10),
      dueOn: occurrence?.dueOn ?? null,
      status: "confirmed",
      notes: "구독 발생분에서 연결",
      splits: expense.splits,
      createdAt: expense.createdAt,
      updatedAt: expense.createdAt,
    };
  });
  const ids = new Set(bridged.map((expense) => expense.id));
  return {
    ...state,
    expenses: [...state.expenses.filter((expense) => !ids.has(expense.id)), ...bridged],
  };
}

export async function readDemoSharedMoneyState(): Promise<HouseholdMoneyState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  let stored = sharedMoneyStore.get(session.userId);
  if (!stored) {
    stored = defaultState(session.userId, session.persona);
    sharedMoneyStore.set(session.userId, stored);
  }
  await ensurePhaseSixMoneyFixtures(session.userId, stored.householdId);
  return withSubscriptionBridge(structuredClone(stored));
}

export async function saveDemoSharedMoneyState(state: HouseholdMoneyState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId)
    throw new Error("현재 세션과 우리집 정산 소유자가 달라요.");
  const withoutProjection = {
    ...state,
    expenses: state.expenses.filter((expense) => expense.sourceKind !== "subscription"),
  };
  const parsed = stateSchema.parse(withoutProjection) as HouseholdMoneyState;
  if (
    !parsed.members.some((member) => member.id === parsed.currentMemberId && member.isCurrentUser)
  ) {
    throw new Error("현재 구성원 경계가 일치하지 않아요.");
  }
  sharedMoneyStore.set(state.userId, structuredClone(parsed));
}

export function purgeDemoSharedMoneyState(userId: string) {
  sharedMoneyStore.delete(userId);
}
