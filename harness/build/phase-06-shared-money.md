# Phase 06 — Shared Household Expenses and Settlement

## Objective

Represent actual payer separately from economic responsibility, compute exact splits and net settlement, and connect shared costs to the private ledger without leaking account data.

## Codex execution instruction

```text
Implement Phase 06 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phases 03 and 05 pass.
- Household subscription bridge from Phase 04 is available.

## Expected outputs

- Shared expense CRUD and agreed categories.
- 50:50, user-all, roommate-all, and exact custom splits.
- Every-KRW split validation.
- Net settlement and partial settlements.
- Transaction classification/linking.
- Roommate settlement matching suggestion.
- Responsibility-adjusted Money/Grow projection.

## Normative requirements (8)

### [ ] MON-016 — Money — P0

**Requirement:** The app distinguishes actual bank cash movement from economic responsibility in shared expenses.

**Acceptance:** A user paying 100% of rent but owing 50% sees cash outflow 100% and personal burden 50%, with the remainder receivable from roommate.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-013 — Household — P0

**Requirement:** Shared expense categories include rent, management fee, electricity, gas, water, internet, household goods, shared groceries, subscription, and other.

**Acceptance:** All categories are available and appear in monthly totals.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-014 — Household — P0

**Requirement:** Shared expenses store actual payer separately from responsibility splits.

**Acceptance:** Payer and split totals are independently editable before settlement.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-015 — Household — P0

**Requirement:** Split presets support equal 50:50, user pays all, roommate pays all, and custom amounts/percentages.

**Acceptance:** Rounding assigns every KRW exactly once and split sum equals total.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-016 — Household — P0

**Requirement:** Household settlement computes the net amount one member owes the other across expenses and prior settlements.

**Acceptance:** Pairwise netting test covers payer reversals, refunds, and partial settlements.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-017 — Household — P0

**Requirement:** A bank deposit can be suggested and confirmed as a roommate settlement payment.

**Acceptance:** Confirmed allocation changes settlement status and retains transaction traceability.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-018 — Household — P0

**Requirement:** Household costs affect Money analytics and Grow using the user's responsibility share, with reconciliation to actual cash paid/received.

**Acceptance:** No shared cost is omitted or counted twice in dashboard formulas.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-019 — Household — P0

**Requirement:** A bank transaction can be classified as household shopping, housing, utility, or personal spending through a confirmation flow.

**Acceptance:** Classification creates/links the correct shared expense only after confirmation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Split totals always equal total amount.
- [ ] Payer and responsibility can differ.
- [ ] Private account/counterparty details do not leak to roommate projections.
- [ ] Historical expenses are not rewritten by settlement.
- [ ] One actual charge is counted once across Money, Subscription, and Household.
- [ ] Partial settlement updates net balance correctly.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 06
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

