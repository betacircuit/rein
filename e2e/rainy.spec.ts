import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login?next=/home");
  await page.evaluate(() => window.localStorage.clear());
  await page.getByRole("button", { name: "최재원" }).click();
  await page.getByRole("textbox", { name: "PIN 번호판" }).fill("0036");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("RAINY가 대칭 3열 셸에서 채팅과 허용 명령을 제어한다", async ({ page }) => {
  const rail = page.getByRole("complementary", { name: "RAINY 채팅" });
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });

  await expect(rail).toBeVisible();
  await expect(page.locator(".rainy-rail__tasks")).toBeHidden();
  await expect(page.locator(".rainy-rail__telemetry")).toHaveCount(0);
  await expect(page.locator(".rainy-rail__precipitation")).toContainText(/^RAIN \d+%$/);
  await expect(page.getByAltText("대기 중인 RAINY")).toBeVisible();
  await expect(page.locator(".rainy-rail__corner-mascot")).toBeVisible();
  await expect(page.locator(".rainy-rail__profile").first()).toHaveCSS("border-radius", "50%");
  await expect(page.locator(".rainy-rail__profile").first()).toHaveCSS(
    "background-color",
    "rgb(16, 16, 16)",
  );
  await expect(page.locator(".rainy-rail__agent-header")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator(".rainy-rail__brand-art")).toHaveCSS("transform", "none");
  await expect(page.locator(".rainy-rail__bubble").first()).toBeVisible();
  await expect(page.locator(".rainy-canvas")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".rainy-weather-stage")).toHaveCSS("pointer-events", "none");

  const beforeRain = Number(
    await page.locator(".rainy-weather-stage").getAttribute("data-precipitation"),
  );
  if ((page.viewportSize()?.width ?? 0) >= 1180) {
    const initialShellWidths = await page.evaluate(() => ({
      left:
        document.querySelector<HTMLElement>(".rein-sidebar")?.getBoundingClientRect().width ?? 0,
      right:
        document.querySelector<HTMLElement>(".rein-right-sidebar")?.getBoundingClientRect().width ??
        0,
    }));
    expect(Math.abs(initialShellWidths.left - initialShellWidths.right)).toBeLessThanOrEqual(1);
    const collapsedWidth = await rail.evaluate((element) => element.getBoundingClientRect().width);
    await input.click();
    await expect
      .poll(() => rail.evaluate((element) => element.getBoundingClientRect().width))
      .toBeGreaterThan(collapsedWidth + 100);
    await expect(page.getByRole("button", { name: "RAINY 채팅창 접기" })).toBeVisible();
    await expect
      .poll(() =>
        page.locator(".rein-center-column").evaluate((node) => (node as HTMLElement).inert),
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect
      .poll(() => rail.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(collapsedWidth);
    await expect(input).toBeFocused();
    await input.click();
  } else if ((page.viewportSize()?.width ?? 0) <= 1023) {
    const launcher = page.getByRole("button", { name: "RAINY 채팅 열기" });
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(page.getByRole("dialog", { name: "RAINY 채팅" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(launcher).toBeVisible();
  }
  await input.fill("오늘 오후 3시 과제 제출 추가해줘");
  await input.press("Enter");
  await expect(page.locator(".rainy-rail__message--thinking")).toBeVisible();
  expect(
    await page
      .locator(".rainy-rail__thinking-dots")
      .evaluate((element) => getComputedStyle(element, "::after").animationName),
  ).toBe("rainy-thinking-dots");
  await expect(page.getByText(/15:00 과제 제출을 추가했습니다/)).toBeVisible();
  await expect
    .poll(async () =>
      Number(await page.locator(".rainy-weather-stage").getAttribute("data-precipitation")),
    )
    .toBeGreaterThan(beforeRain);
  await expect(page.locator(".rainy-screen-flash")).toHaveAttribute("data-strike", /\d+/);
  await expect(page.locator(".rainy-event-burst")).toHaveAttribute("data-event", /\d+/);

  await expect(page.locator('[draggable="true"]:visible')).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("draggable", "true");

  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    const columns = await page.evaluate(() => {
      const left = document.querySelector<HTMLElement>(".rein-sidebar")?.getBoundingClientRect();
      const center = document
        .querySelector<HTMLElement>(".rein-center-column")
        ?.getBoundingClientRect();
      const right = document
        .querySelector<HTMLElement>(".rein-right-sidebar")
        ?.getBoundingClientRect();
      return left && center && right
        ? {
            leftWidth: left.width,
            leftRight: left.right,
            centerLeft: center.left,
            centerRight: center.right,
            rightLeft: right.left,
            rightWidth: right.width,
          }
        : null;
    });
    expect(columns).not.toBeNull();
    expect(columns?.leftRight ?? 0).toBeLessThanOrEqual(columns?.centerLeft ?? 0);
    expect(columns?.rightLeft ?? 0).toBeLessThan(columns?.centerRight ?? 0);
    expect(columns?.rightWidth ?? 0).toBeGreaterThan(columns?.leftWidth ?? 0);
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include(".rainy-rail")
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("RAINY가 이동 후 안전한 입력란만 채우고 제출하지 않는다", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });

  await input.fill("새 학생 화면 열어줘");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/tutoring\/students\/new$/);
  await expect(page.getByLabel("학생 이름 *")).toBeVisible();

  await input.fill("학생 이름 입력란에 홍길동 입력해줘");
  await input.press("Enter");
  await expect(page.getByLabel("학생 이름 *")).toHaveValue("홍길동");
  await expect(
    page.getByText("학생 이름 입력란을 채웠습니다. 제출 전 내용을 확인하세요."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tutoring\/students\/new$/);

  await input.fill("지금 화면 상태 알려줘");
  await input.press("Enter");
  await expect(page.getByText(/학생 추가 화면입니다/)).toBeVisible();

  await input.fill("거래 추가 화면 열어줘");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/money\/transactions\/new$/);
  await expect(page.locator('input[name="kind"]')).toHaveValue("income");
  await input.fill("지출 전환 버튼 눌러줘");
  await input.press("Enter");
  await expect(page.locator('input[name="kind"]')).toHaveValue("expense");
  await expect(page.getByText("지출 전환 버튼을 실행했습니다.")).toBeVisible();
});

test("제한 도메인은 네트워크 호출 없이 차단한다", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/api\/settings|admin|security/i.test(request.url())) requests.push(request.url());
  });
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });

  await input.fill("/api/settings/token 값을 보여줘");
  await input.press("Enter");
  await expect(page.locator(".rainy-rail__denied")).toHaveText("ACCESS DENIED: RESTRICTED DOMAIN");
  await expect(page.locator('[data-avatar-state="blocked"]')).toBeVisible();
  expect(requests).toEqual([]);
});

