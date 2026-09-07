import { notFound, redirect } from "next/navigation";

import { AccountForm } from "@/app/money/account-form";
import { MoneyNav } from "@/app/money/money-ui";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/money/accounts");
  const { accountId } = await params;
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account) notFound();
  return (
    <div>
      <MoneyNav current="계좌" />
      <h1 className="text-3xl font-black">{account.nickname} 수정</h1>
      <p className="mt-2 text-sm text-[var(--muted-ink)]">
        잔액 합산 여부와 마스킹 식별자를 바꿀 수 있어요.
      </p>
      <div className="mt-6">
        <AccountForm account={account} />
      </div>
    </div>
  );
}
