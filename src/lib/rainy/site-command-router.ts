export const RAINY_ACCESS_DENIED = "ACCESS DENIED: RESTRICTED DOMAIN";

export type RainySiteCommand =
  | { type: "denied"; reason: "restricted_domain" }
  | { type: "navigate"; href: string; label: string }
  | { type: "read_site" }
  | { type: "scroll"; target: "top" | "bottom" | "form" | "section"; query?: string }
  | { type: "fill_field"; field: string; value: string }
  | { type: "activate"; label: string }
  | { type: "unknown" };

type RouteEntry = { href: string; label: string; aliases: readonly string[] };
export type RainyUiAction = {
  id: string;
  label: string;
  aliases: readonly string[];
  pathPrefixes: readonly string[];
  selector: string;
};

export const RAINY_ALLOWED_ROUTES: readonly RouteEntry[] = [
  { href: "/home", label: "오늘", aliases: ["오늘", "홈", "메인"] },
  { href: "/tutoring/students/new", label: "학생 추가", aliases: ["학생 추가", "새 학생"] },
  { href: "/tutoring/students", label: "학생", aliases: ["학생 목록", "학생"] },
  { href: "/tutoring/schedule", label: "시간표", aliases: ["주간 시간표", "시간표", "수업 일정"] },
  {
    href: "/money/transactions/new",
    label: "거래 추가",
    aliases: ["거래 추가", "거래 입력", "수입 입력", "지출 입력"],
  },
  {
    href: "/money/transactions",
    label: "거래 내역",
    aliases: ["거래 내역", "자동 거래", "거래 수정", "장부 내역"],
  },
  { href: "/money/subscriptions", label: "구독", aliases: ["구독"] },
  { href: "/money", label: "수입·지출", aliases: ["수입 지출", "수입·지출", "재정", "돈"] },
  {
    href: "/household/shopping",
    label: "장보기",
    aliases: ["장보기", "쇼핑 목록", "구매 목록"],
  },
  {
    href: "/household/cleaning",
    label: "청소 루틴",
    aliases: ["청소", "청소 루틴", "화장실 청소"],
  },
  {
    href: "/household/inventory",
    label: "냉장고 재고",
    aliases: ["냉장고", "냉장고 재고", "식재료", "재고"],
  },
  {
    href: "/household/expenses/new",
    label: "공동비 추가",
    aliases: ["공동비 추가", "공동 지출", "집 지출"],
  },
  { href: "/household", label: "집", aliases: ["우리집", "집", "가계"] },
] as const;

export const RAINY_UI_ACTIONS: readonly RainyUiAction[] = [
  {
    id: "priority_filter",
    label: "중요 할 일 필터",
    aliases: ["중요 할 일 필터", "중요한 일만 보기", "중요 필터"],
    pathPrefixes: ["/"],
    selector: '[data-rainy-action="priority-filter"]',
  },
  {
    id: "transaction_income",
    label: "수입 전환",
    aliases: ["수입 전환", "수입 선택", "수입"],
    pathPrefixes: ["/money/transactions/new", "/money/transactions"],
    selector: '[data-rainy-action="transaction-income"]',
  },
  {
    id: "transaction_expense",
    label: "지출 전환",
    aliases: ["지출 전환", "지출 선택", "지출"],
    pathPrefixes: ["/money/transactions/new", "/money/transactions"],
    selector: '[data-rainy-action="transaction-expense"]',
  },
] as const;

const restrictedDomainPatterns = [
  /(?:\/|\b)api\s*\/\s*settings(?:\/|\b)/i,
  /(?:\/|\b)api\s*\//i,
  /(?:환경\s*변수|시스템\s*토큰|환경\s*토큰|접근\s*토큰|인증\s*토큰)/i,
  /(?:api|service[\s_-]*role|secret|private)[\s_-]*(?:key|token)/i,
  /(?:api\s*키|비밀\s*키|시크릿|서비스\s*롤)/i,
  /(?:관리자|어드민|admin).*(?:보안|권한|패널|설정|계정)/i,
  /(?:보안|권한).*(?:패널|설정|변경|수정|해제)/i,
  /(?:핵심|코어|시스템).*(?:설정|구성).*(?:변경|수정|삭제|초기화)/i,
  /(?:\.env|process\.env|localStorage\s*토큰)/i,
  /(?:설정\s*(?:페이지|화면)|\/settings)\s*(?:으로|로)?\s*(?:가\s*줘|가자|이동해?\s*줘?|열어\s*줘?|보여\s*줘?|접근해?\s*줘?)/i,
  /(?:^|\s)설정(?:\s*페이지)?\s*(?:열어|보여|이동|가\s*줘|바꿔|변경|수정)/i,
  /(?:알림|프로필|연동|통합|데이터)\s*(?:설정)?\s*(?:바꿔|변경|수정|삭제|초기화)/i,
] as const;

