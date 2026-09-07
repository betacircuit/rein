import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { effectiveHourlyIncome, percentChange, previousMonth } from "@/domain/analytics/model";
import { monthCashFlow, unpaidPlanningObligations } from "@/domain/grow/model";
import { calculateHouseholdMoneyProjection } from "@/domain/household/shared-money";
import { formatKrw, toKrw } from "@/domain/money/krw";
import { readGrowSnapshot } from "@/lib/grow/summary";
import { formatKoreanDateTime } from "@/lib/format/date";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export const metadata = { title: "분석 | 돈" };
const DEMO_MONTH = "2026-09";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const query = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(query.month ?? "") ? query.month! : DEMO_MONTH;
  const [snapshot, tutoring] = await Promise.all([
    readGrowSnapshot(month),
    readDemoTutoringState(),
  ]);
  if (!snapshot || !tutoring) redirect("/login?next=/money/analytics");
  const priorMonth = previousMonth(month);
  const currentFlow = monthCashFlow(snapshot.money.transactions, month);
  const priorFlow = monthCashFlow(snapshot.money.transactions, priorMonth);
  const householdProjection = calculateHouseholdMoneyProjection({
    state: snapshot.household,
    transactions: snapshot.money.transactions,
    month,
  });
  const memberId = snapshot.subscriptions.members.find((item) => item.isCurrentUser)?.id ?? "";
  const subscriptionObligations = unpaidPlanningObligations(
    snapshot.subscriptions,
    `${month}-01`,
    `${month}-31`,
    memberId,
  );
  const categoryTotals = snapshot.money.transactions
    .filter((item) => item.kind !== "transfer" && item.occurredAt.slice(0, 7) === month)
    .reduce<Record<string, bigint>>((result, item) => {
      const key = item.categoryCode ?? "uncategorized";
      result[key] =
        (result[key] ?? 0n) + (item.direction === "inflow" ? item.amount : -item.amount);
      return result;
    }, {});
  const categoryNames = Object.fromEntries(
    snapshot.money.categories.map((item) => [item.code, item.displayName]),
  );
  const completed = tutoring.lessons.filter(
    (item) => item.status === "completed" && item.startsAt.slice(0, 7) === month,
  );
  const tutoringRows = tutoring.students
    .map((student) => {
      const lessons = completed.filter((item) => item.studentId === student.id);
      const amount = lessons.reduce((sum, item) => sum + item.amount, 0n);
      const lessonMinutes = lessons.reduce(
        (sum, item) =>
          sum +
          Math.round(
            (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60_000,
          ),
        0,
      );
      const preparationMinutes = lessons.reduce((sum, item) => sum + item.preparationMinutes, 0);
      const travelMinutes = lessons.reduce((sum, item) => sum + item.travelMinutes, 0);
      const rate =
        lessonMinutes > 0
          ? effectiveHourlyIncome({
              amount: toKrw(amount),
              lessonMinutes,
              preparationMinutes,
              travelMinutes,
            })
          : null;
      return {
        student,
        count: lessons.length,
        amount,
        totalMinutes: lessonMinutes + preparationMinutes + travelMinutes,
        rate,
      };
    })
    .filter((item) => item.count > 0);
  const incomplete = month === DEMO_MONTH;

  return (
    <div>
      <MoneyNav current="분석" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">분석 · 현금 기준</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            {Number(month.slice(5))}월 운영 분석
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
            이체를 제외한 실제 흐름, 과외에 쓴 전체 시간, 아직 결제되지 않은 구독 의무를 분리해
            봅니다.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <label className="text-xs font-bold text-[var(--muted-ink)]" htmlFor="analytics-month">
            조회 월
            <input
              className="mt-1 block min-h-11 rounded-xl border border-[var(--line-strong)] bg-white px-3 text-sm font-bold"
              defaultValue={month}
              id="analytics-month"
              max={DEMO_MONTH}
              name="month"
              type="month"
            />
          </label>
          <button
            className="min-h-11 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"
            type="submit"
          >
            보기
          </button>
        </form>
      </header>

      {incomplete && (
        <aside className="mt-5 flex gap-3 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-wash)] p-4 text-sm">
          <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-[var(--accent-dark)]" />
          <p>
            <strong>진행 중인 달입니다.</strong> 2026년 9월 3일 로컬 데모 기준이며, 월말 확정값과
            달라질 수 있어요.
          </p>
        </aside>
      )}

      <section
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="월간 현금 흐름"
      >
        <Metric
          label="수입"
          value={currentFlow.inflow}
          change={percentChange(currentFlow.inflow, priorFlow.inflow)}
        />
        <Metric
          label="지출"
          value={currentFlow.outflow}
          change={percentChange(currentFlow.outflow, priorFlow.outflow)}
        />
        <Metric label="순현금 변화" value={currentFlow.inflow - currentFlow.outflow} />
        <Metric
          label="미결제 구독 의무"
          value={subscriptionObligations}
          helper="결제 완료분은 제외"
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">과외 실질 시간당 수입</h2>
          <p className="mt-1 text-sm text-[var(--muted-ink)]">
            수업 + 준비 + 이동 시간을 모두 포함합니다.
          </p>
          {tutoringRows.length ? (
            <div className="mt-4 divide-y divide-[var(--line)]">
              {tutoringRows.map(({ student, count, amount, totalMinutes, rate }) => (
                <div
                  className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={student.id}
                >
                  <div>
                    <p className="font-extrabold">{student.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted-ink)]">
                      완료 {count}회 · 총 {totalMinutes}분 · 발생 {formatKrw(amount)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--muted-ink)]">
                    <p>
                      수업만{" "}
                      <strong className="text-[var(--ink)] tabular-nums">
                        {rate ? `${formatKrw(rate.nominalHourly)}/시간` : "계산 전"}
                      </strong>
                    </p>
                    <p className="mt-1">
                      준비·이동 포함{" "}
                      <strong className="text-[var(--ink)] tabular-nums">
                        {rate ? `${formatKrw(rate.effectiveHourly)}/시간` : "계산 전"}
                      </strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="이 달에 완료된 수업이 없어 시간당 수입을 계산할 수 없어요." />
          )}
        </section>
        <section className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">분류별 실제 흐름</h2>
          <p className="mt-1 text-sm text-[var(--muted-ink)]">수입은 +, 지출은 −로 표시합니다.</p>
          {Object.keys(categoryTotals).length ? (
            <div className="mt-4 divide-y divide-[var(--line)]">
              {Object.entries(categoryTotals)
                .sort((a, b) => Number((b[1] < 0n ? -b[1] : b[1]) - (a[1] < 0n ? -a[1] : a[1])))
                .map(([code, total]) => (
                  <div className="flex min-h-12 items-center justify-between py-2" key={code}>
                    <span className="font-extrabold">{categoryNames[code] ?? "미분류"}</span>
                    <span className="font-black tabular-nums">
                      {total > 0n ? "+" : "−"}
                      {formatKrw(total < 0n ? -total : total)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <Empty text="선택한 달의 거래가 없어요." />
          )}
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-[var(--accent-wash)] p-5 sm:p-6">
        <h2 className="text-lg font-black">공동비를 내 몫만큼 반영한 잔여</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          공동비 출금 원액은 현금 흐름에만, 내 분담액은 책임 기준에 한 번만 반영합니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["실제 현금 출금", householdProjection.actualCashOutflow],
            ["확인된 정산 입금", householdProjection.confirmedReimbursements],
            ["내 공동비 부담", householdProjection.householdResponsibility],
            ["책임 기준 전체 지출", householdProjection.responsibilityAdjustedExpense],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-white p-4" key={String(label)}>
              <p className="text-xs font-bold text-[var(--muted-ink)]">{String(label)}</p>
              <p className="mt-2 text-xl font-black tabular-nums">{formatKrw(value as bigint)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">자산 스냅샷</h2>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">
              현금과 장기 투자 가치를 합쳐 표시합니다.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-bold">
            <Clock3 aria-hidden="true" className="size-4" />{" "}
            {snapshot.assets.asOf ? formatKoreanDateTime(snapshot.assets.asOf) : "기준 시점 없음"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["현금 자산", snapshot.assets.cashAssets],
            ["장기 투자", snapshot.assets.longTermInvestmentValue],
            ["총자산", snapshot.assets.totalAssets],
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-[var(--line)] p-4" key={String(label)}>
              <p className="text-xs font-bold text-[var(--muted-ink)]">{String(label)}</p>
              <p className="mt-2 text-xl font-black tabular-nums">{formatKrw(value as bigint)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--muted-ink)]">
          이전 잔액 스냅샷이 없어 아직 추세선은 만들지 않았어요. 다음 동기화부터 시점별 변화를
          비교할 수 있습니다.
        </p>
        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--accent-dark)]"
          href="/money/grow"
        >
          Grow 상세 보기 <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  change,
  helper,
}: {
  label: string;
  value: bigint;
  change?: number | null;
  helper?: string;
}) {
  const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <article className="rounded-3xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold text-[var(--muted-ink)]">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{formatKrw(value)}</p>
      {helper ? (
        <p className="mt-2 text-xs text-[var(--muted-ink)]">{helper}</p>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-xs text-[var(--muted-ink)]">
          <Icon aria-hidden="true" className="size-3.5" />
          {change == null
            ? "이전 달 비교 자료 없음"
            : `이전 달 대비 ${Math.abs(change).toFixed(1)}%`}
        </p>
      )}
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-ink)]">
      {text}
    </p>
  );
}
