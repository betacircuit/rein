import { toKrw, type Krw } from "@/domain/money/krw";

export const incomeCategoryCodes = [
  "tutoring",
  "scholarship",
  "allowance",
  "other_income",
] as const;
export const expenseCategoryCodes = [
  "food",
  "cafe",
  "transport",
  "housing",
  "shopping",
  "education",
  "subscription",
  "household",
  "other_expense",
] as const;

export type TransactionKind = "income" | "expense" | "transfer";
export type TransactionDirection = "inflow" | "outflow";
export type TransactionSource = "manual" | "mock_sync" | "manual_csv" | "bank_sync" | "system";
export type ReceivableStatus = "open" | "partially_paid" | "paid" | "void";
export type BankProviderKind = "mock" | "manual_csv" | "kftc_testbed" | "kftc_production";

export type TransactionCategory = {
  code: string;
  displayName: string;
  kind: "income" | "expense";
  isSystem: boolean;
  isActive: boolean;
};

export type Account = {
  id: string;
  ownerId: string;
  institutionName: string;
  nickname: string;
  accountType: "checking" | "savings" | "cash" | "card" | "investment" | "other";
  maskedAccountNumber: string | null;
  provider: BankProviderKind;
  currency: "KRW";
  currentBalance: Krw;
  availableBalance: Krw | null;
  balanceAsOf: string | null;
  lastSyncSuccessAt: string | null;
  includedInTotals: boolean;
  isActive: boolean;
};

