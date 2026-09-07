import { CircleDollarSign } from "lucide-react";

import type {
  SharedExpenseCategory,
  SharedExpenseKind,
  SharedExpenseStatus,
} from "@/domain/household/shared-money";
import { cn } from "@/lib/utils";

export const sharedExpenseCategoryLabel: Record<SharedExpenseCategory, string> = {
  rent: "월세",
  management_fee: "관리비",
  electricity: "전기",
  gas: "가스",
  water: "수도",
  internet: "인터넷",
  household_goods: "생활용품",
  shared_grocery: "공동 식재료",
  subscription: "구독",
  other: "기타",
};

export const sharedExpenseKindLabel: Record<SharedExpenseKind, string> = {
  charge: "지출",
  refund: "환불",
};

export const sharedExpenseStatusLabel: Record<SharedExpenseStatus, string> = {
  draft: "작성 중",
  confirmed: "확정",
  settled: "정산 완료",
  void: "취소됨",
};

export function SharedExpenseStatusBadge({ status }: { status: SharedExpenseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-extrabold",
        status === "confirmed" &&
          "border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent-dark)]",
        status === "settled" &&
          "border-[var(--success-line)] bg-[var(--success-wash)] text-[var(--success-ink)]",
        status === "draft" &&
          "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--muted-ink)]",
        status === "void" &&
          "border-[var(--danger-line)] bg-[var(--danger-wash)] text-[var(--danger-ink)]",
      )}
    >
      {sharedExpenseStatusLabel[status]}
    </span>
  );
}

export function SharedMoneyMark() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
      <CircleDollarSign aria-hidden="true" className="size-5" />
    </span>
  );
}
