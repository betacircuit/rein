import Link from "next/link";

import { requireHouseholdState } from "@/app/household/actions";
import { CleaningForm } from "@/app/household/cleaning/cleaning-form";
import { HouseholdNav } from "@/app/household/household-ui";

export const metadata = { title: "청소 추가 | 우리집" };

export default async function NewCleaningPage() {
  const state = await requireHouseholdState();
  return (
    <div>
      <HouseholdNav current="청소" />
      <Link className="text-sm font-bold text-[var(--accent-dark)]" href="/household/cleaning">
        ← 청소로
      </Link>
      <section className="mt-4 rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">청소 일정 추가</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          반복 규칙과 다음 날짜를 저장하고, 화면 상태는 날짜에서 계산합니다.
        </p>
        <div className="mt-6">
          <CleaningForm members={state.members} />
        </div>
      </section>
    </div>
  );
}
