# Phase 07 — Home, Grow, and Analytics

## Objective

Turn the verified domain model into a useful action-first home screen, month analytics, and one conservative student-level surplus-allocation workflow.

## Codex execution instruction

```text
Implement Phase 07 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- All operational and money phases 00–06 pass.
- Use formula services rather than component-local arithmetic.

## Expected outputs

- Action-first Home dashboard.
- Monthly tutoring earned/received/outstanding.
- Cash flow, category, student, effective hourly, subscription/fixed cost, asset trend analytics.
- Available-surplus formula.
- Safety reserve/long-term/flexible allocation.
- Fixed or percentage contribution rule.
- Planned/completed contribution linked to transfer.
- Neutral educational risk disclosure.

## Normative requirements (25)

### [ ] CORE-005 — Core IA — P1

**Requirement:** Money analytics include monthly cash flow, spending by category, tutoring income by student, effective hourly income, fixed/subscription costs, and asset trend.

**Acceptance:** Analytics page renders each metric from real domain queries with empty/loading/error states.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-018 — Tutoring — P1

**Requirement:** Effective hourly income includes lesson time, preparation minutes, and travel minutes.

**Acceptance:** Student and lesson analytics show nominal and effective hourly rates using documented formulas.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-017 — Money — P1

**Requirement:** Asset overview includes cash/account balances and tracked long-term investment value.

**Acceptance:** Total assets and component values reconcile and transfers do not change total assets.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-019 — Money — P1

**Requirement:** Money analytics provide month selection and compare current month with a previous month.

**Acceptance:** Comparison uses consistent date boundaries and indicates incomplete current-month data.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-017 — Subscriptions — P1

**Requirement:** Local-only insights may flag duplicate-category subscriptions or review candidates without recommending a specific commercial replacement.

**Acceptance:** Insight explains its rule and source records; it is dismissible and deterministic.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SUB-018 — Subscriptions — P0

**Requirement:** Unpaid confirmed subscription obligations due in the planning window reduce actual available surplus, while already paid charges are not subtracted twice.

**Acceptance:** Formula tests cover unpaid, matched, skipped, cancelled, and household split cases.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-001 — Grow — P0

**Requirement:** Grow implements one simple student-level method: monthly surplus allocation and recurring long-term contribution tracking.

**Acceptance:** No stock picking, leverage, derivatives, auto-trading, or return guarantee appears.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-002 — Grow — P0

**Requirement:** Grow separates safety reserve, long-term contribution, and flexible money.

**Acceptance:** Monthly plan and completion state show all three buckets.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-003 — Grow — P0

**Requirement:** Investment funding is modeled as an inter-account transfer, not an expense.

**Acceptance:** Contribution transfer changes asset composition but not total assets or spending.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-004 — Grow — P0

**Requirement:** Grow tracks planned and completed monthly contribution amounts.

**Acceptance:** A contribution can be pending, partially completed, completed, skipped, or cancelled.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-005 — Grow — P0

**Requirement:** Actual available surplus is the primary decision metric.

**Acceptance:** Home and Grow display the same tested value for the selected planning period.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-006 — Grow — P0

**Requirement:** Actual available surplus starts from settled cash inflows, not billed or unpaid tutoring work.

**Acceptance:** Open receivables are excluded until a linked payment transaction exists.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-007 — Grow — P0

**Requirement:** Actual available surplus subtracts personal expenses, the user's economic share of household costs, unpaid confirmed subscription/fixed obligations in the window, and required safety-reserve top-up, without double counting.

**Acceptance:** Scenario tests document and verify every term.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-008 — Grow — P0

**Requirement:** The app displays actual cash remaining separately from responsibility-adjusted available surplus.

**Acceptance:** Shared-expense prepayment/settlement scenarios show different but reconcilable figures.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-009 — Grow — P0

**Requirement:** Grow tracks current cash assets and long-term investment value for visibility only.

**Acceptance:** Values are manual or account-derived and clearly timestamped.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-010 — Grow — P0

**Requirement:** Investment guidance is educational and neutral, discloses possible principal loss, and never promises performance.

**Acceptance:** Copy review finds no guarantee, urgency, or personalized security recommendation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] GROW-011 — Grow — P1

**Requirement:** A fixed monthly amount or percentage-of-available-surplus rule can define the contribution plan.

**Acceptance:** Rules produce deterministic integer KRW planned amounts with a configurable cap.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-001 — Home dashboard — P0

**Requirement:** Home shows today's lessons with student, tutoring type/subject, time, mode, preparation notes, and Meet/location action.

**Acceptance:** Today's schedule is ordered and each lesson card has the correct primary action.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-002 — Home dashboard — P0

**Requirement:** Home shows monthly tutoring forecast from active recurring schedules, earned, received, and outstanding amounts separately.

**Acceptance:** Forecast is clearly labeled and reconciles to schedule/fee assumptions; earned, received, and outstanding match lesson/receivable/payment records; forecast is never treated as settled cash or available surplus.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-003 — Home dashboard — P0

**Requirement:** Home shows total account balance, monthly settled income, and monthly expense.

**Acceptance:** Transfers and unpaid receivables are excluded from income/expense.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-004 — Home dashboard — P0

**Requirement:** Home shows subscriptions due soon and trial endings.

**Acceptance:** Cards link to correctly filtered subscription views.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-005 — Home dashboard — P0

**Requirement:** Home shows actual available surplus and current Grow plan status.

**Acceptance:** Values match Grow page and formulas.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-006 — Home dashboard — P0

**Requirement:** Home shows refrigerator low-stock alerts, cleaning due state, and roommate settlement balance.

**Acceptance:** Each alert links to the source household module.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-007 — Home dashboard — P0

**Requirement:** Home shows pending suggested matches for tutoring deposits, subscription charges, household expenses, and settlements.

**Acceptance:** Suggestions can be reviewed, accepted, or dismissed without silent mutation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] DASH-008 — Home dashboard — P0

**Requirement:** Home prioritizes actions required today rather than presenting a dense finance dashboard.

**Acceptance:** Mobile first viewport exposes today's actions before secondary analytics.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Unpaid tutoring is excluded from settled cash and surplus.
- [ ] User household responsibility, not merely cash paid, affects surplus.
- [ ] Paid obligations are not subtracted twice.
- [ ] Investment contribution is a transfer and total assets remain unchanged.
- [ ] Nominal/effective hourly formulas include correct time inputs.
- [ ] Every chart has a readable text/table equivalent.
- [ ] Dashboard totals reconcile with detail screens.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 07
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

