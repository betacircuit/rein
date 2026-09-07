import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { accountTypeLabel, MoneyNav } from "@/app/money/money-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "계좌 | 돈" };

export default async function AccountsPage() {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/money/accounts");
  return (
    <div>
      <MoneyNav current="계좌" />
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">내 계좌</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">계좌와 잔액</h1>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            전체 번호는 저장하지 않고 마스킹된 식별자만 사용합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/money/accounts/new">
            <Plus aria-hidden="true" className="size-4" />
            계좌 추가
          </Link>
        </Button>
      </header>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.accounts.map((account) => (
          <Link
            className="group rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]"
            href={`/money/accounts/${account.id}`}
            key={account.id}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-extrabold">
                {accountTypeLabel[account.accountType]}
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-[var(--muted-ink)] transition-transform group-hover:translate-x-1"
              />
            </div>
            <h2 className="mt-5 text-lg font-black">{account.nickname}</h2>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">
              {account.institutionName} · {account.maskedAccountNumber || "번호 없음"}
            </p>
            <p className="mt-5 text-2xl font-black tabular-nums">
              {formatKrw(account.currentBalance)}
            </p>
            <p className="mt-2 text-xs font-bold text-[var(--muted-ink)]">
              {account.includedInTotals ? "개요 합계에 포함" : "개요 합계에서 제외"}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
