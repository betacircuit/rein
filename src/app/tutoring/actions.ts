"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MockCalendarProvider } from "@/domain/integrations/model";

import { toKrw } from "@/domain/money/krw";
import { ensureLessonReceivable } from "@/domain/money/ledger";
import {
  createLessonFromStudent,
  createStudent,
  materializeWeeklySchedule,
  normalizeStudentInput,
  transitionLessonStatus,
  updateStudentDefaults,
  type MeetStrategy,
  type StudentInput,
} from "@/domain/tutoring/model";
import {
  readDemoTutoringState,
  saveDemoTutoringState,
  type DemoTutoringState,
} from "@/lib/tutoring/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";
import { readDemoMoneyState, saveDemoMoneyState } from "@/lib/money/demo-store";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value ? value : null));

const studentFormSchema = z
  .object({
    studentId: z.string().optional(),
    name: z.string().trim().min(2, "학생 이름을 두 글자 이상 입력해 주세요."),
    tutoringType: z.enum(["subject", "school_record"]),
    subject: z.enum(["math", "physics", "chemistry", "none"]),
    defaultMode: z.enum(["online", "in_person"]),
    defaultFeeAmount: z.coerce
      .number()
      .int("수업료는 원 단위 정수로 입력해 주세요.")
      .positive("수업료는 1원 이상이어야 해요."),
    defaultDurationMinutes: z.coerce
      .number()
      .int()
      .min(15, "수업 시간은 15분 이상이어야 해요.")
      .max(600, "수업 시간은 600분 이하여야 해요."),
    defaultLocation: optionalString,
    meetStrategy: z.enum(["google_generated", "manual_reusable", "none"]),
    manualMeetUrl: optionalString,
    payerAliases: z.string(),
    notes: optionalString,
    weekday: z.coerce.number().int().min(0).max(6).optional(),
    startTime: z.string().optional(),
    effectiveFrom: z.string().optional(),
    effectiveUntil: optionalString.optional(),
  })
  .superRefine((value, context) => {
    if (value.tutoringType === "subject" && value.subject === "none") {
      context.addIssue({
        code: "custom",
        path: ["subject"],
        message: "교과 과목을 선택해 주세요.",
      });
    }
    if (value.tutoringType === "school_record" && value.subject !== "none") {
      context.addIssue({
        code: "custom",
        path: ["subject"],
        message: "생기부 과외에는 교과 과목을 저장하지 않아요.",
      });
    }
    if (value.defaultMode === "in_person" && !value.defaultLocation) {
      context.addIssue({
        code: "custom",
        path: ["defaultLocation"],
        message: "대면 수업 장소를 입력해 주세요.",
      });
    }
    if (value.defaultMode === "online" && value.meetStrategy === "none") {
      context.addIssue({
        code: "custom",
        path: ["meetStrategy"],
        message: "온라인 수업의 Meet 방식을 선택해 주세요.",
      });
    }
    if (value.meetStrategy === "manual_reusable") {
      const result = z.url().safeParse(value.manualMeetUrl);
      if (!result.success || !value.manualMeetUrl?.startsWith("https://")) {
        context.addIssue({
          code: "custom",
          path: ["manualMeetUrl"],
          message: "https로 시작하는 직접 관리 Meet 주소를 입력해 주세요.",
        });
      }
    }
    if (value.effectiveFrom && value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveUntil"],
        message: "반복 일정 종료일은 시작일보다 빠를 수 없어요.",
      });
    }
  });

