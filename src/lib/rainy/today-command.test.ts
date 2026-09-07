import { describe, expect, it } from "vitest";

import { parseTodayCommand } from "./today-command";

describe("parseTodayCommand", () => {
  it("extracts a timed task", () => {
    expect(parseTodayCommand("오늘 오후 3시 과제 제출 추가해줘")).toEqual({
      type: "add_task",
      title: "과제 제출",
      time: "15:00",
    });
  });

  it("does not mistake a duration for a clock time", () => {
    expect(parseTodayCommand("운동 30분 할 일에 추가해줘")).toEqual({
      type: "add_task",
      title: "운동 30분",
      time: null,
    });
  });

  it("parses view and focus settings", () => {
    expect(parseTodayCommand("중요한 일만 보여줘")).toEqual({
      type: "set_priority_only",
      enabled: true,
    });
    expect(parseTodayCommand("집중 모드 꺼줘")).toEqual({
      type: "set_focus_mode",
      enabled: false,
    });
  });

  it("extracts the completion target", () => {
    expect(parseTodayCommand("과제 제출 완료했어")).toEqual({
      type: "complete_task",
      query: "과제 제출",
    });
  });
});
