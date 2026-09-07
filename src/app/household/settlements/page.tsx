import { ArrowDownLeft, CheckCircle2, HandCoins, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HouseholdNav, MemberName, formatHouseholdDate } from "@/app/household/household-ui";
import { confirmSettlementMatchAction } from "@/app/household/shared-money-actions";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import {
  calculateCurrentSettlement,
  settlementBalance,
  suggestSettlementMatches,
} from "@/domain/household/shared-money";
import { formatKrw } from "@/domain/money/krw";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "정산 | 우리집" };

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ matched?: string }>;
}) {
  const state = await readDemoSharedMoneyState();
  const money = await readDemoMoneyState();
  if (!state || !money) redirect("/login?next=/household/settlements");
  const query = await searchParams;
  const current = calculateCurrentSettlement(state, "2026-09");
  const suggestions = suggestSettlementMatches({ state, transactions: money.transactions });
  const transactionById = new Map(
    money.transactions.map((transaction) => [transaction.id, transaction]),
  );

  return (
    <div>
      <HouseholdNav current="정산" />
      {query.matched && (
        <p
          className="mb-5 rounded-2xl bg-[var(--success-wash)] p-4 text-sm font-bold text-[var(--success-ink)]"
          role="status"
        >
          룸메이트 입금을 정산에 연결했어요. 공동비 원본은 그대로 유지됩니다.
        </p>
      )}
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">우리집 정산</p>
        <h1 className="mt-2 text-3xl font-black">서로 낸 돈을 한 번만 상계해요</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          결제자 역전과 환불까지 합친 순액입니다. 정산 입금은 과거 공동비를 수정하지 않고 별도 연결
          이력으로 남습니다.
        </p>
      </header>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-[var(--ink)] text-white">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-bold text-white/60">보내는 사람</p>
            <p className="mt-2 text-xl font-black">
              {current ? (
                <MemberName memberId={current.fromMemberId} members={state.members} />
              ) : (
                "없음"
              )}
            </p>
          </div>
          <HandCoins aria-hidden="true" className="size-8 text-[var(--accent)]" />
          <div className="sm:text-right">
            <p className="text-xs font-bold text-white/60">받는 사람 · 남은 순액</p>
            <p className="mt-2 text-xl font-black">
              {current ? (
                <MemberName memberId={current.toMemberId} members={state.members} />
              ) : (
                "정산 완료"
              )}
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {current ? formatKrw(current.amount) : formatKrw(0)}
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 text-xs font-bold text-white/65 sm:px-8">
          실제 현금 출금·입금과 경제적 부담을 섞지 않고 나란히 조정합니다.
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ArrowDownLeft aria-hidden="true" className="mt-0.5 size-5 text-[var(--accent-dark)]" />
          <div>
            <h2 className="text-lg font-black">입금 매칭 제안</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
              금액·방향·룸메이트 이름 근거만 제안합니다. 확정 전에는 정산 상태가 바뀌지 않습니다.
            </p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {suggestions.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted-ink)]">확인할 정산 입금이 없습니다.</p>
          ) : (
            suggestions.map((suggestion) => {
              const transaction = transactionById.get(suggestion.transactionId)!;
              return (
                <ConfirmActionForm
                  action={confirmSettlementMatchAction}
                  className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  confirmMessage="이 입금을 정산 상환으로 연결할까요? 룸메이트별 남은 정산 금액이 바뀝니다."
                  key={suggestion.id}
                >
                  <input name="settlementId" type="hidden" value={suggestion.settlementId} />
                  <input name="transactionId" type="hidden" value={suggestion.transactionId} />
                  <input
                    name="amount"
                    type="hidden"
                    value={suggestion.suggestedAmount.toString()}
                  />
                  <div>
                    <p className="font-extrabold">
                      {transaction.counterparty || transaction.descriptor || "입금 거래"} ·{" "}
                      {formatKrw(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">
                      {suggestion.evidence.amount} · {suggestion.evidence.member} ·{" "}
                      {suggestion.evidence.timing} · 신뢰도{" "}
                      {Math.round(suggestion.confidence * 100)}%
                    </p>
                  </div>
                  <Button type="submit">{formatKrw(suggestion.suggestedAmount)} 연결 확정</Button>
                </ConfirmActionForm>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">정산 상태와 이력</h2>
        <div className="mt-4 space-y-4">
          {state.settlements.map((settlement) => {
            const balance = settlementBalance(settlement, state.settlementAllocations);
            const allocations = state.settlementAllocations.filter(
              (item) => item.settlementId === settlement.id,
            );
            return (
              <article className="rounded-2xl border border-[var(--line)] p-4" key={settlement.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-extrabold">
                      <MemberName memberId={settlement.fromMemberId} members={state.members} /> →{" "}
                      <MemberName memberId={settlement.toMemberId} members={state.members} />
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-ink)]">
                      {formatHouseholdDate(settlement.periodStart)}–
                      {formatHouseholdDate(settlement.periodEnd)} ·{" "}
                      {settlement.status === "paid"
                        ? "완료"
                        : settlement.status === "partially_paid"
                          ? "일부 입금"
                          : "미정산"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-black tabular-nums">총 {formatKrw(settlement.amountDue)}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--accent-dark)]">
                      입금 {formatKrw(balance.paid)} · 남음 {formatKrw(balance.remaining)}
                    </p>
                  </div>
                </div>
                {allocations.length > 0 && (
                  <div className="mt-4 border-t border-[var(--line)] pt-3">
                    {allocations.map((allocation) => (
                      <div
                        className="flex min-h-11 items-center justify-between gap-3 text-sm"
                        key={allocation.id}
                      >
                        <span className="inline-flex items-center gap-2 font-bold">
                          <CheckCircle2
                            aria-hidden="true"
                            className="size-4 text-[var(--success-ink)]"
                          />
                          {formatHouseholdDate(allocation.createdAt)} 입금 연결
                        </span>
                        <Link
                          className="font-extrabold text-[var(--accent-dark)] underline"
                          href={`/money/transactions/${allocation.transactionId}`}
                        >
                          {formatKrw(allocation.amount)} · 내 거래 추적
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="mt-6 flex items-start gap-3 rounded-3xl bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--muted-ink)]">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-[var(--accent-dark)]"
        />
        <p>
          룸메이트에게는 공동비 금액·결제자·분담·정산 상태만 공유합니다. 내 계좌명, 잔액, 거래
          상대와 원문은 내 화면에서만 조회합니다.
        </p>
      </aside>
    </div>
  );
}
