import type { Krw } from "@/domain/money/krw";
import { toKrw } from "@/domain/money/krw";

export const tutoringTypes = ["subject", "school_record"] as const;
export const tutoringSubjects = ["math", "physics", "chemistry"] as const;
export const lessonModes = ["online", "in_person"] as const;
export const lessonStatuses = ["scheduled", "completed", "cancelled"] as const;
export const meetStrategies = ["google_generated", "manual_reusable", "none"] as const;

export type TutoringType = (typeof tutoringTypes)[number];
export type TutoringSubject = (typeof tutoringSubjects)[number];
export type LessonMode = (typeof lessonModes)[number];
export type LessonStatus = (typeof lessonStatuses)[number];
export type MeetStrategy = (typeof meetStrategies)[number];

export type StudentInput = {
  name: string;
  tutoringType: TutoringType;
  subject: TutoringSubject | null;
  defaultMode: LessonMode;
  defaultFeeAmount: Krw;
  defaultDurationMinutes: number;
  defaultLocation: string | null;
  meetStrategy: MeetStrategy;
  manualMeetUrl: string | null;
  payerAliases: string[];
  notes: string | null;
};

export type Student = StudentInput & {
  id: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TutoringSchedule = {
  id: string;
  ownerId: string;
  studentId: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  timezone: "Asia/Seoul";
  effectiveFrom: string;
  effectiveUntil: string | null;
  modeOverride: LessonMode | null;
  locationOverride: string | null;
  meetStrategyOverride: MeetStrategy | null;
  isActive: boolean;
};

export type LessonPrepItem = {
  id: string;
  label: string;
  isDone: boolean;
  sortOrder: number;
};

export type Lesson = {
  id: string;
  ownerId: string;
  studentId: string;
  scheduleId: string | null;
  occurrenceKey: string | null;
  startsAt: string;
  endsAt: string;
  timezone: "Asia/Seoul";
  status: LessonStatus;
  mode: LessonMode;
  amount: Krw;
  preparationMinutes: number;
  travelMinutes: number;
  prepNotes: string | null;
  prepItems: LessonPrepItem[];
  inPersonLocation: string | null;
  meetStrategy: MeetStrategy;
  meetUrl: string | null;
  calendarEventId: string | null;
  calendarHtmlUrl: string | null;
  calendarSyncState: "not_synced" | "synced" | "error";
  completedAt: string | null;
  cancelledAt: string | null;
};

export type LessonFinance = {
  lessonId: string;
  receivedAmount: Krw;
  outstandingAmount: Krw;
};

function cleanOptional(value: string | null) {
  const cleaned = value?.trim() ?? "";
  return cleaned.length > 0 ? cleaned : null;
}

function isHttpsUrl(value: string | null) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeStudentInput(input: StudentInput): StudentInput {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("학생 이름은 두 글자 이상 입력해 주세요.");
  if (input.tutoringType === "subject" && !input.subject) {
    throw new Error("교과 과외는 수학·물리·화학 중 한 과목이 필요해요.");
  }
  if (input.tutoringType === "school_record" && input.subject !== null) {
    throw new Error("생기부 과외에는 교과 과목을 저장하지 않아요.");
  }
  if (input.defaultFeeAmount <= 0n) {
    throw new Error("기본 수업료는 1원 이상의 정수여야 해요.");
  }
  if (
    !Number.isInteger(input.defaultDurationMinutes) ||
    input.defaultDurationMinutes < 15 ||
    input.defaultDurationMinutes > 600
  ) {
    throw new Error("기본 수업 시간은 15분에서 600분 사이여야 해요.");
  }

  const defaultLocation = cleanOptional(input.defaultLocation);
  const manualMeetUrl = cleanOptional(input.manualMeetUrl);
  if (input.defaultMode === "in_person" && !defaultLocation) {
    throw new Error("대면 수업은 방문 장소가 필요해요.");
  }
  if (input.defaultMode === "in_person" && input.meetStrategy !== "none") {
    throw new Error("대면 수업에는 Meet 방식을 저장하지 않아요.");
  }
  if (input.defaultMode === "online" && input.meetStrategy === "none") {
    throw new Error("온라인 수업은 Meet 생성 방식이 필요해요.");
  }
  if (input.meetStrategy === "manual_reusable" && !isHttpsUrl(manualMeetUrl)) {
    throw new Error("직접 관리 Meet 주소는 https 주소여야 해요.");
  }

  return {
    ...input,
    name,
    subject: input.tutoringType === "subject" ? input.subject : null,
    defaultLocation: input.defaultMode === "in_person" ? defaultLocation : null,
    meetStrategy: input.defaultMode === "in_person" ? "none" : input.meetStrategy,
    manualMeetUrl: input.meetStrategy === "manual_reusable" ? manualMeetUrl : null,
    payerAliases: [...new Set(input.payerAliases.map((alias) => alias.trim()).filter(Boolean))],
    notes: cleanOptional(input.notes),
  };
}

export function createStudent(
  id: string,
  ownerId: string,
  input: StudentInput,
  now: string,
): Student {
  return {
    id,
    ownerId,
    ...normalizeStudentInput(input),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateStudentDefaults(student: Student, input: StudentInput, now: string): Student {
  return { ...student, ...normalizeStudentInput(input), updatedAt: now };
}

function lessonModeValues(
  student: Student,
  overrides: {
    mode?: LessonMode;
    location?: string | null;
    meetStrategy?: MeetStrategy;
    manualMeetUrl?: string | null;
  },
) {
  const mode = overrides.mode ?? student.defaultMode;
  const location = cleanOptional(overrides.location ?? student.defaultLocation);
  const strategy = overrides.meetStrategy ?? student.meetStrategy;
  const manualMeetUrl = cleanOptional(overrides.manualMeetUrl ?? student.manualMeetUrl);
  if (mode === "in_person") {
    if (!location) throw new Error("대면 수업은 방문 장소가 필요해요.");
    return { mode, location, strategy: "none" as const, meetUrl: null };
  }
  if (strategy === "none") throw new Error("온라인 수업은 Meet 생성 방식이 필요해요.");
  if (strategy === "manual_reusable" && !isHttpsUrl(manualMeetUrl)) {
    throw new Error("직접 관리 Meet 주소는 https 주소여야 해요.");
  }
  return {
    mode,
    location: null,
    strategy,
    meetUrl: strategy === "manual_reusable" ? manualMeetUrl : null,
  };
}

export function createLessonFromStudent(input: {
  id: string;
  student: Student;
  startsAt: string;
  scheduleId?: string | null;
  occurrenceKey?: string | null;
  durationMinutes?: number;
  amount?: Krw;
  mode?: LessonMode;
  location?: string | null;
  meetStrategy?: MeetStrategy;
  manualMeetUrl?: string | null;
  prepNotes?: string | null;
  prepItems?: string[];
  preparationMinutes?: number;
  travelMinutes?: number;
}): Lesson {
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("수업 시작 시간을 확인해 주세요.");
  const durationMinutes = input.durationMinutes ?? input.student.defaultDurationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 600) {
    throw new Error("수업 시간은 15분에서 600분 사이여야 해요.");
  }
  const amount = input.amount ?? input.student.defaultFeeAmount;
  if (amount <= 0n) throw new Error("수업료를 확인해 주세요.");
  const modeValues = lessonModeValues(input.student, input);
  const preparationMinutes = input.preparationMinutes ?? 0;
  const travelMinutes = input.travelMinutes ?? 0;
  if (
    !Number.isInteger(preparationMinutes) ||
    preparationMinutes < 0 ||
    !Number.isInteger(travelMinutes) ||
    travelMinutes < 0
  ) {
    throw new Error("준비와 이동 시간은 0분 이상의 정수여야 해요.");
  }
  const prepLabels = (input.prepItems ?? []).map((label) => label.trim()).filter(Boolean);

  return {
    id: input.id,
    ownerId: input.student.ownerId,
    studentId: input.student.id,
    scheduleId: input.scheduleId ?? null,
    occurrenceKey: input.occurrenceKey ?? null,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000).toISOString(),
    timezone: "Asia/Seoul",
    status: "scheduled",
    mode: modeValues.mode,
    amount,
    preparationMinutes,
    travelMinutes,
    prepNotes: cleanOptional(input.prepNotes ?? null),
    prepItems: prepLabels.map((label, index) => ({
      id: `${input.id}-prep-${index + 1}`,
      label,
      isDone: false,
      sortOrder: index,
    })),
    inPersonLocation: modeValues.location,
    meetStrategy: modeValues.strategy,
    meetUrl: modeValues.meetUrl,
    calendarEventId: null,
    calendarHtmlUrl: null,
    calendarSyncState: "not_synced",
    completedAt: null,
    cancelledAt: null,
  };
}

export function transitionLessonStatus(
  lesson: Lesson,
  nextStatus: LessonStatus,
  now: string,
): Lesson {
  if (lesson.status === nextStatus) return lesson;
  if (lesson.status !== "scheduled") throw new Error("이미 끝난 수업 상태는 다시 바꿀 수 없어요.");
  if (nextStatus === "scheduled") throw new Error("종료된 수업을 예정 상태로 되돌릴 수 없어요.");
  return {
    ...lesson,
    status: nextStatus,
    completedAt: nextStatus === "completed" ? now : null,
    cancelledAt: nextStatus === "cancelled" ? now : null,
  };
}

function eachDate(from: string, until: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${until}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function materializeWeeklySchedule(input: {
  schedule: TutoringSchedule;
  student: Student;
  rangeFrom: string;
  rangeUntil: string;
  existingOccurrenceKeys: ReadonlySet<string>;
}): Lesson[] {
  const { schedule, student } = input;
  if (!schedule.isActive) return [];
  if (schedule.studentId !== student.id || schedule.ownerId !== student.ownerId) {
    throw new Error("학생과 반복 일정의 소유 경계가 일치하지 않아요.");
  }
  if (schedule.timezone !== "Asia/Seoul") {
    throw new Error("현재 반복 일정은 Asia/Seoul 시간대만 지원해요.");
  }
  const from = input.rangeFrom > schedule.effectiveFrom ? input.rangeFrom : schedule.effectiveFrom;
  const until =
    schedule.effectiveUntil && schedule.effectiveUntil < input.rangeUntil
      ? schedule.effectiveUntil
      : input.rangeUntil;
  if (from > until) return [];

  return eachDate(from, until).flatMap((date) => {
    if (new Date(`${date}T00:00:00Z`).getUTCDay() !== schedule.weekday) return [];
    const occurrenceKey = `${schedule.id}:${date}`;
    if (input.existingOccurrenceKeys.has(occurrenceKey)) return [];
    return [
      createLessonFromStudent({
        id: `lesson-${occurrenceKey}`,
        student,
        startsAt: `${date}T${schedule.startTime}:00+09:00`,
        scheduleId: schedule.id,
        occurrenceKey,
        durationMinutes: schedule.durationMinutes,
        ...(schedule.modeOverride ? { mode: schedule.modeOverride } : {}),
        ...(schedule.locationOverride ? { location: schedule.locationOverride } : {}),
        ...(schedule.meetStrategyOverride ? { meetStrategy: schedule.meetStrategyOverride } : {}),
        prepItems: ["진도 범위 확인", "숙제·자료 준비"],
      }),
    ];
  });
}

export type MockCalendarEvent = {
  eventId: string;
  htmlUrl: string;
  meetUrl: string;
  conferenceRequestId: string | null;
  source: "generated" | "manual_reusable";
};

export function syncMockCalendarEvent(lesson: Lesson): MockCalendarEvent {
  if (lesson.mode !== "online" || lesson.meetStrategy === "none") {
    throw new Error("온라인 수업만 캘린더와 Meet을 연결할 수 있어요.");
  }
  const eventId = `mock-event-${lesson.id}`;
  if (lesson.meetStrategy === "manual_reusable") {
    if (!lesson.meetUrl) throw new Error("직접 관리 Meet 주소가 없어요.");
    return {
      eventId,
      htmlUrl: `https://calendar.mock.local/events/${lesson.id}`,
      meetUrl: lesson.meetUrl,
      conferenceRequestId: null,
      source: "manual_reusable",
    };
  }
  return {
    eventId,
    htmlUrl: `https://calendar.mock.local/events/${lesson.id}`,
    meetUrl: `https://meet.mock.local/${lesson.id}`,
    conferenceRequestId: `lesson-${lesson.id}`,
    source: "generated",
  };
}

export function calculateStudentMonthMetrics(input: {
  studentId: string;
  month: string;
  lessons: readonly Lesson[];
  finances: readonly LessonFinance[];
}) {
  const lessons = input.lessons.filter(
    (lesson) => lesson.studentId === input.studentId && lesson.startsAt.slice(0, 7) === input.month,
  );
  const financeByLesson = new Map(input.finances.map((item) => [item.lessonId, item]));
  return lessons.reduce(
    (summary, lesson) => {
      summary[lesson.status] += 1;
      if (lesson.status === "completed")
        summary.earnedAmount = toKrw(summary.earnedAmount + lesson.amount);
      const finance = financeByLesson.get(lesson.id);
      if (finance) {
        summary.receivedAmount = toKrw(summary.receivedAmount + finance.receivedAmount);
        summary.outstandingAmount = toKrw(summary.outstandingAmount + finance.outstandingAmount);
      }
      return summary;
    },
    {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      earnedAmount: toKrw(0),
      receivedAmount: toKrw(0),
      outstandingAmount: toKrw(0),
    },
  );
}
