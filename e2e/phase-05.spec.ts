import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function startHouseholdSession(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 05 household operations", () => {
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

  test("overview reconciles household costs and links alert cards", async ({ page }, testInfo) => {
    await startHouseholdSession(page, `phase05-overview-${testInfo.project.name}`);
    await page.goto("/household");

    await expect(
      page.getByRole("heading", { name: "둘이 사는 집은, 상태만 같이 봐도 가벼워져요" }),
    ).toBeVisible();
    await expect(page.getByText("₩780,000", { exact: true })).toBeVisible();
    await expect(page.getByText("₩390,000", { exact: true })).toBeVisible();
    await expect(page.getByText("받을 정산 ₩310,000", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "합계의 원천 행" })).toBeVisible();
    await page.getByRole("link", { name: /부족 재고 1개/ }).click();
    await expect(page).toHaveURL(/\/household\/inventory\?stock=low/);
    await expect(page.getByRole("heading", { name: "닭가슴살" })).toBeVisible();
  });

  test("inventory fixtures split Monster storage and low stock links once to shopping", async ({
    page,
  }, testInfo) => {
    await startHouseholdSession(page, `phase05-inventory-${testInfo.project.name}`);
    await page.goto("/household/inventory");

    await expect(page.getByRole("heading", { name: "닭가슴살" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "몬스터 에너지 · 차갑게" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "몬스터 에너지 · 여분" })).toBeVisible();

    const chicken = page.locator("article").filter({ hasText: "닭가슴살" });
    await chicken.getByRole("button", { name: "닭가슴살 1 줄이기" }).click();
    await expect(chicken.getByText("1 개", { exact: true })).toBeVisible();
    await chicken.getByRole("button", { name: "장보기에 추가" }).click();
    await expect(chicken.getByRole("button", { name: "장보기에 있음" })).toBeDisabled();
    await page.getByRole("link", { name: "장보기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "닭가슴살" })).toBeVisible();

    await page.goto("/household/inventory?storage=room_temperature");
    await expect(page.getByRole("heading", { name: "몬스터 에너지 · 여분" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "몬스터 에너지 · 차갑게" })).toHaveCount(0);
  });

  test("inventory create and edit preserve every operational field and audit quantity", async ({
    page,
  }, testInfo) => {
    await startHouseholdSession(page, `phase05-inventory-crud-${testInfo.project.name}`);
    await page.goto("/household/inventory/new");

    await page.getByLabel("이름 *").fill("냉동 만두");
    await page.getByLabel("수량 *").fill("1.5");
    await page.getByLabel("단위 *").fill("봉");
    await page.getByLabel("소유 *").selectOption("member-roommate");
    await page.getByLabel("보관 위치 *").selectOption("frozen");
    await page.getByLabel("소비기한").fill("2026-12-31");
    await page.getByLabel("부족 기준").fill("0.5");
    await page.getByLabel("메모").fill("야식용");
    await page.getByRole("button", { name: "재고 저장" }).click();
    await expect(page).toHaveURL(/\/household\/inventory\/.+\?saved=1$/);
    await expect(page.getByRole("heading", { name: "냉동 만두" })).toBeVisible();
    await expect(page.getByText("냉동 · 민수 것")).toBeVisible();
    await expect(page.getByText("1.5 봉", { exact: true })).toBeVisible();

    await page.getByLabel("수량 *").fill("2.5");
    await page.getByRole("button", { name: "재고 저장" }).click();
    await expect(page.getByText("1.5 → 2.5 봉", { exact: true })).toBeVisible();
  });

  test("shopping supports member ownership and links purchase references without copies", async ({
    page,
  }, testInfo) => {
    await startHouseholdSession(page, `phase05-shopping-${testInfo.project.name}`);
    await page.goto("/household/shopping");

    await page.getByLabel("물건 이름 *").fill("룸메이트 우유");
    await page.getByLabel("누구 것인가요? *").selectOption("member-roommate");
    await page.getByLabel("희망 수량").fill("2");
    await page.getByLabel("단위").fill("병");
    await page.getByRole("button", { name: "장보기에 추가" }).click();
    await expect(page.getByRole("heading", { name: "룸메이트 우유" })).toBeVisible();
    const item = page.locator("li").filter({ hasText: "룸메이트 우유" });
    await expect(item.getByText("김태현 것")).toBeVisible();
    await expect(item.getByRole("link", { name: /당근에서 룸메이트 우유 찾기/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    await expect(item.getByRole("link", { name: /쿠팡에서 룸메이트 우유 찾기/ })).toHaveAttribute(
      "href",
      /coupang\.com\/np\/search\?q=/,
    );
    await expect(item.getByRole("link", { name: /알리에서 룸메이트 우유 찾기/ })).toHaveAttribute(
      "rel",
      /noopener/,
    );
    await item.getByText("구매 완료 처리").click();
    await item.getByLabel("거래 ID (선택)").selectOption("transaction-food");
    await item.getByLabel("공동비 ID (선택)").selectOption("shared-expense-management-september");
    await item.getByRole("button", { name: "구매로 표시" }).click();

    await page.getByRole("link", { name: "구매 기록" }).click();
    const purchased = page.locator("li").filter({ hasText: "룸메이트 우유" });
    await expect(purchased.getByText("구매 완료")).toBeVisible();
    await expect(purchased.getByText(/거래 transaction-food/)).toBeVisible();
    await expect(purchased.getByText(/공동비 shared-expense-management-september/)).toBeVisible();
  });

  test("cleaning completion retains actor history and advances due state", async ({
    page,
  }, testInfo) => {
    await startHouseholdSession(page, `phase05-cleaning-${testInfo.project.name}`);
    await page.goto("/household/cleaning?state=due");

    const bathroom = page.locator("article").filter({ hasText: "화장실 청소" });
    await expect(page.locator('[data-priority="highest"]')).toHaveCount(1);
    await expect(bathroom.getByText("최우선", { exact: true })).toBeVisible();
    await expect(bathroom.getByText(/주 1회 · 매주 목요일/)).toBeVisible();
    await expect(bathroom.getByText("기한 도래")).toBeVisible();
    await bathroom.getByLabel("완료 메모 (선택)").fill("배수구까지 완료");
    await bathroom.getByRole("button", { name: "완료 기록" }).click();
    await expect(page.getByRole("heading", { name: "이 상태의 청소가 없어요" })).toBeVisible();

    await page.goto("/household/cleaning?state=ok");
    const completed = page.locator("article").filter({ hasText: "화장실 청소" });
    await expect(completed.getByText("괜찮아요")).toBeVisible();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const nextThursday = new Date(`${today}T00:00:00.000Z`);
    const daysUntilThursday = (4 - nextThursday.getUTCDay() + 7) % 7 || 7;
    nextThursday.setUTCDate(nextThursday.getUTCDate() + daysUntilThursday);
    const nextDue = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(nextThursday);
    await expect(completed.getByText(`다음 ${nextDue}`, { exact: false })).toBeVisible();
    await expect(page.getByText("배수구까지 완료")).toBeVisible();
  });

  test("household tools reflow on phone and landscape with larger text", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startHouseholdSession(page, `phase05-layout-${testInfo.project.name}`);
    await page.goto("/household");
    await expect(page.getByRole("navigation", { name: "우리집 보조 메뉴" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 812, height: 375 });
    await page.addStyleTag({ content: "html { font-size: 125%; }" });
    await page.goto("/household/inventory");
    await expect(page.getByRole("link", { name: "재고 추가" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
  });
});
