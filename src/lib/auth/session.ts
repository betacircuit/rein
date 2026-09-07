import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { DEMO_ONBOARDING_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/auth/constants";
import { findIdentityByEmail } from "@/lib/auth/identities";
import { requireSupabaseUser } from "@/lib/supabase/server";

export { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";

const sessionSchema = z.object({
  userId: z.string().min(8),
  persona: z.enum(["owner", "roommate"]),
  expiresAt: z.number().int().positive(),
});

const onboardingSchema = z.object({
  userId: z.string().min(8),
  profile: z.object({
    displayName: z.string().min(1),
    school: z.string(),
    major: z.string(),
    academicYear: z.number().int().min(1).max(12).nullable(),
  }),
  household: z.object({
    name: z.string().min(1),
    homeType: z.literal("two_room_rental"),
    currentRole: z.enum(["owner", "member"]),
    currentStatus: z.literal("active"),
    roommateStatus: z.enum(["invited", "active"]),
  }),
});

export type DemoSession = z.infer<typeof sessionSchema>;
export type DemoOnboardingState = z.infer<typeof onboardingSchema>;

function demoModeEnabled() {
  return process.env.DEMO_MODE !== "false";
}

function encryptionKey() {
  const configured = process.env.SESSION_SECRET?.trim();
  if (!configured && !demoModeEnabled()) {
    throw new Error("SESSION_SECRET이 없으면 실제 인증 세션을 만들 수 없어요.");
  }
  return createHash("sha256")
    .update(configured || "rein-local-demo-session-only")
    .digest();
}

function sealLocalValue(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function unsealLocalValue(value: string | undefined) {
  if (!value) return null;
  try {
    const [ivPart, tagPart, encryptedPart] = value.split(".");
    if (!ivPart || !tagPart || !encryptedPart) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ) as unknown;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV === "production" &&
      Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")),
    path: "/",
    maxAge,
  };
}

export async function createDemoSession(input: Omit<DemoSession, "expiresAt">) {
  if (!demoModeEnabled()) throw new Error("로컬 데모 모드가 꺼져 있어요.");
  const maxAge = 60 * 60 * 8;
  const payload: DemoSession = { ...input, expiresAt: Date.now() + maxAge * 1000 };
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_ONBOARDING_COOKIE);
  cookieStore.set(DEMO_SESSION_COOKIE, sealLocalValue(payload), cookieOptions(maxAge));
}

export async function readDemoSession() {
  const payload = unsealLocalValue((await cookies()).get(DEMO_SESSION_COOKIE)?.value);
  const parsed = sessionSchema.safeParse(payload);
  if (parsed.success && parsed.data.expiresAt > Date.now()) return parsed.data;

  try {
    const auth = await requireSupabaseUser();
    const identity = findIdentityByEmail(auth?.user.email);
    if (!auth || !identity) return null;
    return {
      userId: auth.user.id,
      persona: identity.role,
      expiresAt: Date.now() + 60 * 60 * 1_000,
    } satisfies DemoSession;
  } catch {
    return null;
  }
}

export async function deleteDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  cookieStore.delete(DEMO_ONBOARDING_COOKIE);
}

export async function saveDemoOnboardingState(state: DemoOnboardingState) {
  const parsed = onboardingSchema.parse(state);
  (await cookies()).set(DEMO_ONBOARDING_COOKIE, sealLocalValue(parsed), cookieOptions(60 * 60 * 8));
}

export async function readDemoOnboardingState() {
  const cookieStore = await cookies();
  const payload = unsealLocalValue(cookieStore.get(DEMO_ONBOARDING_COOKIE)?.value);
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) return null;
  const session = await readDemoSession();
  return session?.userId === parsed.data.userId ? parsed.data : null;
}
