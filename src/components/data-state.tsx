import { CloudOff, Inbox, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ReinLoading } from "@/components/rein-loading";
import { cn } from "@/lib/utils";

type StateKind = "empty" | "error" | "offline" | "stale";

const stateIcon = {
  empty: Inbox,
  error: TriangleAlert,
  offline: WifiOff,
  stale: CloudOff,
} as const;

export function DataState({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: StateKind;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = stateIcon[kind];
  return (
    <section
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn(
        "border-2 border-dashed border-black bg-[var(--surface)] p-6 text-center shadow-[5px_5px_0_#101010]",
        className,
      )}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="mx-auto grid size-11 place-items-center border-2 border-black bg-[var(--cyan)] text-black">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-extrabold text-[var(--ink)]">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--muted-ink)]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

export function LoadingState({ label = "내용을 불러오는 중" }: { label?: string }) {
  return <ReinLoading label={label} />;
}

export function RetryButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button onClick={onClick} type="button" variant="outline">
      <RefreshCw aria-hidden="true" className="size-4" />
      다시 시도
    </Button>
  );
}
