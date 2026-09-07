# Explicit Post-MVP Backlog

## Objective

Keep deferred ideas visible without creating placeholder controls, hidden partial implementations, or scope creep in MVP.

## Codex execution instruction

```text
Implement only the documentation for Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Do not implement these during the main phases unless the user explicitly reprioritizes them.

## Expected outputs

- Backlog issues/notes only, with privacy and safety implications.
- No dead navigation or fake buttons.

## Normative requirements (6)

### [ ] FUT-001 — Backlog — P2

**Requirement:** Receipt OCR is a future enhancement, not MVP.

**Acceptance:** Tracked in backlog only.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] FUT-002 — Backlog — P2

**Requirement:** Barcode scanning is a future enhancement, not MVP.

**Acceptance:** Tracked in backlog only.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] FUT-003 — Backlog — P2

**Requirement:** AI-assisted transaction categorization and monthly reports are future enhancements and require explainability/confirmation.

**Acceptance:** Tracked in backlog only; no fake AI in MVP.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] FUT-004 — Backlog — P2

**Requirement:** Broader budgets, fixed recurring income/expense rules, cards, and richer asset allocation are future enhancements.

**Acceptance:** Tracked in backlog only.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] FUT-005 — Backlog — P2

**Requirement:** Push/email reminder delivery is future work after in-app reminders.

**Acceptance:** Tracked in backlog only.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] FUT-006 — Backlog — P2

**Requirement:** No brokerage auto-execution or open-banking transfer initiation is planned for MVP.

**Acceptance:** Tracked as explicitly excluded unless separately redesigned and approved.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Search confirms the features are absent from active UI except as clearly labeled roadmap documentation.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: backlog
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

