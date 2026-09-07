import { ArrowRight, Plus, ReceiptText, Tags } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HouseholdNav, MemberName, formatHouseholdDate } from "@/app/household/household-ui";
import { classifyTransactionAction } from "@/app/household/shared-money-actions";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import {
  SharedExpenseStatusBadge,
  sharedExpenseCategoryLabel,
  sharedExpenseKindLabel,
} from "@/app/household/shared-money-ui";
import { Button } from "@/components/ui/button";
import {
  calculateCurrentSettlement,
  sharedExpenseCategories,
} from "@/domain/household/shared-money";
import { formatKrw, toKrw } from "@/domain/money/krw";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "공동비 | 우리집" };

export default async function SharedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; voided?: string; classified?: string }>;
}) {
  const state = await readDemoSharedMoneyState();
  const money = await readDemoMoneyState();
  if (!state || !money) redirect("/login?next=/household/expenses");
  const query = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(query.month ?? "") ? query.month! : "2026-09";
  const monthly = state.expenses
    .filter((expense) => expense.incurredOn.slice(0, 7) === month && expense.status !== "void")
    .sort((left, right) => right.incurredOn.localeCompare(left.incurredOn));
  const linkedTransactions = new Set(
    state.expenses.map((expense) => expense.linkedTransactionId).filter(Boolean),
  );
  const candidates = money.transactions.filter(
    (transaction) =>
      transaction.kind === "expense" &&
      transaction.direction === "outflow" &&
      !linkedTransactions.has(transaction.id),
  );
  const net = calculateCurrentSettlement(state, month);
  const notice = query.voided
    ? "공동비를 취소 상태로 남겼어요. 과거 기록은 삭제하지 않았습니다."
    : query.classified
      ? query.classified === "personal"
        ? "개인 지출로 확인했어요. 공동비는 만들지 않았습니다."
        : "거래를 확인하고 공동비 원천 행에 연결했어요."
      : null;

  return (
    <div>
      <HouseholdNav current="공동비" />
      {notice && (
        <p
          className="mb-5 rounded-2xl bg-[var(--accent-wash)] p-4 text-sm font-bold text-[var(--accent-dark)]"
          role="status"
        >
          {notice}
        </p>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">공동 지출</p>
          <h1 className="mt-2 text-3xl font-black">낸 사람과 부담할 사람을 따로 기록해요</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
            실제 출금은 거래 원장에 한 번만 남기고, 우리집에는 각자 책임질 금액을 정확히 1원 단위로
            나눕니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/household/expenses/new">
            <Plus aria-hidden="true" className="size-4" />
            공동비 추가
          </Link>
        </Button>
      </header>

      <section aria-label="공동비 요약" className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl bg-[var(--ink)] p-5 text-white">
          <p className="text-xs font-bold text-white/60">{month} 공동비</p>
          <p className="mt-2 text-2xl font-black tabular-nums">
            {formatKrw(
              monthly.reduce(
                (sum, expense) =>
                  sum + (expense.kind === "refund" ? -expense.amount : expense.amount),
                0n,
              ),
            )}
          </p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-bold text-[var(--muted-ink)]">내 경제적 부담</p>
          <p className="mt-2 text-2xl font-black tabular-nums">
            {formatKrw(
              monthly.reduce((sum, expense) => {
                const share =
                  expense.splits.find((split) => split.memberId === state.currentMemberId)
                    ?.amount ?? 0n;
                return sum + (expense.kind === "refund" ? -share : share);
              }, 0n),
            )}
          </p>
        </article>
        <Link
          className="rounded-3xl border border-[var(--accent)] bg-[var(--accent-wash)] p-5 focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
          href="/household/settlements"
        >
          <p className="text-xs font-bold text-[var(--accent-dark)]">현재 순정산</p>
          <p className="mt-2 text-2xl font-black tabular-nums">
            {net ? formatKrw(net.amount) : "정산 없음"}
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--muted-ink)]">
            {net?.toMemberId === state.currentMemberId
              ? "받을 금액"
              : net
                ? "보낼 금액"
                : "두 사람 부담이 같아요"}
          </p>
        </Link>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Tags aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
          <div>
            <h2 className="text-lg font-black">분류별 월 합계</h2>
            <p className="mt-1 text-xs text-[var(--muted-ink)]">
              합계가 0원인 분류도 빠짐없이 보여줍니다.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {sharedExpenseCategories.map((category) => {
            const total = monthly
              .filter((expense) => expense.category === category)
              .reduce(
                (sum, expense) =>
                  sum + (expense.kind === "refund" ? -expense.amount : expense.amount),
                0n,
              );
            return (
              <div className="rounded-2xl bg-[var(--surface-muted)] p-3" key={category}>
                <p className="text-xs font-bold text-[var(--muted-ink)]">
                  {sharedExpenseCategoryLabel[category]}
                </p>
                <p className="mt-1 font-black tabular-nums">{formatKrw(toKrw(total))}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] p-5 sm:px-6">
          <h2 className="text-lg font-black">{month} 원천 행</h2>
          <p className="mt-1 text-xs text-[var(--muted-ink)]">
            구독 연결분도 복사하지 않고 같은 목록에서 참조합니다.
          </p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {monthly.map((expense) => (
            <Link
              className="grid min-h-20 gap-2 p-4 transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none focus-visible:ring-inset sm:grid-cols-[1fr_9rem_9rem] sm:items-center sm:px-6"
              href={`/household/expenses/${expense.id}`}
              key={expense.id}
            >
              <span className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
                  <ReceiptText aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block font-extrabold">{expense.description}</span>
                  <span className="mt-1 block text-xs text-[var(--muted-ink)]">
                    {sharedExpenseCategoryLabel[expense.category]} ·{" "}
                    {sharedExpenseKindLabel[expense.kind]} ·{" "}
                    {formatHouseholdDate(expense.incurredOn)}
                  </span>
                </span>
              </span>
              <span className="text-sm font-bold text-[var(--muted-ink)]">
                결제 <MemberName memberId={expense.payerMemberId} members={state.members} />
              </span>
              <span className="flex items-center justify-between gap-3 sm:justify-end">
                <SharedExpenseStatusBadge status={expense.status} />
                <strong className="tabular-nums">{formatKrw(expense.amount)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">거래 분류 확인</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          아래 출금은 아직 공동비에 연결되지 않았습니다. 선택만으로 바뀌지 않고 “분류 확정”을 눌러야
          반영됩니다.
        </p>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {candidates.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted-ink)]">확인할 출금 거래가 없습니다.</p>
          ) : (
            candidates.slice(0, 5).map((transaction) => (
              <ConfirmActionForm
                action={classifyTransactionAction}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_13rem_auto] sm:items-center"
                confirmMessage="선택한 분류로 공동비를 만들까요? 공동 정산 잔액에 반영될 수 있습니다."
                key={transaction.id}
              >
                <input name="transactionId" type="hidden" value={transaction.id} />
                <div>
                  <p className="font-extrabold">
                    {transaction.counterparty || transaction.descriptor || "출금 거래"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-ink)]">
                    {formatHouseholdDate(transaction.occurredAt)} · {formatKrw(transaction.amount)}
                  </p>
                </div>
                <select
                  aria-label={`${transaction.counterparty || transaction.descriptor || "출금 거래"} 분류`}
                  className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base focus:ring-2 focus:ring-[var(--focus)] focus:outline-none"
                  defaultValue="utility"
                  name="classification"
                >
                  <option value="household_shopping">우리집 장보기</option>
                  <option value="housing">주거비</option>
                  <option value="utility">공과금</option>
                  <option value="personal">개인 지출</option>
                </select>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-extrabold hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                  type="submit"
                >
                  분류 확정 <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </ConfirmActionForm>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
