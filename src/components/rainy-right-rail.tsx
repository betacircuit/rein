"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  LoaderCircle,
  MessageCircle,
  PanelRightClose,
  Send,
  Star,
} from "lucide-react";
import Image from "next/image";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { runRainyCommandAction } from "@/app/tutoring/schedule/actions";
import { useRainyWeather, type RainyAvatarState } from "@/components/rainy-weather-controller";
import { Button } from "@/components/ui/button";
import {
  containsRestrictedSecret,
  findRainyUiAction,
  isRainyRestrictedPath,
  RAINY_ACCESS_DENIED,
  routeRainySiteCommand,
  type RainySiteCommand,
} from "@/lib/rainy/site-command-router";
import {
  mergeTodayTasks,
  parseTodayStorage,
  type TodaySettings,
  type TodayTask,
} from "@/lib/rainy/today-storage";
import { parseTodayCommand } from "@/lib/rainy/today-command";

type ChatMessage = { id: string; role: "assistant" | "user"; text: string; tone?: "error" };
type ExecutionResult = { ok: boolean; message: string; blocked?: boolean };

const avatarSlots: Record<RainyAvatarState, { alt: string; label: string; src: string }> = {
  idle: { alt: "대기 중인 RAINY", label: "대기", src: "/rainy-mascot.png" },
  thinking: { alt: "명령을 해석 중인 RAINY", label: "해석 중", src: "/rainy-mascot.png" },
  executing: { alt: "사이트 작업을 실행 중인 RAINY", label: "실행 중", src: "/rainy-mascot.png" },
  blocked: { alt: "제한된 요청을 차단한 RAINY", label: "차단됨", src: "/rainy-mascot.png" },
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveTask(tasks: TodayTask[], sourceId: string, targetId: string) {
  const sourceIndex = tasks.findIndex((task) => task.id === sourceId);
  const targetIndex = tasks.findIndex((task) => task.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return tasks;
  const next = [...tasks];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) return tasks;
  next.splice(targetIndex, 0, moved);
  return next;
}

function moveVisibleTask(
  tasks: TodayTask[],
  visibleTasks: TodayTask[],
  sourceId: string,
  targetId: string,
) {
  const reordered = moveTask(visibleTasks, sourceId, targetId);
  const visibleIds = new Set(visibleTasks.map((task) => task.id));
  let visibleIndex = 0;
  return tasks.map((task) => {
    if (!visibleIds.has(task.id)) return task;
    const replacement = reordered[visibleIndex];
    visibleIndex += 1;
    return replacement ?? task;
  });
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR") ?? "";
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && !element.hidden;
}

function controlLabel(element: HTMLElement) {
  const labels =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
      ? Array.from(element.labels ?? []).map((label) => label.textContent)
      : [];
  return normalizeText(
    [
      ...labels,
      element.getAttribute("aria-label"),
      element.getAttribute("data-rainy-field"),
      element.getAttribute("data-rainy-action"),
      element.getAttribute("name"),
      element.getAttribute("placeholder"),
      element.textContent,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find((item) =>
      normalizeText(`${item.text} ${item.value}`).includes(normalizeText(value)),
    );
    if (!option) return false;
    element.value = option.value;
  } else {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) return false;
    setter.call(element, value);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.focus();
  return true;
}

function readVisibleSite(): ExecutionResult {
  const main = document.querySelector<HTMLElement>("#main-content");
  const title = main?.querySelector<HTMLElement>("h1")?.textContent?.trim() || document.title;
  const sections = Array.from(main?.querySelectorAll<HTMLElement>("h2") ?? [])
    .filter(isVisible)
    .map((heading) => heading.textContent?.trim())
    .filter(Boolean)
    .slice(0, 3);
  const sectionText = sections.length ? ` 주요 영역은 ${sections.join(", ")}입니다.` : "";
  return { ok: true, message: `${title} 화면입니다.${sectionText}` };
}

function scrollSite(command: Extract<RainySiteCommand, { type: "scroll" }>): ExecutionResult {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (command.target === "top" || command.target === "bottom") {
    const main = document.querySelector<HTMLElement>("#main-content");
    const bounds = main?.getBoundingClientRect();
    const mainTop = bounds ? window.scrollY + bounds.top : 0;
    const mainBottom = bounds
      ? window.scrollY + bounds.bottom - window.innerHeight
      : document.documentElement.scrollHeight;
    window.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: command.target === "top" ? Math.max(0, mainTop) : Math.max(mainTop, mainBottom),
    });
    return {
      ok: true,
      message: command.target === "top" ? "화면 위로 이동했습니다." : "화면 아래로 이동했습니다.",
    };
  }

  const main = document.querySelector<HTMLElement>("#main-content");
  const target =
    command.target === "form"
      ? main?.querySelector<HTMLElement>("form")
      : Array.from(main?.querySelectorAll<HTMLElement>("h1, h2, h3, section") ?? []).find(
          (element) => normalizeText(element.textContent).includes(normalizeText(command.query)),
        );
  if (!target) return { ok: false, message: "이 화면에서 요청한 위치를 찾지 못했습니다." };
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  return {
    ok: true,
    message:
      command.target === "form"
        ? "입력 양식으로 이동했습니다."
        : `${command.query} 영역으로 이동했습니다.`,
  };
}

