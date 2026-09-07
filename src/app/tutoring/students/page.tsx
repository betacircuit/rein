import { ArrowRight, Plus, Users, Video } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatKrw } from "@/domain/money/krw";
import { readRemoteTutoringData } from "@/lib/tutoring/remote-repository";
import { scheduleLabel, WEEKDAYS } from "@/lib/tutoring/timetable";

const subjectLabels = { math: "수학", physics: "물리", chemistry: "화학" } as const;
const statusLabels = {
  consulting: "상담 중",
  active: "수업 중",
  paused: "중단",
  ended: "종료",
} as const;

export const metadata = { title: "학생 관리" };

export default async function StudentsPage() {
  const data = await readRemoteTutoringData();
  if (!data) redirect("/login?next=/tutoring/students");
  return (
    <div className="mx-auto max-w-6xl">
      <header className="rein-section-head rein-students-head">
        <div>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.065em]">학생 관리</h1>
          <p className="mt-2 text-sm font-bold">
            상담부터 진도·수업료까지 학생별로 분리해 기록합니다.
          </p>
        </div>
        <Button asChild className="rein-students-head__action">
          <Link href="/tutoring/students/new">
            <Plus aria-hidden="true" className="size-4" />
            학생 추가
          </Link>
        </Button>
      </header>
      <section className="mt-5 grid gap-4 md:grid-cols-2" aria-label="학생 목록">
        {data.students.length === 0 ? (
          <div className="rein-empty md:col-span-2">
            <Users aria-hidden="true" className="mx-auto size-8" />
            <p className="mt-3 font-black">등록된 학생이 없습니다.</p>
            <Button asChild className="mt-4">
              <Link href="/tutoring/students/new">첫 학생 등록</Link>
            </Button>
          </div>
        ) : (
          data.students.map((student, index) => {
            const studentSchedules = data.schedules
              .filter((schedule) => schedule.studentId === student.id)
              .sort((left, right) => {
                const leftDay = WEEKDAYS.findIndex((day) => day.value === left.weekday);
                const rightDay = WEEKDAYS.findIndex((day) => day.value === right.weekday);
                return leftDay - rightDay || left.startTime.localeCompare(right.startTime);
              });
            return (
              <article className="rein-file-card group" key={student.id}>
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <span className="rein-meta">FILE / {String(index + 1).padStart(2, "0")}</span>
                  <span className="border-2 border-black bg-[var(--signal)] px-2 py-1 text-[10px] font-black">
                    {statusLabels[student.consultationStatus]}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.055em]">{student.name}</h2>
                <p className="mt-1 min-h-5 text-sm font-bold text-[var(--muted-ink)]">
                  {[
                    student.schoolName,
                    student.grade,
                    student.subject ? subjectLabels[student.subject] : "생기부·입시",
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                <dl className="mt-5 grid grid-cols-2 border-2 border-black text-sm">
                  <div className="border-r-2 border-black p-3">
                    <dt className="rein-meta">시급</dt>
                    <dd className="mt-1 font-black">{formatKrw(BigInt(student.hourlyRate))}</dd>
                  </div>
                  <div className="p-3">
                    <dt className="rein-meta">SESSION</dt>
                    <dd className="mt-1 font-black">{student.defaultDurationMinutes}분</dd>
                  </div>
                  <div className="col-span-2 border-t-2 border-black p-3">
                    <dt className="rein-meta">WEEKLY</dt>
                    <dd className="mt-2 flex flex-wrap gap-2 font-black">
                      {studentSchedules.length ? (
                        studentSchedules.map((schedule) => (
                          <span
                            className="border-2 border-black bg-[var(--cyan)] px-2 py-1"
                            key={schedule.id}
                          >
                            {scheduleLabel(schedule)}
                          </span>
                        ))
                      ) : (
                        <span>정기 수업 미설정</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/tutoring/students/${student.id}`}>
                      상세
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild className="bg-[var(--cyan)] hover:bg-[var(--signal)]">
                    <a href="https://meet.google.com/new" rel="noreferrer" target="_blank">
                      <Video aria-hidden="true" className="size-4" />
                      Meet
                    </a>
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
