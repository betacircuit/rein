# Phase 03 — Ledger, Accounts, and Tutoring Receivables

## Objective

Implement the single actual-cash ledger, accounts, import path, lesson completion receivables, allocations, and confirmation-only matching.

## Codex execution instruction

```text
Implement Phase 03 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phase 02 passes.
- Use mock/manual finance providers; no production bank access.

## Expected outputs

- Accounts and transaction CRUD.
- Income/expense/two-leg transfer semantics.
- Seed categories.
- CSV preview/validation/idempotent import.
- Lesson completion → one receivable.
- Partial and combined receivable allocations.
- Deposit matching suggestions with evidence and audit.

## Normative requirements (18)

### [ ] TUT-014 — Tutoring — P0

**Requirement:** Completing a lesson creates or updates exactly one receivable for the lesson amount.

**Acceptance:** The operation is idempotent and covered by a transaction/integration test.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-015 — Tutoring — P0

**Requirement:** Lesson, receivable, and actual bank/financial transaction remain separate linked records.

**Acceptance:** Unpaid completed work is representable without fake income, and paid income is traceable to its receivable.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-016 — Tutoring — P0

**Requirement:** Receivables support open, partially paid, paid, and void states plus allocations from one or more deposits.

**Acceptance:** Partial and combined payments reconcile correctly and never exceed amount due.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-017 — Tutoring — P0

**Requirement:** Deposit matching suggests receivables using amount, payer/counterparty alias, student, and timing, but requires confirmation.

**Acceptance:** Suggested matches show evidence and confidence; no match is committed without explicit approval.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-001 — Money — P0

**Requirement:** Money contains Overview, Accounts, Transactions, Receivables, Subscriptions, Grow, and Analytics.

**Acceptance:** Every destination exists with coherent cross-links.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-002 — Money — P0

**Requirement:** Accounts store institution, nickname, masked account number, type, currency, current balance, available balance, and last sync time.

**Acceptance:** Account list/detail exposes those fields without displaying a full account number.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-003 — Money — P0

**Requirement:** Account overview shows total included balance, per-account balance, monthly inflow, monthly outflow, and recent transactions.

**Acceptance:** Totals exclude hidden/excluded accounts and transfers are not counted as income or expense.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-004 — Money — P0

**Requirement:** Users can manually create income and expense records.

**Acceptance:** Validated forms persist, edit, and delete manual ledger entries with audit timestamps.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-005 — Money — P0

**Requirement:** Transaction kinds are INCOME, EXPENSE, or TRANSFER.

**Acceptance:** Every ledger row has one kind and transfer rows use a linked transfer group.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-006 — Money — P0

**Requirement:** Transfers between the user's accounts are excluded from income, expense, and spending analytics.

**Acceptance:** Moving 100,000 KRW from bank to investment leaves net worth unchanged and adds zero spending.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-007 — Money — P0

**Requirement:** Income categories include tutoring, scholarship, allowance, and other.

**Acceptance:** Default categories are seeded and user categories can be managed in Settings.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-008 — Money — P0

**Requirement:** Expense categories include food, cafe, transport, housing, shopping, education, subscription, household, and other.

**Acceptance:** Default categories are seeded and categorization appears in analytics.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-009 — Money — P0

**Requirement:** Transactions distinguish personal scope from household-linked scope.

**Acceptance:** Household links point to shared expense/settlement records while personal transactions remain private.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-011 — Money — P0

**Requirement:** A BankProvider adapter supports MOCK, MANUAL_CSV, KFTC_TESTBED, and KFTC_PRODUCTION implementations.

**Acceptance:** MVP runs fully with mock/manual providers; testbed/prod are isolated behind the same interface.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-013 — Money — P0

**Requirement:** Manual CSV import is available as a fallback for transaction history before real bank onboarding.

**Acceptance:** Importer provides preview, duplicate detection, mapping, and rollback-safe commit.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-014 — Money — P0

**Requirement:** Imported bank transactions are idempotent using provider/external identifiers or a deterministic fingerprint.

**Acceptance:** Re-sync/re-import creates no duplicates.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-015 — Money — P0

**Requirement:** Transactions can be linked to receivables, subscription occurrences, shared expenses, settlements, and investment transfers without duplicate expense rows.

**Acceptance:** Each linkage is traceable and uniqueness constraints prevent duplicate payment linkage.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-020 — Money — P0

**Requirement:** Earned but unpaid tutoring is shown separately from settled cash income and excluded from cash-based available surplus.

**Acceptance:** Outstanding receivables never inflate account balance or settled-income totals.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Completing a lesson twice still yields one receivable.
- [ ] Partial/combined allocations reconcile and cannot over-allocate.
- [ ] Transfers do not affect income or spending totals.
- [ ] Duplicate CSV import adds zero duplicates.
- [ ] CSV cells beginning with spreadsheet formula markers are safely handled on export/display.
- [ ] Unpaid tutoring remains outside settled cash and available surplus.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 03
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

