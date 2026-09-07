import { redirect } from "next/navigation";

import { ImportForm } from "@/app/money/import/import-form";
import { MoneyNav } from "@/app/money/money-ui";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "CSV 가져오기 | 돈" };
export default async function ImportPage() {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/money/import");
  return (
    <div>
      <MoneyNav current="CSV" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">수동 CSV 가져오기</p>
        <h1 className="mt-2 text-3xl font-black">거래 CSV 가져오기</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          파일은 먼저 검증하고 미리보기를 보여 줍니다. 같은 거래 지문은 다시 가져오지 않으며, 전체
          검증이 끝나기 전에는 한 건도 저장하지 않아요.
        </p>
      </header>
      <aside className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm leading-6">
        <p className="font-extrabold">필수 열</p>
        <code className="mt-1 block overflow-x-auto text-xs">
          occurred_at,direction,amount,counterparty,descriptor
        </code>
        <p className="mt-2 text-[var(--muted-ink)]">
          direction은 inflow 또는 outflow이며, 스프레드시트 수식으로 해석될 수 있는 셀은 안전한
          텍스트로 바꿉니다.
        </p>
      </aside>
      <div className="mt-6">
        <ImportForm accounts={state.accounts.filter((account) => account.isActive)} />
      </div>
    </div>
  );
}
