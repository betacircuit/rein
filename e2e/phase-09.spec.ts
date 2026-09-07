import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function startPhase09Session(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test("CORE-006, MON-018, SUB-020 and SEC-009 expose complete honest settings", async ({
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-settings-${testInfo.project.name}`);
  const response = await page.goto("/settings");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  for (const name of [
    "내 프로필",
    "돈 분류",
    "계좌와 카드",
    "과외 기본값",
    "외부 연동",
    "알림 모아보기",
    "내보내기와 삭제",
    "개인정보와 안내",
  ]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await page.getByRole("link", { name: /알림 모아보기/ }).click();
  await expect(page.getByRole("heading", { name: "놓치기 쉬운 일만 모았어요" })).toBeVisible();
  await expect(page.getByText(/푸시와 이메일은 아직 제공하지 않으므로/)).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.goto("/money/accounts/new");
  await page.getByLabel("기관명").fill("수동 카드");
  await page.getByLabel("계좌 별칭").fill("생활 카드");
  await page.getByLabel("종류").selectOption("card");
  await page.getByLabel("현재 잔액").fill("0");
  await page.getByRole("button", { name: "계좌 저장" }).click();
  await expect(page.getByText("카드 · 수동 카드", { exact: true })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByText(/은행, 증권사, 세무사 또는 투자자문사가 아니며/)).toBeVisible();
});

test("UX-001, UX-002, UX-005 and UX-009 keep responsive navigation reachable", async ({
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-navigation-${testInfo.project.name}`);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/home");
  const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(mobileNav).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 바로가기" })).toBeFocused();
  for (const [name, path] of [
    ["과외", "/tutoring"],
    ["돈", "/money"],
    ["우리집", "/household"],
    ["설정", "/settings"],
  ] as const) {
    await mobileNav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();

  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto("/home");
  await expect(mobileNav).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
  await expect(mobileNav).toBeHidden();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("UX-003 conditionally reveals only relevant form fields", async ({ page }, testInfo) => {
  await startPhase09Session(page, `phase09-forms-${testInfo.project.name}`);
  await page.goto("/tutoring/students/new");
  await expect(page.getByLabel(/교과 과목/)).toBeVisible();
  await page.getByLabel(/과외 유형/).selectOption("school_record");
  await expect(page.getByLabel(/교과 과목/)).toBeHidden();

  await page.goto("/money/subscriptions/new");
  await expect(page.getByLabel(/주기 일수/)).toBeHidden();
  await page.getByLabel("청구 주기").selectOption("custom_days");
  await expect(page.getByLabel(/주기 일수/)).toBeVisible();
});

test("UX-004 explains consequences before a destructive mutation", async ({ page }, testInfo) => {
  await startPhase09Session(page, `phase09-confirm-${testInfo.project.name}`);
  await page.goto("/tutoring");
  await page.locator('a[href^="/tutoring/lessons/"]:not([href$="/new"])').first().click();
  await expect(page.getByRole("button", { name: "수업 취소" })).toBeVisible();
  let confirmation = "";
  page.once("dialog", async (dialog) => {
    confirmation = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "수업 취소" }).click();
  await expect.poll(() => confirmation).toContain("수업을 취소");
  await expect(page.getByRole("button", { name: "수업 취소" })).toBeVisible();
});

test("UX-007 and SEC-009 keep analytics textual, qualified, and non-advisory", async ({
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-analytics-${testInfo.project.name}`);
  await page.goto("/money/analytics");
  await expect(page.getByRole("region", { name: "월간 현금 흐름" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "분류별 실제 흐름" })).toBeVisible();
  await expect(page.getByText(/진행 중인 달입니다/)).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.goto("/money/grow");
  await expect(
    page.getByText(/증권 매매를 실행하거나 투자 수익·세무 결과를 보장하지 않습니다/),
  ).toBeVisible();
});

test("UX-009 crawl finds no broken route or inert placeholder control", async ({
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-crawl-${testInfo.project.name}`);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const route of [
    "/home",
    "/tutoring",
    "/tutoring/students",
    "/tutoring/lessons",
    "/money",
    "/money/transactions",
    "/money/subscriptions",
    "/money/grow",
    "/household",
    "/settings",
  ]) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    expect(await page.locator('a[href="#"], a:not([href])').count(), route).toBe(0);
    const unnamedButtons = await page
      .locator("button:visible:not([disabled])")
      .evaluateAll(
        (buttons) =>
          buttons.filter(
            (button) =>
              !(
                button.getAttribute("aria-label") ||
                button.getAttribute("title") ||
                button.textContent
              )?.trim(),
          ).length,
      );
    expect(unnamedButtons, route).toBe(0);
  }
  expect(pageErrors).toEqual([]);
});

test("SEC-008 exports lossless owned data and deletes only after typed confirmation", async ({
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-data-${testInfo.project.name}`);
  await page.goto("/settings/data");
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const response = await page.request.get("/settings/data/export");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-store");
  const exported = (await response.json()) as {
    schema: string;
    ownerReference: string;
    data: { money: { accounts: Array<{ currentBalance: string }> } };
  };
  expect(exported.schema).toBe("rein.local-export.v1");
  expect(exported.ownerReference).toHaveLength(16);
  expect(exported.data.money.accounts[0]?.currentBalance).toMatch(/^\d+$/);

  const deleteButton = page.getByRole("button", { name: "모든 로컬 데이터 삭제" });
  await expect(deleteButton).toBeVisible();
  await page.getByLabel("확인 문구").fill("내 로컬 데이터 삭제");
  await deleteButton.click();
  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  await page.goto("/settings/data");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fdata/);
});

test("UX-008 keeps a recent page readable offline and refuses a financial write", async ({
  context,
  page,
}, testInfo) => {
  await startPhase09Session(page, `phase09-offline-${testInfo.project.name}`);
  await page.goto("/money/transactions/new?kind=expense");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.reload();
  const currentUrl = page.url();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("rein-private-v3");
        return (await cache.keys()).map((request) => request.url);
      }),
    )
    .toContain(currentUrl);
  const cachedPage = await page.evaluate(async (url) => {
    const response = await caches.match(url, { ignoreVary: true });
    return response ? await response.text() : "";
  }, currentUrl);
  expect(cachedPage).toContain("수입·지출 추가");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "수입·지출 추가" })).toBeVisible();
  await expect(page.locator('meta[name="rein-offline-snapshot"]')).toHaveAttribute(
    "content",
    "true",
  );
  await page.getByLabel("금액").fill("1234");
  await page.getByRole("button", { name: "거래 저장" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "오프라인에서는 저장하지 않았어요" }),
  ).toBeVisible();
  await context.setOffline(false);
});
