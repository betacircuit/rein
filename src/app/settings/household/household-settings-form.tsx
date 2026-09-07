"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { updateHouseholdSettings, type HouseholdSettingsState } from "./actions";

const initialState: HouseholdSettingsState = { status: "idle" };

export function HouseholdSettingsForm({ name, canEdit }: { name: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updateHouseholdSettings, initialState);
  return (
    <form action={action} className="rein-household-settings">
      <label htmlFor="householdName">집 이름</label>
      <div>
        <input defaultValue={name} disabled={!canEdit} id="householdName" name="householdName" />
        <Button disabled={!canEdit || pending} type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          저장
        </Button>
      </div>
      {!canEdit && <p>관리자 계정에서 변경할 수 있습니다.</p>}
      {state.message && (
        <p aria-live="polite" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
