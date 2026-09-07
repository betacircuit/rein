import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { readRemoteMoneyData } from "@/lib/money/remote-repository";

const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});
export default async function TransactionsPage() {
  const data = await readRemoteMoneyData();
  if (!data) redirect("/login?next=/money/transactions");
  return (
    <div className="mx-auto max-w-6xl">
      <Link className="rein-back-link" href="/money">
        <ArrowLeft aria-hidden="true" className="size-4" />
        재정 개요
      </Link>
      <header className="rein-section-head mt-5">
        <div>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.055em]">전체 거래</h1>
        </div>
        <Button asChild>
          <Link href="/money/transactions/new">
            <Plus aria-hidden="true" className="size-4" />
            거래 입력
          </Link>
        </Button>
      </header>
      <section className="mt-5 border-2 border-black bg-[var(--surface)] shadow-[7px_7px_0_#343146]">
        <div className="divide-y-2 divide-black">
          {data.transactions.length === 0 ? (
            <p className="p-8 text-center font-black">기록된 거래가 없습니다.</p>
          ) : (
            data.transactions.map((item) => (
              <Link
                className="grid gap-2 p-4 outline-none hover:bg-[var(--surface-muted)] focus-visible:ring-4 focus-visible:ring-[var(--focus)] focus-visible:ring-inset sm:grid-cols-[1fr_11rem_10rem] sm:items-center"
                href={`/money/transactions/${item.id}`}
                key={item.id}
              >
                <div>
                  <p className="font-black">
                    {item.counterparty || item.descriptor || item.categoryName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted-ink)]">
                    {date.format(new Date(item.occurredAt))} / {item.categoryName}
                  </p>
                </div>
                <span className="text-sm font-bold">{item.accountName}</span>
                <strong className="text-right text-lg tabular-nums">
                  {item.direction === "inflow" ? "+" : "−"}
                  {won.format(item.amount)}
                </strong>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
