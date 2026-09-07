import { describe, expect, test } from "vitest";

import { isProtectedAppPath } from "@/lib/routing/protected-app-path";

describe("protected app route boundary", () => {
  test.each([
    "/home",
    "/money",
    "/household/shopping",
    "/household/cleaning/new",
    "/settings/integrations",
    "/settings/data/export",
  ])("keeps %s behind authentication", (pathname) => {
    expect(isProtectedAppPath(pathname)).toBe(true);
  });

  test.each(["/", "/login", "/manifest.webmanifest"])(
    "does not protect the public path %s",
    (pathname) => {
      expect(isProtectedAppPath(pathname)).toBe(false);
    },
  );
});
