import { LockKeyhole, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "개인정보와 권한" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white sm:p-9">
        <ShieldCheck aria-hidden="true" className="size-7 text-[var(--accent)]" />
        <p className="mt-10 text-xs font-extrabold tracking-[0.14em] text-[var(--accent)] uppercase">
          개인정보 보호 경계
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
          필요한 정보만, 필요한 사람에게만
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
          REIN은 개인 재무와 우리집 운영을 같은 앱에서 다루지만 같은 권한으로 열지 않습니다.
        </p>
      </header>
      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-[var(--line)] bg-white p-6">
          <LockKeyhole aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
          <h2 className="mt-8 text-lg font-black">개인 데이터</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
            프로필, 과외 학생, 계좌, 거래, 은행 연결은 소유자 본인만 조회합니다.
          </p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-white p-6">
          <Users aria-hidden="true" className="size-5 text-[var(--accent-dark)]" />
          <h2 className="mt-8 text-lg font-black">공유 데이터</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
            우리집 재고, 청소, 공동비와 정산은 활성 멤버에게만 보입니다.
          </p>
        </article>
      </section>
      <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-lg font-black">금융 정보 안내</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          잔액과 분석은 입력 또는 마지막 동기화 시점의 정보라 실제 값과 다를 수 있습니다. Student
          OS는 은행, 증권사, 세무사 또는 투자자문사가 아니며 송금·매매·세무 신고를 대신하지
          않습니다.
        </p>
      </section>
      <div className="mt-6">
        <Button asChild>
          <Link href="/login">로그인으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
