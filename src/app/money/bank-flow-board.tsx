"use client";

import { ArrowLeft, ArrowRight, GripVertical } from "lucide-react";
import { useState } from "react";

export type BankFlowItem = {
  id: "kb" | "kakao" | "woori";
  institution: string;
  role: string;
  tone: "magenta" | "yellow" | "cyan";
  balance: number;
  income: number;
  expense: number;
  prepared: boolean;
};

const accountOrder = { kb: 0, kakao: 1, woori: 2 } as const;
const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function BankFlowBoard({ items }: { items: BankFlowItem[] }) {
  const [order, setOrder] = useState<BankFlowItem["id"][]>(() =>
    [...items]
      .sort((left, right) => accountOrder[left.id] - accountOrder[right.id])
      .map((item) => item.id),
  );
  const [dragged, setDragged] = useState<BankFlowItem["id"] | null>(null);
  const ordered = order
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is BankFlowItem => Boolean(item));

  function commit(next: BankFlowItem["id"][]) {
    setOrder(next);
  }

  function move(id: BankFlowItem["id"], delta: -1 | 1) {
    const current = order.indexOf(id);
    const target = current + delta;
    if (current < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[current], next[target]] = [next[target]!, next[current]!];
    commit(next);
  }

  function dropOn(target: BankFlowItem["id"]) {
    if (!dragged || dragged === target) return;
    const next = order.filter((id) => id !== dragged);
    next.splice(next.indexOf(target), 0, dragged);
    commit(next);
    setDragged(null);
  }

  return (
    <div className="rein-bank-board">
      <div
        className="rein-bank-board__dropzone"
        aria-label="드래그로 순서를 바꿀 수 있는 나의 계좌"
      >
        {ordered.map((bank, index) => (
          <article
            className="rein-bank-card"
            data-dragging={dragged === bank.id}
            data-tone={bank.tone}
            draggable
            key={bank.id}
            onDragEnd={() => setDragged(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDragged(bank.id)}
            onDrop={() => dropOn(bank.id)}
          >
            <header>
              <span className="rein-bank-card__grip" aria-hidden="true">
                <GripVertical className="size-5" />
              </span>
              <div>
                <strong>{bank.institution}</strong>
                <span>{bank.role}</span>
              </div>
              <small>{bank.prepared ? "준비됨" : "준비 전"}</small>
            </header>
            <dl>
              <div>
                <dt>잔액</dt>
                <dd>{bank.prepared ? won.format(bank.balance) : "—"}</dd>
              </div>
              <div>
                <dt>수입</dt>
                <dd>+{won.format(bank.income)}</dd>
              </div>
              <div>
                <dt>지출</dt>
                <dd>−{won.format(bank.expense)}</dd>
              </div>
            </dl>
            <div className="rein-bank-card__move" aria-label={`${bank.institution} 표시 순서`}>
              <button
                aria-label={`${bank.institution} 왼쪽으로 이동`}
                disabled={index === 0}
                onClick={() => move(bank.id, -1)}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
              </button>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <button
                aria-label={`${bank.institution} 오른쪽으로 이동`}
                disabled={index === ordered.length - 1}
                onClick={() => move(bank.id, 1)}
                type="button"
              >
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="rein-bank-system__flow" aria-label="기본 자금 이동 구조">
        <strong>KB국민</strong>
        <ArrowRight aria-hidden="true" />
        <strong>카카오뱅크</strong>
        <ArrowRight aria-hidden="true" />
        <strong>우리은행</strong>
        <span>기본 이동 순서</span>
      </div>
    </div>
  );
}
