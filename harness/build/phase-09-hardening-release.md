# Phase 09 — Hardening, Accessibility, Export, and Preview Release

## Objective

Finish the product rather than merely demonstrating it: accessibility, PWA behavior, settings, privacy operations, CI, security evidence, and preview deployment.

## Codex execution instruction

```text
Implement Phase 09 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phases 00–08 pass locally.
- Production deployment remains a separately confirmed action.

## Expected outputs

- Complete settings hierarchy.
- Data export and deletion with retention explanation.
- PWA manifest/offline read-only shell.
- WCAG 2.2 AA-oriented fixes.
- No-dead-button sweep.
- Security, dependency, migration, and secret scans.
- CI workflow and preview deployment documentation.
- Requirement evidence in PROGRESS.md.

## Normative requirements (23)

### [ ] CORE-006 — Core IA — P1

**Requirement:** Settings include profile, categories, accounts, tutoring defaults, integrations, notifications, and data export/backup.

**Acceptance:** Each settings area has a functional page or explicitly labeled deferred adapter without dead controls.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-018 — Money — P1

**Requirement:** Account types may include bank, cash, card, investment, and other; card automation is not required in MVP.

**Acceptance:** Schema supports all types while UI labels unsupported sync modes honestly.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-020 — Subscriptions — P1

**Requirement:** Subscription reminders are represented in-app first; push/email delivery is optional future work.

**Acceptance:** MVP has an in-app reminder center with no misleading unavailable notification toggle.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-012 — Grow — P1

**Requirement:** Brokerage execution is explicitly out of scope; completed contributions are confirmed manually or matched to transfer transactions.

**Acceptance:** There is no buy/sell endpoint or brokerage credential field.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] HOM-020 — Household — P1

**Requirement:** Barcode scanning and receipt OCR are explicitly deferred; manual inventory/shopping flows must be fast enough for MVP.

**Acceptance:** No fake OCR/barcode control exists in production UI.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-009 — Integrations — P1

**Requirement:** Vercel deployment and Supabase migrations use preview/development environments before production.

**Acceptance:** Runbook requires preview verification and explicit production confirmation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-001 — UX — P0

**Requirement:** Korean is the only required UI language in MVP, with plain student-friendly copy.

**Acceptance:** No mixed-language production labels except unavoidable service names.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-002 — UX — P0

**Requirement:** Desktop uses a sidebar and mobile uses bottom navigation with a clear global add action.

**Acceptance:** Navigation remains reachable, keyboard accessible, and safe-area aware.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-003 — UX — P0

**Requirement:** Forms use progressive disclosure and conditional fields instead of enterprise-style dense screens.

**Acceptance:** Student, subscription, and shared-expense forms reveal only relevant fields.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-004 — UX — P0

**Requirement:** All destructive and cross-record linking actions require confirmation and explain effects.

**Acceptance:** Delete, cancel, match, settle, unlink, and regenerate actions have safe dialogs/undo where practical.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-005 — UX — P0

**Requirement:** Accessibility targets WCAG 2.2 AA for color contrast, focus, labels, semantics, and touch targets.

**Acceptance:** Automated accessibility checks pass and manual keyboard/screen-reader smoke checks are documented.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-006 — UX — P0

**Requirement:** Dates and money are formatted consistently with clear month filters and no timezone ambiguity.

**Acceptance:** All date formatting routes through shared utilities and tests.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-007 — UX — P0

**Requirement:** Charts are secondary to readable numbers and lists and have accessible text equivalents.

**Acceptance:** Every chart has a table/summary and works without color alone.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-008 — UX — P1

**Requirement:** PWA supports basic offline shell and read-only cached recent data, while writes require network and show pending state only if safely queued.

**Acceptance:** Offline behavior is honest and never pretends a financial write succeeded.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-009 — UX — P0

**Requirement:** No placeholder button may ship without either a working action or an explicit disabled/deferred explanation.

**Acceptance:** E2E crawl finds no dead interactive controls.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] UX-010 — UX — P0

**Requirement:** Every page has empty-state guidance based on the user's next useful action.

**Acceptance:** New-account demo can reach a useful first record from each empty page.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-006 — Security — P0

**Requirement:** Sensitive student, household, and financial values are minimized in logs and analytics.

**Acceptance:** Structured logger redacts names, account identifiers, notes, and tokens by default.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-007 — Security — P0

**Requirement:** Input validation, output encoding, CSRF/session protection, rate limits, and authorization checks apply to server mutations.

**Acceptance:** Security tests and review cover OWASP-relevant paths.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-008 — Security — P0

**Requirement:** Data export and account deletion are available with explicit confirmation and retention behavior.

**Acceptance:** User can export owned/shared-relevant data and request deletion without orphaning required settlement history incorrectly.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-009 — Security — P0

**Requirement:** The app documents that finance figures are informational and may be stale; it is not a bank, broker, tax adviser, or investment adviser.

**Acceptance:** Relevant screens and terms include concise disclaimers without obstructing normal use.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-010 — Security — P0

**Requirement:** Development MCP tools are scoped to development/test projects and never connected to production financial or personal data by default.

**Acceptance:** MCP setup file defaults Supabase to project-scoped read-only and marks production prohibited.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-011 — Security — P0

**Requirement:** Dependency, migration, and security scans run in CI before merge/deploy.

**Acceptance:** CI includes typecheck, lint, tests, build, migration checks, secret scan, and dependency/security review.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-012 — Security — P0

**Requirement:** Every match/reconciliation decision retains an audit record of actor, timestamp, source, and prior/new linkage.

**Acceptance:** Audit history can explain why each receivable, subscription, shared expense, or settlement was marked paid.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Keyboard-only and mobile touch journeys.
- [ ] Axe/accessibility smoke and text alternatives.
- [ ] RLS adversarial matrix for all protected tables.
- [ ] Export round-trip/sanitization and deletion confirmation.
- [ ] Offline read behavior is honest; unsafe writes are not silently queued.
- [ ] No secret or sensitive log leakage.
- [ ] Every P0/P1 requirement has evidence and all pack checks pass.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 09
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

