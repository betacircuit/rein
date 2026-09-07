import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SharedExpenseForm } from "@/app/household/expenses/shared-expense-form";
import { HouseholdNav, MemberName } from "@/app/household/household-ui";
import { voidSharedExpenseAction } from "@/app/household/shared-money-actions";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import {
  SharedExpenseStatusBadge,
  sharedExpenseCategoryLabel,
} from "@/app/household/shared-money-ui";
import { formatKrw } from "@/domain/money/krw";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export default async function SharedExpenseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const state = await readDemoSharedMoneyState();
  const money = await readDemoMoneyState();
  if (!state || !money) redirect("/login?next=/household/expenses");
  const { expenseId } = await params;
  const query = await searchParams;
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) notFound();
  const linked = new Set(
    state.expenses
      .filter((item) => item.id !== expense.id)
      .map((item) => item.linkedTransactionId)
      .filter(Boolean),
  );
  const transactions = money.transactions.filter(
    (transaction) =>
      transaction.id === expense.linkedTransactionId ||
      (transaction.kind === "expense" &&
        transaction.direction === "outflow" &&
        !linked.has(transaction.id)),
  );
  const editable = expense.sourceKind !== "subscription" && expense.status !== "void";

  return (
    <div>
      <HouseholdNav current="공동비" />
      {query.saved && (
        <p
          className="mb-5 rounded-2xl bg-[var(--accent-wash)] p-4 text-sm font-bold text-[var(--accent-dark)]"
          role="status"
        >
          공동비와 정확한 분담액을 저장했어요.
        </p>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black">{expense.description}</h1>
            <SharedExpenseStatusBadge status={expense.status} />
          </div>
          <p className="mt-3 text-sm text-[var(--muted-ink)]">
            {sharedExpenseCategoryLabel[expense.category]} · 실제 결제{" "}
            <MemberName memberId={expense.payerMemberId} members={state.members} /> ·{" "}
            {formatKrw(expense.amount)}
          </p>
        </div>
        {editable && (
          <ConfirmActionForm
            action={voidSharedExpenseAction}
            confirmMessage="이 공동비 기록을 취소할까요? 정산 잔액에서 제외되며 원본 거래는 유지됩니다."
          >
            <input name="expenseId" type="hidden" value={expense.id} />
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--danger-line)] px-4 text-sm font-extrabold text-[var(--danger-ink)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
              type="submit"
            >
              <Trash2 aria-hidden="true" className="size-4" /> 기록 취소
            </button>
          </ConfirmActionForm>
        )}
      </header>

      <section aria-labelledby="confirmed-split-heading" className="mt-6">
        <h2 className="sr-only" id="confirmed-split-heading">
          확정 분담
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {expense.splits.map((split) => (
            <article
              className="rounded-3xl border border-[var(--line)] bg-white p-5"
              key={split.memberId}
            >
              <p className="text-xs font-bold text-[var(--muted-ink)]">
                <MemberName memberId={split.memberId} members={state.members} /> 부담
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums">{formatKrw(split.amount)}</p>
            </article>
          ))}
        </div>
      </section>

      {expense.linkedTransactionId && (
        <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm font-bold">
          내 거래 원장과 한 번만 연결됨 · 룸메이트에게는 계좌와 거래 상세를 숨깁니다.{" "}
          <Link
            className="inline-flex items-center gap-1 text-[var(--accent-dark)] underline"
            href={`/money/transactions/${expense.linkedTransactionId}`}
          >
            내 거래 보기 <ExternalLink aria-hidden="true" className="size-3" />
          </Link>
        </p>
      )}

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        {editable ? (
          <SharedExpenseForm
            expense={expense}
            members={state.members}
            transactions={transactions}
          />
        ) : (
          <div>
            <h2 className="text-lg font-black">원천에서 관리하는 기록</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
              구독 연결분은 금액을 복사하지 않습니다. 구독 발생분과 거래 연결을 수정하면 이 원천
              행도 함께 갱신됩니다.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-extrabold text-[var(--accent-dark)]"
              href="/money/subscriptions"
            >
              구독으로 이동
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
