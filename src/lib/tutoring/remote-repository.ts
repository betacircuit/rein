import { cache } from "react";

import { requireSupabaseUser } from "@/lib/supabase/server";

export type RemoteStudent = {
  id: string;
  name: string;
  tutoringType: "subject" | "school_record";
  tutoringTrack: "csat" | "school_exam" | "school_record" | null;
  subject: "math" | "physics" | "chemistry" | null;
  subjectDetail:
    "probability_statistics" | "calculus" | "physics_1" | "chemistry_1" | "custom" | "none" | null;
  subjectCustom: string | null;
  defaultMode: "online" | "in_person";
  hourlyRate: number;
  defaultFeeAmount: number;
  defaultDurationMinutes: number;
  defaultLocation: string | null;
  manualMeetUrl: string | null;
  googleSheetUrl: string | null;
  notes: string | null;
  isActive: boolean;
  schoolName: string | null;
  schoolLevel: string | null;
  grade: string | null;
  studentPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelation: string | null;
  sourceChannel: string | null;
  consultationStatus: "consulting" | "active" | "paused" | "ended";
  firstConsultedOn: string | null;
  startedOn: string | null;
  targetSchool: string | null;
  targetMajor: string | null;
  currentLevel: string | null;
  targetLevel: string | null;
  learningGoal: string | null;
  curriculumPlan: string | null;
  materials: string | null;
  strengths: string | null;
  weaknesses: string | null;
  homeworkPolicy: string | null;
  progressSummary: string | null;
  nextGoal: string | null;
};

export type RemoteSchedule = {
  id: string;
  studentId: string;
  studentName: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
};

