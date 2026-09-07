import { z } from "zod";

import type { HouseholdCostRow, HouseholdOperationsState } from "@/domain/household/operations";
import { toKrw } from "@/domain/money/krw";
import { readDemoSession } from "@/lib/auth/session";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";

const ownerShape = {
  ownerKind: z.enum(["member", "shared"]),
  ownerMemberId: z.string().nullable(),
};

const householdStateSchema = z.object({
  userId: z.string().min(8),
  householdId: z.string().min(1),
  currentMemberId: z.string().min(1),
  members: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      displayName: z.string(),
      isCurrentUser: z.boolean(),
      status: z.literal("active"),
    }),
  ),
  inventory: z.array(
    z.object({
      id: z.string(),
      householdId: z.string(),
      name: z.string(),
      quantityMilli: z.bigint().nonnegative(),
      unit: z.string(),
      ...ownerShape,
      storageLocation: z.enum(["refrigerated", "frozen", "room_temperature"]),
      expiresOn: z.string().nullable(),
      lowStockThresholdMilli: z.bigint().nonnegative().nullable(),
      notes: z.string().nullable(),
      version: z.number().int().nonnegative(),
      createdByMemberId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  inventoryAdjustments: z.array(
    z.object({
      id: z.string(),
      itemId: z.string(),
      actorMemberId: z.string(),
      idempotencyKey: z.string(),
      deltaMilli: z.bigint(),
      quantityBeforeMilli: z.bigint().nonnegative(),
      quantityAfterMilli: z.bigint().nonnegative(),
      createdAt: z.string(),
    }),
  ),
  shopping: z.array(
    z.object({
      id: z.string(),
      householdId: z.string(),
      inventoryItemId: z.string().nullable(),
      requestedByMemberId: z.string(),
      ...ownerShape,
      name: z.string(),
      desiredQuantityMilli: z.bigint().positive().nullable(),
      unit: z.string().nullable(),
      status: z.enum(["needed", "purchased", "dismissed"]),
      purchasedTransactionId: z.string().nullable(),
      sharedExpenseId: z.string().nullable(),
      purchasedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  cleaningTasks: z.array(
    z.object({
      id: z.string(),
      householdId: z.string(),
      title: z.string(),
      area: z.string(),
      assigneeMemberId: z.string().nullable(),
      recurrence: z.enum(["none", "interval_days", "weekly"]),
      recurrenceIntervalDays: z.number().int().positive().nullable(),
      weekday: z.number().int().min(0).max(6).nullable(),
      dueSoonDays: z.number().int().min(0).max(30),
      lastCompletedAt: z.string().nullable(),
      nextDueOn: z.string().nullable(),
      notes: z.string().nullable(),
      isActive: z.boolean(),
      createdByMemberId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  cleaningCompletions: z.array(
    z.object({
      id: z.string(),
      taskId: z.string(),
      completedByMemberId: z.string(),
      completedAt: z.string(),
      note: z.string().nullable(),
      idempotencyKey: z.string(),
    }),
  ),
  costRows: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      amount: z.bigint(),
      payerMemberId: z.string(),
      splits: z.array(z.object({ memberId: z.string(), amount: z.bigint() })),
      sourceHref: z.string(),
    }),
  ),
});

const globalForHousehold = globalThis as typeof globalThis & {
  studentOsHouseholdStore?: Map<string, HouseholdOperationsState>;
};
const householdStore =
  globalForHousehold.studentOsHouseholdStore ?? new Map<string, HouseholdOperationsState>();
globalForHousehold.studentOsHouseholdStore = householdStore;

function defaultState(userId: string, persona: "owner" | "roommate"): HouseholdOperationsState {
  const ownerIsCurrent = persona === "owner";
  const currentMemberId = ownerIsCurrent ? "member-owner" : "member-roommate";
  const members: HouseholdOperationsState["members"] = [
    {
      id: "member-owner",
      userId: ownerIsCurrent ? userId : "demo-owner-user",
      displayName: "최재원",
      isCurrentUser: ownerIsCurrent,
      status: "active",
    },
    {
      id: "member-roommate",
      userId: ownerIsCurrent ? "demo-roommate-user" : userId,
      displayName: "김태현",
      isCurrentUser: !ownerIsCurrent,
      status: "active",
    },
  ];
  return {
    userId,
    householdId: "household-demo",
    currentMemberId,
    members,
    inventory: [],
    inventoryAdjustments: [],
    shopping: [],
    cleaningTasks: [],
    cleaningCompletions: [],
    costRows: [],
  };
}

export async function readDemoHouseholdState(): Promise<HouseholdOperationsState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  const existing = householdStore.get(session.userId);
  if (existing) return existing;
  const initial = defaultState(session.userId, session.persona);
  householdStore.set(session.userId, initial);
  return initial;
}

export async function saveDemoHouseholdState(state: HouseholdOperationsState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId) throw new Error("우리집 세션이 만료됐어요.");
  const parsed = householdStateSchema.parse(state) as HouseholdOperationsState;
  if (
    !parsed.members.some((member) => member.id === parsed.currentMemberId && member.isCurrentUser)
  ) {
    throw new Error("현재 구성원 경계가 일치하지 않아요.");
  }
  householdStore.set(session.userId, parsed);
}

export function purgeDemoHouseholdState(userId: string) {
  householdStore.delete(userId);
}

export async function readHouseholdCostRows(state: HouseholdOperationsState) {
  const sharedMoney = await readDemoSharedMoneyState();
  if (!sharedMoney || sharedMoney.householdId !== state.householdId) return state.costRows;
  return sharedMoney.expenses
    .filter((expense) => expense.status === "confirmed" || expense.status === "settled")
    .map<HouseholdCostRow>((expense) => ({
      id: expense.id,
      label: expense.description,
      amount: toKrw(expense.kind === "refund" ? -expense.amount : expense.amount),
      payerMemberId: expense.payerMemberId,
      splits: expense.splits.map((split) => ({
        ...split,
        amount: toKrw(expense.kind === "refund" ? -split.amount : split.amount),
      })),
      sourceHref:
        expense.sourceKind === "subscription" && expense.sourceSubscriptionOccurrenceId
          ? "/money/subscriptions"
          : `/household/expenses/${expense.id}`,
    }));
}
