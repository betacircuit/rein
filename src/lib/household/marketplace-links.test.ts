import { describe, expect, test } from "vitest";

import { marketplaceLinksFor } from "@/lib/household/marketplace-links";

describe("household shopping marketplace links", () => {
  test("passes a normalized shopping item name only to approved HTTPS marketplaces", () => {
    const links = marketplaceLinksFor("  주방   세제  ");

    expect(links.map((link) => link.label)).toEqual(["당근", "쿠팡", "알리"]);
    expect(links).toHaveLength(3);

    for (const link of links) {
      const url = new URL(link.href);
      expect(url.protocol).toBe("https:");
      expect(["www.daangn.com", "www.coupang.com", "www.aliexpress.com"]).toContain(url.hostname);
      expect(decodeURIComponent(url.search)).toContain("주방 세제");
    }
  });

  test("encodes URL control characters instead of allowing a second destination", () => {
    const links = marketplaceLinksFor("휴지&redirect=https://example.com");

    expect(links.every((link) => !link.href.includes("redirect=https://"))).toBe(true);
  });
});