const lessonFormSchema = z
  .object({
    studentId: z.string().min(1, "학생을 선택해 주세요."),
    startsAt: z.string().min(1, "수업 시작 시간을 입력해 주세요."),
    durationMinutes: z.coerce.number().int().min(15).max(600),
    amount: z.coerce.number().int().positive(),
    mode: z.enum(["online", "in_person"]),
    inPersonLocation: optionalString,
    meetStrategy: z.enum(["google_generated", "manual_reusable", "none"]),
    manualMeetUrl: optionalString,
    prepNotes: optionalString,
    prepItems: z.string(),
  })
  .superRefine((value, context) => {
    if (value.mode === "in_person" && !value.inPersonLocation) {
      context.addIssue({
        code: "custom",
        path: ["inPersonLocation"],
        message: "대면 수업 장소를 입력해 주세요.",
      });
    }
    if (value.mode === "online" && value.meetStrategy === "none") {
      context.addIssue({
        code: "custom",
        path: ["meetStrategy"],
        message: "온라인 수업의 Meet 방식을 선택해 주세요.",
      });
    }
    if (
      value.mode === "online" &&
      value.meetStrategy === "manual_reusable" &&
      (!value.manualMeetUrl?.startsWith("https://") ||
        !z.url().safeParse(value.manualMeetUrl).success)
    ) {
      context.addIssue({
        code: "custom",
        path: ["manualMeetUrl"],
        message: "https로 시작하는 직접 관리 Meet 주소를 입력해 주세요.",
      });
    }
  });

export type TutoringActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

async function demoState() {
  const runtime = readRuntimeSafetyConfig(process.env);
  assertSafeRuntime(runtime);
  if (!runtime.DEMO_MODE) throw new Error("현재 빌드에는 실제 과외 저장소가 연결되지 않았어요.");
  const state = await readDemoTutoringState();
  if (!state) throw new Error("세션이 만료됐어요. 다시 로그인해 주세요.");
  return state;
}

function studentInput(parsed: z.infer<typeof studentFormSchema>): StudentInput {
  const meetStrategy: MeetStrategy =
    parsed.defaultMode === "in_person" ? "none" : parsed.meetStrategy;
  return normalizeStudentInput({
    name: parsed.name,
    tutoringType: parsed.tutoringType,
    subject: parsed.tutoringType === "subject" && parsed.subject !== "none" ? parsed.subject : null,
    defaultMode: parsed.defaultMode,
    defaultFeeAmount: toKrw(parsed.defaultFeeAmount),
    defaultDurationMinutes: parsed.defaultDurationMinutes,
    defaultLocation: parsed.defaultLocation,
    meetStrategy,
    manualMeetUrl: meetStrategy === "manual_reusable" ? parsed.manualMeetUrl : null,
    payerAliases: parsed.payerAliases.split(","),
    notes: parsed.notes,
  });
}

function parseStudentForm(formData: FormData) {
  return studentFormSchema.safeParse({
    studentId: formData.get("studentId") || undefined,
    name: formData.get("name"),
    tutoringType: formData.get("tutoringType"),
    subject: formData.get("subject") || "none",
    defaultMode: formData.get("defaultMode"),
    defaultFeeAmount: formData.get("defaultFeeAmount"),
    defaultDurationMinutes: formData.get("defaultDurationMinutes"),
    defaultLocation: formData.get("defaultLocation") || "",
    meetStrategy: formData.get("meetStrategy") || "none",
    manualMeetUrl: formData.get("manualMeetUrl") || "",
    payerAliases: formData.get("payerAliases") || "",
    notes: formData.get("notes") || "",
    weekday: formData.get("weekday") || undefined,
    startTime: formData.get("startTime") || undefined,
    effectiveFrom: formData.get("effectiveFrom") || undefined,
    effectiveUntil: formData.get("effectiveUntil") || "",
  });
}