function fillSiteField(
  pathname: string,
  command: Extract<RainySiteCommand, { type: "fill_field" }>,
): ExecutionResult {
  if (isRainyRestrictedPath(pathname)) {
    return { ok: false, blocked: true, message: RAINY_ACCESS_DENIED };
  }
  const query = normalizeText(command.field);
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "#main-content input:not([type='hidden']), #main-content textarea, #main-content select",
    ),
  );
  const matches = fields.filter(
    (candidate) =>
      isVisible(candidate) &&
      !candidate.disabled &&
      (!(candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement) ||
        !candidate.readOnly) &&
      !["password", "file"].includes(candidate instanceof HTMLInputElement ? candidate.type : "") &&
      controlLabel(candidate).includes(query),
  );
  if (matches.length !== 1) {
    return {
      ok: false,
      message:
        matches.length > 1
          ? `${command.field} 입력란이 여러 개라 실행하지 않았습니다.`
          : `${command.field} 입력란을 찾지 못했습니다.`,
    };
  }
  const [field] = matches;
  if (!field) return { ok: false, message: `${command.field} 입력란을 찾지 못했습니다.` };
  if (/(?:비밀번호|pin|token|secret|api\s*key|토큰|비밀|키)/i.test(controlLabel(field))) {
    return { ok: false, blocked: true, message: RAINY_ACCESS_DENIED };
  }
  if (!setNativeValue(field, command.value)) {
    return { ok: false, message: `${command.field} 값을 입력하지 못했습니다.` };
  }
  field.scrollIntoView({ behavior: "auto", block: "center" });
  return { ok: true, message: `${command.field} 입력란을 채웠습니다. 제출 전 내용을 확인하세요.` };
}

function activateSiteControl(
  pathname: string,
  command: Extract<RainySiteCommand, { type: "activate" }>,
): ExecutionResult {
  if (isRainyRestrictedPath(pathname)) {
    return { ok: false, blocked: true, message: RAINY_ACCESS_DENIED };
  }
  const action = findRainyUiAction(command.label, pathname);
  if (!action) return { ok: false, message: "이 화면에서 허용된 버튼이 아닙니다." };
  const matches = Array.from(document.querySelectorAll<HTMLButtonElement>(action.selector)).filter(
    (control) => control.type === "button" && !control.disabled && isVisible(control),
  );
  if (matches.length !== 1) {
    return { ok: false, message: "허용된 버튼의 상태를 확인하지 못해 실행하지 않았습니다." };
  }
  const [target] = matches;
  if (!target) return { ok: false, message: "요청한 버튼을 찾지 못했습니다." };
  target.click();
  target.focus();
  return { ok: true, message: `${action.label} 버튼을 실행했습니다.` };
}

