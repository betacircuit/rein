"use client";

import { useActionState } from "react";

import { createTransferAction, type MoneyActionState } from "@/app/money/actions";
import { Button } from "@/components/ui/button";
import type { Account } from "@/domain/money/ledger";
import { formatKoreanDateTimeInput } from "@/lib/format/date";

const initial: MoneyActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 outline-none focus:ring-2 focus:ring-[var(--focus)]";

export function TransferForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(createTransferAction, initial);
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
    >
      {state.status === "error" && (
        <p
          className="rounded-xl bg-[var(--danger-wash)] p-3 text-sm font-bold text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-extrabold">
          보내는 계좌
          <select className={inputClass} name="fromAccountId">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold">
          받는 계좌
          <select className={inputClass} defaultValue={accounts[1]?.id} name="toAccountId">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-extrabold">
          금액(원)
          <input className={inputClass} min="1" name="amount" required type="number" />
        </label>
        <label className="text-sm font-extrabold">
          이체 시간
          <input
            className={inputClass}
            defaultValue={formatKoreanDateTimeInput(new Date())}
            name="occurredAt"
            required
            type="datetime-local"
          />
        </label>
        <label className="text-sm font-extrabold sm:col-span-2">
          메모
          <input className={inputClass} name="memo" />
        </label>
      </div>
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="accent">
          {pending ? "기록 중…" : "두 거래로 기록"}
        </Button>
      </div>
    </form>
  );
}
