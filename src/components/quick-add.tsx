"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownToLine,
  BookOpenCheck,
  CirclePlus,
  CreditCard,
  HandCoins,
  PackagePlus,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "수업 추가",
    detail: "학생과 시간을 정해요",
    href: "/tutoring/lessons/new",
    icon: BookOpenCheck,
    group: "work",
  },
  {
    label: "수입 기록",
    detail: "실제로 들어온 돈을 남겨요",
    href: "/money/transactions/new?kind=income",
    icon: HandCoins,
    group: "money",
  },
  {
    label: "지출 기록",
    detail: "현금 이동을 직접 기록해요",
    href: "/money/transactions/new?kind=expense",
    icon: WalletCards,
    group: "money",
  },
  {
    label: "입출금 확인",
    detail: "입금·결제 후보를 검토해요",
    href: "/money/matches",
    icon: ArrowDownToLine,
    group: "money",
  },
  {
    label: "구독 추가",
    detail: "갱신일과 결제 단서를 남겨요",
    href: "/money/subscriptions/new",
    icon: CreditCard,
    group: "money",
  },
  {
    label: "생활용품 추가",
    detail: "냉장고와 재고를 채워요",
    href: "/household/inventory/new",
    icon: PackagePlus,
    group: "home",
  },
  {
    label: "공동비 추가",
    detail: "결제자와 분담을 따로 기록해요",
    href: "/household/expenses/new",
    icon: ReceiptText,
    group: "home",
  },
] as const;

export function QuickAdd({ compact = false }: { compact?: boolean }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          aria-label="빠른 기록 열기"
          className={cn(
            compact &&
              "size-14 border-2 border-black bg-[var(--magenta)] p-0 text-black shadow-[5px_5px_0_#101010] hover:bg-[var(--accent-strong)]",
          )}
          size={compact ? "icon" : "large"}
          variant="accent"
        >
          <CirclePlus aria-hidden="true" className="size-5" strokeWidth={2.2} />
          {!compact && <span>빠른 기록</span>}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-none" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto border-2 border-black bg-[var(--surface)] p-5 shadow-[8px_8px_0_var(--magenta)] focus:outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[34rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <Dialog.Title className="text-xl font-extrabold tracking-[-0.025em] text-[var(--ink)]">
                무엇을 기록할까요?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
                실제 현금 이동과 예정된 일을 구분해서 시작해요.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="빠른 기록 닫기" size="icon" variant="ghost">
                <X aria-hidden="true" className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Dialog.Close asChild key={action.label}>
                  <Link
                    className="rein-pressable group flex min-h-16 items-center gap-3 border-2 border-black bg-[var(--surface-muted)] px-4 py-3 shadow-[3px_3px_0_#101010] transition-colors hover:bg-[var(--cyan)] focus-visible:outline-none"
                    href={action.href}
                  >
                    <span className="grid size-10 shrink-0 place-items-center border-2 border-black bg-[var(--surface)] text-[var(--ink-soft)] group-hover:text-black">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[var(--ink)]">
                        {action.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-[var(--muted-ink)]">
                        {action.detail}
                      </span>
                    </span>
                  </Link>
                </Dialog.Close>
              );
            })}
          </div>
          <p className="mt-4 border-2 border-black bg-[var(--info-wash)] px-3 py-2 text-xs leading-5 text-[var(--info-ink)]">
            데모 모드에서는 외부 계정 없이 모든 흐름을 안전하게 둘러볼 수 있어요.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
