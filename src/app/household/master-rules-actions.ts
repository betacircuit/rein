"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSupabaseUser } from "@/lib/supabase/server";

export type MasterRuleActionState = { status: "idle" | "saved" | "error"; message?: string };

const ruleSchema = z.object({
  title: z.string().trim().min(1, "규칙을 입력해 주세요.").max(120),
  detail: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
});

async function activeHouseholdId(
  auth: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>>,
) {
  const { data } = await auth.supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .maybeSingle();
  return data?.household_id as string | undefined;
}

export async function saveMasterRuleAction(
  _previous: MasterRuleActionState,
  formData: FormData,
): Promise<MasterRuleActionState> {
  const parsed = ruleSchema.safeParse({
    title: formData.get("title") || "",
    detail: formData.get("detail") || "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "규칙을 확인해 주세요." };
  }
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const householdId = await activeHouseholdId(auth);
  if (!householdId) return { status: "error", message: "연결된 집이 없어요." };

  const ruleId = formData.get("ruleId");
  if (typeof ruleId === "string" && ruleId) {
    const { error } = await auth.supabase
      .from("household_master_rules")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .eq("household_id", householdId);
    if (error) return { status: "error", message: "규칙을 수정하지 못했어요." };
  } else {
    const { count } = await auth.supabase
      .from("household_master_rules")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId);
    const { error } = await auth.supabase.from("household_master_rules").insert({
      household_id: householdId,
      created_by: auth.user.id,
      sort_order: count ?? 0,
      ...parsed.data,
    });
    if (error) return { status: "error", message: "규칙을 추가하지 못했어요." };
  }

  revalidatePath("/household");
  return { status: "saved" };
}

export async function deleteMasterRuleAction(formData: FormData) {
  const ruleId = z.string().uuid().parse(formData.get("ruleId"));
  const auth = await requireSupabaseUser();
  if (!auth) return;
  const householdId = await activeHouseholdId(auth);
  if (!householdId) return;
  await auth.supabase
    .from("household_master_rules")
    .delete()
    .eq("id", ruleId)
    .eq("household_id", householdId);
  revalidatePath("/household");
}
