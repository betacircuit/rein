# Phase 04 — Monthly Subscription Management

## Objective

Implement recurring contracts, price history, expected occurrences, matching, renewal/trial views, and the household-subscription bridge.

## Codex execution instruction

```text
Implement Phase 04 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phase 03 ledger and matching foundation pass.

## Expected outputs

- Subscription overview and CRUD.
- All agreed categories, states, cycles, dates, reminders, scope, account/descriptor metadata.
- Deterministic occurrence generation.
- Price history.
- Actual-charge matching with confirmation.
- Household occurrence → exactly one shared expense.
- Keep/review/cancel-candidate and last-used notes.

## Normative requirements (17)

### [ ] SUB-001 — Subscriptions — P0

**Requirement:** Money contains a dedicated Subscriptions area for recurring paid services.

**Acceptance:** Subscriptions is reachable from Money and dashboard cards link to filtered views.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-002 — Subscriptions — P0

**Requirement:** Subscription dashboard shows normalized monthly total, projected annual total, upcoming renewals, trial endings, and unmatched/overdue occurrences.

**Acceptance:** All metrics are derived from active records and occurrence/payment status.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-003 — Subscriptions — P0

**Requirement:** Subscription statuses include trial, active, paused, cancelled, and ended.

**Acceptance:** Status transitions preserve history and affect forecasts correctly.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-004 — Subscriptions — P0

**Requirement:** Subscription categories include AI/software, cloud/storage, education, entertainment, communication, fitness, news, and other.

**Acceptance:** Default categories exist and are filterable.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-005 — Subscriptions — P0

**Requirement:** Subscription details store provider/name, plan, amount, currency, billing cycle, start date, and next charge date.

**Acceptance:** Create/edit/detail flows expose and validate all fields.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-006 — Subscriptions — P0

**Requirement:** Billing cycles support weekly, monthly, quarterly, half-yearly, yearly, and custom day interval.

**Acceptance:** Monthly-equivalent formula tests cover every cycle including leap/year boundary cases.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-007 — Subscriptions — P0

**Requirement:** Subscriptions support trial end, cancel-by date, auto-renew flag, and reminder-day offsets.

**Acceptance:** Upcoming and trial-reminder queries use Asia/Seoul dates and avoid duplicate reminders.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-008 — Subscriptions — P0

**Requirement:** Subscriptions can be personal or household scoped.

**Acceptance:** Household subscriptions require a household and are visible to active household members without exposing private account data.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-009 — Subscriptions — P0

**Requirement:** A household subscription stores payer and responsibility splits independently.

**Acceptance:** 50:50, one-person-all, and custom split presets produce exact integer KRW allocations.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-010 — Subscriptions — P0

**Requirement:** Subscriptions may reference a payment account/card, transaction descriptor pattern, service URL, notes, and last-used date.

**Acceptance:** Optional fields are safe, editable, and not required for basic use.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-011 — Subscriptions — P0

**Requirement:** Price history is retained when a subscription price changes.

**Acceptance:** Editing amount creates an effective-dated history row and preserves past forecasts/payments.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-012 — Subscriptions — P0

**Requirement:** Each expected charge is a SubscriptionOccurrence distinct from an actual financial transaction.

**Acceptance:** Future dues exist before payment without creating fake bank spending.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-013 — Subscriptions — P0

**Requirement:** Actual bank transactions can be matched to subscription occurrences using amount, descriptor, account, and date, with confirmation.

**Acceptance:** Confirmed match marks occurrence paid and does not generate a duplicate expense.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-014 — Subscriptions — P0

**Requirement:** A paid household subscription creates or links one shared expense and its splits rather than duplicate household/money records.

**Acceptance:** One occurrence maps to at most one transaction and one shared expense.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-015 — Subscriptions — P0

**Requirement:** Subscription calendar lists renewal dates and supports 7-day and 30-day filters.

**Acceptance:** Calendar/list views agree across month boundaries.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-016 — Subscriptions — P1

**Requirement:** Users can manually mark keep, review, or cancel-candidate decisions and record last-used date.

**Acceptance:** The app never claims usage it cannot observe; decisions are explicitly user-entered.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-019 — Subscriptions — P0

**Requirement:** Cancellation/ending stops future occurrence generation but preserves historical occurrences and payments.

**Acceptance:** History remains visible and forecasts exclude post-end dates.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Cycle-to-month and annual normalization formulas.
- [ ] Occurrence generation is idempotent and respects cancellation/end.
- [ ] Changing price retains old history and uses effective price by occurrence date.
- [ ] Household occurrence cannot create duplicate shared expenses.
- [ ] Already paid charge is not treated as a second unpaid obligation.
- [ ] 7-day, 30-day, trial, unmatched, and overdue views reconcile.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 04
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

