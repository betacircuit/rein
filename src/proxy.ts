import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isProtectedAppPath } from "@/lib/routing/protected-app-path";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

function redirectWithCookies(request: NextRequest, target: string, source: NextResponse) {
  const redirected = NextResponse.redirect(new URL(target, request.url));
  source.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
  return redirected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId } = await refreshSupabaseSession(request);

  if (pathname === "/") {
    return redirectWithCookies(request, userId ? "/home" : "/login", response);
  }

  if (pathname === "/login" && userId) {
    return redirectWithCookies(request, "/home", response);
  }

  if (userId) {
    if (pathname === "/onboarding") {
      return redirectWithCookies(request, "/home", response);
    }
    if (pathname.startsWith("/tutoring/lessons")) {
      return redirectWithCookies(request, "/tutoring/schedule", response);
    }
  }

  if (isProtectedAppPath(pathname) && !userId) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return redirectWithCookies(request, `${login.pathname}${login.search}`, response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|favicon.ico).*)"],
};
