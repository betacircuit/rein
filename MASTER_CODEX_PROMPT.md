# MASTER CODEX PROMPT — Student OS Full Build

Paste everything below into Codex from the repository root.

---

You are the principal product engineer, data architect, UX engineer, security reviewer, and test owner for this repository. Build the complete `Student OS` application described by the checked-in specification. Do not produce only a mockup, static prototype, or plan. Produce a working, tested, responsive application with a local/demo path that requires no external credentials and clearly isolated adapters for real integrations.

## 0. Operating mode

1. First read `AGENTS.md`, then every file in the mandatory reading order. Treat them as the source of truth.
2. Inspect the repository. If app code does not exist, initialize it in this repository without deleting the specification pack.
3. Use current stable primary documentation and configured MCP servers before selecting package APIs. Do not rely on stale memory for Next.js, Supabase, Google Calendar, Codex, or provider behavior.
4. Work phase by phase from `PLANS.md` and `harness/build/`. Do not skip ahead in a way that leaves broken invariants.
5. Before each vertical slice, state the requirement IDs and a short implementation plan. Then implement; do not stop at explanation.
6. Run tests and browser verification after each slice. Fix failures. Update `PROGRESS.md` and `DECISIONS.md` with evidence.
7. Do not ask for credentials as a prerequisite. Implement the adapter interface, mock provider, fixtures, setup screen, error states, and contract tests. Only the final real OAuth/testbed handshake can remain blocked by missing user credentials or external eligibility.
8. Never push, deploy production, mutate production data, enable production KFTC, initiate money movement, or make an investment trade without explicit user confirmation. Local Git commits are allowed after a phase passes; do not push.
9. Do not silently remove a requirement to save time. When two requirements appear in tension, preserve both using a clear model and record the decision.

## 1. Required stack and architecture

Use:

- Current stable Next.js 16+ App Router, TypeScript strict mode.
- Tailwind CSS and shadcn/ui.
- Supabase Postgres, Auth, Realtime where useful, and RLS on every protected table.
- Supabase SQL migrations as the authoritative schema and generated TypeScript database types.
- Zod and React Hook Form.
- Vitest + Testing Library for unit/component tests.
- Playwright for end-to-end/browser/accessibility smoke tests.
- Vercel-ready deployment with development/preview/prod separation.
- Korean UI, KRW, Asia/Seoul, responsive PWA.

Prefer Server Components and server-side domain services. Keep secrets, privileged clients, OAuth tokens, and bank provider calls server-only. Do not add Prisma unless you write an ADR proving a concrete necessity and preserve migrations/RLS as the source of truth.

Recommended source layout:

```text
src/
  app/
  components/
  features/
    tutoring/
    money/
    subscriptions/
    grow/
    household/
    dashboard/
  domain/
    money/
    matching/
    recurrence/
    settlements/
    surplus/
  integrations/
    calendar/
    banking/
  lib/supabase/
  server/
  test/
supabase/
  migrations/
  tests/
```

You may improve the layout, but keep feature boundaries and shared domain calculations explicit.

## 2. Product identity and complete hierarchy

This is a simple student personal operating system for 최재원, a second-year Seoul National University Electrical and Computer Engineering student. The private persona context is not a public profile requirement. The user lives with one friend in a two-room rental.

Top-level navigation is exactly:

```text
Home | Tutoring | Money | Household | Settings
```

Mobile uses bottom navigation and a global add action; desktop uses a sidebar. Money contains Accounts, Transactions, Receivables, Subscriptions, Grow, and Analytics. Household contains Inventory/Fridge, Shopping, Cleaning, Shared Expenses, and Settlement.

## 3. Non-negotiable data-flow model

Never collapse these layers:

```text
Lesson -> Receivable -> allocation -> actual FinancialTransaction
Subscription -> SubscriptionOccurrence -> actual FinancialTransaction
                                     -> one SharedExpense when household scoped
SharedExpense -> exact member splits -> Settlement -> actual FinancialTransaction
Grow plan -> contribution -> two-leg TRANSFER between own accounts
```

Work performed is not cash. A planned bill is not a bank transaction. A transfer is not spending. The same real-world charge must never appear twice merely because two modules display it.

## 4. Detailed implementation instructions

### Tutoring
- Student tutoring type is SUBJECT or SCHOOL_RECORD.
- SUBJECT allows only math, physics, chemistry. SCHOOL_RECORD requires null subject.
- Student default mode is online or in-person; lesson copies but may override.
- Lesson states are only scheduled, completed, cancelled. There is absolutely no makeup/보강 field, state, page, action, or wording.
- Scheduled lessons have preparation text and checklist.
- Store default/per-lesson amount and duration; recurring weekday schedules; offline location; payer alias; notes.
- Online lesson Calendar integration creates an event and Google Meet. Generate unique conference data per lesson event using a fresh create request. Never copy conferenceData across unrelated events. Permit a clearly labeled optional manually entered fixed Meet URL owned by the user.
- Completion creates exactly one receivable idempotently. Support partial/combined allocations from deposits.
- Suggested payment matching uses amount, counterparty alias, student, and date evidence, but never commits autonomously.
- Calculate nominal and effective hourly income, including prep and travel time.

