# Phase 05 — Household Inventory, Shopping, and Cleaning

## Objective

Build fast shared-home operational tools that work well for two roommates while remaining extensible.

## Codex execution instruction

```text
Implement Phase 05 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Household boundary exists.
- Shared money settlement is deliberately deferred to Phase 06.

## Expected outputs

- Inventory list/detail and atomic +/- adjustment.
- Mine/roommate/shared ownership through member references.
- Refrigerated/frozen/room-temperature storage.
- Low-stock → shopping linkage.
- Personal/member/shared shopping items.
- Cleaning recurrence, derived state, completion history.
- Demo chicken breast and partially refrigerated Monster stock.

## Normative requirements (11)

### [ ] CTX-004 — Context — P1

**Requirement:** Demo household inventory reflects chicken breast as a fixed lunch item and Monster drinks split between refrigerated and room-temperature storage.

**Acceptance:** Demo data includes chicken breast and Monster items in appropriate locations without treating all Monster cans as refrigerated.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-003 — Household — P0

**Requirement:** Household overview shows shared monthly cost, user's share, roommate settlement balance, low-stock items, and cleaning status.

**Acceptance:** Cards link to filtered detail and reconcile to source rows.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-004 — Household — P0

**Requirement:** Inventory items store name, quantity, unit, ownership, storage location, optional expiry, low-stock threshold, and notes.

**Acceptance:** Create/edit/detail flows and schema include every field.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-005 — Household — P0

**Requirement:** Inventory ownership can be mine, roommate's, or shared, represented with member ownership rather than hard-coded labels.

**Acceptance:** UI renders friendly labels for the current two-person household and schema supports additional members.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-006 — Household — P0

**Requirement:** Inventory storage locations are refrigerated, frozen, or room temperature.

**Acceptance:** List filters and validation use exactly those options in MVP.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-007 — Household — P0

**Requirement:** Inventory quantity supports fast plus/minus adjustment with an audit-safe nonnegative result.

**Acceptance:** Concurrent adjustment test prevents lost updates and negative quantity.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-008 — Household — P0

**Requirement:** Low-stock items can create a shopping-list item.

**Acceptance:** Action is idempotent and links shopping item to its inventory source.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-009 — Household — P0

**Requirement:** Shopping items can be personal/member-owned or shared and can later link to a transaction/shared expense.

**Acceptance:** Purchased status and linkage do not duplicate financial records.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-010 — Household — P0

**Requirement:** Cleaning tasks store title, area, assignee, recurrence, last completion, next due time, and active state.

**Acceptance:** Task creation and completion correctly advance the next due time.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-011 — Household — P0

**Requirement:** Cleaning presents simple derived states: OK, due soon, and due/overdue.

**Acceptance:** State is calculated from now, next due, and warning lead time rather than manually drifting.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-012 — Household — P0

**Requirement:** Marking cleaning complete records who/when and recalculates schedule.

**Acceptance:** Completion history is retained and next due is deterministic.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Inventory cannot become negative under concurrent/retried adjustment.
- [ ] Low-stock action does not create duplicate open shopping items.
- [ ] Cleaning completion records actor/time and computes next due.
- [ ] Roommate sees shared operational rows according to RLS.
- [ ] Demo seed reflects the exact food/drink context.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 05
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

