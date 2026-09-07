import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { QuickAdd } from "@/components/quick-add";

vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

describe("CORE-002 quick add", () => {
  it("opens an accessible action sheet with all required creation paths", async () => {
    const user = userEvent.setup();
    render(<QuickAdd compact />);

    await user.click(screen.getByRole("button", { name: "빠른 기록 열기" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    for (const label of [
      "수업 추가",
      "수입 기록",
      "지출 기록",
      "입출금 확인",
      "구독 추가",
      "생활용품 추가",
      "공동비 추가",
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
  });
});
