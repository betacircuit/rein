"use client";

import { BookOpen, LoaderCircle, Wallet } from "lucide-react";
import { useActionState } from "react";

import {
  recordStudentDepositAction,
  recordStudentLessonAction,
  type LedgerActionState,
} from "@/app/tutoring/students/ledger-actions";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import type { StudentDepositRecord, StudentLessonRecord } from "@/lib/tutoring/remote-repository";

const initialState: LedgerActionState = { status: "idle" };
const fieldClass =
  "mt-1 min-h-11 w-full border-2 border-black bg-white px-3 text-sm font-bold outline-none";

const receivableStatusLabel = {
  open: "미수령",
  partially_paid: "일부 입금",
  paid: "입금 완료",
  void: "취소",
} as const;

function todayInSeoul() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function StudentLedger({
  studentId,
  lessons,
  transactions,
}: {
  studentId: string;
  lessons: StudentLessonRecord[];
  transactions: StudentDepositRecord[];
}) {
  const [lessonState, lessonAction, lessonPending] = useActionState(
    recordStudentLessonAction,
    initialState,
  );
  const [depositState, depositAction, depositPending] = useActionState(
    recordStudentDepositAction,
    initialState,
  );
  const totalBilled = lessons.reduce((sum, item) => sum + item.amount, 0);
  const totalDeposited = transactions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="rein-detail-panel">
        <header className="flex items-center justify-between border-b-2 border-black bg-[var(--cyan)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <BookOpen aria-hidden="true" className="size-4" />
            수업 이력
          </h2>
          <span className="rein-meta">청구 {formatKrw(BigInt(totalBilled))}</span>
        </header>
        <form action={lessonAction} className="border-b-2 border-black p-4">
          <input name="studentId" type="hidden" value={studentId} />
          {lessonState.status === "error" && (
            <p className="mb-2 border-2 border-black bg-[var(--danger-wash)] p-2 text-xs font-black">
              {lessonState.message}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-black" htmlFor="lessonDate">
              날짜
              <input
                className={fieldClass}
                defaultValue={todayInSeoul()}
                id="lessonDate"
                name="lessonDate"
                required
                type="date"
              />
            </label>
            <label className="min-w-40 flex-1 text-xs font-black" htmlFor="prepNotes">
              메모 (선택)
              <input className={fieldClass} id="prepNotes" name="prepNotes" type="text" />
            </label>
            <Button disabled={lessonPending} type="submit">
              {lessonPending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                "수업 기록"
              )}
            </Button>
          </div>
        </form>
        <ul className="divide-y-2 divide-black">
          {lessons.length === 0 && (
            <li className="p-4 text-sm font-bold text-[var(--muted-ink)]">
              아직 기록된 수업이 없어요.
            </li>
          )}
          {lessons.map((lesson) => (
            <li className="flex items-center justify-between gap-3 p-4" key={lesson.id}>
              <div>
                <p className="font-black">
                  {new Date(lesson.startsAt).toLocaleDateString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
                {lesson.prepNotes && (
                  <p className="mt-1 text-sm text-[var(--muted-ink)]">{lesson.prepNotes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-black">{formatKrw(BigInt(lesson.amount))}</p>
                {lesson.receivableStatus && (
                  <p className="text-xs font-bold text-[var(--muted-ink)]">
                    {receivableStatusLabel[lesson.receivableStatus]}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rein-detail-panel">
        <header className="flex items-center justify-between border-b-2 border-black bg-[var(--cyan)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Wallet aria-hidden="true" className="size-4" />
            입금 내역
          </h2>
          <span className="rein-meta">입금 {formatKrw(BigInt(totalDeposited))}</span>
        </header>
        <form action={depositAction} className="border-b-2 border-black p-4">
          <input name="studentId" type="hidden" value={studentId} />
          {depositState.status === "error" && (
            <p className="mb-2 border-2 border-black bg-[var(--danger-wash)] p-2 text-xs font-black">
              {depositState.message}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-black" htmlFor="occurredOn">
              날짜
              <input
                className={fieldClass}
                defaultValue={todayInSeoul()}
                id="occurredOn"
                name="occurredOn"
                required
                type="date"
              />
            </label>
            <label className="text-xs font-black" htmlFor="amount">
              금액
              <input
                className={`${fieldClass} w-32`}
                id="amount"
                min={1}
                name="amount"
                required
                step={1000}
                type="number"
              />
            </label>
            <label className="min-w-32 flex-1 text-xs font-black" htmlFor="memo">
              메모 (선택)
              <input className={fieldClass} id="memo" name="memo" type="text" />
            </label>
            <Button disabled={depositPending} type="submit">
              {depositPending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                "입금 기록"
              )}
            </Button>
          </div>
        </form>
        <ul className="divide-y-2 divide-black">
          {transactions.length === 0 && (
            <li className="p-4 text-sm font-bold text-[var(--muted-ink)]">
              아직 기록된 입금이 없어요.
            </li>
          )}
          {transactions.map((transaction) => (
            <li className="flex items-center justify-between gap-3 p-4" key={transaction.id}>
              <div>
                <p className="font-black">
                  {new Date(transaction.occurredAt).toLocaleDateString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
                {transaction.memo && (
                  <p className="mt-1 text-sm text-[var(--muted-ink)]">{transaction.memo}</p>
                )}
              </div>
              <p className="font-black">+{formatKrw(BigInt(transaction.amount))}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
