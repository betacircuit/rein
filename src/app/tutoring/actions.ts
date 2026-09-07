"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MockCalendarProvider } from "@/domain/integrations/model";

import { toKrw } from "@/domain/money/krw";
import { ensureLessonReceivable } from "@/domain/money/ledger";
import { createLessonFromStudent, transitionLessonStatus } from "@/domain/tutoring/model";
import { readDemoTutoringState, saveDemoTutoringState } from "@/lib/tutoring/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";
import { readDemoMoneyState, saveDemoMoneyState } from "@/lib/money/demo-store";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value ? value : null));

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
