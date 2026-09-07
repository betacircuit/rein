import { describe, expect, it } from "vitest";

import { effectiveHourlyIncome, percentChange, previousMonth } from "@/domain/analytics/model";
import { toKrw } from "@/domain/money/krw";

describe("Phase 07 analytics", () => {
  it("TUT-018 includes lesson, preparation, and travel minutes", () => {
    expect(
      effectiveHourlyIncome({
        amount: toKrw(60_000),
        lessonMinutes: 120,
        preparationMinutes: 30,
        travelMinutes: 30,
      }),
    ).toEqual({
      totalMinutes: 180,
      nominalHourly: 30_000n,
      effectiveHourly: 20_000n,
    });
  });
  it("MON-019 compares consistent calendar months", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(percentChange(120n, 100n)).toBe(20);
    expect(percentChange(1n, 0n)).toBeNull();
  });
});
