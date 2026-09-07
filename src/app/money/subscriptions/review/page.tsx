import { redirect } from "next/navigation";

import { MoneyNav } from "@/app/money/money-ui";
import { updateSubscriptionDecisionAction } from "@/app/money/subscriptions/actions";
import { decisionLabels, SubscriptionNav } from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export const metadata = { title: "구독 유지 검토 | 돈" };

export default async function SubscriptionReviewPage() {
  const state = await readDemoSubscriptionState();
  if (!state) redirect("/login?next=/money/subscriptions/review");
  return (
    <div>
      <MoneyNav current="구독" />
      <SubscriptionNav current="유지 검토" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">직접 검토</p>
        <h1 className="mt-2 text-3xl font-black">계속 쓸지 직접 판단해요</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          마지막 사용일은 내가 기록한 날짜입니다. 앱이 실제 사용을 관찰했다고 주장하지 않아요.
        </p>
      </header>
      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        {state.subscriptions
          .filter((item) => item.status !== "ended" && item.status !== "cancelled")
          .map((item) => (
            <form
              action={updateSubscriptionDecisionAction}
              className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
              key={item.id}
            >
              <input name="subscriptionId" type="hidden" value={item.id} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-black text-[var(--accent-dark)]">
                    {decisionLabels[item.decision]}
                  </span>
                  <h2 className="mt-3 text-lg font-black">{item.name}</h2>
                </div>
                <p className="font-black tabular-nums">{formatKrw(item.amount)}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-extrabold">
                  판단
                  <select
                    className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base"
                    defaultValue={item.decision}
                    name="decision"
                  >
                    <option value="keep">유지</option>
                    <option value="review">검토</option>
                    <option value="cancel_candidate">해지 후보</option>
                  </select>
                </label>
                <label className="text-sm font-extrabold">
                  내가 기록한 마지막 사용일
                  <input
                    className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base"
                    defaultValue={item.lastUsedOn ?? ""}
                    name="lastUsedOn"
                    type="date"
                  />
                </label>
                <label className="text-sm font-extrabold sm:col-span-2">
                  판단 메모
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-white p-3 text-base"
                    defaultValue={item.decisionNote ?? ""}
                    name="decisionNote"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="submit" variant="accent">
                  판단 저장
                </Button>
              </div>
            </form>
          ))}
      </section>
    </div>
  );
}
