import { ArrowDownLeft, ArrowUpRight, Landmark, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BankFlowBoard, type BankFlowItem } from "@/app/money/bank-flow-board";
import { findIdentityByEmail } from "@/lib/auth/identities";
import { readRemoteMoneyData } from "@/lib/money/remote-repository";

export const metadata = { title: "수입·지출" };
const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [data, query] = await Promise.all([readRemoteMoneyData(), searchParams]);
  if (!data) redirect("/login?next=/money");
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  const monthly = data.transactions.filter((item) => item.occurredAt.slice(0, 7) === month);
  const income = monthly
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthly
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = data.accounts.reduce((sum, item) => sum + item.currentBalance, 0);
  const identity = findIdentityByEmail(data.user.email);
  const jaewonBanks = [
    { id: "kb", institution: "KB국민은행", role: "돈 모으는 계좌", tone: "magenta" },
    { id: "kakao", institution: "카카오뱅크", role: "사용 상한 500,000원", tone: "yellow" },
    { id: "woori", institution: "우리은행", role: "생활비 카드", tone: "cyan" },
  ] as const;
  const bankItems: BankFlowItem[] = jaewonBanks.map((bank) => {
    const account = data.accounts.find((candidate) => {
      const institution = `${candidate.institutionName} ${candidate.nickname}`.replaceAll(" ", "");
      if (bank.id === "kb") return institution.includes("KB") || institution.includes("국민");
      if (bank.id === "kakao") return institution.includes("카카오");
      return institution.includes("우리");
    });
    const transactions = account
      ? data.transactions.filter((transaction) => transaction.accountId === account.id)
      : [];
    return {
      ...bank,
      prepared: Boolean(account),
      balance: account?.currentBalance ?? 0,
      income: transactions
        .filter((transaction) => transaction.kind === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: transactions
        .filter((transaction) => transaction.kind === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });
  return (
    <div className="mx-auto max-w-7xl">
      {query.saved && (
        <p
          className="mb-4 border-2 border-black bg-[var(--success-wash)] p-3 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="status"
        >
          거래를 Supabase에 저장했습니다.
        </p>
      )}
      <header className="rein-money-hero">
        <div>
          <h1 className="mt-2 text-5xl font-black tracking-[-0.07em]">수입과 지출</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold">
            최재원과 김태현의 장부는 계정별로 완전히 분리됩니다. 로그인한 사람의 기록만 표시됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/money/transactions/new?kind=expense">
              <ArrowUpRight aria-hidden="true" className="size-4" />
              지출 입력
            </Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/money/transactions/new?kind=income">
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              수입 입력
            </Link>
          </Button>
        </div>
      </header>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="재정 요약">
        <article className="rein-money-stat bg-[var(--cyan)]">
          <WalletCards aria-hidden="true" className="size-5" />
          <span>현재 장부 잔액</span>
          <strong>{won.format(balance)}</strong>
        </article>
        <article className="rein-money-stat bg-[var(--signal)]">
          <ArrowDownLeft aria-hidden="true" className="size-5" />
          <span>이번 달 수입</span>
          <strong>+{won.format(income)}</strong>
        </article>
        <article className="rein-money-stat bg-[var(--orange)]">
          <ArrowUpRight aria-hidden="true" className="size-5" />
          <span>이번 달 지출</span>
          <strong>−{won.format(expense)}</strong>
        </article>
        <article className="rein-money-stat bg-[var(--magenta)]">
          <Landmark aria-hidden="true" className="size-5" />
          <span>이번 달 순액</span>
          <strong>{won.format(income - expense)}</strong>
        </article>
      </section>
      {identity?.loginId === "최재원" && (
        <section className="rein-bank-system" aria-labelledby="bank-system-title">
          <header>
            <p className="rein-meta">PRIVATE BANK SYSTEM</p>
            <h2 id="bank-system-title">나의 3개 계좌</h2>
          </header>
          <BankFlowBoard items={bankItems} />
        </section>
      )}
      <section className="mt-5 border-2 border-black bg-[var(--surface)] shadow-[7px_7px_0_#343146]">
        <header className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <div>
            <p className="rein-meta">TRANSACTION LOG</p>
            <h2 className="text-xl font-black">최근 기록</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/money/transactions">전체 보기</Link>
          </Button>
        </header>
        {data.transactions.length === 0 ? (
          <div className="p-10 text-center">
            <ReceiptText aria-hidden="true" className="mx-auto size-8" />
            <p className="mt-3 font-black">아직 수입·지출 기록이 없습니다.</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">
              첫 거래를 입력하면 기본 현금 장부가 자동으로 만들어집니다.
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {data.transactions.slice(0, 3).map((item) => (
              <Link
                className="grid gap-2 p-4 outline-none hover:bg-[var(--surface-muted)] focus-visible:ring-4 focus-visible:ring-[var(--focus)] focus-visible:ring-inset sm:grid-cols-[1fr_auto] sm:items-center"
                href={`/money/transactions/${item.id}`}
                key={item.id}
              >
                <div>
                  <p className="font-black">
                    {item.counterparty || item.descriptor || item.categoryName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted-ink)]">
                    {date.format(new Date(item.occurredAt))} / {item.categoryName} /{" "}
                    {item.accountName}
                  </p>
                </div>
                <strong
                  className={`text-lg tabular-nums ${item.kind === "income" ? "text-[#087442]" : "text-[var(--ink)]"}`}
                >
                  {item.direction === "inflow" ? "+" : "−"}
                  {won.format(item.amount)}
                </strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
