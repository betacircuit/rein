# Domain Rules and Formulas

## 1. Money representation

- Store KRW amounts as positive integer `bigint` values plus an explicit direction/kind. Never store KRW in floating point.
- TypeScript receives Postgres `bigint` as string at boundaries, validates it, and converts only when inside `Number.MAX_SAFE_INTEGER`; otherwise use `bigint`/string-safe formatters.
- Split rounding must allocate every won. Use deterministic largest-remainder allocation with stable member ordering.

## 2. Tutoring invariants

```text
if tutoring_type == SUBJECT:
  subject in {MATH, PHYSICS, CHEMISTRY}
else if tutoring_type == SCHOOL_RECORD:
  subject is null
```

Lesson status is exactly `SCHEDULED | COMPLETED | CANCELLED`. Completing a lesson is idempotent:

1. Validate ownership and current state.
2. Set completion timestamps and actual time fields.
3. Upsert one receivable keyed by lesson ID.
4. Do not create a financial transaction.

Cancelling a lesson does not create a receivable. Reopening a completed lesson requires explicit confirmation; its receivable must be reconciled safely rather than deleted if payments exist.

### Hourly-rate formulas

```text
nominal_hours = actual_or_scheduled_lesson_minutes / 60
nominal_hourly_rate = lesson_amount / nominal_hours

effective_minutes = actual_or_scheduled_lesson_minutes + prep_minutes + travel_minutes
effective_hourly_rate = lesson_amount / (effective_minutes / 60)
```

When effective minutes are zero, return null and show “계산 불가”, never infinity.

## 3. Receivable rules

- `amount_due` is fixed from the completed lesson unless the user performs an explicit adjustment with an audit reason.
- Payment allocations may be partial or combine multiple receivables.
- Sum of active allocations cannot exceed transaction amount or receivable amount due.
- State derives as OPEN, PARTIAL, PAID, or VOID.
- Payment recognition date is the actual transaction date, not lesson completion date.

## 4. Financial ledger rules

Each account ledger row has direction (`IN`/`OUT`) and kind (`INCOME`/`EXPENSE`/`TRANSFER`). A transfer between owned accounts creates two linked legs with one `transfer_group_id`:

- source account: OUT + TRANSFER
- destination account: IN + TRANSFER

Transfers are excluded from income and expense. Imported transactions may begin `UNCLASSIFIED` in application classification state, but ledger direction is always known.

## 5. Subscriptions

A Subscription defines the contract; a SubscriptionOccurrence defines one expected charge; a FinancialTransaction defines actual movement.

### Monthly equivalent

For amount `A`:

```text
WEEKLY       = A * 52 / 12
MONTHLY      = A
QUARTERLY    = A / 3
HALF_YEARLY  = A / 6
YEARLY       = A / 12
CUSTOM_DAYS  = A * 365.2425 / 12 / interval_days
```

UI rounds for display only. Aggregate calculations retain rational/decimal precision then round once to integer KRW using a documented rule.

### Occurrence generation

- Generate a bounded future window (for example 12 months) idempotently.
- Price is selected from effective-dated price history on the due date.
- Paused subscriptions do not create dues during pause.
- Cancelled/ended subscriptions retain history but create no due after end date.
- A paid occurrence links to one financial transaction. A household occurrence links to at most one shared expense.

## 6. Shared expenses and settlement

For each shared expense:

```text
total_amount == sum(member owed amounts)
actual payer is stored independently
```

For member `m` over a period:

```text
paid_for_household(m) = sum(expense total where m is payer)
responsibility(m) = sum(split owed amount for m)
raw_credit(m) = paid_for_household(m) - responsibility(m)
```

Settlements reduce the pairwise balance. In a two-person household, positive credit for the user means roommate owes the user. Cash movement and economic burden must both be visible.

## 7. Inventory and cleaning

- Inventory quantity cannot be negative.
- Ownership is either SHARED or one household member.
- Storage is REFRIGERATED, FROZEN, or ROOM_TEMPERATURE.
- Low stock is `quantity <= threshold` when a threshold exists.
- Cleaning status is derived:
  - `DUE`: now >= next_due_at
  - `DUE_SOON`: now >= next_due_at - warning_lead
  - `OK`: otherwise
- Completing a recurring cleaning task records history and advances from the completion time according to its recurrence rule.

## 8. Actual available surplus

Expose two related numbers:

### A. Cash remaining

```text
settled cash inflows
- actual cash outflows classified as expense
```

This reflects account movement. It can temporarily look low when the user prepaid a roommate's share.

### B. Actual available surplus

For planning period `P`:

```text
settled_income(P)
- personal_expense_burden(P)
- household_responsibility_share(P)
- unpaid_confirmed_subscription_and_fixed_obligations_due_in_planning_window(P)
- safety_reserve_top_up_required(P)
+ confirmed_reimbursements_or_settlements_received_that_correct_prior-period burden where applicable
```

Rules:

- Exclude unpaid tutoring receivables from settled income.
- Paid subscriptions are already in actual expenses and must not be subtracted again as unpaid obligations.
- Household charges use the user's owed split for economic burden, not the full amount the user happened to pay.
- A pending roommate reimbursement affects cash visibility but should not increase economic burden twice.
- Transfers, including investment contributions, are excluded.
- The exact query period and planning window must be visible to the user.

## 9. Matching and audit

Matching suggestions are deterministic candidates, not autonomous decisions. Candidate features include amount equality/tolerance, date distance, account, counterparty/descriptor normalized match, and expected source. Confirmation creates an allocation/link plus an audit event. Dismissal is also recorded to avoid repeated noise.
