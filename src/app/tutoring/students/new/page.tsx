import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StudentQuickForm } from "@/app/tutoring/students/student-quick-form";

export const metadata = { title: "학생 추가" };
export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link className="rein-back-link" href="/tutoring/students">
        <ArrowLeft aria-hidden="true" className="size-4" />
        학생 목록
      </Link>
      <header className="my-5">
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">학생 추가</h1>
        <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
          네 가지만 먼저 정하면 등록됩니다. 과목, 일정, 보호자 연락처 같은 세부 내용은 등록 후 학생
          상세에서 채우면 됩니다.
        </p>
      </header>
      <StudentQuickForm />
    </div>
  );
}
