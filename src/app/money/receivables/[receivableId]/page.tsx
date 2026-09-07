import { notFound, redirect } from "next/navigation";

import { allocateReceivableAction } from "@/app/money/actions";
import { formatMoneyDate, MoneyNav, receivableStatusLabel } from "@/app/money/money-ui";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { receivableBalance } from "@/domain/money/ledger";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export default async function ReceivableDetailPage({
  params,
}: {
  params: Promise<{ receivableId: string }>;
}) {
  const [state, tutoring] = await Promise.all([readDemoMoneyState(), readDemoTutoringState()]);
  if (!state) redirect("/login?next=/money/receivables");
  const { receivableId } = await params;
  const receivable = state.receivables.find((item) => item.id === receivableId);
  if (!receivable) notFound();
  const student = tutoring?.students.find((item) => item.id === receivable.studentId);
  const balance = receivableBalance(receivable, state.allocations);
  const allocations = state.allocations.filter((item) => item.receivableId === receivable.id);
  const candidates = state.transactions.filter(
    (transaction) =>
      transaction.kind === "income" &&
      transaction.direction === "inflow" &&
      state.allocations
        .filter((allocation) => allocation.transactionId === transaction.id)
        .reduce((sum, item) => sum + item.amount, 0n) < transaction.amount,
  );
  return (
    <div>
      <MoneyNav current="받을 돈" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">
          {receivableStatusLabel[receivable.status]}
        </p>
        <h1 className="mt-2 text-3xl font-black">{student?.name ?? "학생"} 과외비</h1>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          완료 수업과 받을 돈, 실제 입금은 서로 독립된 기록입니다.
        </p>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["발생", formatKrw(receivable.amountDue)],
          ["연결됨", formatKrw(balance.paid)],
          ["남음", formatKrw(balance.remaining)],
        ].map(([label, value]) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-4" key={label}>
            <p className="text-xs font-bold text-[var(--muted-ink)]">{label}</p>
            <p className="mt-2 text-xl font-black">{value}</p>
          </article>
        ))}
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">연결 내역</h2>
          <div className="mt-4 space-y-3">
            {allocations.length === 0 ? (
              <p className="text-sm text-[var(--muted-ink)]">아직 연결된 입금이 없어요.</p>
            ) : (
              allocations.map((allocation) => {
                const transaction = state.transactions.find(
                  (item) => item.id === allocation.transactionId,
                );
                return (
                  <article
                    className="rounded-2xl bg-[var(--surface-muted)] p-4"
                    key={allocation.id}
                  >
                    <p className="font-extrabold">
                      {transaction?.counterparty || transaction?.descriptor || "입금"}
                    </p>
                    <p className="mt-1 text-sm">{formatKrw(allocation.amount)}</p>
                    <p className="mt-1 text-xs text-[var(--muted-ink)]">
                      {transaction ? formatMoneyDate(transaction.occurredAt) : "거래 없음"}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>
        <section className="rounded-3xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">입금 직접 연결</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
            입금 한 건을 여러 받을 돈에 나눌 수 있지만, 입금액과 남은 받을 금액을 넘길 수 없어요.
          </p>
          {balance.remaining > 0n && candidates.length > 0 ? (
            <ConfirmActionForm
              action={allocateReceivableAction}
              className="mt-5 space-y-4"
              confirmMessage="선택한 입금과 금액을 이 받을 돈에 연결할까요?"
            >
              <input name="receivableId" type="hidden" value={receivable.id} />
              <label className="block text-sm font-extrabold">
                입금
                <select
                  className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3"
                  name="transactionId"
                >
                  {candidates.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.counterparty || transaction.descriptor || "입금"} ·{" "}
                      {formatKrw(transaction.amount)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-extrabold">
                연결 금액
                <input
                  className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3"
                  defaultValue={balance.remaining.toString()}
                  max={balance.remaining.toString()}
                  min="1"
                  name="amount"
                  type="number"
                />
              </label>
              <Button type="submit" variant="accent">
                입금 연결
              </Button>
            </ConfirmActionForm>
          ) : (
            <p className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
              {balance.remaining === 0n
                ? "전액 입금으로 연결됐어요."
                : "연결 가능한 입금이 없어요."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
