"use client";

import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { CSSProperties, DragEvent, KeyboardEvent } from "react";

import { ConfirmActionForm } from "@/components/ui/confirm-action";
import type { RemotePersonalSchedule, RemoteSchedule } from "@/lib/tutoring/remote-repository";
import {
  clockTimeFor,
  collisionLanes,
  endTimeFor,
  parseClockTime,
  personalScheduleColor,
  studentScheduleColor,
  timetablePosition,
  TIMETABLE_END_MINUTE,
  TIMETABLE_START_MINUTE,
  WEEKDAYS,
} from "@/lib/tutoring/timetable";
import { removePersonalScheduleAction, removeScheduleAction } from "./actions";

export type ScheduleDraft = {
  kind: "student" | "personal";
  id?: string | undefined;
  studentId?: string | undefined;
  title: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  colorIndex?: number | undefined;
};

type DisplayItem = ScheduleDraft & {
  key: string;
  source: RemoteSchedule | RemotePersonalSchedule | null;
  isDraft: boolean;
};

function displayColor(item: DisplayItem) {
  return item.kind === "personal"
    ? personalScheduleColor(item.colorIndex ?? 0)
    : studentScheduleColor(item.studentId ?? item.key);
}

function toDisplayItems({
  schedules,
  personalSchedules,
  draft,
}: {
  schedules: RemoteSchedule[];
  personalSchedules: RemotePersonalSchedule[];
  draft?: ScheduleDraft | null | undefined;
}) {
  const hiddenKey = draft?.id ? `${draft.kind}:${draft.id}` : null;
  const items: DisplayItem[] = [
    ...schedules.map((schedule) => ({
      kind: "student" as const,
      id: schedule.id,
      key: `student:${schedule.id}`,
      studentId: schedule.studentId,
      title: schedule.studentName,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes,
      source: schedule,
      isDraft: false,
    })),
    ...personalSchedules.map((schedule) => ({
      kind: "personal" as const,
      id: schedule.id,
      key: `personal:${schedule.id}`,
      title: schedule.title,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes,
      colorIndex: schedule.colorIndex,
      source: schedule,
      isDraft: false,
    })),
  ].filter((item) => item.key !== hiddenKey);
  if (draft) items.push({ ...draft, key: "draft:preview", source: null, isDraft: true });
  return items;
}

function moveDraftWithKeyboard({
  event,
  item,
  rangeStart,
  rangeEnd,
  onDraftMove,
}: {
  event: KeyboardEvent<HTMLButtonElement>;
  item: DisplayItem;
  rangeStart: number;
  rangeEnd: number;
  onDraftMove?: ((weekday: number, startTime: string) => void) | undefined;
}) {
  if (!onDraftMove) return;
  const restoreHandleFocus = () => {
    window.requestAnimationFrame(() => {
      const visibleHandle = [
        ...document.querySelectorAll<HTMLButtonElement>(".rein-schedule-drag-handle"),
      ].find((handle) => handle.getClientRects().length > 0);
      visibleHandle?.focus();
    });
  };
  const currentMinute = parseClockTime(item.startTime) ?? rangeStart;
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    const delta = event.key === "ArrowUp" ? -15 : 15;
    const nextMinute = Math.max(
      rangeStart,
      Math.min(rangeEnd - item.durationMinutes, currentMinute + delta),
    );
    onDraftMove(item.weekday, clockTimeFor(nextMinute));
    restoreHandleFocus();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    const index = WEEKDAYS.findIndex((day) => day.value === item.weekday);
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    const next = Math.max(0, Math.min(WEEKDAYS.length - 1, index + delta));
    onDraftMove(WEEKDAYS[next]!.value, item.startTime);
    restoreHandleFocus();
  }
}

function DraftHandle({
  item,
  rangeStart,
  rangeEnd,
  onDraftMove,
}: {
  item: DisplayItem;
  rangeStart: number;
  rangeEnd: number;
  onDraftMove?: ((weekday: number, startTime: string) => void) | undefined;
}) {
  return (
    <button
      aria-label="저장 전 일정 이동. 방향키는 요일과 시간을 15분 단위로 바꿉니다."
      className="rein-schedule-drag-handle"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", "rein-schedule-draft");
      }}
      onKeyDown={(event) =>
        moveDraftWithKeyboard({ event, item, rangeStart, rangeEnd, onDraftMove })
      }
      type="button"
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
}

