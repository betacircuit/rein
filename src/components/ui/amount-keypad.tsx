"use client";

import { Delete } from "lucide-react";
import { useState } from "react";

const amountKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "000"] as const;
const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits === "0" ? "" : digits;
}

export function appendAmountDigits(current: string, token: string, maximum: number) {
  const next = normalizeDigits(`${current}${token}`);
  if (!next) return "";
  return BigInt(next) <= BigInt(maximum) ? next : current;
}

export function AmountKeypad({
  defaultValue,
  disabled = false,
  id = "amount",
  label = "금액(원) *",
  maximum = 10_000_000_000,
  name = "amount",
}: {
  defaultValue?: number | string | undefined;
  disabled?: boolean;
  id?: string;
  label?: string;
  maximum?: number;
  name?: string;
}) {
  const descriptionId = `${id}-status`;
  const [amount, setAmount] = useState(() => normalizeDigits(String(defaultValue ?? "")));

  function replaceAmount(value: string) {
    const next = normalizeDigits(value);
    if (!next || BigInt(next) <= BigInt(maximum)) setAmount(next);
  }

  return (
    <div className="sm:col-span-2">
      <label className="text-sm font-bold" htmlFor={id}>
        {label}
      </label>
      <input name={name} type="hidden" value={amount} />
      <input
        aria-describedby={descriptionId}
        aria-required="true"
        className="mt-2 min-h-16 w-full border-[3px] border-black bg-white px-4 text-right text-3xl font-black tabular-nums outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        onChange={(event) => replaceAmount(event.target.value)}
        placeholder="0"
        required
        type="text"
        value={amount ? won.format(Number(amount)) : ""}
      />
      <p aria-live="polite" className="rein-meta mt-2 text-right" id={descriptionId}>
        {amount ? `${won.format(Number(amount))}원` : "금액 미입력"}
      </p>
      <div aria-label="금액 숫자판" className="rein-keypad mt-3" role="group">
        {amountKeys.map((token) => (
          <button
            aria-label={`${token} 입력`}
            className="rein-key"
            disabled={disabled || appendAmountDigits(amount, token, maximum) === amount}
            key={token}
            onClick={() => setAmount((current) => appendAmountDigits(current, token, maximum))}
            type="button"
          >
            {token}
          </button>
        ))}
        <button
          aria-label="금액 한 자리 지우기"
          className="rein-key rein-key--clear col-span-3"
          disabled={disabled || amount.length === 0}
          onClick={() => setAmount((current) => current.slice(0, -1))}
          type="button"
        >
          <Delete aria-hidden="true" className="size-5" />
          <span className="text-sm">지우기</span>
        </button>
      </div>
    </div>
  );
}
