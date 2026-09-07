import { z } from "zod";

import type {
  Lesson,
  LessonFinance,
  Student,
  TutoringSchedule,
} from "@/domain/tutoring/model";
import { readDemoSession } from "@/lib/auth/session";

const prepItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isDone: z.boolean(),
  sortOrder: z.number().int(),
});

const studentSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1),
  tutoringType: z.enum(["subject", "school_record"]),
  subject: z.enum(["math", "physics", "chemistry"]).nullable(),
  defaultMode: z.enum(["online", "in_person"]),
  defaultFeeAmount: z.bigint().positive(),
  defaultDurationMinutes: z.number().int().min(15).max(600),
  defaultLocation: z.string().nullable(),
  meetStrategy: z.enum(["google_generated", "manual_reusable", "none"]),
  manualMeetUrl: z.string().nullable(),
  payerAliases: z.array(z.string()),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const scheduleSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  studentId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string(),
  durationMinutes: z.number().int().min(15).max(600),
  timezone: z.literal("Asia/Seoul"),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable(),
  modeOverride: z.enum(["online", "in_person"]).nullable(),
  locationOverride: z.string().nullable(),
  meetStrategyOverride: z.enum(["google_generated", "manual_reusable", "none"]).nullable(),
  isActive: z.boolean(),
});

const lessonSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  studentId: z.string().min(1),
  scheduleId: z.string().nullable(),
  occurrenceKey: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.literal("Asia/Seoul"),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  mode: z.enum(["online", "in_person"]),
  amount: z.bigint().positive(),
  preparationMinutes: z.number().int().nonnegative(),
  travelMinutes: z.number().int().nonnegative(),
  prepNotes: z.string().nullable(),
  prepItems: z.array(prepItemSchema),
  inPersonLocation: z.string().nullable(),
  meetStrategy: z.enum(["google_generated", "manual_reusable", "none"]),
  meetUrl: z.string().nullable(),
  calendarEventId: z.string().nullable(),
  calendarHtmlUrl: z.string().nullable(),
  calendarSyncState: z.enum(["not_synced", "synced", "error"]),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
});

const financeSchema = z.object({
  lessonId: z.string().min(1),
  receivedAmount: z.bigint().nonnegative(),
  outstandingAmount: z.bigint().nonnegative(),
});

const stateSchema = z.object({
  userId: z.string().min(8),
  students: z.array(studentSchema),
  schedules: z.array(scheduleSchema),
  lessons: z.array(lessonSchema),
  finances: z.array(financeSchema),
});

export type DemoTutoringState = {
  userId: string;
  students: Student[];
  schedules: TutoringSchedule[];
  lessons: Lesson[];
  finances: LessonFinance[];
};

const globalForTutoring = globalThis as typeof globalThis & {
  studentOsTutoringStore?: Map<string, DemoTutoringState>;
};

const tutoringStore =
  globalForTutoring.studentOsTutoringStore ?? new Map<string, DemoTutoringState>();

globalForTutoring.studentOsTutoringStore = tutoringStore;

function defaultState(userId: string): DemoTutoringState {
  return { userId, students: [], schedules: [], lessons: [], finances: [] };
}

export async function readDemoTutoringState(): Promise<DemoTutoringState | null> {
  const session = await readDemoSession();
  if (!session) return null;
  const stored = tutoringStore.get(session.userId);
  if (stored) return structuredClone(stored);
  const initial = defaultState(session.userId);
  tutoringStore.set(session.userId, initial);
  return structuredClone(initial);
}

export async function saveDemoTutoringState(state: DemoTutoringState) {
  const session = await readDemoSession();
  if (!session || session.userId !== state.userId) {
    throw new Error("현재 세션과 과외 데이터 소유자가 일치하지 않아요.");
  }
  const parsed = stateSchema.parse(state);
  tutoringStore.set(state.userId, structuredClone(parsed) as unknown as DemoTutoringState);
}

export function purgeDemoTutoringState(userId: string) {
  tutoringStore.delete(userId);
}
