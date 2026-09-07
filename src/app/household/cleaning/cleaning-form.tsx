"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveCleaningTaskAction, type HouseholdActionState } from "@/app/household/actions";
import type { HouseholdMember } from "@/domain/household/operations";

const initialState: HouseholdActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[color:var(--focus)]/20";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="min-h-12 rounded-xl bg-[var(--ink)] px-5 text-base font-extrabold text-white disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "저장 중…" : "청소 일정 저장"}
    </button>
  );
}

export function CleaningForm({ members }: { members: HouseholdMember[] }) {
  const [state, action] = useActionState(saveCleaningTaskAction, initialState);
  const [recurrence, setRecurrence] = useState("weekly");
  return (
    <form action={action} className="space-y-5">
      {state.status === "error" && (
        <p
          className="rounded-xl bg-[var(--danger-wash)] px-4 py-3 text-sm text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-[var(--ink)]">
          청소 이름 *
          <input className={inputClass} defaultValue="화장실 청소" name="title" required />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          공간 *
          <input className={inputClass} defaultValue="화장실" name="area" required />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          담당
          <select className={inputClass} defaultValue="" name="assigneeMemberId">
            <option value="">함께</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.isCurrentUser ? "나" : member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          반복 *
          <select
            className={inputClass}
            name="recurrence"
            onChange={(event) => setRecurrence(event.target.value)}
            value={recurrence}
          >
            <option value="interval_days">며칠마다</option>
            <option value="weekly">매주 같은 요일</option>
            <option value="none">한 번만</option>
          </select>
        </label>
        {recurrence === "interval_days" && (
          <label className="text-sm font-bold text-[var(--ink)]">
            반복 간격(일)
            <input
              className={inputClass}
              defaultValue="7"
              inputMode="numeric"
              min="1"
              name="recurrenceIntervalDays"
              type="number"
            />
            {state.errors?.recurrenceIntervalDays?.[0] && (
              <span className="mt-1 block text-sm text-[var(--danger-ink)]">
                {state.errors.recurrenceIntervalDays[0]}
              </span>
            )}
          </label>
        )}
        {recurrence === "weekly" && (
          <label className="text-sm font-bold text-[var(--ink)]">
            매주 요일
            <select className={inputClass} defaultValue="4" name="weekday">
              {[
                [0, "일요일"],
                [1, "월요일"],
                [2, "화요일"],
                [3, "수요일"],
                [4, "목요일"],
                [5, "금요일"],
                [6, "토요일"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-bold text-[var(--ink)]">
          다음 날짜
          <input className={inputClass} defaultValue="2026-09-10" name="nextDueOn" type="date" />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          미리 알림(일)
          <input
            className={inputClass}
            defaultValue="2"
            inputMode="numeric"
            max="30"
            min="0"
            name="dueSoonDays"
            type="number"
          />
        </label>
      </div>
      <label className="block text-sm font-bold text-[var(--ink)]">
        메모
        <textarea className={`${inputClass} min-h-24 py-3`} name="notes" />
      </label>
      <SaveButton />
    </form>
  );
}
