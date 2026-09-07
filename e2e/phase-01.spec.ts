import { expect, test } from "@playwright/test";

test.describe("Phase 01 authentication and household boundary", () => {
  test("unauthenticated visitors are redirected to the honest local login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /내 돈과 우리집 사이/ })).toBeVisible();

    await page.goto("/settings/household");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fhousehold$/);
  });

  test("a forged demo cookie cannot pass the secure settings check", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "student_os_demo_session",
        value: "forged-session",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/settings/household");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("owner completes profile, creates household, and leaves roommate invited", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "로컬 데모 시작" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByRole("textbox", { name: "이름", exact: true }).fill("가");
    await page.getByRole("button", { name: "우리집 만들고 초대하기" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "입력 내용을 확인해 주세요" }),
    ).toBeVisible();
    await expect(page.getByText("이름을 두 글자 이상 입력해 주세요.")).toBeVisible();

    await page.getByRole("textbox", { name: "이름", exact: true }).fill("최재원");
    await page.getByRole("button", { name: "우리집 만들고 초대하기" }).click();
    await expect(page).toHaveURL(/\/settings\/household\?onboarded=1$/);
    await expect(page.getByRole("heading", { name: "관악 두 칸 집" })).toBeVisible();
    await expect(page.getByText("소유자", { exact: true })).toBeVisible();
    await expect(page.getByText("초대 중", { exact: true })).toBeVisible();
    await expect(page.getByText("내 계좌와 잔액", { exact: true })).toBeVisible();
  });

  test("matching roommate invitation becomes active without exposing private finance", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("roommate@demo.local");
    await page.getByRole("radio", { name: /초대받아 들어가기/ }).check();
    await page.getByRole("button", { name: "로컬 데모 시작" }).click();

    await expect(page.getByText("초대 이메일과 로그인 계정이 일치할 때만")).toBeVisible();
    await page.getByRole("button", { name: "초대 수락하고 들어가기" }).click();
    await expect(page).toHaveURL(/\/settings\/household\?onboarded=1$/);
    await expect(page.getByText("멤버", { exact: true })).toBeVisible();
    await expect(page.getByText("활성", { exact: true })).toHaveCount(2);
    await expect(page.getByText("개인 거래 원장", { exact: true })).toBeVisible();
    await expect(page.getByText("활성 멤버에게만 공유", { exact: true })).toBeVisible();
  });

  test("a new demo identity cannot reuse the previous identity's onboarding state", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "로컬 데모 시작" }).click();
    await page.getByRole("button", { name: "우리집 만들고 초대하기" }).click();
    await expect(page).toHaveURL(/\/settings\/household\?onboarded=1$/);

    await page.goto("/login");
    await page.getByLabel("이메일").fill("another-owner@demo.local");
    await page.getByRole("button", { name: "로컬 데모 시작" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.goto("/settings/profile");

    await expect(page).toHaveURL(/\/onboarding$/);
  });
});
