import { BadgeCheck, GraduationCap, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { readDemoOnboardingState, readDemoSession } from "@/lib/auth/session";

export const metadata = { title: "프로필 설정" };

export default async function ProfileSettingsPage() {
  const [session, state] = await Promise.all([readDemoSession(), readDemoOnboardingState()]);
  if (!session) redirect("/login");
  if (!state) redirect("/onboarding");

  const fields = [
    ["이름", state.profile.displayName],
    ["학교", state.profile.school || "입력하지 않음"],
    ["전공", state.profile.major || "입력하지 않음"],
    ["학년", state.profile.academicYear ? `${state.profile.academicYear}학년` : "입력하지 않음"],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-dark)]">
          <GraduationCap aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-6 text-xs font-extrabold tracking-[0.14em] text-[var(--accent-dark)] uppercase">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--ink)] sm:text-4xl">
          내 프로필
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">
          학교·전공·학년은 선택 정보이며 우리집 멤버 목록이나 공유 화면에 노출하지 않습니다.
        </p>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="프로필 정보">
        {fields.map(([label, value]) => (
          <article className="rounded-3xl border border-[var(--line)] bg-white p-5" key={label}>
            <p className="text-xs font-bold text-[var(--muted-ink)]">{label}</p>
            <p className="mt-2 text-lg font-black text-[var(--ink)]">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 flex items-start gap-4 rounded-3xl bg-[var(--ink)] p-5 text-white sm:p-6">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" />
        <div>
          <h2 className="font-extrabold">개인 영역으로 보관</h2>
          <p className="mt-1 text-sm leading-6 text-white/70">
            프로필 조회 정책은 본인의 사용자 ID와 일치할 때만 허용합니다.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
            <BadgeCheck aria-hidden="true" className="size-4 text-[var(--accent)]" />
            로컬 데모 세션에서 확인됨
          </p>
        </div>
      </section>
    </div>
  );
}
