export type MarketplaceLink = {
  id: "daangn" | "coupang" | "aliexpress";
  label: "당근" | "쿠팡" | "알리";
  href: string;
};

function normalizedQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function marketplaceLinksFor(query: string): MarketplaceLink[] {
  const search = encodeURIComponent(normalizedQuery(query));

  return [
    {
      id: "daangn",
      label: "당근",
      href: `https://www.daangn.com/kr/buy-sell/?search=${search}`,
    },
    {
      id: "coupang",
      label: "쿠팡",
      href: `https://www.coupang.com/np/search?q=${search}`,
    },
    {
      id: "aliexpress",
      label: "알리",
      href: `https://www.aliexpress.com/wholesale?SearchText=${search}`,
    },
  ];
}
