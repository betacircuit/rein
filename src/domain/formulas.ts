import { roundRatioToKrw, toKrw, type Krw } from "@/domain/money/krw";

export type BillingCycle =
  "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly" | "custom_days";

export interface SubscriptionPrice {
  amount: Krw;
  cycle: BillingCycle;
  intervalDays?: number;
}

export function monthlyEquivalentKrw(input: SubscriptionPrice): Krw {
  switch (input.cycle) {
    case "weekly":
      return roundRatioToKrw(input.amount * 52n, 12n);
    case "monthly":
      return input.amount;
    case "quarterly":
      return roundRatioToKrw(input.amount, 3n);
    case "semiannual":
      return roundRatioToKrw(input.amount, 6n);
    case "yearly":
      return roundRatioToKrw(input.amount, 12n);
    case "custom_days": {
      if (!input.intervalDays || !Number.isInteger(input.intervalDays) || input.intervalDays <= 0) {
        throw new RangeError("사용자 지정 결제 주기는 1일 이상의 정수여야 합니다.");
      }
      return roundRatioToKrw(input.amount * 3_652_425n, 120_000n * BigInt(input.intervalDays));
    }
  }
}

export interface LedgerEntry {
  amount: Krw;
  direction: "inflow" | "outflow";
  kind: "income" | "expense" | "transfer";
}

export function calculateCashFlow(entries: readonly LedgerEntry[]) {
  let settledIncome = 0n;
  let expense = 0n;

  for (const entry of entries) {
    if (entry.kind === "transfer") continue;
    if (entry.kind === "income" && entry.direction === "inflow") settledIncome += entry.amount;
    if (entry.kind === "expense" && entry.direction === "outflow") expense += entry.amount;
  }

  return {
    settledIncome: toKrw(settledIncome),
    expense: toKrw(expense),
    cashRemaining: toKrw(settledIncome - expense),
  };
}

export interface SurplusInput {
  settledIncome: Krw;
  personalExpenseBurden: Krw;
  householdResponsibilityShare: Krw;
  unpaidConfirmedObligations: Krw;
  safetyReserveTopUp: Krw;
  confirmedReimbursements: Krw;
}

export function calculateActualAvailableSurplus(input: SurplusInput): Krw {
  return toKrw(
    input.settledIncome -
      input.personalExpenseBurden -
      input.householdResponsibilityShare -
      input.unpaidConfirmedObligations -
      input.safetyReserveTopUp +
      input.confirmedReimbursements,
  );
}

export interface SharedExpenseInput {
  totalAmount: Krw;
  payerMemberId: string;
  splits: Readonly<Record<string, Krw>>;
}

export function calculateHouseholdCredits(expenses: readonly SharedExpenseInput[]) {
  const credits = new Map<string, bigint>();

  for (const expense of expenses) {
    const splitTotal = Object.values(expense.splits).reduce<bigint>(
      (sum, amount) => sum + amount,
      0n,
    );
    if (splitTotal !== expense.totalAmount) {
      throw new RangeError("공동비 분담액의 합은 결제 총액과 같아야 합니다.");
    }

    credits.set(
      expense.payerMemberId,
      (credits.get(expense.payerMemberId) ?? 0n) + expense.totalAmount,
    );
    for (const [memberId, amount] of Object.entries(expense.splits)) {
      credits.set(memberId, (credits.get(memberId) ?? 0n) - amount);
    }
  }

  return new Map([...credits].map(([memberId, amount]) => [memberId, toKrw(amount)]));
}
