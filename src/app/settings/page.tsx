import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CircleUserRound,
  Database,
  House,
  LogOut,
  PlugZap,
  Tags,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { findIdentityByEmail } from "@/lib/auth/identities";
import { RAINY_GROQ_MARKER_COOKIE } from "@/lib/rainy/groq-key";
import { requireSupabaseUser } from "@/lib/supabase/server";
import { RainyProviderForm } from "./rainy-provider-form";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login");
  const identity = findIdentityByEmail(auth.user.email);
  const sessionConfigured = (await cookies()).get(RAINY_GROQ_MARKER_COOKIE)?.value === "1";
  const envConfigured = Boolean(process.env.GROQ_API_KEY?.trim());

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b-4 border-black bg-[var(--orange)] p-4 sm:p-5">
        <h1 className="mt-1 text-4xl font-black tracking-[-0.065em]">설정</h1>
      </header>
      <section className="rein-settings-grid">
        <article className="rein-settings-card rein-settings-card--home">
          <House aria-hidden="true" className="size-7" />
          <div>
            <p className="rein-meta">LINKED HOME / 2 USERS</p>
            <h2>최재원 × 김태현</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/settings/household">
              다시 설정
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </article>
        <RainyProviderForm envConfigured={envConfigured} sessionConfigured={sessionConfigured} />
      </section>
      <section aria-labelledby="settings-directory-title" className="rein-settings-directory">
        <div className="rein-settings-directory__head">
          <p className="rein-meta">CONTROL DESK / 06</p>
          <h2 id="settings-directory-title">세부 설정</h2>
        </div>
        <nav aria-label="세부 설정">
          {[
            {
              href: "/settings/profile",
              label: "내 정보",
              detail: "이름·학교·시간대",
              icon: CircleUserRound,
            },
            {
              href: "/settings/money",
              label: "수입·지출 분류",
              detail: "분류명과 표시 순서",
              icon: Tags,
            },
            {
              href: "/settings/tutoring",
              label: "과외 기본값",
              detail: "수업료·시간·Meet",
              icon: BookOpenCheck,
            },
            {
              href: "/settings/integrations",
              label: "외부 연결",
              detail: "Calendar 상태",
              icon: PlugZap,
            },
            {
              href: "/settings/notifications",
              label: "알림",
              detail: "수업·결제·집 할 일",
              icon: BellRing,
            },
            {
              href: "/settings/data",
              label: "데이터",
              detail: "백업·내보내기·삭제",
              icon: Database,
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <Link href={item.href as Route} key={item.href}>
                <span className="rein-settings-directory__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon aria-hidden="true" className="size-6" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
            );
          })}
        </nav>
      </section>
      <section className="mt-5 border-2 border-black bg-[var(--surface)] p-5 shadow-[5px_5px_0_#101010]">
        <p className="rein-meta">{identity?.displayName ?? "사용자"}</p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="outline">
            <LogOut aria-hidden="true" className="size-4" />
            로그아웃
          </Button>
        </form>
      </section>
    </div>
  );
}
