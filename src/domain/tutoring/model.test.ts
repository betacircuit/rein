import { describe, expect, it } from "vitest";

import { toKrw } from "@/domain/money/krw";
import {
  calculateStudentMonthMetrics,
  createLessonFromStudent,
  createStudent,
  materializeWeeklySchedule,
  normalizeStudentInput,
  syncMockCalendarEvent,
  transitionLessonStatus,
  updateStudentDefaults,
  type StudentInput,
  type TutoringSchedule,
} from "@/domain/tutoring/model";

const now = "2026-09-02T04:00:00.000Z";
const baseInput: StudentInput = {
  name: "김민준",
  tutoringType: "subject",
  subject: "math",
  defaultMode: "online",
  defaultFeeAmount: toKrw(60_000),
  defaultDurationMinutes: 120,
  defaultLocation: null,
  meetStrategy: "google_generated",
  manualMeetUrl: null,
  payerAliases: ["김민준 어머니"],
  notes: "미적분 중심",
};
const student = createStudent("student-1", "owner-1", baseInput, now);

describe("TUT-001 TUT-002 TUT-003 TUT-004 student invariants", () => {
  it("accepts only the three modeled subjects for subject tutoring", () => {
    for (const subject of ["math", "physics", "chemistry"] as const) {
      expect(normalizeStudentInput({ ...baseInput, subject }).subject).toBe(subject);
    }
    expect(() => normalizeStudentInput({ ...baseInput, subject: null })).toThrow(/과목/);
  });

  it("requires school-record tutoring to persist a null subject", () => {
    expect(
      normalizeStudentInput({
        ...baseInput,
        tutoringType: "school_record",
        subject: null,
      }).subject,
    ).toBeNull();
    expect(() =>
      normalizeStudentInput({ ...baseInput, tutoringType: "school_record", subject: "math" }),
    ).toThrow(/교과 과목/);
  });

  it("requires a location for in-person and an https URL for manual Meet", () => {
    expect(() =>
      normalizeStudentInput({
        ...baseInput,
        defaultMode: "in_person",
        defaultLocation: null,
        meetStrategy: "none",
      }),
    ).toThrow(/방문 장소/);
    expect(() =>
      normalizeStudentInput({
        ...baseInput,
        meetStrategy: "manual_reusable",
        manualMeetUrl: "http://example.com/room",
      }),
    ).toThrow(/https/);
  });
});

describe("TUT-005 TUT-006 TUT-007 TUT-008 lesson snapshots", () => {
  it("copies defaults once and preserves historical lessons when defaults change", () => {
    const lesson = createLessonFromStudent({
      id: "lesson-1",
      student,
      startsAt: "2026-09-02T18:00:00+09:00",
      prepNotes: "오답 확인",
      prepItems: ["숙제 채점"],
    });
    const updated = updateStudentDefaults(
      student,
      { ...baseInput, defaultFeeAmount: toKrw(70_000), defaultDurationMinutes: 90 },
      "2026-09-03T00:00:00.000Z",
    );
    expect(updated.defaultFeeAmount).toBe(toKrw(70_000));
    expect(lesson).toMatchObject({ amount: toKrw(60_000), prepNotes: "오답 확인" });
    expect(new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()).toBe(7_200_000);
  });

  it("allows only terminal completion or cancellation from scheduled", () => {
    const lesson = createLessonFromStudent({
      id: "lesson-2",
      student,
      startsAt: "2026-09-02T18:00:00+09:00",
    });
    const completed = transitionLessonStatus(lesson, "completed", now);
    expect(completed).toMatchObject({ status: "completed", completedAt: now });
    expect(() => transitionLessonStatus(completed, "cancelled", now)).toThrow(/다시 바꿀/);
  });
});

describe("TUT-009 deterministic recurrence", () => {
  const schedule: TutoringSchedule = {
    id: "schedule-1",
    ownerId: student.ownerId,
    studentId: student.id,
    weekday: 3,
    startTime: "18:00",
    durationMinutes: 120,
    timezone: "Asia/Seoul",
    effectiveFrom: "2026-09-01",
    effectiveUntil: "2026-09-30",
    modeOverride: null,
    locationOverride: null,
    meetStrategyOverride: null,
    isActive: true,
  };

  it("materializes Seoul-local weekly occurrences once", () => {
    const first = materializeWeeklySchedule({
      schedule,
      student,
      rangeFrom: "2026-09-01",
      rangeUntil: "2026-09-16",
      existingOccurrenceKeys: new Set(),
    });
    expect(first.map((lesson) => lesson.startsAt)).toEqual([
      "2026-09-02T09:00:00.000Z",
      "2026-09-09T09:00:00.000Z",
      "2026-09-16T09:00:00.000Z",
    ]);
    expect(
      materializeWeeklySchedule({
        schedule,
        student,
        rangeFrom: "2026-09-01",
        rangeUntil: "2026-09-16",
        existingOccurrenceKeys: new Set(first.map((lesson) => lesson.occurrenceKey ?? "")),
      }),
    ).toEqual([]);
  });
});

describe("TUT-010 TUT-012 TUT-013 TUT-019 adapters and metrics", () => {
  it("creates one lesson-specific mock conference and keeps a manual URL user-managed", () => {
    const generated = createLessonFromStudent({
      id: "lesson-generated",
      student,
      startsAt: "2026-09-02T18:00:00+09:00",
    });
    expect(syncMockCalendarEvent(generated)).toMatchObject({
      meetUrl: "https://meet.mock.local/lesson-generated",
      conferenceRequestId: "lesson-lesson-generated",
      source: "generated",
    });

    const manualStudent = createStudent(
      "student-2",
      "owner-1",
      {
        ...baseInput,
        meetStrategy: "manual_reusable",
        manualMeetUrl: "https://meet.google.com/abc-defg-hij",
      },
      now,
    );
    expect(
      syncMockCalendarEvent(
        createLessonFromStudent({
          id: "lesson-manual",
          student: manualStudent,
          startsAt: "2026-09-03T18:00:00+09:00",
        }),
      ),
    ).toMatchObject({ conferenceRequestId: null, source: "manual_reusable" });
  });

  it("reconciles selected-month earned, received, and outstanding figures", () => {
    const completed = transitionLessonStatus(
      createLessonFromStudent({
        id: "lesson-paid",
        student,
        startsAt: "2026-09-01T18:00:00+09:00",
      }),
      "completed",
      now,
    );
    expect(
      calculateStudentMonthMetrics({
        studentId: student.id,
        month: "2026-09",
        lessons: [completed],
        finances: [
          {
            lessonId: completed.id,
            receivedAmount: toKrw(40_000),
            outstandingAmount: toKrw(20_000),
          },
        ],
      }),
    ).toEqual({
      scheduled: 0,
      completed: 1,
      cancelled: 0,
      earnedAmount: toKrw(60_000),
      receivedAmount: toKrw(40_000),
      outstandingAmount: toKrw(20_000),
    });
  });
});
