import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  formatSeoulDateTime,
  lessonModeLabel,
  lessonStatusLabel,
  TutoringNav,
} from "@/app/tutoring/tutoring-ui";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export const metadata = { title: "수업 · 과외" };

export default async function LessonsPage() {
  const state = await readDemoTutoringState();
  if (!state) redirect("/login?next=/tutoring/lessons");
  const lessons = [...state.lessons].sort((left, right) =>
    right.startsAt.localeCompare(left.startsAt),
  );
  return (
    <div>
      <TutoringNav current="lessons" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent-dark)]">수업 일정</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">수업 기록</h1>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            예정·완료·취소 세 상태와 수업 당시의 금액·방식을 보존해요.
          </p>
        </div>
        <Button asChild>
          <Link href="/tutoring/lessons/new">
            <Plus aria-hidden="true" className="size-4" /> 수업 추가
          </Link>
        </Button>
      </header>
      <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[var(--shadow-soft)]">
        <div className="divide-y divide-[var(--line)]">
          {lessons.map((lesson) => {
            const student = state.students.find((candidate) => candidate.id === lesson.studentId);
            return (
              <Link
                className="grid min-h-20 gap-3 p-5 hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none sm:grid-cols-[11rem_1fr_auto] sm:items-center"
                href={`/tutoring/lessons/${lesson.id}`}
                key={lesson.id}
              >
                <span className="font-mono text-sm font-black text-[var(--accent-dark)]">
                  {formatSeoulDateTime(lesson.startsAt)}
                </span>
                <span>
                  <span className="block font-black">{student?.name ?? "알 수 없는 학생"}</span>
                  <span className="mt-1 block text-xs text-[var(--muted-ink)]">
                    {lessonModeLabel[lesson.mode]} · {formatKrw(lesson.amount)} · 준비{" "}
                    {lesson.prepItems.filter((item) => item.isDone).length}/
                    {lesson.prepItems.length}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-extrabold">
                    {lessonStatusLabel[lesson.status]}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
        {lessons.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-ink)]">
            <CalendarDays aria-hidden="true" className="mx-auto mb-3 size-6" />
            <p>아직 수업이 없어요. 학생을 고르고 첫 일정을 등록해 보세요.</p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-extrabold text-[var(--accent-dark)] underline underline-offset-4"
              href="/tutoring/lessons/new"
            >
              첫 수업 등록
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
