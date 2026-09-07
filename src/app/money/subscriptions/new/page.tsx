import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { SubscriptionForm } from "@/app/money/subscriptions/subscription-form";
import { SubscriptionNav } from "@/app/money/subscriptions/subscription-ui";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export const metadata = { title: "구독 추가 | 돈" };

export default async function NewSubscriptionPage() {
  const [state, money] = await Promise.all([readDemoSubscriptionState(), readDemoMoneyState()]);
  if (!state || !money) redirect("/login?next=/money/subscriptions/new");
  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="대시보드" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">구독 등록</p>
        <h1 className="mt-2 text-3xl font-black">구독 추가</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          결제 예정은 실제 거래가 아닙니다. 로컬 데모 저장소에 일정과 매칭 단서만 기록해요.
        </p>
      </header>
      <div className="mt-6">
        <SubscriptionForm accounts={money.accounts} members={state.members} />
      </div>
    </div>
  );
}
