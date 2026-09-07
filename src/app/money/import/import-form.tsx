"use client";

import { useActionState } from "react";

import { commitCsvAction, previewCsvAction, type MoneyActionState } from "@/app/money/actions";
import { Button } from "@/components/ui/button";
import type { Account } from "@/domain/money/ledger";
import { formatKrw } from "@/domain/money/krw";

const initial: MoneyActionState = { status: "idle" };
export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(previewCsvAction, initial);
  return (
    <div className="space-y-5">
      <form action={action} className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-extrabold">
            가져올 계좌
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3"
              name="accountId"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.nickname}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-extrabold">
            CSV 파일
            <input
              accept=".csv,text/csv"
              className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white p-2 text-sm"
              name="csvFile"
              required
              type="file"
            />
          </label>
        </div>
        {state.message && (
          <p
            className={
              state.status === "error"
                ? "mt-4 text-sm font-bold text-[var(--danger-ink)]"
                : "mt-4 text-sm font-bold text-[var(--accent-dark)]"
            }
            role="status"
          >
            {state.message}
          </p>
        )}
        <Button className="mt-5" disabled={pending} type="submit">
          {pending ? "검사 중…" : "미리보기"}
        </Button>
      </form>
      {state.status === "preview" && state.preview && (
        <section className="rounded-3xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">가져오기 전 확인</h2>
          <div className="mt-4 space-y-2">
            {state.preview.map((row) => (
              <article
                className="grid gap-1 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm sm:grid-cols-[6rem_1fr_auto]"
                key={`${row.rowNumber}-${row.fingerprint}`}
              >
                <span className="font-mono font-bold">{row.rowNumber}행</span>
                <span>
                  <span className="block font-extrabold">
                    {row.counterparty || row.descriptor || "상대 없음"}
                  </span>
                  <span className="text-xs text-[var(--muted-ink)]">
                    {row.direction} · {row.occurredAt.slice(0, 10)}
                  </span>
                </span>
                <span className="font-black">
                  {formatKrw(row.amount)}
                  {row.duplicate && (
                    <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs text-[var(--muted-ink)]">
                      중복 제외
                    </span>
                  )}
                </span>
              </article>
            ))}
          </div>
          <form action={commitCsvAction} className="mt-5 flex justify-end">
            <input name="accountId" type="hidden" value={state.accountId} />
            <textarea className="hidden" name="csv" readOnly value={state.csv} />
            <Button type="submit" variant="accent">
              중복 제외하고 가져오기
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