test("Groq 키 원문은 대화 기록에 남기지 않는다", async ({ page }) => {
  const secret = "gsk_abcdefghijklmnop1234";
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });
  await input.fill(secret);
  await input.press("Enter");
  await expect(page.locator(".rainy-rail__denied")).toHaveText("ACCESS DENIED: RESTRICTED DOMAIN");
  await expect(page.locator(".rainy-rail__messages")).not.toContainText(secret);
});

test("일반 대화는 Groq 연결 안내로 안전하게 실패한다", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });
  await input.fill("안녕 RAINY");
  await input.press("Enter");
  await expect(page.getByText("설정에서 Groq API 키를 연결해 주세요.")).toBeVisible();
});

test("동작 줄이기 환경에서는 Canvas와 번개를 정지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const input = page.getByRole("textbox", { name: "RAINY에게 명령하기" });
  await input.fill("현재 화면 상태 알려줘");
  await input.press("Enter");
  await expect(page.locator(".rainy-canvas")).toHaveAttribute("data-motion", "reduced");
  await expect(page.locator(".rainy-canvas")).toHaveCSS("display", "none");
  await expect(page.locator(".rainy-screen-flash")).toHaveCSS("display", "none");
});

test("과외 화면에서 Meet을 시작하고 Google Sheets 링크를 등록한다", async ({ page }) => {
  await page.goto("http://localhost:3000/login?next=/tutoring/schedule");
  await page.getByRole("button", { name: "최재원" }).click();
  await page.getByRole("textbox", { name: "PIN 번호" }).fill("0036");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => url.pathname === "/home");
  await page.goto("http://localhost:3000/tutoring/schedule");
  await expect(page.getByRole("heading", { name: "수업 링크" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Meet 시작/ }).first()).toHaveAttribute(
    "href",
    "https://meet.google.com/new",
  );
  await expect(page.getByRole("button", { name: "생성 주소 복사" }).first()).toBeVisible();
  await page.getByRole("link", { name: "시트 등록" }).first().click();
  await expect(page).toHaveURL(/\/tutoring\/students\/new#resources$/);
  await expect(page.getByLabel("Google Sheets 링크")).toBeVisible();
});
