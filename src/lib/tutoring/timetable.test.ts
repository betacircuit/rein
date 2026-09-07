import { describe, expect, it } from "vitest";

import {
  collisionLanes,
  durationBetween,
  endTimeFor,
  PERSONAL_SCHEDULE_PALETTE,
  personalScheduleColor,
  parseClockTime,
  scheduleLabel,
  studentScheduleColor,
  timetablePosition,
} from "./timetable";

describe("weekly timetable", () => {
  it("분 단위 시작·종료 시각을 정확히 계산한다", () => {
    expect(parseClockTime("13:25")).toBe(805);
    expect(durationBetween("13:25", "15:10")).toBe(105);
    expect(endTimeFor("13:25", 105)).toBe("15:10");
  });

  it("끝 시간이 시작보다 빠르면 거부한다", () => {
    expect(durationBetween("18:00", "17:55")).toBeNull();
  });

  it("06시 기준 그리드 위치를 계산한다", () => {
    expect(timetablePosition("07:00", 60)).toEqual({ top: 66, height: 66 });
  });

  it("홈의 압축된 주간 그리드 범위와 배율을 적용한다", () => {
    const position = timetablePosition("09:00", 120, {
      startMinute: 8 * 60,
      endMinute: 22 * 60,
      pixelsPerMinute: 0.72,
    });
    expect(position.top).toBeCloseTo(43.2);
    expect(position.height).toBeCloseTo(86.4);
  });

  it("개인 일정 팔레트를 15개 생성 순서마다 순환한다", () => {
    expect(PERSONAL_SCHEDULE_PALETTE).toHaveLength(15);
    expect(personalScheduleColor(0)).toBe(PERSONAL_SCHEDULE_PALETTE[0]);
    expect(personalScheduleColor(14)).toBe(PERSONAL_SCHEDULE_PALETTE[14]);
    expect(personalScheduleColor(15)).toBe(PERSONAL_SCHEDULE_PALETTE[0]);
  });

  it("학생 수업도 같은 15색 팔레트에서 학생별로 안정된 색을 사용한다", () => {
    const first = studentScheduleColor("student-a");
    expect(PERSONAL_SCHEDULE_PALETTE).toContain(first);
    expect(studentScheduleColor("student-a")).toBe(first);
    expect(PERSONAL_SCHEDULE_PALETTE).toContain(studentScheduleColor("student-b"));
  });

  it("학생 카드에 요일과 시작·종료 시각을 한 줄로 표시한다", () => {
    expect(scheduleLabel({ weekday: 3, startTime: "18:00", durationMinutes: 120 })).toBe(
      "수요일 18:00–20:00",
    );
  });

  it("겹치는 일정은 별도 레인에 놓고 경계가 맞닿은 일정은 같은 레인을 쓴다", () => {
    const lanes = collisionLanes([
      { id: "a", startTime: "18:00", durationMinutes: 120 },
      { id: "b", startTime: "18:30", durationMinutes: 60 },
      { id: "c", startTime: "20:00", durationMinutes: 60 },
    ]);

    expect(lanes.get("a")).toEqual({ laneIndex: 0, laneCount: 2 });
    expect(lanes.get("b")).toEqual({ laneIndex: 1, laneCount: 2 });
    expect(lanes.get("c")).toEqual({ laneIndex: 0, laneCount: 1 });
  });
});
