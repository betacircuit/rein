import { describe, expect, it } from "vitest";

import { toKrw } from "@/domain/money/krw";
import {
  allocateBasisPointSplits,
  changeSubscriptionPrice,
  confirmSubscriptionMatch,
  materializeSubscriptionOccurrences,
  nextSubscriptionDate,
  resetSubscriptionForecast,
  subscriptionDashboard,
  suggestSubscriptionMatches,
  transitionSubscriptionStatus,
  unpaidSubscriptionObligation,
  type Subscription,
  type SubscriptionState,
} from "@/domain/subscriptions/model";

const now = "2026-09-02T03:00:00.000Z";
const subscription: Subscription = {
  id: "subscription-1",
  ownerId: "owner-1",
  householdId: null,
  scope: "private",
  payerMemberId: null,
  paymentAccountId: "account-1",
  name: "Study Cloud",
  providerName: "Study Cloud",
  planName: "Plus",
  category: "education",
  status: "active",
  decision: "keep",
  decisionNote: null,
  decisionUpdatedAt: null,
  amount: toKrw(12_000),
  currency: "KRW",
  billingCycle: "monthly",
  customCycleDays: null,
  startedOn: "2024-01-31",
  billingAnchorOn: "2024-01-31",
  nextBillingOn: "2026-09-30",
  trialEndsOn: null,
  cancelByOn: null,
  autoRenews: true,
  descriptorAliases: ["STUDY CLOUD"],
  reminderDaysBefore: [7, 1],
  serviceUrl: null,
  notes: null,
  lastUsedOn: null,
  cancelledAt: null,
  endedAt: null,
  createdAt: now,
  updatedAt: now,
};

function state(item: Subscription = subscription): SubscriptionState {
  return {
    userId: "owner-1",
    householdId: "household-1",
    members: [
      { id: "member-owner", name: "최재원", isCurrentUser: true },
      { id: "member-roommate", name: "룸메이트", isCurrentUser: false },
    ],
    subscriptions: [item],
    splits: [],
    priceHistory: [
      {
        id: "price-1",
        subscriptionId: item.id,
        effectiveOn: item.startedOn,
        amount: item.amount,
        currency: "KRW",
        note: "시작 가격",
        createdAt: now,
      },
    ],
    occurrences: [],
    suggestions: [],
    sharedExpenses: [],
  };
}

