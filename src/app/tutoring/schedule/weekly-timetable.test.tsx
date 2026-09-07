import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WeeklyTimetable } from "./weekly-timetable";

describe("주간 시간표 편집", () => {
  it("겹치는 학생·개인 일정을 서로 다른 레인에 표시한다", () => {
    const { container } = render(
      <WeeklyTimetable
        editable={false}
        personalSchedules={[
          {
            id: "personal-a",
            title: "운동",
            weekday: 3,
            startTime: "18:30",
            durationMinutes: 60,
            creationOrder: 1,
            colorIndex: 0,
          },
        ]}
        schedules={[
          {
            id: "student-a",
            studentId: "student-a",
            studentName: "김민준",
            weekday: 3,
            startTime: "18:00",
            durationMinutes: 120,
          },
        ]}
      />,
    );

    const blocks = [...container.querySelectorAll<HTMLElement>(".rein-schedule-block")];
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.style.width).toBe("calc(50% - 0.5rem)");
    expect(blocks[1]?.style.left).toBe("calc(50% + 0.25rem)");
  });

  it("저장 전 손잡이를 방향키로 15분 이동할 수 있다", () => {
    const onDraftMove = vi.fn();
    render(
      <WeeklyTimetable
        draft={{
          kind: "personal",
          title: "운동",
          weekday: 3,
          startTime: "18:00",
          durationMinutes: 60,
          colorIndex: 0,
        }}
        editable={false}
        onDraftMove={onDraftMove}
        schedules={[]}
      />,
    );

    fireEvent.keyDown(screen.getAllByRole("button", { name: /저장 전 일정 이동/ })[0]!, {
      key: "ArrowDown",
    });
    expect(onDraftMove).toHaveBeenCalledWith(3, "18:15");
  });

  it("shows quarter-hour guides only while a preview can be moved", () => {
    const { container, rerender } = render(<WeeklyTimetable editable={false} schedules={[]} />);
    expect(container.querySelectorAll(".rein-schedule-quarter-tick")).toHaveLength(0);

    rerender(
      <WeeklyTimetable
        draft={{
          kind: "personal",
          title: "preview",
          weekday: 3,
          startTime: "18:00",
          durationMinutes: 60,
          colorIndex: 0,
        }}
        editable={false}
        onDraftMove={vi.fn()}
        schedules={[]}
      />,
    );
    expect(container.querySelectorAll(".rein-schedule-quarter-tick").length).toBeGreaterThan(0);
  });
});
