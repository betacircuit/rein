import { expect, test } from "@playwright/test";

test("owner money flow, asset target, and student income controls", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "최재원" }).click();
  await page.locator("#password").fill("0036");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/home/);

  await expect(page.getByText("전체 자산 목표")).toBeVisible();
  await expect(page.getByText("₩100,000,000")).toBeVisible();
  await expect(page.getByText("최신 현금흐름 3개")).toBeVisible();
  await expect(page.getByText("활성 학생")).toHaveCount(0);
  await expect(page.locator(".rein-home-center__links")).toHaveCount(0);

  await page.goto("/money");
  await expect(page.locator(".rein-bank-card")).toHaveCount(3);
  await expect(page.locator(".rein-bank-card").nth(0)).toContainText("KB국민은행");
  await expect(page.locator(".rein-bank-card").nth(1)).toContainText("카카오뱅크");
  await expect(page.locator(".rein-bank-card").nth(2)).toContainText("우리은행");
  await expect(page.locator(".rein-bank-card").filter({ hasText: "준비됨" })).toHaveCount(3);
  await expect(page.locator(".rein-bank-card").nth(0)).toContainText("잔액");
  await expect(page.locator(".rein-bank-card").nth(0)).toContainText("수입");
  await expect(page.locator(".rein-bank-card").nth(0)).toContainText("지출");
  await expect(page.getByLabel("기본 자금 이동 구조")).toContainText("KB국민카카오뱅크우리은행");
  if ((testInfo.project.use.viewport?.width ?? 1280) >= 1024) {
    await expect(page.locator(".rainy-rail__brand-art")).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: "RAINY 채팅 열기" })).toBeVisible();
  }

  await page.goto("/money/transactions/new?kind=income");
  await expect(page.getByLabel("학생")).toBeVisible();
  await expect(page.getByText("저장 버튼을 누른 시각")).toBeVisible();
  await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
});
