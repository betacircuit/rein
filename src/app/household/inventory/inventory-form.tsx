"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveInventoryAction, type HouseholdActionState } from "@/app/household/actions";
import type { HouseholdMember, InventoryItem } from "@/domain/household/operations";
import { formatQuantityMilli } from "@/domain/household/operations";

const initialState: HouseholdActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[color:var(--focus)]/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--ink)] px-5 text-base font-extrabold text-white transition-colors hover:bg-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "저장 중…" : "재고 저장"}
    </button>
  );
}

function ErrorText({ errors }: { errors: string[] | undefined }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-[var(--danger-ink)]">{errors[0]}</p>;
}

export function InventoryForm({
  members,
  item,
}: {
  members: HouseholdMember[];
  item?: InventoryItem;
}) {
  const [state, action] = useActionState(saveInventoryAction, initialState);
  const ownerValue = item?.ownerKind === "shared" ? "shared" : item?.ownerMemberId;
  return (
    <form action={action} className="space-y-5">
      {item && <input name="inventoryItemId" type="hidden" value={item.id} />}
      {state.status === "error" && (
        <p
          className="rounded-xl border border-[var(--danger-line)] bg-[var(--danger-wash)] px-4 py-3 text-sm text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message ?? "입력값을 확인해 주세요."}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-[var(--ink)]">
          이름 *
          <input className={inputClass} defaultValue={item?.name} name="name" required />
          <ErrorText errors={state.errors?.name} />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <label className="text-sm font-bold text-[var(--ink)]">
            수량 *
            <input
              className={inputClass}
              defaultValue={item ? formatQuantityMilli(item.quantityMilli) : "1"}
              inputMode="decimal"
              name="quantity"
              required
            />
            <ErrorText errors={state.errors?.quantity} />
          </label>
          <label className="text-sm font-bold text-[var(--ink)]">
            단위 *
            <input className={inputClass} defaultValue={item?.unit ?? "개"} name="unit" required />
            <ErrorText errors={state.errors?.unit} />
          </label>
        </div>
        <label className="text-sm font-bold text-[var(--ink)]">
          소유 *
          <select className={inputClass} defaultValue={ownerValue ?? "shared"} name="owner">
            <option value="shared">공용</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.isCurrentUser ? "내 것" : `${member.displayName} 것`}
              </option>
            ))}
          </select>
          <ErrorText errors={state.errors?.owner} />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          보관 위치 *
          <select
            className={inputClass}
            defaultValue={item?.storageLocation ?? "refrigerated"}
            name="storageLocation"
          >
            <option value="refrigerated">냉장</option>
            <option value="frozen">냉동</option>
            <option value="room_temperature">실온</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          소비기한
          <input
            className={inputClass}
            defaultValue={item?.expiresOn ?? ""}
            name="expiresOn"
            type="date"
          />
          <ErrorText errors={state.errors?.expiresOn} />
        </label>
        <label className="text-sm font-bold text-[var(--ink)]">
          부족 기준
          <input
            className={inputClass}
            defaultValue={
              item?.lowStockThresholdMilli === null || item?.lowStockThresholdMilli === undefined
                ? ""
                : formatQuantityMilli(item.lowStockThresholdMilli)
            }
            inputMode="decimal"
            name="lowStockThreshold"
          />
          <span className="mt-1 block text-xs font-medium text-[var(--muted-ink)]">
            현재 수량이 이 값 이하이면 부족으로 표시해요.
          </span>
          <ErrorText errors={state.errors?.lowStockThreshold} />
        </label>
      </div>
      <label className="block text-sm font-bold text-[var(--ink)]">
        메모
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          defaultValue={item?.notes ?? ""}
          name="notes"
        />
      </label>
      <SubmitButton />
    </form>
  );
}