### Money
- Accounts: institution, nickname, masked number, type, currency, balance, available balance, freshness.
- Transactions: income, expense, transfer; direction; personal/household scope; source and external ID; category; links to domain records.
- Seed income categories tutoring/scholarship/allowance/other and expense categories food/cafe/transport/housing/shopping/education/subscription/household/other.
- Own-account transfer is two linked legs and is excluded from income/spending.
- Show total balance, per-account balance, monthly inflow/outflow, recent transactions, receivables, and asset trend.
- Read-only bank adapter: mock, manual CSV import, KFTC testbed, gated KFTC production. The app must be complete with mock/manual providers.
- Import is previewed, validated, idempotent, and duplicate-safe.
- Separate actual cash movement from economic household burden.

### Monthly subscriptions
Implement the complete hierarchy in `SUBSCRIPTIONS_SPEC.md`:
- dashboard monthly equivalent, annual projection, 7/30-day renewals, trial/cancel-by, unmatched/overdue;
- active/trial/paused/cancelled/ended;
- AI/software, cloud/storage, education, entertainment, communication, fitness, news, other;
- weekly/monthly/quarterly/half-yearly/yearly/custom cycles;
- provider, plan, amount, dates, auto-renew, account/card, descriptor, reminders, service URL, notes, last used, decision, price history;
- personal or household scope; household payer and exact split;
- future occurrence generation, payment history, transaction matching;
- cancellation preserves history;
- household payment creates/links one shared expense, never a duplicate;
- deterministic review/cancel-candidate insights only from local user-entered data.

### Grow
- One method only: monthly surplus allocation to safety reserve, long-term contribution, and flexible money.
- Support fixed amount or percentage rule and planned vs completed contribution.
- Contribution is a transfer, not an expense.
- Show cash remaining separately from actual available surplus.
- Available surplus uses settled cash income, personal expenses, the user's responsibility share of household costs, unpaid confirmed subscription/fixed obligations, and safety reserve top-up with no double counting. Exclude unpaid tutoring and all transfers.
- Track cash and long-term investment values. No brokerage integration, no buy/sell, no guaranteed returns, no personalized security recommendation. Include concise neutral principal-loss disclosure.

### Household
- Household is a shared data boundary with owner/member and invite/active/left status. Private finance remains private.
- Inventory: name, quantity, unit, ownership/member, refrigerated/frozen/room-temperature, optional expiry, low threshold, notes, quick plus/minus.
- Seed/demo data includes chicken breast and Monster cans, with only some Monster in the refrigerator and the rest at room temperature.
- Low stock can create a linked shopping item. Shopping can be personal/member or shared and link to a transaction/shared expense.
- Cleaning: title, area, assignee, recurrence, last/next due, OK/due soon/due derived status, completion history.
- Shared expenses: rent, management fee, electricity, gas, water, internet, household goods, shared groceries, subscription, other.
- Actual payer and responsibility split are separate. Presets: 50:50, user all, roommate all, custom. Allocate every KRW exactly.
- Calculate net settlement, allow partial settlement, and suggest matching roommate bank deposits/withdrawals after confirmation.
- Household costs flow into Money and Grow without duplication.

### Home
Prioritize today's lesson prep and required actions. Show tutoring earned/received/outstanding; account total and settled monthly inflow/outflow; due subscriptions/trials; actual available surplus/Grow; low stock; cleaning; roommate settlement; and reviewable match suggestions.

### Settings and privacy
Implement profile/locale, household members, tutoring defaults, categories, accounts, Google/bank integrations, reminders, export, and deletion. Minimize student data. Do not upload school-record documents in MVP. Mask account numbers. Show sync freshness and informational disclaimers.

## 5. Database and authorization

Use the provided migrations as a reference, apply them locally, and refine them only while preserving the model. Every protected table requires RLS. Create automated tests with:

- User A and unrelated User B.
- User A and roommate in one household.
- User B as nonmember.
- Proof that private accounts/transactions/connections are owner-only.
- Proof that active members share household inventory/cleaning/expenses/subscriptions as intended.
- Proof that nonmembers are denied.

Use indexed stable helper functions for membership checks. Keep all privileged operations server-side and authorization-check IDs against the session, not only the UI.

## 6. Required integration behavior

### Google Calendar
Implement `CalendarProvider` with Mock and Google implementations. Store event ID, HTML link, Meet URL, sync state, last error, and idempotency key. Create unique Meet conference data per event. Use least privilege. Only mutate events created/explicitly linked by this app.

### Banking
Implement `BankProvider` with Mock, ManualImport, KftcTestbed, and feature-disabled KftcProduction. Read only. Server-only token references. Handle pagination, incremental sync, duplicate IDs/fingerprints, stale state, bounded retry, and redacted logs. Do not implement transfer APIs even if provider docs expose them.

## 7. Required quality gates

Create a single `pnpm verify` command that runs formatting check, lint, typecheck, unit/integration tests, build, migration checks, and spec coverage. Add Playwright separately or within CI as practical.

Required scenario tests include:

