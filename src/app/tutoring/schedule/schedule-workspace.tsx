"use client";

import { Eye, LoaderCircle, Save, UserRound, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RemotePersonalSchedule, RemoteSchedule } from "@/lib/tutoring/remote-repository";
import { durationBetween, endTimeFor, personalScheduleColor } from "@/lib/tutoring/timetable";
import {
  savePersonalScheduleDraftAction,
  saveScheduleDraftAction,
  type ScheduleActionState,
} from "./actions";
import { type ScheduleDraft, WeeklyTimetable } from "./weekly-timetable";

const initialState: ScheduleActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-[var(--signal)]";

type StudentOption = { id: string; name: string; defaultDurationMinutes: number };

function timeAfter(startTime: string, durationMinutes: number) {
  return endTimeFor(startTime, durationMinutes);
}

export function ScheduleWorkspace({
  students,
  schedules,
  personalSchedules,
}: {
  students: StudentOption[];
  schedules: RemoteSchedule[];
  personalSchedules: RemotePersonalSchedule[];
}) {
  const [kind, setKind] = useState<ScheduleDraft["kind"]>(students.length ? "student" : "personal");
  const [editingId, setEditingId] = useState<string>();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [localError, setLocalError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const [studentState, studentAction, studentPending] = useActionState(
    async (previous: ScheduleActionState, formData: FormData) => {
      const result = await saveScheduleDraftAction(previous, formData);
      if (result.status === "success") {
        setDraft((current) => (current?.kind === "student" ? null : current));
        setEditingId(undefined);
      }
      return result;
    },
    initialState,
  );
  const [personalState, personalAction, personalPending] = useActionState(
    async (previous: ScheduleActionState, formData: FormData) => {
      const result = await savePersonalScheduleDraftAction(previous, formData);
      if (result.status === "success") {
        setDraft((current) => (current?.kind === "personal" ? null : current));
        setEditingId(undefined);
        setTitle("");
      }
      return result;
    },
    initialState,
  );
  const nextPersonalColorIndex =
    personalSchedules.reduce((maximum, item) => Math.max(maximum, item.creationOrder), 0) % 15;
  const activeState = kind === "student" ? studentState : personalState;
  const pending = kind === "student" ? studentPending : personalPending;

  function buildDraft() {
    setLocalError(undefined);
    if (!formRef.current?.reportValidity()) return;
    if (kind === "personal" && !title.trim()) {
      setLocalError("일정 이름을 입력해 주세요.");
      return;
    }
    const durationMinutes = durationBetween(startTime, endTime);
    if (!durationMinutes || durationMinutes < 15 || durationMinutes > 600) {
      setLocalError("종료 시간은 시작보다 15분 이상 뒤여야 합니다.");
      return;
    }
    if (kind === "student") {
      const student = students.find((item) => item.id === studentId);
      if (!student) {
        setLocalError("학생을 선택해 주세요.");
        return;
      }
      setDraft({
        kind,
        id: editingId,
        studentId,
        title: student.name,
        weekday,
        startTime,
        durationMinutes,
      });
      return;
    }
    setDraft({
      kind,
      id: editingId,
      title: title.trim(),
      weekday,
      startTime,
      durationMinutes,
      colorIndex: draft?.kind === "personal" ? draft.colorIndex : nextPersonalColorIndex,
    });
  }

  function selectKind(nextKind: ScheduleDraft["kind"]) {
    if (nextKind === kind) return;
    setKind(nextKind);
    setEditingId(undefined);
    setDraft(null);
    setLocalError(undefined);
  }

  function editItem(item: ScheduleDraft) {
    setKind(item.kind);
    setEditingId(item.id);
    setStudentId(item.studentId ?? students[0]?.id ?? "");
    setTitle(item.kind === "personal" ? item.title : "");
    setWeekday(item.weekday);
    setStartTime(item.startTime);
    setEndTime(timeAfter(item.startTime, item.durationMinutes));
    setDraft(item);
    setLocalError(undefined);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.querySelector<HTMLElement>("input, select")?.focus();
    });
  }

  function updateDraft(weekdayValue: number, startTimeValue: string) {
    setWeekday(weekdayValue);
    setStartTime(startTimeValue);
    setEndTime((currentEnd) => {
      if (!draft) return currentEnd;
      return timeAfter(startTimeValue, draft.durationMinutes);
    });
    setDraft((current) =>
      current ? { ...current, weekday: weekdayValue, startTime: startTimeValue } : current,
    );
  }

  const previewMatchesKind = draft?.kind === kind;
  const statusMessage = localError ?? activeState.message;

  return (
    <>
      <section
        className="rein-schedule-editor border-2 border-black bg-[var(--surface)] p-5 shadow-[5px_5px_0_#101010] sm:p-6"
        ref={editorRef}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
          <p className="rein-meta">{"/// 일정 배치"}</p>
          <div className="flex border-2 border-black" role="group" aria-label="일정 종류">
            <button
              aria-pressed={kind === "student"}
              className="rein-schedule-kind"
              disabled={!students.length}
              onClick={() => selectKind("student")}
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4" /> 학생 수업
            </button>
            <button
              aria-pressed={kind === "personal"}
              className="rein-schedule-kind"
              onClick={() => selectKind("personal")}
              type="button"
            >
              <span
                aria-hidden="true"
                className="size-4 border-2 border-black"
                style={{ backgroundColor: personalScheduleColor(nextPersonalColorIndex) }}
              />
              개인 일정
            </button>
          </div>
        </div>

        <form
          action={kind === "student" ? studentAction : personalAction}
          className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_.8fr_1fr_1fr_auto] xl:items-end"
          ref={formRef}
        >
          {kind === "student" ? (
            <>
              <input name="scheduleId" type="hidden" value={editingId ?? ""} />
              {editingId && <input name="studentId" type="hidden" value={studentId} />}
              <label className="text-sm font-bold" htmlFor="schedule-editor-student">
                학생
                <select
                  className={fieldClass}
                  disabled={Boolean(editingId)}
                  id="schedule-editor-student"
                  name={editingId ? undefined : "studentId"}
                  onChange={(event) => {
                    setStudentId(event.target.value);
                    setDraft((current) => {
                      const student = students.find((item) => item.id === event.target.value);
                      return current?.kind === "student" && student
                        ? { ...current, studentId: student.id, title: student.name }
                        : current;
                    });
                  }}
                  required
                  value={studentId}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <input name="personalScheduleId" type="hidden" value={editingId ?? ""} />
              <label className="text-sm font-bold" htmlFor="schedule-editor-title">
                일정 이름
                <input
                  className={fieldClass}
                  id="schedule-editor-title"
                  maxLength={80}
                  name="title"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setDraft((current) =>
                      current?.kind === "personal"
                        ? { ...current, title: event.target.value }
                        : current,
                    );
                  }}
                  required
                  value={title}
                />
              </label>
            </>
          )}
          <label className="text-sm font-bold" htmlFor="schedule-editor-weekday">
            요일
            <select
              className={fieldClass}
              id="schedule-editor-weekday"
              name="weekday"
              onChange={(event) => updateDraft(Number(event.target.value), startTime)}
              value={weekday}
            >
              <option value="1">월</option>
              <option value="2">화</option>
              <option value="3">수</option>
              <option value="4">목</option>
              <option value="5">금</option>
              <option value="6">토</option>
              <option value="0">일</option>
            </select>
          </label>
          <label className="text-sm font-bold" htmlFor="schedule-editor-start">
            시작
            <input
              className={fieldClass}
              id="schedule-editor-start"
              name="startTime"
              onChange={(event) => updateDraft(weekday, event.target.value)}
              required
              step="900"
              type="time"
              value={startTime}
            />
          </label>
          <label className="text-sm font-bold" htmlFor="schedule-editor-end">
            종료
            <input
              className={fieldClass}
              id="schedule-editor-end"
              name="endTime"
              onChange={(event) => {
                setEndTime(event.target.value);
                const durationMinutes = durationBetween(startTime, event.target.value);
                setDraft((current) =>
                  current && durationMinutes ? { ...current, durationMinutes } : current,
                );
              }}
              required
              step="900"
              type="time"
              value={endTime}
            />
          </label>
          <div className="flex flex-wrap gap-2 xl:flex-col">
            {!previewMatchesKind ? (
              <Button
                className="flex-1"
                onClick={(event) => {
                  // Building the draft swaps this same DOM position to a submit button.
                  // Cancel the click default before React commits that swap, or the
                  // browser can submit the form immediately instead of showing preview.
                  event.preventDefault();
                  buildDraft();
                }}
                size="large"
                type="button"
              >
                <Eye aria-hidden="true" className="size-4" /> 미리 배치
              </Button>
            ) : (
              <>
                <Button className="flex-1" disabled={pending} size="large" type="submit">
                  {pending ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="size-4" />
                  )}
                  저장
                </Button>
                <Button
                  aria-label="저장 전 일정 취소"
                  onClick={() => {
                    setDraft(null);
                    setEditingId(undefined);
                  }}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </>
            )}
          </div>
          <p
            className="text-sm font-bold sm:col-span-2 xl:col-span-5"
            id="schedule-editor-status"
            role={statusMessage ? "status" : undefined}
          >
            {statusMessage ??
              (previewMatchesKind
                ? "점 손잡이를 드래그하거나 방향키·요일·시간 입력으로 옮긴 뒤 저장하세요."
                : "먼저 미리 배치하면 저장 전 위치를 바꿀 수 있습니다.")}
          </p>
        </form>
      </section>

      <section aria-label="주간 시간표">
        <WeeklyTimetable
          draft={previewMatchesKind ? draft : null}
          onDraftMove={previewMatchesKind ? updateDraft : undefined}
          onEditItem={editItem}
          personalSchedules={personalSchedules}
          schedules={schedules}
        />
      </section>
    </>
  );
}
