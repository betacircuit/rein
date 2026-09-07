const KRW_PATTERN = /^-?(0|[1-9]\d*)$/;

export type Krw = bigint & { readonly __brand: "Krw" };

export function toKrw(value: bigint | number | string): Krw {
  if (typeof value === "bigint") return value as Krw;

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError("KRW 금액은 안전한 정수여야 합니다.");
    }
    return BigInt(value) as Krw;
  }

  if (!KRW_PATTERN.test(value)) {
    throw new TypeError("KRW 금액은 소수점 없는 정수 문자열이어야 합니다.");
  }

  return BigInt(value) as Krw;
}

export function toPositiveKrw(value: bigint | number | string): Krw {
  const amount = toKrw(value);
  if (amount <= 0n) throw new RangeError("금액은 0원보다 커야 합니다.");
  return amount;
}

export function roundRatioToKrw(numerator: bigint, denominator: bigint): Krw {
  if (denominator <= 0n) throw new RangeError("분모는 0보다 커야 합니다.");

  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const rounded = (absolute + denominator / 2n) / denominator;
  return (rounded * sign) as Krw;
}

export function formatKrw(value: bigint | number | string): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(toKrw(value));
}
