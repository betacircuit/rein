import Link from "next/link";
import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import {
  formatSubscriptionDate,
  occurrenceStatusLabels,
  SubscriptionNav,
} from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { addDateDays } from "@/domain/subscriptions/model";
import { formatSeoulDateKey } from "@/lib/format/date";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export const metadata = { title: "구독 청구 일정 | 돈" };

export default async function SubscriptionCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const state = await readDemoSubscriptionState();
  if (!state) redirect("/login?next=/money/subscriptions/calendar");
  const { range = "30" } = await searchParams;
  const today = formatSeoulDateKey();
  const [year, month] = today.split("-").map(Number);
  const monthEnd = `${today.slice(0, 7)}-${String(new Date(Date.UTC(year ?? 0, month ?? 1, 0)).getUTCDate()).padStart(2, "0")}`;
  const until =
    range === "month"
      ? monthEnd
      : addDateDays(today, range === "7" ? 7 : range === "365" ? 365 : 30);
  const occurrences = state.occurrences
    .filter((item) => item.dueOn >= today && item.dueOn <= until && item.status !== "skipped")
    .sort((left, right) => left.dueOn.localeCompare(right.dueOn));

  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="청구 일정" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">결제 일정</p>
          <h1 className="mt-2 text-3xl font-black">청구 예정 일정</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
            원본 구독에서 생성된 발생분입니다. 실제 출금과 연결되기 전에는 돈의 흐름으로 계산하지
            않아요.
          </p>
        </div>
        <form className="flex flex-wrap gap-2" method="get">
          <label className="sr-only" htmlFor="calendar-range">
            기간
          </label>
          <select
            className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-white px-3 text-sm font-bold"
            defaultValue={range}
            id="calendar-range"
            name="range"
          >
            <option value="month">이번 달</option>
            <option value="7">7일</option>
            <option value="30">30일</option>
            <option value="365">1년</option>
          </select>
          <Button type="submit" variant="outline">
            보기
          </Button>
        </form>
      </header>
      <section className="relative mt-6 space-y-3 before:absolute before:top-4 before:bottom-4 before:left-[1.15rem] before:w-px before:bg-[var(--line-strong)] sm:before:left-[1.4rem]">
        {occurrences.map((item) => {
          const subscription = state.subscriptions.find(
            (candidate) => candidate.id === item.subscriptionId,
          );
          if (!subscription) return null;
          return (
            <article className="relative flex gap-4" key={item.id}>
              <span
                aria-hidden="true"
                className="z-10 mt-5 size-9 shrink-0 rounded-full border-[10px] border-[var(--canvas)] bg-[var(--accent-dark)] sm:size-11"
              />
              <Link
                className="min-w-0 flex-1 rounded-3xl border border-[var(--line)] bg-white p-5 focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                href={`/money/subscriptions/${subscription.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--accent-dark)]">
                      {formatSubscriptionDate(item.dueOn)}
                    </p>
                    <h2 className="mt-1 text-lg font-black">{subscription.name}</h2>
                    <p className="mt-1 text-xs text-[var(--muted-ink)]">
                      {occurrenceStatusLabels[item.status]} ·{" "}
                      {subscription.scope === "household" ? "우리집" : "개인"}
                    </p>
                  </div>
                  <p className="font-black tabular-nums">{formatKrw(item.expectedAmount)}</p>
                </div>
              </Link>
            </article>
          );
        })}
        {occurrences.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
            <p className="font-black">이 기간에 예정된 청구가 없어요.</p>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              구독을 등록하면 결제 예정일을 이곳에서 확인할 수 있어요.
            </p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-extrabold text-[var(--accent-dark)] underline underline-offset-4"
              href="/money/subscriptions/new"
            >
              첫 구독 등록
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
