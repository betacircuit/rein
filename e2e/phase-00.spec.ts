import { expect, type Page, test } from "@playwright/test";

async function startOwnerSession(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("CTX-006 CORE-001 CORE-002 responsive shell", () => {
  test("360px mobile navigation and quick add remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await startOwnerSession(page);
    await page.goto("/home");

    await expect(page.getByRole("heading", { name: /오늘은 이것부터/ })).toBeVisible();
    const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    for (const label of ["홈", "과외", "돈", "우리집", "설정"]) {
      await expect(mobileNav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "빠른 기록 열기" }).click();
    await expect(page.getByRole("dialog", { name: "무엇을 기록할까요?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /공동비 추가/ })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("desktop sidebar exposes all primary routes and keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await startOwnerSession(page);
    await page.goto("/home");

    const navigation = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(navigation).toBeVisible();
    for (const label of ["홈", "과외", "돈", "우리집", "설정"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "본문으로 바로가기" })).toBeFocused();
  });

  test("PWA manifest exposes standalone Korean app metadata", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({ name: "REIN", display: "standalone", lang: "ko-KR" });
  });
});

test("CTX-005 CORE-009 status patterns are interactive and honest", async ({ page }) => {
  await startOwnerSession(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "오류" }).click();
  await expect(page.getByText("내용을 불러오지 못했어요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.getByText("아직 기록이 없어요", { exact: true })).toBeVisible();
});