function ItemActions({
  item,
  editable,
  onEditItem,
}: {
  item: DisplayItem;
  editable: boolean;
  onEditItem?: ((item: ScheduleDraft) => void) | undefined;
}) {
  if (item.isDraft || !editable) return null;
  const action = item.kind === "personal" ? removePersonalScheduleAction : removeScheduleAction;
  return (
    <div className="rein-schedule-item-actions">
      {onEditItem && (
        <button
          aria-label={`${item.title} 일정 이동`}
          className="rein-schedule-item-action"
          onClick={() =>
            onEditItem({
              kind: item.kind,
              id: item.id,
              studentId: item.studentId,
              title: item.title,
              weekday: item.weekday,
              startTime: item.startTime,
              durationMinutes: item.durationMinutes,
              colorIndex: item.colorIndex,
            })
          }
          type="button"
        >
          <Pencil aria-hidden="true" className="size-3.5" />
        </button>
      )}
      <ConfirmActionForm action={action} confirmMessage="이 일정을 시간표에서 삭제할까요?">
        <input name="scheduleId" type="hidden" value={item.id} />
        <button
          aria-label={`${item.title} 일정 삭제`}
          className="rein-schedule-item-action"
          type="submit"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </button>
      </ConfirmActionForm>
    </div>
  );
}

