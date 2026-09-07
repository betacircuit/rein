import { toKrw, type Krw } from "@/domain/money/krw";

export const sharedExpenseCategories = [
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
] as const;

export const splitPresets = [
  "equal",
  "current_user_all",
  "roommate_all",
  "custom_amounts",
  "custom_percentages",
] as const;

export type SharedExpenseCategory = (typeof sharedExpenseCategories)[number];
export type SplitPreset = (typeof splitPresets)[number];
export type SharedExpenseKind = "charge" | "refund";
export type SharedExpenseStatus = "draft" | "confirmed" | "settled" | "void";

export type SharedMoneyMember = {
  id: string;
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
  status: "active";
};

export type SharedExpenseSplit = { memberId: string; amount: Krw };

export type SharedExpense = {
  id: string;
  householdId: string;
  createdByMemberId: string;
  payerMemberId: string;
  sourceKind: "manual" | "transaction" | "subscription";
  sourceSubscriptionOccurrenceId: string | null;
  linkedTransactionId: string | null;
  category: SharedExpenseCategory;
  kind: SharedExpenseKind;
  description: string;
  amount: Krw;
  incurredOn: string;
  dueOn: string | null;
  status: SharedExpenseStatus;
  notes: string | null;
  splits: SharedExpenseSplit[];
  createdAt: string;
  updatedAt: string;
};

