import { describe, expect, it } from "vitest";

import {
  formatKoreanDate,
  formatKoreanDateTime,
  formatKoreanDateTimeInput,
  formatSeoulDateKey,
  getSeoulWeekday,
} from "@/lib/format/date";

describe("UX-006 shared Korean date formatting", () => {
  it("uses Asia/Seoul consistently for display and datetime-local values", () => {
    const instant = "2026-09-03T15:30:00.000Z";
    expect(formatKoreanDate(instant)).toContain("2026");
    expect(formatKoreanDateTime(instant)).toContain("9");
    expect(formatKoreanDateTimeInput(instant)).toBe("2026-09-04T00:30");
  });

  it("treats a date-only value as a Seoul calendar date", () => {
    expect(formatKoreanDate("2026-09-04")).toContain("9월 4일");
  });

  it("derives a stable Seoul date key and weekday across UTC midnight", () => {
    const instant = "2026-09-06T15:30:00.000Z";
    expect(formatSeoulDateKey(instant)).toBe("2026-09-07");
    expect(getSeoulWeekday(instant)).toBe(1);
  });
});
