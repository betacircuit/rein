import { CalendarDays, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateMockConnectionAction } from "@/app/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-action";
import { syncFreshness } from "@/domain/integrations/model";
import { readDemoIntegrationConnections } from "@/lib/integrations/demo-store";
import { formatKoreanDateTime } from "@/lib/format/date";

export const metadata = { title: "외부 연동 | 설정" };
const statusLabel = {
  current: "최신",
  stale: "오래됨",
  error: "오류",
  disconnected: "연결 해제",
} as const;
const connectionLabel = {
  disconnected: "연결 안 됨",
  pending: "연결 중",
  connected: "연결됨",
  error: "확인 필요",
  revoked: "해제됨",
} as const;

export default async function IntegrationsPage() {
  const connections = await readDemoIntegrationConnections();
  if (!connections) redirect("/login?next=/settings/integrations");
  return (
    <div>
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">설정 · 외부 연동</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          외부 연동의 범위를 먼저 보여 줘요
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          지금은 자격증명 없는 로컬 mock만 동작합니다. 토큰과 fintech-use 번호는 브라우저나 일반
          테이블에 저장하지 않아요.
        </p>
      </header>
      <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="로컬 데모 연동">
        {connections
          .filter((connection) => connection.kind !== "bank")
          .map((connection) => {
            const freshness = syncFreshness(connection, new Date().toISOString());
            return (
              <article
                className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6"
                key={connection.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
                      <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-black">Calendar / Meet mock</h2>
                      <p className="mt-1 text-xs text-[var(--muted-ink)]">
                        {connection.provider} · {statusLabel[freshness]}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold">
                    데모 · {connectionLabel[connection.status]}
                  </span>
                </div>
                <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted-ink)]">
                  <p>
                    <strong className="text-[var(--ink)]">허용 범위</strong>{" "}
                    {connection.scopes.join(" · ")}
                  </p>
                  <p className="mt-1">
                    <strong className="text-[var(--ink)]">마지막 시도</strong>{" "}
                    {connection.lastAttemptAt
                      ? formatKoreanDateTime(connection.lastAttemptAt)
                      : "없음"}
                  </p>
                  <p className="mt-1">
                    <strong className="text-[var(--ink)]">마지막 성공</strong>{" "}
                    {connection.lastSuccessAt
                      ? formatKoreanDateTime(connection.lastSuccessAt)
                      : "없음"}
                  </p>
                  {connection.errorMessage ? (
                    <p className="mt-2 font-bold text-[var(--danger)]" role="alert">
                      {connection.errorMessage}
                    </p>
                  ) : null}
                </div>
                <form action={updateMockConnectionAction} className="mt-4 flex flex-wrap gap-2">
                  <input name="connectionId" type="hidden" value={connection.id} />
                  {connection.status === "connected" || connection.status === "error" ? (
                    <>
                      <Button name="intent" type="submit" value="sync" variant="outline">
                        <RefreshCw aria-hidden="true" className="size-4" /> 데모 갱신
                      </Button>
                      <ConfirmSubmitButton
                        confirmMessage="이 연동을 해제할까요? 다시 연결하기 전까지 동기화가 중단됩니다."
                        name="intent"
                        type="submit"
                        value="disconnect"
                        variant="ghost"
                      >
                        연결 해제
                      </ConfirmSubmitButton>
                    </>
                  ) : (
                    <Button name="intent" type="submit" value="connect" variant="accent">
                      데모 켜기
                    </Button>
                  )}
                </form>
                {connection.status === "connected" ? (
                  <details className="mt-3 text-xs text-[var(--muted-ink)]">
                    <summary className="min-h-11 cursor-pointer py-3 font-bold">
                      데모 상태 시험
                    </summary>
                    <form action={updateMockConnectionAction} className="flex flex-wrap gap-2">
                      <input name="connectionId" type="hidden" value={connection.id} />
                      <Button name="intent" type="submit" value="simulate_stale" variant="ghost">
                        오래됨 상태
                      </Button>
                      <Button name="intent" type="submit" value="simulate_error" variant="ghost">
                        오류 상태
                      </Button>
                    </form>
                  </details>
                ) : null}
              </article>
            );
          })}
      </section>
      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-[var(--ink)] p-5 text-white sm:p-6">
        <div className="flex gap-3">
          <ShieldCheck aria-hidden="true" className="size-6 shrink-0 text-[var(--accent)]" />
          <div>
            <h2 className="text-lg font-black">실제 연동은 아직 비활성</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Google OAuth는 Calendar 이벤트 생성·수정 범위만 요청하며 자격증명이 없으면 시작하지
              않습니다. KFTC 테스트베드는 서버 자격과 동의가 필요하고, 운영 모드는 기관
              신청·계약·보안 승인과 별도 릴리스 전까지 코드에서 강제로 차단합니다.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-extrabold text-[var(--accent)] underline-offset-4 hover:underline"
              href="/money/transactions/import"
            >
              자격증명 없이 CSV로 가져오기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
