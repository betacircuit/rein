"use client";

import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DataState
      action={
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      }
      description="입력한 내용은 그대로 두고 화면만 다시 불러옵니다."
      kind="error"
      title="화면을 불러오지 못했어요"
    />
  );
}
