# Phase 02 — Tutoring Operations

## Objective

Build students, recurrence templates, lessons, prep workflow, online/in-person behavior, and a mock Calendar adapter without introducing receivables yet.

## Codex execution instruction

```text
Implement Phase 02 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Phases 00–01 pass.
- Use mock Calendar by default; real OAuth is Phase 08.

## Expected outputs

- Student CRUD with SUBJECT/SCHOOL_RECORD constraints.
- Only math/physics/chemistry for subject tutoring.
- Scheduled/completed/cancelled lesson workflow with no makeup domain.
- Preparation notes/checklist.
- Weekly recurrence materialization and idempotency.
- Online Meet and in-person location actions.
- Student detail metrics placeholders fed by domain queries.

## Normative requirements (14)

### [ ] TUT-001 — Tutoring — P0

**Requirement:** Students have tutoring type SUBJECT or SCHOOL_RECORD (생기부).

**Acceptance:** Student form requires exactly one tutoring type and filters relevant fields.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-002 — Tutoring — P0

**Requirement:** SUBJECT tutoring permits only Mathematics, Physics, or Chemistry.

**Acceptance:** UI, validation, database constraint, and tests reject every other subject.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-003 — Tutoring — P0

**Requirement:** SCHOOL_RECORD tutoring has no academic subject value.

**Acceptance:** Subject is null and hidden for SCHOOL_RECORD; database check constraint enforces this.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-004 — Tutoring — P0

**Requirement:** Each student has a default lesson mode of online video or in-person.

**Acceptance:** Student creation requires a default mode and conditionally requires location or Meet behavior.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-005 — Tutoring — P0

**Requirement:** Each lesson copies the student's default mode but can override it for that lesson.

**Acceptance:** Changing a student's default does not mutate historical lessons.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-006 — Tutoring — P0

**Requirement:** Lesson statuses are only SCHEDULED, COMPLETED, or CANCELLED; there is no makeup/보강 concept.

**Acceptance:** No enum, field, filter, badge, or workflow named makeup/보강 exists.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-007 — Tutoring — P0

**Requirement:** Scheduled lessons support preparation notes and a lightweight preparation checklist.

**Acceptance:** Prep text/checklist can be edited before class and is visible on Home and lesson detail.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-008 — Tutoring — P0

**Requirement:** Students support default fee amount and default lesson duration.

**Acceptance:** New lessons prefill amount/duration and allow per-lesson overrides without changing history.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-009 — Tutoring — P0

**Requirement:** Recurring tutoring schedules capture weekday, start time, duration, timezone, and effective dates.

**Acceptance:** Schedule generation is deterministic across Asia/Seoul daylight/time boundaries and avoids duplicates.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-010 — Tutoring — P0

**Requirement:** Online lessons can create a Google Calendar event and Google Meet conference.

**Acceptance:** Authorized users can create/sync an event and open its Meet URL from the app.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-012 — Tutoring — P1

**Requirement:** A student may optionally store a manually supplied reusable Meet URL, clearly labeled as a user-managed exception.

**Acceptance:** Manual fixed URL is never represented as copied Google conferenceData and can be disabled per lesson.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-013 — Tutoring — P0

**Requirement:** In-person students/lessons store a visit location and expose a location action instead of Meet.

**Acceptance:** Lesson card displays the correct action for its mode.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-019 — Tutoring — P0

**Requirement:** Student detail shows schedule, lesson history, monthly counts, earned amount, received amount, and outstanding receivables.

**Acceptance:** All figures reconcile to ledger/receivable records for selected month.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] TUT-020 — Tutoring — P1

**Requirement:** Student records may store payer/deposit alias and operational notes, but no unnecessary sensitive school-record documents are uploaded in MVP.

**Acceptance:** MVP contains no document upload flow; notes are access-controlled and minimal.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Every illegal tutoring type/subject combination is rejected in UI, server, and DB.
- [ ] Changing student defaults does not mutate historical lessons.
- [ ] Schedule materialization does not duplicate lessons.
- [ ] Repository/UI search finds no makeup/보강 domain term.
- [ ] No document-upload route exists for school-record tutoring.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 02
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