export async function createStudentAction(
  _previousState: TutoringActionState,
  formData: FormData,
): Promise<TutoringActionState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (parsed.data.weekday === undefined || !parsed.data.startTime || !parsed.data.effectiveFrom) {
    return { status: "error", message: "첫 반복 일정의 요일·시간·시작일을 입력해 주세요." };
  }
  let studentId = "";
  try {
    const state = await demoState();
    const now = new Date().toISOString();
    const student = createStudent(randomUUID(), state.userId, studentInput(parsed.data), now);
    const scheduleId = randomUUID();
    const schedule = {
      id: scheduleId,
      ownerId: state.userId,
      studentId: student.id,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime,
      durationMinutes: student.defaultDurationMinutes,
      timezone: "Asia/Seoul" as const,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveUntil: parsed.data.effectiveUntil ?? null,
      modeOverride: null,
      locationOverride: null,
      meetStrategyOverride: null,
      isActive: true,
    };
    const rangeUntil = new Date(`${parsed.data.effectiveFrom}T00:00:00Z`);
    rangeUntil.setUTCDate(rangeUntil.getUTCDate() + 28);
    const lessons = materializeWeeklySchedule({
      schedule,
      student,
      rangeFrom: parsed.data.effectiveFrom,
      rangeUntil: rangeUntil.toISOString().slice(0, 10),
      existingOccurrenceKeys: new Set(
        state.lessons.flatMap((lesson) => lesson.occurrenceKey ?? []),
      ),
    });
    await saveDemoTutoringState({
      ...state,
      students: [...state.students, student],
      schedules: [...state.schedules, schedule],
      lessons: [...state.lessons, ...lessons],
    });
    studentId = student.id;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "저장하지 못했어요.",
    };
  }
  redirect(`/tutoring/students/${studentId}?created=1`);
}

export async function updateStudentAction(
  _previousState: TutoringActionState,
  formData: FormData,
): Promise<TutoringActionState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (!parsed.data.studentId) return { status: "error", message: "수정할 학생을 찾지 못했어요." };
  let studentId = "";
  try {
    const state = await demoState();
    const student = state.students.find((candidate) => candidate.id === parsed.data.studentId);
    if (!student) return { status: "error", message: "수정할 학생을 찾지 못했어요." };
    const updated = updateStudentDefaults(
      student,
      studentInput(parsed.data),
      new Date().toISOString(),
    );
    await saveDemoTutoringState({
      ...state,
      students: state.students.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      ),
    });
    studentId = updated.id;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "수정하지 못했어요.",
    };
  }
  redirect(`/tutoring/students/${studentId}?updated=1`);
}

export async function archiveStudentAction(formData: FormData) {
  const state = await demoState();
  const studentId = String(formData.get("studentId") ?? "");
  if (!state.students.some((student) => student.id === studentId)) return;
  await saveDemoTutoringState({
    ...state,
    students: state.students.map((student) =>
      student.id === studentId
        ? { ...student, isActive: false, updatedAt: new Date().toISOString() }
        : student,
    ),
  });
  redirect("/tutoring/students?archived=1");
}

