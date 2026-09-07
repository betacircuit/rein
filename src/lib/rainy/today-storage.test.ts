import { describe, expect, it } from "vitest";

import { mergeTodayTasks, parseTodayStorage, type TodayTask } from "@/lib/rainy/today-storage";

const schedule = (id: string, title = id): TodayTask => ({
  id,
  title,
  time: "18:00",
  done: false,
  priority: false,
  source: "schedule",
});

describe("RAINY today storage", () => {
  it("rejects malformed payloads and filters invalid tasks", () => {
    expect(parseTodayStorage("{")).toBeNull();
    expect(parseTodayStorage(JSON.stringify({ tasks: [{ id: 1 }] }))).toEqual({ tasks: [] });
  });

  it("keeps local completion order while refreshing and pruning schedules", () => {
    const old = { ...schedule("schedule-a", "이전 이름"), done: true, priority: true };
    const rainy: TodayTask = {
      id: "task-local",
      title: "개인 할 일",
      time: null,
      done: false,
      priority: false,
      source: "rainy",
    };
    expect(
      mergeTodayTasks(
        [schedule("schedule-deleted"), rainy, old],
        [schedule("schedule-a", "현재 이름"), schedule("schedule-new")],
      ),
    ).toEqual([
      rainy,
      { ...schedule("schedule-a", "현재 이름"), done: true, priority: true },
      schedule("schedule-new"),
    ]);
  });
});
