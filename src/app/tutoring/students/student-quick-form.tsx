"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { createStudentQuickAction, type StudentActionState } from "@/app/tutoring/students/actions";
import { Button } from "@/components/ui/button";

const initialState: StudentActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none";

export function StudentQuickForm() {
  const [state, action, pending] = useActionState(createStudentQuickAction, initialState);
  const firstError = Object.values(state.errors ?? {}).flat()[0];
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error") errorSummaryRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      {state.status === "error" && (
        <p
          className="border-2 border-black bg-[var(--danger-wash)] p-4 text-sm font-black shadow-[4px_4px_0_#343146]"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          {state.message ?? firstError}
        </p>
      )}

      <fieldset className="border-2 border-black bg-[var(--surface)] p-5 shadow-[6px_6px_0_#343146] sm:p-6">
        <legend className="border-2 border-black bg-[var(--cyan)] px-3 py-1 text-xs font-black tracking-[0.1em]">
          01 / 학생 등록
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold" htmlFor="name">
            학생 이름 *
            <input className={fieldClass} id="name" name="name" required type="text" />
          </label>

          <label className="text-sm font-bold" htmlFor="defaultMode">
            과외 방식 *
            <select
              className={fieldClass}
              defaultValue="online"
              id="defaultMode"
              name="defaultMode"
            >
              <option value="online">화상</option>
              <option value="in_person">대면</option>
            </select>
          </label>

          <label className="text-sm font-bold" htmlFor="grade">
            학년 *
            <select className={fieldClass} defaultValue="1" id="grade" name="grade">
              <option value="1">고1</option>
              <option value="2">고2</option>
              <option value="3">고3</option>
            </select>
          </label>

          <label className="text-sm font-bold" htmlFor="hourlyRate">
            시급(원) *
            <input
              className={fieldClass}
              defaultValue={50000}
              id="hourlyRate"
              min={1}
              name="hourlyRate"
              required
              step={1000}
              type="number"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button disabled={pending} size="large" type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <UserPlus aria-hidden="true" className="size-4" />
          )}
          {pending ? "등록 중" : "학생 등록"}
        </Button>
      </div>
    </form>
  );
}
