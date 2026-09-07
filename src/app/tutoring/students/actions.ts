"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSupabaseUser } from "@/lib/supabase/server";
import { formatSeoulDateKey } from "@/lib/format/date";
import {
  isGoogleMeetUrl,
  isGoogleSheetUrl,
  normalizeGoogleMeetUrl,
  normalizeGoogleSheetUrl,
} from "@/lib/tutoring/resource-links";

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .transform((value) => value || null);
const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "날짜 형식을 확인해 주세요.",
  );
const optionalWeekday = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().int().min(0).max(6).nullable(),
);
const optionalClockTime = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine(
    (value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "과외 시작 시각을 확인해 주세요.",
  );
const DEFAULT_DURATION_MINUTES = 60;

// The hourly rate is the agreed contract value; the per-lesson fee the rest of the
// app bills on is derived from it so the two can never drift apart.
function feeFromHourlyRate(hourlyRate: number, durationMinutes: number) {
  return Math.max(1, Math.round((hourlyRate * durationMinutes) / 60));
}

const schema = z
  .object({
    studentId: z.string().uuid().optional(),
    scheduleId: z.string().uuid().optional(),
    name: z.string().trim().min(1, "학생 이름을 입력해 주세요.").max(80),
    tutoringTrack: z.enum(["csat", "school_exam", "school_record"]),
    subjectCategory: z.enum([
      "probability_statistics",
      "calculus",
      "physics_1",
      "chemistry_1",
      "custom",
      "none",
    ]),
    subjectCustom: optionalText,
    hourlyRate: z.coerce.number().int().positive("시급을 입력해 주세요."),
    defaultDurationMinutes: z.coerce.number().int().min(15).max(600),
    scheduleWeekday: optionalWeekday,
    scheduleStartTime: optionalClockTime,
    defaultMode: z.enum(["online", "in_person"]),
    defaultLocation: optionalText,
    manualMeetUrl: z.string().trim().max(500),
    googleSheetUrl: z.string().trim().max(500),
    notes: optionalText,
    schoolName: optionalText,
    schoolLevel: optionalText,
    grade: optionalText,
    studentPhone: optionalText,
    guardianName: optionalText,
    guardianPhone: optionalText,
    guardianRelation: optionalText,
    sourceChannel: optionalText,
    consultationStatus: z.enum(["consulting", "active", "paused", "ended"]),
    firstConsultedOn: optionalDate,
    startedOn: optionalDate,
    targetSchool: optionalText,
    targetMajor: optionalText,
    currentLevel: optionalText,
    targetLevel: optionalText,
    learningGoal: optionalText,
    curriculumPlan: optionalText,
    materials: optionalText,
    strengths: optionalText,
    weaknesses: optionalText,
    homeworkPolicy: optionalText,
    progressSummary: optionalText,
    nextGoal: optionalText,
  })
  .superRefine((value, context) => {
    if (value.defaultMode === "in_person" && !value.defaultLocation) {
      context.addIssue({
        code: "custom",
        path: ["defaultLocation"],
        message: "대면 장소를 입력해 주세요.",
      });
    }
    if ((value.scheduleWeekday === null) !== (value.scheduleStartTime === null)) {
      context.addIssue({
        code: "custom",
        path: [value.scheduleWeekday === null ? "scheduleWeekday" : "scheduleStartTime"],
        message: "과외 요일과 시작 시각을 함께 선택해 주세요.",
      });
    }
    if (value.scheduleId && !value.studentId) {
      context.addIssue({
        code: "custom",
        path: ["scheduleId"],
        message: "학생 정보와 연결되지 않은 일정입니다.",
      });
    }
    if (value.subjectCategory === "custom" && !value.subjectCustom) {
      context.addIssue({
        code: "custom",
        path: ["subjectCustom"],
        message: "직접 입력 과목을 적어 주세요.",
      });
    }
    if (value.manualMeetUrl && !isGoogleMeetUrl(value.manualMeetUrl)) {
      context.addIssue({
        code: "custom",
        path: ["manualMeetUrl"],
        message: "meet.google.com의 실제 회의 링크를 입력해 주세요.",
      });
    }
    if (value.googleSheetUrl && !isGoogleSheetUrl(value.googleSheetUrl)) {
      context.addIssue({
        code: "custom",
        path: ["googleSheetUrl"],
        message: "docs.google.com의 Google Sheets 링크를 입력해 주세요.",
      });
    }
  });

export type StudentActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function readInput(formData: FormData) {
  const value = (name: string) => formData.get(name) || "";
  return schema.safeParse({
    studentId: formData.get("studentId") || undefined,
    scheduleId: formData.get("scheduleId") || undefined,
    name: value("name"),
    tutoringTrack: value("tutoringTrack") || "csat",
    subjectCategory: value("subjectCategory") || "none",
    subjectCustom: value("subjectCustom"),
    hourlyRate: value("hourlyRate"),
    defaultDurationMinutes: value("defaultDurationMinutes"),
    scheduleWeekday: value("scheduleWeekday"),
    scheduleStartTime: value("scheduleStartTime"),
    defaultMode: value("defaultMode"),
    defaultLocation: value("defaultLocation"),
    manualMeetUrl: value("manualMeetUrl"),
    googleSheetUrl: value("googleSheetUrl"),
    notes: value("notes"),
    schoolName: value("schoolName"),
    schoolLevel: value("schoolLevel"),
    grade: value("grade"),
    studentPhone: value("studentPhone"),
    guardianName: value("guardianName"),
    guardianPhone: value("guardianPhone"),
    guardianRelation: value("guardianRelation"),
    sourceChannel: value("sourceChannel"),
    consultationStatus: value("consultationStatus"),
    firstConsultedOn: value("firstConsultedOn"),
    startedOn: value("startedOn"),
    targetSchool: value("targetSchool"),
    targetMajor: value("targetMajor"),
    currentLevel: value("currentLevel"),
    targetLevel: value("targetLevel"),
    learningGoal: value("learningGoal"),
    curriculumPlan: value("curriculumPlan"),
    materials: value("materials"),
    strengths: value("strengths"),
    weaknesses: value("weaknesses"),
    homeworkPolicy: value("homeworkPolicy"),
    progressSummary: value("progressSummary"),
    nextGoal: value("nextGoal"),
  });
}

async function savePrimarySchedule(
  auth: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>>,
  studentId: string,
  data: z.infer<typeof schema>,
) {
  if (data.scheduleWeekday === null || data.scheduleStartTime === null) {
    if (!data.scheduleId) return null;
    const { data: removed, error } = await auth.supabase
      .from("tutoring_schedules")
      .update({ is_active: false })
      .eq("id", data.scheduleId)
      .eq("student_id", studentId)
      .eq("owner_id", auth.user.id)
      .select("id")
      .maybeSingle();
    return error?.message ?? (removed ? null : "schedule_not_found");
  }
  const scheduleValues = {
    owner_id: auth.user.id,
    student_id: studentId,
    weekday: data.scheduleWeekday,
    start_time: data.scheduleStartTime,
    duration_minutes: data.defaultDurationMinutes,
    timezone: "Asia/Seoul",
    is_active: true,
  };
  if (data.scheduleId) {
    const { data: updated, error } = await auth.supabase
      .from("tutoring_schedules")
      .update(scheduleValues)
      .eq("id", data.scheduleId)
      .eq("student_id", studentId)
      .eq("owner_id", auth.user.id)
      .select("id")
      .maybeSingle();
    return error?.message ?? (updated ? null : "schedule_not_found");
  }
  const { error } = await auth.supabase.from("tutoring_schedules").insert({
    ...scheduleValues,
    effective_from: formatSeoulDateKey(),
  });
  return error?.message ?? null;
}

function databaseRow(ownerId: string, data: z.infer<typeof schema>) {
  const manualMeetUrl =
    data.defaultMode === "online" ? normalizeGoogleMeetUrl(data.manualMeetUrl) : null;
  const googleSheetUrl = normalizeGoogleSheetUrl(data.googleSheetUrl);
  const tutoringType = data.tutoringTrack === "school_record" ? "school_record" : "subject";
  const subject =
    tutoringType === "subject"
      ? {
          probability_statistics: "math",
          calculus: "math",
          physics_1: "physics",
          chemistry_1: "chemistry",
          custom: null,
          none: "math",
        }[data.subjectCategory]
      : null;
  return {
    owner_id: ownerId,
    name: data.name,
    tutoring_type: tutoringType,
    subject,
    default_mode: data.defaultMode,
    hourly_rate: data.hourlyRate,
    default_fee_amount: feeFromHourlyRate(data.hourlyRate, data.defaultDurationMinutes),
    default_duration_minutes: data.defaultDurationMinutes,
    default_location: data.defaultMode === "in_person" ? data.defaultLocation : null,
    meet_strategy:
      data.defaultMode === "online"
        ? manualMeetUrl
          ? "manual_reusable"
          : "google_generated"
        : "none",
    manual_meet_url: manualMeetUrl,
    google_sheet_url: googleSheetUrl,
    tutoring_track: data.tutoringTrack,
    subject_detail: data.subjectCategory === "none" ? null : data.subjectCategory,
    subject_custom:
      data.subjectCategory === "custom" && data.subjectCustom ? data.subjectCustom : null,
    payer_aliases: [],
    notes: data.notes,
    school_name: data.schoolName,
    school_level: data.schoolLevel,
    grade: data.grade,
    student_phone: data.studentPhone,
    guardian_name: data.guardianName,
    guardian_phone: data.guardianPhone,
    guardian_relation: data.guardianRelation,
    source_channel: data.sourceChannel,
    consultation_status: data.consultationStatus,
    first_consulted_on: data.firstConsultedOn,
    started_on: data.startedOn,
    target_school: data.targetSchool,
    target_major: data.targetMajor,
    current_level: data.currentLevel,
    target_level: data.targetLevel,
    learning_goal: data.learningGoal,
    curriculum_plan: data.curriculumPlan,
    materials: data.materials,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    homework_policy: data.homeworkPolicy,
    progress_summary: data.progressSummary,
    next_goal: data.nextGoal,
    updated_at: new Date().toISOString(),
  };
}

export async function saveRemoteStudentAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const parsed = readInput(formData);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const row = databaseRow(auth.user.id, parsed.data);
  if (parsed.data.studentId) {
    const { data: ownedStudent, error: ownershipError } = await auth.supabase
      .from("students")
      .select("id")
      .eq("id", parsed.data.studentId)
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (ownershipError || !ownedStudent) {
      return { status: "error", message: "수정할 학생을 찾을 수 없습니다." };
    }
    const { error } = await auth.supabase
      .from("students")
      .update(row)
      .eq("id", parsed.data.studentId)
      .eq("owner_id", auth.user.id);
    if (error)
      return {
        status: "error",
        message:
          error.code === "42703"
            ? "데이터베이스 업데이트가 필요합니다. 관리자에게 0018·0019 마이그레이션 적용을 요청해 주세요."
            : "학생 정보를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    const scheduleError = await savePrimarySchedule(auth, parsed.data.studentId, parsed.data);
    if (scheduleError) {
      return {
        status: "error",
        message:
          "학생 정보는 저장했지만 과외 시간을 반영하지 못했습니다. 중복 일정을 확인해 주세요.",
      };
    }
    revalidatePath("/home");
    revalidatePath("/tutoring/schedule");
    revalidatePath(`/tutoring/students/${parsed.data.studentId}`);
    redirect(`/tutoring/students/${parsed.data.studentId}?updated=1`);
  }
  const { data, error } = await auth.supabase.from("students").insert(row).select("id").single();
  if (error || !data)
    return {
      status: "error",
      message:
        error?.code === "42703"
          ? "데이터베이스 업데이트가 필요합니다. 관리자에게 0018·0019 마이그레이션 적용을 요청해 주세요."
          : "학생을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  const scheduleError = await savePrimarySchedule(auth, data.id, parsed.data);
  if (scheduleError) {
    await auth.supabase.from("students").delete().eq("id", data.id).eq("owner_id", auth.user.id);
    return {
      status: "error",
      message: "과외 시간을 저장하지 못했습니다. 중복 일정을 확인한 뒤 다시 시도해 주세요.",
    };
  }
  revalidatePath("/home");
  revalidatePath("/tutoring/schedule");
  revalidatePath("/tutoring/students");
  redirect(`/tutoring/students/${data.id}?created=1`);
}

const quickSchema = z.object({
  name: z.string().trim().min(1, "학생 이름을 입력해 주세요.").max(80),
  defaultMode: z.enum(["online", "in_person"]),
  grade: z.enum(["1", "2", "3"]),
  hourlyRate: z.coerce.number().int().positive("시급을 입력해 주세요."),
});

export async function createStudentQuickAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const parsed = quickSchema.safeParse({
    name: formData.get("name") || "",
    defaultMode: formData.get("defaultMode") || "",
    grade: formData.get("grade") || "",
    hourlyRate: formData.get("hourlyRate") || "",
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };

  const { data, error } = await auth.supabase
    .from("students")
    .insert({
      owner_id: auth.user.id,
      name: parsed.data.name,
      default_mode: parsed.data.defaultMode,
      hourly_rate: parsed.data.hourlyRate,
      // A newly added student has no agreed lesson length yet, so one hour stands
      // in until the detail form sets a real one.
      default_duration_minutes: DEFAULT_DURATION_MINUTES,
      default_fee_amount: parsed.data.hourlyRate,
      school_level: "고등",
      grade: parsed.data.grade,
      tutoring_type: "subject",
      subject: "math",
      tutoring_track: "csat",
      meet_strategy: parsed.data.defaultMode === "online" ? "google_generated" : "none",
      consultation_status: "consulting",
      payer_aliases: [],
    })
    .select("id")
    .single();

  if (error || !data)
    return {
      status: "error",
      message:
        error?.code === "42703" || error?.code === "23514"
          ? "데이터베이스 업데이트가 필요합니다. 0024 마이그레이션을 적용해 주세요."
          : "학생을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };

  revalidatePath("/home");
  revalidatePath("/tutoring/students");
  redirect(`/tutoring/students/${data.id}?created=1`);
}

export async function archiveRemoteStudentAction(formData: FormData) {
  const studentId = z.string().uuid().parse(formData.get("studentId"));
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login?next=/tutoring/students");
  await auth.supabase
    .from("students")
    .update({
      is_active: false,
      consultation_status: "ended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .eq("owner_id", auth.user.id);
  revalidatePath("/tutoring/students");
  redirect("/tutoring/students");
}
