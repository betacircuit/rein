import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PwaRuntime } from "@/components/pwa-runtime";
import { RainyRightRailServer } from "@/components/rainy-right-rail-server";

import "./globals.css";

const plexKorean = IBM_Plex_Sans_KR({
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  preload: false,
  variable: "--font-plex-korean",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  display: "swap",
  fallback: ["Consolas", "monospace"],
  preload: false,
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "REIN",
  title: { default: "REIN", template: "%s · REIN" },
  description: "과외, 실제 현금 흐름, 구독과 우리집 일을 한곳에서 관리하는 학생용 개인 운영 앱",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/rein-logo.png",
    apple: "/rein-logo.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "REIN" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2fc0cf",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${plexKorean.variable} ${plexMono.variable}`} lang="ko">
      <body>
        <PwaRuntime />
        <AppShell rightRail={<RainyRightRailServer />}>{children}</AppShell>
      </body>
    </html>
  );
}
