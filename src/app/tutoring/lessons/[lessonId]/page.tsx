import { CalendarCheck, Check, CircleX, MapPin, NotebookPen, Video } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  changeLessonStatusAction,
  syncMockCalendarAction,
  togglePrepItemAction,
  updateLessonPrepAction,
} from "@/app/tutoring/actions";
import {
  formatSeoulDateTime,
  lessonModeLabel,
  lessonStatusLabel,
  TutoringNav,
} from "@/app/tutoring/tutoring-ui";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const state = await readDemoTutoringState();
  if (!state) redirect("/login?next=/tutoring/lessons");
  const { lessonId } = await params;
  const query = await searchParams;
  const lesson = state.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) notFound();
  const student = state.students.find((candidate) => candidate.id === lesson.studentId);
  if (!student) notFound();
  const completedPrep = lesson.prepItems.filter((item) => item.isDone).length;

  return (
    <div className="mx-auto max-w-5xl">
      <TutoringNav current="lessons" />
      {query.created && (
        <p
          className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--accent-wash)] p-4 text-sm font-bold text-[var(--accent-dark)]"
          role="status"
        >
          학생 기본값을 복사해 수업을 만들었어요.
        </p>
      )}
      <header className="rounded-[2rem] border border-[var(--line)] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-black text-[var(--accent)]">
              {formatSeoulDateTime(lesson.startsAt)}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{student.name} 수업</h1>
            <p className="mt-2 text-sm text-white/65">
              {lessonModeLabel[lesson.mode]} · {formatKrw(lesson.amount)} · {lesson.timezone}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-extrabold">
            {lessonStatusLabel[lesson.status]}
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
          aria-labelledby="prep-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black" id="prep-heading">
              <NotebookPen aria-hidden="true" className="size-5 text-[var(--accent-dark)]" /> 수업
              준비
            </h2>
            <span className="text-xs font-extrabold text-[var(--muted-ink)]">
              {completedPrep}/{lesson.prepItems.length} 완료
            </span>
          </div>
          {lesson.status === "scheduled" ? (
            <form
              action={updateLessonPrepAction}
              className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4"
            >
              <input name="lessonId" type="hidden" value={lesson.id} />
              <label className="text-sm font-extrabold" htmlFor="detail-prep-notes">
                준비 메모
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-white p-3 text-base font-normal outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  defaultValue={lesson.prepNotes ?? ""}
                  id="detail-prep-notes"
                  name="prepNotes"
                />
              </label>
              <label className="mt-4 block text-sm font-extrabold" htmlFor="detail-prep-items">
                체크리스트 · 한 줄에 하나
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-white p-3 text-base font-normal outline-none focus:ring-2 focus:ring-[var(--focus)]"
                  defaultValue={lesson.prepItems.map((item) => item.label).join("\n")}
                  id="detail-prep-items"
                  name="prepItems"
                />
              </label>
              <Button className="mt-3" type="submit" variant="outline">
                준비 내용 저장
              </Button>
            </form>
          ) : (
            <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm leading-6">
              {lesson.prepNotes || "준비 메모가 없어요."}
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {lesson.prepItems.map((item) => (
              <li key={item.id}>
                <form action={togglePrepItemAction}>
                  <input name="lessonId" type="hidden" value={lesson.id} />
                  <input name="prepItemId" type="hidden" value={item.id} />
                  <button
                    aria-label={`${item.label} ${item.isDone ? "미완료로 변경" : "완료로 변경"}`}
                    className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[var(--line)] px-4 text-left text-sm font-bold hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                    type="submit"
                  >
                    <span
                      className={
                        item.isDone
                          ? "grid size-6 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "grid size-6 place-items-center rounded-lg border border-[var(--line-strong)]"
                      }
                    >
                      {item.isDone && <Check aria-hidden="true" className="size-4" />}
                    </span>
                    <span className={item.isDone ? "text-[var(--muted-ink)] line-through" : ""}>
                      {item.label}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
          aria-labelledby="access-heading"
        >
          <h2 className="text-lg font-black" id="access-heading">
            수업 접속·장소
          </h2>
          {lesson.mode === "in_person" ? (
            <div className="mt-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
                <MapPin aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-3 font-extrabold">{lesson.inPersonLocation}</p>
              <a
                className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--accent-dark)] underline underline-offset-4"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lesson.inPersonLocation ?? "")}`}
                rel="noreferrer"
                target="_blank"
              >
                지도에서 검색
              </a>
            </div>
          ) : (
            <div className="mt-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
                <Video aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">
                {lesson.meetStrategy === "manual_reusable"
                  ? "사용자가 직접 관리하는 재사용 주소예요."
                  : "이 수업에만 쓰는 로컬 mock 회의 주소를 만들어요."}
              </p>
              {lesson.calendarSyncState === "synced" && lesson.meetUrl ? (
                <div className="mt-4 space-y-2">
                  <a
                    className="inline-flex min-h-11 items-center rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-white"
                    href={lesson.meetUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    mock Meet 열기
                  </a>
                  <p className="flex items-center gap-2 text-xs font-bold text-[var(--accent-dark)]">
                    <CalendarCheck aria-hidden="true" className="size-4" /> 로컬 모의 캘린더 연결됨
                  </p>
                </div>
              ) : (
                <form action={syncMockCalendarAction} className="mt-4">
                  <input name="lessonId" type="hidden" value={lesson.id} />
                  <Button type="submit" variant="accent">
                    <CalendarCheck aria-hidden="true" className="size-4" /> 모의 캘린더 연결
                  </Button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black">수업 스냅샷</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          학생 기본값을 바꿔도 아래 값은 수업 당시 기록으로 유지됩니다.
        </p>
        <dl className="mt-4 grid gap-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--muted-ink)]">시작</dt>
            <dd className="mt-1 font-extrabold">{formatSeoulDateTime(lesson.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-ink)]">종료</dt>
            <dd className="mt-1 font-extrabold">{formatSeoulDateTime(lesson.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-ink)]">금액</dt>
            <dd className="mt-1 font-extrabold">{formatKrw(lesson.amount)}</dd>
          </div>
        </dl>
      </section>

      {lesson.status === "scheduled" && (
        <section className="mt-5 flex flex-wrap justify-end gap-2" aria-label="수업 상태 변경">
          <ConfirmActionForm
            action={changeLessonStatusAction}
            confirmMessage="이 수업을 취소할까요? 수업 준비 내용은 기록으로 남습니다."
          >
            <input name="lessonId" type="hidden" value={lesson.id} />
            <input name="status" type="hidden" value="cancelled" />
            <Button type="submit" variant="outline">
              <CircleX aria-hidden="true" className="size-4" /> 수업 취소
            </Button>
          </ConfirmActionForm>
          <ConfirmActionForm
            action={changeLessonStatusAction}
            confirmMessage="이 수업을 완료 처리할까요? 완료 상태는 과외비 계산에 반영됩니다."
          >
            <input name="lessonId" type="hidden" value={lesson.id} />
            <input name="status" type="hidden" value="completed" />
            <Button type="submit" variant="accent">
              <Check aria-hidden="true" className="size-4" /> 수업 완료
            </Button>
          </ConfirmActionForm>
        </section>
      )}
      <p className="mt-5 text-sm text-[var(--muted-ink)]">
        입금 확인과 미수금 처리는 수업 상태와 분리되며 다음 정산 단계에서 연결됩니다.{" "}
        <Link
          className="font-bold underline underline-offset-4"
          href={`/tutoring/students/${student.id}`}
        >
          학생으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
