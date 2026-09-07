import { describe, expect, it } from "vitest";

import {
  allocateLargestRemainder,
  allocateSettlementPayment,
  calculateCurrentSettlement,
  calculateHouseholdMoneyProjection,
  calculateMemberCredits,
  classifyTransactionAsSharedExpense,
  createExpenseSplits,
  parsePercentToBasisPoints,
  saveSharedExpense,
  sharedExpenseCategories,
  suggestSettlementMatches,
  type HouseholdMoneyState,
  type MatchableHouseholdTransaction,
  type SharedExpense,
} from "@/domain/household/shared-money";
import { toKrw } from "@/domain/money/krw";

const now = "2026-09-03T12:00:00+09:00";

function expense(
  overrides: Partial<SharedExpense> & Pick<SharedExpense, "id" | "payerMemberId" | "amount">,
): SharedExpense {
  return {
    householdId: "household-1",
    createdByMemberId: "member-user",
    sourceKind: "manual",
    sourceSubscriptionOccurrenceId: null,
    linkedTransactionId: null,
    category: "rent",
    kind: "charge",
    description: "9월 월세",
    incurredOn: "2026-09-01",
    dueOn: null,
    status: "confirmed",
    notes: null,
    splits: [
      { memberId: "member-user", amount: toKrw(overrides.amount / 2n) },
      { memberId: "member-roommate", amount: toKrw(overrides.amount - overrides.amount / 2n) },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function state(expenses: SharedExpense[] = []): HouseholdMoneyState {
  return {
    userId: "user-owner",
    householdId: "household-1",
    currentMemberId: "member-user",
    members: [
      {
        id: "member-user",
        userId: "user-owner",
        displayName: "재원",
        isCurrentUser: true,
        status: "active",
      },
      {
        id: "member-roommate",
        userId: "user-roommate",
        displayName: "민수",
        isCurrentUser: false,
        status: "active",
      },
    ],
    expenses,
    settlements: [],
    settlementAllocations: [],
  };
}

const deposit: MatchableHouseholdTransaction = {
  id: "transaction-settlement",
  ownerId: "user-owner",
  amount: toKrw(200_000),
  direction: "inflow",
  kind: "income",
  occurredAt: "2026-09-03T10:00:00+09:00",
  counterparty: "민수",
  descriptor: "월세 정산",
  scope: "private",
  householdId: null,
};

describe("Phase 06 shared household money", () => {
  it("HOM-013 exposes every agreed shared expense category", () => {
    expect(sharedExpenseCategories).toEqual([
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
    ]);
  });

  it("HOM-015 largest remainder assigns every KRW with stable member ordering", () => {
    expect(
      allocateLargestRemainder(toKrw(30_001), [
        { memberId: "member-b", weight: 5_000n },
        { memberId: "member-a", weight: 5_000n },
      ]),
    ).toEqual([
      { memberId: "member-a", amount: toKrw(15_001) },
      { memberId: "member-b", amount: toKrw(15_000) },
    ]);
  });

  it("HOM-015 supports equal, either-member-all, exact amount, and exact percent presets", () => {
    const common = {
      total: toKrw(30_001),
      currentMemberId: "member-user",
      roommateMemberId: "member-roommate",
    };
    expect(
      createExpenseSplits({ ...common, preset: "equal" }).reduce((s, x) => s + x.amount, 0n),
    ).toBe(30_001n);
    expect(createExpenseSplits({ ...common, preset: "current_user_all" })).toContainEqual({
      memberId: "member-user",
      amount: 30_001n,
    });
    expect(createExpenseSplits({ ...common, preset: "roommate_all" })).toContainEqual({
      memberId: "member-roommate",
      amount: 30_001n,
    });
    expect(
      createExpenseSplits({
        ...common,
        preset: "custom_amounts",
        currentAmount: toKrw(10_001),
        roommateAmount: toKrw(20_000),
      }),
    ).toContainEqual({ memberId: "member-user", amount: 10_001n });
    expect(
      createExpenseSplits({
        ...common,
        preset: "custom_percentages",
        currentPercentBasisPoints: parsePercentToBasisPoints("33.33"),
        roommatePercentBasisPoints: parsePercentToBasisPoints("66.67"),
      }).reduce((s, x) => s + x.amount, 0n),
    ).toBe(30_001n);
  });

  it("HOM-014 rejects a split that does not allocate the exact expense total", () => {
    const rent = expense({ id: "rent", payerMemberId: "member-user", amount: toKrw(700_000) });
    rent.splits[0] = { memberId: "member-user", amount: toKrw(349_999) };
    expect(() =>
      saveSharedExpense({ state: state(), expense: rent, actorMemberId: "member-user" }),
    ).toThrow("총액");
  });

  it("HOM-014 keeps settled and void shared-expense history immutable", () => {
    for (const status of ["settled", "void"] as const) {
      const historical = expense({
        id: `history-${status}`,
        status,
        payerMemberId: "member-user",
        amount: toKrw(10_000),
      });
      const household = state([historical]);
      expect(() =>
        saveSharedExpense({
          state: household,
          expense: { ...historical, description: "rewritten" },
          actorMemberId: "member-user",
        }),
      ).toThrow("수정할 수 없어요");
    }
  });

  it("MON-016 keeps 100% cash payer separate from the user's 50% burden", () => {
    const rent = expense({ id: "rent", payerMemberId: "member-user", amount: toKrw(700_000) });
    const household = state([rent]);
    expect(calculateMemberCredits(household).get("member-user")).toBe(350_000n);
    expect(calculateCurrentSettlement(household)).toEqual({
      fromMemberId: "member-roommate",
      toMemberId: "member-user",
      amount: toKrw(350_000),
    });
  });

  it("HOM-016 nets payer reversals and refunds without rewriting expense history", () => {
    const rent = expense({ id: "rent", payerMemberId: "member-user", amount: toKrw(700_000) });
    const electricity = expense({
      id: "electricity",
      payerMemberId: "member-roommate",
      amount: toKrw(100_000),
      category: "electricity",
      splits: [
        { memberId: "member-user", amount: toKrw(50_000) },
        { memberId: "member-roommate", amount: toKrw(50_000) },
      ],
    });
    const refund = expense({
      id: "electricity-refund",
      payerMemberId: "member-roommate",
      amount: toKrw(20_000),
      category: "electricity",
      kind: "refund",
      splits: [
        { memberId: "member-user", amount: toKrw(10_000) },
        { memberId: "member-roommate", amount: toKrw(10_000) },
      ],
    });
    const household = state([rent, electricity, refund]);
    expect(calculateCurrentSettlement(household)?.amount).toBe(310_000n);
    expect(household.expenses).toHaveLength(3);
  });

  it("HOM-017 suggests and confirms a partial roommate deposit with traceability", () => {
    const rent = expense({ id: "rent", payerMemberId: "member-user", amount: toKrw(700_000) });
    const household: HouseholdMoneyState = {
      ...state([rent]),
      settlements: [
        {
          id: "settlement-september",
          householdId: "household-1",
          fromMemberId: "member-roommate",
          toMemberId: "member-user",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          amountDue: toKrw(350_000),
          status: "open",
          dueOn: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    expect(
      suggestSettlementMatches({ state: household, transactions: [deposit] })[0],
    ).toMatchObject({
      transactionId: deposit.id,
      suggestedAmount: 200_000n,
    });
    const paid = allocateSettlementPayment({
      state: household,
      settlementId: "settlement-september",
      transaction: deposit,
      amount: toKrw(200_000),
      allocationId: "allocation-1",
      actorMemberId: "member-user",
      now,
    });
    expect(paid.settlements[0]?.status).toBe("partially_paid");
    expect(calculateCurrentSettlement(paid)?.amount).toBe(150_000n);
    expect(paid.expenses).toEqual(household.expenses);
    expect(paid.settlementAllocations[0]?.transactionId).toBe(deposit.id);
  });

  it("HOM-019 keeps classification inert until confirmation creates one linked expense", () => {
    const charge: MatchableHouseholdTransaction = {
      ...deposit,
      id: "transaction-market",
      amount: toKrw(12_001),
      direction: "outflow",
      kind: "expense",
      counterparty: "동네 마트",
    };
    const before = state();
    expect(before.expenses).toHaveLength(0);
    const after = classifyTransactionAsSharedExpense({
      state: before,
      transaction: charge,
      classification: "household_shopping",
      expenseId: "expense-market",
      actorMemberId: "member-user",
      incurredOn: "2026-09-03",
      now,
    });
    expect(after.expenses).toHaveLength(1);
    expect(after.expenses[0]).toMatchObject({
      category: "household_goods",
      linkedTransactionId: charge.id,
      amount: 12_001n,
    });
    expect(after.expenses[0]!.splits.reduce((sum, split) => sum + split.amount, 0n)).toBe(12_001n);
    expect(
      classifyTransactionAsSharedExpense({
        state: after,
        transaction: charge,
        classification: "household_shopping",
        expenseId: "duplicate",
        actorMemberId: "member-user",
        incurredOn: "2026-09-03",
        now,
      }).expenses,
    ).toHaveLength(1);
  });

  it("HOM-018 replaces linked household cash with responsibility once and reconciles reimbursement", () => {
    const rent = expense({
      id: "rent",
      payerMemberId: "member-user",
      amount: toKrw(700_000),
      linkedTransactionId: "transaction-rent",
      sourceKind: "transaction",
    });
    const household: HouseholdMoneyState = {
      ...state([rent]),
      settlements: [
        {
          id: "settlement-september",
          householdId: "household-1",
          fromMemberId: "member-roommate",
          toMemberId: "member-user",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          amountDue: toKrw(350_000),
          status: "partially_paid",
          dueOn: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      settlementAllocations: [
        {
          id: "allocation-1",
          settlementId: "settlement-september",
          ownerUserId: "user-owner",
          transactionId: deposit.id,
          amount: toKrw(200_000),
          createdByMemberId: "member-user",
          createdAt: now,
        },
      ],
    };
    const projection = calculateHouseholdMoneyProjection({
      state: household,
      month: "2026-09",
      transactions: [
        {
          ...deposit,
          id: "transaction-rent",
          direction: "outflow",
          kind: "expense",
          amount: toKrw(700_000),
        },
        deposit,
        {
          ...deposit,
          id: "transaction-tutoring",
          amount: toKrw(600_000),
          counterparty: "학생 보호자",
        },
        {
          ...deposit,
          id: "transaction-food",
          direction: "outflow",
          kind: "expense",
          amount: toKrw(10_000),
        },
      ],
    });
    expect(projection.actualCashOutflow).toBe(710_000n);
    expect(projection.personalExpense).toBe(10_000n);
    expect(projection.householdResponsibility).toBe(350_000n);
    expect(projection.responsibilityAdjustedExpense).toBe(360_000n);
    expect(projection.settledIncomeExcludingReimbursements).toBe(600_000n);
    expect(projection.confirmedReimbursements).toBe(200_000n);
    expect(projection.householdAdjustedRemainder).toBe(440_000n);
  });
});
