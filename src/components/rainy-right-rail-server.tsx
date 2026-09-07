import { formatKoreanDate, formatSeoulDateKey, getSeoulWeekday } from "@/lib/format/date";
import type { TodayTask } from "@/lib/rainy/today-storage";
import { readRemoteTutoringData } from "@/lib/tutoring/remote-repository";
import { endTimeFor } from "@/lib/tutoring/timetable";
import { RainyRightRail } from "./rainy-right-rail";

export async function RainyRightRailServer() {
  const now = new Date();
  let data: Awaited<ReturnType<typeof readRemoteTutoringData>> = null;
  try {
    data = await readRemoteTutoringData();
  } catch {
    // The rail is auxiliary: a temporary tutoring read failure must not replace the center page.
  }
  const weekday = getSeoulWeekday(now);
  const storageDate = formatSeoulDateKey(now);
  const initialTasks: TodayTask[] = (data?.schedules ?? [])
    .filter((schedule) => schedule.weekday === weekday)
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .map((schedule, index) => ({
      id: `schedule-${schedule.id}`,
      title: `${schedule.studentName} 수업`,
      detail: `${endTimeFor(schedule.startTime, schedule.durationMinutes)}까지`,
      time: schedule.startTime,
      done: false,
      priority: index === 0,
      source: "schedule",
    }));

  return (
    <RainyRightRail
      dateLabel={formatKoreanDate(now, { month: "long", day: "numeric", weekday: "short" })}
      initialTasks={initialTasks}
      storageDate={storageDate}
    />
  );
}
