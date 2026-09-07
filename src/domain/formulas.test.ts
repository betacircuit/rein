import { describe, expect, it } from "vitest";

import {
  calculateActualAvailableSurplus,
  calculateCashFlow,
  calculateHouseholdCredits,
  monthlyEquivalentKrw,
} from "@/domain/formulas";
import { toKrw } from "@/domain/money/krw";

describe("CORE-008 centralized formulas", () => {
  it("normalizes every subscription cycle with integer KRW rounding", () => {
    expect(monthlyEquivalentKrw({ amount: toKrw(12_000), cycle: "monthly" })).toBe(12_000n);
    expect(monthlyEquivalentKrw({ amount: toKrw(12_000), cycle: "quarterly" })).toBe(4_000n);
    expect(monthlyEquivalentKrw({ amount: toKrw(12_000), cycle: "semiannual" })).toBe(2_000n);
    expect(monthlyEquivalentKrw({ amount: toKrw(120_000), cycle: "yearly" })).toBe(10_000n);
    expect(monthlyEquivalentKrw({ amount: toKrw(10_000), cycle: "weekly" })).toBe(43_333n);
    expect(
      monthlyEquivalentKrw({ amount: toKrw(3_000), cycle: "custom_days", intervalDays: 30 }),
    ).toBe(3_044n);
  });

  it("excludes transfers from dashboard cash flow", () => {
    const result = calculateCashFlow([
      { amount: toKrw(1_000_000), direction: "inflow", kind: "income" },
      { amount: toKrw(200_000), direction: "outflow", kind: "expense" },
      { amount: toKrw(100_000), direction: "outflow", kind: "transfer" },
      { amount: toKrw(100_000), direction: "inflow", kind: "transfer" },
    ]);
    expect(result).toEqual({
      settledIncome: 1_000_000n,
      expense: 200_000n,
      cashRemaining: 800_000n,
    });
  });

  it("calculates responsibility-adjusted surplus without unpaid work or transfers", () => {
    expect(
      calculateActualAvailableSurplus({
        settledIncome: toKrw(1_200_000),
        personalExpenseBurden: toKrw(250_000),
        householdResponsibilityShare: toKrw(350_000),
        unpaidConfirmedObligations: toKrw(30_000),
        safetyReserveTopUp: toKrw(100_000),
        confirmedReimbursements: toKrw(0),
      }),
    ).toBe(470_000n);
  });

  it("keeps actual payer separate from exact shared responsibility", () => {
    const credits = calculateHouseholdCredits([
      {
        totalAmount: toKrw(700_000),
        payerMemberId: "me",
        splits: { me: toKrw(350_000), roommate: toKrw(350_000) },
      },
    ]);
    expect(credits.get("me")).toBe(350_000n);
    expect(credits.get("roommate")).toBe(-350_000n);
  });
});
