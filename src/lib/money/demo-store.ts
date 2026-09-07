import { z } from "zod";

import type { MoneyState } from "@/domain/money/ledger";
import { readDemoSession } from "@/lib/auth/session";

const moneyStateSchema = z.object({
  userId: z.string().min(8),
  categories: z.array(
    z.object({
      code: z.string().min(1),
      displayName: z.string().min(1),
      kind: z.enum(["income", "expense"]),
      isSystem: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
  accounts: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      institutionName: z.string(),
      nickname: z.string(),
      accountType: z.enum(["checking", "savings", "cash", "card", "investment", "other"]),
      maskedAccountNumber: z.string().nullable(),
      provider: z.enum(["mock", "manual_csv", "kftc_testbed", "kftc_production"]),
      currency: z.literal("KRW"),
      currentBalance: z.bigint(),
      availableBalance: z.bigint().nullable(),
      balanceAsOf: z.string().nullable(),
      lastSyncSuccessAt: z.string().nullable(),
      includedInTotals: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      accountId: z.string(),
      categoryCode: z.string().nullable(),
      scope: z.enum(["private", "household"]),
      householdId: z.string().nullable(),
      direction: z.enum(["inflow", "outflow"]),
      kind: z.enum(["income", "expense", "transfer"]),
      amount: z.bigint(),
      occurredAt: z.string(),
      counterparty: z.string().nullable(),
      descriptor: z.string().nullable(),
      memo: z.string().nullable(),
      source: z.enum(["manual", "mock_sync", "manual_csv", "bank_sync", "system"]),
      externalTransactionId: z.string().nullable(),
      importFingerprint: z.string().nullable(),
      transferGroupId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  receivables: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      studentId: z.string(),
      lessonId: z.string(),
      amountDue: z.bigint().positive(),
      dueDate: z.string().nullable(),
      status: z.enum(["open", "partially_paid", "paid", "void"]),
      voidReason: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  allocations: z.array(
    z.object({
      id: z.string(),
      receivableId: z.string(),
      transactionId: z.string(),
      amount: z.bigint().positive(),
      createdBy: z.string(),
      createdAt: z.string(),
    }),
  ),
  suggestions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      transactionId: z.string(),
      receivableId: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.object({ amount: z.string(), alias: z.string(), timing: z.string() }),
      status: z.enum(["suggested", "confirmed", "dismissed"]),
      confirmedAt: z.string().nullable(),
      dismissedAt: z.string().nullable(),
    }),
  ),
});

const globalForMoney = globalThis as typeof globalThis & {
  studentOsMoneyStore?: Map<string, MoneyState>;
};
const moneyStore = globalForMoney.studentOsMoneyStore ?? new Map<string, MoneyState>();
globalForMoney.studentOsMoneyStore = moneyStore;

function defaultState(userId: string): MoneyState {
  return {
    userId,
    categories: [
      { code: "tutoring", displayName: "과외", kind: "income", isSystem: true, isActive: true },
      {
        code: "scholarship",
        displayName: "장학금",
        kind: "income",
        isSystem: true,
        isActive: true,
      },
      { code: "allowance", displayName: "용돈", kind: "income", isSystem: true, isActive: true },
      {
        code: "other_income",
        displayName: "기타 수입",
        kind: "income",
        isSystem: true,
        isActive: true,
      },
      { code: "food", displayName: "식비", kind: "expense", isSystem: true, isActive: true },
      { code: "cafe", displayName: "카페", kind: "expense", isSystem: true, isActive: true },
      { code: "transport", displayName: "교통", kind: "expense", isSystem: true, isActive: true },
      { code: "housing", displayName: "주거", kind: "expense", isSystem: true, isActive: true },
      { code: "shopping", displayName: "쇼핑", kind: "expense", isSystem: true, isActive: true },
      { code: "education", displayName: "교육", kind: "expense", isSystem: true, isActive: true },
      {
        code: "subscription",
        displayName: "구독",
        kind: "expense",
        isSystem: true,
        isActive: true,
      },
      { code: "household", displayName: "자취방", kind: "expense", isSystem: true, isActive: true },
      {
        code: "other_expense",
        displayName: "기타 지출",
        kind: "expense",
        isSystem: true,
        isActive: true,
      },
    ],
    accounts: [],
    transactions: [],
    receivables: [],
    allocations: [],
    suggestions: [],
  };
}

export async function readDemoMoneyState(): Promise<MoneyState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  const stored = moneyStore.get(session.userId);
  if (stored) return structuredClone(stored);
  const initial = defaultState(session.userId);
  moneyStore.set(session.userId, initial);
  return structuredClone(initial);
}

export async function saveDemoMoneyState(state: MoneyState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId)
    throw new Error("현재 세션과 금융 데이터 소유자가 일치하지 않아요.");
  const parsed = moneyStateSchema.parse(state);
  moneyStore.set(state.userId, structuredClone(parsed) as unknown as MoneyState);
}

export function purgeDemoMoneyState(userId: string) {
  moneyStore.delete(userId);
}
