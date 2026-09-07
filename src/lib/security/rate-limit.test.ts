import { afterEach, describe, expect, test } from "vitest";

import {
  checkRateLimit,
  enforceRateLimit,
  RateLimitError,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("SEC-007 사용자별 서버 mutation 속도 제한", () => {
  afterEach(() => resetRateLimitsForTests());

  test("허용량을 넘으면 재시도 시간을 포함해 차단한다", () => {
    expect(checkRateLimit({ key: "login:user", limit: 2, windowMs: 60_000, now: 1_000 })).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 60,
    });
    expect(
      checkRateLimit({ key: "login:user", limit: 2, windowMs: 60_000, now: 2_000 }).allowed,
    ).toBe(true);
    expect(() =>
      enforceRateLimit({ key: "login:user", limit: 2, windowMs: 60_000, now: 3_000 }),
    ).toThrow(RateLimitError);
  });

  test("제한 시간이 지나면 새 버킷으로 다시 허용한다", () => {
    checkRateLimit({ key: "import:user", limit: 1, windowMs: 1_000, now: 10_000 });
    expect(
      checkRateLimit({ key: "import:user", limit: 1, windowMs: 1_000, now: 11_000 }),
    ).toMatchObject({ allowed: true, remaining: 0 });
  });
});