export type FinancialTransaction = {
  id: string;
  ownerId: string;
  accountId: string;
  categoryCode: string | null;
  scope: "private" | "household";
  householdId: string | null;
  direction: TransactionDirection;
  kind: TransactionKind;
  amount: Krw;
  occurredAt: string;
  counterparty: string | null;
  descriptor: string | null;
  memo: string | null;
  source: TransactionSource;
  externalTransactionId: string | null;
  importFingerprint: string | null;
  transferGroupId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Receivable = {
  id: string;
  ownerId: string;
  studentId: string;
  lessonId: string;
  amountDue: Krw;
  dueDate: string | null;
  status: ReceivableStatus;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceivableAllocation = {
  id: string;
  receivableId: string;
  transactionId: string;
  amount: Krw;
  createdBy: string;
  createdAt: string;
};

export type MatchSuggestion = {
  id: string;
  ownerId: string;
  transactionId: string;
  receivableId: string;
  confidence: number;
  evidence: { amount: string; alias: string; timing: string };
  status: "suggested" | "confirmed" | "dismissed";
  confirmedAt: string | null;
  dismissedAt: string | null;
};

export type MoneyState = {
  userId: string;
  categories: TransactionCategory[];
  accounts: Account[];
  transactions: FinancialTransaction[];
  receivables: Receivable[];
  allocations: ReceivableAllocation[];
  suggestions: MatchSuggestion[];
};

function nonBlank(value: string | null | undefined) {
  const cleaned = value?.trim() ?? "";
  return cleaned ? cleaned : null;
}

export function validateTransaction(input: FinancialTransaction) {
  if (input.amount <= 0n) throw new Error("거래 금액은 1원 이상이어야 해요.");
  if (input.kind === "income" && input.direction !== "inflow")
    throw new Error("수입은 입금 방향이어야 해요.");
  if (input.kind === "expense" && input.direction !== "outflow")
    throw new Error("지출은 출금 방향이어야 해요.");
  if (input.kind === "transfer" && !input.transferGroupId)
    throw new Error("이체에는 연결 그룹이 필요해요.");
  if (input.scope === "private" && input.householdId)
    throw new Error("개인 거래에는 우리집 연결을 저장하지 않아요.");
  if (input.scope === "household" && !input.householdId)
    throw new Error("우리집 거래에는 공유 기록 연결이 필요해요.");
  return {
    ...input,
    counterparty: nonBlank(input.counterparty),
    descriptor: nonBlank(input.descriptor),
    memo: nonBlank(input.memo),
  };
}

export function createInternalTransfer(input: {
  idPrefix: string;
  ownerId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Krw;
  occurredAt: string;
  now: string;
  memo?: string | null;
}) {
  if (input.fromAccountId === input.toAccountId)
    throw new Error("서로 다른 두 계좌를 선택해 주세요.");
  if (input.amount <= 0n) throw new Error("이체 금액은 1원 이상이어야 해요.");
  const common = {
    ownerId: input.ownerId,
    categoryCode: null,
    scope: "private" as const,
    householdId: null,
    kind: "transfer" as const,
    amount: input.amount,
    occurredAt: input.occurredAt,
    counterparty: null,
    descriptor: null,
    memo: nonBlank(input.memo),
    source: "manual" as const,
    externalTransactionId: null,
    importFingerprint: null,
    transferGroupId: input.idPrefix,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return [
    validateTransaction({
      ...common,
      id: `${input.idPrefix}-out`,
      accountId: input.fromAccountId,
      direction: "outflow",
    }),
    validateTransaction({
      ...common,
      id: `${input.idPrefix}-in`,
      accountId: input.toAccountId,
      direction: "inflow",
    }),
  ] as const;
}

export function calculateMoneyOverview(input: {
  accounts: readonly Account[];
  transactions: readonly FinancialTransaction[];
  month: string;
}) {
  const includedIds = new Set(
    input.accounts
      .filter((account) => account.isActive && account.includedInTotals)
      .map((account) => account.id),
  );
  const monthTransactions = input.transactions.filter(
    (transaction) =>
      includedIds.has(transaction.accountId) && transaction.occurredAt.slice(0, 7) === input.month,
  );
  let inflow = 0n;
  let outflow = 0n;
  for (const transaction of monthTransactions) {
    if (transaction.kind === "transfer") continue;
    if (transaction.kind === "income") inflow += transaction.amount;
    if (transaction.kind === "expense") outflow += transaction.amount;
  }
  return {
    totalBalance: toKrw(
      input.accounts
        .filter((account) => account.isActive && account.includedInTotals)
        .reduce((sum, account) => sum + account.currentBalance, 0n),
    ),
    monthlyInflow: toKrw(inflow),
    monthlyOutflow: toKrw(outflow),
    cashChange: toKrw(inflow - outflow),
  };
}

export function receivableBalance(
  receivable: Receivable,
  allocations: readonly ReceivableAllocation[],
) {
  const paid = allocations
    .filter((allocation) => allocation.receivableId === receivable.id)
    .reduce((sum, allocation) => sum + allocation.amount, 0n);
  return { paid: toKrw(paid), remaining: toKrw(receivable.amountDue - paid) };
}

export function ensureLessonReceivable(input: {
  state: MoneyState;
  lesson: {
    id: string;
    ownerId: string;
    studentId: string;
    amount: Krw;
    status: "scheduled" | "completed" | "cancelled";
  };
  now: string;
}) {
  if (input.lesson.status !== "completed")
    throw new Error("완료된 수업만 받을 돈으로 만들 수 있어요.");
  if (input.lesson.ownerId !== input.state.userId)
    throw new Error("수업과 원장의 소유 경계가 다릅니다.");
  const existing = input.state.receivables.find(
    (receivable) => receivable.lessonId === input.lesson.id,
  );
  if (existing) return input.state;
  const receivable: Receivable = {
    id: `receivable-${input.lesson.id}`,
    ownerId: input.lesson.ownerId,
    studentId: input.lesson.studentId,
    lessonId: input.lesson.id,
    amountDue: input.lesson.amount,
    dueDate: null,
    status: "open",
    voidReason: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return { ...input.state, receivables: [...input.state.receivables, receivable] };
}

export function deriveLessonFinances(state: MoneyState) {
  return state.receivables.map((receivable) => {
    const { paid, remaining } = receivableBalance(receivable, state.allocations);
    return {
      lessonId: receivable.lessonId,
      receivedAmount: paid,
      outstandingAmount: receivable.status === "void" ? toKrw(0) : remaining,
    };
  });
}

function statusFor(
  receivable: Receivable,
  allocations: readonly ReceivableAllocation[],
): ReceivableStatus {
  if (receivable.status === "void") return "void";
  const { paid, remaining } = receivableBalance(receivable, allocations);
  if (paid === 0n) return "open";
  return remaining === 0n ? "paid" : "partially_paid";
}

export function allocateReceivable(input: {
  state: MoneyState;
  receivableId: string;
  transactionId: string;
  amount: Krw;
  allocationId: string;
  now: string;
}) {
  const receivable = input.state.receivables.find((item) => item.id === input.receivableId);
  const transaction = input.state.transactions.find((item) => item.id === input.transactionId);
  if (!receivable || !transaction) throw new Error("연결할 입금 또는 받을 돈을 찾지 못했어요.");
  if (receivable.ownerId !== input.state.userId || transaction.ownerId !== input.state.userId)
    throw new Error("다른 사용자의 기록은 연결할 수 없어요.");
  if (receivable.status === "void")
    throw new Error("무효 처리된 받을 돈에는 입금을 연결할 수 없어요.");
  if (transaction.kind !== "income" || transaction.direction !== "inflow")
    throw new Error("실제 수입 입금만 받을 돈에 연결할 수 있어요.");
  const existing = input.state.allocations.find(
    (item) => item.receivableId === receivable.id && item.transactionId === transaction.id,
  );
  if (existing) return input.state;
  const receivableRemaining = receivableBalance(receivable, input.state.allocations).remaining;
  const transactionAllocated = input.state.allocations
    .filter((item) => item.transactionId === transaction.id)
    .reduce((sum, item) => sum + item.amount, 0n);
  if (input.amount <= 0n || input.amount > receivableRemaining)
    throw new Error("받을 금액보다 많이 연결할 수 없어요.");
  if (input.amount + transactionAllocated > transaction.amount)
    throw new Error("입금액보다 많이 나눠 연결할 수 없어요.");
  const allocations = [
    ...input.state.allocations,
    {
      id: input.allocationId,
      receivableId: receivable.id,
      transactionId: transaction.id,
      amount: input.amount,
      createdBy: input.state.userId,
      createdAt: input.now,
    },
  ];
  return {
    ...input.state,
    allocations,
    receivables: input.state.receivables.map((item) =>
      item.id === receivable.id
        ? { ...item, status: statusFor(item, allocations), updatedAt: input.now }
        : item,
    ),
  };
}

function dayDistance(left: string, right: string) {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 86_400_000;
}

export function suggestReceivableMatches(input: {
  state: MoneyState;
  studentNames: Readonly<Record<string, string>>;
  payerAliases: Readonly<Record<string, string[]>>;
  lessonStarts: Readonly<Record<string, string>>;
}) {
  const allocatedTransactions = new Set(
    input.state.allocations.map((allocation) => allocation.transactionId),
  );
  const suggestions: MatchSuggestion[] = [];
  for (const transaction of input.state.transactions.filter(
    (item) => item.kind === "income" && !allocatedTransactions.has(item.id),
  )) {
    for (const receivable of input.state.receivables.filter(
      (item) => item.status === "open" || item.status === "partially_paid",
    )) {
      const balance = receivableBalance(receivable, input.state.allocations);
      const aliases = input.payerAliases[receivable.studentId] ?? [];
      const counterparty = transaction.counterparty?.toLowerCase() ?? "";
      const aliasMatched =
        aliases.some((alias) => counterparty.includes(alias.toLowerCase())) ||
        counterparty.includes((input.studentNames[receivable.studentId] ?? "").toLowerCase());
      const days = dayDistance(
        transaction.occurredAt,
        input.lessonStarts[receivable.lessonId] ?? transaction.occurredAt,
      );
      const amountMatched = transaction.amount === balance.remaining;
      const confidence = Number(
        (
          0.25 +
          (amountMatched ? 0.45 : 0) +
          (aliasMatched ? 0.2 : 0) +
          (days <= 7 ? 0.1 : 0)
        ).toFixed(2),
      );
      if (confidence < 0.5) continue;
      suggestions.push({
        id: `match-${transaction.id}-${receivable.id}`,
        ownerId: input.state.userId,
        transactionId: transaction.id,
        receivableId: receivable.id,
        confidence,
        evidence: {
          amount: amountMatched
            ? "남은 금액과 일치"
            : `남은 금액 ${balance.remaining.toString()}원`,
          alias: aliasMatched ? "입금자 별칭과 일치" : "입금자 별칭 불일치",
          timing:
            days <= 7
              ? `수업일과 ${Math.round(days)}일 차이`
              : `수업일과 ${Math.round(days)}일 차이`,
        },
        status: "suggested",
        confirmedAt: null,
        dismissedAt: null,
      });
    }
  }
  return suggestions.sort((left, right) => right.confidence - left.confidence);
}

export function sanitizeSpreadsheetCell(value: string) {
  const cleaned = value.trim();
  return /^[=+\-@]/.test(cleaned) ? `'${cleaned}` : cleaned;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      cells.push(value);
      value = "";
    } else value += character;
  }
  cells.push(value);
  if (quoted) throw new Error("닫히지 않은 CSV 따옴표가 있어요.");
  return cells;
}

function stableFingerprint(parts: readonly string[]) {
  let hash = 2_166_136_261;
  for (const character of parts.join("\u001f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `csv-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export type CsvPreviewRow = {
  rowNumber: number;
  occurredAt: string;
  direction: TransactionDirection;
  amount: Krw;
  counterparty: string | null;
  descriptor: string | null;
  fingerprint: string;
  duplicate: boolean;
};

export function previewTransactionCsv(
  csv: string,
  existingFingerprints: ReadonlySet<string>,
): CsvPreviewRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) throw new Error("헤더와 거래 한 줄 이상이 필요해요.");
  const header = parseCsvLine(lines[0]!).map((cell) => cell.trim().toLowerCase());
  const required = ["occurred_at", "direction", "amount", "counterparty", "descriptor"];
  for (const column of required)
    if (!header.includes(column)) throw new Error(`필수 열이 없어요: ${column}`);
  const seen = new Set(existingFingerprints);
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const at = (name: string) => cells[header.indexOf(name)] ?? "";
    const occurredAt = at("occurred_at").trim();
    const direction = at("direction").trim() as TransactionDirection;
    const amountText = at("amount").replaceAll(",", "").trim();
    if (Number.isNaN(new Date(occurredAt).getTime()))
      throw new Error(`${index + 2}행 날짜를 확인해 주세요.`);
    if (direction !== "inflow" && direction !== "outflow")
      throw new Error(`${index + 2}행 방향은 inflow 또는 outflow여야 해요.`);
    const amount = toKrw(amountText.startsWith("-") ? amountText.slice(1) : amountText);
    if (amount <= 0n) throw new Error(`${index + 2}행 금액은 1원 이상이어야 해요.`);
    const counterparty = nonBlank(sanitizeSpreadsheetCell(at("counterparty")));
    const descriptor = nonBlank(sanitizeSpreadsheetCell(at("descriptor")));
    const fingerprint = stableFingerprint([
      occurredAt,
      direction,
      amount.toString(),
      counterparty ?? "",
      descriptor ?? "",
    ]);
    const duplicate = seen.has(fingerprint);
    seen.add(fingerprint);
    return {
      rowNumber: index + 2,
      occurredAt: new Date(occurredAt).toISOString(),
      direction,
      amount,
      counterparty,
      descriptor,
      fingerprint,
      duplicate,
    };
  });
}

export interface BankProvider {
  kind: BankProviderKind;
  import(csv: string, existingFingerprints: ReadonlySet<string>): CsvPreviewRow[];
}

export function bankProvider(kind: BankProviderKind): BankProvider {
  if (kind === "manual_csv") return { kind, import: previewTransactionCsv };
  if (kind === "mock")
    return { kind, import: (csv, existing) => previewTransactionCsv(csv, existing) };
  return {
    kind,
    import: () => {
      throw new Error(
        `${kind === "kftc_testbed" ? "KFTC 테스트베드" : "KFTC 운영"} 자격증명이 연결되지 않았어요.`,
      );
    },
  };
}
