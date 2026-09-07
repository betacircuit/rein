"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveSharedExpenseAction,
  type SharedMoneyActionState,
} from "@/app/household/shared-money-actions";
import { sharedExpenseCategoryLabel } from "@/app/household/shared-money-ui";
import {
  createExpenseSplits,
  parsePercentToBasisPoints,
  sharedExpenseCategories,
  type MatchableHouseholdTransaction,
  type SharedExpense,
  type SharedMoneyMember,
  type SplitPreset,
} from "@/domain/household/shared-money";
import { formatKrw, toKrw } from "@/domain/money/krw";
import { formatSeoulDateKey } from "@/lib/format/date";

const initialState: SharedMoneyActionState = { status: "idle" };
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
      {pending ? "저장 중…" : "공동비 저장"}
    </button>
  );
}

function ErrorText({ errors }: { errors: string[] | undefined }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-[var(--danger-ink)]">{errors[0]}</p>;
}

function inferredPreset(expense: SharedExpense | undefined, currentMemberId: string): SplitPreset {
  if (!expense) return "equal";
  const current = expense.splits.find((split) => split.memberId === currentMemberId)?.amount ?? 0n;
  const other = expense.amount - current;
  if (current === expense.amount) return "current_user_all";
  if (other === expense.amount) return "roommate_all";
  if (current === expense.amount / 2n || current === expense.amount - expense.amount / 2n)
    return "equal";
  return "custom_amounts";
}

