"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  allocateSettlementPayment,
  classifyTransactionAsSharedExpense,
  createExpenseSplits,
  parsePercentToBasisPoints,
  saveSharedExpense,
  suggestSettlementMatches,
  voidSharedExpense,
  type HouseholdMoneyState,
  type SharedExpense,
  type SplitPreset,
  type TransactionClassification,
} from "@/domain/household/shared-money";
import { toKrw, toPositiveKrw } from "@/domain/money/krw";
import {
  readDemoSharedMoneyState,
  saveDemoSharedMoneyState,
} from "@/lib/household/shared-money-store";
import { readDemoMoneyState, saveDemoMoneyState } from "@/lib/money/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";

export type SharedMoneyActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 확인해 주세요.");
const amountText = z
  .string()
  .trim()
  .regex(/^\d+$/, "금액은 1원 단위 정수로 입력해 주세요.")
  .refine((value) => BigInt(value) > 0n, "금액은 1원 이상이어야 해요.");

const expenseSchema = z.object({
  expenseId: z.string().optional(),
  description: z.string().trim().min(1, "내용을 입력해 주세요.").max(100),
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
  amount: amountText,
  incurredOn: dateText,
  dueOn: z.union([dateText, z.literal("")]),
  payerMemberId: z.string().min(1),
  splitPreset: z.enum([
    "equal",
    "current_user_all",
    "roommate_all",
    "custom_amounts",
    "custom_percentages",
  ]),
  currentAmount: z.string().trim(),
  roommateAmount: z.string().trim(),
  currentPercent: z.string().trim(),
  roommatePercent: z.string().trim(),
  linkedTransactionId: optionalText,
  notes: optionalText,
});

function refreshSharedMoney() {
  for (const path of [
    "/household",
    "/household/expenses",
    "/household/settlements",
    "/money",
    "/money/analytics",
    "/money/grow",
    "/money/transactions",
  ]) {
    revalidatePath(path);
  }
}

async function demoState() {
  const runtime = readRuntimeSafetyConfig(process.env);
  assertSafeRuntime(runtime);
  if (!runtime.DEMO_MODE) throw new Error("실제 우리집 저장소는 아직 연결하지 않았어요.");
  const state = await readDemoSharedMoneyState();
  if (!state) throw new Error("로컬 데모 세션이 만료됐어요.");
  return state;
}

function numericOrUndefined(value: string) {
  return value ? toKrw(value) : undefined;
}

function buildSplits(
  state: HouseholdMoneyState,
  preset: SplitPreset,
  data: z.infer<typeof expenseSchema>,
) {
  const roommate = state.members.find((member) => member.id !== state.currentMemberId);
  if (!roommate) throw new Error("공동비를 나눌 룸메이트가 필요해요.");
  return createExpenseSplits({
    total: toPositiveKrw(data.amount),
    currentMemberId: state.currentMemberId,
    roommateMemberId: roommate.id,
    preset,
    currentAmount: numericOrUndefined(data.currentAmount),
    roommateAmount: numericOrUndefined(data.roommateAmount),
    currentPercentBasisPoints: data.currentPercent
      ? parsePercentToBasisPoints(data.currentPercent)
      : undefined,
    roommatePercentBasisPoints: data.roommatePercent
      ? parsePercentToBasisPoints(data.roommatePercent)
      : undefined,
  });
}

