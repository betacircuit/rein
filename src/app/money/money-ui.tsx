import {
  BarChart3,
  CircleDollarSign,
  CreditCard,
  Landmark,
  List,
  Sprout,
  Upload,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import type { ReceivableStatus, TransactionKind } from "@/domain/money/ledger";
import { formatKoreanDate } from "@/lib/format/date";

export const transactionKindLabel: Record<TransactionKind, string> = {
  income: "수입",
  expense: "지출",
  transfer: "내 계좌 이체",
};
export const receivableStatusLabel: Record<ReceivableStatus, string> = {
  open: "미입금",
  partially_paid: "일부 입금",
  paid: "입금 완료",
  void: "무효",
};
export const accountTypeLabel = {
  checking: "입출금",
  savings: "저축",
  cash: "현금",
  card: "카드",
  investment: "투자",
  other: "기타",
} as const;
export const categoryLabel: Record<string, string> = {
  tutoring: "과외",
  scholarship: "장학금",
  allowance: "용돈",
  other_income: "기타 수입",
  food: "식비",
  cafe: "카페",
  transport: "교통",
  housing: "주거",
  shopping: "쇼핑",
  education: "교육",
  subscription: "구독",
  household: "자취방",
  other_expense: "기타 지출",
};

const links = [
  { href: "/money", label: "개요", icon: Landmark },
  { href: "/money/accounts", label: "계좌", icon: WalletCards },
  { href: "/money/transactions", label: "거래", icon: List },
  { href: "/money/receivables", label: "받을 돈", icon: CircleDollarSign },
  { href: "/money/subscriptions", label: "구독", icon: CreditCard },
  { href: "/money/grow", label: "Grow", icon: Sprout },
  { href: "/money/analytics", label: "분석", icon: BarChart3 },
  { href: "/money/import", label: "CSV", icon: Upload },
] as const;

export function MoneyNav({ current }: { current: (typeof links)[number]["label"] }) {
  return (
    <nav aria-label="돈 보조 메뉴" className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {links.map((item) => {
        const Icon = item.icon;
        const active = item.label === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rein-pressable inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-black bg-[var(--magenta)] px-4 text-sm font-extrabold text-black shadow-[3px_3px_0_#101010]"
                : "rein-pressable inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-black bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] shadow-[3px_3px_0_#101010] hover:bg-[var(--cyan)] focus-visible:outline-none"
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

export function formatMoneyDate(value: string) {
  return formatKoreanDate(value, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
