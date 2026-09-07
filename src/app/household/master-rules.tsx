"use client";

import { ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  deleteMasterRuleAction,
  saveMasterRuleAction,
  type MasterRuleActionState,
} from "@/app/household/master-rules-actions";
import { Button } from "@/components/ui/button";

export type MasterRule = { id: string; title: string; detail: string | null };

const initialState: MasterRuleActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-11 w-full border-2 border-black bg-white px-3 text-sm font-bold outline-none";

function RuleForm({ rule, onDone }: { rule?: MasterRule; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveMasterRuleAction, initialState);

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="border-2 border-black bg-[var(--surface)] p-4">
      {rule && <input name="ruleId" type="hidden" value={rule.id} />}
      {state.status === "error" && (
        <p className="mb-3 border-2 border-black bg-[var(--danger-wash)] p-2 text-xs font-black">
          {state.message}
        </p>
      )}
      <label className="text-xs font-black" htmlFor={`rule-title-${rule?.id ?? "new"}`}>
        규칙
        <input
          className={fieldClass}
          defaultValue={rule?.title ?? ""}
          id={`rule-title-${rule?.id ?? "new"}`}
          maxLength={120}
          name="title"
          placeholder="예) 설거지는 그날 안에 끝낸다"
          required
        />
      </label>
      <label className="mt-3 block text-xs font-black" htmlFor={`rule-detail-${rule?.id ?? "new"}`}>
        설명 (선택)
        <input
          className={fieldClass}
          defaultValue={rule?.detail ?? ""}
          id={`rule-detail-${rule?.id ?? "new"}`}
          maxLength={500}
          name="detail"
          placeholder="예외나 배경이 있으면 적어 주세요"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <Button disabled={pending} size="default" type="submit">
          {pending ? "저장 중" : "저장"}
        </Button>
        <Button onClick={onDone} size="default" type="button" variant="outline">
          <X aria-hidden="true" className="size-4" />
          취소
        </Button>
      </div>
    </form>
  );
}

export function MasterRules({ rules }: { rules: MasterRule[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="rein-household-rules" aria-labelledby="household-rules-title">
      <header>
        <ListChecks aria-hidden="true" />
        <div>
          <p className="rein-meta">HOUSE RULES</p>
          <h2 id="household-rules-title">마스터 규칙</h2>
        </div>
        <Button onClick={() => setAdding(true)} variant="outline">
          <Plus aria-hidden="true" className="size-4" />
          규칙 추가
        </Button>
      </header>

      {adding && (
        <div className="mt-4">
          <RuleForm onDone={() => setAdding(false)} />
        </div>
      )}

      {rules.length === 0 && !adding && (
        <p className="mt-4 border-2 border-dashed border-black p-4 text-sm font-bold">
          아직 정한 규칙이 없어요. 집에서 꼭 지킬 것을 하나씩 적어 두면 서로 확인하기 쉬워집니다.
        </p>
      )}

      <ol>
        {rules.map((rule, index) =>
          editingId === rule.id ? (
            <li className="is-editing" key={rule.id}>
              <RuleForm onDone={() => setEditingId(null)} rule={rule} />
            </li>
          ) : (
            <li key={rule.id}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>
                {rule.title}
                {rule.detail && (
                  <small className="mt-1 block font-bold opacity-70">{rule.detail}</small>
                )}
              </span>
              <span className="flex gap-2">
                <Button
                  aria-label={`${rule.title} 수정`}
                  onClick={() => setEditingId(rule.id)}
                  size="default"
                  variant="outline"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <form action={deleteMasterRuleAction}>
                  <input name="ruleId" type="hidden" value={rule.id} />
                  <Button
                    aria-label={`${rule.title} 삭제`}
                    size="default"
                    type="submit"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </form>
              </span>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
