import { Edit3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import {
  categoryLabels,
  cycleLabels,
  formatSubscriptionDate,
  occurrenceStatusLabels,
  statusLabels,
  SubscriptionNav,
} from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export default async function SubscriptionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [state, money] = await Promise.all([readDemoSubscriptionState(), readDemoMoneyState()]);
  if (!state || !money) redirect("/login?next=/money/subscriptions");
  const { subscriptionId } = await params;
  const query = await searchParams;
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) notFound();
  const account = money.accounts.find((item) => item.id === subscription.paymentAccountId);
  const payer = state.members.find((item) => item.id === subscription.payerMemberId);
  const splits = state.splits.filter((item) => item.subscriptionId === subscription.id);
  const history = state.priceHistory
    .filter((item) => item.subscriptionId === subscription.id)
    .sort((left, right) => right.effectiveOn.localeCompare(left.effectiveOn));
  const occurrences = state.occurrences
    .filter((item) => item.subscriptionId === subscription.id)
    .sort((left, right) => right.dueOn.localeCompare(left.dueOn));

  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="대시보드" />
      {query.saved && (
        <p
          className="mb-5 rounded-2xl bg-[var(--success-wash)] p-4 text-sm font-bold text-[var(--success-ink)]"
          role="status"
        >
          구독을 저장했어요.
        </p>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-black text-[var(--accent-dark)]">
              {statusLabels[subscription.status]}
            </span>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--muted-ink)]">
              {subscription.scope === "household" ? "우리집" : "개인"}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{subscription.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            {subscription.providerName ?? "제공사 미입력"} ·{" "}
            {subscription.planName ?? "요금제 미입력"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/money/subscriptions/${subscription.id}/edit`}>
            <Edit3 aria-hidden="true" className="size-4" />
            수정
          </Link>
        </Button>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <p className="text-3xl font-black tabular-nums">{formatKrw(subscription.amount)}</p>
          <p className="mt-1 text-sm text-[var(--muted-ink)]">
            {cycleLabels[subscription.billingCycle]}
            {subscription.billingCycle === "custom_days"
              ? ` · ${subscription.customCycleDays}일`
              : ""}{" "}
            · {categoryLabels[subscription.category]}
          </p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <Info label="다음 결제일" value={formatSubscriptionDate(subscription.nextBillingOn)} />
            <Info label="자동 갱신" value={subscription.autoRenews ? "사용" : "사용 안 함"} />
            <Info
              label="결제 계좌"
              value={account ? `${account.nickname} · ${account.institutionName}` : "지정 안 함"}
            />
            <Info
              label="결제자"
              value={payer?.name ?? (subscription.scope === "private" ? "나" : "미지정")}
            />
            <Info
              label="체험 종료"
              value={
                subscription.trialEndsOn ? formatSubscriptionDate(subscription.trialEndsOn) : "없음"
              }
            />
            <Info
              label="해지 권장일"
              value={
                subscription.cancelByOn ? formatSubscriptionDate(subscription.cancelByOn) : "없음"
              }
            />
            <Info
              label="마지막 사용 기록"
              value={
                subscription.lastUsedOn
                  ? formatSubscriptionDate(subscription.lastUsedOn)
                  : "기록 안 함"
              }
            />
            <Info
              label="알림"
              value={
                subscription.reminderDaysBefore.length
                  ? `${subscription.reminderDaysBefore.join(", ")}일 전`
                  : "없음"
              }
            />
          </dl>
          {subscription.serviceUrl && (
            <a
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[var(--accent-dark)]"
              href={subscription.serviceUrl}
              rel="noreferrer"
              target="_blank"
            >
              서비스 열기
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          )}
          {subscription.notes && (
            <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--muted-ink)]">
              {subscription.notes}
            </p>
          )}
        </article>
        <aside className="rounded-3xl bg-[var(--ink)] p-5 text-white sm:p-6">
          <p className="text-xs font-bold text-white/65">거래 매칭 패턴</p>
          <p className="mt-3 font-black">
            {subscription.descriptorAliases.length
              ? subscription.descriptorAliases.join(" · ")
              : "등록된 패턴 없음"}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/70">
            금액, 거래명, 결제 계좌, 날짜가 일치해도 자동 확정하지 않습니다.
          </p>
          {subscription.scope === "household" && (
            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="text-xs font-bold text-white/65">우리집 분담</p>
              {splits.map((split) => (
                <p className="mt-2 flex justify-between text-sm" key={split.memberId}>
                  <span>{state.members.find((item) => item.id === split.memberId)?.name}</span>
                  <strong className="tabular-nums">{split.shareBasisPoints / 100}%</strong>
                </p>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">가격 이력</h2>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {history.map((item) => (
            <div className="flex flex-wrap items-center justify-between gap-2 py-3" key={item.id}>
              <span className="text-sm">
                <strong>{formatSubscriptionDate(item.effectiveOn)}부터</strong>
                <span className="ml-2 text-[var(--muted-ink)]">{item.note ?? "메모 없음"}</span>
              </span>
              <span className="font-black tabular-nums">{formatKrw(item.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">청구 발생분</h2>
          <Link
            className="text-sm font-extrabold text-[var(--accent-dark)]"
            href="/money/subscriptions/calendar"
          >
            전체 일정
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="text-xs text-[var(--muted-ink)]">
              <tr>
                <th className="pb-3">예정일</th>
                <th className="pb-3">기간</th>
                <th className="pb-3">상태</th>
                <th className="pb-3 text-right">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {occurrences.map((item) => {
                const shared = state.sharedExpenses.find(
                  (expense) => expense.occurrenceId === item.id,
                );
                return (
                  <tr key={item.id}>
                    <td className="py-3 font-bold">{formatSubscriptionDate(item.dueOn)}</td>
                    <td className="py-3 text-[var(--muted-ink)]">
                      {item.periodStart}–{item.periodEnd}
                    </td>
                    <td className="py-3">
                      <span>{occurrenceStatusLabels[item.status]}</span>
                      {item.matchedTransactionId && (
                        <Link
                          className="ml-2 font-extrabold text-[var(--accent-dark)]"
                          href={`/money/transactions/${item.matchedTransactionId}`}
                        >
                          실제 거래
                        </Link>
                      )}
                      {shared && (
                        <span className="ml-2 text-xs text-[var(--muted-ink)]">공동지출 1건</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-black tabular-nums">
                      {formatKrw(item.expectedAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--muted-ink)]">{label}</dt>
      <dd className="mt-1 font-extrabold">{value}</dd>
    </div>
  );
}
