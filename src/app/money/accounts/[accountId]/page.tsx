import { Edit3 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  accountTypeLabel,
  formatMoneyDate,
  MoneyNav,
  transactionKindLabel,
} from "@/app/money/money-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/money/accounts");
  const { accountId } = await params;
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account) notFound();
  const transactions = state.transactions
    .filter((item) => item.accountId === account.id)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return (
    <div>
      <MoneyNav current="계좌" />
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">
            {accountTypeLabel[account.accountType]} · {account.institutionName}
          </p>
          <h1 className="mt-2 text-3xl font-black">{account.nickname}</h1>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            {account.maskedAccountNumber || "계좌번호 저장 안 함"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/money/accounts/${account.id}/edit`}>
            <Edit3 aria-hidden="true" className="size-4" />
            수정
          </Link>
        </Button>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["현재 잔액", formatKrw(account.currentBalance)],
          [
            "출금 가능",
            account.availableBalance === null ? "정보 없음" : formatKrw(account.availableBalance),
          ],
          ["개요 합계", account.includedInTotals ? "포함" : "제외"],
        ].map(([label, value]) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-4" key={label}>
            <p className="text-xs font-bold text-[var(--muted-ink)]">{label}</p>
            <p className="mt-2 font-black">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-black">이 계좌의 거래</h2>
        <div className="mt-3 divide-y divide-[var(--line)]">
          {transactions.map((transaction) => (
            <Link
              className="flex min-h-16 items-center justify-between py-3"
              href={`/money/transactions/${transaction.id}`}
              key={transaction.id}
            >
              <span>
                <span className="block font-extrabold">
                  {transaction.counterparty ||
                    transaction.descriptor ||
                    transactionKindLabel[transaction.kind]}
                </span>
                <span className="text-xs text-[var(--muted-ink)]">
                  {formatMoneyDate(transaction.occurredAt)}
                </span>
              </span>
              <span className="font-black tabular-nums">
                {transaction.direction === "inflow" ? "+" : "−"}
                {formatKrw(transaction.amount)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
