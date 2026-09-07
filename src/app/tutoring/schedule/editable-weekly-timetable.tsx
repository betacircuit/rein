"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";

import type { RemotePersonalSchedule, RemoteSchedule } from "@/lib/tutoring/remote-repository";
import {
  WeeklyTimetable,
  type DragState,
  type ScheduleDraft,
  type ScheduleMove,
} from "./weekly-timetable";

/**
 * Holds the drag state for the timetable. Keeping it here leaves WeeklyTimetable
 * a pure rendering component that can be exercised without a React renderer.
 */
export function EditableWeeklyTimetable(props: {
  schedules: RemoteSchedule[];
  personalSchedules?: RemotePersonalSchedule[];
  draft?: ScheduleDraft | null | undefined;
  onDraftMove?: ((weekday: number, startTime: string) => void) | undefined;
  onEditItem?: ((item: ScheduleDraft) => void) | undefined;
  onCommitMove?: ((move: ScheduleMove) => void) | undefined;
  renderDeleteAction?: ((item: ScheduleMove) => ReactNode) | undefined;
}) {
  const dayColumnsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);

  return <WeeklyTimetable {...props} dayColumnsRef={dayColumnsRef} drag={drag} setDrag={setDrag} />;
}
