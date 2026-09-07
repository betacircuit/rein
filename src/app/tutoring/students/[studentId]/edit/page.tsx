import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentForm } from "@/app/tutoring/students/student-form";
import { readRemoteStudent } from "@/lib/tutoring/remote-repository";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const data = await readRemoteStudent(studentId);
  if (!data) redirect(`/login?next=/tutoring/students/${studentId}/edit`);
  if (!data.student) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <Link className="rein-back-link" href={`/tutoring/students/${studentId}`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        학생 상세
      </Link>
      <header className="my-5">
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">{data.student.name} 수정</h1>
      </header>
      <StudentForm schedule={data.studentSchedules[0]} student={data.student} />
    </div>
  );
}