1. Math online student -> prepared lesson -> unique Meet mock -> completion -> open receivable -> deposit match -> paid.
2. School-record student with null subject; invalid subject rejected.
3. No makeup state anywhere.
4. Own-account 100,000 KRW transfer changes no income/expense/net worth.
5. Monthly, yearly, weekly, custom subscription normalization.
6. Paid subscription is not subtracted twice from available surplus.
7. Household subscription yields one transaction and one shared expense.
8. User pays full rent but owes half; cash and economic burden differ and settlement is correct.
9. Roommate partial settlement and bank match.
10. Low chicken breast stock creates one shopping item.
11. Some Monster refrigerated, some room temperature.
12. Cleaning completion advances due date and history.
13. Unpaid tutoring does not increase settled cash or available surplus.
14. Investment contribution is a transfer and total assets remain unchanged.
15. RLS adversarial matrix.
16. CSV duplicate import and formula/CSV injection safety.
17. Google/KFTC unavailable: complete mock path and honest error/stale state.
18. Mobile/desktop navigation, keyboard access, no dead buttons.

Use Playwright and Next.js runtime tooling to test real pages, not source inspection alone. Run a security scan after functionality passes and fix validated findings.

## 8. Deliverables

At completion provide in the repository:

- Working app and lockfile.
- Migrations, RLS policies, generated types, fixtures.
- Mock adapters and real-integration setup code/runbooks.
- Unit, integration, RLS, and E2E tests.
- CI, preview deployment configuration, PWA assets/manifest.
- Updated README, architecture/data-flow docs, privacy/security notes.
- `PROGRESS.md` with requirement-by-requirement evidence.
- No secrets, no fake production claim, no unimplemented live buttons.

## 9. Complete non-omission requirement ledger

The following list is normative. Do not mark the project complete until every P0/P1 item has implementation and evidence or a clearly approved external-only block. P2 remains in the documented backlog.