export function RainyRightRail({
  dateLabel,
  storageDate,
  initialTasks,
}: {
  dateLabel: string;
  storageDate: string;
  initialTasks: TodayTask[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    avatarState,
    precipitation,
    setAvatarState,
    setPayloadWorkload,
    setTaskWorkload,
    strike,
  } = useRainyWeather();
  const [tasks, setTasks] = useState(initialTasks);
  const [settings, setSettings] = useState<TodaySettings>({
    focusMode: false,
    priorityOnly: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "rainy-hello",
      role: "assistant",
      text: isRainyRestrictedPath(pathname)
        ? "설정 화면은 보호 구역입니다. 조회와 이동만 가능하며 변경 요청은 차단됩니다."
        : "무엇을 바꿀까요?",
    },
  ]);
  const [command, setCommand] = useState("");
  const [denied, setDenied] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reorderNotice, setReorderNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [chatExpanded, setChatExpanded] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLElement>(null);
  const taskListRef = useRef<HTMLOListElement>(null);
  const commandRef = useRef<HTMLTextAreaElement>(null);
  const expandedFromRef = useRef<HTMLElement | null>(null);
  const suppressExpandRef = useRef(false);
  const hydratedStorageKeyRef = useRef<string | null>(null);
  const storageKey = `rein-rainy-today-v1:${storageDate}`;

  useEffect(() => {
    hydratedStorageKeyRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseTodayStorage(saved);
          if (!parsed) {
            window.localStorage.removeItem(storageKey);
            setTasks(initialTasks);
          } else {
            setTasks(mergeTodayTasks(parsed.tasks, initialTasks));
            if (parsed.settings) setSettings(parsed.settings);
          }
        } else {
          setTasks(initialTasks);
        }
      } catch {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Storage may be unavailable in hardened browser contexts.
        }
        setTasks(initialTasks);
      }
      hydratedStorageKeyRef.current = storageKey;
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialTasks, storageKey]);

  useEffect(() => {
    if (!storageReady || hydratedStorageKeyRef.current !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ tasks, settings }));
    } catch {
      // The current session remains usable even when storage is unavailable or full.
    }
  }, [settings, storageKey, storageReady, tasks]);

  useEffect(() => {
    const log = messagesRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (taskListRef.current) taskListRef.current.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    if (!chatExpanded) return;
    const chatElement = chatRef.current;
    const commandElement = commandRef.current;
    expandedFromRef.current = document.activeElement as HTMLElement | null;
    const backgroundSurfaces = [
      document.querySelector<HTMLElement>(".rein-center-column"),
      document.querySelector<HTMLElement>(".rein-sidebar"),
    ].filter((surface): surface is HTMLElement => Boolean(surface));
    backgroundSurfaces.forEach((surface) => {
      surface.inert = true;
    });
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handlePointerDown = (event: PointerEvent) => {
      if (!chatElement?.contains(event.target as Node)) setChatExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setChatExpanded(false);
        return;
      }
      if (event.key !== "Tab" || !chatElement) return;
      const focusable = Array.from(
        chatElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([hidden]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hidden && element.offsetParent !== null);
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => commandRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      backgroundSurfaces.forEach((surface) => {
        surface.inert = false;
      });
      document.body.style.overflow = previousBodyOverflow;
      window.requestAnimationFrame(() => {
        const previous = expandedFromRef.current;
        if (previous && !chatElement?.contains(previous)) {
          previous.focus();
          return;
        }
        suppressExpandRef.current = true;
        commandElement?.focus();
        suppressExpandRef.current = false;
      });
    };
  }, [chatExpanded]);

  const openCount = tasks.filter((task) => !task.done).length;
  useEffect(() => setTaskWorkload(openCount), [openCount, setTaskWorkload]);

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (settings.priorityOnly && !task.priority) return false;
        if (settings.focusMode && task.done) return false;
        return true;
      }),
    [settings, tasks],
  );

  function appendMessage(message: Omit<ChatMessage, "id">) {
    setMessages((current) => [...current.slice(-9), { ...message, id: makeId(message.role) }]);
  }

  function expandChat() {
    if (suppressExpandRef.current) return;
    if (window.matchMedia("(min-width: 1180px), (max-width: 1023px)").matches) {
      setChatExpanded(true);
    }
  }

  function assistant(text: string, tone?: "error") {
    appendMessage(tone ? { role: "assistant", text, tone } : { role: "assistant", text });
  }

  function finishExecution(result: ExecutionResult) {
    if (result.blocked) {
      setDenied(true);
      setAvatarState("blocked");
      window.requestAnimationFrame(() => commandRef.current?.focus());
      return;
    }
    assistant(result.message, result.ok ? undefined : "error");
    setAvatarState("idle");
    window.requestAnimationFrame(() => commandRef.current?.focus());
  }

  function executeSiteCommand(parsed: Exclude<RainySiteCommand, { type: "unknown" | "denied" }>) {
    if (parsed.type === "navigate") {
      router.push(parsed.href as Route);
      return {
        ok: true,
        message: `${parsed.label} 화면으로 이동했습니다.`,
      } satisfies ExecutionResult;
    }
    if (isRainyRestrictedPath(pathname)) {
      return { ok: false, blocked: true, message: RAINY_ACCESS_DENIED };
    }
    if (parsed.type === "read_site") return readVisibleSite();
    if (parsed.type === "scroll") return scrollSite(parsed);
    if (parsed.type === "fill_field") return fillSiteField(pathname, parsed);
    return activateSiteControl(pathname, parsed);
  }

  function runTodayCommand(input: string): ExecutionResult | null {
    const parsed = parseTodayCommand(input);
    if (parsed.type === "add_task") {
      const nextTask: TodayTask = {
        id: makeId("task"),
        title: parsed.title,
        time: parsed.time,
        done: false,
        priority: tasks.length === 0,
        source: "rainy",
      };
      setTasks((current) => [...current, nextTask]);
      return {
        ok: true,
        message: `${parsed.time ? `${parsed.time} ` : ""}${parsed.title}을 추가했습니다.`,
      };
    }
    if (parsed.type === "complete_task") {
      const target = parsed.query
        ? tasks.find((task) => task.title.includes(parsed.query) && !task.done)
        : tasks.find((task) => !task.done);
      if (!target) return { ok: false, message: "완료할 일을 찾지 못했습니다." };
      setTasks((current) =>
        current.map((task) => (task.id === target.id ? { ...task, done: true } : task)),
      );
      return { ok: true, message: `${target.title}, 완료했습니다.` };
    }
    if (parsed.type === "set_priority_only") {
      setSettings((current) => ({ ...current, priorityOnly: parsed.enabled }));
      return {
        ok: true,
        message: parsed.enabled ? "중요한 일만 표시합니다." : "오늘 할 일을 모두 표시합니다.",
      };
    }
    if (parsed.type === "set_focus_mode") {
      setSettings((current) => ({ ...current, focusMode: parsed.enabled }));
      return {
        ok: true,
        message: parsed.enabled ? "집중 모드를 켰습니다." : "집중 모드를 껐습니다.",
      };
    }
    return null;
  }

  function announceMove(title: string, direction: "위" | "아래") {
    setReorderNotice(`${title}을 ${direction}로 이동했습니다.`);
  }

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = command.trim();
    if (!input || isPending) return;
    if (containsRestrictedSecret(input)) {
      setCommand("");
      setDenied(true);
      setAvatarState("blocked");
      window.requestAnimationFrame(() => commandRef.current?.focus());
      return;
    }
    setCommand("");
    setDenied(false);
    appendMessage({ role: "user", text: input });
    setAvatarState("thinking");

    startTransition(async () => {
      try {
        await wait(650);
        const siteCommand = routeRainySiteCommand(input);
        if (siteCommand.type === "denied") {
          finishExecution({ ok: false, blocked: true, message: RAINY_ACCESS_DENIED });
          return;
        }
        if (siteCommand.type !== "unknown") {
          const result = executeSiteCommand(siteCommand);
          if (result.ok) {
            setAvatarState("executing");
            strike(JSON.stringify(siteCommand).length);
            await wait(120);
          }
          finishExecution(result);
          return;
        }

        const todayResult = runTodayCommand(input);
        if (todayResult) {
          setAvatarState("executing");
          strike(JSON.stringify(todayResult).length);
          await wait(120);
          finishExecution(todayResult);
          return;
        }

        if (/(?:수업|과외)/.test(input) && /(?:추가|등록|잡아|일정)/.test(input)) {
          setAvatarState("executing");
          strike(input.length);
          const formData = new FormData();
          formData.set("command", input);
          const result = await runRainyCommandAction({ status: "idle" }, formData);
          setPayloadWorkload(JSON.stringify(result).length);
          finishExecution({
            ok: result.status === "success",
            blocked: result.code === "restricted_domain",
            message: result.message ?? "수업 명령을 처리하지 못했습니다.",
          });
          return;
        }

        setAvatarState("executing");
        strike(input.length);
        const response = await fetch("/api/rainy/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages.slice(-5).map((message) => ({
                role: message.role,
                content: message.text,
              })),
              { role: "user", content: input },
            ],
          }),
        });
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = payload?.message ?? "대화 응답을 받지 못했습니다.";
        setPayloadWorkload(message.length);
        finishExecution({
          ok: response.ok,
          blocked: response.status === 403 && message === RAINY_ACCESS_DENIED,
          message,
        });
      } catch {
        setAvatarState("idle");
        assistant("명령 실행이 중단되었습니다. 다시 시도해 주세요.", "error");
      } finally {
        window.requestAnimationFrame(() => commandRef.current?.focus());
      }
    });
  }

  const avatar = avatarSlots[avatarState];
  const restrictedScreen = isRainyRestrictedPath(pathname);

  return (
    <div
      className="rainy-rail"
      data-expanded={chatExpanded ? "true" : "false"}
      data-focus={settings.focusMode ? "on" : "off"}
    >
      <header className="rainy-rail__agent-header">
        <div className="rainy-rail__identity">
          <h2 className="sr-only" id="rainy-rail-title">
            RAINY
          </h2>
        </div>
        <div className="rainy-rail__avatar" data-avatar-state={avatarState}>
          <Image
            alt={avatar.alt}
            className="rainy-rail__brand-art"
            height={508}
            priority
            src="/rainy-mascot.png"
            unoptimized
            width={492}
          />
          <Image
            alt=""
            aria-hidden="true"
            className="rainy-rail__header-cloud rainy-rail__header-cloud--small"
            height={1024}
            src="/rainy-cloud-cutout.png"
            unoptimized
            width={1536}
          />
          <Image
            alt=""
            aria-hidden="true"
            className="rainy-rail__header-cloud rainy-rail__header-cloud--tiny"
            height={1024}
            src="/rainy-cloud-cutout.png"
            unoptimized
            width={1536}
          />
        </div>
      </header>
      <section aria-labelledby="rainy-priority-title" className="rainy-rail__tasks" hidden>
        <header className="rainy-rail__section-head">
          <div>
            <p className="rein-meta">{dateLabel}</p>
            <h2 id="rainy-priority-title">주요 할 일</h2>
          </div>
          <button
            aria-label="중요한 일만 보기"
            aria-pressed={settings.priorityOnly}
            className="rainy-rail__filter"
            data-rainy-action="priority-filter"
            onClick={() =>
              setSettings((current) => ({ ...current, priorityOnly: !current.priorityOnly }))
            }
            type="button"
          >
            <Star aria-hidden="true" className="size-4" />
            {openCount}
          </button>
        </header>

        {visibleTasks.length ? (
          <ol className="rainy-rail__task-list" data-testid="today-task-list" ref={taskListRef}>
            {visibleTasks.map((task, index) => (
              <li
                className="rainy-rail__task"
                data-dragging={draggedId === task.id ? "true" : "false"}
                data-testid="today-task"
                key={task.id}
                onDragOver={(event) => {
                  if (draggedId) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain") || draggedId;
                  if (sourceId) {
                    setTasks((current) =>
                      moveVisibleTask(current, visibleTasks, sourceId, task.id),
                    );
                    const moved = tasks.find((item) => item.id === sourceId);
                    if (moved) setReorderNotice(`${moved.title} 순서를 변경했습니다.`);
                  }
                  setDraggedId(null);
                }}
              >
                <button
                  aria-label={`${task.title} 끌어서 순서 변경`}
                  className="rainy-rail__drag"
                  draggable
                  onDragEnd={() => setDraggedId(null)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", task.id);
                    setDraggedId(task.id);
                  }}
                  type="button"
                >
                  <GripVertical aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label={`${task.title} ${task.done ? "미완료로 되돌리기" : "완료하기"}`}
                  aria-pressed={task.done}
                  className="rainy-rail__check"
                  onClick={() =>
                    setTasks((current) =>
                      current.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item,
                      ),
                    )
                  }
                  type="button"
                >
                  <Check
                    aria-hidden="true"
                    className="size-4"
                    data-checked={task.done ? "true" : "false"}
                  />
                </button>
                <div className="rainy-rail__task-copy">
                  <span>{task.time ?? "시간 미정"}</span>
                  <strong>{task.title}</strong>
                  {task.detail && <small>{task.detail}</small>}
                </div>
                <button
                  aria-label={`${task.title} 중요 표시 ${task.priority ? "해제" : "설정"}`}
                  aria-pressed={task.priority}
                  className="rainy-rail__priority"
                  onClick={() =>
                    setTasks((current) =>
                      current.map((item) =>
                        item.id === task.id ? { ...item, priority: !item.priority } : item,
                      ),
                    )
                  }
                  type="button"
                >
                  <Star
                    aria-hidden="true"
                    className="size-4"
                    fill={task.priority ? "currentColor" : "none"}
                  />
                </button>
                <div className="rainy-rail__move">
                  <button
                    aria-label={`${task.title} 위로 이동`}
                    disabled={index === 0}
                    onClick={() => {
                      const targetId = visibleTasks[index - 1]?.id;
                      if (targetId) {
                        setTasks((current) =>
                          moveVisibleTask(current, visibleTasks, task.id, targetId),
                        );
                        announceMove(task.title, "위");
                      }
                    }}
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    aria-label={`${task.title} 아래로 이동`}
                    disabled={index === visibleTasks.length - 1}
                    onClick={() => {
                      const targetId = visibleTasks[index + 1]?.id;
                      if (targetId) {
                        setTasks((current) =>
                          moveVisibleTask(current, visibleTasks, task.id, targetId),
                        );
                        announceMove(task.title, "아래");
                      }
                    }}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rainy-rail__empty">
            {tasks.length ? "표시할 일이 없습니다." : "오늘 할 일이 없습니다."}
          </p>
        )}
        <p aria-live="polite" className="sr-only" role="status">
          {reorderNotice}
        </p>
      </section>

      <section
        aria-modal={chatExpanded || undefined}
        className="rainy-rail__chat"
        aria-label="RAINY 채팅"
        onPointerDownCapture={expandChat}
        ref={chatRef}
        role={chatExpanded ? "dialog" : undefined}
      >
        <output className="rainy-rail__precipitation" aria-label={`비 강도 ${precipitation}%`}>
          RAIN {precipitation}%
        </output>
        <button
          aria-expanded={chatExpanded}
          aria-label="RAINY 채팅창 접기"
          className="rainy-rail__collapse"
          hidden={!chatExpanded}
          onClick={(event) => {
            event.stopPropagation();
            setChatExpanded(false);
          }}
          type="button"
        >
          <PanelRightClose aria-hidden="true" className="size-5" />
        </button>
        {restrictedScreen && !denied && (
          <div className="rainy-rail__restriction-note" role="note">
            PROTECTED VIEW · 조회와 이동만 가능
          </div>
        )}
        {denied && (
          <div className="rainy-rail__denied" role="alert">
            {RAINY_ACCESS_DENIED}
          </div>
        )}

        <div
          aria-label="RAINY 대화 기록"
          aria-live="polite"
          aria-relevant="additions"
          className="rainy-rail__messages"
          ref={messagesRef}
          role="log"
          tabIndex={0}
        >
          {messages.map((message) => (
            <article
              className={`rainy-rail__message rainy-rail__message--${message.role}`}
              data-tone={message.tone}
              key={message.id}
            >
              {message.role === "assistant" ? (
                <span className="rainy-rail__profile">
                  <Image alt="" height={64} src="/rainy-mascot.png" unoptimized width={64} />
                </span>
              ) : (
                <span aria-hidden="true" className="rainy-rail__profile rainy-rail__profile--user">
                  나
                </span>
              )}
              <div className="rainy-rail__bubble">
                <strong>{message.role === "assistant" ? "RAINY" : "나"}</strong>
                <p>{message.text}</p>
              </div>
            </article>
          ))}
          {isPending && (
            <article className="rainy-rail__message rainy-rail__message--thinking" role="status">
              <span className="rainy-rail__profile">
                <Image alt="" height={64} src="/rainy-mascot.png" unoptimized width={64} />
              </span>
              <div className="rainy-rail__bubble">
                <strong>RAINY</strong>
                <p>
                  생각하는 중<span aria-hidden="true" className="rainy-rail__thinking-dots" />
                </p>
              </div>
            </article>
          )}
        </div>

        <form className="rainy-rail__composer" onSubmit={submitCommand}>
          <label className="sr-only" htmlFor="rainy-command">
            RAINY에게 명령하기
          </label>
          <div>
            <textarea
              aria-busy={isPending}
              id="rainy-command"
              maxLength={160}
              onChange={(event) => setCommand(event.target.value)}
              onFocus={expandChat}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="학생 목록으로 가줘"
              readOnly={isPending}
              ref={commandRef}
              rows={2}
              value={command}
            />
            <Button
              aria-label="RAINY에게 보내기"
              disabled={isPending || !command.trim()}
              type="submit"
            >
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="size-5" />
              )}
            </Button>
          </div>
        </form>
      </section>
      <button
        aria-expanded={chatExpanded}
        aria-label="RAINY 채팅 열기"
        className="rainy-rail__mobile-launcher"
        hidden={chatExpanded}
        onClick={expandChat}
        type="button"
      >
        <span className="rainy-rail__mobile-launcher-avatar" aria-hidden="true">
          <Image alt="" height={64} src="/rainy-mascot.png" unoptimized width={64} />
        </span>
        <MessageCircle aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