export async function createLessonAction(
  _previousState: TutoringActionState,
  formData: FormData,
): Promise<TutoringActionState> {
  const parsed = lessonFormSchema.safeParse({
    studentId: formData.get("studentId"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes"),
    amount: formData.get("amount"),
    mode: formData.get("mode"),
    inPersonLocation: formData.get("inPersonLocation") || "",
    meetStrategy: formData.get("meetStrategy") || "none",
    manualMeetUrl: formData.get("manualMeetUrl") || "",
    prepNotes: formData.get("prepNotes") || "",
    prepItems: formData.get("prepItems") || "",
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  let lessonId = "";
  try {
    const state = await demoState();
    const student = state.students.find(
      (candidate) => candidate.id === parsed.data.studentId && candidate.isActive,
    );
    if (!student) return { status: "error", message: "활성 학생을 찾지 못했어요." };
    const lesson = createLessonFromStudent({
      id: randomUUID(),
      student,
      startsAt: `${parsed.data.startsAt}:00+09:00`,
      durationMinutes: parsed.data.durationMinutes,
      amount: toKrw(parsed.data.amount),
      mode: parsed.data.mode,
      location: parsed.data.inPersonLocation,
      meetStrategy: parsed.data.mode === "in_person" ? "none" : parsed.data.meetStrategy,
      manualMeetUrl: parsed.data.manualMeetUrl,
      prepNotes: parsed.data.prepNotes,
      prepItems: parsed.data.prepItems
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    });
    await saveDemoTutoringState({ ...state, lessons: [...state.lessons, lesson] });
    lessonId = lesson.id;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "저장하지 못했어요.",
    };
  }
  redirect(`/tutoring/lessons/${lessonId}?created=1`);
}

export async function togglePrepItemAction(formData: FormData) {
  const state = await demoState();
  const lessonId = String(formData.get("lessonId") ?? "");
  const prepItemId = String(formData.get("prepItemId") ?? "");
  await saveDemoTutoringState({
    ...state,
    lessons: state.lessons.map((lesson) =>
      lesson.id === lessonId
        ? {
            ...lesson,
            prepItems: lesson.prepItems.map((item) =>
              item.id === prepItemId ? { ...item, isDone: !item.isDone } : item,
            ),
          }
        : lesson,
    ),
  });
  revalidatePath(`/tutoring/lessons/${lessonId}`);
  revalidatePath("/tutoring");
}

export async function updateLessonPrepAction(formData: FormData) {
  const state = await demoState();
  const lessonId = String(formData.get("lessonId") ?? "");
  const prepNotes = String(formData.get("prepNotes") ?? "").trim() || null;
  const labels = [
    ...new Set(
      String(formData.get("prepItems") ?? "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  await saveDemoTutoringState({
    ...state,
    lessons: state.lessons.map((lesson) => {
      if (lesson.id !== lessonId || lesson.status !== "scheduled") return lesson;
      const previousItems = new Map(lesson.prepItems.map((item) => [item.label, item]));
      return {
        ...lesson,
        prepNotes,
        prepItems: labels.map((label, index) => {
          const previous = previousItems.get(label);
          return {
            id: previous?.id ?? `${lesson.id}-prep-${randomUUID()}`,
            label,
            isDone: previous?.isDone ?? false,
            sortOrder: index,
          };
        }),
      };
    }),
  });
  revalidatePath(`/tutoring/lessons/${lessonId}`);
  revalidatePath("/tutoring");
}

export async function syncMockCalendarAction(formData: FormData) {
  const state = await demoState();
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = state.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) return;
  const event = await new MockCalendarProvider().createLessonEvent(lesson);
  await saveDemoTutoringState({
    ...state,
    lessons: state.lessons.map((candidate) =>
      candidate.id === lessonId
        ? {
            ...candidate,
            meetUrl: event.meetUrl,
            calendarEventId: event.eventId,
            calendarHtmlUrl: event.htmlUrl,
            calendarSyncState: "synced",
          }
        : candidate,
    ),
  });
  revalidatePath(`/tutoring/lessons/${lessonId}`);
}

export async function changeLessonStatusAction(formData: FormData) {
  const state = await demoState();
  const lessonId = String(formData.get("lessonId") ?? "");
  const status = z.enum(["completed", "cancelled"]).parse(formData.get("status"));
  const lessons = state.lessons.map((lesson) =>
    lesson.id === lessonId
      ? transitionLessonStatus(lesson, status, new Date().toISOString())
      : lesson,
  );
  await saveDemoTutoringState({
    ...state,
    lessons,
  });
  if (status === "completed") {
    const lesson = lessons.find((item) => item.id === lessonId);
    const money = await readDemoMoneyState();
    if (lesson && money) {
      await saveDemoMoneyState(
        ensureLessonReceivable({ state: money, lesson, now: new Date().toISOString() }),
      );
    }
  }
  revalidatePath(`/tutoring/lessons/${lessonId}`);
  revalidatePath("/tutoring/lessons");
}

export async function materializeScheduleAction(formData: FormData) {
  const state = await demoState();
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const rangeFrom = z.iso.date().parse(formData.get("rangeFrom"));
  const rangeUntil = z.iso.date().parse(formData.get("rangeUntil"));
  const schedule = state.schedules.find((candidate) => candidate.id === scheduleId);
  const student = schedule
    ? state.students.find((candidate) => candidate.id === schedule.studentId)
    : undefined;
  if (!schedule || !student) return;
  const lessons = materializeWeeklySchedule({
    schedule,
    student,
    rangeFrom,
    rangeUntil,
    existingOccurrenceKeys: new Set(state.lessons.flatMap((lesson) => lesson.occurrenceKey ?? [])),
  });
  await saveDemoTutoringState({ ...state, lessons: [...state.lessons, ...lessons] });
  revalidatePath(`/tutoring/students/${student.id}`);
  revalidatePath("/tutoring");
}

export async function requireTutoringState(): Promise<DemoTutoringState> {
  return demoState();
}
