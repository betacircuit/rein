import type { Krw } from "@/domain/money/krw";

export interface LessonRecord {
  entity: "lesson";
  id: string;
  amount: Krw;
  status: "scheduled" | "completed" | "cancelled";
}

export interface ReceivableRecord {
  entity: "receivable";
  id: string;
  lessonId: string;
  amountDue: Krw;
  status: "open" | "partially_paid" | "paid" | "void";
}

export interface SubscriptionOccurrenceRecord {
  entity: "subscription_occurrence";
  id: string;
  subscriptionId: string;
  expectedAmount: Krw;
  transactionId: string | null;
}

export interface FinancialTransactionRecord {
  entity: "financial_transaction";
  id: string;
  amount: Krw;
  kind: "income" | "expense" | "transfer";
}

export interface SharedExpenseRecord {
  entity: "shared_expense";
  id: string;
  totalAmount: Krw;
  transactionId: string | null;
}

export type OperationalRecord =
  | LessonRecord
  | ReceivableRecord
  | SubscriptionOccurrenceRecord
  | FinancialTransactionRecord
  | SharedExpenseRecord;

export function indexSeparatedRecords(records: readonly OperationalRecord[]) {
  const index = new Map<string, OperationalRecord>();
  for (const record of records) {
    const key = `${record.entity}:${record.id}`;
    if (index.has(key)) throw new Error(`중복 도메인 레코드: ${key}`);
    index.set(key, record);
  }
  return index;
}
