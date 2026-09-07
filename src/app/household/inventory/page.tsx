import { Minus, Plus, Refrigerator, ShoppingBasket } from "lucide-react";
import Link from "next/link";

import {
  addLowStockToShoppingAction,
  adjustInventoryAction,
  requireHouseholdState,
} from "@/app/household/actions";
import { HouseholdNav, OwnershipLabel, storageLabel } from "@/app/household/household-ui";
import { formatQuantityMilli, isLowStock, storageLocations } from "@/domain/household/operations";

export const metadata = { title: "재고 | 우리집" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [state, params] = await Promise.all([requireHouseholdState(), searchParams]);
  const storage =
    typeof params.storage === "string" && storageLocations.includes(params.storage as never)
      ? params.storage
      : "all";
  const lowOnly = params.stock === "low";
  const items = state.inventory.filter(
    (item) =>
      (storage === "all" || item.storageLocation === storage) && (!lowOnly || isLowStock(item)),
  );
  const openInventoryShopping = new Set(
    state.shopping
      .filter((item) => item.status === "needed" && item.inventoryItemId)
      .map((item) => item.inventoryItemId),
  );

  return (
    <div>
      <HouseholdNav current="재고" />
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <div>
          <p className="text-xs font-extrabold tracking-[0.15em] text-[var(--accent-dark)] uppercase">
            Inventory
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--ink)]">
            어디에 몇 개 있는지
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
            냉장·냉동·실온을 나누고, ± 버튼은 최신 버전에서만 원자적으로 반영해요.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center rounded-xl bg-[var(--ink)] px-5 text-base font-extrabold text-white"
          href="/household/inventory/new"
        >
          재고 추가
        </Link>
      </header>
      <nav aria-label="재고 필터" className="mt-5 flex flex-wrap gap-2">
        {[
          ["all", "전체"] as const,
          ...storageLocations.map((value) => [value, storageLabel[value]] as const),
        ].map(([value, label]) => (
          <Link
            aria-current={storage === value && !lowOnly ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold ${storage === value && !lowOnly ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted-ink)]"}`}
            href={
              value === "all" ? "/household/inventory" : `/household/inventory?storage=${value}`
            }
            key={value}
          >
            {label}
          </Link>
        ))}
        <Link
          aria-current={lowOnly ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold ${lowOnly ? "border-[var(--warning-ink)] bg-[var(--warning-wash)] text-[var(--warning-ink)]" : "border-[var(--line)] bg-white text-[var(--muted-ink)]"}`}
          href="/household/inventory?stock=low"
        >
          부족만
        </Link>
      </nav>
      {items.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
          <Refrigerator aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" />
          <h2 className="mt-3 font-black text-[var(--ink)]">이 조건의 재고가 없어요</h2>
          <p className="mt-1 text-sm text-[var(--muted-ink)]">
            필터를 바꾸거나 첫 물건을 등록해 보세요.
          </p>
        </section>
      ) : (
        <section aria-label="재고 목록" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const low = isLowStock(item);
            return (
              <article
                className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--accent-dark)]">
                      {storageLabel[item.storageLocation]} ·{" "}
                      <OwnershipLabel item={item} members={state.members} />
                    </p>
                    <h2 className="mt-1 text-lg font-black text-[var(--ink)]">
                      <Link
                        className="focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                        href={`/household/inventory/${item.id}`}
                      >
                        {item.name}
                      </Link>
                    </h2>
                  </div>
                  {low && (
                    <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--warning-ink)]">
                      부족
                    </span>
                  )}
                </div>
                <p className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--ink)]">
                  {formatQuantityMilli(item.quantityMilli)}{" "}
                  <span className="text-base tracking-normal text-[var(--muted-ink)]">
                    {item.unit}
                  </span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[-1, 1].map((delta) => (
                    <form action={adjustInventoryAction} key={delta}>
                      <input name="inventoryItemId" type="hidden" value={item.id} />
                      <input name="delta" type="hidden" value={delta * 1000} />
                      <input name="expectedVersion" type="hidden" value={item.version} />
                      <input
                        name="idempotencyKey"
                        type="hidden"
                        value={`${item.id}-${item.version}-${delta}`}
                      />
                      <button
                        aria-label={`${item.name} ${delta > 0 ? "1 늘리기" : "1 줄이기"}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white text-sm font-extrabold text-[var(--ink)] disabled:opacity-40"
                        disabled={delta < 0 && item.quantityMilli < 1_000n}
                        type="submit"
                      >
                        {delta > 0 ? (
                          <Plus aria-hidden="true" className="size-4" />
                        ) : (
                          <Minus aria-hidden="true" className="size-4" />
                        )}
                        {delta > 0 ? "+1" : "−1"}
                      </button>
                    </form>
                  ))}
                </div>
                {low && (
                  <form action={addLowStockToShoppingAction} className="mt-2">
                    <input name="inventoryItemId" type="hidden" value={item.id} />
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--accent-ink)] disabled:opacity-60"
                      disabled={openInventoryShopping.has(item.id)}
                      type="submit"
                    >
                      <ShoppingBasket aria-hidden="true" className="size-4" />
                      {openInventoryShopping.has(item.id) ? "장보기에 있음" : "장보기에 추가"}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
