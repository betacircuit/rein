import { describe, expect, it } from "vitest";

import {
  assertLocalDatabaseWrite,
  assertSafeRuntime,
  readRuntimeSafetyConfig,
} from "@/lib/runtime-safety";

describe("CORE-010 SEC-004 runtime safety boundary", () => {
  it("allows a credential-free local demo", () => {
    const config = readRuntimeSafetyConfig({ DEMO_MODE: "true", BANK_PROVIDER: "mock" });
    expect(() => assertSafeRuntime(config)).not.toThrow();
  });

  it("blocks KFTC production even when a flag is accidentally enabled", () => {
    const config = readRuntimeSafetyConfig({
      DEMO_MODE: "true",
      BANK_PROVIDER: "kftc_production",
      KFTC_PRODUCTION_ENABLED: "true",
    });
    expect(() => assertSafeRuntime(config)).toThrow(/운영 연결/);
  });

  it("blocks remote Supabase writes in Phase 00", () => {
    expect(() => assertLocalDatabaseWrite("https://example.supabase.co")).toThrow(/로컬 Supabase/);
    expect(() => assertLocalDatabaseWrite("http://127.0.0.1:54321")).not.toThrow();
  });
});
