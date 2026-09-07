import { Bell, CalendarClock, CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";
import { readDemoTutoringState } from "@/lib/tutoring/demo-store";
import { formatSeoulDateKey } from "@/lib/format/date";

export const metadata = { title: "알림 모아보기 | 설정" };

export default async function NotificationsPage() {
  const [subscriptions, tutoring] = await Promise.all([
    readDemoSubscriptionState(),
    readDemoTutoringState(),
  ]);
  if (!subscriptions || !tutoring) redirect("/login?next=/settings/notifications");
  const today = formatSeoulDateKey();
  const lessons = tutoring.lessons.filter(
    (lesson) => lesson.status === "scheduled" && lesson.startsAt.slice(0, 10) >= today,
  );
  const occurrences = subscriptions.occurrences.filter((item) =>
    ["scheduled", "unmatched"].includes(item.status),
  );
  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">설정 · 앱 안 알림</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          놓치기 쉬운 일만 모았어요
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          현재 알림은 앱 안에서만 제공합니다. 푸시와 이메일은 아직 제공하지 않으므로 동작하지 않는
          토글을 보여 주지 않아요.
        </p>
      </header>
      <section className="mt-6 space-y-3" aria-label="현재 알림">
        {lessons.slice(0, 3).map((lesson) => (
          <Link
            className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 hover:border-[var(--line-strong)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
            href={`/tutoring/lessons/${lesson.id}`}
            key={lesson.id}
          >
            <CalendarClock
              aria-hidden="true"
              className="size-5 shrink-0 text-[var(--accent-dark)]"
            />
            <span>
              <strong className="block">예정 수업을 확인하세요</strong>
              <span className="mt-1 block text-xs text-[var(--muted-ink)]">
                준비 항목과 장소 또는 Meet 주소를 확인할 수 있어요.
              </span>
            </span>
          </Link>
        ))}
        {occurrences.slice(0, 3).map((occurrence) => (
          <Link
            className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 hover:border-[var(--line-strong)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
            href="/money/subscriptions/calendar"
            key={occurrence.id}
          >
            <CreditCard aria-hidden="true" className="size-5 shrink-0 text-[var(--accent-dark)]" />
            <span>
              <strong className="block">구독 결제 예정일 {occurrence.dueOn}</strong>
              <span className="mt-1 block text-xs text-[var(--muted-ink)]">
                결제 전에는 실제 지출로 계산하지 않아요.
              </span>
            </span>
          </Link>
        ))}
        {lessons.length + occurrences.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-8 text-center">
            <Bell aria-hidden="true" className="mx-auto size-6 text-[var(--accent-dark)]" />
            <h2 className="mt-4 font-black">지금 확인할 알림이 없어요</h2>
            <p className="mt-2 text-sm text-[var(--muted-ink)]">
              새 수업이나 구독 예정 건이 생기면 여기에 표시합니다.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