export type Settlement = {
  id: string;
  householdId: string;
  fromMemberId: string;
  toMemberId: string;
  periodStart: string;
  periodEnd: string;
  amountDue: Krw;
  status: "open" | "partially_paid" | "paid" | "void";
  dueOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettlementAllocation = {
  id: string;
  settlementId: string;
  ownerUserId: string;
  transactionId: string;
  amount: Krw;
  createdByMemberId: string;
  createdAt: string;
};

export type HouseholdMoneyState = {
  userId: string;
  householdId: string;
  currentMemberId: string;
  members: SharedMoneyMember[];
  expenses: SharedExpense[];
  settlements: Settlement[];
  settlementAllocations: SettlementAllocation[];
};

export type MatchableHouseholdTransaction = {
  id: string;
  ownerId: string;
  amount: Krw;
  direction: "inflow" | "outflow";
  kind: "income" | "expense" | "transfer";
  occurredAt: string;
  counterparty: string | null;
  descriptor: string | null;
  scope: "private" | "household";
  householdId: string | null;
};

export type SettlementSuggestion = {
  id: string;
  settlementId: string;
  transactionId: string;
  suggestedAmount: Krw;
  confidence: number;
  evidence: { amount: string; member: string; timing: string };
};

export type TransactionClassification = "household_shopping" | "housing" | "utility" | "personal";

function assertMember(state: HouseholdMoneyState, memberId: string) {
  if (!state.members.some((member) => member.id === memberId)) {
    throw new Error("활성 우리집 구성원을 찾지 못했어요.");
  }
}

function assertCurrentActor(state: HouseholdMoneyState, memberId: string) {
  assertMember(state, memberId);
  if (memberId !== state.currentMemberId) throw new Error("현재 구성원만 이 작업을 할 수 있어요.");
}

export function parsePercentToBasisPoints(value: string) {
  const normalized = value.trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("비율은 소수 둘째 자리까지 입력해 주세요.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const result = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result < 0n || result > 10_000n) throw new Error("비율은 0%부터 100%까지예요.");
  return result;
}

export function allocateLargestRemainder(
  total: Krw,
  weights: readonly { memberId: string; weight: bigint }[],
) {
  if (total <= 0n) throw new Error("공동비 금액은 1원 이상이어야 해요.");
  if (weights.length === 0 || weights.some((item) => item.weight < 0n)) {
    throw new Error("분담 기준을 확인해 주세요.");
  }
  const weightTotal = weights.reduce((sum, item) => sum + item.weight, 0n);
  if (weightTotal <= 0n) throw new Error("분담 비율 합계는 0보다 커야 해요.");
  const ordered = [...weights].sort((left, right) => left.memberId.localeCompare(right.memberId));
  const initial = ordered.map((item) => ({
    memberId: item.memberId,
    amount: (total * item.weight) / weightTotal,
    remainder: (total * item.weight) % weightTotal,
  }));
  let remaining = total - initial.reduce((sum, item) => sum + item.amount, 0n);
  const byRemainder = [...initial].sort((left, right) => {
    if (left.remainder === right.remainder) return left.memberId.localeCompare(right.memberId);
    return left.remainder > right.remainder ? -1 : 1;
  });
  for (const item of byRemainder) {
    if (remaining === 0n) break;
    const target = initial.find((candidate) => candidate.memberId === item.memberId)!;
    target.amount += 1n;
    remaining -= 1n;
  }
  return initial
    .sort((left, right) => left.memberId.localeCompare(right.memberId))
    .map(({ memberId, amount }) => ({ memberId, amount: toKrw(amount) }));
}

export function createExpenseSplits(input: {
  total: Krw;
  currentMemberId: string;
  roommateMemberId: string;
  preset: SplitPreset;
  currentAmount?: Krw | undefined;
  roommateAmount?: Krw | undefined;
  currentPercentBasisPoints?: bigint | undefined;
  roommatePercentBasisPoints?: bigint | undefined;
}): SharedExpenseSplit[] {
  const ids = [input.currentMemberId, input.roommateMemberId];
  if (new Set(ids).size !== 2) throw new Error("서로 다른 두 구성원이 필요해요.");
  if (input.preset === "equal") {
    return allocateLargestRemainder(
      input.total,
      ids.map((memberId) => ({ memberId, weight: 1n })),
    );
  }
  if (input.preset === "current_user_all") {
    return ids.map((memberId) => ({
      memberId,
      amount: memberId === input.currentMemberId ? input.total : toKrw(0),
    }));
  }
  if (input.preset === "roommate_all") {
    return ids.map((memberId) => ({
      memberId,
      amount: memberId === input.roommateMemberId ? input.total : toKrw(0),
    }));
  }
  if (input.preset === "custom_amounts") {
    const current = input.currentAmount ?? toKrw(-1);
    const roommate = input.roommateAmount ?? toKrw(-1);
    if (current < 0n || roommate < 0n || current + roommate !== input.total) {
      throw new Error("직접 입력한 두 금액의 합이 공동비 총액과 같아야 해요.");
    }
    return [
      { memberId: input.currentMemberId, amount: current },
      { memberId: input.roommateMemberId, amount: roommate },
    ].sort((left, right) => left.memberId.localeCompare(right.memberId));
  }
  const currentWeight = input.currentPercentBasisPoints ?? -1n;
  const roommateWeight = input.roommatePercentBasisPoints ?? -1n;
  if (currentWeight < 0n || roommateWeight < 0n || currentWeight + roommateWeight !== 10_000n) {
    throw new Error("두 비율의 합이 정확히 100%여야 해요.");
  }
  return allocateLargestRemainder(input.total, [
    { memberId: input.currentMemberId, weight: currentWeight },
    { memberId: input.roommateMemberId, weight: roommateWeight },
  ]);
}

export function validateSharedExpense(state: HouseholdMoneyState, expense: SharedExpense) {
  if (expense.householdId !== state.householdId)
    throw new Error("다른 우리집 공동비는 저장할 수 없어요.");
  assertMember(state, expense.createdByMemberId);
  assertMember(state, expense.payerMemberId);
  if (!sharedExpenseCategories.includes(expense.category))
    throw new Error("공동비 분류를 확인해 주세요.");
  if (expense.amount <= 0n) throw new Error("공동비 금액은 1원 이상이어야 해요.");
  const memberIds = new Set<string>();
  let splitTotal = 0n;
  for (const split of expense.splits) {
    assertMember(state, split.memberId);
    if (memberIds.has(split.memberId))
      throw new Error("같은 구성원의 분담을 두 번 넣을 수 없어요.");
    if (split.amount < 0n) throw new Error("분담 금액은 음수일 수 없어요.");
    memberIds.add(split.memberId);
    splitTotal += split.amount;
  }
  if (splitTotal !== expense.amount) throw new Error("분담 금액 합계가 공동비 총액과 같아야 해요.");
  return expense;
}

function expenseIsLocked(state: HouseholdMoneyState, expense: SharedExpense) {
  return state.settlements.some((settlement) => {
    const paid = settlementPaid(settlement, state.settlementAllocations);
    return (
      paid > 0n &&
      expense.incurredOn >= settlement.periodStart &&
      expense.incurredOn <= settlement.periodEnd
    );
  });
}

export function saveSharedExpense(input: {
  state: HouseholdMoneyState;
  expense: SharedExpense;
  actorMemberId: string;
}) {
  assertCurrentActor(input.state, input.actorMemberId);
  const expense = validateSharedExpense(input.state, input.expense);
  const existing = input.state.expenses.find((item) => item.id === expense.id);
  if (existing?.sourceKind === "subscription")
    throw new Error("구독에서 연결된 공동비는 구독에서 관리해 주세요.");
  if (existing?.status === "settled" || existing?.status === "void") {
    throw new Error("정산되었거나 취소된 공동비는 수정할 수 없어요.");
  }
  if (existing && expenseIsLocked(input.state, existing)) {
    throw new Error("정산 입금이 연결된 기간의 공동비는 수정할 수 없어요.");
  }
  return {
    ...input.state,
    expenses: existing
      ? input.state.expenses.map((item) => (item.id === expense.id ? expense : item))
      : [...input.state.expenses, expense],
  };
}

export function voidSharedExpense(input: {
  state: HouseholdMoneyState;
  expenseId: string;
  actorMemberId: string;
  now: string;
}) {
  assertCurrentActor(input.state, input.actorMemberId);
  const expense = input.state.expenses.find((item) => item.id === input.expenseId);
  if (!expense) throw new Error("공동비를 찾지 못했어요.");
  if (expense.sourceKind === "subscription")
    throw new Error("구독 공동비는 구독에서 관리해 주세요.");
  if (expenseIsLocked(input.state, expense))
    throw new Error("정산된 공동비 내역은 삭제할 수 없어요.");
  return {
    ...input.state,
    expenses: input.state.expenses.map((item) =>
      item.id === expense.id ? { ...item, status: "void" as const, updatedAt: input.now } : item,
    ),
  };
}

function applyCredit(credits: Map<string, bigint>, memberId: string, amount: bigint) {
  credits.set(memberId, (credits.get(memberId) ?? 0n) + amount);
}

export function settlementPaid(
  settlement: Settlement,
  allocations: readonly SettlementAllocation[],
) {
  return toKrw(
    allocations
      .filter((allocation) => allocation.settlementId === settlement.id)
      .reduce((sum, allocation) => sum + allocation.amount, 0n),
  );
}

export function calculateMemberCredits(state: HouseholdMoneyState, month?: string) {
  const credits = new Map(state.members.map((member) => [member.id, 0n]));
  for (const expense of state.expenses) {
    if (expense.status !== "confirmed" && expense.status !== "settled") continue;
    if (month && expense.incurredOn.slice(0, 7) !== month) continue;
    const sign = expense.kind === "refund" ? -1n : 1n;
    applyCredit(credits, expense.payerMemberId, sign * expense.amount);
    for (const split of expense.splits) applyCredit(credits, split.memberId, -sign * split.amount);
  }
  for (const settlement of state.settlements) {
    if (settlement.status === "void") continue;
    if (month && settlement.periodEnd.slice(0, 7) !== month) continue;
    const paid = settlementPaid(settlement, state.settlementAllocations);
    applyCredit(credits, settlement.fromMemberId, paid);
    applyCredit(credits, settlement.toMemberId, -paid);
  }
  return new Map([...credits].map(([memberId, amount]) => [memberId, toKrw(amount)]));
}

export function calculateCurrentSettlement(state: HouseholdMoneyState, month?: string) {
  const currentCredit = calculateMemberCredits(state, month).get(state.currentMemberId) ?? toKrw(0);
  const roommate = state.members.find((member) => member.id !== state.currentMemberId);
  if (!roommate || currentCredit === 0n) return null;
  return currentCredit > 0n
    ? { fromMemberId: roommate.id, toMemberId: state.currentMemberId, amount: currentCredit }
    : {
        fromMemberId: state.currentMemberId,
        toMemberId: roommate.id,
        amount: toKrw(-currentCredit),
      };
}

export function settlementBalance(
  settlement: Settlement,
  allocations: readonly SettlementAllocation[],
) {
  const paid = settlementPaid(settlement, allocations);
  return { paid, remaining: toKrw(settlement.amountDue - paid) };
}

export function saveSettlement(state: HouseholdMoneyState, settlement: Settlement) {
  assertMember(state, settlement.fromMemberId);
  assertMember(state, settlement.toMemberId);
  if (settlement.fromMemberId === settlement.toMemberId || settlement.amountDue <= 0n) {
    throw new Error("정산 방향과 금액을 확인해 주세요.");
  }
  const existing = state.settlements.find((item) => item.id === settlement.id);
  return {
    ...state,
    settlements: existing
      ? state.settlements.map((item) => (item.id === settlement.id ? settlement : item))
      : [...state.settlements, settlement],
  };
}

export function suggestSettlementMatches(input: {
  state: HouseholdMoneyState;
  transactions: readonly MatchableHouseholdTransaction[];
}) {
  const used = new Set(
    input.state.settlementAllocations.map((allocation) => allocation.transactionId),
  );
  const suggestions: SettlementSuggestion[] = [];
  for (const settlement of input.state.settlements.filter(
    (item) => item.status === "open" || item.status === "partially_paid",
  )) {
    const { remaining } = settlementBalance(settlement, input.state.settlementAllocations);
    if (remaining <= 0n) continue;
    const currentReceives = settlement.toMemberId === input.state.currentMemberId;
    const counterpartyMember = input.state.members.find(
      (member) => member.id === (currentReceives ? settlement.fromMemberId : settlement.toMemberId),
    );
    for (const transaction of input.transactions) {
      if (transaction.ownerId !== input.state.userId || used.has(transaction.id)) continue;
      if (transaction.kind === "transfer") continue;
      if (transaction.direction !== (currentReceives ? "inflow" : "outflow")) continue;
      const text =
        `${transaction.counterparty ?? ""} ${transaction.descriptor ?? ""}`.toLowerCase();
      const memberMatched = Boolean(
        counterpartyMember?.displayName &&
        text.includes(counterpartyMember.displayName.toLowerCase()),
      );
      const amountMatched = transaction.amount <= remaining;
      const confidence = Number(
        (0.45 + (amountMatched ? 0.35 : 0) + (memberMatched ? 0.2 : 0)).toFixed(2),
      );
      if (confidence < 0.7) continue;
      suggestions.push({
        id: `settlement-match-${settlement.id}-${transaction.id}`,
        settlementId: settlement.id,
        transactionId: transaction.id,
        suggestedAmount: toKrw(transaction.amount > remaining ? remaining : transaction.amount),
        confidence,
        evidence: {
          amount: amountMatched ? "남은 정산액 이내" : "입금액 일부 연결",
          member: memberMatched ? "룸메이트 이름 일치" : "입금 방향 일치",
          timing: `${settlement.periodEnd.slice(0, 7)} 정산 후보`,
        },
      });
    }
  }
  return suggestions.sort((left, right) => right.confidence - left.confidence);
}

export function allocateSettlementPayment(input: {
  state: HouseholdMoneyState;
  settlementId: string;
  transaction: MatchableHouseholdTransaction;
  amount: Krw;
  allocationId: string;
  actorMemberId: string;
  now: string;
}) {
  assertCurrentActor(input.state, input.actorMemberId);
  const settlement = input.state.settlements.find((item) => item.id === input.settlementId);
  if (!settlement || settlement.status === "void" || settlement.status === "paid") {
    throw new Error("연결할 수 있는 정산을 찾지 못했어요.");
  }
  if (input.transaction.ownerId !== input.state.userId)
    throw new Error("내 거래만 정산에 연결할 수 있어요.");
  const currentReceives = settlement.toMemberId === input.state.currentMemberId;
  if (input.transaction.direction !== (currentReceives ? "inflow" : "outflow")) {
    throw new Error("정산 방향과 거래 방향이 맞지 않아요.");
  }
  if (
    input.state.settlementAllocations.some((item) => item.transactionId === input.transaction.id)
  ) {
    return input.state;
  }
  const balance = settlementBalance(settlement, input.state.settlementAllocations);
  if (
    input.amount <= 0n ||
    input.amount > balance.remaining ||
    input.amount > input.transaction.amount
  ) {
    throw new Error("남은 정산액과 거래 금액 안에서 연결해 주세요.");
  }
  const allocations = [
    ...input.state.settlementAllocations,
    {
      id: input.allocationId,
      settlementId: settlement.id,
      ownerUserId: input.state.userId,
      transactionId: input.transaction.id,
      amount: input.amount,
      createdByMemberId: input.actorMemberId,
      createdAt: input.now,
    },
  ];
  const paid = settlementPaid(settlement, allocations);
  return {
    ...input.state,
    settlementAllocations: allocations,
    settlements: input.state.settlements.map((item) =>
      item.id === settlement.id
        ? {
            ...item,
            status: paid === item.amountDue ? ("paid" as const) : ("partially_paid" as const),
            updatedAt: input.now,
          }
        : item,
    ),
  };
}

const classificationCategory: Record<
  Exclude<TransactionClassification, "personal">,
  SharedExpenseCategory
> = {
  household_shopping: "household_goods",
  housing: "rent",
  utility: "electricity",
};

export function classifyTransactionAsSharedExpense(input: {
  state: HouseholdMoneyState;
  transaction: MatchableHouseholdTransaction;
  classification: Exclude<TransactionClassification, "personal">;
  expenseId: string;
  actorMemberId: string;
  incurredOn: string;
  now: string;
}) {
  assertCurrentActor(input.state, input.actorMemberId);
  if (input.transaction.ownerId !== input.state.userId)
    throw new Error("내 거래만 분류할 수 있어요.");
  if (input.transaction.kind !== "expense" || input.transaction.direction !== "outflow") {
    throw new Error("실제 출금 지출만 공동비로 분류할 수 있어요.");
  }
  if (
    input.state.expenses.some((expense) => expense.linkedTransactionId === input.transaction.id)
  ) {
    return input.state;
  }
  const roommate = input.state.members.find((member) => member.id !== input.state.currentMemberId);
  if (!roommate) throw new Error("분담할 룸메이트가 필요해요.");
  const description = input.transaction.counterparty || input.transaction.descriptor || "공동 지출";
  return saveSharedExpense({
    state: input.state,
    actorMemberId: input.actorMemberId,
    expense: {
      id: input.expenseId,
      householdId: input.state.householdId,
      createdByMemberId: input.actorMemberId,
      payerMemberId: input.state.currentMemberId,
      sourceKind: "transaction",
      sourceSubscriptionOccurrenceId: null,
      linkedTransactionId: input.transaction.id,
      category: classificationCategory[input.classification],
      kind: "charge",
      description,
      amount: input.transaction.amount,
      incurredOn: input.incurredOn,
      dueOn: null,
      status: "confirmed",
      notes: "거래 분류 확인에서 생성",
      splits: createExpenseSplits({
        total: input.transaction.amount,
        currentMemberId: input.state.currentMemberId,
        roommateMemberId: roommate.id,
        preset: "equal",
      }),
      createdAt: input.now,
      updatedAt: input.now,
    },
  });
}

export function calculateHouseholdMoneyProjection(input: {
  state: HouseholdMoneyState;
  transactions: readonly MatchableHouseholdTransaction[];
  month: string;
}) {
  const expenses = input.state.expenses.filter(
    (expense) =>
      expense.incurredOn.slice(0, 7) === input.month &&
      (expense.status === "confirmed" || expense.status === "settled"),
  );
  const responsibility = expenses.reduce((sum, expense) => {
    const share =
      expense.splits.find((split) => split.memberId === input.state.currentMemberId)?.amount ?? 0n;
    return sum + (expense.kind === "refund" ? -share : share);
  }, 0n);
  const linkedIds = new Set(expenses.map((expense) => expense.linkedTransactionId).filter(Boolean));
  const settlementIds = new Set(
    input.state.settlementAllocations.map((allocation) => allocation.transactionId),
  );
  const monthTransactions = input.transactions.filter(
    (transaction) => transaction.occurredAt.slice(0, 7) === input.month,
  );
  const actualCashOutflow = monthTransactions
    .filter((transaction) => transaction.kind === "expense" && transaction.direction === "outflow")
    .reduce((sum, transaction) => sum + transaction.amount, 0n);
  const personalExpense = monthTransactions
    .filter(
      (transaction) =>
        transaction.kind === "expense" &&
        transaction.direction === "outflow" &&
        !linkedIds.has(transaction.id) &&
        !settlementIds.has(transaction.id),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0n);
  const settledIncome = monthTransactions
    .filter(
      (transaction) =>
        transaction.kind === "income" &&
        transaction.direction === "inflow" &&
        !settlementIds.has(transaction.id),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0n);
  const reimbursementsReceived = input.state.settlementAllocations.reduce((sum, allocation) => {
    const settlement = input.state.settlements.find((item) => item.id === allocation.settlementId);
    const transaction = monthTransactions.find((item) => item.id === allocation.transactionId);
    return settlement?.toMemberId === input.state.currentMemberId && transaction
      ? sum + allocation.amount
      : sum;
  }, 0n);
  return {
    actualCashOutflow: toKrw(actualCashOutflow),
    personalExpense: toKrw(personalExpense),
    householdResponsibility: toKrw(responsibility),
    responsibilityAdjustedExpense: toKrw(personalExpense + responsibility),
    settledIncomeExcludingReimbursements: toKrw(settledIncome),
    confirmedReimbursements: toKrw(reimbursementsReceived),
    householdAdjustedRemainder: toKrw(
      settledIncome - personalExpense - responsibility + reimbursementsReceived,
    ),
  };
}
