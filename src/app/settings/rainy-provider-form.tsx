"use client";

import { KeyRound, LoaderCircle, Unplug } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  removeRainyProviderKey,
  saveRainyProviderKey,
  type RainyProviderState,
} from "./rainy-actions";

const initialState: RainyProviderState = { status: "idle" };

export function RainyProviderForm({
  envConfigured,
  sessionConfigured,
}: {
  envConfigured: boolean;
  sessionConfigured: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState(saveRainyProviderKey, initialState);
  const [removeState, removeAction, removePending] = useActionState(
    removeRainyProviderKey,
    initialState,
  );
  const sessionReady =
    saveState.status === "saved" || (sessionConfigured && removeState.status !== "removed");
  const message = removeState.message ?? saveState.message;

  return (
    <div className="rein-settings-provider">
      <div className="rein-settings-provider__status">
        <KeyRound aria-hidden="true" className="size-5" />
        <div>
          <h2>RAINY · GROQ</h2>
          <p>
            {sessionReady
              ? "연결됨 · 세션 전용"
              : envConfigured
                ? "연결됨 · 서버 설정(GROQ_API_KEY)"
                : "연결 안 됨"}
          </p>
        </div>
      </div>
      <form action={saveAction} className="rein-settings-provider__form">
        <label htmlFor="rainy-groq-key">API 키</label>
        <input
          autoComplete="off"
          id="rainy-groq-key"
          name="apiKey"
          placeholder="gsk_••••••••"
          required
          spellCheck={false}
          type="password"
        />
        <Button disabled={savePending} type="submit">
          {savePending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          연결
        </Button>
      </form>
      {sessionReady && (
        <form action={removeAction}>
          <Button disabled={removePending} type="submit" variant="outline">
            <Unplug aria-hidden="true" className="size-4" />
            연결 해제
          </Button>
        </form>
      )}
      {message && (
        <p aria-live="polite" className="rein-settings-provider__message" role="status">
          {message}
        </p>
      )}
      <p className="rein-settings-provider__note">
        대화 내용은 응답 생성을 위해 Groq로 전송됩니다.
      </p>
    </div>
  );
}
