"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveShoppingAction, type HouseholdActionState } from "@/app/household/actions";
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
      {pending ? "추가 중…" : "장보기에 추가"}
    </button>
  );
}

export function ShoppingForm({ members }: { members: HouseholdMember[] }) {
  const [state, action] = useActionState(saveShoppingAction, initialState);
  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <p
          className="rounded-xl bg-[var(--danger-wash)] px-4 py-3 text-sm text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-[var(--ink)]">
          물건 이름 *
          <input className={inputClass} name="name" required />
          {state.errors?.name?.[0] && (
            <span className="mt-1 block text-sm text-[var(--danger-ink)]">
              {state.errors.name[0]}
            </span>
          )}
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          누구 것인가요? *
          <select className={inputClass} defaultValue="shared" name="owner">
            <option value="shared">공용</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.isCurrentUser ? "내 것" : `${member.displayName} 것`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          희망 수량
          <input
            className={inputClass}
            inputMode="decimal"
            name="desiredQuantity"
            placeholder="예: 2"
          />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          단위
          <input className={inputClass} name="unit" placeholder="개, 봉, 캔" />
        </label>
      </div>
      <SaveButton />
    </form>
  );
}
