import { CalendarDays, CreditCard, ListChecks, ScanSearch } from "lucide-react";
import Link from "next/link";

import type {
  OccurrenceStatus,
  SubscriptionCategory,
  SubscriptionDecision,
  SubscriptionStatus,
} from "@/domain/subscriptions/model";
import { formatKoreanDate } from "@/lib/format/date";

export const categoryLabels: Record<SubscriptionCategory, string> = {
  ai_software: "AI·소프트웨어",
  cloud_storage: "클라우드·저장공간",
  education: "교육",
  entertainment: "엔터테인먼트",
  communication: "통신",
  fitness: "운동·건강",
  news: "뉴스·정보",
  other: "기타",
};

export const statusLabels: Record<SubscriptionStatus, string> = {
  trial: "체험 중",
  active: "이용 중",
  paused: "일시 중지",
  cancelled: "해지",
  ended: "종료",
};

export const decisionLabels: Record<SubscriptionDecision, string> = {
  keep: "유지",
  review: "검토",
  cancel_candidate: "해지 후보",
};

export const occurrenceStatusLabels: Record<OccurrenceStatus, string> = {
  scheduled: "예정",
  unmatched: "거래 미연결",
  paid: "결제 확인",
  skipped: "건너뜀",
  refunded: "환불",
};

export const cycleLabels = {
  weekly: "매주",
  monthly: "매월",
  quarterly: "3개월",
  semiannual: "6개월",
  yearly: "매년",
  custom_days: "직접 지정",
} as const;

const links = [
  { href: "/money/subscriptions", label: "대시보드", icon: CreditCard },
  { href: "/money/subscriptions/calendar", label: "청구 일정", icon: CalendarDays },
  { href: "/money/subscriptions/review", label: "유지 검토", icon: ListChecks },
  { href: "/money/subscriptions/matches", label: "거래 매칭", icon: ScanSearch },
] as const;

export function SubscriptionNav({ current }: { current: (typeof links)[number]["label"] }) {
  return (
    <nav aria-label="구독 메뉴" className="mb-6 flex flex-wrap gap-2">
      {links.map((item) => {
        const Icon = item.icon;
        const active = item.label === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-wash)] px-4 text-sm font-extrabold text-[var(--accent-dark)]"
                : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--muted-ink)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
            }
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function formatSubscriptionDate(value: string) {
  return formatKoreanDate(value, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
