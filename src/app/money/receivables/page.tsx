import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MoneyNav, receivableStatusLabel } from "@/app/money/money-ui";
import { receivableBalance } from "@/domain/money/ledger";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export const metadata = { title: "받을 돈 | 돈" };
export default async function ReceivablesPage() {
  const [state, tutoring] = await Promise.all([readDemoMoneyState(), readDemoTutoringState()]);
  if (!state) redirect("/login?next=/money/receivables");
  const names = Object.fromEntries(
    (tutoring?.students ?? []).map((student) => [student.id, student.name]),
  );
  const receivables = [...state.receivables].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <MoneyNav current="받을 돈" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">과외비 받을 돈</p>
        <h1 className="mt-2 text-3xl font-black">수업에서 생긴 받을 돈</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          완료한 수업은 받을 돈을 한 건만 만듭니다. 입금과 연결되기 전에는 계좌 잔액이나 이번 달
          수입으로 계산하지 않아요.
        </p>
      </header>
      <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
        <div className="divide-y divide-[var(--line)]">
          {receivables.map((receivable) => {
            const balance = receivableBalance(receivable, state.allocations);
            return (
              <Link
                className="grid gap-3 p-5 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-center"
                href={`/money/receivables/${receivable.id}`}
                key={receivable.id}
              >
                <span>
                  <span className="block font-black">
                    {names[receivable.studentId] ?? "학생"} 과외비
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted-ink)]">
                    수업 <span className="font-mono">{receivable.lessonId}</span>
                  </span>
                </span>
                <span>
                  <span className="block text-xs text-[var(--muted-ink)]">발생</span>
                  <span className="font-extrabold">{formatKrw(receivable.amountDue)}</span>
                </span>
                <span>
                  <span className="block text-xs text-[var(--muted-ink)]">남음</span>
                  <span className="font-extrabold text-[var(--accent-dark)]">
                    {formatKrw(balance.remaining)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-extrabold">
                  {receivableStatusLabel[receivable.status]}
                  <ArrowRight aria-hidden="true" className="size-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
