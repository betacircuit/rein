"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSupabaseUser } from "@/lib/supabase/server";

export type LedgerActionState = { status: "idle" | "error"; message?: string };

const lessonSchema = z.object({
  studentId: z.string().uuid(),
  lessonDate: z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "날짜를 확인해 주세요."),
  prepNotes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});

export async function recordStudentLessonAction(
  _previous: LedgerActionState,
  formData: FormData,
): Promise<LedgerActionState> {
  const parsed = lessonSchema.safeParse({
    studentId: formData.get("studentId"),
    lessonDate: formData.get("lessonDate"),
    prepNotes: formData.get("prepNotes") || "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };

  const { data: student, error: studentError } = await auth.supabase
    .from("students")
    .select("default_mode, default_duration_minutes, default_fee_amount, default_location")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (studentError || !student) return { status: "error", message: "학생을 찾을 수 없습니다." };

  const mode = student.default_mode as "online" | "in_person";
  const durationMinutes = Number(student.default_duration_minutes);
  const startsAt = new Date(`${parsed.data.lessonDate}T12:00:00+09:00`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const { data: lesson, error: insertError } = await auth.supabase
    .from("lessons")
    .insert({
      owner_id: auth.user.id,
      student_id: parsed.data.studentId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone: "Asia/Seoul",
      mode,
      amount: student.default_fee_amount,
      // A record can predate the location being filled in, so a lesson taught before
      // that gets a placeholder rather than failing to save.
      in_person_location: mode === "in_person" ? student.default_location || "장소 미정" : null,
      meet_strategy: mode === "online" ? "google_generated" : "none",
      prep_notes: parsed.data.prepNotes,
    })
    .select("id")
    .single();
  if (insertError || !lesson)
    return { status: "error", message: "수업 기록을 저장하지 못했습니다." };

  const { error: completeError } = await auth.supabase.rpc("complete_lesson", {
    p_lesson_id: lesson.id,
  });
  if (completeError) {
    return {
      status: "error",
      message: "수업은 기록했지만 청구 내역 생성에 실패했습니다. 다시 시도해 주세요.",
    };
  }

  revalidatePath(`/tutoring/students/${parsed.data.studentId}`);
  return { status: "idle" };
}

const depositSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().int().positive("입금액을 입력해 주세요.").max(10_000_000_000),
  occurredOn: z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "날짜를 확인해 주세요."),
  memo: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});

export async function recordStudentDepositAction(
  _previous: LedgerActionState,
  formData: FormData,
): Promise<LedgerActionState> {
  const parsed = depositSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    memo: formData.get("memo") || "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };

  const { error } = await auth.supabase.rpc("record_student_transaction", {
    p_account_id: null,
    p_kind: "income",
    p_amount: parsed.data.amount,
    p_occurred_at: new Date(`${parsed.data.occurredOn}T12:00:00+09:00`).toISOString(),
    p_category_code: "tutoring",
    p_counterparty: null,
    p_descriptor: "과외비 입금",
    p_memo: parsed.data.memo,
    p_student_id: parsed.data.studentId,
  });
  if (error) return { status: "error", message: "입금 기록을 저장하지 못했습니다." };

  revalidatePath(`/tutoring/students/${parsed.data.studentId}`);
  return { status: "idle" };
}
