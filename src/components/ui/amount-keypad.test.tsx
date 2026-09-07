import { describe, expect, it } from "vitest";

import { appendAmountDigits } from "@/components/ui/amount-keypad";

describe("금액 숫자판", () => {
  it("0, 00, 000 단위를 원시 숫자값으로 조합한다", () => {
    const amount = ["6", "00", "000"].reduce(
      (current, token) => appendAmountDigits(current, token, 10_000_000_000),
      "",
    );

    expect(amount).toBe("600000");
    expect(amount.slice(0, -1)).toBe("60000");
  });

  it("최대 금액을 넘는 숫자 입력을 거부한다", () => {
    expect(appendAmountDigits("10000000000", "0", 10_000_000_000)).toBe("10000000000");
  });
});
