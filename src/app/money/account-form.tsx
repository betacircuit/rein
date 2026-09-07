"use client";

import { useActionState } from "react";

import { saveAccountAction, type MoneyActionState } from "@/app/money/actions";
import { Button } from "@/components/ui/button";
import type { Account } from "@/domain/money/ledger";

const initial: MoneyActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base outline-none focus:ring-2 focus:ring-[var(--focus)]";
export function AccountForm({ account }: { account?: Account }) {
  const [state, action, pending] = useActionState(saveAccountAction, initial);
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
    >
      {account && <input name="accountId" type="hidden" value={account.id} />}
      {state.status === "error" && (
        <p
          className="rounded-xl bg-[var(--danger-wash)] p-3 text-sm font-bold text-[var(--danger-ink)]"
          role="alert"
        >
          {state.message ?? "계좌 정보를 확인해 주세요."}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-extrabold">
          기관명
          <input
            className={inputClass}
            defaultValue={account?.institutionName ?? ""}
            name="institutionName"
            required
          />
        </label>
        <label className="text-sm font-extrabold">
          계좌 별칭
          <input
            className={inputClass}
            defaultValue={account?.nickname ?? ""}
            name="nickname"
            required
          />
        </label>
        <label className="text-sm font-extrabold">
          종류
          <select
            className={inputClass}
            defaultValue={account?.accountType ?? "checking"}
            name="accountType"
          >
            <option value="checking">입출금</option>
            <option value="savings">저축</option>
            <option value="cash">현금</option>
            <option value="card">카드</option>
            <option value="investment">투자</option>
            <option value="other">기타</option>
          </select>
          <span className="mt-2 block text-xs font-normal text-[var(--muted-ink)]">
            카드는 수동 기록만 지원하며 자동 동기화하지 않아요.
          </span>
        </label>
        <label className="text-sm font-extrabold">
          마스킹 번호
          <input
            className={inputClass}
            defaultValue={account?.maskedAccountNumber ?? ""}
            name="maskedAccountNumber"
            placeholder="•••• 1234"
          />
          <span className="mt-2 block text-xs font-normal text-[var(--muted-ink)]">
            전체 계좌번호는 입력하지 않아요.
          </span>
        </label>
        <label className="text-sm font-extrabold">
          현재 잔액
          <input
            className={inputClass}
            defaultValue={String(account?.currentBalance ?? 0)}
            name="currentBalance"
            type="number"
          />
        </label>
        <label className="text-sm font-extrabold">
          출금 가능 잔액
          <input
            className={inputClass}
            defaultValue={account?.availableBalance?.toString() ?? ""}
            name="availableBalance"
            type="number"
          />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-extrabold">
        <input
          defaultChecked={account?.includedInTotals ?? true}
          name="includedInTotals"
          type="checkbox"
        />
        개요 합계에 포함
      </label>
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="accent">
          {pending ? "저장 중…" : "계좌 저장"}
        </Button>
      </div>
    </form>
  );
}
