import Link from "next/link";
import { notFound } from "next/navigation";

import { requireHouseholdState } from "@/app/household/actions";
import {
  HouseholdNav,
  OwnershipLabel,
  formatHouseholdDate,
  storageLabel,
} from "@/app/household/household-ui";
import { InventoryForm } from "@/app/household/inventory/inventory-form";
import { formatQuantityMilli, isLowStock } from "@/domain/household/operations";

export default async function InventoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ inventoryItemId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [state, route, query] = await Promise.all([requireHouseholdState(), params, searchParams]);
  const item = state.inventory.find((candidate) => candidate.id === route.inventoryItemId);
  if (!item) notFound();
  const adjustments = state.inventoryAdjustments
    .filter((entry) => entry.itemId === item.id)
    .slice()
    .reverse();

  return (
    <div>
      <HouseholdNav current="재고" />
      <Link className="text-sm font-bold text-[var(--accent-dark)]" href="/household/inventory">
        ← 재고로
      </Link>
      {query.saved && (
        <p className="mt-4 rounded-2xl border border-[var(--success-line)] bg-[var(--success-wash)] px-4 py-3 text-sm text-[var(--success-ink)]">
          재고를 저장했어요.
        </p>
      )}
      <section className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-[var(--accent-dark)]">
                {storageLabel[item.storageLocation]} ·{" "}
                <OwnershipLabel item={item} members={state.members} />
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">
                {item.name}
              </h1>
            </div>
            {isLowStock(item) && (
              <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--warning-ink)]">
                부족 기준 도달
              </span>
            )}
          </div>
          <dl className="mt-5 grid gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold text-[var(--muted-ink)]">현재 수량</dt>
              <dd className="mt-1 font-black text-[var(--ink)]">
                {formatQuantityMilli(item.quantityMilli)} {item.unit}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-[var(--muted-ink)]">부족 기준</dt>
              <dd className="mt-1 font-black text-[var(--ink)]">
                {item.lowStockThresholdMilli === null
                  ? "없음"
                  : `${formatQuantityMilli(item.lowStockThresholdMilli)} ${item.unit}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-[var(--muted-ink)]">소비기한</dt>
              <dd className="mt-1 font-black text-[var(--ink)]">
                {formatHouseholdDate(item.expiresOn)}
              </dd>
            </div>
          </dl>
          <div className="mt-7 border-t border-[var(--line)] pt-7">
            <h2 className="text-xl font-black text-[var(--ink)]">모든 정보 수정</h2>
            <div className="mt-5">
              <InventoryForm item={item} members={state.members} />
            </div>
          </div>
        </div>
        <aside className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-black text-[var(--ink)]">수량 변경 기록</h2>
          {adjustments.length ? (
            <ol className="mt-4 space-y-3">
              {adjustments.map((entry) => (
                <li className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm" key={entry.id}>
                  <p className="font-extrabold text-[var(--ink)]">
                    {formatQuantityMilli(entry.quantityBeforeMilli)} →{" "}
                    {formatQuantityMilli(entry.quantityAfterMilli)} {item.unit}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-ink)]">
                    {formatHouseholdDate(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
              아직 ± 변경 기록이 없어요. 직접 수량 수정도 같은 기록에 남습니다.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
