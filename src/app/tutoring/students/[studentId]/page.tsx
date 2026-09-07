import { Archive, CalendarClock, Edit3, MapPin, Phone, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { formatKrw } from "@/domain/money/krw";
import { readRemoteStudent, readStudentLedger } from "@/lib/tutoring/remote-repository";
import { scheduleLabel, WEEKDAYS } from "@/lib/tutoring/timetable";
import { archiveRemoteStudentAction } from "@/app/tutoring/students/actions";
import { StudentLedger } from "@/app/tutoring/students/student-ledger";

const statusLabels = {
  consulting: "상담 중",
  active: "수업 중",
  paused: "일시 중단",
  ended: "종료",
} as const;

function Entry({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="border-t-2 border-black py-3">
      <dt className="rein-meta text-[var(--muted-ink)]">{label}</dt>
      <dd className="mt-1 leading-6 font-bold whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}
function Panel({
  code,
  title,
  children,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rein-detail-panel">
      <header className="flex items-center justify-between border-b-2 border-black bg-[var(--cyan)] px-4 py-3">
        <h2 className="text-lg font-black">{title}</h2>
        <span className="rein-meta">{code}</span>
      </header>
      <dl className="px-4">{children}</dl>
    </section>
  );
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { studentId } = await params;
  const [data, ledger, query] = await Promise.all([
    readRemoteStudent(studentId),
    readStudentLedger(studentId),
    searchParams,
  ]);
  if (!data) redirect(`/login?next=/tutoring/students/${studentId}`);
  if (!data.student) notFound();
  const student = data.student;
  return (
    <div className="mx-auto max-w-7xl">
      {(query.created || query.updated) && (
        <p
          className="mb-4 border-2 border-black bg-[var(--success-wash)] p-3 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="status"
        >
          {query.created ? "학생 파일을 만들었습니다." : "학생 정보를 수정했습니다."}
        </p>
      )}
      <header className="rein-student-hero">
        <div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-5xl font-black tracking-[-0.07em]">{student.name}</h1>
            <span className="border-2 border-black bg-[var(--signal)] px-3 py-1 text-xs font-black">
              {statusLabels[student.consultationStatus]}
            </span>
          </div>
          <p className="mt-3 font-bold">
            {[student.schoolName, student.schoolLevel, student.grade].filter(Boolean).join(" / ") ||
              "학교 정보 미입력"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/tutoring/students/${student.id}/edit`}>
            <Edit3 aria-hidden="true" className="size-4" />
            전체 정보 수정
          </Link>
        </Button>
      </header>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="핵심 정보">
        <article className="rein-stat">
          <UserRound className="size-5" aria-hidden="true" />
          <span>수업 유형</span>
          <strong>
            {student.subject === "math"
              ? "수학"
              : student.subject === "physics"
                ? "물리"
                : student.subject === "chemistry"
                  ? "화학"
                  : "생기부·입시"}
          </strong>
        </article>
        <article className="rein-stat">
          <CalendarClock className="size-5" aria-hidden="true" />
          <span>회당 시간</span>
          <strong>{student.defaultDurationMinutes}분</strong>
        </article>
        <article className="rein-stat">
          <Target className="size-5" aria-hidden="true" />
          <span>시급</span>
          <strong>{formatKrw(BigInt(student.hourlyRate))}</strong>
        </article>
        <article className="rein-stat">
          <MapPin className="size-5" aria-hidden="true" />
          <span>방식·장소</span>
          <strong>
            {student.defaultMode === "online" ? "온라인" : student.defaultLocation || "대면"}
          </strong>
        </article>
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel code="CONTACT / 01" title="연락과 상담">
          <Entry label="학생 연락처" value={student.studentPhone} />
          <Entry
            label="보호자"
            value={[student.guardianName, student.guardianRelation].filter(Boolean).join(" / ")}
          />
          <Entry label="보호자 연락처" value={student.guardianPhone} />
          <Entry label="유입 경로" value={student.sourceChannel} />
          <Entry
            label="최초 상담일 / 시작일"
            value={[student.firstConsultedOn, student.startedOn].filter(Boolean).join(" / ")}
          />
        </Panel>
        <Panel code="TARGET / 02" title="목표와 진단">
          <Entry
            label="목표 학교·학과"
            value={[student.targetSchool, student.targetMajor].filter(Boolean).join(" / ")}
          />
          <Entry label="현재 수준" value={student.currentLevel} />
          <Entry label="목표 수준" value={student.targetLevel} />
          <Entry label="학습 목표" value={student.learningGoal} />
          <Entry
            label="강점 / 약점"
            value={[student.strengths, student.weaknesses].filter(Boolean).join("\n\n")}
          />
        </Panel>
        <Panel code="PLAN / 03" title="수업 운영">
          <Entry label="커리큘럼" value={student.curriculumPlan} />
          <Entry label="교재·자료" value={student.materials} />
          <Entry label="과제 정책" value={student.homeworkPolicy} />
          <Entry label="내부 메모" value={student.notes} />
        </Panel>
        <Panel code="PROGRESS / 04" title="진도와 다음 행동">
          <Entry label="현재 진도" value={student.progressSummary} />
          <Entry label="다음 목표" value={student.nextGoal} />
          <div className="border-t-2 border-black py-3">
            <dt className="rein-meta text-[var(--muted-ink)]">주간 일정</dt>
            <dd className="mt-2 space-y-2">
              {data.studentSchedules.length ? (
                [...data.studentSchedules]
                  .sort((left, right) => {
                    const leftDay = WEEKDAYS.findIndex((day) => day.value === left.weekday);
                    const rightDay = WEEKDAYS.findIndex((day) => day.value === right.weekday);
                    return leftDay - rightDay || left.startTime.localeCompare(right.startTime);
                  })
                  .map((schedule) => (
                    <div
                      className="flex items-center gap-2 border-2 border-black bg-white p-3 font-black"
                      key={schedule.id}
                    >
                      <CalendarClock className="size-4" aria-hidden="true" />
                      {scheduleLabel(schedule)} · {schedule.durationMinutes}분
                    </div>
                  ))
              ) : (
                <span className="font-bold">등록된 반복 일정 없음</span>
              )}
            </dd>
          </div>
        </Panel>
      </div>
      <StudentLedger
        lessons={ledger?.lessons ?? []}
        studentId={student.id}
        transactions={ledger?.transactions ?? []}
      />
      <p className="mt-5 flex items-center gap-2 border-2 border-dashed border-black bg-white p-4 text-sm font-bold">
        <Phone aria-hidden="true" className="size-4" />
        연락처와 상담 기록은 로그인한 본인만 볼 수 있습니다.
      </p>
      {student.isActive && (
        <ConfirmActionForm
          action={archiveRemoteStudentAction}
          className="mt-5 flex justify-end"
          confirmMessage="이 학생 파일을 보관하시겠습니까? 기존 기록은 유지됩니다."
        >
          <input name="studentId" type="hidden" value={student.id} />
          <Button type="submit" variant="ghost">
            <Archive aria-hidden="true" className="size-4" />
            학생 보관
          </Button>
        </ConfirmActionForm>
      )}
    </div>
  );
}
