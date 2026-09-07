import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function startSharedMoneySession(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 06 shared household money", () => {
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

  test("MON-016 and HOM-013 show cash payer, burden, every category, and exact source rows", async ({
    page,
  }, testInfo) => {
    await startSharedMoneySession(page, `phase06-overview-${testInfo.project.name}`);
    await page.goto("/household/expenses");

    await expect(
      page.getByRole("heading", { name: "낸 사람과 부담할 사람을 따로 기록해요" }),
    ).toBeVisible();
    await expect(page.getByText("₩780,000", { exact: true })).toBeVisible();
    await expect(page.getByText("₩390,000", { exact: true })).toBeVisible();
    await expect(page.getByText("₩310,000", { exact: true })).toBeVisible();
    for (const category of [
      "월세",
      "관리비",
      "전기",
      "가스",
      "수도",
      "인터넷",
      "생활용품",
      "공동 식재료",
      "구독",
      "기타",
    ]) {
      await expect(page.getByText(category, { exact: true }).first()).toBeVisible();
    }

    await page.getByRole("link", { name: /9월 월세/ }).click();
    await expect(page.getByText("결제 나")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "확정 분담" }).getByText("₩350,000", { exact: true }),
    ).toHaveCount(2);
    await expect(page.getByText(/내 거래 원장과 한 번만 연결됨/)).toBeVisible();
  });

  test("HOM-014 and HOM-015 edit payer independently with an every-KRW custom percentage split", async ({
    page,
  }, testInfo) => {
    await startSharedMoneySession(page, `phase06-split-${testInfo.project.name}`);
    await page.goto("/household/expenses/new");
    await page.getByLabel("내용 *").fill("전기료 조정");
    await page.getByLabel("분류 *").selectOption("electricity");
    await page.getByLabel("총액(원) *").fill("30001");
    await page.getByLabel("실제 결제자 *").selectOption("member-roommate");
    await page.getByText("비율 직접", { exact: true }).click();
    await page.getByLabel("내 부담 비율(%)").fill("33.33");
    await page.getByLabel("민수 부담 비율(%)").fill("66.67");
    await expect(page.getByText("₩9,999", { exact: true })).toBeVisible();
    await expect(page.getByText("₩20,002", { exact: true })).toBeVisible();
    await expect(page.getByText("합계가 총액과 정확히 일치합니다.")).toBeVisible();
    await page.getByRole("button", { name: "공동비 저장" }).click();
    await expect(page).toHaveURL(/\/household\/expenses\/.+\?saved=1$/);
    await expect(page.getByText("결제 민수")).toBeVisible();

    await page.getByLabel("실제 결제자 *").selectOption("member-owner");
    await page.getByRole("button", { name: "공동비 저장" }).click();
    await expect(page.getByText("결제 나")).toBeVisible();
    await expect(page.getByText("₩9,999", { exact: true })).toHaveCount(2);
    await expect(page.getByText("₩20,002", { exact: true })).toHaveCount(2);
  });

  test("HOM-017 confirms a suggested roommate deposit as a partial settlement", async ({
    page,
  }, testInfo) => {
    await startSharedMoneySession(page, `phase06-settlement-${testInfo.project.name}`);
    await page.goto("/household/settlements");
    await expect(page.getByText("₩310,000", { exact: true })).toBeVisible();
    await expect(page.getByText(/민수 · ₩200,000/)).toBeVisible();
    await expect(page.getByText(/확정 전에는 정산 상태가 바뀌지 않습니다/)).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "₩200,000 연결 확정" }).click();
    await expect(page).toHaveURL(/\/household\/settlements\?matched=1$/);
    await expect(page.getByText("₩110,000", { exact: true })).toBeVisible();
    await expect(page.getByText("일부 입금")).toBeVisible();
    await expect(page.getByText("입금 ₩200,000 · 남음 ₩110,000")).toBeVisible();
    await expect(page.getByText("9월 월세 정산")).toHaveCount(0);

    await page.goto("/money/grow");
    await expect(
      page.getByRole("heading", { name: "공동비를 내 몫만큼 반영한 잔여" }),
    ).toBeVisible();
    await expect(page.getByText("확인된 정산 입금")).toBeVisible();
    await expect(page.getByText("₩200,000", { exact: true })).toBeVisible();
  });

  test("HOM-019 creates a shared source only after classification confirmation", async ({
    page,
  }, testInfo) => {
    await startSharedMoneySession(page, `phase06-classify-${testInfo.project.name}`);
    await page.goto("/household/expenses");
    const utility = page.locator("form").filter({ hasText: "서울전력" });
    await expect(utility).toBeVisible();
    await expect(page.getByRole("link", { name: /서울전력/ })).toHaveCount(0);
    await utility.getByLabel("서울전력 분류").selectOption("utility");
    page.once("dialog", (dialog) => dialog.accept());
    await utility.getByRole("button", { name: "분류 확정" }).click();
    await expect(page).toHaveURL(/classified=utility/);
    await expect(page.getByText("거래를 확인하고 공동비 원천 행에 연결했어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: /서울전력/ })).toBeVisible();
    await expect(page.getByText("₩834,321", { exact: true })).toBeVisible();

    const personal = page.locator("form").filter({ hasText: "학생식당" });
    await personal.getByLabel("학생식당 분류").selectOption("personal");
    page.once("dialog", (dialog) => dialog.accept());
    await personal.getByRole("button", { name: "분류 확정" }).click();
    await expect(
      page.getByText("개인 지출로 확인했어요. 공동비는 만들지 않았습니다."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /학생식당/ })).toHaveCount(0);
  });

  test("shared money form and settlement rail reflow on phone, landscape, reduced motion, and larger text", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startSharedMoneySession(page, `phase06-layout-${testInfo.project.name}`);
    await page.goto("/household/expenses/new");
    await expect(page.getByRole("group", { name: "경제적 부담 나누기" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 812, height: 375 });
    await page.addStyleTag({ content: "html { font-size: 125%; }" });
    await page.goto("/household/settlements");
    await expect(page.getByRole("button", { name: "₩200,000 연결 확정" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
  });
});
