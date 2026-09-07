import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function startSubscriptionSession(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 04 subscriptions", () => {
  test.beforeEach(({ page }) => {
    const errors: string[] = [];
    browserErrors.set(page, errors);
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
  });

  test.afterEach(({ page }) => {
    expect(browserErrors.get(page) ?? []).toEqual([]);
  });

  test("dashboard separates normalized totals, occurrence forecast, and filters", async ({
    page,
  }, testInfo) => {
    await startSubscriptionSession(page, `phase04-dashboard-${testInfo.project.name}`);
    await page.goto("/money/subscriptions");

    await expect(
      page.getByRole("heading", { name: "갱신 전에 보고, 결제 뒤에 확인해요" }),
    ).toBeVisible();
    await expect(page.getByText("₩60,901", { exact: true })).toBeVisible();
    await expect(page.getByText("7일 안에 갱신")).toBeVisible();
    await expect(page.getByText("체험 종료 1건")).toBeVisible();
    await page.getByRole("link", { name: /7일 안에 갱신/ }).click();
    await expect(page).toHaveURL(/view=due7/);
    await expect(page.getByRole("heading", { name: "Campus Net" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloud Note Pro" })).toHaveCount(0);

    await page.getByRole("link", { name: "청구 일정" }).click();
    await page.getByLabel("기간").selectOption("7");
    await page.getByRole("button", { name: "보기" }).click();
    await expect(page.getByRole("heading", { name: "Campus Net" })).toBeVisible();
  });

  test("subscription can be created and an effective price history appended", async ({
    page,
  }, testInfo) => {
    await startSubscriptionSession(page, `phase04-crud-${testInfo.project.name}`);
    await page.goto("/money/subscriptions/new");

    await page.getByLabel("구독 이름 *").fill("Study Music");
    await page.getByLabel("제공사").fill("Study Sound");
    await page.getByLabel("요금제").fill("Student Plus");
    await page.getByLabel("금액(원) *").fill("15000");
    await page.getByLabel("시작일 *").fill("2026-09-02");
    await page.getByLabel("청구 기준일 *").fill("2026-09-15");
    await page.getByLabel("다음 결제일 *").fill("2026-09-15");
    await page.getByLabel("거래명 패턴").fill("STUDY SOUND");
    await page.getByRole("button", { name: "구독 저장" }).click();
    await expect(page).toHaveURL(/\/money\/subscriptions\/.+\?saved=1$/);
    await expect(page.getByRole("heading", { name: "Study Music" })).toBeVisible();
    await expect(page.getByText("₩15,000", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "수정" }).click();
    await page.getByLabel("금액(원) *").fill("17000");
    await page.getByLabel("새 가격 적용일").fill("2026-10-15");
    await page.getByLabel("가격 변경 메모").fill("학생 할인 종료");
    await page.getByRole("button", { name: "구독 저장" }).click();
    await expect(page.getByText("₩17,000", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("학생 할인 종료")).toBeVisible();
    await expect(page.getByText("₩15,000", { exact: true }).first()).toBeVisible();
  });

  test("matching remains inert until confirmation and creates one household expense", async ({
    page,
  }, testInfo) => {
    await startSubscriptionSession(page, `phase04-match-${testInfo.project.name}`);
    await page.goto("/money/subscriptions/matches");

    await expect(page.getByText("신뢰도 100%")).toBeVisible();
    await expect(page.getByText("예상 금액과 일치").first()).toBeVisible();
    await expect(page.getByText("거래명 패턴과 일치").first()).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "확정" }).click();
    await expect(page.getByText("검토할 구독 매칭이 없어요.")).toBeVisible();

    await page.goto("/money/subscriptions/subscription-campus-net");
    await expect(page.getByRole("link", { name: "실제 거래" })).toHaveCount(1);
    await expect(page.getByText("공동지출 1건")).toHaveCount(1);
    await expect(page.getByText("50%")).toHaveCount(2);
    await page.getByRole("link", { name: "실제 거래" }).click();
    await expect(page.getByRole("heading", { name: "Campus Net" })).toBeVisible();
  });

  test("manual keep review records only user-entered last-used evidence", async ({
    page,
  }, testInfo) => {
    await startSubscriptionSession(page, `phase04-review-${testInfo.project.name}`);
    await page.goto("/money/subscriptions/review");
    const form = page.locator("form").filter({ hasText: "Cloud Note Pro" });

    await form.locator('select[name="decision"]').selectOption("cancel_candidate");
    await form.locator('input[name="lastUsedOn"]').fill("2026-08-28");
    await form.locator('textarea[name="decisionNote"]').fill("체험 뒤 사용 빈도를 직접 검토함");
    await form.getByRole("button", { name: "판단 저장" }).click();
    await expect(form.locator("span", { hasText: /^해지 후보$/ })).toBeVisible();
    await expect(page.getByText("앱이 실제 사용을 관찰했다고 주장하지 않아요.")).toBeVisible();
  });

  test("subscription flow reflows on small phone and landscape with reduced motion", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startSubscriptionSession(page, `phase04-layout-${testInfo.project.name}`);
    await page.goto("/money/subscriptions");
    await expect(page.getByRole("navigation", { name: "구독 메뉴" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 812, height: 375 });
    await page.addStyleTag({ content: "html { font-size: 125%; }" });
    await expect(page.getByRole("link", { name: "구독 추가" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
  });
});
