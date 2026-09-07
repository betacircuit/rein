import { describe, expect, it } from "vitest";

import { toKrw } from "@/domain/money/krw";
import {
  allocateReceivable,
  bankProvider,
  calculateMoneyOverview,
  createInternalTransfer,
  ensureLessonReceivable,
  previewTransactionCsv,
  sanitizeSpreadsheetCell,
  suggestReceivableMatches,
  type Account,
  type FinancialTransaction,
  type MoneyState,
  type Receivable,
} from "@/domain/money/ledger";

const now = "2026-09-02T10:00:00.000Z";
const account: Account = {
  id: "account-1",
  ownerId: "owner-1",
  institutionName: "목 은행",
  nickname: "생활비",
  accountType: "checking",
  maskedAccountNumber: "***1234",
  provider: "mock",
  currency: "KRW",
  currentBalance: toKrw(1_000_000),
  availableBalance: toKrw(900_000),
  balanceAsOf: now,
  lastSyncSuccessAt: now,
  includedInTotals: true,
  isActive: true,
};
const income: FinancialTransaction = {
  id: "income-1",
  ownerId: "owner-1",
  accountId: account.id,
  categoryCode: "tutoring",
  scope: "private",
  householdId: null,
  direction: "inflow",
  kind: "income",
  amount: toKrw(60_000),
  occurredAt: now,
  counterparty: "김민준 어머니",
  descriptor: "과외비",
  memo: null,
  source: "mock_sync",
  externalTransactionId: "mock-1",
  importFingerprint: null,
  transferGroupId: null,
  createdAt: now,
  updatedAt: now,
};
const receivable: Receivable = {
  id: "receivable-1",
  ownerId: "owner-1",
  studentId: "student-1",
  lessonId: "lesson-1",
  amountDue: toKrw(60_000),
  dueDate: null,
  status: "open",
  voidReason: null,
  createdAt: now,
  updatedAt: now,
};
const state: MoneyState = {
  userId: "owner-1",
  categories: [],
  accounts: [account],
  transactions: [income],
  receivables: [receivable],
  allocations: [],
  suggestions: [],
};

describe("Phase 03 ledger and receivables", () => {
  it("creates exactly one receivable when lesson completion is replayed", () => {
    const first = ensureLessonReceivable({
      state: { ...state, receivables: [] },
      lesson: {
        id: "lesson-1",
        ownerId: "owner-1",
        studentId: "student-1",
        amount: toKrw(60_000),
        status: "completed",
      },
      now,
    });
    const second = ensureLessonReceivable({
      state: first,
      lesson: {
        id: "lesson-1",
        ownerId: "owner-1",
        studentId: "student-1",
        amount: toKrw(60_000),
        status: "completed",
      },
      now,
    });
    expect(second.receivables).toHaveLength(1);
  });

  it("reconciles partial and combined allocations without over-allocation", () => {
    const partial = allocateReceivable({
      state,
      receivableId: receivable.id,
      transactionId: income.id,
      amount: toKrw(40_000),
      allocationId: "allocation-1",
      now,
    });
    expect(partial.receivables[0]?.status).toBe("partially_paid");
    const secondIncome = {
      ...income,
      id: "income-2",
      amount: toKrw(20_000),
      externalTransactionId: "mock-2",
    };
    const paid = allocateReceivable({
      state: { ...partial, transactions: [...partial.transactions, secondIncome] },
      receivableId: receivable.id,
      transactionId: secondIncome.id,
      amount: toKrw(20_000),
      allocationId: "allocation-2",
      now,
    });
    expect(paid.receivables[0]?.status).toBe("paid");
    expect(() =>
      allocateReceivable({
        state: { ...partial, transactions: [...partial.transactions, secondIncome] },
        receivableId: receivable.id,
        transactionId: secondIncome.id,
        amount: toKrw(30_000),
        allocationId: "bad",
        now,
      }),
    ).toThrow(/받을 금액/);
  });

  it("records two transfer legs without changing income, spending, or net worth", () => {
    const second = { ...account, id: "account-2", currentBalance: toKrw(500_000) };
    const transfer = createInternalTransfer({
      idPrefix: "transfer-1",
      ownerId: "owner-1",
      fromAccountId: account.id,
      toAccountId: second.id,
      amount: toKrw(100_000),
      occurredAt: now,
      now,
    });
    expect(
      calculateMoneyOverview({
        accounts: [account, second],
        transactions: [...transfer],
        month: "2026-09",
      }),
    ).toEqual({
      totalBalance: toKrw(1_500_000),
      monthlyInflow: toKrw(0),
      monthlyOutflow: toKrw(0),
      cashChange: toKrw(0),
    });
  });

  it("previews CSV safely and marks replayed fingerprints as duplicates", () => {
    const csv =
      "occurred_at,direction,amount,counterparty,descriptor\n2026-09-02T10:00:00+09:00,inflow,60000,=cmd,과외비";
    const first = previewTransactionCsv(csv, new Set());
    expect(first[0]).toMatchObject({ duplicate: false, counterparty: "'=cmd" });
    expect(previewTransactionCsv(csv, new Set([first[0]!.fingerprint]))[0]?.duplicate).toBe(true);
    expect(sanitizeSpreadsheetCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
  });

  it("keeps production providers credential-gated behind the adapter", () => {
    expect(bankProvider("manual_csv").kind).toBe("manual_csv");
    expect(() => bankProvider("kftc_production").import("", new Set())).toThrow(/자격증명/);
  });

  it("suggests evidence but does not allocate before confirmation", () => {
    const suggestions = suggestReceivableMatches({
      state,
      studentNames: { "student-1": "김민준" },
      payerAliases: { "student-1": ["김민준 어머니"] },
      lessonStarts: { "lesson-1": now },
    });
    expect(suggestions[0]).toMatchObject({
      confidence: 1,
      status: "suggested",
      evidence: { amount: "남은 금액과 일치", alias: "입금자 별칭과 일치" },
    });
    expect(state.allocations).toHaveLength(0);
  });
});
