import { requireSupabaseUser } from "@/lib/supabase/server";

export type RemoteAccount = {
  id: string;
  nickname: string;
  institutionName: string;
  currentBalance: number;
};
export type RemoteMoneyCategory = {
  id: string;
  code: string;
  displayName: string;
  kind: "income" | "expense";
};
export type RemoteTransaction = {
  id: string;
  accountId: string;
  accountName: string;
  categoryCode: string;
  categoryName: string;
  kind: "income" | "expense" | "transfer";
  direction: "inflow" | "outflow";
  amount: number;
  occurredAt: string;
  counterparty: string | null;
  descriptor: string | null;
  memo: string | null;
  source: "manual" | "mock_sync" | "manual_csv" | "bank_sync" | "system";
  studentId: string | null;
};

const transactionColumns =
  "id, account_id, category_id, kind, direction, amount, occurred_at, counterparty, descriptor, memo, source, student_id";

function mapTransaction(
  row: Record<string, unknown>,
  accountNames: Map<string, string>,
  categoryById: Map<string, RemoteMoneyCategory>,
): RemoteTransaction {
  const category = categoryById.get(String(row.category_id));
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    accountName: accountNames.get(String(row.account_id)) ?? "계좌",
    categoryCode: category?.code ?? "",
    categoryName: category?.displayName ?? "기타",
    kind: row.kind as RemoteTransaction["kind"],
    direction: row.direction as RemoteTransaction["direction"],
    amount: Number(row.amount ?? 0),
    occurredAt: String(row.occurred_at),
    counterparty: row.counterparty ? String(row.counterparty) : null,
    descriptor: row.descriptor ? String(row.descriptor) : null,
    memo: row.memo ? String(row.memo) : null,
    source: row.source as RemoteTransaction["source"],
    studentId: row.student_id ? String(row.student_id) : null,
  };
}

export async function readRemoteMoneyData() {
  const auth = await requireSupabaseUser();
  if (!auth) return null;
  const [accountsResult, categoriesResult, transactionsResult] = await Promise.all([
    auth.supabase
      .from("accounts")
      .select("id, nickname, institution_name, current_balance")
      .eq("is_active", true)
      .order("created_at"),
    auth.supabase
      .from("transaction_categories")
      .select("id, code, display_name, kind")
      .eq("is_active", true)
      .order("sort_order"),
    auth.supabase
      .from("financial_transactions")
      .select(transactionColumns)
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);
  if (accountsResult.error || categoriesResult.error || transactionsResult.error)
    throw new Error("수입·지출 데이터를 불러오지 못했습니다.");
  const accounts: RemoteAccount[] = (accountsResult.data ?? []).map((row) => ({
    id: String(row.id),
    nickname: String(row.nickname),
    institutionName: String(row.institution_name),
    currentBalance: Number(row.current_balance ?? 0),
  }));
  const categories: RemoteMoneyCategory[] = (categoriesResult.data ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    displayName: String(row.display_name),
    kind: row.kind as RemoteMoneyCategory["kind"],
  }));
  const accountNames = new Map(accounts.map((item) => [item.id, item.nickname]));
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const transactions: RemoteTransaction[] = (transactionsResult.data ?? []).map((row) =>
    mapTransaction(row as Record<string, unknown>, accountNames, categoryById),
  );
  return { ...auth, accounts, categories, transactions };
}

export async function readRemoteTransaction(transactionId: string) {
  const auth = await requireSupabaseUser();
  if (!auth) return null;
  const [transactionResult, accountsResult, categoriesResult] = await Promise.all([
    auth.supabase
      .from("financial_transactions")
      .select(transactionColumns)
      .eq("id", transactionId)
      .maybeSingle(),
    auth.supabase.from("accounts").select("id, nickname"),
    auth.supabase
      .from("transaction_categories")
      .select("id, code, display_name, kind")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (transactionResult.error || accountsResult.error || categoriesResult.error) {
    throw new Error("거래 정보를 불러오지 못했습니다.");
  }
  const categories: RemoteMoneyCategory[] = (categoriesResult.data ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    displayName: String(row.display_name),
    kind: row.kind as RemoteMoneyCategory["kind"],
  }));
  if (!transactionResult.data) return { ...auth, transaction: null, categories };
  const accountNames = new Map(
    (accountsResult.data ?? []).map((row) => [String(row.id), String(row.nickname)]),
  );
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  return {
    ...auth,
    categories,
    transaction: mapTransaction(
      transactionResult.data as Record<string, unknown>,
      accountNames,
      categoryById,
    ),
  };
}