export type RemotePersonalSchedule = {
  id: string;
  title: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  creationOrder: number;
  colorIndex: number;
};

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function optional(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function mapStudent(row: Record<string, unknown>): RemoteStudent {
  return {
    id: String(row.id),
    name: String(row.name),
    tutoringType: row.tutoring_type as RemoteStudent["tutoringType"],
    tutoringTrack: (row.tutoring_track ?? null) as RemoteStudent["tutoringTrack"],
    subject: row.subject as RemoteStudent["subject"],
    subjectDetail: (row.subject_detail ?? null) as RemoteStudent["subjectDetail"],
    subjectCustom: optional(row.subject_custom),
    defaultMode: row.default_mode as RemoteStudent["defaultMode"],
    hourlyRate: asNumber(row.hourly_rate),
    defaultFeeAmount: asNumber(row.default_fee_amount),
    defaultDurationMinutes: asNumber(row.default_duration_minutes),
    defaultLocation: optional(row.default_location),
    manualMeetUrl: optional(row.manual_meet_url),
    googleSheetUrl: optional(row.google_sheet_url),
    notes: optional(row.notes),
    isActive: Boolean(row.is_active),
    schoolName: optional(row.school_name),
    schoolLevel: optional(row.school_level),
    grade: optional(row.grade),
    studentPhone: optional(row.student_phone),
    guardianName: optional(row.guardian_name),
    guardianPhone: optional(row.guardian_phone),
    guardianRelation: optional(row.guardian_relation),
    sourceChannel: optional(row.source_channel),
    consultationStatus: (row.consultation_status ??
      "consulting") as RemoteStudent["consultationStatus"],
    firstConsultedOn: optional(row.first_consulted_on),
    startedOn: optional(row.started_on),
    targetSchool: optional(row.target_school),
    targetMajor: optional(row.target_major),
    currentLevel: optional(row.current_level),
    targetLevel: optional(row.target_level),
    learningGoal: optional(row.learning_goal),
    curriculumPlan: optional(row.curriculum_plan),
    materials: optional(row.materials),
    strengths: optional(row.strengths),
    weaknesses: optional(row.weaknesses),
    homeworkPolicy: optional(row.homework_policy),
    progressSummary: optional(row.progress_summary),
    nextGoal: optional(row.next_goal),
  };
}

export const readRemoteTutoringData = cache(async function readRemoteTutoringData() {
  const auth = await requireSupabaseUser();
  if (!auth) return null;
  const [studentsResult, schedulesResult, personalSchedulesResult] = await Promise.all([
    auth.supabase.from("students").select("*").order("name"),
    auth.supabase
      .from("tutoring_schedules")
      .select("id, student_id, weekday, start_time, duration_minutes")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
    auth.supabase
      .from("personal_schedule_blocks")
      .select("id, title, weekday, start_time, duration_minutes, creation_order, color_index")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
  ]);
  if (studentsResult.error) throw new Error("학생 데이터를 불러오지 못했습니다.");
  if (schedulesResult.error) throw new Error("시간표를 불러오지 못했습니다.");
  if (
    personalSchedulesResult.error &&
    !(
      ["PGRST205", "42P01"].includes(personalSchedulesResult.error.code) ||
      (/personal_schedule_blocks/i.test(personalSchedulesResult.error.message) &&
        /schema cache|does not exist|찾을 수 없/i.test(personalSchedulesResult.error.message))
    )
  ) {
    throw new Error("개인 일정을 불러오지 못했습니다.");
  }
  const students = (studentsResult.data ?? []).map((row) =>
    mapStudent(row as Record<string, unknown>),
  );
  const names = new Map(students.map((student) => [student.id, student.name]));
  const schedules: RemoteSchedule[] = (schedulesResult.data ?? []).map((row) => ({
    id: String(row.id),
    studentId: String(row.student_id),
    studentName: names.get(String(row.student_id)) ?? "학생",
    weekday: asNumber(row.weekday),
    startTime: String(row.start_time).slice(0, 5),
    durationMinutes: asNumber(row.duration_minutes),
  }));
  const personalSchedules: RemotePersonalSchedule[] = (personalSchedulesResult.data ?? []).map(
    (row) => ({
      id: String(row.id),
      title: String(row.title),
      weekday: asNumber(row.weekday),
      startTime: String(row.start_time).slice(0, 5),
      durationMinutes: asNumber(row.duration_minutes),
      creationOrder: asNumber(row.creation_order),
      colorIndex: asNumber(row.color_index),
    }),
  );
  return { ...auth, students, schedules, personalSchedules };
});

export async function readRemoteStudent(studentId: string) {
  const data = await readRemoteTutoringData();
  if (!data) return null;
  return {
    ...data,
    student: data.students.find((item) => item.id === studentId) ?? null,
    studentSchedules: data.schedules.filter((item) => item.studentId === studentId),
  };
}

export type StudentLessonRecord = {
  id: string;
  startsAt: string;
  amount: number;
  prepNotes: string | null;
  receivableStatus: "open" | "partially_paid" | "paid" | "void" | null;
};

export type StudentDepositRecord = {
  id: string;
  occurredAt: string;
  amount: number;
  memo: string | null;
  descriptor: string | null;
};

export async function readStudentLedger(studentId: string) {
  const auth = await requireSupabaseUser();
  if (!auth) return null;
  const [lessonsResult, receivablesResult, transactionsResult] = await Promise.all([
    auth.supabase
      .from("lessons")
      .select("id, starts_at, amount, prep_notes")
      .eq("student_id", studentId)
      .eq("owner_id", auth.user.id)
      .order("starts_at", { ascending: false }),
    auth.supabase
      .from("receivables")
      .select("lesson_id, status")
      .eq("student_id", studentId)
      .eq("owner_id", auth.user.id),
    auth.supabase
      .from("financial_transactions")
      .select("id, occurred_at, amount, memo, descriptor")
      .eq("student_id", studentId)
      .eq("owner_id", auth.user.id)
      .eq("kind", "income")
      .order("occurred_at", { ascending: false }),
  ]);
  const statusByLesson = new Map(
    (receivablesResult.data ?? []).map((row) => [String(row.lesson_id), row.status as string]),
  );
  const lessons: StudentLessonRecord[] = (lessonsResult.data ?? []).map((row) => ({
    id: String(row.id),
    startsAt: String(row.starts_at),
    amount: asNumber(row.amount),
    prepNotes: optional(row.prep_notes),
    receivableStatus:
      (statusByLesson.get(String(row.id)) as StudentLessonRecord["receivableStatus"]) ?? null,
  }));
  const transactions: StudentDepositRecord[] = (transactionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    occurredAt: String(row.occurred_at),
    amount: asNumber(row.amount),
    memo: optional(row.memo),
    descriptor: optional(row.descriptor),
  }));
  return { lessons, transactions };
}
