import {
  CheckSquare2,
  HandCoins,
  House,
  ReceiptText,
  Refrigerator,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import type {
  CleaningDerivedState,
  CleaningTask,
  HouseholdMember,
  InventoryItem,
  ShoppingItem,
  StorageLocation,
} from "@/domain/household/operations";
import { ownerLabel } from "@/domain/household/operations";
import { formatKoreanDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

const links = [
  { href: "/household", label: "상태판", icon: House },
  { href: "/household/inventory", label: "재고", icon: Refrigerator },
  { href: "/household/shopping", label: "장보기", icon: ShoppingBasket },
  { href: "/household/cleaning", label: "청소", icon: Sparkles },
  { href: "/household/expenses", label: "공동비", icon: ReceiptText },
  { href: "/household/settlements", label: "정산", icon: HandCoins },
] as const;

export function HouseholdNav({ current }: { current: (typeof links)[number]["label"] }) {
  return (
    <nav aria-label="우리집 보조 메뉴" className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {links.map((item) => {
        const Icon = item.icon;
        const active = current === item.label;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rein-pressable inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-black px-4 text-sm font-extrabold shadow-[3px_3px_0_#101010] focus-visible:outline-none",
              active
                ? "bg-[var(--magenta)] text-black"
                : "bg-[var(--surface)] text-[var(--ink)] transition-colors hover:bg-[var(--cyan)]",
            )}
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

export const storageLabel: Record<StorageLocation, string> = {
  refrigerated: "냉장",
  frozen: "냉동",
  room_temperature: "실온",
};

export const cleaningStateLabel: Record<CleaningDerivedState, string> = {
  due: "기한 도래",
  due_soon: "곧 해야 해요",
  ok: "괜찮아요",
};

export function CleaningStateBadge({ state }: { state: CleaningDerivedState }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center border-2 px-2.5 text-xs font-extrabold",
        state === "due" &&
          "border-[var(--danger-line)] bg-[var(--danger-wash)] text-[var(--danger-ink)]",
        state === "due_soon" &&
          "border-[var(--warning-line)] bg-[var(--warning-wash)] text-[var(--warning-ink)]",
        state === "ok" &&
          "border-[var(--success-line)] bg-[var(--success-wash)] text-[var(--success-ink)]",
      )}
    >
      {cleaningStateLabel[state]}
    </span>
  );
}

export function MemberName({
  memberId,
  members,
  fallback = "함께",
}: {
  memberId: string | null;
  members: readonly HouseholdMember[];
  fallback?: string;
}) {
  const member = members.find((candidate) => candidate.id === memberId);
  return <>{member ? (member.isCurrentUser ? "나" : member.displayName) : fallback}</>;
}

export function OwnershipLabel({
  item,
  members,
}: {
  item: Pick<InventoryItem | ShoppingItem, "ownerKind" | "ownerMemberId">;
  members: readonly HouseholdMember[];
}) {
  return <>{ownerLabel(item, members)}</>;
}

export function CleaningHistoryIcon() {
  return (
    <span className="grid size-9 shrink-0 place-items-center border-2 border-black bg-[var(--cyan)] text-black">
      <CheckSquare2 aria-hidden="true" className="size-4" />
    </span>
  );
}

export function formatHouseholdDate(value: string | null) {
  if (!value) return "정해지지 않음";
  return formatKoreanDate(value, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function recurrenceLabel(task: CleaningTask) {
  if (task.recurrence === "none") return "한 번만";
  if (task.recurrence === "interval_days") return `${task.recurrenceIntervalDays}일마다`;
  return `주 1회 · 매주 ${["일", "월", "화", "수", "목", "금", "토"][task.weekday ?? 0]}요일`;
}
