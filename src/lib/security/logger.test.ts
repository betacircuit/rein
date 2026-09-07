import { describe, expect, it } from "vitest";

import { safeLogPayload } from "@/lib/security/logger";

describe("Phase 09 structured logging", () => {
  it("SEC-006 redacts student, household, financial, and token fields by default", () => {
    const logged = safeLogPayload("mutation_failed", {
      studentName: "실제 학생",
      notes: "민감 메모",
      accountId: "account-private",
      nested: { authorization: "Bearer secret-token", count: 2 },
      apiKey: "gsk_abcdefghijklmnop1234",
    });
    expect(logged).toEqual({
      event: "mutation_failed",
      studentName: "[REDACTED]",
      notes: "[REDACTED]",
      accountId: "[REDACTED]",
      nested: { authorization: "[REDACTED]", count: 2 },
      apiKey: "[REDACTED]",
    });
    expect(JSON.stringify(logged)).not.toContain("실제 학생");
  });
});
