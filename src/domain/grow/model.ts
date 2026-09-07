import { toKrw, type Krw } from "@/domain/money/krw";
import type { Account, FinancialTransaction } from "@/domain/money/ledger";
import type { SubscriptionState } from "@/domain/subscriptions/model";

export type ContributionRule =
  | { type: "fixed"; value: Krw; cap: Krw }
  | { type: "percentage"; valueBasisPoints: bigint; cap: Krw };

export type GrowPlan = {
  id: string;
  ownerId: string;
  reserveAccountId: string;
  contributionAccountId: string;
  safetyReserveTarget: Krw;
  rule: ContributionRule;
  isActive: boolean;
  updatedAt: string;
};

export type InvestmentContribution = {
  id: string;
  ownerId: string;
  planId: string;
  month: string;
  plannedAmount: Krw;
  completedAmount: Krw;
  status: "pending" | "partially_completed" | "completed" | "skipped" | "cancelled";
  transferGroupIds: string[];
  updatedAt: string;
};

export type GrowState = {
  userId: string;
  plan: GrowPlan;
  contributions: InvestmentContribution[];
  dismissedInsightIds: string[];
};

export type AvailableSurplusInput = {
  settledCashInflows: Krw;
  confirmedReimbursements: Krw;
  actualCashOutflows: Krw;
  personalExpenses: Krw;
  householdResponsibility: Krw;
  unpaidSubscriptionObligations: Krw;
  safetyReserveTarget: Krw;
  currentSafetyReserve: Krw;
};

export function calculateAvailableSurplus(input: AvailableSurplusInput) {
  const safetyReserveTopUp = toKrw(
    input.safetyReserveTarget > input.currentSafetyReserve
      ? input.safetyReserveTarget - input.currentSafetyReserve
      : 0n,
  );
  return {
    ...input,
    safetyReserveTopUp,
    actualCashRemaining: toKrw(
      input.settledCashInflows + input.confirmedReimbursements - input.actualCashOutflows,
    ),
    actualAvailableSurplus: toKrw(
      input.settledCashInflows +
        input.confirmedReimbursements -
        input.personalExpenses -
        input.householdResponsibility -
        input.unpaidSubscriptionObligations -
        safetyReserveTopUp,
    ),
  };
}

export function calculatePlannedContribution(available: Krw, rule: ContributionRule) {
  const usable = available > 0n ? available : 0n;
  const raw = rule.type === "fixed" ? rule.value : (usable * rule.valueBasisPoints) / 10_000n;
  return toKrw(
    [usable, raw, rule.cap].reduce((smallest, value) => (value < smallest ? value : smallest)),
  );
}

export function contributionStatus(planned: Krw, completed: Krw): InvestmentContribution["status"] {
  if (completed <= 0n) return "pending";
  return completed >= planned ? "completed" : "partially_completed";
}

export function recordContribution(input: {
  state: GrowState;
  contributionId: string;
  month: string;
  plannedAmount: Krw;
  transferGroupId: string;
  amount: Krw;
  now: string;
}) {
  if (input.state.plan.ownerId !== input.state.userId)
    throw new Error("내 Grow 계획만 변경할 수 있어요.");
  if (input.amount <= 0n) throw new Error("기여 금액은 1원 이상이어야 해요.");
  const existing = input.state.contributions.find((item) => item.month === input.month);
  if (existing?.status === "skipped" || existing?.status === "cancelled") {
    throw new Error("건너뛰거나 취소한 월 기여는 다시 기록할 수 없어요.");
  }
  if (existing?.transferGroupIds.includes(input.transferGroupId)) return input.state;
  const completed = toKrw((existing?.completedAmount ?? 0n) + input.amount);
  if (completed > input.plannedAmount)
    throw new Error("완료 금액은 이번 달 계획을 넘을 수 없어요.");
  const next: InvestmentContribution = {
    id: existing?.id ?? input.contributionId,
    ownerId: input.state.userId,
    planId: input.state.plan.id,
    month: input.month,
    plannedAmount: input.plannedAmount,
    completedAmount: completed,
    status: contributionStatus(input.plannedAmount, completed),
    transferGroupIds: [...(existing?.transferGroupIds ?? []), input.transferGroupId],
    updatedAt: input.now,
  };
  return {
    ...input.state,
    contributions: existing
      ? input.state.contributions.map((item) => (item.id === existing.id ? next : item))
      : [...input.state.contributions, next],
  };
}

