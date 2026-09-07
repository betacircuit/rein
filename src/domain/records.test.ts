import { describe, expect, it } from "vitest";

import { toKrw } from "@/domain/money/krw";
import { indexSeparatedRecords, type OperationalRecord } from "@/domain/records";

describe("CORE-003 CORE-004 source record separation", () => {
  it("keeps lesson, receivable, obligation, transaction, and shared expense as distinct records", () => {
    const records: OperationalRecord[] = [
      { entity: "lesson", id: "same-id", amount: toKrw(60_000), status: "completed" },
      {
        entity: "receivable",
        id: "same-id",
        lessonId: "same-id",
        amountDue: toKrw(60_000),
        status: "open",
      },
      {
        entity: "subscription_occurrence",
        id: "occurrence-1",
        subscriptionId: "subscription-1",
        expectedAmount: toKrw(12_000),
        transactionId: null,
      },
      {
        entity: "financial_transaction",
        id: "transaction-1",
        amount: toKrw(60_000),
        kind: "income",
      },
      {
        entity: "shared_expense",
        id: "expense-1",
        totalAmount: toKrw(30_000),
        transactionId: null,
      },
    ];

    expect(indexSeparatedRecords(records).size).toBe(5);
  });
});
