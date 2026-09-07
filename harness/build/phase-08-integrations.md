# Phase 08 — Google Calendar and Read-only Banking Integrations

## Objective

Implement real adapters behind safe interfaces while preserving a complete credential-free mock/manual product path.

## Codex execution instruction

```text
Implement Phase 08 of Student OS. Read AGENTS.md and all normative specifications first.
Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.
Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.
Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.
Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.
```

## Prerequisites

- Core product passes with mock adapters.
- Use development Google project and KFTC testbed only.
- Do not connect production personal/financial data through MCP.

## Expected outputs

- Minimum-scope Google OAuth and Calendar adapter.
- Unique conference create request per lesson event.
- Stored external IDs, sync state, errors, disconnect/revoke.
- Read-only bank provider contract for balance/history.
- KFTC testbed adapter shape, pagination, incremental sync, redaction.
- Bounded retry/idempotency and contract tests.
- Production KFTC hard feature gate.

## Normative requirements (14)

### [ ] TUT-011 — Tutoring — P0

**Requirement:** Default Meet behavior generates unique conference data per lesson event; it must not copy conferenceData between unrelated events.

**Acceptance:** Calendar adapter uses conferenceData.createRequest with conferenceDataVersion=1 for each generated lesson event.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-010 — Money — P0

**Requirement:** Bank integrations are read-only in this product: account discovery/registration, balance inquiry, and transaction-history inquiry only.

**Acceptance:** No withdrawal, deposit-transfer, payment initiation, or credential collection UI is implemented.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] MON-012 — Money — P0

**Requirement:** KFTC production mode remains disabled until institutional application, contract, eligibility, consent, and security requirements are satisfied.

**Acceptance:** Feature flag and operator documentation prevent accidental production activation.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-001 — Integrations — P0

**Requirement:** Google integration uses OAuth with the minimum Calendar scopes required for selected behavior.

**Acceptance:** Consent screen/scopes are documented and tokens are server-only.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-002 — Integrations — P0

**Requirement:** Calendar event creation stores external event ID, calendar link, Meet URL, sync state, and last sync error.

**Acceptance:** Retry is idempotent using a stable app event identifier.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-003 — Integrations — P0

**Requirement:** Calendar deletion/cancellation behavior is explicit and never silently deletes a user's unrelated event.

**Acceptance:** Only events created or explicitly linked by the app can be mutated.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-004 — Integrations — P0

**Requirement:** KFTC balance and transaction-history calls use server-side access tokens and fintech-use numbers, never browser storage.

**Acceptance:** Threat model and implementation tests verify secrets are absent from client bundles/logs.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-005 — Integrations — P0

**Requirement:** KFTC transaction pagination handles the provider page limit and incremental sync safely.

**Acceptance:** Adapter follows next-page state and stops without duplicate or skipped records.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-006 — Integrations — P0

**Requirement:** All external adapters have mock implementations and contract tests.

**Acceptance:** The complete app can be demonstrated without real Google/KFTC credentials.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-007 — Integrations — P0

**Requirement:** Sync jobs expose last success, last attempt, stale status, and actionable error messages.

**Acceptance:** UI never presents stale balances as silently current.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-008 — Integrations — P0

**Requirement:** External API retries are bounded and idempotent with structured logging and redaction.

**Acceptance:** Tests cover timeout, rate limit, duplicate request, and provider error cases.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] INT-010 — Integrations — P0

**Requirement:** Google Calendar integration is an app API integration; a personal Google Calendar Codex plugin is optional for developer workflow and is not an application dependency.

**Acceptance:** Application runs without any Codex connector installed.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-003 — Security — P0

**Requirement:** OAuth/bank refresh tokens and secrets are never stored in plaintext application tables or client-accessible environment variables.

**Acceptance:** Secrets use a server-side encrypted secret reference and are redacted from logs/errors.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

### [ ] SEC-005 — Security — P0

**Requirement:** External access follows least privilege and explicit consent, with disconnect/revoke controls.

**Acceptance:** Integrations page shows scopes/status and supports safe disconnect.

**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.

## Required tests and review

- [ ] Unrelated Calendar events are never modified/deleted.
- [ ] Every generated lesson conference uses a fresh request ID.
- [ ] Provider tokens are server-only and absent from client/storage tables.
- [ ] Pagination/import retries produce no duplicate transaction.
- [ ] Mock, manual, unavailable, stale, revoked, and error states remain fully usable.
- [ ] Production KFTC path cannot enable without explicit operational gates.
- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.
- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.

## Exit report template

```text
Phase: 08
Requirement evidence: <ID -> files/tests>
Commands run: <command + result>
Browser journeys verified: <viewport + route + result>
Security/RLS checks: <result>
External blockers: <none or precise credential/eligibility item; mock path must still pass>
Decisions/risks recorded: <DECISIONS.md entries>
```

