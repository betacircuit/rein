import { describe, expect, it } from "vitest";

import { stringifyLocalDataExport } from "@/lib/data-operations/local-account";

describe("Phase 09 local data operations", () => {
  it("SEC-008 exports bigint values as lossless JSON strings", () => {
    const output = stringifyLocalDataExport({ amount: 9_007_199_254_740_993n });
    expect(JSON.parse(output)).toEqual({ amount: "9007199254740993" });
    expect(output).not.toContain("undefined");
  });
});
