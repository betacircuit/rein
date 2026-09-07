export const WEEKDAYS = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 0, label: "일" },
] as const;

export const TIMETABLE_START_MINUTE = 6 * 60;
export const TIMETABLE_END_MINUTE = 24 * 60;
export const PIXELS_PER_MINUTE = 1.1;

export const PERSONAL_SCHEDULE_PALETTE = [
  "#61e796",
  "#32c8df",
  "#d92fe9",
  "#ffd35a",
  "#ff7a4b",
  "#8ee7ff",
  "#ff9fd8",
  "#b8f36b",
  "#ffbc5d",
  "#a9a0ff",
  "#63e6d7",
  "#ff8f8f",
  "#d6f05c",
  "#72b7ff",
  "#e8a2ff",
] as const;

export type TimetableCollisionItem = {
  id: string;
  startTime: string;
  durationMinutes: number;
};

export type TimetableLane = {
  laneIndex: number;
  laneCount: number;
};

export function parseClockTime(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function durationBetween(start: string, end: string) {
  const startMinute = parseClockTime(start);
  const endMinute = parseClockTime(end);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  return endMinute - startMinute;
}

export function endTimeFor(start: string, durationMinutes: number) {
  const startMinute = parseClockTime(start) ?? 0;
  const endMinute = Math.min(startMinute + durationMinutes, 24 * 60);
  const hours = Math.floor(endMinute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (endMinute % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function clockTimeFor(totalMinutes: number) {
  const bounded = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  return `${Math.floor(bounded / 60)
    .toString()
    .padStart(2, "0")}:${(bounded % 60).toString().padStart(2, "0")}`;
}

export function personalScheduleColor(colorIndex: number) {
  const normalized =
    ((Math.trunc(colorIndex) % PERSONAL_SCHEDULE_PALETTE.length) +
      PERSONAL_SCHEDULE_PALETTE.length) %
    PERSONAL_SCHEDULE_PALETTE.length;
  return PERSONAL_SCHEDULE_PALETTE[normalized];
}

export function studentScheduleColor(studentId: string) {
  const stableIndex = [...studentId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return personalScheduleColor(stableIndex);
}

export function scheduleLabel({
  weekday,
  startTime,
  durationMinutes,
}: {
  weekday: number;
  startTime: string;
  durationMinutes: number;
}) {
  const day = WEEKDAYS.find((item) => item.value === weekday)?.label ?? "?";
  return `${day}요일 ${startTime}–${endTimeFor(startTime, durationMinutes)}`;
}

export function collisionLanes(items: TimetableCollisionItem[]) {
  const result = new Map<string, TimetableLane>();
  const sorted = [...items].sort((left, right) => {
    const byStart = (parseClockTime(left.startTime) ?? 0) - (parseClockTime(right.startTime) ?? 0);
    return byStart || left.id.localeCompare(right.id);
  });
  let group: Array<TimetableCollisionItem & { start: number; end: number; laneIndex: number }> = [];
  let groupEnd = -1;

  const finishGroup = () => {
    const laneCount = group.reduce((maximum, item) => Math.max(maximum, item.laneIndex + 1), 1);
    group.forEach((item) => result.set(item.id, { laneIndex: item.laneIndex, laneCount }));
    group = [];
    groupEnd = -1;
  };

  for (const item of sorted) {
    const start = parseClockTime(item.startTime) ?? 0;
    const end = start + item.durationMinutes;
    if (group.length && start >= groupEnd) finishGroup();
    const occupied = new Set(
      group.filter((placed) => placed.end > start).map((placed) => placed.laneIndex),
    );
    let laneIndex = 0;
    while (occupied.has(laneIndex)) laneIndex += 1;
    group.push({ ...item, start, end, laneIndex });
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length) finishGroup();
  return result;
}

export function timetablePosition(
  start: string,
  durationMinutes: number,
  options: {
    startMinute?: number;
    endMinute?: number;
    pixelsPerMinute?: number;
  } = {},
) {
  const rangeStart = options.startMinute ?? TIMETABLE_START_MINUTE;
  const rangeEnd = options.endMinute ?? TIMETABLE_END_MINUTE;
  const scale = options.pixelsPerMinute ?? PIXELS_PER_MINUTE;
  const startMinute = parseClockTime(start) ?? rangeStart;
  const clippedStart = Math.max(startMinute, rangeStart);
  const clippedEnd = Math.min(startMinute + durationMinutes, rangeEnd);
  return {
    top: (clippedStart - rangeStart) * scale,
    height: Math.max((clippedEnd - clippedStart) * scale, 28),
  };
}
