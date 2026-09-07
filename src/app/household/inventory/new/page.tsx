import Link from "next/link";

import { requireHouseholdState } from "@/app/household/actions";
import { HouseholdNav } from "@/app/household/household-ui";
import { InventoryForm } from "@/app/household/inventory/inventory-form";

export const metadata = { title: "재고 추가 | 우리집" };

export default async function NewInventoryPage() {
  const state = await requireHouseholdState();
  return (
    <div>
      <HouseholdNav current="재고" />
      <Link className="text-sm font-bold text-[var(--accent-dark)]" href="/household/inventory">
        ← 재고로
      </Link>
      <section className="mt-4 rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">재고 추가</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          소유자는 활성 구성원 참조로 저장해, 사람이 늘어나도 같은 구조를 사용해요.
        </p>
        <div className="mt-6">
          <InventoryForm members={state.members} />
        </div>
      </section>
    </div>
  );
}
