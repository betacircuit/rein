import type { LessonMode, LessonStatus } from "@/domain/tutoring/model";
import { formatKoreanDate } from "@/lib/format/date";

export const lessonModeLabel: Record<LessonMode, string> = { online: "온라인", in_person: "대면" };
export const lessonStatusLabel: Record<LessonStatus, string> = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
};

export function formatSeoulDateTime(value: string) {
  return formatKoreanDate(value, {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TutoringNav(props?: { current?: "today" | "students" | "lessons" | "new" }) {
  void props;
  return null;
}
