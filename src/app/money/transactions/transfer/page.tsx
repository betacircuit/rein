import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { TransferForm } from "@/app/money/transfer-form";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export default async function TransferPage() {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/money/transactions/transfer");
  return (
    <div>
      <MoneyNav current="거래" />
      <h1 className="text-3xl font-black">내 계좌 간 이체</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
        한 번 입력하면 출금·입금 두 거래가 같은 연결 키로 생깁니다. 월 수입, 월 지출, 순자산
        변화에는 포함되지 않아요.
      </p>
      <div className="mt-6">
        <TransferForm accounts={state.accounts.filter((account) => account.isActive)} />
      </div>
    </div>
  );
}
