"use client";

import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import { completeLocalOnboarding, type OnboardingActionState } from "./actions";

const initialOnboardingState: OnboardingActionState = { status: "idle" };

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm font-semibold text-[var(--danger-ink)]" id={id}>
      {message}
    </p>
  );
}

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-4 text-base text-[var(--ink)] outline-none transition-shadow focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20";

export function OnboardingForm({ persona }: { persona: "owner" | "roommate" }) {
  const [state, action, pending] = useActionState(completeLocalOnboarding, initialOnboardingState);
  const errorRef = useRef<HTMLDivElement>(null);
  const ownerJourney = persona === "owner";

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  const error = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={action} className="mt-7 space-y-7" noValidate>
      <input name="journey" type="hidden" value={persona} />
      {state.status === "error" && (
        <div
          className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-wash)] p-4 text-sm text-[var(--danger-ink)] outline-none"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <h2 className="font-extrabold">입력 내용을 확인해 주세요</h2>
          <p className="mt-1">
            {state.message ?? "표시된 항목을 고치면 다음 단계로 갈 수 있어요."}
          </p>
        </div>
      )}

      <fieldset>
        <legend className="flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--ink)] text-xs text-white">
            1
          </span>
          내 프로필
        </legend>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          학교·전공·학년은 선택 사항이며 우리집 멤버에게 공개하지 않아요.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold" htmlFor="displayName">
              이름
            </label>
            <input
              aria-describedby={error("displayName") ? "displayName-error" : undefined}
              aria-invalid={Boolean(error("displayName"))}
              className={inputClass}
              defaultValue={ownerJourney ? "최재원" : "룸메이트"}
              id="displayName"
              name="displayName"
            />
            <FieldError id="displayName-error" message={error("displayName")} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="academicYear">
              학년
            </label>
            <input
              aria-describedby={error("academicYear") ? "academicYear-error" : undefined}
              aria-invalid={Boolean(error("academicYear"))}
              className={inputClass}
              defaultValue={ownerJourney ? "2" : ""}
              id="academicYear"
              inputMode="numeric"
              max="12"
              min="1"
              name="academicYear"
              type="number"
            />
            <FieldError id="academicYear-error" message={error("academicYear")} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="school">
              학교 선택
            </label>
            <input
              className={inputClass}
              defaultValue={ownerJourney ? "서울대학교" : ""}
              id="school"
              name="school"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="major">
              전공 선택
            </label>
            <input
              className={inputClass}
              defaultValue={ownerJourney ? "전기정보공학부" : ""}
              id="major"
              name="major"
            />
          </div>
        </div>
      </fieldset>

      <div aria-hidden="true" className="h-px bg-[var(--line)]" />

      <fieldset>
        <legend className="flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-xs text-[var(--accent-ink)]">
            2
          </span>
          {ownerJourney ? "우리집 만들기" : "우리집 초대 수락"}
        </legend>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
          {ownerJourney
            ? "가구는 공유 데이터의 경계이며 멤버 수를 둘로 고정하지 않아요."
            : "초대 이메일과 로그인 계정이 일치할 때만 활성 멤버가 됩니다."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-bold" htmlFor="householdName">
              우리집 이름
            </label>
            <input
              aria-describedby={error("householdName") ? "householdName-error" : undefined}
              aria-invalid={Boolean(error("householdName"))}
              className={inputClass}
              defaultValue="관악 두 칸 집"
              id="householdName"
              name="householdName"
            />
            <FieldError id="householdName-error" message={error("householdName")} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="roommateName">
              룸메이트 이름
            </label>
            <input
              className={inputClass}
              defaultValue="룸메이트"
              id="roommateName"
              name="roommateName"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="roommateEmail">
              초대 이메일
            </label>
            <input
              aria-describedby={
                error("roommateEmail") ? "roommateEmail-error" : "roommateEmail-help"
              }
              aria-invalid={Boolean(error("roommateEmail"))}
              className={inputClass}
              defaultValue="roommate@demo.local"
              id="roommateEmail"
              name="roommateEmail"
              readOnly={!ownerJourney}
              type="email"
            />
            <p className="mt-2 text-xs text-[var(--muted-ink)]" id="roommateEmail-help">
              {ownerJourney
                ? "데모에서는 실제 메일을 보내지 않아요."
                : "이 계정으로 받은 대기 초대예요."}
            </p>
            <FieldError id="roommateEmail-error" message={error("roommateEmail")} />
          </div>
        </div>
      </fieldset>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <p className="flex items-center gap-2 text-sm font-extrabold text-[var(--ink)]">
          <Check aria-hidden="true" className="size-4 text-[var(--accent-dark)]" />
          로컬 데모 저장 범위
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">
          입력값은 암호화된 HttpOnly 데모 쿠키에 8시간만 보관하며 원격 데이터베이스에는 쓰지 않아요.
        </p>
      </div>

      <Button className="w-full" disabled={pending} size="large" type="submit">
        {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {pending
          ? "경계 확인 중"
          : ownerJourney
            ? "우리집 만들고 초대하기"
            : "초대 수락하고 들어가기"}
        {!pending && <ArrowRight aria-hidden="true" className="size-4" />}
      </Button>
    </form>
  );
}
