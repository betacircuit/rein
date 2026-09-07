"use client";

import { AlertCircle, MapPin, NotebookPen, Video } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { createLessonAction, type TutoringActionState } from "@/app/tutoring/actions";
import { Button } from "@/components/ui/button";
import type { LessonMode, MeetStrategy, Student } from "@/domain/tutoring/model";
import { formatKoreanDateTimeInput } from "@/lib/format/date";

const initialState: TutoringActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20";

export function LessonForm({
  students,
  selectedStudentId,
}: {
  students: Student[];
  selectedStudentId?: string;
}) {
  const initialStudent =
    students.find((student) => student.id === selectedStudentId) ?? students[0];
  const [state, formAction, pending] = useActionState(createLessonAction, initialState);
  const [studentId, setStudentId] = useState(initialStudent?.id ?? "");
  const [duration, setDuration] = useState(initialStudent?.defaultDurationMinutes ?? 120);
  const [amount, setAmount] = useState(Number(initialStudent?.defaultFeeAmount ?? 60_000));
  const [mode, setMode] = useState<LessonMode>(initialStudent?.defaultMode ?? "online");
  const [location, setLocation] = useState(initialStudent?.defaultLocation ?? "");
  const [meetStrategy, setMeetStrategy] = useState<MeetStrategy>(
    initialStudent?.meetStrategy ?? "google_generated",
  );
  const [manualMeetUrl, setManualMeetUrl] = useState(initialStudent?.manualMeetUrl ?? "");
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  function selectStudent(id: string) {
    const student = students.find((candidate) => candidate.id === id);
    setStudentId(id);
    if (!student) return;
    setDuration(student.defaultDurationMinutes);
    setAmount(Number(student.defaultFeeAmount));
    setMode(student.defaultMode);
    setLocation(student.defaultLocation ?? "");
    setMeetStrategy(student.meetStrategy);
    setManualMeetUrl(student.manualMeetUrl ?? "");
  }

  if (!initialStudent) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-6">
        <p className="font-extrabold">활성 학생을 먼저 추가해 주세요.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "error" && (
        <div
          className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-wash)] p-4 text-sm text-[var(--danger-ink)] outline-none"
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
        >
          <p className="flex items-center gap-2 font-extrabold">
            <AlertCircle aria-hidden="true" className="size-4" /> 수업 정보를 확인해 주세요.
          </p>
          {state.message && <p className="mt-2">{state.message}</p>}
        </div>
      )}

      <section className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">학생 기본값을 복사해 시작</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
          여기서 바꾼 값은 이 수업에만 남고 학생 기본값이나 지난 수업은 바뀌지 않아요.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-extrabold" htmlFor="studentId">
            학생 <span className="text-[var(--danger-ink)]">*</span>
            <select
              className={fieldClass}
              id="studentId"
              name="studentId"
              onChange={(event) => selectStudent(event.target.value)}
              value={studentId}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-extrabold" htmlFor="startsAt">
            시작 시간 <span className="text-[var(--danger-ink)]">*</span>
            <input
              className={fieldClass}
              defaultValue={formatKoreanDateTimeInput(new Date())}
              id="startsAt"
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="text-sm font-extrabold" htmlFor="durationMinutes">
            수업 시간(분)
            <input
              className={`${fieldClass} tabular-nums`}
              id="durationMinutes"
              max="600"
              min="15"
              name="durationMinutes"
              onChange={(event) => setDuration(Number(event.target.value))}
              step="15"
              type="number"
              value={duration}
            />
          </label>
          <label className="text-sm font-extrabold" htmlFor="amount">
            수업료(원)
            <input
              className={`${fieldClass} tabular-nums`}
              id="amount"
              inputMode="numeric"
              min="1"
              name="amount"
              onChange={(event) => setAmount(Number(event.target.value))}
              step="1"
              type="number"
              value={amount}
            />
          </label>
          <label className="text-sm font-extrabold" htmlFor="mode">
            수업 방식
            <select
              className={fieldClass}
              id="mode"
              name="mode"
              onChange={(event) => {
                const nextMode = event.target.value as LessonMode;
                setMode(nextMode);
                if (nextMode === "online" && meetStrategy === "none") {
                  setMeetStrategy("google_generated");
                }
              }}
              value={mode}
            >
              <option value="online">온라인</option>
              <option value="in_person">대면</option>
            </select>
          </label>
          {mode === "in_person" ? (
            <label className="text-sm font-extrabold" htmlFor="inPersonLocation">
              <span className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4" /> 방문 장소
              </span>
              <input
                className={fieldClass}
                id="inPersonLocation"
                name="inPersonLocation"
                onChange={(event) => setLocation(event.target.value)}
                required
                value={location}
              />
              <input name="meetStrategy" type="hidden" value="none" />
            </label>
          ) : (
            <>
              <label className="text-sm font-extrabold" htmlFor="meetStrategy">
                <span className="flex items-center gap-2">
                  <Video aria-hidden="true" className="size-4" /> Meet 방식
                </span>
                <select
                  className={fieldClass}
                  id="meetStrategy"
                  name="meetStrategy"
                  onChange={(event) => setMeetStrategy(event.target.value as MeetStrategy)}
                  value={meetStrategy}
                >
                  <option value="google_generated">이 수업용 mock 회의 생성</option>
                  <option value="manual_reusable">직접 관리 주소 사용</option>
                </select>
              </label>
              {meetStrategy === "manual_reusable" && (
                <label className="text-sm font-extrabold sm:col-span-2" htmlFor="manualMeetUrl">
                  직접 관리 Meet 주소
                  <input
                    className={fieldClass}
                    id="manualMeetUrl"
                    name="manualMeetUrl"
                    onChange={(event) => setManualMeetUrl(event.target.value)}
                    type="url"
                    value={manualMeetUrl}
                  />
                </label>
              )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--accent-wash)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <NotebookPen aria-hidden="true" className="size-5" /> 수업 준비
        </h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="text-sm font-extrabold" htmlFor="prepNotes">
            준비 메모
            <textarea
              className={`${fieldClass} min-h-32 py-3`}
              id="prepNotes"
              name="prepNotes"
              placeholder="오늘 확인할 진도와 설명 순서를 적어요."
            />
          </label>
          <label className="text-sm font-extrabold" htmlFor="prepItems">
            준비 체크리스트
            <textarea
              className={`${fieldClass} min-h-32 py-3`}
              defaultValue={"숙제 채점\n진도 범위 확인"}
              id="prepItems"
              name="prepItems"
              placeholder="한 줄에 하나씩 입력"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button disabled={pending} size="large" type="submit" variant="accent">
          {pending ? "수업 만드는 중…" : "이 값으로 수업 만들기"}
        </Button>
      </div>
    </form>
  );
}
