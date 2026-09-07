import { expect, test, type Page } from "@playwright/test";

async function startPhase08Session(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test("INT-006, INT-007, MON-010 and SEC-005 keep mock integrations usable and explicit", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await startPhase08Session(page, `phase08-integrations-${testInfo.project.name}`);
  await page.goto("/settings/integrations");

  await expect(
    page.getByRole("heading", { name: "외부 연동의 범위를 먼저 보여 줘요" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Calendar / Meet mock" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "읽기 전용 은행 mock" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실제 은행 API" })).toBeVisible();
  await expect(page.getByText("미연결", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/account_discovery · balance_inquiry · transaction_history/),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "실제 연동은 아직 비활성" })).toBeVisible();
  await expect(page.getByText(/운영 모드는 기관 신청·계약·보안 승인/)).toBeVisible();

  const calendarCard = page.locator("article").filter({ hasText: "Calendar / Meet mock" });
  await calendarCard.getByText("데모 상태 시험").click();
  await calendarCard.getByRole("button", { name: "오래됨 상태" }).click();
  await expect(calendarCard.getByText(/mock · 오래됨/)).toBeVisible();
  await calendarCard.getByRole("button", { name: "데모 갱신" }).click();
  await expect(calendarCard.getByText(/mock · 최신/)).toBeVisible();
  const bankCard = page.locator("article").filter({ hasText: "읽기 전용 은행 mock" });
  await expect(bankCard.getByText("데모 · 연결됨", { exact: true })).toBeVisible();
  await bankCard.getByText("데모 상태 시험").click();
  await bankCard.getByRole("button", { name: "오류 상태" }).click();
  await expect(bankCard.getByText("데모 · 확인 필요", { exact: true })).toBeVisible();
  await expect(bankCard.getByRole("alert")).toContainText("다시 동기화");
  await bankCard.getByRole("button", { name: "데모 갱신" }).click();
  await expect(bankCard.getByText("데모 · 연결됨", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await calendarCard.getByRole("button", { name: "연결 해제" }).click();
  await expect(calendarCard.getByText("데모 · 해제됨", { exact: true })).toBeVisible();
  await calendarCard.getByRole("button", { name: "데모 켜기" }).click();
  await expect(calendarCard.getByText("데모 · 연결됨", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "자격증명 없이 CSV로 가져오기" })).toHaveAttribute(
    "href",
    "/money/transactions/import",
  );
  expect(errors).toEqual([]);
});
