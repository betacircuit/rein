"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createScheduleAction, type ScheduleActionState } from "./actions";

const initialState: ScheduleActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none";

export function ScheduleForm({ students }: { students: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createScheduleAction, initialState);

  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_.8fr_1fr_1fr_auto] xl:items-end"
    >
      {state.status === "error" && (
        <p
          className="border-2 border-black bg-[var(--danger-wash)] p-3 text-sm font-black text-[var(--danger-ink)] sm:col-span-2 xl:col-span-5"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <label className="text-sm font-bold" htmlFor="studentId">
        학생
        <select className={fieldClass} id="studentId" name="studentId" required>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold" htmlFor="weekday">
        요일
        <select className={fieldClass} defaultValue="1" id="weekday" name="weekday">
          <option value="1">월</option>
          <option value="2">화</option>
          <option value="3">수</option>
          <option value="4">목</option>
          <option value="5">금</option>
          <option value="6">토</option>
          <option value="0">일</option>
        </select>
      </label>
      <label className="text-sm font-bold" htmlFor="startTime">
        시작
        <input
          className={fieldClass}
          defaultValue="18:00"
          id="startTime"
          name="startTime"
          required
          step="60"
          type="time"
        />
      </label>
      <label className="text-sm font-bold" htmlFor="endTime">
        종료
        <input
          className={fieldClass}
          defaultValue="20:00"
          id="endTime"
          name="endTime"
          required
          step="60"
          type="time"
        />
      </label>
      <Button className="w-full xl:w-auto" disabled={pending} size="large" type="submit">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Plus aria-hidden="true" className="size-4" />
        )}
        추가
      </Button>
    </form>
  );
}
