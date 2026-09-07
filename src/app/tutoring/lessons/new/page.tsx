import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LessonForm } from "@/app/tutoring/lessons/lesson-form";
import { TutoringNav } from "@/app/tutoring/tutoring-ui";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

export const metadata = { title: "수업 추가 · 과외" };

export default async function NewLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const state = await readDemoTutoringState();
  if (!state) redirect("/login?next=/tutoring/lessons/new");
  const { student } = await searchParams;
  return (
    <div className="mx-auto max-w-4xl">
      <TutoringNav current="new" />
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted-ink)]"
        href="/tutoring/lessons"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> 수업 목록
      </Link>
      <header className="mt-3 mb-6">
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">수업 등록</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">수업 하나 추가</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          학생 기본값을 시작점으로 복사한 뒤 이 수업만 덮어쓸 수 있어요.
        </p>
      </header>
      <LessonForm
        {...(student ? { selectedStudentId: student } : {})}
        students={state.students.filter((candidate) => candidate.isActive)}
      />
    </div>
  );
}