- **CTX-001 [P0]** Primary persona is 최재원, a second-year student in Seoul National University Electrical and Computer Engineering. Acceptance: Demo profile and product documentation reflect the persona; school/major storage remains optional and private.
- **CTX-002 [P0]** Default locale is Korean, currency is KRW, and timezone is Asia/Seoul. Acceptance: Dates, money, week boundaries, reminders, and seed data use ko-KR, KRW, and Asia/Seoul.
- **CTX-003 [P0]** The user lives in a two-room rental with one friend and needs shared-home operations. Acceptance: A household can contain the user and one roommate, while the schema remains extensible to more members.
- **CTX-004 [P1]** Demo household inventory reflects chicken breast as a fixed lunch item and Monster drinks split between refrigerated and room-temperature storage. Acceptance: Demo data includes chicken breast and Monster items in appropriate locations without treating all Monster cans as refrigerated.
- **CTX-005 [P0]** The product is a student personal operating system, not an enterprise finance product. Acceptance: UI language, density, onboarding, and feature scope remain simple and student-friendly.
- **CTX-006 [P0]** The product must be mobile-first but fully usable on desktop as a responsive PWA. Acceptance: Core journeys pass at 360px mobile width and desktop widths; installable PWA behavior is present where supported.
- **CORE-001 [P0]** Primary navigation contains Home, Tutoring, Money, Household, and Settings. Acceptance: All five top-level destinations exist and are reachable from persistent mobile/desktop navigation.
- **CORE-002 [P0]** A global quick-add action supports lesson, income, expense, payment/deposit handling, inventory, and shared expense creation. Acceptance: Quick-add is reachable in one tap/click and opens context-aware creation actions.
- **CORE-003 [P0]** The app unifies tutoring work, cash movement, subscriptions, surplus allocation, and household operations without duplicating records. Acceptance: Cross-module links use a single source record plus references rather than copied amounts.
- **CORE-004 [P0]** Financial data distinguishes work performed, money receivable, planned obligation, and actual account movement. Acceptance: Lesson, receivable, subscription occurrence/shared expense, and financial transaction are separate entities.
- **CORE-005 [P1]** Money analytics include monthly cash flow, spending by category, tutoring income by student, effective hourly income, fixed/subscription costs, and asset trend. Acceptance: Analytics page renders each metric from real domain queries with empty/loading/error states.
- **CORE-006 [P1]** Settings include profile, categories, accounts, tutoring defaults, integrations, notifications, and data export/backup. Acceptance: Each settings area has a functional page or explicitly labeled deferred adapter without dead controls.
- **CORE-007 [P0]** All user-visible monetary values use integer KRW semantics and never floating-point arithmetic. Acceptance: Database uses bigint or numeric integer amounts; TypeScript domain converters prevent precision loss.
- **CORE-008 [P0]** All derived totals must have a single documented formula and automated tests. Acceptance: Formula module and unit tests cover dashboard, settlement, subscription normalization, and surplus totals.
- **CORE-009 [P0]** The app must have clear loading, empty, offline, stale-sync, and recoverable error states. Acceptance: Every data surface provides accessible status feedback and safe retry behavior.
- **CORE-010 [P0]** No production deployment, production database mutation, financial transfer, or investment trade occurs automatically. Acceptance: External writes require explicit user action and production changes require explicit operator confirmation.
- **TUT-001 [P0]** Students have tutoring type SUBJECT or SCHOOL_RECORD (생기부). Acceptance: Student form requires exactly one tutoring type and filters relevant fields.
- **TUT-002 [P0]** SUBJECT tutoring permits only Mathematics, Physics, or Chemistry. Acceptance: UI, validation, database constraint, and tests reject every other subject.
- **TUT-003 [P0]** SCHOOL_RECORD tutoring has no academic subject value. Acceptance: Subject is null and hidden for SCHOOL_RECORD; database check constraint enforces this.
- **TUT-004 [P0]** Each student has a default lesson mode of online video or in-person. Acceptance: Student creation requires a default mode and conditionally requires location or Meet behavior.
- **TUT-005 [P0]** Each lesson copies the student's default mode but can override it for that lesson. Acceptance: Changing a student's default does not mutate historical lessons.
- **TUT-006 [P0]** Lesson statuses are only SCHEDULED, COMPLETED, or CANCELLED; there is no makeup/보강 concept. Acceptance: No enum, field, filter, badge, or workflow named makeup/보강 exists.
- **TUT-007 [P0]** Scheduled lessons support preparation notes and a lightweight preparation checklist. Acceptance: Prep text/checklist can be edited before class and is visible on Home and lesson detail.
- **TUT-008 [P0]** Students support default fee amount and default lesson duration. Acceptance: New lessons prefill amount/duration and allow per-lesson overrides without changing history.
- **TUT-009 [P0]** Recurring tutoring schedules capture weekday, start time, duration, timezone, and effective dates. Acceptance: Schedule generation is deterministic across Asia/Seoul daylight/time boundaries and avoids duplicates.
- **TUT-010 [P0]** Online lessons can create a Google Calendar event and Google Meet conference. Acceptance: Authorized users can create/sync an event and open its Meet URL from the app.
- **TUT-011 [P0]** Default Meet behavior generates unique conference data per lesson event; it must not copy conferenceData between unrelated events. Acceptance: Calendar adapter uses conferenceData.createRequest with conferenceDataVersion=1 for each generated lesson event.
- **TUT-012 [P1]** A student may optionally store a manually supplied reusable Meet URL, clearly labeled as a user-managed exception. Acceptance: Manual fixed URL is never represented as copied Google conferenceData and can be disabled per lesson.
- **TUT-013 [P0]** In-person students/lessons store a visit location and expose a location action instead of Meet. Acceptance: Lesson card displays the correct action for its mode.
- **TUT-014 [P0]** Completing a lesson creates or updates exactly one receivable for the lesson amount. Acceptance: The operation is idempotent and covered by a transaction/integration test.
- **TUT-015 [P0]** Lesson, receivable, and actual bank/financial transaction remain separate linked records. Acceptance: Unpaid completed work is representable without fake income, and paid income is traceable to its receivable.
- **TUT-016 [P0]** Receivables support open, partially paid, paid, and void states plus allocations from one or more deposits. Acceptance: Partial and combined payments reconcile correctly and never exceed amount due.
- **TUT-017 [P0]** Deposit matching suggests receivables using amount, payer/counterparty alias, student, and timing, but requires confirmation. Acceptance: Suggested matches show evidence and confidence; no match is committed without explicit approval.
- **TUT-018 [P1]** Effective hourly income includes lesson time, preparation minutes, and travel minutes. Acceptance: Student and lesson analytics show nominal and effective hourly rates using documented formulas.
- **TUT-019 [P0]** Student detail shows schedule, lesson history, monthly counts, earned amount, received amount, and outstanding receivables. Acceptance: All figures reconcile to ledger/receivable records for selected month.
- **TUT-020 [P1]** Student records may store payer/deposit alias and operational notes, but no unnecessary sensitive school-record documents are uploaded in MVP. Acceptance: MVP contains no document upload flow; notes are access-controlled and minimal.
- **MON-001 [P0]** Money contains Overview, Accounts, Transactions, Receivables, Subscriptions, Grow, and Analytics. Acceptance: Every destination exists with coherent cross-links.
- **MON-002 [P0]** Accounts store institution, nickname, masked account number, type, currency, current balance, available balance, and last sync time. Acceptance: Account list/detail exposes those fields without displaying a full account number.
- **MON-003 [P0]** Account overview shows total included balance, per-account balance, monthly inflow, monthly outflow, and recent transactions. Acceptance: Totals exclude hidden/excluded accounts and transfers are not counted as income or expense.
- **MON-004 [P0]** Users can manually create income and expense records. Acceptance: Validated forms persist, edit, and delete manual ledger entries with audit timestamps.
- **MON-005 [P0]** Transaction kinds are INCOME, EXPENSE, or TRANSFER. Acceptance: Every ledger row has one kind and transfer rows use a linked transfer group.
- **MON-006 [P0]** Transfers between the user's accounts are excluded from income, expense, and spending analytics. Acceptance: Moving 100,000 KRW from bank to investment leaves net worth unchanged and adds zero spending.
- **MON-007 [P0]** Income categories include tutoring, scholarship, allowance, and other. Acceptance: Default categories are seeded and user categories can be managed in Settings.
- **MON-008 [P0]** Expense categories include food, cafe, transport, housing, shopping, education, subscription, household, and other. Acceptance: Default categories are seeded and categorization appears in analytics.
- **MON-009 [P0]** Transactions distinguish personal scope from household-linked scope. Acceptance: Household links point to shared expense/settlement records while personal transactions remain private.
- **MON-010 [P0]** Bank integrations are read-only in this product: account discovery/registration, balance inquiry, and transaction-history inquiry only. Acceptance: No withdrawal, deposit-transfer, payment initiation, or credential collection UI is implemented.
- **MON-011 [P0]** A BankProvider adapter supports MOCK, MANUAL_CSV, KFTC_TESTBED, and KFTC_PRODUCTION implementations. Acceptance: MVP runs fully with mock/manual providers; testbed/prod are isolated behind the same interface.
- **MON-012 [P0]** KFTC production mode remains disabled until institutional application, contract, eligibility, consent, and security requirements are satisfied. Acceptance: Feature flag and operator documentation prevent accidental production activation.
- **MON-013 [P0]** Manual CSV import is available as a fallback for transaction history before real bank onboarding. Acceptance: Importer provides preview, duplicate detection, mapping, and rollback-safe commit.
- **MON-014 [P0]** Imported bank transactions are idempotent using provider/external identifiers or a deterministic fingerprint. Acceptance: Re-sync/re-import creates no duplicates.
- **MON-015 [P0]** Transactions can be linked to receivables, subscription occurrences, shared expenses, settlements, and investment transfers without duplicate expense rows. Acceptance: Each linkage is traceable and uniqueness constraints prevent duplicate payment linkage.
- **MON-016 [P0]** The app distinguishes actual bank cash movement from economic responsibility in shared expenses. Acceptance: A user paying 100% of rent but owing 50% sees cash outflow 100% and personal burden 50%, with the remainder receivable from roommate.
- **MON-017 [P1]** Asset overview includes cash/account balances and tracked long-term investment value. Acceptance: Total assets and component values reconcile and transfers do not change total assets.
- **MON-018 [P1]** Account types may include bank, cash, card, investment, and other; card automation is not required in MVP. Acceptance: Schema supports all types while UI labels unsupported sync modes honestly.
- **MON-019 [P1]** Money analytics provide month selection and compare current month with a previous month. Acceptance: Comparison uses consistent date boundaries and indicates incomplete current-month data.
- **MON-020 [P0]** Earned but unpaid tutoring is shown separately from settled cash income and excluded from cash-based available surplus. Acceptance: Outstanding receivables never inflate account balance or settled-income totals.
- **SUB-001 [P0]** Money contains a dedicated Subscriptions area for recurring paid services. Acceptance: Subscriptions is reachable from Money and dashboard cards link to filtered views.
- **SUB-002 [P0]** Subscription dashboard shows normalized monthly total, projected annual total, upcoming renewals, trial endings, and unmatched/overdue occurrences. Acceptance: All metrics are derived from active records and occurrence/payment status.
- **SUB-003 [P0]** Subscription statuses include trial, active, paused, cancelled, and ended. Acceptance: Status transitions preserve history and affect forecasts correctly.
- **SUB-004 [P0]** Subscription categories include AI/software, cloud/storage, education, entertainment, communication, fitness, news, and other. Acceptance: Default categories exist and are filterable.
- **SUB-005 [P0]** Subscription details store provider/name, plan, amount, currency, billing cycle, start date, and next charge date. Acceptance: Create/edit/detail flows expose and validate all fields.
- **SUB-006 [P0]** Billing cycles support weekly, monthly, quarterly, half-yearly, yearly, and custom day interval. Acceptance: Monthly-equivalent formula tests cover every cycle including leap/year boundary cases.
- **SUB-007 [P0]** Subscriptions support trial end, cancel-by date, auto-renew flag, and reminder-day offsets. Acceptance: Upcoming and trial-reminder queries use Asia/Seoul dates and avoid duplicate reminders.
- **SUB-008 [P0]** Subscriptions can be personal or household scoped. Acceptance: Household subscriptions require a household and are visible to active household members without exposing private account data.
- **SUB-009 [P0]** A household subscription stores payer and responsibility splits independently. Acceptance: 50:50, one-person-all, and custom split presets produce exact integer KRW allocations.
- **SUB-010 [P0]** Subscriptions may reference a payment account/card, transaction descriptor pattern, service URL, notes, and last-used date. Acceptance: Optional fields are safe, editable, and not required for basic use.
- **SUB-011 [P0]** Price history is retained when a subscription price changes. Acceptance: Editing amount creates an effective-dated history row and preserves past forecasts/payments.
- **SUB-012 [P0]** Each expected charge is a SubscriptionOccurrence distinct from an actual financial transaction. Acceptance: Future dues exist before payment without creating fake bank spending.
- **SUB-013 [P0]** Actual bank transactions can be matched to subscription occurrences using amount, descriptor, account, and date, with confirmation. Acceptance: Confirmed match marks occurrence paid and does not generate a duplicate expense.
- **SUB-014 [P0]** A paid household subscription creates or links one shared expense and its splits rather than duplicate household/money records. Acceptance: One occurrence maps to at most one transaction and one shared expense.
- **SUB-015 [P0]** Subscription calendar lists renewal dates and supports 7-day and 30-day filters. Acceptance: Calendar/list views agree across month boundaries.
- **SUB-016 [P1]** Users can manually mark keep, review, or cancel-candidate decisions and record last-used date. Acceptance: The app never claims usage it cannot observe; decisions are explicitly user-entered.
- **SUB-017 [P1]** Local-only insights may flag duplicate-category subscriptions or review candidates without recommending a specific commercial replacement. Acceptance: Insight explains its rule and source records; it is dismissible and deterministic.
- **SUB-018 [P0]** Unpaid confirmed subscription obligations due in the planning window reduce actual available surplus, while already paid charges are not subtracted twice. Acceptance: Formula tests cover unpaid, matched, skipped, cancelled, and household split cases.
- **SUB-019 [P0]** Cancellation/ending stops future occurrence generation but preserves historical occurrences and payments. Acceptance: History remains visible and forecasts exclude post-end dates.
- **SUB-020 [P1]** Subscription reminders are represented in-app first; push/email delivery is optional future work. Acceptance: MVP has an in-app reminder center with no misleading unavailable notification toggle.
- **GROW-001 [P0]** Grow implements one simple student-level method: monthly surplus allocation and recurring long-term contribution tracking. Acceptance: No stock picking, leverage, derivatives, auto-trading, or return guarantee appears.
- **GROW-002 [P0]** Grow separates safety reserve, long-term contribution, and flexible money. Acceptance: Monthly plan and completion state show all three buckets.
- **GROW-003 [P0]** Investment funding is modeled as an inter-account transfer, not an expense. Acceptance: Contribution transfer changes asset composition but not total assets or spending.
- **GROW-004 [P0]** Grow tracks planned and completed monthly contribution amounts. Acceptance: A contribution can be pending, partially completed, completed, skipped, or cancelled.
- **GROW-005 [P0]** Actual available surplus is the primary decision metric. Acceptance: Home and Grow display the same tested value for the selected planning period.
- **GROW-006 [P0]** Actual available surplus starts from settled cash inflows, not billed or unpaid tutoring work. Acceptance: Open receivables are excluded until a linked payment transaction exists.
- **GROW-007 [P0]** Actual available surplus subtracts personal expenses, the user's economic share of household costs, unpaid confirmed subscription/fixed obligations in the window, and required safety-reserve top-up, without double counting. Acceptance: Scenario tests document and verify every term.
- **GROW-008 [P0]** The app displays actual cash remaining separately from responsibility-adjusted available surplus. Acceptance: Shared-expense prepayment/settlement scenarios show different but reconcilable figures.
- **GROW-009 [P0]** Grow tracks current cash assets and long-term investment value for visibility only. Acceptance: Values are manual or account-derived and clearly timestamped.
- **GROW-010 [P0]** Investment guidance is educational and neutral, discloses possible principal loss, and never promises performance. Acceptance: Copy review finds no guarantee, urgency, or personalized security recommendation.
- **GROW-011 [P1]** A fixed monthly amount or percentage-of-available-surplus rule can define the contribution plan. Acceptance: Rules produce deterministic integer KRW planned amounts with a configurable cap.
- **GROW-012 [P1]** Brokerage execution is explicitly out of scope; completed contributions are confirmed manually or matched to transfer transactions. Acceptance: There is no buy/sell endpoint or brokerage credential field.
- **HOM-001 [P0]** Household is a separate shared data boundary from the user's private finance data. Acceptance: Roommate can access shared household records but never the user's private accounts/transactions.
- **HOM-002 [P0]** Household supports owner/member roles and invite/active/left membership states. Acceptance: Invite acceptance and membership checks are enforced by RLS and tests.
- **HOM-003 [P0]** Household overview shows shared monthly cost, user's share, roommate settlement balance, low-stock items, and cleaning status. Acceptance: Cards link to filtered detail and reconcile to source rows.
- **HOM-004 [P0]** Inventory items store name, quantity, unit, ownership, storage location, optional expiry, low-stock threshold, and notes. Acceptance: Create/edit/detail flows and schema include every field.
- **HOM-005 [P0]** Inventory ownership can be mine, roommate's, or shared, represented with member ownership rather than hard-coded labels. Acceptance: UI renders friendly labels for the current two-person household and schema supports additional members.
- **HOM-006 [P0]** Inventory storage locations are refrigerated, frozen, or room temperature. Acceptance: List filters and validation use exactly those options in MVP.
- **HOM-007 [P0]** Inventory quantity supports fast plus/minus adjustment with an audit-safe nonnegative result. Acceptance: Concurrent adjustment test prevents lost updates and negative quantity.
- **HOM-008 [P0]** Low-stock items can create a shopping-list item. Acceptance: Action is idempotent and links shopping item to its inventory source.
- **HOM-009 [P0]** Shopping items can be personal/member-owned or shared and can later link to a transaction/shared expense. Acceptance: Purchased status and linkage do not duplicate financial records.
- **HOM-010 [P0]** Cleaning tasks store title, area, assignee, recurrence, last completion, next due time, and active state. Acceptance: Task creation and completion correctly advance the next due time.
- **HOM-011 [P0]** Cleaning presents simple derived states: OK, due soon, and due/overdue. Acceptance: State is calculated from now, next due, and warning lead time rather than manually drifting.
- **HOM-012 [P0]** Marking cleaning complete records who/when and recalculates schedule. Acceptance: Completion history is retained and next due is deterministic.
- **HOM-013 [P0]** Shared expense categories include rent, management fee, electricity, gas, water, internet, household goods, shared groceries, subscription, and other. Acceptance: All categories are available and appear in monthly totals.
- **HOM-014 [P0]** Shared expenses store actual payer separately from responsibility splits. Acceptance: Payer and split totals are independently editable before settlement.
- **HOM-015 [P0]** Split presets support equal 50:50, user pays all, roommate pays all, and custom amounts/percentages. Acceptance: Rounding assigns every KRW exactly once and split sum equals total.
- **HOM-016 [P0]** Household settlement computes the net amount one member owes the other across expenses and prior settlements. Acceptance: Pairwise netting test covers payer reversals, refunds, and partial settlements.
- **HOM-017 [P0]** A bank deposit can be suggested and confirmed as a roommate settlement payment. Acceptance: Confirmed allocation changes settlement status and retains transaction traceability.
- **HOM-018 [P0]** Household costs affect Money analytics and Grow using the user's responsibility share, with reconciliation to actual cash paid/received. Acceptance: No shared cost is omitted or counted twice in dashboard formulas.
- **HOM-019 [P0]** A bank transaction can be classified as household shopping, housing, utility, or personal spending through a confirmation flow. Acceptance: Classification creates/links the correct shared expense only after confirmation.
- **HOM-020 [P1]** Barcode scanning and receipt OCR are explicitly deferred; manual inventory/shopping flows must be fast enough for MVP. Acceptance: No fake OCR/barcode control exists in production UI.
- **DASH-001 [P0]** Home shows today's lessons with student, tutoring type/subject, time, mode, preparation notes, and Meet/location action. Acceptance: Today's schedule is ordered and each lesson card has the correct primary action.
- **DASH-002 [P0]** Home shows monthly tutoring forecast from active recurring schedules, earned, received, and outstanding amounts separately. Acceptance: Forecast is clearly labeled and reconciles to schedule/fee assumptions; earned, received, and outstanding match lesson/receivable/payment records; forecast is never treated as settled cash or available surplus.
- **DASH-003 [P0]** Home shows total account balance, monthly settled income, and monthly expense. Acceptance: Transfers and unpaid receivables are excluded from income/expense.
- **DASH-004 [P0]** Home shows subscriptions due soon and trial endings. Acceptance: Cards link to correctly filtered subscription views.
- **DASH-005 [P0]** Home shows actual available surplus and current Grow plan status. Acceptance: Values match Grow page and formulas.
- **DASH-006 [P0]** Home shows refrigerator low-stock alerts, cleaning due state, and roommate settlement balance. Acceptance: Each alert links to the source household module.
- **DASH-007 [P0]** Home shows pending suggested matches for tutoring deposits, subscription charges, household expenses, and settlements. Acceptance: Suggestions can be reviewed, accepted, or dismissed without silent mutation.
- **DASH-008 [P0]** Home prioritizes actions required today rather than presenting a dense finance dashboard. Acceptance: Mobile first viewport exposes today's actions before secondary analytics.
- **INT-001 [P0]** Google integration uses OAuth with the minimum Calendar scopes required for selected behavior. Acceptance: Consent screen/scopes are documented and tokens are server-only.
- **INT-002 [P0]** Calendar event creation stores external event ID, calendar link, Meet URL, sync state, and last sync error. Acceptance: Retry is idempotent using a stable app event identifier.
- **INT-003 [P0]** Calendar deletion/cancellation behavior is explicit and never silently deletes a user's unrelated event. Acceptance: Only events created or explicitly linked by the app can be mutated.
- **INT-004 [P0]** KFTC balance and transaction-history calls use server-side access tokens and fintech-use numbers, never browser storage. Acceptance: Threat model and implementation tests verify secrets are absent from client bundles/logs.
- **INT-005 [P0]** KFTC transaction pagination handles the provider page limit and incremental sync safely. Acceptance: Adapter follows next-page state and stops without duplicate or skipped records.
- **INT-006 [P0]** All external adapters have mock implementations and contract tests. Acceptance: The complete app can be demonstrated without real Google/KFTC credentials.
- **INT-007 [P0]** Sync jobs expose last success, last attempt, stale status, and actionable error messages. Acceptance: UI never presents stale balances as silently current.
- **INT-008 [P0]** External API retries are bounded and idempotent with structured logging and redaction. Acceptance: Tests cover timeout, rate limit, duplicate request, and provider error cases.
- **INT-009 [P1]** Vercel deployment and Supabase migrations use preview/development environments before production. Acceptance: Runbook requires preview verification and explicit production confirmation.
- **INT-010 [P0]** Google Calendar integration is an app API integration; a personal Google Calendar Codex plugin is optional for developer workflow and is not an application dependency. Acceptance: Application runs without any Codex connector installed.
- **UX-001 [P0]** Korean is the only required UI language in MVP, with plain student-friendly copy. Acceptance: No mixed-language production labels except unavoidable service names.
- **UX-002 [P0]** Desktop uses a sidebar and mobile uses bottom navigation with a clear global add action. Acceptance: Navigation remains reachable, keyboard accessible, and safe-area aware.
- **UX-003 [P0]** Forms use progressive disclosure and conditional fields instead of enterprise-style dense screens. Acceptance: Student, subscription, and shared-expense forms reveal only relevant fields.
- **UX-004 [P0]** All destructive and cross-record linking actions require confirmation and explain effects. Acceptance: Delete, cancel, match, settle, unlink, and regenerate actions have safe dialogs/undo where practical.
- **UX-005 [P0]** Accessibility targets WCAG 2.2 AA for color contrast, focus, labels, semantics, and touch targets. Acceptance: Automated accessibility checks pass and manual keyboard/screen-reader smoke checks are documented.
- **UX-006 [P0]** Dates and money are formatted consistently with clear month filters and no timezone ambiguity. Acceptance: All date formatting routes through shared utilities and tests.
- **UX-007 [P0]** Charts are secondary to readable numbers and lists and have accessible text equivalents. Acceptance: Every chart has a table/summary and works without color alone.
- **UX-008 [P1]** PWA supports basic offline shell and read-only cached recent data, while writes require network and show pending state only if safely queued. Acceptance: Offline behavior is honest and never pretends a financial write succeeded.
- **UX-009 [P0]** No placeholder button may ship without either a working action or an explicit disabled/deferred explanation. Acceptance: E2E crawl finds no dead interactive controls.
- **UX-010 [P0]** Every page has empty-state guidance based on the user's next useful action. Acceptance: New-account demo can reach a useful first record from each empty page.
- **SEC-001 [P0]** Supabase Row Level Security is enabled on every user or household data table. Acceptance: Automated RLS tests prove cross-user and nonmember access is denied.
- **SEC-002 [P0]** Private finance rows are owner-only; household rows are available only to active household members. Acceptance: Roommate cannot query accounts, private transactions, bank connections, or private subscriptions.
- **SEC-003 [P0]** OAuth/bank refresh tokens and secrets are never stored in plaintext application tables or client-accessible environment variables. Acceptance: Secrets use a server-side encrypted secret reference and are redacted from logs/errors.
- **SEC-004 [P0]** Service-role keys, provider secrets, and PATs are excluded from version control and browser bundles. Acceptance: Secret scanning and bundle checks pass; .env files are ignored.
- **SEC-005 [P0]** External access follows least privilege and explicit consent, with disconnect/revoke controls. Acceptance: Integrations page shows scopes/status and supports safe disconnect.
- **SEC-006 [P0]** Sensitive student, household, and financial values are minimized in logs and analytics. Acceptance: Structured logger redacts names, account identifiers, notes, and tokens by default.
- **SEC-007 [P0]** Input validation, output encoding, CSRF/session protection, rate limits, and authorization checks apply to server mutations. Acceptance: Security tests and review cover OWASP-relevant paths.
- **SEC-008 [P0]** Data export and account deletion are available with explicit confirmation and retention behavior. Acceptance: User can export owned/shared-relevant data and request deletion without orphaning required settlement history incorrectly.
- **SEC-009 [P0]** The app documents that finance figures are informational and may be stale; it is not a bank, broker, tax adviser, or investment adviser. Acceptance: Relevant screens and terms include concise disclaimers without obstructing normal use.
- **SEC-010 [P0]** Development MCP tools are scoped to development/test projects and never connected to production financial or personal data by default. Acceptance: MCP setup file defaults Supabase to project-scoped read-only and marks production prohibited.
- **SEC-011 [P0]** Dependency, migration, and security scans run in CI before merge/deploy. Acceptance: CI includes typecheck, lint, tests, build, migration checks, secret scan, and dependency/security review.
- **SEC-012 [P0]** Every match/reconciliation decision retains an audit record of actor, timestamp, source, and prior/new linkage. Acceptance: Audit history can explain why each receivable, subscription, shared expense, or settlement was marked paid.
- **FUT-001 [P2]** Receipt OCR is a future enhancement, not MVP. Acceptance: Tracked in backlog only.
- **FUT-002 [P2]** Barcode scanning is a future enhancement, not MVP. Acceptance: Tracked in backlog only.
- **FUT-003 [P2]** AI-assisted transaction categorization and monthly reports are future enhancements and require explainability/confirmation. Acceptance: Tracked in backlog only; no fake AI in MVP.
- **FUT-004 [P2]** Broader budgets, fixed recurring income/expense rules, cards, and richer asset allocation are future enhancements. Acceptance: Tracked in backlog only.
- **FUT-005 [P2]** Push/email reminder delivery is future work after in-app reminders. Acceptance: Tracked in backlog only.
- **FUT-006 [P2]** No brokerage auto-execution or open-banking transfer initiation is planned for MVP. Acceptance: Tracked as explicitly excluded unless separately redesigned and approved.

## 10. Begin now

Start with Phase 00. Inspect what exists, list the Phase 00 requirement IDs, initialize or repair the project, apply/test the schema locally, establish `pnpm verify`, create the responsive Korean shell, and update progress with evidence. Continue through phases without waiting for another prompt unless a destructive/production action or genuinely unresolvable product decision requires confirmation.

---
