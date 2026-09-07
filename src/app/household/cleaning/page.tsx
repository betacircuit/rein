import { CircleCheckBig, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { completeCleaningTaskAction, requireHouseholdState } from "@/app/household/actions";
import {
  CleaningHistoryIcon,
  CleaningStateBadge,
  HouseholdNav,
  MemberName,
  formatHouseholdDate,
  recurrenceLabel,
} from "@/app/household/household-ui";
import { deriveCleaningState } from "@/domain/household/operations";
import { formatSeoulDateKey } from "@/lib/format/date";

export const metadata = { title: "청소 | 우리집" };

function isBathroomPriority(task: { area: string; title: string }) {
  return task.area.includes("화장실") || task.title.includes("화장실");
}

export default async function CleaningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [state, params] = await Promise.all([requireHouseholdState(), searchParams]);
  const today = formatSeoulDateKey();
  const filter =
    params.state === "due" || params.state === "due_soon" || params.state === "ok"
      ? params.state
      : "all";
  const tasks = state.cleaningTasks
    .filter((task) => task.isActive)
    .map((task) => ({ task, status: deriveCleaningState(task, today) }))
    .filter((item) => filter === "all" || item.status === filter)
    .sort((left, right) => {
      const priority =
        Number(isBathroomPriority(right.task)) - Number(isBathroomPriority(left.task));
      if (priority !== 0) return priority;
      return left.task.nextDueOn?.localeCompare(right.task.nextDueOn ?? "") ?? 1;
    });
  const history = state.cleaningCompletions.slice().reverse();

  return (
    <div>
      <HouseholdNav current="청소" />
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <div>
          <p className="text-xs font-extrabold tracking-[0.15em] text-[var(--accent-dark)] uppercase">
            Cleaning
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--ink)]">
            상태는 날짜에서 계산해요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
            완료 순간을 기록하고 그 날부터 다음 일정을 계산해, 수동 상태가 어긋나지 않게 했어요.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-base font-extrabold text-white"
          href="/household/cleaning/new"
        >
          <Plus aria-hidden="true" className="size-5" /> 청소 추가
        </Link>
      </header>
      {params.created && (
        <p className="mt-4 rounded-2xl border border-[var(--success-line)] bg-[var(--success-wash)] px-4 py-3 text-sm text-[var(--success-ink)]">
          청소 일정을 추가했어요.
        </p>
      )}
      <nav aria-label="청소 상태 필터" className="mt-5 flex flex-wrap gap-2">
        {[
          ["all", "전체"],
          ["due", "기한 도래"],
          ["due_soon", "곧 해야 해요"],
          ["ok", "괜찮아요"],
        ].map(([value, label]) => (
          <Link
            aria-current={filter === value ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-extrabold ${filter === value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--muted-ink)]"}`}
            href={value === "all" ? "/household/cleaning" : `/household/cleaning?state=${value}`}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="청소 일정" className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-white p-8 text-center">
              <Sparkles aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" />
              <h2 className="mt-3 font-black text-[var(--ink)]">이 상태의 청소가 없어요</h2>
            </div>
          ) : (
            tasks.map(({ task, status }) => {
              const isPriority = isBathroomPriority(task);
              return (
                <article
                  className={`rounded-3xl bg-white p-5 ${isPriority ? "border-2 border-[var(--ink)] shadow-[5px_5px_0_#ff5f1f]" : "border border-[var(--line)] shadow-[var(--shadow-soft)]"}`}
                  data-priority={isPriority ? "highest" : undefined}
                  key={task.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isPriority && (
                          <span className="border-2 border-[var(--ink)] bg-[var(--orange)] px-2 py-0.5 text-[0.68rem] font-black tracking-[0.08em] text-black uppercase">
                            최우선
                          </span>
                        )}
                        <p className="text-xs font-bold text-[var(--accent-dark)]">
                          {task.area} · {recurrenceLabel(task)}
                        </p>
                      </div>
                      <h2 className="mt-1 text-lg font-black text-[var(--ink)]">{task.title}</h2>
                      <p className="mt-1 text-sm text-[var(--muted-ink)]">
                        다음 {formatHouseholdDate(task.nextDueOn)} · 담당{" "}
                        <MemberName memberId={task.assigneeMemberId} members={state.members} />
                      </p>
                    </div>
                    <CleaningStateBadge state={status} />
                  </div>
                  {task.notes && (
                    <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted-ink)]">
                      {task.notes}
                    </p>
                  )}
                  <form action={completeCleaningTaskAction} className="mt-4 flex flex-wrap gap-2">
                    <input name="taskId" type="hidden" value={task.id} />
                    <input
                      name="idempotencyKey"
                      type="hidden"
                      value={`${task.id}-${task.lastCompletedAt ?? "first"}`}
                    />
                    <label className="min-w-52 flex-1 text-sm font-bold text-[var(--ink)]">
                      완료 메모 (선택)
                      <input
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] px-3 text-base"
                        name="note"
                        placeholder="배수구까지 완료"
                      />
                    </label>
                    <button
                      className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--accent-ink)]"
                      type="submit"
                    >
                      <CircleCheckBig aria-hidden="true" className="size-4" /> 완료 기록
                    </button>
                  </form>
                </article>
              );
            })
          )}
        </section>
        <aside className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-xl font-black text-[var(--ink)]">완료 기록</h2>
          <ol className="mt-4 space-y-3">
            {history.slice(0, 6).map((completion) => {
              const task = state.cleaningTasks.find(
                (candidate) => candidate.id === completion.taskId,
              );
              return (
                <li className="flex gap-3" key={completion.id}>
                  <CleaningHistoryIcon />
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink)]">
                      {task?.title ?? "청소"}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--muted-ink)]">
                      <MemberName
                        memberId={completion.completedByMemberId}
                        members={state.members}
                      />
                      이 {formatHouseholdDate(completion.completedAt)} 완료
                    </p>
                    {completion.note && (
                      <p className="mt-1 text-xs text-[var(--muted-ink)]">{completion.note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
