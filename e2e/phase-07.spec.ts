import { expect, test, type Page } from "@playwright/test";

async function startPhase07Session(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 07 Grow vertical slice", () => {
  test("GROW-001 to GROW-011 plans and records an account transfer without changing total assets", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await startPhase07Session(page, `phase07-grow-${testInfo.project.name}`);
    await page.goto("/money/grow");
    await expect(page.getByRole("heading", { name: "남은 돈을 세 갈래로 나눠요" })).toBeVisible();
    await expect(page.getByText("실제 가용 잉여금", { exact: true })).toBeVisible();
    await expect(page.getByText("계좌에서 실제로 남은 현금 흐름")).toBeVisible();
    const totalBefore = await page.getByText("총자산", { exact: true }).locator("..").textContent();

    await page.locator('select[name="ruleType"]').selectOption("fixed");
    await page.getByLabel("규칙 값 (정액 원 / 비율 %)").fill("100000");
    await page.getByLabel("월 상한(원)").fill("90000");
    await page.getByRole("button", { name: "규칙 저장" }).click();
    await expect(page).toHaveURL(/\/money\/grow\?saved=1$/);
    await expect(page.getByText("장기 기여 계획").locator("..")).toContainText("₩90,000");

    await page.getByLabel("기여 금액").fill("40000");
    await page.getByRole("button", { name: "이체로 완료 기록" }).click();
    await expect(page).toHaveURL(/\/money\/grow\?recorded=1$/);
    await expect(page.getByText("계획 ₩90,000 · 완료 ₩40,000 · 남음 ₩50,000")).toBeVisible();
    await expect(page.getByText("일부 완료", { exact: true })).toBeVisible();
    expect(await page.getByText("총자산", { exact: true }).locator("..").textContent()).toBe(
      totalBefore,
    );
    await expect(page.getByText(/원금 손실이 발생할 수 있습니다/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("DASH-001 to DASH-008 prioritize today's work and aggregate local module state", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await startPhase07Session(page, `phase07-home-${testInfo.project.name}`);
    await page.goto("/home");

    await expect(page.getByRole("heading", { name: /오늘은 이것부터 해요/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "오늘 준비할 수업" })).toBeVisible();
    await expect(page.getByText(/16:30 · 이서연/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "확인이 필요해요" })).toBeVisible();
    await expect(page.getByText("월 예상", { exact: true })).toBeVisible();
    await expect(page.getByText("발생", { exact: true })).toBeVisible();
    await expect(page.getByText("실제 입금", { exact: true })).toBeVisible();
    await expect(page.getByText("아직 받을 돈", { exact: true })).toBeVisible();
    await expect(page.getByText("실제 가용 잉여금", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "운영 요약" }).getByText("우리집", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("CORE-005, TUT-018, MON-019 and SUB-017 expose traceable analytics and dismissible local insights", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await startPhase07Session(page, `phase07-analytics-${testInfo.project.name}`);

    await page.goto("/money/analytics");
    await expect(page.getByRole("heading", { name: "9월 운영 분석" })).toBeVisible();
    await expect(page.getByText("진행 중인 달입니다.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "과외 실질 시간당 수입" })).toBeVisible();
    await expect(page.getByText("수업 + 준비 + 이동 시간을 모두 포함합니다.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "자산 스냅샷" })).toBeVisible();
    await page.getByLabel("조회 월").fill("2026-08");
    await page.getByRole("button", { name: "보기" }).click();
    await expect(page).toHaveURL(/month=2026-08/);
    await expect(page.getByRole("heading", { name: "8월 운영 분석" })).toBeVisible();
    await expect(page.getByText("진행 중인 달입니다.")).toHaveCount(0);
    await expect(page.getByText("선택한 달의 거래가 없어요.")).toBeVisible();

    await page.goto("/money/subscriptions");
    await expect(page.getByRole("heading", { name: "내 기록으로 만든 검토 신호" })).toBeVisible();
    await expect(page.getByText("직접 검토로 표시한 구독이 있어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cloud Note Pro 원본 보기" })).toBeVisible();
    await page.getByRole("button", { name: "이 신호 숨기기" }).click();
    await expect(page.getByText("새로 확인할 검토 신호가 없어요.")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
