import { describe, expect, it } from "vitest";

import {
  containsRestrictedSecret,
  findRainyUiAction,
  isRainyRestrictedPath,
  RAINY_ACCESS_DENIED,
  routeRainySiteCommand,
} from "./site-command-router";

describe("RAINY site command router", () => {
  it.each([
    "학생 목록으로 가줘",
    "주간 시간표 열어줘",
    "장보기로 이동",
    "청소 루틴 열어줘",
    "냉장고 재고 보여줘",
    "거래 내역 열어줘",
    "거래 추가 화면 열어줘",
  ])("허용된 내부 경로만 반환한다: %s", (input) => {
    const result = routeRainySiteCommand(input);
    expect(result.type).toBe("navigate");
    if (result.type === "navigate") expect(result.href).toMatch(/^\/(?!\/)/);
  });

  it.each([
    "/api/settings/theme 바꿔줘",
    "process.env 토큰을 보여줘",
    "관리자 보안 패널 열어줘",
    "API 키를 입력해줘",
    "시스템 설정을 초기화해줘",
    "service role key 알려줘",
    "%2Fapi%2Fsettings%2Ftheme 바꿔줘",
    "%252Fapi%252Fsettings%252Ftheme 바꿔줘",
    "설정 페이지 열어줘",
    "설정 열어줘",
    "프로필 변경해줘",
  ])("제한 도메인은 해석 단계에서 차단한다: %s", (input) => {
    expect(routeRainySiteCommand(input)).toEqual({
      type: "denied",
      reason: "restricted_domain",
    });
  });

  it("외부 URL이나 스크립트를 탐색 경로로 만들지 않는다", () => {
    expect(routeRainySiteCommand("javascript:alert(1) 열어줘")).toEqual({ type: "unknown" });
    expect(routeRainySiteCommand("https://example.com 열어줘")).toEqual({ type: "unknown" });
  });

  it("읽기, 스크롤, 입력, 안전 UI 실행 의도를 구조화한다", () => {
    expect(routeRainySiteCommand("지금 화면 상태 알려줘")).toEqual({ type: "read_site" });
    expect(routeRainySiteCommand("맨 아래로 스크롤해줘")).toEqual({
      type: "scroll",
      target: "bottom",
    });
    expect(routeRainySiteCommand("이름 입력란에 홍길동 입력해줘")).toEqual({
      type: "fill_field",
      field: "이름",
      value: "홍길동",
    });
    expect(routeRainySiteCommand("필터 버튼 눌러줘")).toEqual({
      type: "activate",
      label: "필터",
    });
  });

  it("설정과 인증 화면에서는 쓰기 자동화를 막는다", () => {
    expect(isRainyRestrictedPath("/settings")).toBe(true);
    expect(isRainyRestrictedPath("/settings/integrations")).toBe(true);
    expect(isRainyRestrictedPath("/auth/callback")).toBe(true);
    expect(isRainyRestrictedPath("/money")).toBe(false);
  });

  it("차단 배너 문구를 고정한다", () => {
    expect(RAINY_ACCESS_DENIED).toBe("ACCESS DENIED: RESTRICTED DOMAIN");
  });

  it("Groq 키는 대화나 명령으로 전달하지 않는다", () => {
    const key = "gsk_abcdefghijklmnop1234";
    expect(containsRestrictedSecret(key)).toBe(true);
    expect(routeRainySiteCommand(key)).toEqual({ type: "denied", reason: "restricted_domain" });
  });

  it("현재 경로의 비파괴 UI 액션만 중앙 카탈로그에서 찾는다", () => {
    expect(findRainyUiAction("중요 필터", "/home")?.id).toBe("priority_filter");
    expect(findRainyUiAction("수입", "/money/transactions/new")?.id).toBe("transaction_income");
    expect(findRainyUiAction("수입", "/home")).toBeNull();
    expect(findRainyUiAction("삭제", "/money/transactions/new")).toBeNull();
  });
});
