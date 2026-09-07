# API and Integration Specification

## 1. Adapter rule

External systems must not leak provider-specific structures into UI or core domain code. Define typed ports and provider implementations.

```ts
interface CalendarProvider {
  createLessonEvent(input: CreateLessonEventInput): Promise<CalendarEventResult>
  updateLessonEvent(input: UpdateLessonEventInput): Promise<CalendarEventResult>
  cancelLessonEvent(input: CancelLessonEventInput): Promise<void>
  getConnectionStatus(userId: string): Promise<ConnectionStatus>
}

interface BankProvider {
  listAccounts(connectionId: string): Promise<ExternalBankAccount[]>
  getBalance(accountRef: string): Promise<BankBalance>
  listTransactions(input: TransactionSyncInput): Promise<TransactionPage>
  revoke(connectionId: string): Promise<void>
}
```

Implement `MockCalendarProvider`, `GoogleCalendarProvider`, `MockBankProvider`, `ManualImportProvider`, `KftcTestbedProvider`, and a disabled-by-default `KftcProductionProvider`.

## 2. Google Calendar / Meet

### Application behavior

- OAuth connection is initiated from Settings.
- Ask only for the scopes required to create/update the user's selected calendar events.
- Create one event per materialized lesson by default.
- For an online lesson, request a fresh Google Meet conference using `conferenceData.createRequest` and send `conferenceDataVersion=1`.
- Never reuse/copied `conferenceData` across unrelated events.
- Optional `manual_fixed_meet_url` is merely opened; the application does not claim ownership or mutate its conference.
- Store event ID, calendar ID, HTML link, Meet URL, idempotency key, sync state, last attempted/succeeded time, and redacted error.
- Use stable application-generated event IDs or extended private properties to prevent duplicate events on retry.
- Only update/delete events created by or explicitly linked to the app.
- Cancelled lessons may either cancel the linked event after explicit policy/confirmation or keep it with a cancelled title; behavior must be consistent and documented.

### Mock behavior

Return deterministic event and Meet URLs from lesson ID, simulate success/pending/error, and expose a demo calendar link. The complete tutoring flow must pass without Google credentials.

## 3. Korean Open Banking / KFTC

### Product boundary

Use only account/balance/transaction inquiry capability. Do not implement withdrawal transfer, deposit transfer, or payment initiation even if the provider offers those APIs.

### Provider data

The KFTC adapter should map provider account registration/reference data to an internal encrypted connection reference and `fintech_use_num` secret reference. Balance inquiry returns balance and available amount. Transaction history maps date/time, in/out type, printed content/counterparty, amount, and after-balance.

### Pagination and sync

- Provider transaction pages can be limited; follow next-page state until finished or the configured safety cap.
- Sync a bounded period and retain a cursor/last successful timestamp.
- Generate provider external ID when available; otherwise deterministic fingerprint from account/date/time/direction/amount/description/after-balance plus collision handling.
- Repeated sync is idempotent.
- Rate limits and transient failures use bounded exponential backoff with jitter.
- Never log tokens, fintech-use numbers, full account numbers, or raw user authorization responses.

### Environment graduation

1. Mock provider.
2. Manual CSV import.
3. KFTC developer testbed.
4. Formal application/contract/security process.
5. Production read-only feature flag, disabled by default.

The UI must describe live integration as unavailable until the current deployment is actually approved and configured.

## 4. Manual CSV import

Use a two-step flow:

1. Upload locally/server-side with strict size/type limits.
2. Parse and normalize with a preview table.
3. Map required columns: date/time, in/out, amount, description, optional balance.
4. Detect duplicates before commit.
5. Escape spreadsheet-formula-leading text on export and never execute uploaded content.
6. Commit atomically; return imported/skipped/error counts.

Store the original file only if needed and explicitly disclosed; default to discard after parsing.

## 5. Matching service

Candidate target types:

- tutoring receivable;
- subscription occurrence;
- shared expense classification;
- roommate settlement;
- investment transfer counterpart.

Evidence includes amount match, date distance, normalized descriptor/alias, expected account, and status. Confidence is explanatory only. User confirmation creates an allocation/link and audit event. Never auto-confirm a financial classification in MVP.

## 6. Scheduled jobs

Use a server-side scheduler/cron for:

- materializing a bounded lesson window;
- materializing subscription occurrences;
- marking due/overdue states;
- creating in-app reminders;
- optionally refreshing development/test bank data.

Jobs require a secret, are idempotent, use distributed/advisory locks where needed, and emit redacted structured logs.

## 7. Internal API/command boundary

The application may use Server Actions rather than public REST. Preserve command/query boundaries corresponding to `docs/openapi.yaml` so tests and adapters remain stable. Every mutation rechecks authentication and ownership/membership server-side.

## 8. Sync freshness

Each provider connection/account exposes:

- last attempt;
- last success;
- status: current/stale/error/disconnected;
- redacted error code/message;
- manual retry action.

The last known balance remains visible with its timestamp after a failure. Never label stale data “현재” without a qualifier.
