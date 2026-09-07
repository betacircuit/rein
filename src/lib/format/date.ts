export const KOREAN_LOCALE = "ko-KR";
export const SEOUL_TIME_ZONE = "Asia/Seoul";

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value);
}

function seoulParts(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(toDate(value));
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((candidate) => candidate.type === type)?.value ?? "";
}

export function formatSeoulDateKey(value: string | Date = new Date()) {
  const parts = seoulParts(value);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export function getSeoulWeekday(value: string | Date = new Date()) {
  const [year, month, day] = formatSeoulDateKey(value).split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay();
}

export function formatKoreanDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) {
  return new Intl.DateTimeFormat(KOREAN_LOCALE, {
    timeZone: SEOUL_TIME_ZONE,
    ...options,
  }).format(toDate(value));
}

export function formatKoreanDateTime(value: string | Date) {
  return formatKoreanDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatKoreanDateTimeInput(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(toDate(value));
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}T${part(parts, "hour")}:${part(parts, "minute")}`;
}
