import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ConfirmActionForm, ConfirmSubmitButton } from "@/components/ui/confirm-action";

describe("UX-004 위험 동작 확인", () => {
  afterEach(() => vi.restoreAllMocks());

  test("폼 제출은 영향 설명을 거부하면 중단된다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const action = vi.fn();
    render(
      <ConfirmActionForm action={action} confirmMessage="연결 결과가 바뀝니다.">
        <button type="submit">연결 확정</button>
      </ConfirmActionForm>,
    );

    const form = screen.getByRole("button", { name: "연결 확정" }).closest("form");
    expect(fireEvent.submit(form!)).toBe(false);
    expect(window.confirm).toHaveBeenCalledWith("연결 결과가 바뀝니다.");
    expect(action).not.toHaveBeenCalled();
  });

  test("여러 submit intent 중 보호된 버튼만 확인한다", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <form>
        <button type="submit">동기화</button>
        <ConfirmSubmitButton confirmMessage="연동을 해제할까요?" type="submit">
          연결 해제
        </ConfirmSubmitButton>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "연결 해제" }));
    expect(window.confirm).toHaveBeenCalledWith("연동을 해제할까요?");
  });
});
