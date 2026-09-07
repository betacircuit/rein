import { describe, expect, it } from "vitest";

import { openGroqKey, sealGroqKey } from "./groq-key";

describe("RAINY Groq session key", () => {
  it("현재 사용자에게만 복호화한다", () => {
    const sealed = sealGroqKey("gsk_abcdefghijklmnop1234", "user-jaewon");
    expect(sealed).not.toContain("gsk_");
    expect(openGroqKey(sealed, "user-jaewon")).toBe("gsk_abcdefghijklmnop1234");
    expect(openGroqKey(sealed, "user-taehyeon")).toBeNull();
  });

  it("변조된 값은 거부한다", () => {
    const sealed = sealGroqKey("gsk_abcdefghijklmnop1234", "user-jaewon");
    expect(openGroqKey(`${sealed}x`, "user-jaewon")).toBeNull();
  });
});
