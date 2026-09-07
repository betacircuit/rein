# Phase 00 — Foundation and Product Shell

## Objective

Create the repository foundation, Korean responsive shell, shared domain primitives, fixture path, quality scripts, and hard safety boundaries before feature work.

## Codex execution instruction

```text
Implement Phase 00 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Read every normative spec file in the order defined by AGENTS.md.
- Use a current stable Next.js App Router setup, strict TypeScript, Tailwind, shadcn/ui, Supabase client skeleton, Vitest, and Playwright.
- Do not delete this specification pack.

## Expected outputs

- App shell with five top-level destinations and global quick-add.
- Money/date/time formula primitives using integer KRW and Asia/Seoul.
- Loading/empty/error/offline/stale patterns.
- Local demo mode and environment validation.
- Lint, typecheck, unit, integration, E2E, build, and verify commands.

## Normative requirements (13)

### [ ] CTX-001 — Context — P0

**Requirement:** Primary persona is 최재원, a second-year student in Seoul National University Electrical and Computer Engineering.

**Acceptance:** Demo profile and product documentation reflect the persona; school/major storage remains optional and private.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CTX-002 — Context — P0

**Requirement:** Default locale is Korean, currency is KRW, and timezone is Asia/Seoul.

**Acceptance:** Dates, money, week boundaries, reminders, and seed data use ko-KR, KRW, and Asia/Seoul.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CTX-005 — Context — P0

**Requirement:** The product is a student personal operating system, not an enterprise finance product.

**Acceptance:** UI language, density, onboarding, and feature scope remain simple and student-friendly.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CTX-006 — Context — P0

**Requirement:** The product must be mobile-first but fully usable on desktop as a responsive PWA.

**Acceptance:** Core journeys pass at 360px mobile width and desktop widths; installable PWA behavior is present where supported.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-001 — Core IA — P0

**Requirement:** Primary navigation contains Home, Tutoring, Money, Household, and Settings.

**Acceptance:** All five top-level destinations exist and are reachable from persistent mobile/desktop navigation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-002 — Core IA — P0

**Requirement:** A global quick-add action supports lesson, income, expense, payment/deposit handling, inventory, and shared expense creation.

**Acceptance:** Quick-add is reachable in one tap/click and opens context-aware creation actions.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-003 — Core IA — P0

**Requirement:** The app unifies tutoring work, cash movement, subscriptions, surplus allocation, and household operations without duplicating records.

**Acceptance:** Cross-module links use a single source record plus references rather than copied amounts.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-004 — Core IA — P0

**Requirement:** Financial data distinguishes work performed, money receivable, planned obligation, and actual account movement.

**Acceptance:** Lesson, receivable, subscription occurrence/shared expense, and financial transaction are separate entities.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-007 — Core IA — P0

**Requirement:** All user-visible monetary values use integer KRW semantics and never floating-point arithmetic.

**Acceptance:** Database uses bigint or numeric integer amounts; TypeScript domain converters prevent precision loss.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-008 — Core IA — P0

**Requirement:** All derived totals must have a single documented formula and automated tests.

**Acceptance:** Formula module and unit tests cover dashboard, settlement, subscription normalization, and surplus totals.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-009 — Core IA — P0

**Requirement:** The app must have clear loading, empty, offline, stale-sync, and recoverable error states.

**Acceptance:** Every data surface provides accessible status feedback and safe retry behavior.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] CORE-010 — Core IA — P0

**Requirement:** No production deployment, production database mutation, financial transfer, or investment trade occurs automatically.

**Acceptance:** External writes require explicit user action and production changes require explicit operator confirmation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-004 — Security — P0

**Requirement:** Service-role keys, provider secrets, and PATs are excluded from version control and browser bundles.

**Acceptance:** Secret scanning and bundle checks pass; .env files are ignored.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] 360 px and desktop navigation smoke tests.
- [ ] Integer-KRW and timezone unit tests.
- [ ] No secret appears in client bundle or tracked files.
- [ ] No production mutation/deployment path can run silently.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 00
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

