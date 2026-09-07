"use client";

import { AlertCircle, LoaderCircle, Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  recordRemoteTransactionAction,
  type RemoteMoneyActionState,
} from "@/app/money/remote-actions";
import { Button } from "@/components/ui/button";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import type { RemoteMoneyCategory } from "@/lib/money/remote-repository";

const initial: RemoteMoneyActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none";

export function TransactionForm({
  categories,
  students,
  initialKind = "income",
}: {
  categories: RemoteMoneyCategory[];
  students: Array<{ id: string; name: string }>;
  initialKind?: "income" | "expense";
}) {
  const [state, action, pending] = useActionState(recordRemoteTransactionAction, initial);
  const [kind, setKind] = useState<"income" | "expense">(initialKind);
  const available = categories.filter((item) => item.kind === kind);
  return (
    <form action={action} className="space-y-5">
      {state.status === "error" && (
        <div
          className="flex gap-2 border-2 border-black bg-[var(--danger-wash)] p-4 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
          {state.message}
        </div>
      )}
      <section className="border-2 border-black bg-[var(--surface)] p-5 shadow-[7px_7px_0_#343146] sm:p-6">
        <div className="mb-5 grid grid-cols-2 border-2 border-black">
          <button
            className={`min-h-14 border-r-2 border-black text-lg font-black ${kind === "income" ? "bg-[var(--signal)]" : "bg-white"}`}
            data-rainy-action="transaction-income"
            onClick={() => setKind("income")}
            type="button"
          >
            + 수입
          </button>
          <button
            className={`min-h-14 text-lg font-black ${kind === "expense" ? "bg-[var(--orange)]" : "bg-white"}`}
            data-rainy-action="transaction-expense"
            onClick={() => setKind("expense")}
            type="button"
          >
            − 지출
          </button>
        </div>
        <input name="kind" type="hidden" value={kind} />
        <div className="grid gap-5 sm:grid-cols-2">
          <AmountKeypad disabled={pending} />
          <p className="border-2 border-black bg-[var(--surface-muted)] p-3 text-sm font-black sm:col-span-2">
            {kind === "income" ? "수입 → 기본 수입 계좌" : "지출 → 우리은행 생활비 카드"} 자동 적용
          </p>
          <label className="text-sm font-bold" htmlFor="categoryCode">
            분류 *
            <select
              className={inputClass}
              id="categoryCode"
              key={kind}
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
          {kind === "income" && (
            <label className="text-sm font-bold" htmlFor="studentId">
              학생
              <select className={inputClass} defaultValue="" id="studentId" name="studentId">
                <option value="">학생 연결 안 함</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="rein-transaction-time" role="note">
            <span>거래 시간</span>
            <strong>저장 버튼을 누른 시각</strong>
            <small>API 거래는 제공된 원거래 시각을 사용합니다.</small>
          </div>
          <label className="text-sm font-bold" htmlFor="counterparty">
            거래 상대
            <input
              className={inputClass}
              id="counterparty"
              name="counterparty"
              placeholder={kind === "income" ? "예: 김민수 보호자" : "예: 동네마트"}
            />
          </label>
          <label className="text-sm font-bold" htmlFor="descriptor">
            거래 내용
            <input
              className={inputClass}
              id="descriptor"
              name="descriptor"
              placeholder={kind === "income" ? "예: 9월 수학 과외비" : "예: 장보기"}
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2" htmlFor="memo">
            메모
            <textarea className={`${inputClass} min-h-24 py-3`} id="memo" name="memo" />
          </label>
        </div>
      </section>
      <div className="flex justify-end">
        <Button
          disabled={pending}
          size="large"
          type="submit"
          variant={kind === "income" ? "accent" : "primary"}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {pending ? "저장 중" : `${kind === "income" ? "수입" : "지출"} 저장`}
        </Button>
      </div>
    </form>
  );
}
