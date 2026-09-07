export type TodayTask = {
  id: string;
  title: string;
  detail?: string;
  time: string | null;
  done: boolean;
  priority: boolean;
  source: "schedule" | "rainy";
};

export type TodaySettings = { focusMode: boolean; priorityOnly: boolean };

export type TodayStorage = { tasks: TodayTask[]; settings?: TodaySettings };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTodayTask(value: unknown): value is TodayTask {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.detail === undefined || typeof value.detail === "string") &&
    (value.time === null || typeof value.time === "string") &&
    typeof value.done === "boolean" &&
    typeof value.priority === "boolean" &&
    (value.source === "schedule" || value.source === "rainy")
  );
}

export function parseTodayStorage(raw: string): TodayStorage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return null;
    const tasks = parsed.tasks.filter(isTodayTask);
    const settings = parsed.settings;
    return {
      tasks,
      ...(isRecord(settings) &&
      typeof settings.focusMode === "boolean" &&
      typeof settings.priorityOnly === "boolean"
        ? { settings: settings as TodaySettings }
        : {}),
    };
  } catch {
    return null;
  }
}

export function mergeTodayTasks(saved: TodayTask[], currentSchedules: TodayTask[]) {
  const schedulesById = new Map(currentSchedules.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const merged = saved.flatMap((task) => {
    if (seen.has(task.id)) return [];
    seen.add(task.id);
    if (task.source === "rainy") return [task];
    const current = schedulesById.get(task.id);
    if (!current) return [];
    return [{ ...current, done: task.done, priority: task.priority }];
  });
  return [...merged, ...currentSchedules.filter((task) => !seen.has(task.id))];
}
