import { describe, expect, it } from "vitest";

import { APP_CURRENCY, APP_LOCALE, APP_TIMEZONE } from "@/lib/runtime-safety";

describe("CTX-002 runtime context", () => {
  it("uses the Korean locale, integer KRW currency, and Seoul timezone", () => {
    expect([APP_LOCALE, APP_CURRENCY, APP_TIMEZONE]).toEqual(["ko-KR", "KRW", "Asia/Seoul"]);
  });
});
