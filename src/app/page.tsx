import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  House,
  Landmark,
  MapPin,
  Video,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  calculateHouseholdOverview,
  deriveCleaningState,
  isLowStock,
} from "@/domain/household/operations";
import {
  calculateCurrentSettlement,
  suggestSettlementMatches,
} from "@/domain/household/shared-money";
import { calculateMoneyOverview, receivableBalance } from "@/domain/money/ledger";
import { formatKrw } from "@/domain/money/krw";
import { subscriptionDashboard } from "@/domain/subscriptions/model";
import { readDemoOnboardingState } from "@/lib/auth/session";
import { readGrowSnapshot } from "@/lib/grow/summary";
import { formatKoreanDate } from "@/lib/format/date";
import { readDemoHouseholdState, readHouseholdCostRows } from "@/lib/household/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

const DEMO_TODAY = "2026-09-03";

export default async function HomePage() {
  const [snapshot, tutoring, household, onboarding] = await Promise.all([
    readGrowSnapshot("2026-09"),
    readDemoTutoringState(),
    readDemoHouseholdState(),
    readDemoOnboardingState(),
  ]);
  if (!snapshot || !tutoring || !household) redirect("/login?next=/home");

  const costRows = await readHouseholdCostRows(household);
  const householdOverview = calculateHouseholdOverview(household, costRows);
  const subscriptionSummary = subscriptionDashboard(snapshot.subscriptions, DEMO_TODAY);
  const moneyOverview = calculateMoneyOverview({
    accounts: snapshot.money.accounts,
    transactions: snapshot.money.transactions,
    month: "2026-09",
  });
  const settlement = calculateCurrentSettlement(snapshot.household, "2026-09");
  const settlementSuggestions = suggestSettlementMatches({
    state: snapshot.household,
    transactions: snapshot.money.transactions,
  });
  const linkedHouseholdTransactions = new Set(
    snapshot.household.expenses.map((item) => item.linkedTransactionId).filter(Boolean),
  );
  const householdCandidates = snapshot.money.transactions.filter(
    (item) =>
      item.kind === "expense" &&
      item.direction === "outflow" &&
      !linkedHouseholdTransactions.has(item.id),
  );
  const lessons = tutoring.lessons
    .filter(
      (lesson) => lesson.startsAt.slice(0, 10) === DEMO_TODAY && lesson.status === "scheduled",
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const earned = tutoring.lessons
    .filter((lesson) => lesson.status === "completed" && lesson.startsAt.slice(0, 7) === "2026-09")
    .reduce((sum, lesson) => sum + lesson.amount, 0n);
  const received = tutoring.finances.reduce((sum, item) => sum + item.receivedAmount, 0n);
  const outstanding = snapshot.money.receivables
    .filter((item) => item.status !== "void")
    .reduce((sum, item) => sum + receivableBalance(item, snapshot.money.allocations).remaining, 0n);
  const forecast = tutoring.schedules
    .filter((item) => item.isActive)
    .reduce((sum, schedule) => {
      const student = tutoring.students.find((item) => item.id === schedule.studentId);
      return sum + (student?.defaultFeeAmount ?? 0n) * 4n;
    }, 0n);
  const dueCleaning = household.cleaningTasks.filter(
    (task) => task.isActive && deriveCleaningState(task, DEMO_TODAY) !== "ok",
  );
  const lowStock = household.inventory.filter(isLowStock);
  const moneyMatches = snapshot.money.suggestions.filter((item) => item.status === "suggested");
  const subscriptionMatches = snapshot.subscriptions.suggestions.filter(
    (item) => item.status === "suggested",
  );
  const actions = [
    ...(moneyMatches.length
      ? [
          {
            id: "money",
            label: `입금 ${moneyMatches.length}건 확인`,
            detail: "과외비 후보의 근거 검토",
            href: "/money/matches",
          },
        ]
      : []),
    ...(subscriptionSummary.due7.length
      ? [
          {
            id: "subscription",
            label: `구독 결제 ${subscriptionSummary.due7.length}건 확인`,
            detail: "7일 내 결제 예정",
            href: "/money/subscriptions?view=due7",
          },
        ]
      : []),
    ...(subscriptionSummary.trials.length
      ? [
          {
            id: "trial",
            label: `체험 종료 ${subscriptionSummary.trials.length}건 확인`,
            detail: "직접 유지 판단 필요",
            href: "/money/subscriptions?view=trial",
          },
        ]
      : []),
    ...(dueCleaning.length
      ? [
          {
            id: "cleaning",
            label: `청소 ${dueCleaning.length}개`,
            detail: dueCleaning.map((item) => item.title).join(", "),
            href: "/household?filter=due",
          },
        ]
      : []),
    ...(subscriptionMatches.length
      ? [
          {
            id: "sub-match",
            label: `구독 매칭 ${subscriptionMatches.length}건`,
            detail: "자동 확정 전 직접 확인",
            href: "/money/subscriptions/matches",
          },
        ]
      : []),
    ...(householdCandidates.length
      ? [
          {
            id: "household-match",
            label: `공동비 후보 ${householdCandidates.length}건`,
            detail: "개인·공동비 분류 확인",
            href: "/household/expenses",
          },
        ]
      : []),
    ...(settlementSuggestions.length
      ? [
          {
            id: "settlement-match",
            label: `정산 입금 후보 ${settlementSuggestions.length}건`,
            detail: "룸메이트 입금 연결 확인",
            href: "/household/settlements",
          },
        ]
      : []),
  ];
  const displayName = onboarding?.profile.displayName ?? "학생";

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--accent-dark)]">9월 3일 목요일</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--ink)] sm:text-4xl">
            {displayName}님, 오늘은 이것부터 해요.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
            준비와 확인을 먼저, 월간 숫자는 그다음에 배치했어요.
          </p>
        </div>
        <span className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--muted-ink)]">
          <Clock3 aria-hidden="true" className="size-4" /> Asia/Seoul · 데모 기준
        </span>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section
          className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
          aria-labelledby="today-lesson-title"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <BookOpenCheck aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
              <h2 className="font-extrabold" id="today-lesson-title">
                오늘 준비할 수업
              </h2>
            </div>
            <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-extrabold text-[var(--accent-dark)]">
              {lessons.length}개
            </span>
          </div>
          {lessons.length ? (
            <div className="divide-y divide-[var(--line)]">
              {lessons.map((lesson) => {
                const student = tutoring.students.find((item) => item.id === lesson.studentId);
                const start = formatKoreanDate(lesson.startsAt, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                return (
                  <article className="p-5 sm:p-6" key={lesson.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-black">
                        {start} · {student?.name ?? "학생"}
                      </p>
                      <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-[var(--muted-ink)]">
                        {student?.tutoringType === "school_record"
                          ? "학생부"
                          : student?.subject === "math"
                            ? "수학"
                            : student?.subject === "physics"
                              ? "물리"
                              : "화학"}
                        {" · "}
                        {lesson.mode === "online" ? "온라인" : "대면"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-ink)]">
                      수업료 {formatKrw(lesson.amount)} · {lesson.endsAt.slice(11, 16)} 종료
                    </p>
                    <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
                      <p className="text-xs font-extrabold tracking-[0.13em] text-[var(--muted-ink)] uppercase">
                        준비 메모
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {lesson.prepNotes ?? "등록된 준비 메모가 없어요."}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"
                        href={`/tutoring/lessons/${lesson.id}`}
                      >
                        수업 자세히 <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                      {lesson.meetUrl && (
                        <a
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-bold"
                          href={lesson.meetUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Video aria-hidden="true" className="size-4" /> Meet 열기
                        </a>
                      )}
                      {lesson.mode === "in_person" && lesson.inPersonLocation && (
                        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-bold">
                          <MapPin aria-hidden="true" className="size-4" />
                          {lesson.inPersonLocation}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-sm text-[var(--muted-ink)]">
              오늘 예정된 수업이 없어요. 다음 일정을 여유 있게 준비할 수 있어요.
            </p>
          )}
        </section>

        <section
          className="rounded-[2rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-[var(--shadow-soft)] sm:p-6"
          aria-labelledby="actions-title"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black" id="actions-title">
              확인이 필요해요
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
              {actions.length}개
            </span>
          </div>
          <div className="mt-5 space-y-2">
            {actions.length ? (
              actions.map((action, index) => {
                const Icon =
                  [CircleDollarSign, CalendarClock, CalendarClock, House, CircleAlert][index] ??
                  CircleAlert;
                return (
                  <Link
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 hover:bg-white/[0.12]"
                    href={action.href as Route}
                    key={action.id}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold">{action.label}</span>
                      <span className="mt-0.5 block text-xs text-white/65">{action.detail}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-white/50" />
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl bg-white/[0.07] p-4 text-sm text-white/70">
                지금 바로 확인할 항목이 없어요.
              </p>
            )}
          </div>
        </section>
      </div>

      <section
        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="이번 달 과외 요약"
      >
        {[
          ["월 예상", forecast, "활성 주간 일정 × 4주"],
          ["발생", earned, "완료 수업 기준"],
          ["실제 입금", received, "연결 확정 금액"],
          ["아직 받을 돈", outstanding, "현금 잔액과 별도"],
        ].map(([label, value, helper]) => (
          <article
            className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
            key={String(label)}
          >
            <p className="text-xs font-bold text-[var(--muted-ink)]">{String(label)}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{formatKrw(value as bigint)}</p>
            <p className="mt-1 text-xs text-[var(--muted-ink)]">{String(helper)}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3" aria-label="운영 요약">
        <SummaryLink
          href="/money"
          icon={Landmark}
          label="포함 계좌 잔액"
          value={formatKrw(moneyOverview.totalBalance)}
          helper={`실제 입금 ${formatKrw(moneyOverview.monthlyInflow)} · 지출 ${formatKrw(moneyOverview.monthlyOutflow)}`}
        />
        <SummaryLink
          href="/money/grow"
          icon={CircleDollarSign}
          label="실제 가용 잉여금"
          value={formatKrw(snapshot.surplus.actualAvailableSurplus)}
          helper={`이번 달 Grow ${snapshot.contribution?.status === "completed" ? "완료" : "진행 전"}`}
        />
        <SummaryLink
          href="/household"
          icon={MapPin}
          label="우리집"
          value={`확인 ${dueCleaning.length + lowStock.length}개`}
          helper={`청소 ${dueCleaning.length} · 부족 재고 ${householdOverview.lowStockCount} · 정산 ${formatKrw(settlement?.amount ?? 0n)}`}
        />
      </section>
    </div>
  );
}

function SummaryLink({
  href,
  icon: Icon,
  label,
  value,
  helper,
}: {
  href: Route;
  icon: typeof Landmark;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Link
      className="group rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
      href={href}
    >
      <div className="flex items-center justify-between">
        <Icon aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-[var(--muted-ink)] transition-transform group-hover:translate-x-1"
        />
      </div>
      <p className="mt-5 text-sm font-bold text-[var(--muted-ink)]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted-ink)]">{helper}</p>
    </Link>
  );
}
