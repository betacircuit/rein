import { redirect } from "next/navigation";

import { SharedExpenseForm } from "@/app/household/expenses/shared-expense-form";
import { HouseholdNav } from "@/app/household/household-ui";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "공동비 추가 | 우리집" };

export default async function NewSharedExpensePage() {
  const state = await readDemoSharedMoneyState();
  const money = await readDemoMoneyState();
  if (!state || !money) redirect("/login?next=/household/expenses/new");
  const linked = new Set(
    state.expenses.map((expense) => expense.linkedTransactionId).filter(Boolean),
  );
  const transactions = money.transactions.filter(
    (transaction) =>
      transaction.kind === "expense" &&
      transaction.direction === "outflow" &&
      !linked.has(transaction.id),
  );
  return (
    <div>
      <HouseholdNav current="공동비" />
      <p className="text-sm font-extrabold text-[var(--accent-dark)]">공동비 등록</p>
      <h1 className="mt-2 text-3xl font-black">공동비 추가</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
        실제 결제자와 경제적 부담을 독립적으로 정하고, 저장 전에 두 부담액의 합계를 확인하세요.
      </p>
      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <SharedExpenseForm members={state.members} transactions={transactions} />
      </section>
    </div>
  );
}
