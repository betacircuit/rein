"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordContribution, setContributionTerminalStatus } from "@/domain/grow/model";
import { createInternalTransfer } from "@/domain/money/ledger";
import { toKrw } from "@/domain/money/krw";
import { saveDemoGrowState } from "@/lib/grow/demo-store";
import { readGrowSnapshot } from "@/lib/grow/summary";
import { saveDemoMoneyState } from "@/lib/money/demo-store";

function revalidateGrow() {
  for (const path of [
    "/",
    "/home",
    "/money",
    "/money/grow",
    "/money/analytics",
    "/money/transactions",
  ]) {
    revalidatePath(path);
  }
}

export async function updateGrowPlanAction(formData: FormData) {
  const data = z
    .object({
      reserveAccountId: z.string().min(1),
      contributionAccountId: z.string().min(1),
      safetyReserveTarget: z.coerce.number().int().nonnegative(),
      ruleType: z.enum(["fixed", "percentage"]),
      ruleValue: z.coerce.number().nonnegative(),
      cap: z.coerce.number().int().nonnegative(),
    })
    .parse(Object.fromEntries(formData));
  const snapshot = await readGrowSnapshot();
  if (!snapshot) redirect("/login?next=/money/grow");
  const owned = new Set(
    snapshot.money.accounts
      .filter((item) => item.ownerId === snapshot.grow.userId)
      .map((item) => item.id),
  );
  if (!owned.has(data.reserveAccountId) || !owned.has(data.contributionAccountId))
    throw new Error("내 계좌를 선택해 주세요.");
  const rule =
    data.ruleType === "fixed"
      ? { type: "fixed" as const, value: toKrw(data.ruleValue), cap: toKrw(data.cap) }
      : {
          type: "percentage" as const,
          valueBasisPoints: BigInt(Math.round(data.ruleValue * 100)),
          cap: toKrw(data.cap),
        };
  if (rule.type === "percentage" && rule.valueBasisPoints > 10_000n)
    throw new Error("비율은 100% 이하여야 해요.");
  await saveDemoGrowState({
    ...snapshot.grow,
    plan: {
      ...snapshot.grow.plan,
      reserveAccountId: data.reserveAccountId,
      contributionAccountId: data.contributionAccountId,
      safetyReserveTarget: toKrw(data.safetyReserveTarget),
      rule,
      updatedAt: new Date().toISOString(),
    },
  });
  revalidateGrow();
  redirect("/money/grow?saved=1");
}

export async function recordGrowContributionAction(formData: FormData) {
  const data = z
    .object({ amount: z.coerce.number().int().positive() })
    .parse(Object.fromEntries(formData));
  const snapshot = await readGrowSnapshot();
  if (!snapshot) redirect("/login?next=/money/grow");
  const amount = toKrw(data.amount);
  const completed = snapshot.contribution?.completedAmount ?? 0n;
  if (amount > snapshot.plannedAmount - completed)
    throw new Error("남은 계획 금액을 넘을 수 없어요.");
  const from = snapshot.money.accounts.find(
    (item) => item.id === snapshot.grow.plan.reserveAccountId,
  );
  const to = snapshot.money.accounts.find(
    (item) => item.id === snapshot.grow.plan.contributionAccountId,
  );
  if (!from || !to || from.ownerId !== snapshot.grow.userId || to.ownerId !== snapshot.grow.userId)
    throw new Error("Grow 계좌 경계를 확인해 주세요.");
  if (from.currentBalance < amount) throw new Error("출금 계좌 잔액이 부족해요.");
  const transferGroupId = randomUUID();
  const now = new Date().toISOString();
  const legs = createInternalTransfer({
    idPrefix: transferGroupId,
    ownerId: snapshot.grow.userId,
    fromAccountId: from.id,
    toAccountId: to.id,
    amount,
    occurredAt: now,
    now,
    memo: `${snapshot.month} 장기 기여`,
  });
  await saveDemoMoneyState({
    ...snapshot.money,
    transactions: [...snapshot.money.transactions, ...legs],
    accounts: snapshot.money.accounts.map((account) =>
      account.id === from.id
        ? { ...account, currentBalance: toKrw(account.currentBalance - amount), balanceAsOf: now }
        : account.id === to.id
          ? { ...account, currentBalance: toKrw(account.currentBalance + amount), balanceAsOf: now }
          : account,
    ),
  });
  await saveDemoGrowState(
    recordContribution({
      state: snapshot.grow,
      contributionId: randomUUID(),
      month: snapshot.month,
      plannedAmount: snapshot.plannedAmount,
      transferGroupId,
      amount,
      now,
    }),
  );
  revalidateGrow();
  redirect("/money/grow?recorded=1");
}

export async function setGrowContributionStatusAction(formData: FormData) {
  const status = z.enum(["skipped", "cancelled"]).parse(formData.get("status"));
  const snapshot = await readGrowSnapshot();
  if (!snapshot) redirect("/login?next=/money/grow");
  await saveDemoGrowState(
    setContributionTerminalStatus({
      state: snapshot.grow,
      month: snapshot.month,
      status,
      plannedAmount: snapshot.plannedAmount,
      now: new Date().toISOString(),
    }),
  );
  revalidateGrow();
  redirect(`/money/grow?status=${status}`);
}
