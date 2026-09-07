import { describe, expect, it } from "vitest";

import { formatKrw, roundRatioToKrw, toKrw } from "@/domain/money/krw";

describe("CORE-007 integer KRW codec", () => {
  it("accepts bigint-safe integer boundaries and formats Korean won", () => {
    expect(toKrw("9007199254740993")).toBe(9_007_199_254_740_993n);
    expect(formatKrw(1_240_300n)).toContain("1,240,300");
  });

  it("rejects floating-point and unsafe numeric input", () => {
    expect(() => toKrw(1.5)).toThrow(/정수/);
    expect(() => toKrw(Number.MAX_SAFE_INTEGER + 1)).toThrow(/안전한/);
  });

  it("rounds a rational only once using half-up KRW semantics", () => {
    expect(roundRatioToKrw(10n, 3n)).toBe(3n);
    expect(roundRatioToKrw(11n, 2n)).toBe(6n);
  });
});
