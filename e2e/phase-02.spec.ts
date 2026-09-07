import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function startTutorSession(page: Page, identity: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(`${identity}@demo.local`);
  await page.getByRole("button", { name: "로컬 데모 시작" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test.describe("Phase 02 tutoring operations", () => {
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

  test("today rail opens preparation and syncs a transparent mock meeting", async ({
    page,
  }, testInfo) => {
    await startTutorSession(page, `phase02-rail-${testInfo.project.name}`);
    await page.goto("/tutoring");

    await expect(page.getByRole("heading", { name: "오늘의 수업 레일" })).toBeVisible();
    await expect(page.getByText("김민준", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "수업 보기" }).first().click();

    await expect(page.getByRole("heading", { name: "수업 준비" })).toBeVisible();
    await page.getByLabel("준비 메모").fill("수업 전 수정한 준비 메모");
    await page.getByRole("button", { name: "준비 내용 저장" }).click();
    await expect(page.getByLabel("준비 메모")).toHaveValue("수업 전 수정한 준비 메모");
    await page.getByRole("button", { name: "진도 범위 확인 완료로 변경" }).click();
    await expect(page.getByText("2/3 완료")).toBeVisible();
    await page.getByRole("button", { name: "모의 캘린더 연결" }).click();
    await expect(page.getByText("로컬 모의 캘린더 연결됨")).toBeVisible();
    await expect(page.getByRole("link", { name: "mock Meet 열기" })).toHaveAttribute(
      "href",
      /meet\.mock\.local/,
    );
  });

  test("school-record student form hides subject and requires an in-person location", async ({
    page,
  }, testInfo) => {
    await startTutorSession(page, `phase02-student-${testInfo.project.name}`);
    await page.goto("/tutoring/students/new");

    await page.getByLabel(/학생 이름/).fill("박서윤");
    await page.getByLabel(/과외 유형/).selectOption("school_record");
    await expect(page.getByLabel(/교과 과목/)).toHaveCount(0);
    await page.getByLabel(/기본 방식/).selectOption("in_person");
    await page.getByLabel(/방문 장소/).fill("서울대입구 스터디룸");
    await page.getByRole("button", { name: "학생과 일정 만들기" }).click();

    await expect(page).toHaveURL(/\/tutoring\/students\/.+\?created=1$/);
    await expect(page.getByRole("heading", { name: "박서윤" })).toBeVisible();
    await expect(page.getByText("생기부", { exact: true })).toBeVisible();
    await expect(page.getByText("서울대입구 스터디룸", { exact: false })).toBeVisible();
  });

  test("lesson creation copies defaults and permits a per-lesson override", async ({
    page,
  }, testInfo) => {
    await startTutorSession(page, `phase02-lesson-${testInfo.project.name}`);
    await page.goto("/tutoring/lessons/new?student=student-math");

    await expect(page.getByLabel("수업료(원)")).toHaveValue("60000");
    await expect(page.getByLabel("수업 시간(분)")).toHaveValue("120");
    await page.getByLabel("수업료(원)").fill("65000");
    await page.getByLabel("수업 시간(분)").fill("90");
    await page.getByLabel("준비 메모").fill("새 수업 오답 점검");
    await page.getByRole("button", { name: "이 값으로 수업 만들기" }).click();

    await expect(page).toHaveURL(/\/tutoring\/lessons\/.+\?created=1$/);
    await expect(page.getByText("₩65,000", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("새 수업 오답 점검", { exact: true })).toBeVisible();
  });

  test("changing student defaults preserves the historical lesson amount", async ({
    page,
  }, testInfo) => {
    await startTutorSession(page, `phase02-snapshot-${testInfo.project.name}`);
    await page.goto("/tutoring/students/student-math/edit");

    await page.getByLabel(/기본 수업료/).fill("70000");
    await page.getByRole("button", { name: "기본값 저장" }).click();
    await expect(page).toHaveURL(/\/tutoring\/students\/student-math\?updated=1$/);
    await page.goto("/tutoring/lessons/lesson-demo-math");

    await expect(page.getByText("₩60,000", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("학생 기본값을 바꿔도 아래 값은 수업 당시 기록으로 유지됩니다."),
    ).toBeVisible();
  });
});
