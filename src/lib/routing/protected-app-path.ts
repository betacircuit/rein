const protectedRoots = ["/home", "/tutoring", "/money", "/household", "/settings"] as const;

export function isProtectedAppPath(pathname: string) {
  return protectedRoots.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
