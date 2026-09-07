import { describe, expect, it } from "vitest";

import { clampPrecipitation, payloadToPrecipitation, taskLoadToPrecipitation } from "./weather";

describe("RAINY precipitation", () => {
  it("강도를 0과 100 사이로 제한한다", () => {
    expect(clampPrecipitation(-9)).toBe(0);
    expect(clampPrecipitation(52.7)).toBe(53);
    expect(clampPrecipitation(140)).toBe(100);
    expect(clampPrecipitation(Number.NaN)).toBe(0);
  });

  it("미완료 작업량을 강수량으로 변환한다", () => {
    expect(taskLoadToPrecipitation(0)).toBe(0);
    expect(taskLoadToPrecipitation(4)).toBe(56);
    expect(taskLoadToPrecipitation(100)).toBe(100);
  });

  it("실행 payload는 짧아도 관측 가능한 비를 만든다", () => {
    expect(payloadToPrecipitation(0)).toBe(0);
    expect(payloadToPrecipitation(1)).toBe(8);
    expect(payloadToPrecipitation(800)).toBe(100);
  });
});
