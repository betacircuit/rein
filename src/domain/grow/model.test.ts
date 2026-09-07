import { describe, expect, it } from "vitest";

import {
  calculateAssetSummary,
  calculateAvailableSurplus,
  calculatePlannedContribution,
  contributionStatus,
  recordContribution,
  unpaidPlanningObligations,
  type GrowState,
} from "@/domain/grow/model";
import { toKrw } from "@/domain/money/krw";
import type { Account } from "@/domain/money/ledger";
import type { SubscriptionState } from "@/domain/subscriptions/model";

const growState: GrowState = {
  userId: "owner",
  plan: {
    id: "plan",
    ownerId: "owner",
    reserveAccountId: "reserve",
    contributionAccountId: "invest",
    safetyReserveTarget: toKrw(500_000),
    rule: { type: "percentage", valueBasisPoints: 2_500n, cap: toKrw(100_000) },
    isActive: true,
    updatedAt: "2026-09-03T00:00:00Z",
  },
  contributions: [],
  dismissedInsightIds: [],
};

describe("Phase 07 Grow", () => {
  it("GROW-005 to GROW-008 documents every available-surplus term without unpaid work", () => {
    const result = calculateAvailableSurplus({
      settledCashInflows: toKrw(600_000),
      confirmedReimbursements: toKrw(200_000),
      actualCashOutflows: toKrw(712_000),
      personalExpenses: toKrw(12_000),
      householdResponsibility: toKrw(390_000),
      unpaidSubscriptionObligations: toKrw(8_900),
      safetyReserveTarget: toKrw(500_000),
      currentSafetyReserve: toKrw(450_000),
    });
    expect(result.actualCashRemaining).toBe(88_000n);
    expect(result.safetyReserveTopUp).toBe(50_000n);
    expect(result.actualAvailableSurplus).toBe(339_100n);
  });

  it("GROW-011 produces deterministic integer-KRW fixed and percentage plans with caps", () => {
    expect(
      calculatePlannedContribution(toKrw(333_333), {
        type: "percentage",
        valueBasisPoints: 3_333n,
        cap: toKrw(200_000),
      }),
    ).toBe(111_099n);
    expect(
      calculatePlannedContribution(toKrw(80_000), {
        type: "fixed",
        value: toKrw(100_000),
        cap: toKrw(90_000),
      }),
    ).toBe(80_000n);
  });

  it("GROW-003 and GROW-004 track partial transfer completion idempotently", () => {
    const once = recordContribution({
      state: growState,
      contributionId: "c1",
      month: "2026-09",
      plannedAmount: toKrw(100_000),
      transferGroupId: "transfer-1",
      amount: toKrw(40_000),
      now: "2026-09-03T00:00:00Z",
    });
    expect(once.contributions[0]?.status).toBe("partially_completed");
    expect(
      recordContribution({
        state: once,
        contributionId: "ignored",
        month: "2026-09",
        plannedAmount: toKrw(100_000),
        transferGroupId: "transfer-1",
        amount: toKrw(40_000),
        now: "2026-09-03T00:00:00Z",
      }),
    ).toEqual(once);
    expect(contributionStatus(toKrw(100_000), toKrw(100_000))).toBe("completed");
  });

  it("MON-017 reconciles cash and investment while transfer composition leaves total unchanged", () => {
    const account = (
      id: string,
      accountType: Account["accountType"],
      balance: number,
    ): Account => ({
      id,
      ownerId: "owner",
      institutionName: "mock",
      nickname: id,
      accountType,
      maskedAccountNumber: null,
      provider: "mock",
      currency: "KRW",
      currentBalance: toKrw(balance),
      availableBalance: null,
      balanceAsOf: "2026-09-03T00:00:00Z",
      lastSyncSuccessAt: null,
      includedInTotals: accountType !== "investment",
      isActive: true,
    });
    const before = calculateAssetSummary([
      account("cash", "checking", 1_000_000),
      account("invest", "investment", 500_000),
    ]);
    const after = calculateAssetSummary([
      account("cash", "checking", 900_000),
      account("invest", "investment", 600_000),
    ]);
    expect(before.totalAssets).toBe(1_500_000n);
    expect(after.totalAssets).toBe(before.totalAssets);
  });

  it("SUB-018 subtracts only unpaid active obligations and only the user's household split", () => {
    const state = {
      subscriptions: [
        { id: "private", status: "active", scope: "private" },
        { id: "shared", status: "active", scope: "household" },
        { id: "cancelled", status: "cancelled", scope: "private" },
      ],
      occurrences: [
        {
          subscriptionId: "private",
          dueOn: "2026-09-10",
          status: "scheduled",
          matchedTransactionId: null,
          expectedAmount: 10_000n,
        },
        {
          subscriptionId: "private",
          dueOn: "2026-09-11",
          status: "paid",
          matchedTransactionId: "tx",
          expectedAmount: 10_000n,
        },
        {
          subscriptionId: "private",
          dueOn: "2026-09-14",
          status: "skipped",
          matchedTransactionId: null,
          expectedAmount: 10_000n,
        },
        {
          subscriptionId: "private",
          dueOn: "2026-09-15",
          status: "scheduled",
          matchedTransactionId: "tx-confirmed",
          expectedAmount: 10_000n,
        },
        {
          subscriptionId: "shared",
          dueOn: "2026-09-12",
          status: "unmatched",
          matchedTransactionId: null,
          expectedAmount: 30_001n,
        },
        {
          subscriptionId: "cancelled",
          dueOn: "2026-09-13",
          status: "scheduled",
          matchedTransactionId: null,
          expectedAmount: 99_000n,
        },
      ],
      splits: [{ subscriptionId: "shared", memberId: "me", shareBasisPoints: 5_000 }],
    } as unknown as SubscriptionState;
    expect(unpaidPlanningObligations(state, "2026-09-01", "2026-09-30", "me")).toBe(25_000n);
  });
});
