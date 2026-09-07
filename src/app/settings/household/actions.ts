"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkRateLimit } from "@/lib/security/rate-limit";
import { requireSupabaseUser } from "@/lib/supabase/server";

const schema = z.object({ householdName: z.string().trim().min(2).max(40) });
export type HouseholdSettingsState = { status: "idle" | "saved" | "error"; message?: string };

export async function updateHouseholdSettings(
  _previous: HouseholdSettingsState,
  formData: FormData,
): Promise<HouseholdSettingsState> {
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "로그인이 필요합니다." };
  const limit = checkRateLimit({
    key: `household-settings:${auth.user.id}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limit.allowed)
    return { status: "error", message: `${limit.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  const parsed = schema.safeParse({ householdName: formData.get("householdName") });
  if (!parsed.success) return { status: "error", message: "집 이름은 2~40자로 입력해 주세요." };

  const { data: memberships, error: membershipError } = await auth.supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .limit(2);
  if (membershipError || memberships?.length !== 1 || memberships[0]?.role !== "owner") {
    return { status: "error", message: "집 관리자만 이름을 바꿀 수 있습니다." };
  }
  const { error } = await auth.supabase
    .from("households")
    .update({ name: parsed.data.householdName })
    .eq("id", memberships[0].household_id);
  if (error) return { status: "error", message: "집 설정을 저장하지 못했습니다." };
  revalidatePath("/settings");
  revalidatePath("/settings/household");
  revalidatePath("/household");
  return { status: "saved", message: "집 이름을 저장했습니다." };
}
