import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";

const typeLabel = { subject: "교과", school_record: "생기부" } as const;
const modeLabel = { online: "온라인", in_person: "대면" } as const;

export const metadata = { title: "과외 기본값 | 설정" };

export default async function TutoringSettingsPage() {
  const state = await readDemoTutoringState();
  if (!state) redirect("/login?next=/settings/tutoring");
  const students = state.students.filter((student) => student.isActive);
  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">설정 · 과외 기본값</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          학생마다 다른 기본값을 써요
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          전역 기본값은 만들지 않습니다. 새 수업은 선택한 학생의 금액·시간·방식만 복사하고 이미 만든
          수업은 바꾸지 않아요.
        </p>
      </header>
      <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="학생별 과외 기본값">
        {students.map((student) => (
          <article
            className="rounded-3xl border border-[var(--line)] bg-white p-5"
            key={student.id}
          >
            <GraduationCap aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
            <h2 className="mt-4 text-lg font-black">{student.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
              {typeLabel[student.tutoringType]} · {modeLabel[student.defaultMode]} · 기본{" "}
              {student.defaultDurationMinutes}분
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/tutoring/students/${student.id}/edit`}>
                기본값 수정 <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
