"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toKrw } from "@/domain/money/krw";
import { deterministicSubscriptionInsights } from "@/domain/grow/model";
import { readDemoGrowState, saveDemoGrowState } from "@/lib/grow/demo-store";
import {
  addDateDays,
  changeSubscriptionPrice,
  confirmSubscriptionMatch,
  materializeSubscriptionOccurrences,
  resetSubscriptionForecast,
  transitionSubscriptionStatus,
  type Subscription,
  type SubscriptionState,
} from "@/domain/subscriptions/model";
import { formatSeoulDateKey } from "@/lib/format/date";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";
import {
  readDemoSubscriptionState,
  refreshSubscriptionSuggestions,
  saveDemoSubscriptionState,
} from "@/lib/subscriptions/demo-store";

export type SubscriptionActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);
const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "날짜를 확인해 주세요.");
const subscriptionSchema = z
  .object({
    subscriptionId: z.string().optional(),
    name: z.string().trim().min(1, "구독 이름을 입력해 주세요.").max(80),
    providerName: optionalText,
    planName: optionalText,
    category: z.enum([
      "ai_software",
      "cloud_storage",
      "education",
      "entertainment",
      "communication",
      "fitness",
      "news",
      "other",
    ]),
    status: z.enum(["trial", "active", "paused", "cancelled", "ended"]),
    amount: z.coerce.number().int().positive("금액은 1원 이상이어야 해요."),
    billingCycle: z.enum(["weekly", "monthly", "quarterly", "semiannual", "yearly", "custom_days"]),
    customCycleDays: optionalText,
    startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    billingAnchorOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nextBillingOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    trialEndsOn: optionalDate,
    cancelByOn: optionalDate,
    autoRenews: z.string().optional(),
    paymentAccountId: optionalText,
    scope: z.enum(["private", "household"]),
    payerMemberId: optionalText,
    ownerShare: z.coerce.number().min(0).max(100),
    roommateShare: z.coerce.number().min(0).max(100),
    descriptorAliases: z.string(),
    reminderDaysBefore: z.string(),
    serviceUrl: optionalText.refine(
      (value) => value === null || /^https:\/\//i.test(value),
      "서비스 주소는 https://로 시작해야 해요.",
    ),
    notes: optionalText,
    priceEffectiveOn: optionalDate,
    priceNote: optionalText,
  })
  .superRefine((value, context) => {
    if (value.billingCycle === "custom_days") {
      const days = Number(value.customCycleDays);
      if (!Number.isInteger(days) || days < 1 || days > 3_650)
        context.addIssue({
          code: "custom",
          path: ["customCycleDays"],
          message: "사용자 지정 주기는 1~3650일이어야 해요.",
        });
    }
    if (
      value.scope === "household" &&
      Math.round(value.ownerShare * 100) + Math.round(value.roommateShare * 100) !== 10_000
    )
      context.addIssue({
        code: "custom",
        path: ["ownerShare"],
        message: "공동 구독 분담률의 합은 100%여야 해요.",
      });
    if (value.status === "trial" && !value.trialEndsOn)
      context.addIssue({
        code: "custom",
        path: ["trialEndsOn"],
        message: "체험 상태에는 체험 종료일이 필요해요.",
      });
  });

async function demoSubscriptionState() {
  const runtime = readRuntimeSafetyConfig(process.env);
  assertSafeRuntime(runtime);
  if (!runtime.DEMO_MODE) throw new Error("실제 구독 저장소 자격증명이 연결되지 않았어요.");
  const state = await readDemoSubscriptionState();
  if (!state) throw new Error("세션이 만료되었어요. 다시 로그인해 주세요.");
  return state;
}

function input(formData: FormData) {
  return subscriptionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId") || undefined,
    name: formData.get("name"),
    providerName: formData.get("providerName") || "",
    planName: formData.get("planName") || "",
    category: formData.get("category"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    billingCycle: formData.get("billingCycle"),
    customCycleDays: formData.get("customCycleDays") || "",
    startedOn: formData.get("startedOn"),
    billingAnchorOn: formData.get("billingAnchorOn"),
    nextBillingOn: formData.get("nextBillingOn"),
    trialEndsOn: formData.get("trialEndsOn") || "",
    cancelByOn: formData.get("cancelByOn") || "",
    autoRenews: formData.get("autoRenews") || undefined,
    paymentAccountId: formData.get("paymentAccountId") || "",
    scope: formData.get("scope"),
    payerMemberId: formData.get("payerMemberId") || "",
    ownerShare: formData.get("ownerShare") || "100",
    roommateShare: formData.get("roommateShare") || "0",
    descriptorAliases: formData.get("descriptorAliases") || "",
    reminderDaysBefore: formData.get("reminderDaysBefore") || "",
    serviceUrl: formData.get("serviceUrl") || "",
    notes: formData.get("notes") || "",
    priceEffectiveOn: formData.get("priceEffectiveOn") || "",
    priceNote: formData.get("priceNote") || "",
  });
}

