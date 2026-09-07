import { z } from "zod";

export const APP_LOCALE = "ko-KR" as const;
export const APP_CURRENCY = "KRW" as const;
export const APP_TIMEZONE = "Asia/Seoul" as const;

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const demoModeString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const environmentSchema = z.object({
  DEMO_MODE: demoModeString,
  BANK_PROVIDER: z.enum(["mock", "manual_csv", "kftc_testbed", "kftc_production"]).default("mock"),
  KFTC_PRODUCTION_ENABLED: booleanString,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
});

export type RuntimeSafetyConfig = z.infer<typeof environmentSchema>;

export function readRuntimeSafetyConfig(source: Record<string, string | undefined>) {
  return environmentSchema.parse(source);
}

export function assertSafeRuntime(config: RuntimeSafetyConfig) {
  if (config.BANK_PROVIDER === "kftc_production" || config.KFTC_PRODUCTION_ENABLED) {
    throw new Error("KFTC 운영 연결은 명시적 온보딩 전까지 사용할 수 없습니다.");
  }

  if (!config.DEMO_MODE && !config.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("데모 모드가 아니면 개발용 Supabase URL이 필요합니다.");
  }
}

export function isLocalSupabaseUrl(url: string | undefined) {
  if (!url) return false;
  const hostname = new URL(url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function assertLocalDatabaseWrite(url: string | undefined) {
  if (!isLocalSupabaseUrl(url)) {
    throw new Error("Phase 00에서는 로컬 Supabase에만 쓸 수 있습니다.");
  }
}
