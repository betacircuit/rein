"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import {
  RAINY_GROQ_COOKIE,
  RAINY_GROQ_MARKER_COOKIE,
  sealGroqKey,
  sessionCookieOptions,
} from "@/lib/rainy/groq-key";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requireSupabaseUser } from "@/lib/supabase/server";

const schema = z.object({
  apiKey: z
    .string()
    .trim()
    .regex(/^gsk_[A-Za-z0-9_-]{16,}$/, "Groq API 키 형식을 확인해 주세요."),
});

export type RainyProviderState = {
  status: "idle" | "saved" | "removed" | "error";
  message?: string;
};

export async function saveRainyProviderKey(
  _previous: RainyProviderState,
  formData: FormData,
): Promise<RainyProviderState> {
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "로그인이 필요합니다." };
  const limit = checkRateLimit({ key: `rainy-key:${auth.user.id}`, limit: 5, windowMs: 60_000 });
  if (!limit.allowed)
    return { status: "error", message: `${limit.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  const parsed = schema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Groq API 키 형식을 확인해 주세요.",
    };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const verification = await fetch(
    "https://api.groq.com/openai/v1/models/llama-3.3-70b-versatile",
    {
      headers: { Authorization: `Bearer ${parsed.data.apiKey}` },
      cache: "no-store",
      signal: controller.signal,
    },
  ).catch(() => null);
  clearTimeout(timeout);
  if (!verification?.ok) return { status: "error", message: "Groq API 키를 확인해 주세요." };

  const store = await cookies();
  store.set(
    RAINY_GROQ_COOKIE,
    sealGroqKey(parsed.data.apiKey, auth.user.id),
    sessionCookieOptions("/api/rainy"),
  );
  store.set(RAINY_GROQ_MARKER_COOKIE, "1", sessionCookieOptions("/settings"));
  return { status: "saved", message: "Groq가 이 로그인 세션에 연결되었습니다." };
}

export async function removeRainyProviderKey(): Promise<RainyProviderState> {
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "로그인이 필요합니다." };
  const store = await cookies();
  store.set(RAINY_GROQ_COOKIE, "", { ...sessionCookieOptions("/api/rainy"), maxAge: 0 });
  store.set(RAINY_GROQ_MARKER_COOKIE, "", { ...sessionCookieOptions("/settings"), maxAge: 0 });
  return { status: "removed", message: "Groq 연결을 해제했습니다." };
}
