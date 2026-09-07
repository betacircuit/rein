export type TodayCommand =
  | { type: "add_task"; title: string; time: string | null }
  | { type: "complete_task"; query: string }
  | { type: "set_priority_only"; enabled: boolean }
  | { type: "set_focus_mode"; enabled: boolean }
  | { type: "unknown" };

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function extractTime(input: string) {
  const match = input.match(/(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2})|시(?:\s*(\d{1,2})\s*분)?)/);
  if (!match) return { time: null, matchedText: "" };

  const meridiem = match[1];
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? match[4] ?? 0);
  if (minute > 59 || hour > 23 || (meridiem && hour > 12)) {
    return { time: null, matchedText: "" };
  }
  if (meridiem === "오전" && hour === 12) hour = 0;
  if (meridiem === "오후" && hour < 12) hour += 12;
  return { time: `${twoDigits(hour)}:${twoDigits(minute)}`, matchedText: match[0] };
}

function taskTitle(input: string, matchedTime: string) {
  return input
    .replace(matchedTime, " ")
    .replace(/오늘(?:의)?/g, " ")
    .replace(/할\s*일(?:에|로)?/g, " ")
    .replace(/(?:좀\s*)?(?:추가|등록|기억)(?:해 주세요|해주라|해줘|해 둬|해)?/g, " ")
    .replace(/(?:해야\s*(?:해|돼|합니다)|할\s*거야)/g, " ")
    .replace(/[.!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTodayCommand(input: string): TodayCommand {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return { type: "unknown" };

  if (/집중\s*모드/.test(normalized)) {
    if (/꺼|해제|종료/.test(normalized)) return { type: "set_focus_mode", enabled: false };
    if (/켜|시작|설정/.test(normalized)) return { type: "set_focus_mode", enabled: true };
  }
  if (/중요/.test(normalized) && /(만|모아|보여)/.test(normalized)) {
    return { type: "set_priority_only", enabled: true };
  }
  if (/(전체|모두)/.test(normalized) && /(보여|보기|표시)/.test(normalized)) {
    return { type: "set_priority_only", enabled: false };
  }

  if (/(완료|끝냈|끝내|처리했)/.test(normalized)) {
    const query = normalized
      .replace(/오늘(?:의)?/g, " ")
      .replace(/할\s*일/g, " ")
      .replace(/(?:을|를)?\s*(?:완료|끝냈어|끝냈다|끝내줘|처리했어|처리했어요).*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { type: "complete_task", query };
  }

  if (/(추가|등록|기억|해야|할\s*일)/.test(normalized)) {
    const { time, matchedText } = extractTime(normalized);
    const title = taskTitle(normalized, matchedText);
    if (title) return { type: "add_task", title, time };
  }

  return { type: "unknown" };
}
