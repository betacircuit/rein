# Phase 01 — Authentication and Household Privacy Boundary

## Objective

Implement authentication, profiles, household creation/invitation, membership states, and adversarial RLS foundations.

## Codex execution instruction

```text
Implement Phase 01 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phase 00 quality gate passes.
- Local Supabase is running and migrations are versioned.

## Expected outputs

- Profile onboarding.
- Create/join household flow for user and roommate.
- Owner/member and invited/active/left states.
- RLS helper functions and policies for private versus shared data.

## Normative requirements (5)

### [ ] CTX-003 — Context — P0

**Requirement:** The user lives in a two-room rental with one friend and needs shared-home operations.

**Acceptance:** A household can contain the user and one roommate, while the schema remains extensible to more members.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-001 — Household — P0

**Requirement:** Household is a separate shared data boundary from the user's private finance data.

**Acceptance:** Roommate can access shared household records but never the user's private accounts/transactions.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-002 — Household — P0

**Requirement:** Household supports owner/member roles and invite/active/left membership states.

**Acceptance:** Invite acceptance and membership checks are enforced by RLS and tests.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-001 — Security — P0

**Requirement:** Supabase Row Level Security is enabled on every user or household data table.

**Acceptance:** Automated RLS tests prove cross-user and nonmember access is denied.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-002 — Security — P0

**Requirement:** Private finance rows are owner-only; household rows are available only to active household members.

**Acceptance:** Roommate cannot query accounts, private transactions, bank connections, or private subscriptions.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Unauthenticated access denied.
- [ ] User B cannot read User A private rows.
- [ ] Nonmember cannot read household rows.
- [ ] Active member can read allowed shared rows but not private finance.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 01
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

