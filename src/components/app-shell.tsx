"use client";

import { CalendarCheck2, House, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { BrutalistBackdrop } from "@/components/brutalist-backdrop";
import { RainyWeatherProvider } from "@/components/rainy-weather-controller";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "오늘", href: "/home", icon: CalendarCheck2 },
  { label: "학생", href: "/tutoring/students", icon: Users },
  { label: "자취방", href: "/household", icon: House },
  { label: "설정", href: "/settings", icon: Settings },
] as const;
const boundaryRoutes = ["/login", "/privacy", "/auth"];
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
function SkipLink() {
  return (
    <a
      className="fixed top-3 left-3 z-[100] -translate-y-24 border-2 border-black bg-[var(--cyan)] px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] focus:translate-y-0"
      href="#main-content"
    >
      본문으로 바로가기
    </a>
  );
}

export function AppShell({ children, rightRail }: { children: ReactNode; rightRail: ReactNode }) {
  const pathname = usePathname();
  const boundary = boundaryRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (boundary)
    return (
      <div className="min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
        <SkipLink />
        <main className="px-4 sm:px-6" id="main-content">
          {children}
        </main>
      </div>
    );
  return (
    <RainyWeatherProvider>
      <div className="relative min-h-dvh overflow-x-hidden bg-[var(--canvas)] text-[var(--ink)]">
        <BrutalistBackdrop />
        <SkipLink />
        <a
          className="fixed top-20 left-3 z-[100] -translate-y-40 border-2 border-black bg-[var(--warning-wash)] px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] focus:translate-y-0"
          href="#rainy-command"
        >
          RAINY로 바로가기
        </a>
        <aside className="rein-sidebar fixed inset-y-0 left-0 z-30 hidden w-[17rem] lg:flex lg:flex-col">
          <Link aria-label="REIN 오늘" className="rein-sidebar-logo" href="/home">
            <BrandLogo priority />
          </Link>
          <nav aria-label="주요 메뉴" className="mt-4 grid gap-2">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rein-side-link focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                    active && "is-active",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span aria-hidden="true" className="rein-nav-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="rein-nav-icon">
                    <Icon className="size-5" />
                  </span>
                  <span className="rein-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="rein-center-column relative z-10">
          <header className="rein-topbar sticky top-0 z-20">
            <Link className="rein-mobile-logo lg:hidden" href="/home">
              <BrandLogo priority />
            </Link>
          </header>
          <main
            className="rein-workspace mx-auto min-h-[calc(100dvh-5rem)] max-w-[92rem] px-4 pt-5 pb-28 sm:px-6 lg:mt-4 lg:px-7 lg:pb-10"
            id="main-content"
          >
            {children}
          </main>
        </div>
        <aside aria-label="RAINY 채팅" className="rein-right-sidebar">
          {rightRail}
        </aside>
        <nav
          aria-label="모바일 주요 메뉴"
          className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-black bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="grid h-[4.5rem] grid-cols-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-1 border-x border-transparent text-[10px] font-black text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                    active && "border-black bg-[var(--magenta)]",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </RainyWeatherProvider>
  );
}
