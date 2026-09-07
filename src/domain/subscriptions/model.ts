import { monthlyEquivalentKrw, type BillingCycle } from "@/domain/formulas";
import { toKrw, type Krw } from "@/domain/money/krw";

export const subscriptionCategories = [
  "ai_software",
  "cloud_storage",
  "education",
  "entertainment",
  "communication",
  "fitness",
  "news",
  "other",
] as const;
export const subscriptionStatuses = ["trial", "active", "paused", "cancelled", "ended"] as const;
export const subscriptionDecisions = ["keep", "review", "cancel_candidate"] as const;

export type SubscriptionCategory = (typeof subscriptionCategories)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type SubscriptionDecision = (typeof subscriptionDecisions)[number];
export type OccurrenceStatus = "scheduled" | "unmatched" | "paid" | "skipped" | "refunded";

export type Subscription = {
  id: string;
  ownerId: string;
  householdId: string | null;
  scope: "private" | "household";
  payerMemberId: string | null;
  paymentAccountId: string | null;
  name: string;
  providerName: string | null;
  planName: string | null;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  decision: SubscriptionDecision;
  decisionNote: string | null;
  decisionUpdatedAt: string | null;
  amount: Krw;
  currency: "KRW";
  billingCycle: BillingCycle;
  customCycleDays: number | null;
  startedOn: string;
  billingAnchorOn: string;
  nextBillingOn: string;
  trialEndsOn: string | null;
  cancelByOn: string | null;
  autoRenews: boolean;
  descriptorAliases: string[];
  reminderDaysBefore: number[];
  serviceUrl: string | null;
  notes: string | null;
  lastUsedOn: string | null;
  cancelledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionSplit = {
  subscriptionId: string;
  memberId: string;
  shareBasisPoints: number;
};

export type SubscriptionPriceHistory = {
  id: string;
  subscriptionId: string;
  effectiveOn: string;
  amount: Krw;
  currency: "KRW";
  note: string | null;
  createdAt: string;
};

export type SubscriptionOccurrence = {
  id: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  expectedAmount: Krw;
  priceHistoryId: string;
  status: OccurrenceStatus;
  matchedTransactionId: string | null;
  sharedExpenseId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionMatchSuggestion = {
  id: string;
  ownerId: string;
  transactionId: string;
  occurrenceId: string;
  confidence: number;
  evidence: { amount: string; descriptor: string; account: string; timing: string };
  status: "suggested" | "confirmed" | "dismissed";
  confirmedAt: string | null;
  dismissedAt: string | null;
};

export type SubscriptionSharedExpense = {
  id: string;
  householdId: string;
  occurrenceId: string;
  transactionId: string;
  payerMemberId: string;
  amount: Krw;
  splits: Array<{ memberId: string; amount: Krw }>;
  createdAt: string;
};

export type SubscriptionMember = { id: string; name: string; isCurrentUser: boolean };

export type SubscriptionState = {
  userId: string;
  householdId: string;
  members: SubscriptionMember[];
  subscriptions: Subscription[];
  splits: SubscriptionSplit[];
  priceHistory: SubscriptionPriceHistory[];
  occurrences: SubscriptionOccurrence[];
  suggestions: SubscriptionMatchSuggestion[];
  sharedExpenses: SubscriptionSharedExpense[];
};

export type MatchableExpenseTransaction = {
  id: string;
  ownerId: string;
  accountId: string;
  kind: "income" | "expense" | "transfer";
  direction: "inflow" | "outflow";
  amount: Krw;
  occurredAt: string;
  counterparty: string | null;
  descriptor: string | null;
};

function date(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`날짜 형식이 올바르지 않아요: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function dateText(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDateDays(value: string, days: number) {
  const result = date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return dateText(result);
}

function addAnchoredMonths(value: string, months: number, anchorDay: number) {
  const current = date(value);
  const target = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(anchorDay, lastDay));
  return dateText(target);
}

export function nextSubscriptionDate(subscription: Subscription, current: string) {
  const anchorDay = date(subscription.billingAnchorOn).getUTCDate();
  switch (subscription.billingCycle) {
    case "weekly":
      return addDateDays(current, 7);
    case "monthly":
      return addAnchoredMonths(current, 1, anchorDay);
    case "quarterly":
      return addAnchoredMonths(current, 3, anchorDay);
    case "semiannual":
      return addAnchoredMonths(current, 6, anchorDay);
    case "yearly":
      return addAnchoredMonths(current, 12, anchorDay);
    case "custom_days":
      if (!subscription.customCycleDays || subscription.customCycleDays <= 0)
        throw new Error("사용자 지정 주기 일수가 필요해요.");
      return addDateDays(current, subscription.customCycleDays);
  }
}

function activePrice(state: SubscriptionState, subscriptionId: string, dueOn: string) {
  const price = state.priceHistory
    .filter((item) => item.subscriptionId === subscriptionId && item.effectiveOn <= dueOn)
    .sort((left, right) => right.effectiveOn.localeCompare(left.effectiveOn))[0];
  if (!price) throw new Error("적용할 구독 가격 이력이 없어요.");
  return price;
}

function generationEnd(subscription: Subscription) {
  if (subscription.status === "cancelled" && subscription.cancelledAt)
    return subscription.cancelledAt.slice(0, 10);
  if (subscription.status === "ended" && subscription.endedAt)
    return subscription.endedAt.slice(0, 10);
  return null;
}

export function materializeSubscriptionOccurrences(input: {
  state: SubscriptionState;
  subscriptionId: string;
  horizonUntil: string;
  today: string;
  now: string;
}) {
  const subscription = input.state.subscriptions.find((item) => item.id === input.subscriptionId);
  if (!subscription) throw new Error("구독을 찾지 못했어요.");
  if (subscription.ownerId !== input.state.userId) throw new Error("구독 소유 경계가 달라요.");
  if (subscription.status === "paused") return input.state;
  const stopOn = generationEnd(subscription);
  const existingKeys = new Set(
    input.state.occurrences
      .filter((item) => item.subscriptionId === subscription.id)
      .map((item) => item.dueOn),
  );
  const created: SubscriptionOccurrence[] = [];
  let dueOn = subscription.nextBillingOn;
  let guard = 0;
  while (dueOn <= input.horizonUntil && guard < 400) {
    guard += 1;
    if (stopOn && dueOn > stopOn) break;
    const nextDue = nextSubscriptionDate(subscription, dueOn);
    if (!existingKeys.has(dueOn)) {
      const price = activePrice(input.state, subscription.id, dueOn);
      created.push({
        id: `occurrence-${subscription.id}-${dueOn}`,
        subscriptionId: subscription.id,
        periodStart: dueOn,
        periodEnd: addDateDays(nextDue, -1),
        dueOn,
        expectedAmount: price.amount,
        priceHistoryId: price.id,
        status: dueOn < input.today ? "unmatched" : "scheduled",
        matchedTransactionId: null,
        sharedExpenseId: null,
        paidAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      });
    }
    dueOn = nextDue;
  }
  return { ...input.state, occurrences: [...input.state.occurrences, ...created] };
}

export function changeSubscriptionPrice(input: {
  state: SubscriptionState;
  subscriptionId: string;
  amount: Krw;
  effectiveOn: string;
  note: string | null;
  historyId: string;
  now: string;
}) {
  const subscription = input.state.subscriptions.find((item) => item.id === input.subscriptionId);
  if (!subscription || subscription.ownerId !== input.state.userId)
    throw new Error("구독을 찾지 못했어요.");
  if (input.amount <= 0n) throw new Error("구독 금액은 1원 이상이어야 해요.");
  const duplicate = input.state.priceHistory.find(
    (item) => item.subscriptionId === subscription.id && item.effectiveOn === input.effectiveOn,
  );
  if (duplicate) throw new Error("같은 적용일의 가격 이력이 이미 있어요.");
  const history: SubscriptionPriceHistory = {
    id: input.historyId,
    subscriptionId: subscription.id,
    effectiveOn: input.effectiveOn,
    amount: input.amount,
    currency: "KRW",
    note: input.note,
    createdAt: input.now,
  };
  const stateWithHistory = { ...input.state, priceHistory: [...input.state.priceHistory, history] };
  const latestPrice = stateWithHistory.priceHistory
    .filter((item) => item.subscriptionId === subscription.id)
    .sort((left, right) => right.effectiveOn.localeCompare(left.effectiveOn))[0]!;
  return {
    ...stateWithHistory,
    subscriptions: stateWithHistory.subscriptions.map((item) =>
      item.id === subscription.id
        ? { ...item, amount: latestPrice.amount, updatedAt: input.now }
        : item,
    ),
    occurrences: stateWithHistory.occurrences.map((occurrence) => {
      if (
        occurrence.subscriptionId !== subscription.id ||
        occurrence.dueOn < input.effectiveOn ||
        occurrence.status === "paid" ||
        occurrence.status === "refunded"
      )
        return occurrence;
      const price = activePrice(stateWithHistory, subscription.id, occurrence.dueOn);
      return {
        ...occurrence,
        expectedAmount: price.amount,
        priceHistoryId: price.id,
        updatedAt: input.now,
      };
    }),
  };
}

export function transitionSubscriptionStatus(input: {
  state: SubscriptionState;
  subscriptionId: string;
  status: SubscriptionStatus;
  now: string;
}) {
  const subscription = input.state.subscriptions.find((item) => item.id === input.subscriptionId);
  if (!subscription || subscription.ownerId !== input.state.userId)
    throw new Error("구독을 찾지 못했어요.");
  if (
    (subscription.status === "cancelled" || subscription.status === "ended") &&
    subscription.status !== input.status
  )
    throw new Error("종료된 구독은 이력을 보존하기 위해 다시 활성화할 수 없어요.");
  const terminal = input.status === "cancelled" || input.status === "ended";
  const stopOn = input.now.slice(0, 10);
  return {
    ...input.state,
    subscriptions: input.state.subscriptions.map((item) =>
      item.id === subscription.id
        ? {
            ...item,
            status: input.status,
            cancelledAt: input.status === "cancelled" ? input.now : item.cancelledAt,
            endedAt: input.status === "ended" ? input.now : item.endedAt,
            updatedAt: input.now,
          }
        : item,
    ),
    occurrences: input.state.occurrences.map((item) =>
      terminal &&
      item.subscriptionId === subscription.id &&
      item.dueOn > stopOn &&
      (item.status === "scheduled" || item.status === "unmatched")
        ? { ...item, status: "skipped" as const, updatedAt: input.now }
        : item,
    ),
  };
}

export function resetSubscriptionForecast(input: {
  state: SubscriptionState;
  subscriptionId: string;
  from: string;
}) {
  const removable = new Set(
    input.state.occurrences
      .filter(
        (item) =>
          item.subscriptionId === input.subscriptionId &&
          item.dueOn >= input.from &&
          (item.status === "scheduled" || item.status === "unmatched"),
      )
      .map((item) => item.id),
  );
  return {
    ...input.state,
    occurrences: input.state.occurrences.filter((item) => !removable.has(item.id)),
    suggestions: input.state.suggestions.filter(
      (item) => item.status !== "suggested" || !removable.has(item.occurrenceId),
    ),
  };
}

export function allocateBasisPointSplits(amount: Krw, splits: readonly SubscriptionSplit[]) {
  const total = splits.reduce((sum, split) => sum + split.shareBasisPoints, 0);
  if (total !== 10_000) throw new Error("공동 구독 분담률의 합은 100%여야 해요.");
  const ordered = [...splits].sort((left, right) => left.memberId.localeCompare(right.memberId));
  let allocated = 0n;
  const result = ordered.map((split) => {
    const splitAmount = (amount * BigInt(split.shareBasisPoints)) / 10_000n;
    allocated += splitAmount;
    return { memberId: split.memberId, amount: toKrw(splitAmount) };
  });
  if (result[0]) result[0] = { ...result[0], amount: toKrw(result[0].amount + amount - allocated) };
  return result;
}

function dayDistance(left: string, right: string) {
  return Math.abs(date(left).getTime() - date(right).getTime()) / 86_400_000;
}

export function suggestSubscriptionMatches(input: {
  state: SubscriptionState;
  transactions: readonly MatchableExpenseTransaction[];
}) {
  const used = new Set(input.state.occurrences.flatMap((item) => item.matchedTransactionId ?? []));
  const settled = new Set(
    input.state.suggestions
      .filter((item) => item.status !== "suggested")
      .map((item) => `${item.transactionId}:${item.occurrenceId}`),
  );
  const suggestions: SubscriptionMatchSuggestion[] = [];
  for (const transaction of input.transactions.filter(
    (item) => item.kind === "expense" && item.direction === "outflow" && !used.has(item.id),
  )) {
    for (const occurrence of input.state.occurrences.filter(
      (item) => item.status === "scheduled" || item.status === "unmatched",
    )) {
      const subscription = input.state.subscriptions.find(
        (item) => item.id === occurrence.subscriptionId,
      );
      if (!subscription || subscription.ownerId !== transaction.ownerId) continue;
      const pair = `${transaction.id}:${occurrence.id}`;
      if (settled.has(pair)) continue;
      const text =
        `${transaction.counterparty ?? ""} ${transaction.descriptor ?? ""}`.toLowerCase();
      const descriptorMatched = [
        subscription.name,
        subscription.providerName ?? "",
        ...subscription.descriptorAliases,
      ]
        .filter(Boolean)
        .some((alias) => text.includes(alias.toLowerCase()));
      const amountMatched = transaction.amount === occurrence.expectedAmount;
      const accountMatched =
        subscription.paymentAccountId === null ||
        subscription.paymentAccountId === transaction.accountId;
      const days = dayDistance(transaction.occurredAt.slice(0, 10), occurrence.dueOn);
      if (days > 7) continue;
      const confidence = Number(
        (
          0.05 +
          (amountMatched ? 0.45 : 0) +
          (descriptorMatched ? 0.25 : 0) +
          (accountMatched ? 0.15 : 0) +
          (days <= 3 ? 0.1 : days <= 7 ? 0.05 : 0)
        ).toFixed(2),
      );
      if (confidence < 0.55) continue;
      suggestions.push({
        id: `subscription-match-${transaction.id}-${occurrence.id}`,
        ownerId: input.state.userId,
        transactionId: transaction.id,
        occurrenceId: occurrence.id,
        confidence,
        evidence: {
          amount: amountMatched ? "예상 금액과 일치" : "예상 금액과 다름",
          descriptor: descriptorMatched ? "거래명 패턴과 일치" : "거래명 패턴 불일치",
          account: accountMatched ? "예상 결제 계좌와 일치" : "예상 계좌와 다름",
          timing: `예정일과 ${Math.round(days)}일 차이`,
        },
        status: "suggested",
        confirmedAt: null,
        dismissedAt: null,
      });
    }
  }
  return suggestions.sort((left, right) => right.confidence - left.confidence);
}

function ensureHouseholdExpense(
  state: SubscriptionState,
  subscription: Subscription,
  occurrence: SubscriptionOccurrence,
  transactionId: string,
  now: string,
) {
  if (subscription.scope !== "household") return state;
  const existing = state.sharedExpenses.find((item) => item.occurrenceId === occurrence.id);
  if (existing) return state;
  if (!subscription.householdId || !subscription.payerMemberId)
    throw new Error("공동 구독의 우리집과 결제자가 필요해요.");
  const splits = state.splits.filter((item) => item.subscriptionId === subscription.id);
  const expense: SubscriptionSharedExpense = {
    id: `shared-expense-${occurrence.id}`,
    householdId: subscription.householdId,
    occurrenceId: occurrence.id,
    transactionId,
    payerMemberId: subscription.payerMemberId,
    amount: occurrence.expectedAmount,
    splits: allocateBasisPointSplits(occurrence.expectedAmount, splits),
    createdAt: now,
  };
  return { ...state, sharedExpenses: [...state.sharedExpenses, expense] };
}

export function confirmSubscriptionMatch(input: {
  state: SubscriptionState;
  suggestionId: string;
  transaction: MatchableExpenseTransaction;
  now: string;
}) {
  const suggestion = input.state.suggestions.find(
    (item) => item.id === input.suggestionId && item.status === "suggested",
  );
  if (!suggestion || suggestion.transactionId !== input.transaction.id)
    throw new Error("확정할 매칭 제안을 찾지 못했어요.");
  if (input.transaction.ownerId !== input.state.userId) throw new Error("거래 소유 경계가 달라요.");
  if (input.transaction.kind !== "expense" || input.transaction.direction !== "outflow")
    throw new Error("실제 지출 출금만 구독 결제로 연결할 수 있어요.");
  if (
    input.state.occurrences.some(
      (item) =>
        item.matchedTransactionId === input.transaction.id && item.id !== suggestion.occurrenceId,
    )
  )
    throw new Error("이 거래는 이미 다른 구독 결제에 연결됐어요.");
  const occurrence = input.state.occurrences.find((item) => item.id === suggestion.occurrenceId);
  if (!occurrence || occurrence.status === "paid") throw new Error("이미 처리된 예상 청구예요.");
  const subscription = input.state.subscriptions.find(
    (item) => item.id === occurrence.subscriptionId,
  );
  if (!subscription) throw new Error("구독을 찾지 못했어요.");
  const updatedOccurrence = {
    ...occurrence,
    status: "paid" as const,
    matchedTransactionId: input.transaction.id,
    paidAt: input.now,
    updatedAt: input.now,
    sharedExpenseId: subscription.scope === "household" ? `shared-expense-${occurrence.id}` : null,
  };
  let next: SubscriptionState = {
    ...input.state,
    occurrences: input.state.occurrences.map((item) =>
      item.id === occurrence.id ? updatedOccurrence : item,
    ),
    suggestions: input.state.suggestions.map((item) =>
      item.id === suggestion.id ? { ...item, status: "confirmed", confirmedAt: input.now } : item,
    ),
  };
  next = ensureHouseholdExpense(
    next,
    subscription,
    updatedOccurrence,
    input.transaction.id,
    input.now,
  );
  return next;
}

export function subscriptionDashboard(state: SubscriptionState, today: string) {
  const active = state.subscriptions.filter(
    (item) => item.status === "active" || item.status === "trial",
  );
  const monthly = active.reduce(
    (sum, item) =>
      sum +
      monthlyEquivalentKrw({
        amount: item.amount,
        cycle: item.billingCycle,
        ...(item.customCycleDays === null ? {} : { intervalDays: item.customCycleDays }),
      }),
    0n,
  );
  const inDays = (value: string, days: number) =>
    value >= today && value <= addDateDays(today, days);
  const forecastIds = new Set(active.map((item) => item.id));
  const obligations = state.occurrences.filter(
    (item) =>
      forecastIds.has(item.subscriptionId) &&
      (item.status === "scheduled" || item.status === "unmatched"),
  );
  return {
    monthlyEquivalent: toKrw(monthly),
    annualProjection: toKrw(
      obligations
        .filter((item) => inDays(item.dueOn, 365))
        .reduce((sum, item) => sum + item.expectedAmount, 0n),
    ),
    due7: obligations.filter((item) => inDays(item.dueOn, 7)),
    due30: obligations.filter((item) => inDays(item.dueOn, 30)),
    trials: active.filter((item) => item.trialEndsOn !== null && inDays(item.trialEndsOn, 30)),
    unmatched: obligations.filter((item) => item.status === "unmatched"),
    overdue: obligations.filter((item) => item.dueOn < today),
  };
}

export function unpaidSubscriptionObligation(
  state: SubscriptionState,
  from: string,
  until: string,
) {
  return toKrw(
    state.occurrences
      .filter(
        (item) =>
          item.dueOn >= from &&
          item.dueOn <= until &&
          (item.status === "scheduled" || item.status === "unmatched") &&
          item.matchedTransactionId === null,
      )
      .reduce((sum, item) => sum + item.expectedAmount, 0n),
  );
}