export function WeeklyTimetable({
  schedules,
  personalSchedules = [],
  editable = true,
  variant = "default",
  draft,
  onDraftMove,
  onEditItem,
}: {
  schedules: RemoteSchedule[];
  personalSchedules?: RemotePersonalSchedule[];
  editable?: boolean;
  variant?: "default" | "home";
  draft?: ScheduleDraft | null | undefined;
  onDraftMove?: ((weekday: number, startTime: string) => void) | undefined;
  onEditItem?: ((item: ScheduleDraft) => void) | undefined;
}) {
  const items = toDisplayItems({ schedules, personalSchedules, draft });
  const starts = items
    .map((item) => parseClockTime(item.startTime))
    .filter((minute): minute is number => minute !== null);
  const ends = items.map((item) => (parseClockTime(item.startTime) ?? 0) + item.durationMinutes);
  const rangeStart =
    variant === "home"
      ? Math.max(
          TIMETABLE_START_MINUTE,
          Math.min(8 * 60, Math.floor((Math.min(...starts, 8 * 60) - 60) / 60) * 60),
        )
      : TIMETABLE_START_MINUTE;
  const rangeEnd =
    variant === "home"
      ? Math.min(
          TIMETABLE_END_MINUTE,
          Math.max(22 * 60, Math.ceil((Math.max(...ends, 22 * 60) + 60) / 60) * 60),
        )
      : TIMETABLE_END_MINUTE;
  const pixelsPerMinute = variant === "home" ? 0.72 : 1.1;
  const hours = Array.from(
    { length: (rangeEnd - rangeStart) / 60 + 1 },
    (_, index) => index + rangeStart / 60,
  );
  const timelineHeight = (rangeEnd - rangeStart) * pixelsPerMinute;
  // Quarter-hour guides are an editing affordance, not permanent timetable noise.
  // They appear only while the unsaved preview can be moved.
  const quarterHourMinutes = draft
    ? Array.from(
        { length: (rangeEnd - rangeStart) / 15 - 1 },
        (_, index) => rangeStart + (index + 1) * 15,
      ).filter((minute) => minute % 60 !== 0)
    : [];
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  })
    .format(new Date())
    .slice(0, 1);
  const todayWeekday = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }[todayLabel] ?? 0;

  return (
    <>
      <div className="space-y-4 lg:hidden">
        {items.length === 0 && (
          <div className="border-2 border-dashed border-black bg-[var(--surface)] p-8 text-center font-black shadow-[4px_4px_0_#101010]">
            등록된 시간이 없습니다.
          </div>
        )}
        {WEEKDAYS.map((day) => {
          const dayItems = items
            .filter((item) => item.weekday === day.value)
            .sort((left, right) => left.startTime.localeCompare(right.startTime));
          if (!dayItems.length) return null;
          return (
            <section
              className="border-2 border-black bg-[var(--surface)] p-4 shadow-[4px_4px_0_#101010]"
              key={day.value}
            >
              <h2 className="font-black">{day.label}요일</h2>
              <div className="mt-3 space-y-2">
                {dayItems.map((item) => (
                  <article
                    className="flex min-h-14 items-center justify-between gap-3 border-2 border-black p-3"
                    key={item.key}
                    style={{ backgroundColor: displayColor(item) }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black">{item.title}</p>
                      <p className="mt-1 text-sm font-bold tabular-nums">
                        {item.startTime}–{endTimeFor(item.startTime, item.durationMinutes)} ·{" "}
                        {item.kind === "student" ? "수업" : "개인"}
                      </p>
                    </div>
                    {item.isDraft ? (
                      <DraftHandle
                        item={item}
                        onDraftMove={onDraftMove}
                        rangeEnd={rangeEnd}
                        rangeStart={rangeStart}
                      />
                    ) : (
                      <ItemActions editable={editable} item={item} onEditItem={onEditItem} />
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div
        className="rein-snutt-timetable hidden overflow-hidden border-2 border-black bg-[var(--surface)] shadow-[6px_6px_0_#101010] lg:block"
        data-variant={variant}
      >
        <div className="rein-snutt-timetable__head grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] border-b-2 border-black bg-[var(--cyan)]">
          <div />
          {WEEKDAYS.map((day) => (
            <div
              className="border-l-2 border-black py-3 text-center text-sm font-black"
              data-today={day.value === todayWeekday}
              key={day.value}
            >
              {day.label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height: timelineHeight }}>
            {hours.slice(0, -1).map((hour, index) => (
              <span
                className={`absolute right-3 text-xs font-semibold text-[var(--muted-ink)] ${index === 0 ? "top-1" : "-translate-y-2"}`}
                key={hour}
                style={
                  index === 0 ? undefined : { top: (hour * 60 - rangeStart) * pixelsPerMinute }
                }
              >
                {hour.toString().padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {WEEKDAYS.map((day) => {
            const dayItems = items.filter((item) => item.weekday === day.value);
            const lanes = collisionLanes(
              dayItems.map((item) => ({
                id: item.key,
                startTime: item.startTime,
                durationMinutes: item.durationMinutes,
              })),
            );
            return (
              <div
                className="relative border-l-2 border-black"
                data-today={day.value === todayWeekday}
                key={day.value}
                onDragOver={(event) => {
                  if (!draft || !onDraftMove) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  if (!draft || !onDraftMove) return;
                  event.preventDefault();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const rawMinute = rangeStart + (event.clientY - bounds.top) / pixelsPerMinute;
                  const snappedMinute = Math.round(rawMinute / 15) * 15;
                  const boundedMinute = Math.max(
                    rangeStart,
                    Math.min(rangeEnd - draft.durationMinutes, snappedMinute),
                  );
                  onDraftMove(day.value, clockTimeFor(boundedMinute));
                }}
                style={{ height: timelineHeight }}
              >
                {hours.slice(0, -1).map((hour) => (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-black/35"
                    key={hour}
                    style={{ top: (hour * 60 - rangeStart) * pixelsPerMinute }}
                  />
                ))}
                {quarterHourMinutes.map((minute) => (
                  <span
                    aria-hidden="true"
                    className="rein-schedule-quarter-tick"
                    key={minute}
                    style={{ top: (minute - rangeStart) * pixelsPerMinute }}
                  />
                ))}
                {dayItems.map((item) => {
                  const position = timetablePosition(item.startTime, item.durationMinutes, {
                    startMinute: rangeStart,
                    endMinute: rangeEnd,
                    pixelsPerMinute,
                  });
                  const lane = lanes.get(item.key) ?? { laneIndex: 0, laneCount: 1 };
                  const laneWidth = 100 / lane.laneCount;
                  const style: CSSProperties = {
                    ...position,
                    left: `calc(${lane.laneIndex * laneWidth}% + 0.25rem)`,
                    width: `calc(${laneWidth}% - 0.5rem)`,
                    backgroundColor: displayColor(item),
                  };
                  return (
                    <article
                      aria-label={`${item.title}, ${day.label}요일 ${item.startTime}부터 ${endTimeFor(item.startTime, item.durationMinutes)}까지, ${item.kind === "student" ? "학생 수업" : "개인 일정"}${item.isDraft ? ", 저장 전" : ""}`}
                      className={`rein-schedule-block absolute z-10 overflow-hidden border-2 border-black p-2 shadow-[3px_3px_0_#101010] ${item.isDraft ? "rein-schedule-block--draft" : ""}`}
                      key={item.key}
                      style={style}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{item.title}</p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums">
                            {item.startTime}–{endTimeFor(item.startTime, item.durationMinutes)}
                          </p>
                        </div>
                        {item.isDraft ? (
                          <DraftHandle
                            item={item}
                            onDraftMove={onDraftMove}
                            rangeEnd={rangeEnd}
                            rangeStart={rangeStart}
                          />
                        ) : (
                          <ItemActions editable={editable} item={item} onEditItem={onEditItem} />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