const navigationVerb = /(?:가\s*줘|이동|열어\s*줘|보여\s*줘|들어가|navigate|open)/i;

export function containsRestrictedSecret(input: string) {
  return /\bgsk_[A-Za-z0-9_-]{16,}\b/.test(input) || /Bearer\s+[A-Za-z0-9._~-]{16,}/i.test(input);
}

export function isRainyRestrictedRequest(input: string) {
  const inputToCheck = normalize(input);
  return (
    containsRestrictedSecret(inputToCheck) ||
    restrictedDomainPatterns.some((pattern) => pattern.test(inputToCheck))
  );
}

export function isRainyRestrictedPath(pathname: string) {
  return /^(?:\/settings(?:\/|$)|\/auth(?:\/|$)|\/login(?:\/|$)|\/onboarding(?:\/|$))/.test(
    pathname,
  );
}

export function findRainyUiAction(label: string, pathname: string) {
  const query = normalize(label.replace(/\s*버튼$/, "")).toLocaleLowerCase("ko-KR");
  const matches = RAINY_UI_ACTIONS.filter(
    (action) =>
      action.pathPrefixes.some((prefix) => pathname.startsWith(prefix)) &&
      action.aliases.some((alias) => {
        const normalizedAlias = normalize(alias).toLocaleLowerCase("ko-KR");
        return (
          normalizedAlias === query ||
          normalizedAlias.includes(query) ||
          query.includes(normalizedAlias)
        );
      }),
  );
  return matches.length === 1 ? matches[0] : null;
}

function normalize(input: string) {
  let decoded = input;
  for (let round = 0; round < 3; round += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded
    .normalize("NFKC")
    .replace(/[\\∕⁄]/g, "/")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNavigation(input: string): RainySiteCommand | null {
  if (!navigationVerb.test(input)) return null;
  for (const route of RAINY_ALLOWED_ROUTES) {
    if (route.aliases.some((alias) => input.includes(alias))) {
      return { type: "navigate", href: route.href, label: route.label };
    }
  }
  return null;
}

function trimFieldName(value: string) {
  return value
    .replace(/^(?:그|현재)\s+/, "")
    .replace(/(?:입력란|필드|칸)$/i, "")
    .trim();
}

export function routeRainySiteCommand(rawInput: string): RainySiteCommand {
  const input = normalize(rawInput);
  if (!input) return { type: "unknown" };
  if (isRainyRestrictedRequest(input)) return { type: "denied", reason: "restricted_domain" };

  const navigation = parseNavigation(input);
  if (navigation) return navigation;

  if (/(?:지금|현재).*(?:페이지|화면|상태)|(?:페이지|화면).*(?:읽어|요약|알려)/i.test(input)) {
    return { type: "read_site" };
  }

  if (/(?:맨\s*)?(?:위|상단)(?:로)?\s*(?:올려|가|스크롤)/i.test(input)) {
    return { type: "scroll", target: "top" };
  }
  if (/(?:맨\s*)?(?:아래|하단)(?:로)?\s*(?:내려|가|스크롤)/i.test(input)) {
    return { type: "scroll", target: "bottom" };
  }
  if (/(?:폼|양식|입력란)(?:으로|까지)?\s*(?:가|이동|스크롤|보여)/i.test(input)) {
    return { type: "scroll", target: "form" };
  }
  const sectionMatch = input.match(
    /(.{1,30}?)(?:\s*섹션|\s*영역)(?:으로|까지)?\s*(?:가|이동|스크롤|보여)/i,
  );
  if (sectionMatch?.[1]) {
    return { type: "scroll", target: "section", query: sectionMatch[1].trim() };
  }

  const fillMatch = input.match(
    /(.{1,28}?)(?:\s*입력란|\s*필드|\s*칸)?(?:에|에는)\s*["']?(.{1,100}?)["']?\s*(?:입력|써\s*줘|적어\s*줘|채워)(?:\s*줘|해\s*줘)?[.!]?$/i,
  );
  if (fillMatch?.[1] && fillMatch[2]) {
    const field = trimFieldName(fillMatch[1]);
    const value = fillMatch[2].trim();
    if (field && value) return { type: "fill_field", field, value };
  }

  const activateMatch = input.match(
    /(.{1,32}?)(?:\s*버튼)?(?:을|를)?\s*(?:눌러|클릭|실행)(?:\s*줘|해\s*줘)?[.!]?$/i,
  );
  if (activateMatch?.[1]) {
    return { type: "activate", label: activateMatch[1].trim() };
  }

  return { type: "unknown" };
}
