"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/security/rate-limit";

import {
  allocateReceivable,
  bankProvider,
  createInternalTransfer,
  previewTransactionCsv,
  suggestReceivableMatches,
  validateTransaction,
  type MoneyState,
} from "@/domain/money/ledger";
import { toKrw } from "@/domain/money/krw";
import { readRuntimeSafetyConfig, assertSafeRuntime } from "@/lib/runtime-safety";
import { readDemoMoneyState, saveDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export type MoneyActionState = {
  status: "idle" | "error" | "preview";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  preview?: Array<{
    rowNumber: number;
    occurredAt: string;
    direction: string;
    amount: string;
    counterparty: string | null;
    descriptor: string | null;
    fingerprint: string;
    duplicate: boolean;
  }>;
  csv?: string;
  accountId?: string;
};

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);
const maskedAccountNumber = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine((value) => value === null || /[•*xX]/.test(value), {
    message: "전체 번호 대신 •••• 1234처럼 마스킹해 주세요.",
  });
const accountSchema = z.object({
  accountId: z.string().optional(),
  institutionName: z.string().trim().min(1, "기관명을 입력해 주세요."),
  nickname: z.string().trim().min(1, "계좌 별칭을 입력해 주세요."),
  accountType: z.enum(["checking", "savings", "cash", "card", "investment", "other"]),
  maskedAccountNumber,
  currentBalance: z.coerce.number().int(),
  availableBalance: optionalText,
  includedInTotals: z.string().optional(),
});

async function demoMoneyState() {
  const runtime = readRuntimeSafetyConfig(process.env);
  assertSafeRuntime(runtime);
  if (!runtime.DEMO_MODE) throw new Error("실제 금융 저장소 자격증명이 연결되지 않았어요.");
  const state = await readDemoMoneyState();
  if (!state) throw new Error("세션이 만료됐어요. 다시 로그인해 주세요.");
  return state;
}

async function withFreshSuggestions(state: MoneyState) {
  const tutoring = await readDemoTutoringState();
  if (!tutoring) return state;
  const studentNames = Object.fromEntries(
    tutoring.students.map((student) => [student.id, student.name]),
  );
  const payerAliases = Object.fromEntries(
    tutoring.students.map((student) => [student.id, student.payerAliases]),
  );
  const lessonStarts = Object.fromEntries(
    tutoring.lessons.map((lesson) => [lesson.id, lesson.startsAt]),
  );
  const generated = suggestReceivableMatches({ state, studentNames, payerAliases, lessonStarts });
  const settled = state.suggestions.filter((suggestion) => suggestion.status !== "suggested");
  return {
    ...state,
    suggestions: [
      ...settled,
      ...generated.filter((item) => !settled.some((old) => old.id === item.id)),
    ],
  };
}

