"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";

import { findAppIdentity, type AppIdentity } from "@/lib/auth/identities";
import { createDemoSession } from "@/lib/auth/session";
import {
  RAINY_GROQ_COOKIE,
  RAINY_GROQ_MARKER_COOKIE,
  sessionCookieOptions,
} from "@/lib/rainy/groq-key";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readRuntimeSafetyConfig } from "@/lib/runtime-safety";

const loginSchema = z.object({
  loginId: z.string().trim().min(2, "이름을 입력해 주세요."),
  password: z.string().regex(/^0036$/, "이름 또는 PIN이 맞지 않습니다."),
});

export type LoginActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: { loginId?: string[]; password?: string[] };
};

async function ensureHousehold(identity: AppIdentity) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;

  const { data: activeMembership } = await supabase
    .from("household_members")
    .select("id, household_id")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (activeMembership) return;

  if (identity.role === "owner") {
    const { data: householdId, error } = await supabase.rpc("create_household_with_owner", {
      p_name: "재원·태현 자취방",
      p_owner_display_name: identity.displayName,
      p_home_type: "two_room_rental",
    });
    if (error || !householdId) return;
    await supabase.rpc("invite_household_member", {
      p_household_id: householdId,
      p_invitee_email: "kim.taehyeon@rein.local",
      p_display_name: "김태현",
    });
    return;
  }

  const { data: invitation } = await supabase
    .from("household_members")
    .select("id")
    .eq("status", "invited")
    .maybeSingle();
  if (invitation) {
    await supabase.rpc("accept_household_invitation", { p_membership_id: invitation.id });
  }
}

export async function signInAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const identity = findAppIdentity(parsed.data.loginId);
  if (!identity) return { status: "error", message: "등록된 사용자가 아닙니다." };

  const limit = checkRateLimit({
    key: `supabase-login:${identity.loginId}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { status: "error", message: `${limit.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password: parsed.data.password,
  });
  if (error) return { status: "error", message: "이름 또는 비밀번호가 맞지 않습니다." };

  if (readRuntimeSafetyConfig(process.env).DEMO_MODE && data.user) {
    await createDemoSession({ userId: data.user.id, persona: identity.role });
  }

  await ensureHousehold(identity);
  await supabase.rpc("ensure_rein_personal_accounts");
  redirect("/home");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.set(RAINY_GROQ_COOKIE, "", { ...sessionCookieOptions("/api/rainy"), maxAge: 0 });
  store.set(RAINY_GROQ_MARKER_COOKIE, "", { ...sessionCookieOptions("/settings"), maxAge: 0 });
  redirect("/login");
}

export const signOutLocalDemo = signOutAction;
