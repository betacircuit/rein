import { describe, expect, it } from "vitest";

import { toKrw } from "@/domain/money/krw";
import {
  adjustInventoryQuantity,
  calculateHouseholdOverview,
  completeCleaningTask,
  deriveCleaningState,
  ensureLowStockShoppingItem,
  formatQuantityMilli,
  isLowStock,
  markShoppingPurchased,
  ownerLabel,
  parseQuantityToMilli,
  saveCleaningTask,
  saveInventoryItem,
  type CleaningTask,
  type HouseholdOperationsState,
  type InventoryItem,
} from "@/domain/household/operations";

const now = "2026-09-03T03:00:00.000Z";

function inventory(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "inventory-chicken",
    householdId: "household-demo",
    name: "닭가슴살",
    quantityMilli: 2_000n,
    unit: "개",
    ownerKind: "shared",
    ownerMemberId: null,
    storageLocation: "refrigerated",
    expiresOn: "2026-09-08",
    lowStockThresholdMilli: 2_000n,
    notes: "점심용",
    version: 0,
    createdByMemberId: "member-owner",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function cleaning(overrides: Partial<CleaningTask> = {}): CleaningTask {
  return {
    id: "cleaning-bathroom",
    householdId: "household-demo",
    title: "화장실 청소",
    area: "화장실",
    assigneeMemberId: "member-owner",
    recurrence: "interval_days",
    recurrenceIntervalDays: 7,
    weekday: null,
    dueSoonDays: 2,
    lastCompletedAt: null,
    nextDueOn: "2026-09-03",
    notes: null,
    isActive: true,
    createdByMemberId: "member-owner",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function state(): HouseholdOperationsState {
  return {
    userId: "user-owner",
    householdId: "household-demo",
    currentMemberId: "member-owner",
    members: [
      {
        id: "member-owner",
        userId: "user-owner",
        displayName: "재원",
        isCurrentUser: true,
        status: "active",
      },
      {
        id: "member-roommate",
        userId: "user-roommate",
        displayName: "민수",
        isCurrentUser: false,
        status: "active",
      },
    ],
    inventory: [inventory()],
    inventoryAdjustments: [],
    shopping: [],
    cleaningTasks: [cleaning()],
    cleaningCompletions: [],
    costRows: [
      {
        id: "expense-rent",
        label: "월세",
        amount: toKrw(700_000),
        payerMemberId: "member-owner",
        splits: [
          { memberId: "member-owner", amount: toKrw(350_000) },
          { memberId: "member-roommate", amount: toKrw(350_000) },
        ],
        sourceHref: "/household#shared-costs",
      },
    ],
  };
}

describe("Phase 05 household operations", () => {
  it("HOM-004 parses and formats quantities at three-decimal precision", () => {
    expect(parseQuantityToMilli("12.375")).toBe(12_375n);
    expect(formatQuantityMilli(12_300n)).toBe("12.3");
    expect(() => parseQuantityToMilli("1.0004")).toThrow(/셋째 자리/);
  });

  it("HOM-005 resolves member ownership into current-household labels", () => {
    const value = inventory({ ownerKind: "member", ownerMemberId: "member-roommate" });
    expect(ownerLabel(value, state().members)).toBe("민수 것");
  });

  it("HOM-004 rejects an owner member from another household", () => {
    const base = state();
    expect(() =>
      saveInventoryItem({
        state: base,
        item: inventory({ ownerKind: "member", ownerMemberId: "member-outsider" }),
      }),
    ).toThrow(/활성 우리집/);
  });

  it("HOM-006 recognizes only the specified storage values at the type boundary", () => {
    expect(inventory({ storageLocation: "refrigerated" }).storageLocation).toBe("refrigerated");
    expect(inventory({ storageLocation: "frozen" }).storageLocation).toBe("frozen");
    expect(inventory({ storageLocation: "room_temperature" }).storageLocation).toBe(
      "room_temperature",
    );
  });

  it("HOM-007 rejects stale concurrent writes, then applies a retry without lost updates", () => {
    const first = adjustInventoryQuantity({
      state: state(),
      itemId: "inventory-chicken",
      actorMemberId: "member-owner",
      deltaMilli: -1_000n,
      expectedVersion: 0,
      adjustmentId: "adjustment-1",
      idempotencyKey: "request-1",
      now,
    });
    expect(() =>
      adjustInventoryQuantity({
        state: first,
        itemId: "inventory-chicken",
        actorMemberId: "member-owner",
        deltaMilli: 1_000n,
        expectedVersion: 0,
        adjustmentId: "adjustment-2",
        idempotencyKey: "request-2",
        now,
      }),
    ).toThrow(/먼저 수량/);
    const retried = adjustInventoryQuantity({
      state: first,
      itemId: "inventory-chicken",
      actorMemberId: "member-owner",
      deltaMilli: 1_000n,
      expectedVersion: 1,
      adjustmentId: "adjustment-2",
      idempotencyKey: "request-2",
      now,
    });
    expect(retried.inventory[0]?.quantityMilli).toBe(2_000n);
    expect(retried.inventoryAdjustments).toHaveLength(2);
  });

  it("HOM-007 prevents negative quantity and makes retried requests idempotent", () => {
    const base = state();
    expect(() =>
      adjustInventoryQuantity({
        state: base,
        itemId: "inventory-chicken",
        actorMemberId: "member-owner",
        deltaMilli: -3_000n,
        expectedVersion: 0,
        adjustmentId: "adjustment-negative",
        idempotencyKey: "request-negative",
        now,
      }),
    ).toThrow(/0보다 작아질/);
    const once = adjustInventoryQuantity({
      state: base,
      itemId: "inventory-chicken",
      actorMemberId: "member-owner",
      deltaMilli: -1_000n,
      expectedVersion: 0,
      adjustmentId: "adjustment-once",
      idempotencyKey: "request-once",
      now,
    });
    const twice = adjustInventoryQuantity({
      state: once,
      itemId: "inventory-chicken",
      actorMemberId: "member-owner",
      deltaMilli: -1_000n,
      expectedVersion: 0,
      adjustmentId: "adjustment-twice",
      idempotencyKey: "request-once",
      now,
    });
    expect(twice.inventory[0]?.quantityMilli).toBe(1_000n);
    expect(twice.inventoryAdjustments).toHaveLength(1);
  });

  it("SEC-002 refuses to attribute an inventory mutation to another member", () => {
    expect(() =>
      adjustInventoryQuantity({
        state: state(),
        itemId: "inventory-chicken",
        actorMemberId: "member-roommate",
        deltaMilli: 1_000n,
        expectedVersion: 0,
        adjustmentId: "adjustment-impersonated",
        idempotencyKey: "request-impersonated",
        now,
      }),
    ).toThrow(/현재 로그인한 구성원/);
  });

  it("HOM-008 creates only one open shopping item from low stock", () => {
    expect(isLowStock(state().inventory[0]!)).toBe(true);
    const once = ensureLowStockShoppingItem({
      state: state(),
      inventoryItemId: "inventory-chicken",
      shoppingItemId: "shopping-chicken",
      requestedByMemberId: "member-owner",
      now,
    });
    const twice = ensureLowStockShoppingItem({
      state: once,
      inventoryItemId: "inventory-chicken",
      shoppingItemId: "shopping-chicken-duplicate",
      requestedByMemberId: "member-owner",
      now,
    });
    expect(twice.shopping).toHaveLength(1);
    expect(twice.shopping[0]?.inventoryItemId).toBe("inventory-chicken");
  });

  it("HOM-009 links a purchase without creating or changing financial records", () => {
    const queued = ensureLowStockShoppingItem({
      state: state(),
      inventoryItemId: "inventory-chicken",
      shoppingItemId: "shopping-chicken",
      requestedByMemberId: "member-owner",
      now,
    });
    const purchased = markShoppingPurchased({
      state: queued,
      shoppingItemId: "shopping-chicken",
      transactionId: "transaction-grocery",
      sharedExpenseId: "shared-expense-grocery",
      purchasedAt: now,
    });
    expect(purchased.shopping[0]).toMatchObject({
      status: "purchased",
      purchasedTransactionId: "transaction-grocery",
      sharedExpenseId: "shared-expense-grocery",
    });
    expect(
      markShoppingPurchased({
        state: purchased,
        shoppingItemId: "shopping-chicken",
        transactionId: "transaction-grocery",
        sharedExpenseId: "shared-expense-grocery",
        purchasedAt: now,
      }),
    ).toBe(purchased);
  });

  it("HOM-010 validates recurrence shape when a cleaning task is saved", () => {
    expect(() =>
      saveCleaningTask({
        state: state(),
        task: cleaning({ recurrence: "weekly", weekday: null, recurrenceIntervalDays: null }),
      }),
    ).toThrow(/반복 규칙/);
  });

  it("HOM-011 derives due, due-soon, and OK from dates instead of stored status", () => {
    expect(deriveCleaningState(cleaning({ nextDueOn: "2026-09-03" }), "2026-09-03")).toBe("due");
    expect(deriveCleaningState(cleaning({ nextDueOn: "2026-09-05" }), "2026-09-03")).toBe(
      "due_soon",
    );
    expect(deriveCleaningState(cleaning({ nextDueOn: "2026-09-06" }), "2026-09-03")).toBe("ok");
  });

  it("HOM-012 records actor/time and advances interval recurrence from completion", () => {
    const completed = completeCleaningTask({
      state: state(),
      taskId: "cleaning-bathroom",
      actorMemberId: "member-owner",
      completionId: "completion-1",
      idempotencyKey: "completion-request-1",
      completedAt: "2026-09-03T12:34:00+09:00",
      completedOn: "2026-09-03",
      note: "배수구까지 완료",
    });
    expect(completed.cleaningTasks[0]).toMatchObject({
      lastCompletedAt: "2026-09-03T12:34:00+09:00",
      nextDueOn: "2026-09-10",
    });
    expect(completed.cleaningCompletions[0]).toMatchObject({
      completedByMemberId: "member-owner",
      note: "배수구까지 완료",
    });
    expect(deriveCleaningState(completed.cleaningTasks[0]!, "2026-09-03")).toBe("ok");
  });

  it("HOM-012 advances weekly recurrence to the next matching weekday", () => {
    const weekly = state();
    weekly.cleaningTasks = [
      cleaning({ recurrence: "weekly", recurrenceIntervalDays: null, weekday: 4 }),
    ];
    const completed = completeCleaningTask({
      state: weekly,
      taskId: "cleaning-bathroom",
      actorMemberId: "member-owner",
      completionId: "completion-weekly",
      idempotencyKey: "completion-request-weekly",
      completedAt: now,
      completedOn: "2026-09-03",
      note: null,
    });
    expect(completed.cleaningTasks[0]?.nextDueOn).toBe("2026-09-10");
  });

  it("HOM-003 reconciles overview totals to shared cost rows", () => {
    expect(calculateHouseholdOverview(state())).toEqual({
      sharedMonthlyCost: 700_000n,
      userShare: 350_000n,
      cashPaid: 700_000n,
      settlementCredit: 350_000n,
      lowStockCount: 1,
    });
  });
});