describe("Phase 04 subscription domain", () => {
  it("keeps month-end and leap-year anchors across boundaries", () => {
    expect(nextSubscriptionDate(subscription, "2027-01-31")).toBe("2027-02-28");
    expect(nextSubscriptionDate(subscription, "2027-02-28")).toBe("2027-03-31");
    const yearly = {
      ...subscription,
      billingCycle: "yearly" as const,
      billingAnchorOn: "2024-02-29",
    };
    expect(nextSubscriptionDate(yearly, "2027-02-28")).toBe("2028-02-29");
  });

  it("materializes bounded occurrences idempotently and stops after cancellation", () => {
    const cancelled = {
      ...subscription,
      status: "cancelled" as const,
      cancelledAt: "2026-10-15T00:00:00+09:00",
    };
    const once = materializeSubscriptionOccurrences({
      state: state(cancelled),
      subscriptionId: cancelled.id,
      horizonUntil: "2027-01-31",
      today: "2026-09-02",
      now,
    });
    const twice = materializeSubscriptionOccurrences({
      state: once,
      subscriptionId: cancelled.id,
      horizonUntil: "2027-01-31",
      today: "2026-09-02",
      now,
    });
    expect(once.occurrences.map((item) => item.dueOn)).toEqual(["2026-09-30"]);
    expect(twice.occurrences).toHaveLength(1);
  });

  it("retains price history and changes only future unpaid occurrences", () => {
    const generated = materializeSubscriptionOccurrences({
      state: state(),
      subscriptionId: subscription.id,
      horizonUntil: "2026-11-30",
      today: "2026-09-02",
      now,
    });
    generated.occurrences[0] = {
      ...generated.occurrences[0]!,
      status: "paid",
      matchedTransactionId: "transaction-old",
      paidAt: now,
    };
    const changed = changeSubscriptionPrice({
      state: generated,
      subscriptionId: subscription.id,
      amount: toKrw(15_000),
      effectiveOn: "2026-10-01",
      note: "가격 인상",
      historyId: "price-2",
      now,
    });
    expect(changed.priceHistory).toHaveLength(2);
    expect(changed.occurrences.map((item) => item.expectedAmount)).toEqual([
      12_000n,
      15_000n,
      15_000n,
    ]);
  });

  it("allocates every KRW for equal, one-person, and custom household splits", () => {
    expect(
      allocateBasisPointSplits(toKrw(30_001), [
        { subscriptionId: "s", memberId: "a", shareBasisPoints: 5_000 },
        { subscriptionId: "s", memberId: "b", shareBasisPoints: 5_000 },
      ]),
    ).toEqual([
      { memberId: "a", amount: 15_001n },
      { memberId: "b", amount: 15_000n },
    ]);
    expect(
      allocateBasisPointSplits(toKrw(30_001), [
        { subscriptionId: "s", memberId: "a", shareBasisPoints: 10_000 },
        { subscriptionId: "s", memberId: "b", shareBasisPoints: 0 },
      ]).map((item) => item.amount),
    ).toEqual([30_001n, 0n]);
    expect(
      allocateBasisPointSplits(toKrw(10_000), [
        { subscriptionId: "s", memberId: "a", shareBasisPoints: 3_333 },
        { subscriptionId: "s", memberId: "b", shareBasisPoints: 6_667 },
      ]).reduce((sum, item) => sum + item.amount, 0n),
    ).toBe(10_000n);
  });

  it("keeps suggestions inert until confirmation and creates no duplicate expense row", () => {
    const generated = materializeSubscriptionOccurrences({
      state: state(),
      subscriptionId: subscription.id,
      horizonUntil: "2026-09-30",
      today: "2026-09-02",
      now,
    });
    const transaction = {
      id: "transaction-1",
      ownerId: "owner-1",
      accountId: "account-1",
      kind: "expense" as const,
      direction: "outflow" as const,
      amount: toKrw(12_000),
      occurredAt: "2026-09-30T10:00:00+09:00",
      counterparty: "STUDY CLOUD",
      descriptor: "MONTHLY",
    };
    const suggestions = suggestSubscriptionMatches({
      state: generated,
      transactions: [transaction],
    });
    expect(suggestions[0]?.evidence).toEqual({
      amount: "예상 금액과 일치",
      descriptor: "거래명 패턴과 일치",
      account: "예상 결제 계좌와 일치",
      timing: "예정일과 0일 차이",
    });
    expect(generated.occurrences[0]?.matchedTransactionId).toBeNull();
    const confirmed = confirmSubscriptionMatch({
      state: { ...generated, suggestions },
      suggestionId: suggestions[0]!.id,
      transaction,
      now,
    });
    expect(confirmed.occurrences[0]?.status).toBe("paid");
    expect(confirmed.occurrences[0]?.matchedTransactionId).toBe(transaction.id);
  });

  it("ignores matching-looking transactions outside the seven-day window", () => {
    const generated = materializeSubscriptionOccurrences({
      state: state(),
      subscriptionId: subscription.id,
      horizonUntil: "2026-09-30",
      today: "2026-09-02",
      now,
    });
    const suggestions = suggestSubscriptionMatches({
      state: generated,
      transactions: [
        {
          id: "transaction-too-early",
          ownerId: "owner-1",
          accountId: "account-1",
          kind: "expense",
          direction: "outflow",
          amount: toKrw(12_000),
          occurredAt: "2026-09-01T10:00:00+09:00",
          counterparty: "Study Cloud",
          descriptor: "MONTHLY",
        },
      ],
    });
    expect(suggestions).toHaveLength(0);
  });

  it("creates exactly one shared expense with exact responsibility splits", () => {
    const household = {
      ...subscription,
      id: "household-subscription",
      scope: "household" as const,
      householdId: "household-1",
      payerMemberId: "member-owner",
      amount: toKrw(30_001),
    };
    let generated = materializeSubscriptionOccurrences({
      state: {
        ...state(household),
        splits: [
          { subscriptionId: household.id, memberId: "member-owner", shareBasisPoints: 5_000 },
          { subscriptionId: household.id, memberId: "member-roommate", shareBasisPoints: 5_000 },
        ],
      },
      subscriptionId: household.id,
      horizonUntil: "2026-09-30",
      today: "2026-09-02",
      now,
    });
    const transaction = {
      id: "transaction-household",
      ownerId: "owner-1",
      accountId: "account-1",
      kind: "expense" as const,
      direction: "outflow" as const,
      amount: toKrw(30_001),
      occurredAt: "2026-09-30T10:00:00+09:00",
      counterparty: "Study Cloud",
      descriptor: null,
    };
    const suggestions = suggestSubscriptionMatches({
      state: generated,
      transactions: [transaction],
    });
    generated = { ...generated, suggestions };
    const confirmed = confirmSubscriptionMatch({
      state: generated,
      suggestionId: suggestions[0]!.id,
      transaction,
      now,
    });
    expect(confirmed.sharedExpenses).toHaveLength(1);
    expect(confirmed.sharedExpenses[0]?.splits.reduce((sum, item) => sum + item.amount, 0n)).toBe(
      30_001n,
    );
    expect(() =>
      confirmSubscriptionMatch({
        state: confirmed,
        suggestionId: suggestions[0]!.id,
        transaction,
        now,
      }),
    ).toThrow(/제안/);
  });

  it("reconciles 7-day, 30-day, trial, unmatched, overdue, and paid obligations", () => {
    const trial = {
      ...subscription,
      status: "trial" as const,
      trialEndsOn: "2026-09-08",
      nextBillingOn: "2026-09-05",
    };
    const generated = materializeSubscriptionOccurrences({
      state: state(trial),
      subscriptionId: trial.id,
      horizonUntil: "2026-10-05",
      today: "2026-09-02",
      now,
    });
    generated.occurrences.push({
      ...generated.occurrences[0]!,
      id: "overdue",
      dueOn: "2026-08-30",
      status: "unmatched",
    });
    const dashboard = subscriptionDashboard(generated, "2026-09-02");
    expect(dashboard.due7).toHaveLength(1);
    expect(dashboard.due30).toHaveLength(1);
    expect(dashboard.trials).toHaveLength(1);
    expect(dashboard.unmatched).toHaveLength(1);
    expect(dashboard.overdue).toHaveLength(1);
    expect(unpaidSubscriptionObligation(generated, "2026-09-01", "2026-09-30")).toBe(12_000n);
    generated.occurrences[0] = {
      ...generated.occurrences[0]!,
      status: "paid",
      matchedTransactionId: "transaction-paid",
    };
    expect(unpaidSubscriptionObligation(generated, "2026-09-01", "2026-09-30")).toBe(0n);
  });

  it("stops future forecast on cancellation while preserving historical occurrences", () => {
    const base = state();
    const generated = materializeSubscriptionOccurrences({
      state: base,
      subscriptionId: base.subscriptions[0]!.id,
      horizonUntil: "2026-11-30",
      today: "2026-09-02",
      now,
    });
    const cancelled = transitionSubscriptionStatus({
      state: generated,
      subscriptionId: base.subscriptions[0]!.id,
      status: "cancelled",
      now: "2026-10-15T03:00:00.000Z",
    });

    expect(cancelled.occurrences.find((item) => item.dueOn === "2026-09-30")?.status).toBe(
      "scheduled",
    );
    expect(cancelled.occurrences.find((item) => item.dueOn === "2026-10-31")?.status).toBe(
      "skipped",
    );
    expect(() =>
      transitionSubscriptionStatus({
        state: cancelled,
        subscriptionId: base.subscriptions[0]!.id,
        status: "active",
        now,
      }),
    ).toThrow("다시 활성화");
  });

  it("replaces only mutable future forecast when billing settings change", () => {
    const base = state();
    const generated = materializeSubscriptionOccurrences({
      state: base,
      subscriptionId: base.subscriptions[0]!.id,
      horizonUntil: "2026-11-30",
      today: "2026-09-02",
      now,
    });
    generated.occurrences.push({
      ...generated.occurrences[0]!,
      id: "paid-history",
      status: "paid",
      matchedTransactionId: "transaction-history",
      paidAt: now,
    });
    const reset = resetSubscriptionForecast({
      state: generated,
      subscriptionId: base.subscriptions[0]!.id,
      from: "2026-09-02",
    });

    expect(reset.occurrences).toHaveLength(1);
    expect(reset.occurrences[0]?.id).toBe("paid-history");
  });
});
