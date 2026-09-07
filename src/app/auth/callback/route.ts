import { NextResponse } from "next/server";

export function GET(request: Request) {
  const target = new URL("/login", request.url);
  target.searchParams.set("error", "external-auth-unavailable");
  return NextResponse.redirect(target);
}
