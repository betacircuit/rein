import type { Krw } from "@/domain/money/krw";

export const storageLocations = ["refrigerated", "frozen", "room_temperature"] as const;
export const inventoryOwnerKinds = ["member", "shared"] as const;
export const shoppingStatuses = ["needed", "purchased", "dismissed"] as const;
export const cleaningRecurrences = ["none", "interval_days", "weekly"] as const;

export type StorageLocation = (typeof storageLocations)[number];
export type InventoryOwnerKind = (typeof inventoryOwnerKinds)[number];
export type ShoppingStatus = (typeof shoppingStatuses)[number];
export type CleaningRecurrence = (typeof cleaningRecurrences)[number];
export type CleaningDerivedState = "ok" | "due_soon" | "due";

export type HouseholdMember = {
  id: string;
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
  status: "active";
};

export type InventoryItem = {
  id: string;
  householdId: string;
  name: string;
  quantityMilli: bigint;
  unit: string;
  ownerKind: InventoryOwnerKind;
  ownerMemberId: string | null;
  storageLocation: StorageLocation;
  expiresOn: string | null;
  lowStockThresholdMilli: bigint | null;
  notes: string | null;
  version: number;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustment = {
  id: string;
  itemId: string;
  actorMemberId: string;
  idempotencyKey: string;
  deltaMilli: bigint;
  quantityBeforeMilli: bigint;
  quantityAfterMilli: bigint;
  createdAt: string;
};

export type ShoppingItem = {
  id: string;
  householdId: string;
  inventoryItemId: string | null;
  requestedByMemberId: string;
  ownerKind: InventoryOwnerKind;
  ownerMemberId: string | null;
  name: string;
  desiredQuantityMilli: bigint | null;
  unit: string | null;
  status: ShoppingStatus;
  purchasedTransactionId: string | null;
  sharedExpenseId: string | null;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CleaningTask = {
  id: string;
  householdId: string;
  title: string;
  area: string;
  assigneeMemberId: string | null;
  recurrence: CleaningRecurrence;
  recurrenceIntervalDays: number | null;
  weekday: number | null;
  dueSoonDays: number;
  lastCompletedAt: string | null;
  nextDueOn: string | null;
  notes: string | null;
  isActive: boolean;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
};

export type CleaningCompletion = {
  id: string;
  taskId: string;
  completedByMemberId: string;
  completedAt: string;
  note: string | null;
  idempotencyKey: string;
};

export type HouseholdCostRow = {
  id: string;
  label: string;
  amount: Krw;
  payerMemberId: string;
  splits: Array<{ memberId: string; amount: Krw }>;
  sourceHref: string;
};

export type HouseholdOperationsState = {
  userId: string;
  householdId: string;
  currentMemberId: string;
  members: HouseholdMember[];
  inventory: InventoryItem[];
  inventoryAdjustments: InventoryAdjustment[];
  shopping: ShoppingItem[];
  cleaningTasks: CleaningTask[];
  cleaningCompletions: CleaningCompletion[];
  costRows: HouseholdCostRow[];
};

function assertMember(state: HouseholdOperationsState, memberId: string) {
  if (!state.members.some((member) => member.id === memberId && member.status === "active")) {
    throw new Error("활성 우리집 구성원을 찾지 못했어요.");
  }
}

function assertActor(state: HouseholdOperationsState, memberId: string) {
  assertMember(state, memberId);
  if (state.currentMemberId !== memberId) {
    throw new Error("현재 로그인한 구성원만 자신의 작업을 기록할 수 있어요.");
  }
}

function assertOwner(
  state: HouseholdOperationsState,
  ownerKind: InventoryOwnerKind,
  ownerMemberId: string | null,
) {
  if (ownerKind === "shared") {
    if (ownerMemberId !== null) throw new Error("공용 물건에는 개인 소유자를 지정할 수 없어요.");
    return;
  }
  if (!ownerMemberId) throw new Error("개인 물건의 소유자를 선택해 주세요.");
  assertMember(state, ownerMemberId);
}

export function parseQuantityToMilli(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    throw new Error("수량은 0 이상, 소수점 셋째 자리까지 입력해 주세요.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole!) * 1_000n + BigInt(fraction.padEnd(3, "0"));
}

export function formatQuantityMilli(value: bigint) {
  const whole = value / 1_000n;
  const fraction = (value % 1_000n).toString().padStart(3, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function ownerLabel(
  item: Pick<InventoryItem | ShoppingItem, "ownerKind" | "ownerMemberId">,
  members: readonly HouseholdMember[],
) {
  if (item.ownerKind === "shared") return "공용";
  const member = members.find((candidate) => candidate.id === item.ownerMemberId);
  if (!member) return "탈퇴한 구성원";
  return member.isCurrentUser ? "내 것" : `${member.displayName} 것`;
}

export function isLowStock(item: InventoryItem) {
  return item.lowStockThresholdMilli !== null && item.quantityMilli <= item.lowStockThresholdMilli;
}

export function saveInventoryItem(input: { state: HouseholdOperationsState; item: InventoryItem }) {
  const { state, item } = input;
  if (item.householdId !== state.householdId) throw new Error("우리집 범위가 일치하지 않아요.");
  if (!item.name.trim() || !item.unit.trim()) throw new Error("이름과 단위를 입력해 주세요.");
  if (item.quantityMilli < 0n || (item.lowStockThresholdMilli ?? 0n) < 0n) {
    throw new Error("수량과 부족 기준은 0보다 작을 수 없어요.");
  }
  assertOwner(state, item.ownerKind, item.ownerMemberId);
  assertMember(state, item.createdByMemberId);
  const exists = state.inventory.some((candidate) => candidate.id === item.id);
  return {
    ...state,
    inventory: exists
      ? state.inventory.map((candidate) => (candidate.id === item.id ? item : candidate))
      : [...state.inventory, item],
  };
}

export function adjustInventoryQuantity(input: {
  state: HouseholdOperationsState;
  itemId: string;
  actorMemberId: string;
  deltaMilli: bigint;
  expectedVersion: number;
  adjustmentId: string;
  idempotencyKey: string;
  now: string;
}) {
  const { state } = input;
  const prior = state.inventoryAdjustments.find(
    (adjustment) => adjustment.idempotencyKey === input.idempotencyKey,
  );
  if (prior) {
    if (prior.itemId !== input.itemId || prior.deltaMilli !== input.deltaMilli) {
      throw new Error("같은 요청 키를 다른 수량 변경에 다시 사용할 수 없어요.");
    }
    return state;
  }
  assertActor(state, input.actorMemberId);
  const item = state.inventory.find((candidate) => candidate.id === input.itemId);
  if (!item) throw new Error("수량을 바꿀 재고를 찾지 못했어요.");
  if (item.version !== input.expectedVersion) {
    throw new Error("다른 구성원이 먼저 수량을 바꿨어요. 최신 수량에서 다시 시도해 주세요.");
  }
  if (input.deltaMilli === 0n) throw new Error("변경 수량은 0일 수 없어요.");
  const nextQuantity = item.quantityMilli + input.deltaMilli;
  if (nextQuantity < 0n) throw new Error("재고 수량은 0보다 작아질 수 없어요.");
  const updated: InventoryItem = {
    ...item,
    quantityMilli: nextQuantity,
    version: item.version + 1,
    updatedAt: input.now,
  };
  return {
    ...state,
    inventory: state.inventory.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    ),
    inventoryAdjustments: [
      ...state.inventoryAdjustments,
      {
        id: input.adjustmentId,
        itemId: item.id,
        actorMemberId: input.actorMemberId,
        idempotencyKey: input.idempotencyKey,
        deltaMilli: input.deltaMilli,
        quantityBeforeMilli: item.quantityMilli,
        quantityAfterMilli: nextQuantity,
        createdAt: input.now,
      },
    ],
  };
}

export function ensureLowStockShoppingItem(input: {
  state: HouseholdOperationsState;
  inventoryItemId: string;
  shoppingItemId: string;
  requestedByMemberId: string;
  now: string;
}) {
  const { state } = input;
  assertActor(state, input.requestedByMemberId);
  const inventoryItem = state.inventory.find((item) => item.id === input.inventoryItemId);
  if (!inventoryItem || !isLowStock(inventoryItem)) {
    throw new Error("부족 기준에 도달한 재고만 장보기에 연결할 수 있어요.");
  }
  if (
    state.shopping.some(
      (item) => item.inventoryItemId === inventoryItem.id && item.status === "needed",
    )
  ) {
    return state;
  }
  const target = inventoryItem.lowStockThresholdMilli ?? 0n;
  const desired = target > 0n ? target : 1_000n;
  const shoppingItem: ShoppingItem = {
    id: input.shoppingItemId,
    householdId: state.householdId,
    inventoryItemId: inventoryItem.id,
    requestedByMemberId: input.requestedByMemberId,
    ownerKind: inventoryItem.ownerKind,
    ownerMemberId: inventoryItem.ownerMemberId,
    name: inventoryItem.name,
    desiredQuantityMilli: desired,
    unit: inventoryItem.unit,
    status: "needed",
    purchasedTransactionId: null,
    sharedExpenseId: null,
    purchasedAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return { ...state, shopping: [...state.shopping, shoppingItem] };
}

export function saveShoppingItem(input: { state: HouseholdOperationsState; item: ShoppingItem }) {
  assertActor(input.state, input.item.requestedByMemberId);
  assertOwner(input.state, input.item.ownerKind, input.item.ownerMemberId);
  if (!input.item.name.trim()) throw new Error("장볼 물건 이름을 입력해 주세요.");
  const exists = input.state.shopping.some((item) => item.id === input.item.id);
  return {
    ...input.state,
    shopping: exists
      ? input.state.shopping.map((item) => (item.id === input.item.id ? input.item : item))
      : [...input.state.shopping, input.item],
  };
}

export function markShoppingPurchased(input: {
  state: HouseholdOperationsState;
  shoppingItemId: string;
  transactionId: string | null;
  sharedExpenseId: string | null;
  purchasedAt: string;
}) {
  const item = input.state.shopping.find((candidate) => candidate.id === input.shoppingItemId);
  if (!item) throw new Error("장보기 항목을 찾지 못했어요.");
  if (item.status === "purchased") {
    if (
      item.purchasedTransactionId !== input.transactionId ||
      item.sharedExpenseId !== input.sharedExpenseId
    ) {
      throw new Error("이미 구매 연결이 끝난 항목이에요.");
    }
    return input.state;
  }
  if (item.status !== "needed") throw new Error("필요 상태인 항목만 구매 처리할 수 있어요.");
  return {
    ...input.state,
    shopping: input.state.shopping.map((candidate) =>
      candidate.id === item.id
        ? {
            ...candidate,
            status: "purchased" as const,
            purchasedTransactionId: input.transactionId,
            sharedExpenseId: input.sharedExpenseId,
            purchasedAt: input.purchasedAt,
            updatedAt: input.purchasedAt,
          }
        : candidate,
    ),
  };
}

function dateAtUtc(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("날짜 형식이 올바르지 않아요.");
  return new Date(`${date}T00:00:00.000Z`);
}

function addDays(date: string, days: number) {
  const value = dateAtUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function deriveCleaningState(task: CleaningTask, today: string): CleaningDerivedState {
  if (!task.isActive || !task.nextDueOn) return "ok";
  if (task.nextDueOn <= today) return "due";
  return task.nextDueOn <= addDays(today, task.dueSoonDays) ? "due_soon" : "ok";
}

export function saveCleaningTask(input: { state: HouseholdOperationsState; task: CleaningTask }) {
  const { state, task } = input;
  if (!task.title.trim() || !task.area.trim()) throw new Error("청소 이름과 공간을 입력해 주세요.");
  if (task.assigneeMemberId) assertMember(state, task.assigneeMemberId);
  assertMember(state, task.createdByMemberId);
  if (task.dueSoonDays < 0 || task.dueSoonDays > 30) {
    throw new Error("미리 알림은 0~30일 사이여야 해요.");
  }
  if (
    (task.recurrence === "interval_days" &&
      (!task.recurrenceIntervalDays || task.recurrenceIntervalDays < 1 || task.weekday !== null)) ||
    (task.recurrence === "weekly" &&
      (task.weekday === null ||
        task.weekday < 0 ||
        task.weekday > 6 ||
        task.recurrenceIntervalDays !== null)) ||
    (task.recurrence === "none" && (task.weekday !== null || task.recurrenceIntervalDays !== null))
  ) {
    throw new Error("청소 반복 규칙을 확인해 주세요.");
  }
  const exists = state.cleaningTasks.some((candidate) => candidate.id === task.id);
  return {
    ...state,
    cleaningTasks: exists
      ? state.cleaningTasks.map((candidate) => (candidate.id === task.id ? task : candidate))
      : [...state.cleaningTasks, task],
  };
}

function nextCleaningDue(task: CleaningTask, completedOn: string) {
  if (task.recurrence === "none") return null;
  if (task.recurrence === "interval_days")
    return addDays(completedOn, task.recurrenceIntervalDays!);
  const day = dateAtUtc(completedOn).getUTCDay();
  const diff = (task.weekday! - day + 7) % 7 || 7;
  return addDays(completedOn, diff);
}

export function completeCleaningTask(input: {
  state: HouseholdOperationsState;
  taskId: string;
  actorMemberId: string;
  completionId: string;
  idempotencyKey: string;
  completedAt: string;
  completedOn: string;
  note: string | null;
}) {
  const prior = input.state.cleaningCompletions.find(
    (completion) => completion.idempotencyKey === input.idempotencyKey,
  );
  if (prior) {
    if (prior.taskId !== input.taskId)
      throw new Error("같은 완료 요청 키를 다시 사용할 수 없어요.");
    return input.state;
  }
  assertActor(input.state, input.actorMemberId);
  const task = input.state.cleaningTasks.find((candidate) => candidate.id === input.taskId);
  if (!task || !task.isActive) throw new Error("완료할 활성 청소를 찾지 못했어요.");
  const updated: CleaningTask = {
    ...task,
    lastCompletedAt: input.completedAt,
    nextDueOn: nextCleaningDue(task, input.completedOn),
    isActive: task.recurrence !== "none",
    updatedAt: input.completedAt,
  };
  return {
    ...input.state,
    cleaningTasks: input.state.cleaningTasks.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    ),
    cleaningCompletions: [
      ...input.state.cleaningCompletions,
      {
        id: input.completionId,
        taskId: input.taskId,
        completedByMemberId: input.actorMemberId,
        completedAt: input.completedAt,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
      },
    ],
  };
}

export function calculateHouseholdOverview(
  state: HouseholdOperationsState,
  costRows: readonly HouseholdCostRow[] = state.costRows,
) {
  const memberId = state.currentMemberId;
  const sharedMonthlyCost = costRows.reduce((sum, row) => sum + row.amount, 0n) as Krw;
  const userShare = costRows.reduce(
    (sum, row) => sum + (row.splits.find((split) => split.memberId === memberId)?.amount ?? 0n),
    0n,
  ) as Krw;
  const cashPaid = costRows.reduce(
    (sum, row) => sum + (row.payerMemberId === memberId ? row.amount : 0n),
    0n,
  ) as Krw;
  return {
    sharedMonthlyCost,
    userShare,
    cashPaid,
    settlementCredit: (cashPaid - userShare) as Krw,
    lowStockCount: state.inventory.filter(isLowStock).length,
  };
}
