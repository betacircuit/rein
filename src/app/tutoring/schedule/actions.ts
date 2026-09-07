"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { durationBetween } from "@/lib/tutoring/timetable";
import { parseRainyScheduleCommand } from "@/lib/rainy/command";
import { isRainyRestrictedRequest, RAINY_ACCESS_DENIED } from "@/lib/rainy/site-command-router";
import { requireSupabaseUser } from "@/lib/supabase/server";
import { formatSeoulDateKey, getSeoulWeekday } from "@/lib/format/date";

const schema = z.object({
  studentId: z.string().uuid("학생을 선택해 주세요."),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type ScheduleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type RainyActionState = {
  status: "idle" | "success" | "error";
  code?: "restricted_domain";
  message?: string;
};

const rainyRateLimit = new Map<string, { count: number; windowStartedAt: number }>();
const RAINY_RATE_WINDOW_MS = 60_000;
const RAINY_RATE_LIMIT = 8;

function canRunRainyCommand(userId: string, now = Date.now()) {
  const current = rainyRateLimit.get(userId);
  if (!current || now - current.windowStartedAt >= RAINY_RATE_WINDOW_MS) {
    rainyRateLimit.set(userId, { count: 1, windowStartedAt: now });
    return true;
  }
  if (current.count >= RAINY_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

const rainySchema = z.object({ command: z.string().trim().min(2).max(160) });
const scheduleDraftSchema = schema.extend({
  scheduleId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
});
const personalScheduleDraftSchema = z.object({
  personalScheduleId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
  title: z.string().trim().min(1).max(80),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

function readDraftTimes(data: { startTime: string; endTime: string }) {
  const durationMinutes = durationBetween(data.startTime, data.endTime);
  if (!durationMinutes || durationMinutes < 15 || durationMinutes > 600) return null;
  return durationMinutes;
}

export async function runRainyCommandAction(
  _previous: RainyActionState,
  formData: FormData,
): Promise<RainyActionState> {
  const parsedInput = rainySchema.safeParse({ command: formData.get("command") });
  if (!parsedInput.success) {
    return { status: "error", message: "일정을 2자 이상 160자 이내로 말해 주세요." };
  }
  if (isRainyRestrictedRequest(parsedInput.data.command)) {
    return { status: "error", code: "restricted_domain", message: RAINY_ACCESS_DENIED };
  }

  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  if (!canRunRainyCommand(auth.user.id)) {
    return { status: "error", message: "명령이 너무 빠릅니다. 잠시 후 다시 시도해 주세요." };
  }
  const { data: rows, error: studentError } = await auth.supabase
    .from("students")
    .select("id, name, default_duration_minutes")
    .eq("is_active", true);
  if (studentError) {
    return { status: "error", message: "학생 목록을 불러오지 못했어요. 잠시 후 다시 말해 주세요." };
  }

  const result = parseRainyScheduleCommand({
    input: parsedInput.data.command,
    students: (rows ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      defaultDurationMinutes: Number(row.default_duration_minutes),
    })),
    todayWeekday: getSeoulWeekday(),
  });
  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  const { command } = result;
  const { error } = await auth.supabase.from("tutoring_schedules").insert({
    owner_id: auth.user.id,
    student_id: command.student.id,
    weekday: command.weekday,
    start_time: command.startTime,
    duration_minutes: command.durationMinutes,
    timezone: "Asia/Seoul",
    effective_from: formatSeoulDateKey(),
    is_active: true,
  });
  if (error) {
    return {
      status: "error",
      message: "같은 일정이 이미 있거나 저장하지 못했어요. 시간표를 확인해 주세요.",
    };
  }

  revalidatePath("/tutoring/schedule");
  revalidatePath("/home");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][command.weekday];
  return {
    status: "success",
    message: `${command.student.name} 학생을 매주 ${weekday}요일 ${command.startTime}에 추가했어요.`,
  };
}

export async function createScheduleAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const parsed = schema.safeParse({
    studentId: formData.get("studentId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { status: "error", message: "시간표 입력을 확인해 주세요." };

  const durationMinutes = durationBetween(parsed.data.startTime, parsed.data.endTime);
  if (!durationMinutes || durationMinutes < 15 || durationMinutes > 600) {
    return { status: "error", message: "종료 시간은 시작보다 15분 이상 뒤여야 합니다." };
  }

  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const { error } = await auth.supabase.from("tutoring_schedules").insert({
    owner_id: auth.user.id,
    student_id: parsed.data.studentId,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    duration_minutes: durationMinutes,
    timezone: "Asia/Seoul",
    effective_from: formatSeoulDateKey(),
    is_active: true,
  });
  if (error) return { status: "error", message: "같은 시간표가 이미 있거나 저장하지 못했습니다." };
  revalidatePath("/home");
  revalidatePath("/tutoring/schedule");
  redirect("/tutoring/schedule?created=1");
}

export async function saveScheduleDraftAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const parsed = scheduleDraftSchema.safeParse({
    scheduleId: formData.get("scheduleId"),
    studentId: formData.get("studentId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { status: "error", message: "학생과 시간을 확인해 주세요." };
  const durationMinutes = readDraftTimes(parsed.data);
  if (!durationMinutes) {
    return { status: "error", message: "종료 시간은 시작보다 15분 이상 뒤여야 합니다." };
  }

  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const { data: ownedStudent, error: studentError } = await auth.supabase
    .from("students")
    .select("id")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (studentError || !ownedStudent) {
    return { status: "error", message: "선택한 학생을 찾을 수 없습니다." };
  }

  const row = {
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    duration_minutes: durationMinutes,
    timezone: "Asia/Seoul",
  };
  if (parsed.data.scheduleId) {
    const { data: existing, error: existingError } = await auth.supabase
      .from("tutoring_schedules")
      .select("id, student_id")
      .eq("id", parsed.data.scheduleId)
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (existingError || !existing || String(existing.student_id) !== parsed.data.studentId) {
      return { status: "error", message: "기존 수업의 학생은 바꿀 수 없습니다." };
    }
    const { data: saved, error } = await auth.supabase
      .from("tutoring_schedules")
      .update(row)
      .eq("id", parsed.data.scheduleId)
      .eq("owner_id", auth.user.id)
      .select("id")
      .maybeSingle();
    if (error || !saved) {
      return { status: "error", message: "같은 일정이 있거나 저장 권한이 없습니다." };
    }
  } else {
    const { data: saved, error } = await auth.supabase
      .from("tutoring_schedules")
      .insert({
        ...row,
        owner_id: auth.user.id,
        student_id: parsed.data.studentId,
        effective_from: formatSeoulDateKey(),
        is_active: true,
      })
      .select("id")
      .maybeSingle();
    if (error || !saved) {
      return { status: "error", message: "같은 일정이 있거나 저장 권한이 없습니다." };
    }
  }
  revalidatePath("/home");
  revalidatePath("/tutoring/schedule");
  return { status: "success", message: "학생 수업 시간을 저장했습니다." };
}

export async function savePersonalScheduleDraftAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const parsed = personalScheduleDraftSchema.safeParse({
    personalScheduleId: formData.get("personalScheduleId"),
    title: formData.get("title"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { status: "error", message: "일정 이름과 시간을 확인해 주세요." };
  const durationMinutes = readDraftTimes(parsed.data);
  if (!durationMinutes) {
    return { status: "error", message: "종료 시간은 시작보다 15분 이상 뒤여야 합니다." };
  }

  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const row = {
    title: parsed.data.title,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    duration_minutes: durationMinutes,
    timezone: "Asia/Seoul",
  };
  const mutation = parsed.data.personalScheduleId
    ? auth.supabase
        .from("personal_schedule_blocks")
        .update(row)
        .eq("id", parsed.data.personalScheduleId)
        .eq("owner_id", auth.user.id)
        .select("id")
        .maybeSingle()
    : auth.supabase
        .from("personal_schedule_blocks")
        .insert({ ...row, owner_id: auth.user.id, is_active: true })
        .select("id")
        .maybeSingle();
  const { data: saved, error } = await mutation;
  if (error || !saved) {
    return { status: "error", message: "개인 일정을 저장하지 못했습니다." };
  }
  revalidatePath("/home");
  revalidatePath("/tutoring/schedule");
  return { status: "success", message: "개인 일정을 저장했습니다." };
}

export async function removeScheduleAction(formData: FormData) {
  const scheduleId = z.string().uuid().parse(formData.get("scheduleId"));
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login");
  await auth.supabase
    .from("tutoring_schedules")
    .update({ is_active: false })
    .eq("id", scheduleId)
    .eq("owner_id", auth.user.id);
  revalidatePath("/tutoring/schedule");
  revalidatePath("/home");
}

export async function removePersonalScheduleAction(formData: FormData) {
  const scheduleId = z.string().uuid().parse(formData.get("scheduleId"));
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login");
  await auth.supabase
    .from("personal_schedule_blocks")
    .update({ is_active: false })
    .eq("id", scheduleId)
    .eq("owner_id", auth.user.id);
  revalidatePath("/tutoring/schedule");
  revalidatePath("/home");
}
