"use client";

import { deleteLocalAccountAction } from "@/app/settings/data/actions";
import { Button } from "@/components/ui/button";

export function DataDeletionForm() {
  return (
    <form
      action={deleteLocalAccountAction}
      className="mt-4"
      onSubmit={() =>
        navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" })
      }
    >
      <label className="block text-sm font-bold" htmlFor="deletion-confirmation">
        확인 문구
      </label>
      <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]" id="deletion-help">
        계속하려면 <strong>내 로컬 데이터 삭제</strong>를 그대로 입력하세요.
      </p>
      <input
        aria-describedby="deletion-help"
        autoComplete="off"
        className="mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
        id="deletion-confirmation"
        name="confirmation"
        pattern="내 로컬 데이터 삭제"
        required
      />
      <Button className="mt-3" type="submit" variant="destructive">
        모든 로컬 데이터 삭제
      </Button>
    </form>
  );
}
