import { DoorOpen, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { readDemoSession } from "@/lib/auth/session";

import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "시작 설정" };

export default async function OnboardingPage() {
  const session = await readDemoSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 py-6 lg:grid-cols-[0.72fr_1.28fr] lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--ink)] text-white">
          <DoorOpen aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-6 text-sm font-extrabold tracking-[0.12em] text-[var(--accent-dark)] uppercase">
          Onboarding
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-balance text-[var(--ink)] sm:text-4xl">
          문턱을 넘기 전에 공유 범위를 정해요.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted-ink)]">
          프로필은 나에게, 우리집 운영 기록은 활성 멤버에게만 열립니다.
        </p>
        <div className="mt-6 rounded-3xl bg-[var(--ink)] p-5 text-white">
          <ShieldCheck aria-hidden="true" className="size-5 text-[var(--accent)]" />
          <p className="mt-8 text-sm font-extrabold">현재 역할</p>
          <p className="mt-1 text-xl font-black">
            {session.persona === "owner" ? "우리집 소유자" : "초대받은 멤버"}
          </p>
        </div>
      </aside>

      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <OnboardingForm persona={session.persona} />
      </section>
    </div>
  );
}
