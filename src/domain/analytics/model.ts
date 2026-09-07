import { toKrw, type Krw } from "@/domain/money/krw";

export function effectiveHourlyIncome(input: {
  amount: Krw;
  lessonMinutes: number;
  preparationMinutes: number;
  travelMinutes: number;
}) {
  const totalMinutes = input.lessonMinutes + input.preparationMinutes + input.travelMinutes;
  if (!Number.isInteger(totalMinutes) || totalMinutes <= 0)
    throw new Error("총 투입 시간은 1분 이상이어야 해요.");
  return {
    totalMinutes,
    nominalHourly: toKrw(
      (input.amount * 60n + BigInt(Math.floor(input.lessonMinutes / 2))) /
        BigInt(input.lessonMinutes),
    ),
    effectiveHourly: toKrw(
      (input.amount * 60n + BigInt(Math.floor(totalMinutes / 2))) / BigInt(totalMinutes),
    ),
  };
}

export function previousMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value || value < 1 || value > 12) throw new Error("월 형식을 확인해 주세요.");
  const date = new Date(Date.UTC(year, value - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function percentChange(current: bigint, previous: bigint) {
  if (previous === 0n) return null;
  return Number(((current - previous) * 10_000n) / previous) / 100;
}