export function SharedExpenseForm({
  members,
  expense,
  transactions,
}: {
  members: SharedMoneyMember[];
  expense?: SharedExpense;
  transactions: MatchableHouseholdTransaction[];
}) {
  const current = members.find((member) => member.isCurrentUser)!;
  const roommate = members.find((member) => !member.isCurrentUser)!;
  const existingCurrent = expense?.splits.find((split) => split.memberId === current.id)?.amount;
  const existingRoommate = expense?.splits.find((split) => split.memberId === roommate.id)?.amount;
  const [state, action] = useActionState(saveSharedExpenseAction, initialState);
  const [amount, setAmount] = useState(expense?.amount.toString() ?? "");
  const [preset, setPreset] = useState<SplitPreset>(inferredPreset(expense, current.id));
  const [currentAmount, setCurrentAmount] = useState(existingCurrent?.toString() ?? "");
  const [roommateAmount, setRoommateAmount] = useState(existingRoommate?.toString() ?? "");
  const [currentPercent, setCurrentPercent] = useState("50");
  const [roommatePercent, setRoommatePercent] = useState("50");
  const preview = useMemo(() => {
    if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) return { splits: null, error: null };
    try {
      const splits = createExpenseSplits({
        total: toKrw(amount),
        currentMemberId: current.id,
        roommateMemberId: roommate.id,
        preset,
        currentAmount:
          currentAmount && /^\d+$/.test(currentAmount) ? toKrw(currentAmount) : undefined,
        roommateAmount:
          roommateAmount && /^\d+$/.test(roommateAmount) ? toKrw(roommateAmount) : undefined,
        currentPercentBasisPoints: currentPercent
          ? parsePercentToBasisPoints(currentPercent)
          : undefined,
        roommatePercentBasisPoints: roommatePercent
          ? parsePercentToBasisPoints(roommatePercent)
          : undefined,
      });
      return { splits, error: null };
    } catch (error) {
      return {
        splits: null,
        error: error instanceof Error ? error.message : "분담값을 확인해 주세요.",
      };
    }
  }, [
    amount,
    current.id,
    currentAmount,
    currentPercent,
    preset,
    roommate.id,
    roommateAmount,
    roommatePercent,
  ]);

  return (
    <form action={action} className="space-y-6">
      {expense && <input name="expenseId" type="hidden" value={expense.id} />}
      {state.status === "error" && (
        <p
          className="rounded-xl border border-[var(--danger-line)] bg-[var(--danger-wash)] px-4 py-3 text-sm text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold sm:col-span-2">
          내용 *
          <input
            className={inputClass}
            defaultValue={expense?.description}
            name="description"
            required
          />
          <ErrorText errors={state.errors?.description} />
        </label>
        <label className="text-sm font-bold">
          분류 *
          <select className={inputClass} defaultValue={expense?.category ?? "rent"} name="category">
            {sharedExpenseCategories.map((category) => (
              <option key={category} value={category}>
                {sharedExpenseCategoryLabel[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          기록 종류 *
          <select className={inputClass} defaultValue={expense?.kind ?? "charge"} name="kind">
            <option value="charge">지출</option>
            <option value="refund">환불</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          총액(원) *
          <input
            className={inputClass}
            inputMode="numeric"
            name="amount"
            onChange={(event) => setAmount(event.target.value)}
            required
            value={amount}
          />
          <ErrorText errors={state.errors?.amount} />
        </label>
        <label className="text-sm font-bold">
          실제 결제자 *
          <select
            className={inputClass}
            defaultValue={expense?.payerMemberId ?? current.id}
            name="payerMemberId"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.isCurrentUser ? "나" : member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          사용일 *
          <input
            className={inputClass}
            defaultValue={expense?.incurredOn ?? formatSeoulDateKey()}
            name="incurredOn"
            required
            type="date"
          />
        </label>
        <label className="text-sm font-bold">
          납부 예정일
          <input
            className={inputClass}
            defaultValue={expense?.dueOn ?? ""}
            name="dueOn"
            type="date"
          />
        </label>
      </div>

      <fieldset className="rounded-3xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5">
        <legend className="px-1 text-sm font-black">경제적 부담 나누기</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-5">
          {[
            ["equal", "반반"],
            ["current_user_all", "나 전부"],
            ["roommate_all", `${roommate.displayName} 전부`],
            ["custom_amounts", "금액 직접"],
            ["custom_percentages", "비율 직접"],
          ].map(([value, label]) => (
            <label
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--line-strong)] bg-white px-3 text-center text-sm font-extrabold has-checked:border-[var(--ink)] has-checked:bg-[var(--ink)] has-checked:text-white"
              key={value}
            >
              <input
                checked={preset === value}
                className="sr-only"
                name="splitPreset"
                onChange={() => setPreset(value as SplitPreset)}
                type="radio"
                value={value}
              />
              {label}
            </label>
          ))}
        </div>
        {preset === "custom_amounts" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              내 부담액
              <input
                className={inputClass}
                inputMode="numeric"
                name="currentAmount"
                onChange={(event) => setCurrentAmount(event.target.value)}
                value={currentAmount}
              />
            </label>
            <label className="text-sm font-bold">
              {roommate.displayName} 부담액
              <input
                className={inputClass}
                inputMode="numeric"
                name="roommateAmount"
                onChange={(event) => setRoommateAmount(event.target.value)}
                value={roommateAmount}
              />
            </label>
          </div>
        )}
        {preset !== "custom_amounts" && (
          <>
            <input name="currentAmount" type="hidden" value="" />
            <input name="roommateAmount" type="hidden" value="" />
          </>
        )}
        {preset === "custom_percentages" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              내 부담 비율(%)
              <input
                className={inputClass}
                inputMode="decimal"
                name="currentPercent"
                onChange={(event) => setCurrentPercent(event.target.value)}
                value={currentPercent}
              />
            </label>
            <label className="text-sm font-bold">
              {roommate.displayName} 부담 비율(%)
              <input
                className={inputClass}
                inputMode="decimal"
                name="roommatePercent"
                onChange={(event) => setRoommatePercent(event.target.value)}
                value={roommatePercent}
              />
            </label>
          </div>
        )}
        {preset !== "custom_percentages" && (
          <>
            <input name="currentPercent" type="hidden" value="" />
            <input name="roommatePercent" type="hidden" value="" />
          </>
        )}
        <div className="mt-4 rounded-2xl bg-white p-4" aria-live="polite">
          <p className="text-xs font-extrabold tracking-wide text-[var(--muted-ink)] uppercase">
            정산 저울
          </p>
          {preview.splits ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {preview.splits.map((split) => {
                const member = members.find((item) => item.id === split.memberId)!;
                return (
                  <div className="rounded-xl border border-[var(--line)] p-3" key={split.memberId}>
                    <span className="block text-xs font-bold text-[var(--muted-ink)]">
                      {member.isCurrentUser ? "내 부담" : `${member.displayName} 부담`}
                    </span>
                    <span className="mt-1 block text-lg font-black tabular-nums">
                      {formatKrw(split.amount)}
                    </span>
                  </div>
                );
              })}
              <p className="col-span-2 text-xs font-bold text-[var(--success-ink)]">
                합계가 총액과 정확히 일치합니다.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold text-[var(--warning-ink)]">
              {preview.error ?? "총액을 입력하면 두 사람의 정확한 부담액을 보여드려요."}
            </p>
          )}
        </div>
      </fieldset>

      <label className="block text-sm font-bold">
        실제 출금 거래 연결
        <select
          className={inputClass}
          defaultValue={expense?.linkedTransactionId ?? ""}
          name="linkedTransactionId"
        >
          <option value="">연결하지 않음</option>
          {transactions.map((transaction) => (
            <option key={transaction.id} value={transaction.id}>
              {(transaction.counterparty || transaction.descriptor || "출금 거래").slice(0, 30)} ·{" "}
              {formatKrw(transaction.amount)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-medium text-[var(--muted-ink)]">
          내 거래 원장의 출금만 보이며, 룸메이트 화면에는 계좌·거래 상세가 노출되지 않습니다.
        </span>
      </label>
      <label className="block text-sm font-bold">
        메모
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          defaultValue={expense?.notes ?? ""}
          name="notes"
        />
      </label>
      <SubmitButton />
    </form>
  );
}
