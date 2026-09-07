import { Check, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import {
  confirmSubscriptionMatchAction,
  dismissSubscriptionMatchAction,
} from "@/app/money/subscriptions/actions";
import { formatSubscriptionDate, SubscriptionNav } from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export const metadata = { title: "구독 거래 매칭 | 돈" };

export default async function SubscriptionMatchesPage() {
  const [state, money] = await Promise.all([readDemoSubscriptionState(), readDemoMoneyState()]);
  if (!state || !money) redirect("/login?next=/money/subscriptions/matches");
  const pending = state.suggestions.filter((item) => item.status === "suggested");
  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="거래 매칭" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">결제 연결</p>
        <h1 className="mt-2 text-3xl font-black">실제 출금 연결 검토</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          제안은 읽기 전용 단서입니다. 확정해야 청구가 결제 완료로 바뀌며, 기존 거래를 재사용하므로
          지출을 중복 생성하지 않아요.
        </p>
      </header>
      <section className="mt-6 space-y-4">
        {pending.map((suggestion) => {
          const transaction = money.transactions.find(
            (item) => item.id === suggestion.transactionId,
          );
          const occurrence = state.occurrences.find((item) => item.id === suggestion.occurrenceId);
          const subscription = state.subscriptions.find(
            (item) => item.id === occurrence?.subscriptionId,
          );
          if (!transaction || !occurrence || !subscription) return null;
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
                    {transaction.counterparty || transaction.descriptor || "출금"} →{" "}
                    {subscription.name}
                  </h2>
                  <p className="mt-2 text-2xl font-black tabular-nums">
                    {formatKrw(transaction.amount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-ink)]">
                    청구 예정 {formatSubscriptionDate(occurrence.dueOn)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={dismissSubscriptionMatchAction}>
                    <input name="suggestionId" type="hidden" value={suggestion.id} />
                    <Button type="submit" variant="ghost">
                      <X aria-hidden="true" className="size-4" />
                      제외
                    </Button>
                  </form>
                  <ConfirmActionForm
                    action={confirmSubscriptionMatchAction}
                    confirmMessage="이 출금을 구독 결제로 연결할까요? 청구 예정 건이 결제 완료로 바뀝니다."
                  >
                    <input name="suggestionId" type="hidden" value={suggestion.id} />
                    <Button type="submit" variant="accent">
                      <Check aria-hidden="true" className="size-4" />
                      확정
                    </Button>
                  </ConfirmActionForm>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(suggestion.evidence).map(([key, value]) => (
                  <div className="rounded-2xl bg-[var(--surface-muted)] p-4" key={key}>
                    <dt className="text-xs font-bold text-[var(--muted-ink)]">
                      {key === "amount"
                        ? "금액"
                        : key === "descriptor"
                          ? "거래명"
                          : key === "account"
                            ? "계좌"
                            : "시점"}
                    </dt>
                    <dd className="mt-2 text-sm font-extrabold">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
        {pending.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
            <p className="font-black">검토할 구독 매칭이 없어요.</p>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              확정하거나 제외한 제안은 자동으로 다시 적용되지 않습니다. 새 출금 내역을 가져오면 다시
              비교할 수 있어요.
            </p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-extrabold text-[var(--accent-dark)] underline underline-offset-4"
              href="/money/transactions/import"
            >
              거래 내역 가져오기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