function cleanList(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function reminders(value: string) {
  const result = [...new Set(cleanList(value).map(Number))];
  if (result.some((item) => !Number.isInteger(item) || item < 0 || item > 365))
    throw new Error("알림 시점은 0~365 사이의 일수로 입력해 주세요.");
  return result.sort((left, right) => right - left);
}

function splitRows(state: SubscriptionState, subscriptionId: string, ownerShare: number) {
  const owner = state.members.find((item) => item.isCurrentUser);
  const roommate = state.members.find((item) => !item.isCurrentUser);
  if (!owner || !roommate) throw new Error("활성 우리집 구성원 두 명을 찾지 못했어요.");
  const ownerBasisPoints = Math.round(ownerShare * 100);
  return [
    { subscriptionId, memberId: owner.id, shareBasisPoints: ownerBasisPoints },
    { subscriptionId, memberId: roommate.id, shareBasisPoints: 10_000 - ownerBasisPoints },
  ];
}

export async function saveSubscriptionAction(
  _previous: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const parsed = input(formData);
  if (!parsed.success)
    return {
      status: "error",
      message: "입력한 구독 정보를 다시 확인해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  const subscriptionId = parsed.data.subscriptionId ?? randomUUID();
  try {
    let state = await demoSubscriptionState();
    const today = formatSeoulDateKey();
    const money = await readDemoMoneyState();
    if (
      parsed.data.paymentAccountId &&
      !money?.accounts.some(
        (account) =>
          account.id === parsed.data.paymentAccountId && account.ownerId === state.userId,
      )
    )
      return { status: "error", message: "내 결제 계좌를 선택해 주세요." };
    const existing = state.subscriptions.find((item) => item.id === subscriptionId);
    const scheduleChanged =
      existing &&
      (existing.billingCycle !== parsed.data.billingCycle ||
        existing.customCycleDays !==
          (parsed.data.billingCycle === "custom_days"
            ? Number(parsed.data.customCycleDays)
            : null) ||
        existing.billingAnchorOn !== parsed.data.billingAnchorOn ||
        existing.nextBillingOn !== parsed.data.nextBillingOn);
    if (scheduleChanged) {
      state = resetSubscriptionForecast({
        state,
        subscriptionId,
        from: today,
      });
    }
    if (
      parsed.data.scope === "household" &&
      !state.members.some((member) => member.id === parsed.data.payerMemberId)
    )
      return { status: "error", message: "공동 구독의 활성 결제자를 선택해 주세요." };
    const now = new Date().toISOString();
    if (existing && existing.status !== parsed.data.status) {
      state = transitionSubscriptionStatus({
        state,
        subscriptionId,
        status: parsed.data.status,
        now,
      });
    }
    if (existing && existing.amount !== BigInt(parsed.data.amount)) {
      state = changeSubscriptionPrice({
        state,
        subscriptionId,
        amount: toKrw(parsed.data.amount),
        effectiveOn: parsed.data.priceEffectiveOn ?? parsed.data.nextBillingOn,
        note: parsed.data.priceNote,
        historyId: randomUUID(),
        now,
      });
    }
    const transitioned = state.subscriptions.find((item) => item.id === subscriptionId);
    const record: Subscription = {
      id: subscriptionId,
      ownerId: state.userId,
      householdId: parsed.data.scope === "household" ? state.householdId : null,
      scope: parsed.data.scope,
      payerMemberId: parsed.data.scope === "household" ? parsed.data.payerMemberId : null,
      paymentAccountId: parsed.data.paymentAccountId,
      name: parsed.data.name,
      providerName: parsed.data.providerName,
      planName: parsed.data.planName,
      category: parsed.data.category,
      status: parsed.data.status,
      decision: existing?.decision ?? "review",
      decisionNote: existing?.decisionNote ?? null,
      decisionUpdatedAt: existing?.decisionUpdatedAt ?? null,
      amount: existing
        ? (state.subscriptions.find((item) => item.id === subscriptionId)?.amount ??
          toKrw(parsed.data.amount))
        : toKrw(parsed.data.amount),
      currency: "KRW",
      billingCycle: parsed.data.billingCycle,
      customCycleDays:
        parsed.data.billingCycle === "custom_days" ? Number(parsed.data.customCycleDays) : null,
      startedOn: parsed.data.startedOn,
      billingAnchorOn: parsed.data.billingAnchorOn,
      nextBillingOn: parsed.data.nextBillingOn,
      trialEndsOn: parsed.data.trialEndsOn,
      cancelByOn: parsed.data.cancelByOn,
      autoRenews: parsed.data.autoRenews === "on",
      descriptorAliases: cleanList(parsed.data.descriptorAliases),
      reminderDaysBefore: reminders(parsed.data.reminderDaysBefore),
      serviceUrl: parsed.data.serviceUrl,
      notes: parsed.data.notes,
      lastUsedOn: existing?.lastUsedOn ?? null,
      cancelledAt: transitioned?.cancelledAt ?? null,
      endedAt: transitioned?.endedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    state = {
      ...state,
      subscriptions: existing
        ? state.subscriptions.map((item) => (item.id === subscriptionId ? record : item))
        : [...state.subscriptions, record],
      splits: [
        ...state.splits.filter((item) => item.subscriptionId !== subscriptionId),
        ...(record.scope === "household"
          ? splitRows(state, subscriptionId, parsed.data.ownerShare)
          : []),
      ],
      priceHistory: existing
        ? state.priceHistory
        : [
            ...state.priceHistory,
            {
              id: randomUUID(),
              subscriptionId,
              effectiveOn: parsed.data.startedOn,
              amount: record.amount,
              currency: "KRW",
              note: "최초 등록",
              createdAt: now,
            },
          ],
    };
    state = materializeSubscriptionOccurrences({
      state,
      subscriptionId,
      horizonUntil: addDateDays(today, 365),
      today,
      now,
    });
    state = await refreshSubscriptionSuggestions(state);
    await saveDemoSubscriptionState(state);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "구독을 저장하지 못했어요.",
    };
  }
  redirect(`/money/subscriptions/${subscriptionId}?saved=1`);
}

export async function updateSubscriptionDecisionAction(formData: FormData) {
  const parsed = z
    .object({
      subscriptionId: z.string().min(1),
      decision: z.enum(["keep", "review", "cancel_candidate"]),
      decisionNote: optionalText,
      lastUsedOn: optionalDate,
    })
    .parse({
      subscriptionId: formData.get("subscriptionId"),
      decision: formData.get("decision"),
      decisionNote: formData.get("decisionNote") || "",
      lastUsedOn: formData.get("lastUsedOn") || "",
    });
  const state = await demoSubscriptionState();
  const now = new Date().toISOString();
  if (!state.subscriptions.some((item) => item.id === parsed.subscriptionId)) return;
  await saveDemoSubscriptionState({
    ...state,
    subscriptions: state.subscriptions.map((item) =>
      item.id === parsed.subscriptionId
        ? {
            ...item,
            decision: parsed.decision,
            decisionNote: parsed.decisionNote,
            decisionUpdatedAt: now,
            lastUsedOn: parsed.lastUsedOn,
            updatedAt: now,
          }
        : item,
    ),
  });
  revalidatePath("/money/subscriptions");
  revalidatePath("/money/subscriptions/review");
  revalidatePath(`/money/subscriptions/${parsed.subscriptionId}`);
}

export async function confirmSubscriptionMatchAction(formData: FormData) {
  let state = await demoSubscriptionState();
  const suggestionId = z.string().min(1).parse(formData.get("suggestionId"));
  const suggestion = state.suggestions.find((item) => item.id === suggestionId);
  const money = await readDemoMoneyState();
  const transaction = money?.transactions.find((item) => item.id === suggestion?.transactionId);
  if (!suggestion || !transaction) return;
  state = confirmSubscriptionMatch({
    state,
    suggestionId,
    transaction,
    now: new Date().toISOString(),
  });
  await saveDemoSubscriptionState(state);
  revalidatePath("/money/subscriptions");
  revalidatePath("/money/subscriptions/matches");
  revalidatePath(
    `/money/subscriptions/${state.occurrences.find((item) => item.id === suggestion.occurrenceId)?.subscriptionId}`,
  );
}

export async function dismissSubscriptionMatchAction(formData: FormData) {
  const state = await demoSubscriptionState();
  const suggestionId = z.string().min(1).parse(formData.get("suggestionId"));
  await saveDemoSubscriptionState({
    ...state,
    suggestions: state.suggestions.map((item) =>
      item.id === suggestionId && item.status === "suggested"
        ? { ...item, status: "dismissed", dismissedAt: new Date().toISOString() }
        : item,
    ),
  });
  revalidatePath("/money/subscriptions/matches");
}

export async function dismissSubscriptionInsightAction(formData: FormData) {
  const insightId = z.string().min(1).parse(formData.get("insightId"));
  const [grow, subscriptions] = await Promise.all([readDemoGrowState(), demoSubscriptionState()]);
  if (!grow) throw new Error("Grow 로컬 상태를 찾지 못했어요.");
  const allowed = deterministicSubscriptionInsights(subscriptions).some(
    (insight) => insight.id === insightId,
  );
  if (!allowed) return;
  await saveDemoGrowState({
    ...grow,
    dismissedInsightIds: [...new Set([...grow.dismissedInsightIds, insightId])],
  });
  revalidatePath("/money/subscriptions");
}