export function setContributionTerminalStatus(input: {
  state: GrowState;
  month: string;
  status: "skipped" | "cancelled";
  plannedAmount: Krw;
  now: string;
}) {
  const existing = input.state.contributions.find((item) => item.month === input.month);
  if (existing && existing.completedAmount > 0n)
    throw new Error("이미 일부 완료한 기여는 건너뛰거나 취소할 수 없어요.");
  const next: InvestmentContribution = {
    id: existing?.id ?? `contribution-${input.month}`,
    ownerId: input.state.userId,
    planId: input.state.plan.id,
    month: input.month,
    plannedAmount: input.plannedAmount,
    completedAmount: toKrw(0),
    status: input.status,
    transferGroupIds: [],
    updatedAt: input.now,
  };
  return {
    ...input.state,
    contributions: existing
      ? input.state.contributions.map((item) => (item.id === existing.id ? next : item))
      : [...input.state.contributions, next],
  };
}

export function calculateAssetSummary(accounts: readonly Account[]) {
  const active = accounts.filter((account) => account.isActive);
  const cashAssets = active
    .filter((account) => account.accountType !== "investment" && account.includedInTotals)
    .reduce((sum, account) => sum + account.currentBalance, 0n);
  const longTermInvestmentValue = active
    .filter((account) => account.accountType === "investment")
    .reduce((sum, account) => sum + account.currentBalance, 0n);
  return {
    cashAssets: toKrw(cashAssets),
    longTermInvestmentValue: toKrw(longTermInvestmentValue),
    totalAssets: toKrw(cashAssets + longTermInvestmentValue),
    asOf:
      active
        .map((item) => item.balanceAsOf)
        .filter(Boolean)
        .sort()
        .at(0) ?? null,
  };
}

export function unpaidPlanningObligations(
  state: SubscriptionState,
  from: string,
  until: string,
  currentMemberId: string,
) {
  const bySubscription = new Map(state.subscriptions.map((item) => [item.id, item]));
  return toKrw(
    state.occurrences
      .filter(
        (item) =>
          item.dueOn >= from &&
          item.dueOn <= until &&
          (item.status === "scheduled" || item.status === "unmatched") &&
          item.matchedTransactionId === null,
      )
      .reduce((sum, occurrence) => {
        const subscription = bySubscription.get(occurrence.subscriptionId);
        if (!subscription || !["active", "trial"].includes(subscription.status)) return sum;
        if (subscription.scope === "private") return sum + occurrence.expectedAmount;
        const basisPoints = state.splits.find(
          (split) => split.subscriptionId === subscription.id && split.memberId === currentMemberId,
        )?.shareBasisPoints;
        return sum + (occurrence.expectedAmount * BigInt(basisPoints ?? 0)) / 10_000n;
      }, 0n),
  );
}

export function monthCashFlow(transactions: readonly FinancialTransaction[], month: string) {
  return transactions
    .filter((item) => item.occurredAt.slice(0, 7) === month && item.kind !== "transfer")
    .reduce(
      (result, item) => {
        if (item.direction === "inflow") result.inflow += item.amount;
        else result.outflow += item.amount;
        return result;
      },
      { inflow: 0n, outflow: 0n },
    );
}

export type SubscriptionInsight = {
  id: string;
  title: string;
  explanation: string;
  subscriptionIds: string[];
};

export function deterministicSubscriptionInsights(state: SubscriptionState): SubscriptionInsight[] {
  const active = state.subscriptions.filter((item) => ["active", "trial"].includes(item.status));
  const groups = Map.groupBy(active, (item) => item.category);
  const duplicateInsights = [...groups.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([category, items]) => ({
      id: `duplicate-category-${category}`,
      title: "같은 분류의 구독이 여러 개예요",
      explanation: `활성 구독 ${items.length}개가 같은 분류에 있습니다. 교체 상품을 추천하지 않고 직접 검토할 목록만 보여드려요.`,
      subscriptionIds: items.map((item) => item.id).sort(),
    }));
  const review = active.filter(
    (item) => item.decision === "review" || item.decision === "cancel_candidate",
  );
  return [
    ...duplicateInsights,
    ...(review.length
      ? [
          {
            id: "manual-review-candidates",
            title: "직접 검토로 표시한 구독이 있어요",
            explanation: "사용자가 입력한 유지 판단만 사용했습니다. 실제 이용량을 추측하지 않아요.",
            subscriptionIds: review.map((item) => item.id).sort(),
          },
        ]
      : []),
  ];
}
