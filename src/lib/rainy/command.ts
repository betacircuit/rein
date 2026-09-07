export type RainyStudent = {
  id: string;
  name: string;
  defaultDurationMinutes: number;
};

export type RainyScheduleCommand = {
  student: RainyStudent;
  weekday: number;
  startTime: string;
  durationMinutes: number;
};

export type RainyParseResult =
  { ok: true; command: RainyScheduleCommand } | { ok: false; message: string };

const weekdayByLabel = new Map([
  ["일", 0],
  ["월", 1],
  ["화", 2],
  ["수", 3],
  ["목", 4],
  ["금", 5],
  ["토", 6],
]);

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function parseWeekday(input: string, todayWeekday: number) {
  if (input.includes("내일")) return (todayWeekday + 1) % 7;
  if (input.includes("오늘")) return todayWeekday;
  const matched = input.match(/([월화수목금토일])(?:요일)?/);
  if (matched?.[1]) return weekdayByLabel.get(matched[1]) ?? null;
  return null;
}

function parseStartTime(input: string): { value: string | null; ambiguous: boolean } {
  const colon = input.match(/(?:(오전|오후)\s*)?(\d{1,2})\s*:\s*(\d{2})/);
  const korean = input.match(/(?:(오전|오후)\s*)?(\d{1,2})\s*시(?!간)(?:\s*(\d{1,2})\s*분)?/);
  const matched = colon ?? korean;
  if (!matched) return { value: null, ambiguous: false };

  const meridiem = matched[1];
  let hour = Number(matched[2]);
  const minute = Number(matched[3] ?? 0);
  if (minute > 59 || hour > 23) return { value: null, ambiguous: false };
  if (!colon && !meridiem && hour <= 12) return { value: null, ambiguous: true };
  if (meridiem && hour > 12) return { value: null, ambiguous: false };
  if (meridiem === "오전" && hour === 12) hour = 0;
  if (meridiem === "오후" && hour < 12) hour += 12;
  return { value: `${twoDigits(hour)}:${twoDigits(minute)}`, ambiguous: false };
}

function parseDuration(input: string, fallback: number) {
  const hours = input.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (hours) return Math.round(Number(hours[1]) * 60);
  const minutes = input.match(/(\d+)\s*분\s*(?:동안|수업)/);
  if (minutes) return Number(minutes[1]);
  return fallback;
}

export function parseRainyScheduleCommand({
  input,
  students,
  todayWeekday,
}: {
  input: string;
  students: RainyStudent[];
  todayWeekday: number;
}): RainyParseResult {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!students.length) {
    return {
      ok: false,
      message: "먼저 학생을 등록해 주세요. 학생이 있어야 수업 일정을 만들 수 있어요.",
    };
  }
  if (/삭제|취소|지워/.test(normalized)) {
    return {
      ok: false,
      message: "삭제와 취소는 확인이 필요한 작업이에요. 시간표 카드의 삭제 버튼을 이용해 주세요.",
    };
  }

  const student = [...students]
    .sort((left, right) => right.name.length - left.name.length)
    .find((item) => normalized.includes(item.name));
  if (!student) {
    return {
      ok: false,
      message: `학생 이름을 알려 주세요. 현재 학생: ${students
        .slice(0, 3)
        .map((item) => item.name)
        .join(", ")}`,
    };
  }

  const weekday = parseWeekday(normalized, todayWeekday);
  if (weekday === null) {
    return { ok: false, message: "요일을 알려 주세요. ‘목요일’처럼 말하면 돼요." };
  }

  const start = parseStartTime(normalized);
  if (start.ambiguous) {
    return { ok: false, message: "오전인지 오후인지 알려 주세요. 예: ‘오후 7시’." };
  }
  if (!start.value) {
    return { ok: false, message: "시작 시간을 알려 주세요. 예: ‘오후 7시’ 또는 ‘19:00’." };
  }

  const durationMinutes = parseDuration(normalized, student.defaultDurationMinutes);
  if (durationMinutes < 15 || durationMinutes > 600) {
    return { ok: false, message: "수업 시간은 15분에서 10시간 사이로 말해 주세요." };
  }

  return {
    ok: true,
    command: { student, weekday, startTime: start.value, durationMinutes },
  };
}
