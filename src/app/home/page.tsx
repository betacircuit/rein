import { ArrowDownLeft, ArrowUpRight, CalendarDays, Target, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { formatKoreanDate, getSeoulWeekday } from "@/lib/format/date";
import { readRemoteTutoringData } from "@/lib/tutoring/remote-repository";
import { Button } from "@/components/ui/button";
import { readRemoteMoneyData } from "@/lib/money/remote-repository";
import { WeeklyTimetable } from "@/app/tutoring/schedule/weekly-timetable";

export const metadata = { title: "오늘" };

export default async function HomePage() {
  const [data, money] = await Promise.all([readRemoteTutoringData(), readRemoteMoneyData()]);
  if (!data || !money) redirect("/login");
  const now = new Date();
  const weekday = getSeoulWeekday(now);
  const todaySchedules = data.schedules
    .filter((schedule) => schedule.weekday === weekday)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dateLabel = formatKoreanDate(now, { month: "long", day: "numeric", weekday: "long" });
  const assetGoal = 100_000_000;
  const totalBalance = money.accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const assetRatio = Math.max(0, Math.min(100, (totalBalance / assetGoal) * 100));
  const latestCashflow = money.transactions.slice(0, 3);
  const won = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });

  return (
    <div className="rein-home-center">
      <header className="rein-section-head">
        <div>
          <h1 className="rein-title mt-2">오늘</h1>
          <p className="mt-4 font-black">{dateLabel}</p>
        </div>
        <Button asChild>
          <Link href="/tutoring/schedule">
            <CalendarDays aria-hidden="true" className="size-4" />주 시간표
          </Link>
        </Button>
      </header>

      <section className="rein-home-center__stats" aria-label="오늘 요약">
        <article>
          <CalendarDays aria-hidden="true" className="size-5" />
          <span>오늘 수업</span>
          <strong>{todaySchedules.length}개</strong>
        </article>
        <article className="rein-home-center__asset-goal">
          <Target aria-hidden="true" className="size-5" />
          <span>전체 자산 목표</span>
          <strong>{won.format(assetGoal)}</strong>
          <div
            aria-label={`현재 총액 목표 대비 ${assetRatio.toFixed(1)}%`}
            className="rein-asset-ratio"
          >
            <span style={{ width: `${assetRatio}%` }} />
          </div>
          <small>
            현재 {won.format(totalBalance)} · {assetRatio.toFixed(1)}%
          </small>
        </article>
        <article className="rein-home-center__cashflow">
          <WalletCards aria-hidden="true" className="size-5" />
          <span>최신 현금흐름 3개</span>
          <ol>
            {latestCashflow.length ? (
              latestCashflow.map((transaction) => (
                <li key={transaction.id}>
                  {transaction.kind === "income" ? (
                    <ArrowDownLeft aria-hidden="true" />
                  ) : (
                    <ArrowUpRight aria-hidden="true" />
                  )}
                  <span>
                    {transaction.counterparty || transaction.descriptor || transaction.categoryName}
                  </span>
                  <strong>
                    {transaction.kind === "income" ? "+" : "−"}
                    {won.format(transaction.amount)}
                  </strong>
                </li>
              ))
            ) : (
              <li>
                <span>거래 기록 없음</span>
              </li>
            )}
          </ol>
        </article>
      </section>

      <section className="rein-home-center__schedule" aria-labelledby="weekly-timetable-title">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-black pb-3">
          <h2 className="text-3xl font-black tracking-[-0.055em]" id="weekly-timetable-title">
            주 시간표
          </h2>
          <Button asChild variant="outline">
            <Link href="/tutoring/schedule">시간표 편집</Link>
          </Button>
        </div>
        <div className="mt-4">
          <WeeklyTimetable
            editable={false}
            personalSchedules={data.personalSchedules}
            schedules={data.schedules}
            variant="home"
          />
        </div>
      </section>
    </div>
  );
}
