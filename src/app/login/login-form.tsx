"use client";

import { BellRing, Delete, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import { signInAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = { status: "idle" };
const identities = ["최재원", "김태현"] as const;
const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const subscribeToHydration = () => () => undefined;

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [loginId, setLoginId] = useState<(typeof identities)[number] | "">("");
  const [pin, setPin] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  useEffect(() => {
    function handleHardwareKey(event: KeyboardEvent) {
      if (!hydrated || pending || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setPin((current) => (current.length < 4 ? `${current}${event.key}` : current));
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        setPin((current) => current.slice(0, -1));
        return;
      }
      if (event.key === "Enter" && loginId && pin.length === 4) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }

    window.addEventListener("keydown", handleHardwareKey);
    return () => window.removeEventListener("keydown", handleHardwareKey);
  }, [hydrated, loginId, pending, pin.length]);

  function pressDigit(digit: string) {
    setPin((current) => (current.length < 4 ? `${current}${digit}` : current));
  }

  function ringDoorbell() {
    navigator.vibrate?.([25, 35, 55]);
  }

  return (
    <form
      action={action}
      className="rein-login-form"
      noValidate
      onSubmit={ringDoorbell}
      ref={formRef}
    >
      {state.status === "error" && (
        <div
          className="border-2 border-black bg-[var(--danger-wash)] p-3 text-sm font-black text-[var(--danger-ink)] outline-none"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          {state.message ?? state.errors?.loginId?.[0] ?? state.errors?.password?.[0]}
        </div>
      )}

      <fieldset>
        <legend className="rein-meta mb-2">호출할 이름</legend>
        <input name="loginId" type="hidden" value={loginId} />
        <div className="grid grid-cols-2 gap-2">
          {identities.map((identity) => (
            <button
              aria-pressed={loginId === identity}
              className={cn("rein-doorbell-user", loginId === identity && "is-selected")}
              disabled={!hydrated || pending}
              key={identity}
              onClick={() => setLoginId(identity)}
              type="button"
            >
              <span aria-hidden="true" className="rein-doorbell-led" />
              {identity}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="rein-meta block" htmlFor="password">
        PIN 번호판
        <input
          aria-describedby="pin-status"
          autoComplete="current-password"
          className="rein-pin-display mt-2"
          id="password"
          inputMode="numeric"
          disabled={!hydrated || pending}
          maxLength={4}
          minLength={4}
          name="password"
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          pattern="[0-9]{4}"
          required
          type="password"
          value={pin}
        />
      </label>
      <p aria-live="polite" className="rein-meta text-center" id="pin-status">
        [ {pin.length} / 4 입력됨 ]
      </p>

      <div aria-label="PIN 번호판" className="rein-keypad" role="group">
        {keypad.map((digit) => (
          <button
            aria-label={`${digit} 입력`}
            className="rein-key"
            disabled={!hydrated || pending || pin.length >= 4}
            key={digit}
            onClick={() => pressDigit(digit)}
            type="button"
          >
            {digit}
          </button>
        ))}
        <button
          aria-label="PIN 한 자리 지우기"
          className="rein-key rein-key--clear"
          disabled={!hydrated || pending || pin.length === 0}
          onClick={() => setPin((current) => current.slice(0, -1))}
          type="button"
        >
          <Delete aria-hidden="true" className="size-5" />
        </button>
        <button
          aria-label="0 입력"
          className="rein-key"
          disabled={!hydrated || pending || pin.length >= 4}
          onClick={() => pressDigit("0")}
          type="button"
        >
          0
        </button>
        <button
          aria-label="로그인"
          className="rein-key rein-key--ring"
          disabled={!hydrated || pending || !loginId || pin.length !== 4}
          type="submit"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          ) : (
            <BellRing aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
      <p className="rein-meta text-center">이름 선택 → PIN 4자리 → 벨</p>
    </form>
  );
}
