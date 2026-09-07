import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TransactionForm } from "@/app/money/transaction-form";
import { readRemoteMoneyData } from "@/lib/money/remote-repository";
import { readRemoteTutoringData } from "@/lib/tutoring/remote-repository";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const [data, tutoring, query] = await Promise.all([
    readRemoteMoneyData(),
    readRemoteTutoringData(),
    searchParams,
  ]);
  if (!data || !tutoring) redirect("/login?next=/money/transactions/new");
  const initialKind = query.kind === "expense" ? "expense" : "income";
  return (
    <div className="mx-auto max-w-4xl">
      <Link className="rein-back-link" href="/money">
        <ArrowLeft aria-hidden="true" className="size-4" />
        수입·지출
      </Link>
      <header className="my-5">
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">거래 입력</h1>
        <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
          실제 입금과 출금만 기록합니다. 저장과 동시에 장부 잔액이 반영됩니다.
        </p>
      </header>
      <TransactionForm
        categories={data.categories}
        students={tutoring.students.map(({ id, name }) => ({ id, name }))}
        initialKind={initialKind}
      />
    </div>
  );
}
