import { Download, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DataDeletionForm } from "@/app/settings/data/data-deletion-form";
import { Button } from "@/components/ui/button";
import { readDemoSession } from "@/lib/auth/session";

export const metadata = { title: "내보내기와 삭제 | 설정" };

export default async function DataSettingsPage() {
  if (!(await readDemoSession())) redirect("/login?next=/settings/data");
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">설정 · 내 데이터</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          가져갈 수 있고, 지울 수 있어요
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          내보내기에는 현재 사용자의 개인 기록과 현재 세션에서 볼 수 있는 공동 기록이 포함됩니다.
          비밀번호나 외부 서비스 토큰은 포함하지 않습니다.
        </p>
      </header>
      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <Download aria-hidden="true" className="size-6 text-[var(--accent-dark)]" />
        <h2 className="mt-5 text-xl font-black">JSON 백업</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          원 단위 큰 정수는 정밀도를 잃지 않도록 문자열로 저장합니다. 다운로드 응답은 브라우저와
          중간 캐시에 남지 않도록 설정합니다.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/settings/data/export" prefetch={false}>
            내 데이터 다운로드
          </Link>
        </Button>
      </section>
      <section className="mt-5 rounded-3xl border border-[var(--danger)]/30 bg-white p-5 sm:p-6">
        <ShieldAlert aria-hidden="true" className="size-6 text-[var(--danger)]" />
        <h2 className="mt-5 text-xl font-black">로컬 데모 계정 삭제</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          이 브라우저 세션과 서버 메모리의 과외·돈·구독·우리집·Grow·연동 데이터를 즉시 지웁니다. 이
          데모에는 다른 실제 사용자가 없으므로 공동 정산 보존 의무가 없습니다. 실제 서비스에서는
          확정 정산을 익명화해 법정 보존 기간 동안 남기는 별도 요청 절차가 필요합니다. Supabase의
          계정과 원격 기록은 삭제하지 않고 현재 로그인만 종료합니다.
        </p>
        <DataDeletionForm />
      </section>
    </div>
  );
}
