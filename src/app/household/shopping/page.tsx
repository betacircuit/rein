import { Check, ExternalLink, Link2, ShoppingBasket } from "lucide-react";
import Link from "next/link";

import { markShoppingPurchasedAction, requireHouseholdState } from "@/app/household/actions";
import { HouseholdNav, OwnershipLabel, formatHouseholdDate } from "@/app/household/household-ui";
import { ShoppingForm } from "@/app/household/shopping/shopping-form";
import { formatQuantityMilli } from "@/domain/household/operations";
import { readHouseholdCostRows } from "@/lib/household/demo-store";
import { marketplaceLinksFor } from "@/lib/household/marketplace-links";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "장보기 | 우리집" };

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [state, params] = await Promise.all([requireHouseholdState(), searchParams]);
  const [money, costRows] = await Promise.all([readDemoMoneyState(), readHouseholdCostRows(state)]);
  const status = params.status === "purchased" ? "purchased" : "needed";
  const items = state.shopping.filter((item) => item.status === status);

  return (
    <div>
      <HouseholdNav current="장보기" />
      <header className="rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-xs font-extrabold tracking-[0.15em] text-[var(--accent-dark)] uppercase">
          Shopping
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--ink)]">
          필요한 것만, 출처는 하나로
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          부족 재고에서 올린 항목은 원래 재고와 연결됩니다. 구매 처리는 거래나 공동비의 ID를 참조할
          뿐 금융 기록을 새로 복제하지 않아요.
        </p>
      </header>
      {params.created && (
        <p className="mt-4 rounded-2xl border border-[var(--success-line)] bg-[var(--success-wash)] px-4 py-3 text-sm text-[var(--success-ink)]">
          장보기에 추가했어요.
        </p>
      )}
      <section className="mt-5 grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-xl font-black text-[var(--ink)]">빠르게 추가</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
            개인 물건과 공용 물건을 같은 목록에서 구분해요.
          </p>
          <div className="mt-5">
            <ShoppingForm members={state.members} />
          </div>
        </aside>
        <div>
          <nav aria-label="장보기 상태 필터" className="flex gap-2">
            {[
              ["needed", "필요한 것"],
              ["purchased", "구매 기록"],
            ].map(([value, label]) => (
              <Link
                aria-current={status === value ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-extrabold ${status === value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted-ink)]"}`}
                href={
                  value === "needed"
                    ? "/household/shopping"
                    : "/household/shopping?status=purchased"
                }
                key={value}
              >
                {label}
              </Link>
            ))}
          </nav>
          {items.length === 0 ? (
            <section className="mt-4 rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
              <ShoppingBasket
                aria-hidden="true"
                className="mx-auto size-8 text-[var(--muted-ink)]"
              />
              <h2 className="mt-3 font-black text-[var(--ink)]">이 목록은 비어 있어요</h2>
              <p className="mt-1 text-sm text-[var(--muted-ink)]">
                재고의 부족 버튼이나 왼쪽 입력으로 채울 수 있어요.
              </p>
            </section>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li
                  className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--accent-dark)]">
                        <OwnershipLabel item={item} members={state.members} />
                        {item.inventoryItemId && " · 재고에서 연결"}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-[var(--ink)]">{item.name}</h2>
                      <p className="mt-1 text-sm text-[var(--muted-ink)]">
                        {item.desiredQuantityMilli === null
                          ? "수량 미정"
                          : `${formatQuantityMilli(item.desiredQuantityMilli)} ${item.unit ?? ""}`}
                      </p>
                    </div>
                    {item.status === "purchased" && (
                      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--success-wash)] px-3 text-xs font-extrabold text-[var(--success-ink)]">
                        <Check aria-hidden="true" className="size-4" /> 구매 완료
                      </span>
                    )}
                  </div>
                  {item.status === "needed" ? (
                    <>
                      <nav
                        aria-label={`${item.name} 구매처 찾기`}
                        className="mt-4 grid grid-cols-3 gap-2"
                      >
                        {marketplaceLinksFor(item.name).map((market) => (
                          <a
                            aria-label={`${market.label}에서 ${item.name} 찾기 (새 탭)`}
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-white px-2 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_#101010] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                            href={market.href}
                            key={market.id}
                            referrerPolicy="no-referrer"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {market.label}
                            <ExternalLink aria-hidden="true" className="size-3.5" />
                          </a>
                        ))}
                      </nav>
                      <details className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
                        <summary className="min-h-11 cursor-pointer py-2 font-extrabold text-[var(--ink)]">
                          구매 완료 처리
                        </summary>
                        <form action={markShoppingPurchasedAction} className="mt-4 space-y-3">
                          <input name="shoppingItemId" type="hidden" value={item.id} />
                          <label className="block text-sm font-bold text-[var(--ink)]">
                            거래 ID (선택)
                            <select
                              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base"
                              name="transactionId"
                            >
                              <option value="">연결하지 않음</option>
                              {money?.transactions
                                .filter((transaction) => transaction.kind === "expense")
                                .map((transaction) => (
                                  <option key={transaction.id} value={transaction.id}>
                                    {transaction.counterparty ?? transaction.descriptor ?? "지출"}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="block text-sm font-bold text-[var(--ink)]">
                            공동비 ID (선택)
                            <select
                              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base"
                              name="sharedExpenseId"
                            >
                              <option value="">연결하지 않음</option>
                              {costRows.map((cost) => (
                                <option key={cost.id} value={cost.id}>
                                  {cost.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--accent-ink)]"
                            type="submit"
                          >
                            <Check aria-hidden="true" className="size-4" /> 구매로 표시
                          </button>
                        </form>
                      </details>
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-ink)]">
                      <p>구매일 {formatHouseholdDate(item.purchasedAt)}</p>
                      {(item.purchasedTransactionId || item.sharedExpenseId) && (
                        <p className="mt-2 flex items-center gap-2 font-bold text-[var(--ink)]">
                          <Link2 aria-hidden="true" className="size-4" />
                          {item.purchasedTransactionId && `거래 ${item.purchasedTransactionId}`}
                          {item.purchasedTransactionId && item.sharedExpenseId && " · "}
                          {item.sharedExpenseId && `공동비 ${item.sharedExpenseId}`}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
