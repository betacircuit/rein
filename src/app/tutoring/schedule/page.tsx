import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { readRemoteTutoringData } from "@/lib/tutoring/remote-repository";
import { ScheduleWorkspace } from "./schedule-workspace";
import { TutoringResourceDock } from "./tutoring-resource-dock";

export const metadata = { title: "주 시간표" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const data = await readRemoteTutoringData();
  if (!data) redirect("/login");
  const params = await searchParams;
  const activeStudents = data.students.filter((student) => student.isActive);
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black bg-[var(--orange)] p-4 sm:p-5">
        <div>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.065em] uppercase">주 시간표</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/tutoring/students/new">
            <Plus aria-hidden="true" className="size-4" />
            학생 추가
          </Link>
        </Button>
      </header>
      {params.created && (
        <p
          className="mt-4 border-2 border-black bg-[var(--success-wash)] p-3 text-sm font-black text-[var(--success-ink)] shadow-[3px_3px_0_#101010]"
          role="status"
        >
          시간을 추가했습니다.
        </p>
      )}
      <div className="mt-5 min-w-0 space-y-5">
        <TutoringResourceDock
          students={activeStudents.map(
            ({ id, name, defaultMode, manualMeetUrl, googleSheetUrl }) => ({
              id,
              name,
              defaultMode,
              manualMeetUrl,
              googleSheetUrl,
            }),
          )}
        />
        <ScheduleWorkspace
          personalSchedules={data.personalSchedules}
          schedules={data.schedules}
          students={activeStudents.map(({ id, name, defaultDurationMinutes }) => ({
            id,
            name,
            defaultDurationMinutes,
          }))}
        />
      </div>
    </div>
  );
}
