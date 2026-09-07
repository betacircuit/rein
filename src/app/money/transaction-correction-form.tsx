"use client";

import { AlertCircle, LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import {
  correctRemoteTransactionAction,
  type RemoteMoneyActionState,
} from "@/app/money/remote-actions";
import { Button } from "@/components/ui/button";
import type { RemoteMoneyCategory, RemoteTransaction } from "@/lib/money/remote-repository";

const initial: RemoteMoneyActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export function TransactionCorrectionForm({
  categories,
  transaction,
}: {
  categories: RemoteMoneyCategory[];
  transaction: RemoteTransaction;
}) {
  const [state, action, pending] = useActionState(correctRemoteTransactionAction, initial);
  const available = categories.filter((item) => item.kind === transaction.kind);

  return (
    <form action={action} className="space-y-5">
      <input name="transactionId" type="hidden" value={transaction.id} />
      {state.status === "error" && (
        <div
          className="flex gap-2 border-2 border-black bg-[var(--danger-wash)] p-4 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
          {state.message}
        </div>
      )}
      <section className="grid gap-5 border-2 border-black bg-[var(--surface)] p-5 shadow-[7px_7px_0_#343146] sm:grid-cols-2 sm:p-6">
        <div className="border-2 border-black bg-white p-3 sm:col-span-2">
          <p className="rein-meta">{transaction.accountName}</p>
          <strong className="mt-1 block text-2xl font-black tabular-nums">
            {transaction.direction === "inflow" ? "+" : "−"}
            {won.format(transaction.amount)}
          </strong>
        </div>
        <div className="rein-transaction-time sm:col-span-2" role="note">
          <span>거래 시간</span>
          <strong>{date.format(new Date(transaction.occurredAt))}</strong>
          <small>외부 API 거래는 provider가 제공한 원거래 시각을 유지합니다.</small>
        </div>
        <label className="text-sm font-bold" htmlFor="categoryCode">
          분류 *
          <select
            className={inputClass}
            defaultValue={transaction.categoryCode}
            id="categoryCode"
            name="categoryCode"
            required
          >
            {available.map((category) => (
              <option key={category.code} value={category.code}>
                {category.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold" htmlFor="counterparty">
          거래 상대
          <input
            className={inputClass}
            defaultValue={transaction.counterparty ?? ""}
            id="counterparty"
            name="counterparty"
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2" htmlFor="descriptor">
          표시 내용
          <input
            className={inputClass}
            defaultValue={transaction.descriptor ?? ""}
            id="descriptor"
            name="descriptor"
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2" htmlFor="memo">
          메모
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            defaultValue={transaction.memo ?? ""}
            id="memo"
            name="memo"
          />
        </label>
      </section>
      <div className="flex justify-end">
        <Button disabled={pending} size="large" type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {pending ? "저장 중" : "수정 저장"}
        </Button>
      </div>
    </form>
  );
}
