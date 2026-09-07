import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function startMoneySession(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 03 money and receivables", () => {
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

  test("overview separates transfers and unpaid tutoring from cash flow", async ({
    page,
  }, testInfo) => {
    await startMoneySession(page, `phase03-overview-${testInfo.project.name}`);
    await page.goto("/money");

    await expect(
      page.getByRole("heading", { name: "움직인 돈과 받을 돈을 분리해요" }),
    ).toBeVisible();
    await expect(page.getByText("₩4,941,430", { exact: true })).toBeVisible();
    await expect(page.getByText("₩60,000", { exact: true })).toBeVisible();
    await expect(page.getByText("₩42,001", { exact: true })).toBeVisible();
    await expect(page.getByText("₩20,000", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("이체는 이동일 뿐")).toBeVisible();
  });

  test("manual transaction can be created, edited, and deleted", async ({ page }, testInfo) => {
    await startMoneySession(page, `phase03-crud-${testInfo.project.name}`);
    await page.goto("/money/transactions/new?kind=expense");

    await expect(page.getByLabel("종류")).toHaveValue("expense");
    await page.getByLabel("금액(원)").fill("8900");
    await page.getByLabel("거래 상대").fill("동네 서점");
    await page.getByLabel("표시 내용").fill("문제집");
    await page.getByRole("button", { name: "거래 저장" }).click();
    await expect(page).toHaveURL(/\/money\/transactions\/.+\?saved=1$/);
    await expect(page.getByRole("heading", { name: "동네 서점" })).toBeVisible();

    await page.getByRole("link", { name: "수정" }).click();
    await page.getByLabel("금액(원)").fill("9900");
    await page.getByRole("button", { name: "거래 저장" }).click();
    await expect(page.getByText("−₩9,900", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/\/money\/transactions\?deleted=1$/);
    await expect(page.getByText("거래를 삭제했어요.")).toBeVisible();
  });

  test("match evidence stays inert until explicit confirmation", async ({ page }, testInfo) => {
    await startMoneySession(page, `phase03-match-${testInfo.project.name}`);
    await page.goto("/money/matches");

    await expect(page.getByText("신뢰도 100%")).toBeVisible();
    await expect(page.getByText("남은 금액과 일치")).toBeVisible();
    await expect(page.getByText("입금자 별칭과 일치")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "확정" }).click();
    await expect(page.getByText("검토할 제안이 없어요.")).toBeVisible();
    await page.goto("/money/receivables");
    await expect(page.getByText("입금 완료", { exact: true })).toBeVisible();
    await expect(page.getByText("₩0", { exact: true })).toBeVisible();
  });

  test("CSV preview sanitizes cells and repeated import is idempotent", async ({
    page,
  }, testInfo) => {
    await startMoneySession(page, `phase03-csv-${testInfo.project.name}`);
    const csv = [
      "occurred_at,direction,amount,counterparty,descriptor",
      '2026-09-21T12:00:00+09:00,outflow,4500,=HYPERLINK("bad"),간식',
    ].join("\n");
    await page.goto("/money/import");
    await page
      .getByLabel("CSV 파일")
      .setInputFiles({ name: "money.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: "미리보기" }).click();
    await expect(page.getByText("'=HYPERLINK(bad)", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "중복 제외하고 가져오기" }).click();
    await expect(page).toHaveURL(/\/money\/transactions\?imported=1$/);

    await page.goto("/money/import");
    await page
      .getByLabel("CSV 파일")
      .setInputFiles({ name: "money.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: "미리보기" }).click();
    await expect(page.getByText("중복 제외", { exact: true })).toBeVisible();
  });

  test("custom categories are managed in settings and available to transactions", async ({
    page,
  }, testInfo) => {
    await startMoneySession(page, `phase03-category-${testInfo.project.name}`);
    await page.goto("/settings/money");
    await page.getByLabel("종류").selectOption("income");
    await page.getByLabel("분류 이름").fill("공모전 상금");
    await page.getByRole("button", { name: "내 분류 추가" }).click();
    await expect(page.getByText("내 분류를 추가했어요.")).toBeVisible();
    await expect(page.getByText("공모전 상금", { exact: true })).toBeVisible();

    await page.goto("/money/transactions/new?kind=income");
    await expect(page.getByLabel("분류").getByRole("option", { name: "공모전 상금" })).toHaveCount(
      1,
    );
  });

  test("money remains usable in landscape with reduced motion and larger text", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startMoneySession(page, `phase03-layout-${testInfo.project.name}`);
    await page.goto("/money");
    await page.addStyleTag({ content: "html { font-size: 125%; }" });

    await expect(page.getByRole("navigation", { name: "돈 보조 메뉴" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("link", { name: "수입", exact: true })).toBeVisible();
  });
});
