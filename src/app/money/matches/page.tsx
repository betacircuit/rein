import { Check, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { confirmMatchAction, dismissMatchAction } from "@/app/money/actions";
import { MoneyNav } from "@/app/money/money-ui";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export const metadata = { title: "입금 매칭 | 돈" };
export default async function MatchesPage() {
  const [state, tutoring] = await Promise.all([readDemoMoneyState(), readDemoTutoringState()]);
  if (!state) redirect("/login?next=/money/matches");
  const pending = state.suggestions.filter((item) => item.status === "suggested");
  return (
    <div>
      <MoneyNav current="받을 돈" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">입금 연결</p>
        <h1 className="mt-2 text-3xl font-black">입금 매칭 검토</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          금액, 입금자 별칭, 수업일과의 거리는 제안 근거일 뿐입니다. 확정 버튼을 누르기 전에는
          원장이 바뀌지 않아요.
        </p>
      </header>
      <section className="mt-6 space-y-4">
        {pending.length === 0 ? (
          <div className="rounded-3xl border border-[var(--line)] bg-white p-8 text-center">
            <p className="font-black">검토할 제안이 없어요.</p>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              확정하거나 제외한 제안은 다시 자동 적용되지 않습니다. 새 입금 내역을 가져오면 다시
              비교할 수 있어요.
            </p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-extrabold text-[var(--accent-dark)] underline underline-offset-4"
              href="/money/transactions/import"
            >
              거래 내역 가져오기
            </Link>
          </div>
        ) : (
          pending.map((suggestion) => {
            const transaction = state.transactions.find(
              (item) => item.id === suggestion.transactionId,
            );
            const receivable = state.receivables.find(
              (item) => item.id === suggestion.receivableId,
            );
            const student = tutoring?.students.find((item) => item.id === receivable?.studentId);
            if (!transaction || !receivable) return null;
            return (
              <article
                className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
                key={suggestion.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-black text-[var(--accent-dark)]">
                      신뢰도 {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <h2 className="mt-4 text-xl font-black">
                      {transaction.counterparty || "입금자 없음"} → {student?.name ?? "학생"} 과외비
                    </h2>
                    <p className="mt-2 text-2xl font-black tabular-nums">
                      {formatKrw(transaction.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={dismissMatchAction}>
                      <input name="suggestionId" type="hidden" value={suggestion.id} />
                      <Button type="submit" variant="ghost">
                        <X aria-hidden="true" className="size-4" />
                        제외
                      </Button>
                    </form>
                    <ConfirmActionForm
                      action={confirmMatchAction}
                      confirmMessage="이 입금을 과외비로 연결할까요? 연결 금액이 받을 돈 잔액에 반영됩니다."
                    >
                      <input name="suggestionId" type="hidden" value={suggestion.id} />
                      <Button type="submit" variant="accent">
                        <Check aria-hidden="true" className="size-4" />
                        확정
                      </Button>
                    </ConfirmActionForm>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  {Object.entries(suggestion.evidence).map(([key, value]) => (
                    <div className="rounded-2xl bg-[var(--surface-muted)] p-4" key={key}>
                      <dt className="text-xs font-bold text-[var(--muted-ink)]">
                        {key === "amount" ? "금액" : key === "alias" ? "입금자" : "시점"}
                      </dt>
                      <dd className="mt-2 text-sm font-extrabold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