export async function saveAccountAction(
  _previous: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const parsed = accountSchema.safeParse({
    accountId: formData.get("accountId") || undefined,
    institutionName: formData.get("institutionName"),
    nickname: formData.get("nickname"),
    accountType: formData.get("accountType"),
    maskedAccountNumber: formData.get("maskedAccountNumber") || "",
    currentBalance: formData.get("currentBalance"),
    availableBalance: formData.get("availableBalance") || "",
    includedInTotals: formData.get("includedInTotals") || undefined,
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const accountId = parsed.data.accountId ?? randomUUID();
  try {
    const state = await demoMoneyState();
    const existing = state.accounts.find((item) => item.id === accountId);
    const now = new Date().toISOString();
    const account = {
      id: accountId,
      ownerId: state.userId,
      institutionName: parsed.data.institutionName,
      nickname: parsed.data.nickname,
      accountType: parsed.data.accountType,
      maskedAccountNumber: parsed.data.maskedAccountNumber,
      provider: "mock" as const,
      currency: "KRW" as const,
      currentBalance: toKrw(parsed.data.currentBalance),
      availableBalance: parsed.data.availableBalance ? toKrw(parsed.data.availableBalance) : null,
      balanceAsOf: now,
      lastSyncSuccessAt: null,
      includedInTotals: parsed.data.includedInTotals === "on",
      isActive: true,
    };
    await saveDemoMoneyState({
      ...state,
      accounts: existing
        ? state.accounts.map((item) => (item.id === accountId ? account : item))
        : [...state.accounts, account],
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "계좌를 저장하지 못했어요.",
    };
  }
  redirect(`/money/accounts/${accountId}?saved=1`);
}

export async function createTransferAction(
  _previous: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const schema = z.object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.coerce.number().int().positive(),
    occurredAt: z.string().min(1),
    memo: optionalText,
  });
  const parsed = schema.safeParse({
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
    memo: formData.get("memo") || "",
  });
  if (!parsed.success) return { status: "error", message: "이체 계좌·금액·시간을 확인해 주세요." };
  try {
    const state = await demoMoneyState();
    const owned = new Set(
      state.accounts
        .filter((account) => account.ownerId === state.userId)
        .map((account) => account.id),
    );
    if (!owned.has(parsed.data.fromAccountId) || !owned.has(parsed.data.toAccountId))
      return { status: "error", message: "내 계좌 두 개를 선택해 주세요." };
    const now = new Date().toISOString();
    const legs = createInternalTransfer({
      idPrefix: randomUUID(),
      ownerId: state.userId,
      fromAccountId: parsed.data.fromAccountId,
      toAccountId: parsed.data.toAccountId,
      amount: toKrw(parsed.data.amount),
      occurredAt: `${parsed.data.occurredAt}:00+09:00`,
      now,
      memo: parsed.data.memo,
    });
    await saveDemoMoneyState({
      ...state,
      transactions: [...state.transactions, ...legs],
      accounts: state.accounts.map((account) =>
        account.id === parsed.data.fromAccountId
          ? {
              ...account,
              currentBalance: toKrw(account.currentBalance - toKrw(parsed.data.amount)),
            }
          : account.id === parsed.data.toAccountId
            ? {
                ...account,
                currentBalance: toKrw(account.currentBalance + toKrw(parsed.data.amount)),
              }
            : account,
      ),
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "이체를 기록하지 못했어요.",
    };
  }
  redirect("/money/transactions?transfer=1");
}

export async function confirmMatchAction(formData: FormData) {
  let state = await demoMoneyState();
  enforceRateLimit({ key: `money-match:${state.userId}`, limit: 30, windowMs: 60_000 });
  const suggestionId = String(formData.get("suggestionId") ?? "");
  const suggestion = state.suggestions.find(
    (item) => item.id === suggestionId && item.status === "suggested",
  );
  if (!suggestion) return;
  const receivable = state.receivables.find((item) => item.id === suggestion.receivableId);
  const transaction = state.transactions.find((item) => item.id === suggestion.transactionId);
  if (!receivable || !transaction) return;
  const paid = state.allocations
    .filter((item) => item.receivableId === receivable.id)
    .reduce((sum, item) => sum + item.amount, 0n);
  const used = state.allocations
    .filter((item) => item.transactionId === transaction.id)
    .reduce((sum, item) => sum + item.amount, 0n);
  const amount = toKrw(
    receivable.amountDue - paid < transaction.amount - used
      ? receivable.amountDue - paid
      : transaction.amount - used,
  );
  state = allocateReceivable({
    state,
    receivableId: receivable.id,
    transactionId: transaction.id,
    amount,
    allocationId: randomUUID(),
    now: new Date().toISOString(),
  });
  await saveDemoMoneyState({
    ...state,
    suggestions: state.suggestions.map((item) =>
      item.id === suggestion.id
        ? { ...item, status: "confirmed", confirmedAt: new Date().toISOString() }
        : item,
    ),
  });
  revalidatePath("/money");
  revalidatePath("/money/matches");
  revalidatePath("/money/receivables");
}

export async function dismissMatchAction(formData: FormData) {
  const state = await demoMoneyState();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  await saveDemoMoneyState({
    ...state,
    suggestions: state.suggestions.map((item) =>
      item.id === suggestionId && item.status === "suggested"
        ? { ...item, status: "dismissed", dismissedAt: new Date().toISOString() }
        : item,
    ),
  });
  revalidatePath("/money/matches");
}

export async function allocateReceivableAction(formData: FormData) {
  const state = await demoMoneyState();
  enforceRateLimit({ key: `money-match:${state.userId}`, limit: 30, windowMs: 60_000 });
  const parsed = z
    .object({
      receivableId: z.string(),
      transactionId: z.string(),
      amount: z.coerce.number().int().positive(),
    })
    .parse({
      receivableId: formData.get("receivableId"),
      transactionId: formData.get("transactionId"),
      amount: formData.get("amount"),
    });
  const next = allocateReceivable({
    state,
    ...parsed,
    amount: toKrw(parsed.amount),
    allocationId: randomUUID(),
    now: new Date().toISOString(),
  });
  await saveDemoMoneyState(next);
  revalidatePath(`/money/receivables/${parsed.receivableId}`);
  revalidatePath("/money/receivables");
}

export async function previewCsvAction(
  _previous: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  try {
    const state = await demoMoneyState();
    enforceRateLimit({ key: `csv-import:${state.userId}`, limit: 10, windowMs: 60_000 });
    const accountId = z.string().min(1).parse(formData.get("accountId"));
    if (!state.accounts.some((account) => account.id === accountId))
      return { status: "error", message: "가져올 계좌를 선택해 주세요." };
    const file = formData.get("csvFile");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000)
      return { status: "error", message: "1MB 이하 CSV 파일을 선택해 주세요." };
    const csv = await file.text();
    const rows = bankProvider("manual_csv").import(
      csv,
      new Set(state.transactions.flatMap((item) => item.importFingerprint ?? [])),
    );
    return {
      status: "preview",
      message: `${rows.filter((row) => !row.duplicate).length}건을 가져올 수 있어요.`,
      preview: rows.map((row) => ({ ...row, amount: row.amount.toString() })),
      csv,
      accountId,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "CSV를 읽지 못했어요.",
    };
  }
}

export async function commitCsvAction(formData: FormData) {
  let state = await demoMoneyState();
  enforceRateLimit({ key: `csv-import:${state.userId}`, limit: 10, windowMs: 60_000 });
  const accountId = z.string().min(1).parse(formData.get("accountId"));
  const csv = z.string().min(1).max(1_000_000).parse(formData.get("csv"));
  if (!state.accounts.some((account) => account.id === accountId)) return;
  const rows = previewTransactionCsv(
    csv,
    new Set(state.transactions.flatMap((item) => item.importFingerprint ?? [])),
  );
  const now = new Date().toISOString();
  const transactions = rows
    .filter((row) => !row.duplicate)
    .map((row) =>
      validateTransaction({
        id: randomUUID(),
        ownerId: state.userId,
        accountId,
        categoryCode: row.direction === "inflow" ? "other_income" : "other_expense",
        scope: "private",
        householdId: null,
        direction: row.direction,
        kind: row.direction === "inflow" ? "income" : "expense",
        amount: row.amount,
        occurredAt: row.occurredAt,
        counterparty: row.counterparty,
        descriptor: row.descriptor,
        memo: null,
        source: "manual_csv",
        externalTransactionId: null,
        importFingerprint: row.fingerprint,
        transferGroupId: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  state = await withFreshSuggestions({
    ...state,
    transactions: [...state.transactions, ...transactions],
  });
  await saveDemoMoneyState(state);
  redirect(`/money/transactions?imported=${transactions.length}`);
}

export async function createMoneyCategoryAction(formData: FormData) {
  const parsed = z
    .object({
      kind: z.enum(["income", "expense"]),
      displayName: z.string().trim().min(1).max(30),
    })
    .parse({ kind: formData.get("kind"), displayName: formData.get("displayName") });
  const state = await demoMoneyState();
  if (
    state.categories.some(
      (category) =>
        category.kind === parsed.kind &&
        category.displayName.toLocaleLowerCase("ko-KR") ===
          parsed.displayName.toLocaleLowerCase("ko-KR"),
    )
  )
    redirect("/settings/money?duplicate=1");
  await saveDemoMoneyState({
    ...state,
    categories: [
      ...state.categories,
      {
        code: `custom-${randomUUID()}`,
        displayName: parsed.displayName,
        kind: parsed.kind,
        isSystem: false,
        isActive: true,
      },
    ],
  });
  redirect("/settings/money?created=1");
}

export async function toggleMoneyCategoryAction(formData: FormData) {
  const code = z.string().min(1).parse(formData.get("code"));
  const state = await demoMoneyState();
  const category = state.categories.find((item) => item.code === code);
  if (!category || category.isSystem) return;
  await saveDemoMoneyState({
    ...state,
    categories: state.categories.map((item) =>
      item.code === code ? { ...item, isActive: !item.isActive } : item,
    ),
  });
  revalidatePath("/settings/money");
}
