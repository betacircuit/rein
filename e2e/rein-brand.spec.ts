import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the login surface uses the canonical REIN image without substitution", async ({ page }) => {
  await page.goto("/login");

  const logo = page.getByRole("img", { name: "REIN" });
  await expect(logo).toHaveAttribute("src", "/rein-logo.png");
  await expect(logo).toHaveAttribute("width", "871");
  await expect(logo).toHaveAttribute("height", "509");
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((image) => [
      (image as HTMLImageElement).naturalWidth,
      (image as HTMLImageElement).naturalHeight,
    ]),
  ).toEqual([871, 509]);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("the REIN login surface remains usable at phone and landscape widths", async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await expect(page.getByRole("img", { name: "REIN" })).toBeVisible();
    const identity = page.getByRole("button", { name: "최재원" });
    await identity.click();
    await expect(identity).toHaveAttribute("aria-pressed", "true");
    let enteredPin = "";
    for (const digit of ["0", "0", "3", "6"]) {
      await page.getByRole("button", { name: `${digit} 입력` }).click();
      enteredPin += digit;
      await expect(page.getByRole("textbox", { name: "PIN 번호판" })).toHaveValue(enteredPin);
    }
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await page.evaluate(() => document.documentElement.style.setProperty("font-size", "20px"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("the server accepts only the requested four-digit PIN shape", async ({ page }) => {
  await page.goto("/login");
  const identity = page.getByRole("button", { name: "최재원" });
  await identity.click();
  await expect(identity).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("textbox", { name: "PIN 번호판" }).fill("0035");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "이름 또는 PIN이 맞지 않습니다." }),
  ).toBeVisible();

  await page.getByRole("textbox", { name: "PIN 번호판" }).fill("0036");
  await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
});

test("the physical number keys enter the PIN without focusing the field", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "최재원" }).click();
  await page.locator(".rein-login-section-heading").click();
  await page.keyboard.type("0036");
  await expect(page.getByRole("textbox", { name: "PIN 번호" })).toHaveValue("0036");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home$/);
});

test("the desktop login window uses the supplied system background", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 690 });
  await page.goto("/login");

  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toContain(
    "rein-system-background.png",
  );

  await page.getByRole("button", { name: "최재원" }).click();
  await page.getByRole("textbox", { name: "PIN 번호판" }).fill("0035");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "이름 또는 PIN이 맞지 않습니다." }),
  ).toBeVisible();

  const windowBounds = await page.locator(".rein-login-window").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, viewportHeight: window.innerHeight };
  });
  expect(windowBounds.top).toBeGreaterThanOrEqual(0);
  expect(windowBounds.bottom).toBeLessThanOrEqual(windowBounds.viewportHeight);
});
