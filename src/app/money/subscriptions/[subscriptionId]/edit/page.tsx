import { notFound, redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { SubscriptionForm } from "@/app/money/subscriptions/subscription-form";
import { SubscriptionNav } from "@/app/money/subscriptions/subscription-ui";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const [state, money] = await Promise.all([readDemoSubscriptionState(), readDemoMoneyState()]);
  if (!state || !money) redirect("/login?next=/money/subscriptions");
  const { subscriptionId } = await params;
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) notFound();
  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="대시보드" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">구독 수정</p>
        <h1 className="mt-2 text-3xl font-black">{subscription.name} 수정</h1>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          금액을 바꾸면 적용일 기준 가격 이력이 추가되고, 이미 결제된 청구는 바뀌지 않아요.
        </p>
      </header>
      <div className="mt-6">
        <SubscriptionForm
          accounts={money.accounts}
          members={state.members}
          splits={state.splits.filter((item) => item.subscriptionId === subscription.id)}
          subscription={subscription}
        />
      </div>
    </div>
  );
}
