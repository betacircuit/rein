import { describe, expect, it, vi } from "vitest";

import { clearPrivateNavigationCaches } from "@/components/pwa-runtime";

describe("PWA private cache boundary", () => {
  it("removes only authenticated navigation caches", async () => {
    const remove = vi.fn().mockResolvedValue(true);
    await clearPrivateNavigationCaches({
      keys: vi.fn().mockResolvedValue(["rein-private-v2", "rein-static-v3", "other"]),
      delete: remove,
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("rein-private-v2");
  });
});
