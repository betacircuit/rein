"use client";

import { useState } from "react";

import { DataState, LoadingState, RetryButton } from "@/components/data-state";
import { Button } from "@/components/ui/button";

type PreviewState = "loading" | "empty" | "error" | "offline" | "stale";

export function StatePreview() {
  const [state, setState] = useState<PreviewState>("empty");
  const labels: Record<PreviewState, string> = {
    loading: "불러오기",
    empty: "비어 있음",
    error: "오류",
    offline: "오프라인",
    stale: "오래된 정보",
  };

  return (
    <section
      className="mt-6 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7"
      aria-labelledby="state-preview-title"
    >
      <h2 className="text-lg font-black" id="state-preview-title">
        상태 화면 점검
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">
        데이터 화면이 침묵하지 않도록 공통 상태를 직접 확인할 수 있어요.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="미리 볼 상태">
        {(Object.keys(labels) as PreviewState[]).map((item) => (
          <Button
            aria-pressed={state === item}
            key={item}
            onClick={() => setState(item)}
            size="default"
            variant={state === item ? "primary" : "outline"}
          >
            {labels[item]}
          </Button>
        ))}
      </div>
      <div className="mt-5">
        {state === "loading" && <LoadingState />}
        {state === "empty" && (
          <DataState
            description="첫 기록을 추가하면 이곳에서 바로 확인할 수 있어요."
            kind="empty"
            title="아직 기록이 없어요"
          />
        )}
        {state === "error" && (
          <DataState
            action={<RetryButton onClick={() => setState("empty")} />}
            description="연결 상태를 확인한 뒤 다시 시도해 주세요."
            kind="error"
            title="내용을 불러오지 못했어요"
          />
        )}
        {state === "offline" && (
          <DataState
            description="최근 읽은 내용만 볼 수 있어요. 기록 저장은 온라인에서 다시 시도해 주세요."
            kind="offline"
            title="인터넷에 연결되어 있지 않아요"
          />
        )}
        {state === "stale" && (
          <DataState
            description="마지막 성공 시점의 값입니다. 최신 값으로 오해하지 않도록 시점을 함께 표시해요."
            kind="stale"
            title="2026. 9. 2. 10:30 기준"
          />
        )}
      </div>
    </section>
  );
}