export async function saveSharedExpenseAction(
  _previous: SharedMoneyActionState,
  formData: FormData,
): Promise<SharedMoneyActionState> {
  const parsed = expenseSchema.safeParse({
    expenseId: formData.get("expenseId") || undefined,
    description: formData.get("description"),
    category: formData.get("category"),
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    incurredOn: formData.get("incurredOn"),
    dueOn: formData.get("dueOn") || "",
    payerMemberId: formData.get("payerMemberId"),
    splitPreset: formData.get("splitPreset"),
    currentAmount: formData.get("currentAmount") || "",
    roommateAmount: formData.get("roommateAmount") || "",
    currentPercent: formData.get("currentPercent") || "",
    roommatePercent: formData.get("roommatePercent") || "",
    linkedTransactionId: formData.get("linkedTransactionId") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "공동비 입력값을 다시 확인해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const expenseId = parsed.data.expenseId ?? randomUUID();
  try {
    const state = await demoState();
    const existing = state.expenses.find((expense) => expense.id === expenseId);
    const money = await readDemoMoneyState();
    if (!money) throw new Error("거래 원장을 읽지 못했어요.");
    const linkedTransaction = parsed.data.linkedTransactionId
      ? money.transactions.find((transaction) => transaction.id === parsed.data.linkedTransactionId)
      : null;
    if (parsed.data.linkedTransactionId && !linkedTransaction)
      throw new Error("연결할 거래를 찾지 못했어요.");
    if (linkedTransaction) {
      if (
        linkedTransaction.ownerId !== state.userId ||
        linkedTransaction.kind !== "expense" ||
        linkedTransaction.direction !== "outflow"
      ) {
        throw new Error("내 실제 출금 지출만 공동비에 연결할 수 있어요.");
      }
      if (linkedTransaction.amount !== toPositiveKrw(parsed.data.amount)) {
        throw new Error("연결 거래와 공동비 총액이 같아야 해요.");
      }
      if (parsed.data.payerMemberId !== state.currentMemberId) {
        throw new Error("내 거래를 연결할 때 실제 결제자는 나여야 해요.");
      }
      const duplicate = state.expenses.find(
        (expense) =>
          expense.linkedTransactionId === linkedTransaction.id && expense.id !== expenseId,
      );
      if (duplicate) throw new Error("이미 다른 공동비에 연결된 거래예요.");
    }
    const timestamp = new Date().toISOString();
    const nextExpense: SharedExpense = {
      id: expenseId,
      householdId: state.householdId,
      createdByMemberId: existing?.createdByMemberId ?? state.currentMemberId,
      payerMemberId: parsed.data.payerMemberId,
      sourceKind: linkedTransaction ? "transaction" : (existing?.sourceKind ?? "manual"),
      sourceSubscriptionOccurrenceId: existing?.sourceSubscriptionOccurrenceId ?? null,
      linkedTransactionId: linkedTransaction?.id ?? null,
      category: parsed.data.category,
      kind: parsed.data.kind,
      description: parsed.data.description,
      amount: toPositiveKrw(parsed.data.amount),
      incurredOn: parsed.data.incurredOn,
      dueOn: parsed.data.dueOn || null,
      status: existing?.status === "draft" ? "draft" : "confirmed",
      notes: parsed.data.notes,
      splits: buildSplits(state, parsed.data.splitPreset, parsed.data),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const nextState = saveSharedExpense({
      state,
      expense: nextExpense,
      actorMemberId: state.currentMemberId,
    });
    await saveDemoSharedMoneyState(nextState);
    if (existing?.linkedTransactionId && existing.linkedTransactionId !== linkedTransaction?.id) {
      const old = money.transactions.find(
        (transaction) => transaction.id === existing.linkedTransactionId,
      );
      if (old) Object.assign(old, { scope: "private", householdId: null, updatedAt: timestamp });
    }
    if (linkedTransaction) {
      Object.assign(linkedTransaction, {
        scope: "household",
        householdId: state.householdId,
        categoryCode: parsed.data.category === "rent" ? "housing" : "household",
        updatedAt: timestamp,
      });
    }
    await saveDemoMoneyState(money);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "공동비를 저장하지 못했어요.",
    };
  }
  refreshSharedMoney();
  redirect(`/household/expenses/${expenseId}?saved=1`);
}

export async function voidSharedExpenseAction(formData: FormData) {
  const expenseId = z.string().min(1).parse(formData.get("expenseId"));
  const state = await demoState();
  const existing = state.expenses.find((expense) => expense.id === expenseId);
  const next = voidSharedExpense({
    state,
    expenseId,
    actorMemberId: state.currentMemberId,
    now: new Date().toISOString(),
  });
  await saveDemoSharedMoneyState(next);
  if (existing?.linkedTransactionId) {
    const money = await readDemoMoneyState();
    const transaction = money?.transactions.find(
      (item) => item.id === existing.linkedTransactionId,
    );
    if (money && transaction) {
      Object.assign(transaction, {
        scope: "private",
        householdId: null,
        updatedAt: new Date().toISOString(),
      });
      await saveDemoMoneyState(money);
    }
  }
  refreshSharedMoney();
  redirect("/household/expenses?voided=1");
}

export async function classifyTransactionAction(formData: FormData) {
  const parsed = z
    .object({
      transactionId: z.string().min(1),
      classification: z.enum(["household_shopping", "housing", "utility", "personal"]),
    })
    .parse({
      transactionId: formData.get("transactionId"),
      classification: formData.get("classification"),
    });
  const state = await demoState();
  const money = await readDemoMoneyState();
  const transaction = money?.transactions.find((item) => item.id === parsed.transactionId);
  if (
    !money ||
    !transaction ||
    transaction.ownerId !== state.userId ||
    transaction.kind !== "expense" ||
    transaction.direction !== "outflow"
  )
    throw new Error("분류할 거래를 찾지 못했어요.");
  if (
    state.expenses.some(
      (expense) => expense.status !== "void" && expense.linkedTransactionId === transaction.id,
    )
  ) {
    throw new Error("이미 공동비에 연결된 거래는 다시 분류할 수 없어요.");
  }
  const timestamp = new Date().toISOString();
  if (parsed.classification === "personal") {
    Object.assign(transaction, { scope: "private", householdId: null, updatedAt: timestamp });
  } else {
    const next = classifyTransactionAsSharedExpense({
      state,
      transaction,
      classification: parsed.classification,
      expenseId: randomUUID(),
      actorMemberId: state.currentMemberId,
      incurredOn: transaction.occurredAt.slice(0, 10),
      now: timestamp,
    });
    await saveDemoSharedMoneyState(next);
    const categoryCodes: Record<Exclude<TransactionClassification, "personal">, string> = {
      household_shopping: "household",
      housing: "housing",
      utility: "household",
    };
    Object.assign(transaction, {
      scope: "household",
      householdId: state.householdId,
      categoryCode: categoryCodes[parsed.classification],
      updatedAt: timestamp,
    });
  }
  await saveDemoMoneyState(money);
  refreshSharedMoney();
  redirect(`/household/expenses?classified=${parsed.classification}`);
}

export async function confirmSettlementMatchAction(formData: FormData) {
  const parsed = z
    .object({
      settlementId: z.string().min(1),
      transactionId: z.string().min(1),
      amount: amountText,
    })
    .parse({
      settlementId: formData.get("settlementId"),
      transactionId: formData.get("transactionId"),
      amount: formData.get("amount"),
    });
  const state = await demoState();
  const money = await readDemoMoneyState();
  const transaction = money?.transactions.find((item) => item.id === parsed.transactionId);
  if (!money || !transaction) throw new Error("정산 후보 거래를 찾지 못했어요.");
  const currentSuggestions = suggestSettlementMatches({ state, transactions: money.transactions });
  if (
    !currentSuggestions.some(
      (suggestion) =>
        suggestion.settlementId === parsed.settlementId &&
        suggestion.transactionId === parsed.transactionId,
    )
  ) {
    throw new Error("현재 유효한 정산 제안이 아니에요.");
  }
  const timestamp = new Date().toISOString();
  const next = allocateSettlementPayment({
    state,
    settlementId: parsed.settlementId,
    transaction,
    amount: toPositiveKrw(parsed.amount),
    allocationId: randomUUID(),
    actorMemberId: state.currentMemberId,
    now: timestamp,
  });
  await saveDemoSharedMoneyState(next);
  Object.assign(transaction, {
    scope: "household",
    householdId: state.householdId,
    categoryCode: "household",
    updatedAt: timestamp,
  });
  await saveDemoMoneyState(money);
  refreshSharedMoney();
  redirect("/household/settlements?matched=1");
}
