import { redirect } from "next/navigation";

import { createMoneyCategoryAction, toggleMoneyCategoryAction } from "@/app/money/actions";
import { Button } from "@/components/ui/button";
import { readDemoMoneyState } from "@/lib/money/demo-store";

export const metadata = { title: "돈 분류 | 설정" };

export default async function MoneySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; duplicate?: string }>;
}) {
  const state = await readDemoMoneyState();
  if (!state) redirect("/login?next=/settings/money");
  const query = await searchParams;
  return (
    <div>
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">설정 · 돈 분류</p>
        <h1 className="mt-2 text-3xl font-black">수입·지출 분류</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          시스템 기본 분류는 원장 호환성을 위해 유지합니다. 직접 만든 분류는 새 거래 선택 목록에서
          숨기거나 다시 켤 수 있어요.
        </p>
      </header>
      {(query.created || query.duplicate) && (
        <p
          className="mt-5 rounded-2xl bg-[var(--accent-wash)] p-4 text-sm font-bold text-[var(--accent-dark)]"
          role="status"
        >
          {query.created ? "내 분류를 추가했어요." : "같은 이름의 분류가 이미 있어요."}
        </p>
      )}
      <form
        action={createMoneyCategoryAction}
        className="mt-6 grid gap-4 rounded-3xl border border-[var(--line)] bg-white p-5 sm:grid-cols-[9rem_1fr_auto] sm:items-end"
      >
        <label className="text-sm font-extrabold">
          종류
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3"
            name="kind"
          >
            <option value="income">수입</option>
            <option value="expense">지출</option>
          </select>
        </label>
        <label className="text-sm font-extrabold">
          분류 이름
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3"
            maxLength={30}
            name="displayName"
            required
          />
        </label>
        <Button type="submit" variant="accent">
          내 분류 추가
        </Button>
      </form>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {(["income", "expense"] as const).map((kind) => (
          <section className="rounded-3xl border border-[var(--line)] bg-white p-5" key={kind}>
            <h2 className="text-lg font-black">{kind === "income" ? "수입" : "지출"} 분류</h2>
            <div className="mt-4 divide-y divide-[var(--line)]">
              {state.categories
                .filter((category) => category.kind === kind)
                .map((category) => (
                  <div
                    className="flex min-h-14 items-center justify-between gap-3 py-2"
                    key={category.code}
                  >
                    <span>
                      <span className="block font-extrabold">{category.displayName}</span>
                      <span className="text-xs text-[var(--muted-ink)]">
                        {category.isSystem
                          ? "기본 분류"
                          : category.isActive
                            ? "내 분류 · 사용 중"
                            : "내 분류 · 숨김"}
                      </span>
                    </span>
                    {!category.isSystem && (
                      <form action={toggleMoneyCategoryAction}>
                        <input name="code" type="hidden" value={category.code} />
                        <Button type="submit" variant="ghost">
                          {category.isActive ? "숨기기" : "다시 사용"}
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
