"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  adjustInventoryQuantity,
  completeCleaningTask,
  ensureLowStockShoppingItem,
  markShoppingPurchased,
  parseQuantityToMilli,
  saveCleaningTask,
  saveInventoryItem,
  saveShoppingItem,
  type InventoryOwnerKind,
} from "@/domain/household/operations";
import {
  readDemoHouseholdState,
  readHouseholdCostRows,
  saveDemoHouseholdState,
} from "@/lib/household/demo-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";

export type HouseholdActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);
const optionalDate = optionalText.refine(
  (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "날짜를 확인해 주세요.",
);
const quantityText = z
  .string()
  .trim()
  .refine((value) => {
    try {
      parseQuantityToMilli(value);
      return true;
    } catch {
      return false;
    }
  }, "0 이상, 소수점 셋째 자리까지 입력해 주세요.");

const inventorySchema = z.object({
  inventoryItemId: z.string().optional(),
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(80),
  quantity: quantityText,
  unit: z.string().trim().min(1, "단위를 입력해 주세요.").max(20),
  owner: z.string().min(1),
  storageLocation: z.enum(["refrigerated", "frozen", "room_temperature"]),
  expiresOn: optionalDate,
  lowStockThreshold: z.union([quantityText, z.literal("")]),
  notes: optionalText,
});

const shoppingSchema = z.object({
  name: z.string().trim().min(1, "장볼 물건 이름을 입력해 주세요.").max(80),
  desiredQuantity: z.union([quantityText, z.literal("")]),
  unit: optionalText,
  owner: z.string().min(1),
});

const cleaningSchema = z
  .object({
    title: z.string().trim().min(1, "청소 이름을 입력해 주세요.").max(80),
    area: z.string().trim().min(1, "공간을 입력해 주세요.").max(40),
    assigneeMemberId: optionalText,
    recurrence: z.enum(["none", "interval_days", "weekly"]),
    recurrenceIntervalDays: optionalText,
    weekday: optionalText,
    dueSoonDays: z.coerce.number().int().min(0).max(30),
    nextDueOn: optionalDate,
    notes: optionalText,
  })
  .superRefine((value, context) => {
    if (
      value.recurrence === "interval_days" &&
      (!value.recurrenceIntervalDays ||
        !Number.isInteger(Number(value.recurrenceIntervalDays)) ||
        Number(value.recurrenceIntervalDays) < 1)
    ) {
      context.addIssue({
        code: "custom",
        path: ["recurrenceIntervalDays"],
        message: "반복 간격은 1일 이상이어야 해요.",
      });
    }
    if (
      value.recurrence === "weekly" &&
      (value.weekday === null || Number(value.weekday) < 0 || Number(value.weekday) > 6)
    ) {
      context.addIssue({
        code: "custom",
        path: ["weekday"],
        message: "반복 요일을 선택해 주세요.",
      });
    }
  });

async function demoState() {
  const runtime = readRuntimeSafetyConfig(process.env);
  assertSafeRuntime(runtime);
  const state = await readDemoHouseholdState();
  if (!state) throw new Error("세션이 만료됐어요. 다시 로그인해 주세요.");
  return state;
}

function nowInKorea() {
  const now = new Date();
  const completedOn = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return { now: now.toISOString(), completedOn };
}

function ownerReference(value: string): {
  ownerKind: InventoryOwnerKind;
  ownerMemberId: string | null;
} {
  return value === "shared"
    ? { ownerKind: "shared", ownerMemberId: null }
    : { ownerKind: "member", ownerMemberId: value };
}

function refreshHousehold() {
  revalidatePath("/household");
  revalidatePath("/household/inventory");
  revalidatePath("/household/shopping");
  revalidatePath("/household/cleaning");
}

export async function saveInventoryAction(
  _previous: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const parsed = inventorySchema.safeParse({
    inventoryItemId: formData.get("inventoryItemId") || undefined,
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    owner: formData.get("owner"),
    storageLocation: formData.get("storageLocation"),
    expiresOn: formData.get("expiresOn") || "",
    lowStockThreshold: formData.get("lowStockThreshold") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "재고 정보를 다시 확인해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const inventoryItemId = parsed.data.inventoryItemId ?? randomUUID();
  try {
    let state = await demoState();
    const existing = state.inventory.find((item) => item.id === inventoryItemId);
    const { now } = nowInKorea();
    const quantityMilli = parseQuantityToMilli(parsed.data.quantity);
    if (existing && existing.quantityMilli !== quantityMilli) {
      state = adjustInventoryQuantity({
        state,
        itemId: existing.id,
        actorMemberId: state.currentMemberId,
        deltaMilli: quantityMilli - existing.quantityMilli,
        expectedVersion: existing.version,
        adjustmentId: randomUUID(),
        idempotencyKey: randomUUID(),
        now,
      });
    }
    const current = state.inventory.find((item) => item.id === inventoryItemId);
    const owner = ownerReference(parsed.data.owner);
    state = saveInventoryItem({
      state,
      item: {
        id: inventoryItemId,
        householdId: state.householdId,
        name: parsed.data.name,
        quantityMilli,
        unit: parsed.data.unit,
        ...owner,
        storageLocation: parsed.data.storageLocation,
        expiresOn: parsed.data.expiresOn,
        lowStockThresholdMilli: parsed.data.lowStockThreshold
          ? parseQuantityToMilli(parsed.data.lowStockThreshold)
          : null,
        notes: parsed.data.notes,
        version: current?.version ?? 0,
        createdByMemberId: existing?.createdByMemberId ?? state.currentMemberId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    });
    await saveDemoHouseholdState(state);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "재고를 저장하지 못했어요.",
    };
  }
  redirect(`/household/inventory/${inventoryItemId}?saved=1`);
}

export async function adjustInventoryAction(formData: FormData) {
  const parsed = z
    .object({
      inventoryItemId: z.string().min(1),
      delta: z.enum(["-1000", "1000"]),
      expectedVersion: z.coerce.number().int().nonnegative(),
      idempotencyKey: z.string().min(1),
    })
    .parse({
      inventoryItemId: formData.get("inventoryItemId"),
      delta: formData.get("delta"),
      expectedVersion: formData.get("expectedVersion"),
      idempotencyKey: formData.get("idempotencyKey"),
    });
  const state = await demoState();
  const next = adjustInventoryQuantity({
    state,
    itemId: parsed.inventoryItemId,
    actorMemberId: state.currentMemberId,
    deltaMilli: BigInt(parsed.delta),
    expectedVersion: parsed.expectedVersion,
    adjustmentId: randomUUID(),
    idempotencyKey: parsed.idempotencyKey,
    now: new Date().toISOString(),
  });
  await saveDemoHouseholdState(next);
  refreshHousehold();
}

export async function addLowStockToShoppingAction(formData: FormData) {
  const inventoryItemId = z.string().min(1).parse(formData.get("inventoryItemId"));
  const state = await demoState();
  const next = ensureLowStockShoppingItem({
    state,
    inventoryItemId,
    shoppingItemId: randomUUID(),
    requestedByMemberId: state.currentMemberId,
    now: new Date().toISOString(),
  });
  await saveDemoHouseholdState(next);
  refreshHousehold();
}

export async function saveShoppingAction(
  _previous: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const parsed = shoppingSchema.safeParse({
    name: formData.get("name"),
    desiredQuantity: formData.get("desiredQuantity") || "",
    unit: formData.get("unit") || "",
    owner: formData.get("owner"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "장보기 항목을 다시 확인해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const state = await demoState();
    const now = new Date().toISOString();
    const owner = ownerReference(parsed.data.owner);
    const next = saveShoppingItem({
      state,
      item: {
        id: randomUUID(),
        householdId: state.householdId,
        inventoryItemId: null,
        requestedByMemberId: state.currentMemberId,
        ...owner,
        name: parsed.data.name,
        desiredQuantityMilli: parsed.data.desiredQuantity
          ? parseQuantityToMilli(parsed.data.desiredQuantity)
          : null,
        unit: parsed.data.unit,
        status: "needed",
        purchasedTransactionId: null,
        sharedExpenseId: null,
        purchasedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });
    await saveDemoHouseholdState(next);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "장보기에 추가하지 못했어요.",
    };
  }
  redirect("/household/shopping?created=1");
}

export async function markShoppingPurchasedAction(formData: FormData) {
  const parsed = z
    .object({
      shoppingItemId: z.string().min(1),
      transactionId: optionalText,
      sharedExpenseId: optionalText,
    })
    .parse({
      shoppingItemId: formData.get("shoppingItemId"),
      transactionId: formData.get("transactionId") || "",
      sharedExpenseId: formData.get("sharedExpenseId") || "",
    });
  const state = await demoState();
  if (parsed.transactionId) {
    const money = await readDemoMoneyState();
    if (!money?.transactions.some((transaction) => transaction.id === parsed.transactionId)) {
      throw new Error("현재 사용자의 기존 거래를 선택해 주세요.");
    }
  }
  if (parsed.sharedExpenseId) {
    const costs = await readHouseholdCostRows(state);
    if (!costs.some((cost) => cost.id === parsed.sharedExpenseId)) {
      throw new Error("현재 우리집의 기존 공동비를 선택해 주세요.");
    }
  }
  const next = markShoppingPurchased({
    state,
    shoppingItemId: parsed.shoppingItemId,
    transactionId: parsed.transactionId,
    sharedExpenseId: parsed.sharedExpenseId,
    purchasedAt: new Date().toISOString(),
  });
  await saveDemoHouseholdState(next);
  refreshHousehold();
}

export async function saveCleaningTaskAction(
  _previous: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const parsed = cleaningSchema.safeParse({
    title: formData.get("title"),
    area: formData.get("area"),
    assigneeMemberId: formData.get("assigneeMemberId") || "",
    recurrence: formData.get("recurrence"),
    recurrenceIntervalDays: formData.get("recurrenceIntervalDays") || "",
    weekday: formData.get("weekday") || "",
    dueSoonDays: formData.get("dueSoonDays"),
    nextDueOn: formData.get("nextDueOn") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "청소 일정을 다시 확인해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const state = await demoState();
    const now = new Date().toISOString();
    const next = saveCleaningTask({
      state,
      task: {
        id: randomUUID(),
        householdId: state.householdId,
        title: parsed.data.title,
        area: parsed.data.area,
        assigneeMemberId: parsed.data.assigneeMemberId,
        recurrence: parsed.data.recurrence,
        recurrenceIntervalDays:
          parsed.data.recurrence === "interval_days"
            ? Number(parsed.data.recurrenceIntervalDays)
            : null,
        weekday: parsed.data.recurrence === "weekly" ? Number(parsed.data.weekday) : null,
        dueSoonDays: parsed.data.dueSoonDays,
        lastCompletedAt: null,
        nextDueOn: parsed.data.nextDueOn,
        notes: parsed.data.notes,
        isActive: true,
        createdByMemberId: state.currentMemberId,
        createdAt: now,
        updatedAt: now,
      },
    });
    await saveDemoHouseholdState(next);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "청소 일정을 저장하지 못했어요.",
    };
  }
  redirect("/household/cleaning?created=1");
}

export async function completeCleaningTaskAction(formData: FormData) {
  const parsed = z
    .object({
      taskId: z.string().min(1),
      idempotencyKey: z.string().min(1),
      note: optionalText,
    })
    .parse({
      taskId: formData.get("taskId"),
      idempotencyKey: formData.get("idempotencyKey"),
      note: formData.get("note") || "",
    });
  const state = await demoState();
  const date = nowInKorea();
  const next = completeCleaningTask({
    state,
    taskId: parsed.taskId,
    actorMemberId: state.currentMemberId,
    completionId: randomUUID(),
    idempotencyKey: parsed.idempotencyKey,
    completedAt: date.now,
    completedOn: date.completedOn,
    note: parsed.note,
  });
  await saveDemoHouseholdState(next);
  refreshHousehold();
}

export async function requireHouseholdState() {
  return demoState();
}
