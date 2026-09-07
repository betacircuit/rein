import Link from "next/link";

import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "오프라인" };

export default function OfflinePage() {
  return (
    <DataState
      action={
        <Button asChild variant="outline">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      }
      description="최근 화면은 읽을 수 있지만 돈이나 생활 기록 저장은 연결 뒤에만 완료됩니다."
      kind="offline"
      title="지금은 오프라인이에요"
    />
  );
}
