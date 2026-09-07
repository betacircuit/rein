import { ArrowRight, CalendarClock, CircleAlert, Plus, ScanSearch, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { dismissSubscriptionInsightAction } from "@/app/money/subscriptions/actions";
import {
  categoryLabels,
  cycleLabels,
  formatSubscriptionDate,
  statusLabels,
  SubscriptionNav,
} from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { deterministicSubscriptionInsights } from "@/domain/grow/model";
import { subscriptionCategories, subscriptionDashboard } from "@/domain/subscriptions/model";
import { readDemoGrowState } from "@/lib/grow/demo-store";
import { formatSeoulDateKey } from "@/lib/format/date";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export const metadata = { title: "구독 | 돈" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; category?: string; status?: string }>;
}) {
  const grow = await readDemoGrowState();
  const state = await readDemoSubscriptionState();
  if (!state || !grow) redirect("/login?next=/money/subscriptions");
  const query = await searchParams;
  const summary = subscriptionDashboard(state, formatSeoulDateKey());
  const occurrenceIds =
    query.view === "due7"
      ? new Set(summary.due7.map((item) => item.subscriptionId))
      : query.view === "due30"
        ? new Set(summary.due30.map((item) => item.subscriptionId))
        : query.view === "trial"
          ? new Set(summary.trials.map((item) => item.id))
          : query.view === "unmatched"
            ? new Set(summary.unmatched.map((item) => item.subscriptionId))
            : query.view === "overdue"
              ? new Set(summary.overdue.map((item) => item.subscriptionId))
              : null;
  const filtered = state.subscriptions.filter(
    (item) =>
      (!occurrenceIds || occurrenceIds.has(item.id)) &&
      (!query.category || item.category === query.category) &&
      (!query.status || item.status === query.status),
  );
  const pendingMatches = state.suggestions.filter((item) => item.status === "suggested").length;
  const insights = deterministicSubscriptionInsights(state).filter(
    (item) => !grow.dismissedInsightIds.includes(item.id),
  );
  const summaryCards: Array<{ label: string; value: string; helper: string; href: Route }> = [
    {
      label: "월 환산",
      value: formatKrw(summary.monthlyEquivalent),
      helper: "주기별 금액을 한 달 기준으로 정규화",
      href: "/money/subscriptions",
    },
    {
      label: "향후 1년 청구",
      value: formatKrw(summary.annualProjection),
      helper: "생성된 미결 청구 예정 건 합계",
      href: "/money/subscriptions/calendar?range=365",
    },
    {
      label: "7일 안에 갱신",
      value: `${summary.due7.length}건`,
      helper: "오늘부터 7일, 연체 제외",
      href: "/money/subscriptions?view=due7",
    },
    {
      label: "확인할 매칭",
      value: `${pendingMatches}건`,
      helper: "금액·표기·계좌·시점 근거",
      href: "/money/subscriptions/matches",
    },
  ];

  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="대시보드" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">
            Subscriptions · Asia/Seoul
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            갱신 전에 보고, 결제 뒤에 확인해요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
            월 환산액은 비교용이고 연간 전망은 생성된 실제 청구 예정 건만 합산합니다. 거래 매칭은
            직접 확정하기 전까지 제안으로만 남아요.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/money/subscriptions/new">
            <Plus aria-hidden="true" className="size-4" />
            구독 추가
          </Link>
        </Button>
      </header>

      <section aria-label="구독 요약" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, helper, href }) => (
          <Link
            className="group rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
            href={href}
            key={label}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--muted-ink)]">{label}</p>
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-[var(--muted-ink)] transition-transform group-hover:translate-x-1"
              />
            </div>
            <p className="mt-2 text-2xl font-black tracking-[-0.04em] tabular-nums">{value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted-ink)]">{helper}</p>
          </Link>
        ))}
      </section>

      <section aria-label="주의할 구독" className="mt-4 grid gap-3 sm:grid-cols-3">
        <AttentionCard
          href="/money/subscriptions?view=trial"
          icon={Sparkles}
          label={`체험 종료 ${summary.trials.length}건`}
          helper="30일 안에 종료"
        />
        <AttentionCard
          href="/money/subscriptions?view=unmatched"
          icon={ScanSearch}
          label={`미연결 ${summary.unmatched.length}건`}
          helper="지난 청구 중 거래 없음"
        />
        <AttentionCard
          danger
          href="/money/subscriptions?view=overdue"
          icon={CircleAlert}
          label={`연체 확인 ${summary.overdue.length}건`}
          helper="예정일이 지난 미결 건"
        />
      </section>

      <section
        className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--accent-wash)] p-5 sm:p-6"
        aria-labelledby="subscription-insights-title"
      >
        <div className="flex items-start gap-3">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[var(--accent-dark)]"
          />
          <div>
            <h2 className="text-lg font-black" id="subscription-insights-title">
              내 기록으로 만든 검토 신호
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
              외부 추천이나 이용량 추정 없이, 저장된 분류와 직접 표시한 유지 판단만 사용합니다.
            </p>
          </div>
        </div>
        {insights.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {insights.map((insight) => (
              <article className="rounded-2xl bg-white p-4" key={insight.id}>
                <h3 className="font-black">{insight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
                  {insight.explanation}
                </p>
                <div className="mt-3 flex flex-wrap gap-2" aria-label="근거 구독">
                  {insight.subscriptionIds.map((id) => {
                    const subscription = state.subscriptions.find((item) => item.id === id);
                    return subscription ? (
                      <Link
                        className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--accent-dark)]"
                        href={`/money/subscriptions/${id}`}
                        key={id}
                      >
                        {subscription.name} 원본 보기
                      </Link>
                    ) : null;
                  })}
                </div>
                <form action={dismissSubscriptionInsightAction} className="mt-4">
                  <input name="insightId" type="hidden" value={insight.id} />
                  <Button type="submit" variant="outline">
                    이 신호 숨기기
                  </Button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-[var(--muted-ink)]">
            새로 확인할 검토 신호가 없어요.
          </p>
        )}
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">구독 목록</h2>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">{filtered.length}개 표시</p>
          </div>
          <form className="flex flex-wrap gap-2" method="get">
            {query.view && <input name="view" type="hidden" value={query.view} />}
            <label className="sr-only" htmlFor="subscription-category">
              분류
            </label>
            <select
              className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-white px-3 text-sm font-bold"
              defaultValue={query.category ?? ""}
              id="subscription-category"
              name="category"
            >
              <option value="">모든 분류</option>
              {subscriptionCategories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="subscription-status">
              상태
            </label>
            <select
              className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-white px-3 text-sm font-bold"
              defaultValue={query.status ?? ""}
              id="subscription-status"
              name="status"
            >
              <option value="">모든 상태</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              필터 적용
            </Button>
          </form>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => {
            const next = state.occurrences
              .filter(
                (occurrence) =>
                  occurrence.subscriptionId === item.id &&
                  (occurrence.status === "scheduled" || occurrence.status === "unmatched"),
              )
              .sort((left, right) => left.dueOn.localeCompare(right.dueOn))[0];
            return (
              <Link
                className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                href={`/money/subscriptions/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-black text-[var(--accent-dark)]">
                    {statusLabels[item.status]}
                  </span>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--muted-ink)]">
                    {item.scope === "household" ? "우리집" : "개인"}
                  </span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black">{item.name}</h3>
                    <p className="mt-1 text-sm text-[var(--muted-ink)]">
                      {item.providerName ?? "제공사 미입력"} · {categoryLabels[item.category]}
                    </p>
                  </div>
                  <p className="shrink-0 font-black tabular-nums">{formatKrw(item.amount)}</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted-ink)]">
                  <span>
                    {cycleLabels[item.billingCycle]}
                    {item.billingCycle === "custom_days" ? ` ${item.customCycleDays}일` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold">
                    <CalendarClock aria-hidden="true" className="size-4" />
                    {next
                      ? `${formatSubscriptionDate(next.dueOn)} ${next.status === "unmatched" ? "미연결" : "예정"}`
                      : "예정 없음"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="mt-4 rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
            <p className="font-black">조건에 맞는 구독이 없어요.</p>
            <Link
              className="mt-3 inline-block text-sm font-extrabold text-[var(--accent-dark)]"
              href="/money/subscriptions"
            >
              필터 초기화
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function AttentionCard({
  href,
  icon: Icon,
  label,
  helper,
  danger = false,
}: {
  href: Route;
  icon: typeof Sparkles;
  label: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <Link
      className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 ${danger ? "border-[var(--danger-line)] bg-[var(--danger-wash)]" : "border-[var(--line)] bg-white"}`}
      href={href}
    >
      <Icon
        aria-hidden="true"
        className={`size-5 ${danger ? "text-[var(--danger-ink)]" : "text-[var(--accent-dark)]"}`}
      />
      <span>
        <span className={`block text-sm font-black ${danger ? "text-[var(--danger-ink)]" : ""}`}>
          {label}
        </span>
        <span
          className={`mt-1 block text-xs ${danger ? "text-[var(--danger-ink)]" : "text-[var(--muted-ink)]"}`}
        >
          {helper}
        </span>
      </span>
    </Link>
  );
}
