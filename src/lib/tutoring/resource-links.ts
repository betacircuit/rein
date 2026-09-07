export const GOOGLE_MEET_NEW_URL = "https://meet.google.com/new";

const MAX_RESOURCE_URL_LENGTH = 500;
const MEET_CODE = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i;
const SHEET_PATH = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})(?:\/.*)?$/;

function trustedUrl(value: string, hostname: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_RESOURCE_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== "https:" ||
      url.hostname !== hostname ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function normalizeGoogleMeetUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const url = trustedUrl(value, "meet.google.com");
  if (!url || !MEET_CODE.test(url.pathname)) return null;
  return `https://meet.google.com/${url.pathname.split("/").filter(Boolean)[0]}`;
}

export function normalizeGoogleSheetUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const url = trustedUrl(value, "docs.google.com");
  const match = url?.pathname.match(SHEET_PATH);
  if (!url || !match?.[1]) return null;
  const hashGid = url.hash.match(/^#gid=(\d+)$/)?.[1] ?? null;
  const gid = url.searchParams.get("gid") ?? hashGid;
  const suffix = gid && /^\d+$/.test(gid) ? `#gid=${gid}` : "";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/edit${suffix}`;
}

export function isGoogleMeetUrl(value: string | null | undefined) {
  return !value?.trim() || normalizeGoogleMeetUrl(value) !== null;
}

export function isGoogleSheetUrl(value: string | null | undefined) {
  return !value?.trim() || normalizeGoogleSheetUrl(value) !== null;
}
