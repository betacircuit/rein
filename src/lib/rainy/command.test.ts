import { describe, expect, it } from "vitest";

import { parseRainyScheduleCommand, type RainyStudent } from "./command";

const students: RainyStudent[] = [
  { id: "student-1", name: "김민지", defaultDurationMinutes: 90 },
  { id: "student-2", name: "이서윤", defaultDurationMinutes: 120 },
];

describe("RAINY schedule command", () => {
  it("UX-009 parses a Korean schedule command with an explicit duration", () => {
    const result = parseRainyScheduleCommand({
      input: "목요일 오후 7시 김민지 2시간 수업 추가",
      students,
      todayWeekday: 5,
    });

    expect(result).toEqual({
      ok: true,
      command: {
        student: students[0],
        weekday: 4,
        startTime: "19:00",
        durationMinutes: 120,
      },
    });
  });

  it("TUT-009 uses the student's default duration and resolves tomorrow", () => {
    const result = parseRainyScheduleCommand({
      input: "내일 18:30 이서윤 수업 잡아줘",
      students,
      todayWeekday: 5,
    });

    expect(result).toMatchObject({
      ok: true,
      command: { weekday: 6, startTime: "18:30", durationMinutes: 120 },
    });
  });

  it("asks for 오전 or 오후 instead of guessing an ambiguous time", () => {
    const result = parseRainyScheduleCommand({
      input: "목요일 7시 김민지 수업 추가",
      students,
      todayWeekday: 5,
    });

    expect(result).toEqual({
      ok: false,
      message: "오전인지 오후인지 알려 주세요. 예: ‘오후 7시’.",
    });
  });

  it("keeps destructive schedule commands behind the existing confirmation flow", () => {
    const result = parseRainyScheduleCommand({
      input: "김민지 목요일 오후 7시 수업 삭제",
      students,
      todayWeekday: 5,
    });

    expect(result).toEqual({
      ok: false,
      message: "삭제와 취소는 확인이 필요한 작업이에요. 시간표 카드의 삭제 버튼을 이용해 주세요.",
    });
  });
});
