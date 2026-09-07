import {
  ArrowLeftRight,
  CircleAlert,
  PiggyBank,
  ShieldCheck,
  Sprout,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import {
  recordGrowContributionAction,
  setGrowContributionStatusAction,
  updateGrowPlanAction,
} from "@/app/money/grow/actions";
import { MoneyNav } from "@/app/money/money-ui";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { formatKrw } from "@/domain/money/krw";
import { readGrowSnapshot } from "@/lib/grow/summary";
import { formatKoreanDateTime } from "@/lib/format/date";

export const metadata = { title: "Grow | 학생 OS" };

const statusLabel = {
  pending: "대기",
  partially_completed: "일부 완료",
  completed: "완료",
  skipped: "이번 달 건너뜀",
  cancelled: "취소",
} as const;

export default async function GrowPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; recorded?: string; status?: string }>;
}) {
  const snapshot = await readGrowSnapshot();
  if (!snapshot) redirect("/login?next=/money/grow");
  const query = await searchParams;
  const { grow, money, surplus, assets, plannedAmount, contribution } = snapshot;
  const completed = contribution?.completedAmount ?? 0n;
  const remaining = plannedAmount > completed ? plannedAmount - completed : 0n;
  const status = contribution?.status ?? "pending";
  const reserveAccounts = money.accounts.filter(
    (item) => item.isActive && item.accountType !== "investment",
  );
  const investmentAccounts = money.accounts.filter(
    (item) => item.isActive && item.accountType === "investment",
  );
  const feedback = query.recorded
    ? "장기 기여를 내 계좌 간 이체로 기록했어요. 총자산과 지출은 바뀌지 않습니다."
    : query.saved
      ? "이번 달 Grow 규칙을 저장했어요."
      : query.status
        ? "이번 달 기여 상태를 변경했어요."
        : null;

  return (
    <div>
      <MoneyNav current="Grow" />
      {feedback && (
        <p
          className="mb-5 rounded-2xl bg-[var(--accent-wash)] p-4 text-sm font-bold text-[var(--accent-dark)]"
          role="status"
        >
          {feedback}
        </p>
      )}
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">Grow · 2026년 9월</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          남은 돈을 세 갈래로 나눠요
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          실제 가용 잉여금을 먼저 계산한 뒤 비상금, 장기 기여, 유연 자금으로 나눕니다. 미수 과외비는
          입금되기 전까지 포함하지 않아요.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted-ink)]">
          Grow는 투자 기록 도구이며 증권 매매를 실행하거나 투자 수익·세무 결과를 보장하지 않습니다.
        </p>
      </header>

      <section
        aria-labelledby="surplus-heading"
        className="mt-6 overflow-hidden rounded-[2rem] bg-[var(--ink)] text-white"
      >
        <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]">
                <Sprout aria-hidden="true" className="size-6" />
              </span>
              <div>
                <p className="text-xs font-bold text-white/60">계획 판단 기준</p>
                <h2 className="text-lg font-black" id="surplus-heading">
                  실제 가용 잉여금
                </h2>
              </div>
            </div>
            <p className="mt-5 text-4xl font-black tabular-nums">
              {formatKrw(surplus.actualAvailableSurplus)}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              정산 입금과 공동비 책임을 한 번씩만 반영한 경제적 계획 금액입니다.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
            <p className="text-xs font-bold text-white/60">계좌에서 실제로 남은 현금 흐름</p>
            <p className="mt-2 text-2xl font-black tabular-nums">
              {formatKrw(surplus.actualCashRemaining)}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/65">
              룸메이트 몫을 먼저 결제하면 가용 잉여금과 다를 수 있으며 아래 항목으로 차이를
              조정합니다.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="이번 달 세 버킷" className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            label: "비상금 보충",
            value: surplus.safetyReserveTopUp,
            helper: `목표 ${formatKrw(grow.plan.safetyReserveTarget)}`,
          },
          {
            icon: PiggyBank,
            label: "장기 기여 계획",
            value: plannedAmount,
            helper: statusLabel[status],
          },
          {
            icon: WalletCards,
            label: "유연 자금",
            value: surplus.actualAvailableSurplus - plannedAmount,
            helper: "계획 후 남는 금액",
          },
        ].map(({ icon: Icon, label, value, helper }) => (
          <article className="rounded-3xl border border-[var(--line)] bg-white p-5" key={label}>
            <Icon aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
            <p className="mt-4 text-xs font-bold text-[var(--muted-ink)]">{label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{formatKrw(value)}</p>
            <p className="mt-1 text-xs text-[var(--muted-ink)]">{helper}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">공동비를 내 몫만큼 반영한 잔여</h2>
          <div className="mt-4 divide-y divide-[var(--line)] text-sm">
            {[
              ["정산 제외 입금", surplus.settledCashInflows],
              ["확인된 정산 입금", surplus.confirmedReimbursements],
              ["개인 지출", -surplus.personalExpenses],
              ["내 공동비 책임", -surplus.householdResponsibility],
              ["미지급 구독 의무", -surplus.unpaidSubscriptionObligations],
              ["필요한 비상금 보충", -surplus.safetyReserveTopUp],
            ].map(([label, value]) => (
              <div
                className="flex min-h-12 items-center justify-between gap-4 py-2"
                key={String(label)}
              >
                <span className="font-bold text-[var(--muted-ink)]">{String(label)}</span>
                <span className="font-black tabular-nums">{formatKrw(value as bigint)}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">자산 구성</h2>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            잔액 기준 {assets.asOf ? formatKoreanDateTime(assets.asOf) : "수동 입력"}
          </p>
          <div className="mt-4 space-y-3">
            <AssetRow label="현금성 자산" value={assets.cashAssets} />
            <AssetRow label="장기 투자 가치" value={assets.longTermInvestmentValue} />
            <AssetRow label="총자산" value={assets.totalAssets} strong />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted-ink)]">
            <ArrowLeftRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            장기 기여는 내 계좌 사이의 이체입니다. 자산 구성만 바뀌고 지출이나 총자산을 바꾸지
            않아요.
          </p>
        </article>
      </section>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">이번 달 장기 기여</h2>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          계획 {formatKrw(plannedAmount)} · 완료 {formatKrw(completed)} · 남음{" "}
          {formatKrw(remaining)}
        </p>
        {remaining > 0n && status !== "skipped" && status !== "cancelled" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={recordGrowContributionAction} className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="contribution-amount">
                기여 금액
              </label>
              <input
                className="min-h-11 w-40 rounded-xl border border-[var(--line-strong)] px-3 font-bold"
                defaultValue={remaining.toString()}
                id="contribution-amount"
                min="1"
                max={remaining.toString()}
                name="amount"
                type="number"
              />
              <button
                className="min-h-11 rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-white focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                type="submit"
              >
                이체로 완료 기록
              </button>
            </form>
            {["skipped", "cancelled"].map((next) => (
              <ConfirmActionForm
                action={setGrowContributionStatusAction}
                confirmMessage={
                  next === "skipped"
                    ? "이번 달 장기 기여를 건너뛸까요? 이번 달 계획 금액은 이월되지 않습니다."
                    : "이번 달 장기 기여 계획을 취소할까요? 이미 기록한 기여는 유지됩니다."
                }
                key={next}
              >
                <input name="status" type="hidden" value={next} />
                <button
                  className="min-h-11 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-bold"
                  type="submit"
                >
                  {next === "skipped" ? "이번 달 건너뛰기" : "계획 취소"}
                </button>
              </ConfirmActionForm>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm font-bold">
            {statusLabel[status]}
          </p>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">계획 규칙</h2>
        <form action={updateGrowPlanAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="비상금 계좌">
            <select defaultValue={grow.plan.reserveAccountId} name="reserveAccountId">
              {reserveAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nickname}
                </option>
              ))}
            </select>
          </Field>
          <Field label="장기 기여 계좌">
            <select defaultValue={grow.plan.contributionAccountId} name="contributionAccountId">
              {investmentAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nickname}
                </option>
              ))}
            </select>
          </Field>
          <Field label="비상금 목표">
            <input
              defaultValue={grow.plan.safetyReserveTarget.toString()}
              min="0"
              name="safetyReserveTarget"
              type="number"
            />
          </Field>
          <Field label="규칙">
            <select defaultValue={grow.plan.rule.type} name="ruleType">
              <option value="fixed">정액</option>
              <option value="percentage">가용 잉여금 비율</option>
            </select>
          </Field>
          <Field label="규칙 값 (정액 원 / 비율 %)">
            <input
              defaultValue={
                grow.plan.rule.type === "fixed"
                  ? grow.plan.rule.value.toString()
                  : Number(grow.plan.rule.valueBasisPoints) / 100
              }
              min="0"
              name="ruleValue"
              step={grow.plan.rule.type === "fixed" ? "1" : "0.01"}
              type="number"
            />
          </Field>
          <Field label="월 상한(원)">
            <input defaultValue={grow.plan.rule.cap.toString()} min="0" name="cap" type="number" />
          </Field>
          <button
            className="min-h-11 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-[var(--accent-ink)] sm:col-span-2"
            type="submit"
          >
            규칙 저장
          </button>
        </form>
      </section>

      <aside className="mt-5 flex items-start gap-3 rounded-3xl bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--muted-ink)]">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-[var(--accent-dark)]"
        />
        <p>
          이 화면은 예산 습관을 돕는 교육용 기록입니다. 특정 종목을 추천하거나 수익을 보장하지
          않으며, 장기 투자도 원금 손실이 발생할 수 있습니다.
        </p>
      </aside>
    </div>
  );
}

function AssetRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: bigint;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 ${strong ? "bg-[var(--accent-wash)]" : "bg-[var(--surface-muted)]"}`}
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="font-black tabular-nums">{formatKrw(value)}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-extrabold [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--line-strong)] [&_input]:px-3 [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-[var(--line-strong)] [&_select]:bg-white [&_select]:px-3">
      <span>{label}</span>
      {children}
    </label>
  );
}
