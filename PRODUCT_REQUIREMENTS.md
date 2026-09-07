# Product Requirements Document

## 1. Product overview

`Student OS` combines five top-level areas:

- **Home:** today's actions and cross-domain summary.
- **Tutoring:** students, recurring schedules, lessons, preparation, Meet/location, receivables.
- **Money:** accounts, transactions, receivables, subscriptions, Grow, analytics.
- **Household:** fridge/inventory, shopping, cleaning, shared expenses, settlement.
- **Settings:** profile, categories, accounts, integrations, notifications, export/delete.

Primary persona is 최재원, a second-year Seoul National University Electrical and Computer Engineering student. Persona data is a private default/demo context, not public marketing information and not required for every user account.

## 2. Core product contract

The application is one coherent ledger of operational facts:

```text
Tutoring work performed
  -> receivable generated
  -> actual deposit imported or entered
  -> user confirms allocation
  -> settled tutoring income

Subscription definition
  -> charge occurrence becomes due
  -> bank charge imported or entered
  -> user confirms match
  -> occurrence paid
  -> household subscription optionally creates one shared expense

Household purchase/bill
  -> actual payer transaction
  -> shared expense and exact responsibility splits
  -> net roommate settlement
  -> settlement deposit/withdrawal allocation

Settled income - actual/personal obligations - responsibility-adjusted household cost
- unpaid confirmed subscription obligations - safety reserve top-up
  -> actual available surplus
  -> planned long-term contribution
  -> transfer to investment account, never expense
```

## 3. Functional requirements ledger

The table below is normative. Requirement IDs must appear in implementation issues, tests, and phase reports.

| ID | Area | Priority | Phase | Requirement | Acceptance summary |
|---|---|---:|---:|---|---|
| CTX-001 | Context | P0 | 00 | Primary persona is 최재원, a second-year student in Seoul National University Electrical and Computer Engineering. | Demo profile and product documentation reflect the persona; school/major storage remains optional and private. |
| CTX-002 | Context | P0 | 00 | Default locale is Korean, currency is KRW, and timezone is Asia/Seoul. | Dates, money, week boundaries, reminders, and seed data use ko-KR, KRW, and Asia/Seoul. |
| CTX-003 | Context | P0 | 01 | The user lives in a two-room rental with one friend and needs shared-home operations. | A household can contain the user and one roommate, while the schema remains extensible to more members. |
| CTX-004 | Context | P1 | 05 | Demo household inventory reflects chicken breast as a fixed lunch item and Monster drinks split between refrigerated and room-temperature storage. | Demo data includes chicken breast and Monster items in appropriate locations without treating all Monster cans as refrigerated. |
| CTX-005 | Context | P0 | 00 | The product is a student personal operating system, not an enterprise finance product. | UI language, density, onboarding, and feature scope remain simple and student-friendly. |
| CTX-006 | Context | P0 | 00 | The product must be mobile-first but fully usable on desktop as a responsive PWA. | Core journeys pass at 360px mobile width and desktop widths; installable PWA behavior is present where supported. |
| CORE-001 | Core IA | P0 | 00 | Primary navigation contains Home, Tutoring, Money, Household, and Settings. | All five top-level destinations exist and are reachable from persistent mobile/desktop navigation. |
| CORE-002 | Core IA | P0 | 00 | A global quick-add action supports lesson, income, expense, payment/deposit handling, inventory, and shared expense creation. | Quick-add is reachable in one tap/click and opens context-aware creation actions. |
| CORE-003 | Core IA | P0 | 00 | The app unifies tutoring work, cash movement, subscriptions, surplus allocation, and household operations without duplicating records. | Cross-module links use a single source record plus references rather than copied amounts. |
| CORE-004 | Core IA | P0 | 00 | Financial data distinguishes work performed, money receivable, planned obligation, and actual account movement. | Lesson, receivable, subscription occurrence/shared expense, and financial transaction are separate entities. |
| CORE-005 | Core IA | P1 | 07 | Money analytics include monthly cash flow, spending by category, tutoring income by student, effective hourly income, fixed/subscription costs, and asset trend. | Analytics page renders each metric from real domain queries with empty/loading/error states. |
| CORE-006 | Core IA | P1 | 09 | Settings include profile, categories, accounts, tutoring defaults, integrations, notifications, and data export/backup. | Each settings area has a functional page or explicitly labeled deferred adapter without dead controls. |
| CORE-007 | Core IA | P0 | 00 | All user-visible monetary values use integer KRW semantics and never floating-point arithmetic. | Database uses bigint or numeric integer amounts; TypeScript domain converters prevent precision loss. |
| CORE-008 | Core IA | P0 | 00 | All derived totals must have a single documented formula and automated tests. | Formula module and unit tests cover dashboard, settlement, subscription normalization, and surplus totals. |
| CORE-009 | Core IA | P0 | 00 | The app must have clear loading, empty, offline, stale-sync, and recoverable error states. | Every data surface provides accessible status feedback and safe retry behavior. |
| CORE-010 | Core IA | P0 | 00 | No production deployment, production database mutation, financial transfer, or investment trade occurs automatically. | External writes require explicit user action and production changes require explicit operator confirmation. |
| TUT-001 | Tutoring | P0 | 02 | Students have tutoring type SUBJECT or SCHOOL_RECORD (생기부). | Student form requires exactly one tutoring type and filters relevant fields. |
| TUT-002 | Tutoring | P0 | 02 | SUBJECT tutoring permits only Mathematics, Physics, or Chemistry. | UI, validation, database constraint, and tests reject every other subject. |
| TUT-003 | Tutoring | P0 | 02 | SCHOOL_RECORD tutoring has no academic subject value. | Subject is null and hidden for SCHOOL_RECORD; database check constraint enforces this. |
| TUT-004 | Tutoring | P0 | 02 | Each student has a default lesson mode of online video or in-person. | Student creation requires a default mode and conditionally requires location or Meet behavior. |
| TUT-005 | Tutoring | P0 | 02 | Each lesson copies the student's default mode but can override it for that lesson. | Changing a student's default does not mutate historical lessons. |
| TUT-006 | Tutoring | P0 | 02 | Lesson statuses are only SCHEDULED, COMPLETED, or CANCELLED; there is no makeup/보강 concept. | No enum, field, filter, badge, or workflow named makeup/보강 exists. |
| TUT-007 | Tutoring | P0 | 02 | Scheduled lessons support preparation notes and a lightweight preparation checklist. | Prep text/checklist can be edited before class and is visible on Home and lesson detail. |
| TUT-008 | Tutoring | P0 | 02 | Students support default fee amount and default lesson duration. | New lessons prefill amount/duration and allow per-lesson overrides without changing history. |
| TUT-009 | Tutoring | P0 | 02 | Recurring tutoring schedules capture weekday, start time, duration, timezone, and effective dates. | Schedule generation is deterministic across Asia/Seoul daylight/time boundaries and avoids duplicates. |
| TUT-010 | Tutoring | P0 | 02 | Online lessons can create a Google Calendar event and Google Meet conference. | Authorized users can create/sync an event and open its Meet URL from the app. |
| TUT-011 | Tutoring | P0 | 08 | Default Meet behavior generates unique conference data per lesson event; it must not copy conferenceData between unrelated events. | Calendar adapter uses conferenceData.createRequest with conferenceDataVersion=1 for each generated lesson event. |
| TUT-012 | Tutoring | P1 | 02 | A student may optionally store a manually supplied reusable Meet URL, clearly labeled as a user-managed exception. | Manual fixed URL is never represented as copied Google conferenceData and can be disabled per lesson. |
| TUT-013 | Tutoring | P0 | 02 | In-person students/lessons store a visit location and expose a location action instead of Meet. | Lesson card displays the correct action for its mode. |
| TUT-014 | Tutoring | P0 | 03 | Completing a lesson creates or updates exactly one receivable for the lesson amount. | The operation is idempotent and covered by a transaction/integration test. |
| TUT-015 | Tutoring | P0 | 03 | Lesson, receivable, and actual bank/financial transaction remain separate linked records. | Unpaid completed work is representable without fake income, and paid income is traceable to its receivable. |
| TUT-016 | Tutoring | P0 | 03 | Receivables support open, partially paid, paid, and void states plus allocations from one or more deposits. | Partial and combined payments reconcile correctly and never exceed amount due. |
| TUT-017 | Tutoring | P0 | 03 | Deposit matching suggests receivables using amount, payer/counterparty alias, student, and timing, but requires confirmation. | Suggested matches show evidence and confidence; no match is committed without explicit approval. |
| TUT-018 | Tutoring | P1 | 07 | Effective hourly income includes lesson time, preparation minutes, and travel minutes. | Student and lesson analytics show nominal and effective hourly rates using documented formulas. |
| TUT-019 | Tutoring | P0 | 02 | Student detail shows schedule, lesson history, monthly counts, earned amount, received amount, and outstanding receivables. | All figures reconcile to ledger/receivable records for selected month. |
| TUT-020 | Tutoring | P1 | 02 | Student records may store payer/deposit alias and operational notes, but no unnecessary sensitive school-record documents are uploaded in MVP. | MVP contains no document upload flow; notes are access-controlled and minimal. |
| MON-001 | Money | P0 | 03 | Money contains Overview, Accounts, Transactions, Receivables, Subscriptions, Grow, and Analytics. | Every destination exists with coherent cross-links. |
| MON-002 | Money | P0 | 03 | Accounts store institution, nickname, masked account number, type, currency, current balance, available balance, and last sync time. | Account list/detail exposes those fields without displaying a full account number. |
| MON-003 | Money | P0 | 03 | Account overview shows total included balance, per-account balance, monthly inflow, monthly outflow, and recent transactions. | Totals exclude hidden/excluded accounts and transfers are not counted as income or expense. |
| MON-004 | Money | P0 | 03 | Users can manually create income and expense records. | Validated forms persist, edit, and delete manual ledger entries with audit timestamps. |
| MON-005 | Money | P0 | 03 | Transaction kinds are INCOME, EXPENSE, or TRANSFER. | Every ledger row has one kind and transfer rows use a linked transfer group. |
| MON-006 | Money | P0 | 03 | Transfers between the user's accounts are excluded from income, expense, and spending analytics. | Moving 100,000 KRW from bank to investment leaves net worth unchanged and adds zero spending. |
| MON-007 | Money | P0 | 03 | Income categories include tutoring, scholarship, allowance, and other. | Default categories are seeded and user categories can be managed in Settings. |
| MON-008 | Money | P0 | 03 | Expense categories include food, cafe, transport, housing, shopping, education, subscription, household, and other. | Default categories are seeded and categorization appears in analytics. |
| MON-009 | Money | P0 | 03 | Transactions distinguish personal scope from household-linked scope. | Household links point to shared expense/settlement records while personal transactions remain private. |
| MON-010 | Money | P0 | 08 | Bank integrations are read-only in this product: account discovery/registration, balance inquiry, and transaction-history inquiry only. | No withdrawal, deposit-transfer, payment initiation, or credential collection UI is implemented. |
| MON-011 | Money | P0 | 03 | A BankProvider adapter supports MOCK, MANUAL_CSV, KFTC_TESTBED, and KFTC_PRODUCTION implementations. | MVP runs fully with mock/manual providers; testbed/prod are isolated behind the same interface. |
| MON-012 | Money | P0 | 08 | KFTC production mode remains disabled until institutional application, contract, eligibility, consent, and security requirements are satisfied. | Feature flag and operator documentation prevent accidental production activation. |
| MON-013 | Money | P0 | 03 | Manual CSV import is available as a fallback for transaction history before real bank onboarding. | Importer provides preview, duplicate detection, mapping, and rollback-safe commit. |
| MON-014 | Money | P0 | 03 | Imported bank transactions are idempotent using provider/external identifiers or a deterministic fingerprint. | Re-sync/re-import creates no duplicates. |
| MON-015 | Money | P0 | 03 | Transactions can be linked to receivables, subscription occurrences, shared expenses, settlements, and investment transfers without duplicate expense rows. | Each linkage is traceable and uniqueness constraints prevent duplicate payment linkage. |
| MON-016 | Money | P0 | 06 | The app distinguishes actual bank cash movement from economic responsibility in shared expenses. | A user paying 100% of rent but owing 50% sees cash outflow 100% and personal burden 50%, with the remainder receivable from roommate. |
| MON-017 | Money | P1 | 07 | Asset overview includes cash/account balances and tracked long-term investment value. | Total assets and component values reconcile and transfers do not change total assets. |
| MON-018 | Money | P1 | 09 | Account types may include bank, cash, card, investment, and other; card automation is not required in MVP. | Schema supports all types while UI labels unsupported sync modes honestly. |
| MON-019 | Money | P1 | 07 | Money analytics provide month selection and compare current month with a previous month. | Comparison uses consistent date boundaries and indicates incomplete current-month data. |
| MON-020 | Money | P0 | 03 | Earned but unpaid tutoring is shown separately from settled cash income and excluded from cash-based available surplus. | Outstanding receivables never inflate account balance or settled-income totals. |
| SUB-001 | Subscriptions | P0 | 04 | Money contains a dedicated Subscriptions area for recurring paid services. | Subscriptions is reachable from Money and dashboard cards link to filtered views. |
| SUB-002 | Subscriptions | P0 | 04 | Subscription dashboard shows normalized monthly total, projected annual total, upcoming renewals, trial endings, and unmatched/overdue occurrences. | All metrics are derived from active records and occurrence/payment status. |
| SUB-003 | Subscriptions | P0 | 04 | Subscription statuses include trial, active, paused, cancelled, and ended. | Status transitions preserve history and affect forecasts correctly. |
| SUB-004 | Subscriptions | P0 | 04 | Subscription categories include AI/software, cloud/storage, education, entertainment, communication, fitness, news, and other. | Default categories exist and are filterable. |
| SUB-005 | Subscriptions | P0 | 04 | Subscription details store provider/name, plan, amount, currency, billing cycle, start date, and next charge date. | Create/edit/detail flows expose and validate all fields. |
| SUB-006 | Subscriptions | P0 | 04 | Billing cycles support weekly, monthly, quarterly, half-yearly, yearly, and custom day interval. | Monthly-equivalent formula tests cover every cycle including leap/year boundary cases. |
| SUB-007 | Subscriptions | P0 | 04 | Subscriptions support trial end, cancel-by date, auto-renew flag, and reminder-day offsets. | Upcoming and trial-reminder queries use Asia/Seoul dates and avoid duplicate reminders. |
| SUB-008 | Subscriptions | P0 | 04 | Subscriptions can be personal or household scoped. | Household subscriptions require a household and are visible to active household members without exposing private account data. |
| SUB-009 | Subscriptions | P0 | 04 | A household subscription stores payer and responsibility splits independently. | 50:50, one-person-all, and custom split presets produce exact integer KRW allocations. |
| SUB-010 | Subscriptions | P0 | 04 | Subscriptions may reference a payment account/card, transaction descriptor pattern, service URL, notes, and last-used date. | Optional fields are safe, editable, and not required for basic use. |
| SUB-011 | Subscriptions | P0 | 04 | Price history is retained when a subscription price changes. | Editing amount creates an effective-dated history row and preserves past forecasts/payments. |
| SUB-012 | Subscriptions | P0 | 04 | Each expected charge is a SubscriptionOccurrence distinct from an actual financial transaction. | Future dues exist before payment without creating fake bank spending. |
| SUB-013 | Subscriptions | P0 | 04 | Actual bank transactions can be matched to subscription occurrences using amount, descriptor, account, and date, with confirmation. | Confirmed match marks occurrence paid and does not generate a duplicate expense. |
| SUB-014 | Subscriptions | P0 | 04 | A paid household subscription creates or links one shared expense and its splits rather than duplicate household/money records. | One occurrence maps to at most one transaction and one shared expense. |
| SUB-015 | Subscriptions | P0 | 04 | Subscription calendar lists renewal dates and supports 7-day and 30-day filters. | Calendar/list views agree across month boundaries. |
| SUB-016 | Subscriptions | P1 | 04 | Users can manually mark keep, review, or cancel-candidate decisions and record last-used date. | The app never claims usage it cannot observe; decisions are explicitly user-entered. |
| SUB-017 | Subscriptions | P1 | 07 | Local-only insights may flag duplicate-category subscriptions or review candidates without recommending a specific commercial replacement. | Insight explains its rule and source records; it is dismissible and deterministic. |
| SUB-018 | Subscriptions | P0 | 07 | Unpaid confirmed subscription obligations due in the planning window reduce actual available surplus, while already paid charges are not subtracted twice. | Formula tests cover unpaid, matched, skipped, cancelled, and household split cases. |
| SUB-019 | Subscriptions | P0 | 04 | Cancellation/ending stops future occurrence generation but preserves historical occurrences and payments. | History remains visible and forecasts exclude post-end dates. |
| SUB-020 | Subscriptions | P1 | 09 | Subscription reminders are represented in-app first; push/email delivery is optional future work. | MVP has an in-app reminder center with no misleading unavailable notification toggle. |
| GROW-001 | Grow | P0 | 07 | Grow implements one simple student-level method: monthly surplus allocation and recurring long-term contribution tracking. | No stock picking, leverage, derivatives, auto-trading, or return guarantee appears. |
| GROW-002 | Grow | P0 | 07 | Grow separates safety reserve, long-term contribution, and flexible money. | Monthly plan and completion state show all three buckets. |
| GROW-003 | Grow | P0 | 07 | Investment funding is modeled as an inter-account transfer, not an expense. | Contribution transfer changes asset composition but not total assets or spending. |
| GROW-004 | Grow | P0 | 07 | Grow tracks planned and completed monthly contribution amounts. | A contribution can be pending, partially completed, completed, skipped, or cancelled. |
| GROW-005 | Grow | P0 | 07 | Actual available surplus is the primary decision metric. | Home and Grow display the same tested value for the selected planning period. |
| GROW-006 | Grow | P0 | 07 | Actual available surplus starts from settled cash inflows, not billed or unpaid tutoring work. | Open receivables are excluded until a linked payment transaction exists. |
| GROW-007 | Grow | P0 | 07 | Actual available surplus subtracts personal expenses, the user's economic share of household costs, unpaid confirmed subscription/fixed obligations in the window, and required safety-reserve top-up, without double counting. | Scenario tests document and verify every term. |
| GROW-008 | Grow | P0 | 07 | The app displays actual cash remaining separately from responsibility-adjusted available surplus. | Shared-expense prepayment/settlement scenarios show different but reconcilable figures. |
| GROW-009 | Grow | P0 | 07 | Grow tracks current cash assets and long-term investment value for visibility only. | Values are manual or account-derived and clearly timestamped. |
| GROW-010 | Grow | P0 | 07 | Investment guidance is educational and neutral, discloses possible principal loss, and never promises performance. | Copy review finds no guarantee, urgency, or personalized security recommendation. |
| GROW-011 | Grow | P1 | 07 | A fixed monthly amount or percentage-of-available-surplus rule can define the contribution plan. | Rules produce deterministic integer KRW planned amounts with a configurable cap. |
| GROW-012 | Grow | P1 | 09 | Brokerage execution is explicitly out of scope; completed contributions are confirmed manually or matched to transfer transactions. | There is no buy/sell endpoint or brokerage credential field. |
| HOM-001 | Household | P0 | 01 | Household is a separate shared data boundary from the user's private finance data. | Roommate can access shared household records but never the user's private accounts/transactions. |
| HOM-002 | Household | P0 | 01 | Household supports owner/member roles and invite/active/left membership states. | Invite acceptance and membership checks are enforced by RLS and tests. |
| HOM-003 | Household | P0 | 05 | Household overview shows shared monthly cost, user's share, roommate settlement balance, low-stock items, and cleaning status. | Cards link to filtered detail and reconcile to source rows. |
| HOM-004 | Household | P0 | 05 | Inventory items store name, quantity, unit, ownership, storage location, optional expiry, low-stock threshold, and notes. | Create/edit/detail flows and schema include every field. |
| HOM-005 | Household | P0 | 05 | Inventory ownership can be mine, roommate's, or shared, represented with member ownership rather than hard-coded labels. | UI renders friendly labels for the current two-person household and schema supports additional members. |
| HOM-006 | Household | P0 | 05 | Inventory storage locations are refrigerated, frozen, or room temperature. | List filters and validation use exactly those options in MVP. |
| HOM-007 | Household | P0 | 05 | Inventory quantity supports fast plus/minus adjustment with an audit-safe nonnegative result. | Concurrent adjustment test prevents lost updates and negative quantity. |
| HOM-008 | Household | P0 | 05 | Low-stock items can create a shopping-list item. | Action is idempotent and links shopping item to its inventory source. |
| HOM-009 | Household | P0 | 05 | Shopping items can be personal/member-owned or shared and can later link to a transaction/shared expense. | Purchased status and linkage do not duplicate financial records. |
| HOM-010 | Household | P0 | 05 | Cleaning tasks store title, area, assignee, recurrence, last completion, next due time, and active state. | Task creation and completion correctly advance the next due time. |
| HOM-011 | Household | P0 | 05 | Cleaning presents simple derived states: OK, due soon, and due/overdue. | State is calculated from now, next due, and warning lead time rather than manually drifting. |
| HOM-012 | Household | P0 | 05 | Marking cleaning complete records who/when and recalculates schedule. | Completion history is retained and next due is deterministic. |
| HOM-013 | Household | P0 | 06 | Shared expense categories include rent, management fee, electricity, gas, water, internet, household goods, shared groceries, subscription, and other. | All categories are available and appear in monthly totals. |
| HOM-014 | Household | P0 | 06 | Shared expenses store actual payer separately from responsibility splits. | Payer and split totals are independently editable before settlement. |
| HOM-015 | Household | P0 | 06 | Split presets support equal 50:50, user pays all, roommate pays all, and custom amounts/percentages. | Rounding assigns every KRW exactly once and split sum equals total. |
| HOM-016 | Household | P0 | 06 | Household settlement computes the net amount one member owes the other across expenses and prior settlements. | Pairwise netting test covers payer reversals, refunds, and partial settlements. |
| HOM-017 | Household | P0 | 06 | A bank deposit can be suggested and confirmed as a roommate settlement payment. | Confirmed allocation changes settlement status and retains transaction traceability. |
| HOM-018 | Household | P0 | 06 | Household costs affect Money analytics and Grow using the user's responsibility share, with reconciliation to actual cash paid/received. | No shared cost is omitted or counted twice in dashboard formulas. |
| HOM-019 | Household | P0 | 06 | A bank transaction can be classified as household shopping, housing, utility, or personal spending through a confirmation flow. | Classification creates/links the correct shared expense only after confirmation. |
| HOM-020 | Household | P1 | 09 | Barcode scanning and receipt OCR are explicitly deferred; manual inventory/shopping flows must be fast enough for MVP. | No fake OCR/barcode control exists in production UI. |
| DASH-001 | Home dashboard | P0 | 07 | Home shows today's lessons with student, tutoring type/subject, time, mode, preparation notes, and Meet/location action. | Today's schedule is ordered and each lesson card has the correct primary action. |
| DASH-002 | Home dashboard | P0 | 07 | Home shows monthly tutoring forecast from active recurring schedules, earned, received, and outstanding amounts separately. | Forecast is clearly labeled and reconciles to schedule/fee assumptions; earned, received, and outstanding match lesson/receivable/payment records; forecast is never treated as settled cash or available surplus. |
| DASH-003 | Home dashboard | P0 | 07 | Home shows total account balance, monthly settled income, and monthly expense. | Transfers and unpaid receivables are excluded from income/expense. |
| DASH-004 | Home dashboard | P0 | 07 | Home shows subscriptions due soon and trial endings. | Cards link to correctly filtered subscription views. |
| DASH-005 | Home dashboard | P0 | 07 | Home shows actual available surplus and current Grow plan status. | Values match Grow page and formulas. |
| DASH-006 | Home dashboard | P0 | 07 | Home shows refrigerator low-stock alerts, cleaning due state, and roommate settlement balance. | Each alert links to the source household module. |
| DASH-007 | Home dashboard | P0 | 07 | Home shows pending suggested matches for tutoring deposits, subscription charges, household expenses, and settlements. | Suggestions can be reviewed, accepted, or dismissed without silent mutation. |
| DASH-008 | Home dashboard | P0 | 07 | Home prioritizes actions required today rather than presenting a dense finance dashboard. | Mobile first viewport exposes today's actions before secondary analytics. |
| INT-001 | Integrations | P0 | 08 | Google integration uses OAuth with the minimum Calendar scopes required for selected behavior. | Consent screen/scopes are documented and tokens are server-only. |
| INT-002 | Integrations | P0 | 08 | Calendar event creation stores external event ID, calendar link, Meet URL, sync state, and last sync error. | Retry is idempotent using a stable app event identifier. |
| INT-003 | Integrations | P0 | 08 | Calendar deletion/cancellation behavior is explicit and never silently deletes a user's unrelated event. | Only events created or explicitly linked by the app can be mutated. |
| INT-004 | Integrations | P0 | 08 | KFTC balance and transaction-history calls use server-side access tokens and fintech-use numbers, never browser storage. | Threat model and implementation tests verify secrets are absent from client bundles/logs. |
| INT-005 | Integrations | P0 | 08 | KFTC transaction pagination handles the provider page limit and incremental sync safely. | Adapter follows next-page state and stops without duplicate or skipped records. |
| INT-006 | Integrations | P0 | 08 | All external adapters have mock implementations and contract tests. | The complete app can be demonstrated without real Google/KFTC credentials. |
| INT-007 | Integrations | P0 | 08 | Sync jobs expose last success, last attempt, stale status, and actionable error messages. | UI never presents stale balances as silently current. |
| INT-008 | Integrations | P0 | 08 | External API retries are bounded and idempotent with structured logging and redaction. | Tests cover timeout, rate limit, duplicate request, and provider error cases. |
| INT-009 | Integrations | P1 | 09 | Vercel deployment and Supabase migrations use preview/development environments before production. | Runbook requires preview verification and explicit production confirmation. |
| INT-010 | Integrations | P0 | 08 | Google Calendar integration is an app API integration; a personal Google Calendar Codex plugin is optional for developer workflow and is not an application dependency. | Application runs without any Codex connector installed. |
| UX-001 | UX | P0 | 09 | Korean is the only required UI language in MVP, with plain student-friendly copy. | No mixed-language production labels except unavoidable service names. |
| UX-002 | UX | P0 | 09 | Desktop uses a sidebar and mobile uses bottom navigation with a clear global add action. | Navigation remains reachable, keyboard accessible, and safe-area aware. |
| UX-003 | UX | P0 | 09 | Forms use progressive disclosure and conditional fields instead of enterprise-style dense screens. | Student, subscription, and shared-expense forms reveal only relevant fields. |
| UX-004 | UX | P0 | 09 | All destructive and cross-record linking actions require confirmation and explain effects. | Delete, cancel, match, settle, unlink, and regenerate actions have safe dialogs/undo where practical. |
| UX-005 | UX | P0 | 09 | Accessibility targets WCAG 2.2 AA for color contrast, focus, labels, semantics, and touch targets. | Automated accessibility checks pass and manual keyboard/screen-reader smoke checks are documented. |
| UX-006 | UX | P0 | 09 | Dates and money are formatted consistently with clear month filters and no timezone ambiguity. | All date formatting routes through shared utilities and tests. |
| UX-007 | UX | P0 | 09 | Charts are secondary to readable numbers and lists and have accessible text equivalents. | Every chart has a table/summary and works without color alone. |
| UX-008 | UX | P1 | 09 | PWA supports basic offline shell and read-only cached recent data, while writes require network and show pending state only if safely queued. | Offline behavior is honest and never pretends a financial write succeeded. |
| UX-009 | UX | P0 | 09 | No placeholder button may ship without either a working action or an explicit disabled/deferred explanation. | E2E crawl finds no dead interactive controls. |
| UX-010 | UX | P0 | 09 | Every page has empty-state guidance based on the user's next useful action. | New-account demo can reach a useful first record from each empty page. |
| SEC-001 | Security | P0 | 01 | Supabase Row Level Security is enabled on every user or household data table. | Automated RLS tests prove cross-user and nonmember access is denied. |
| SEC-002 | Security | P0 | 01 | Private finance rows are owner-only; household rows are available only to active household members. | Roommate cannot query accounts, private transactions, bank connections, or private subscriptions. |
| SEC-003 | Security | P0 | 08 | OAuth/bank refresh tokens and secrets are never stored in plaintext application tables or client-accessible environment variables. | Secrets use a server-side encrypted secret reference and are redacted from logs/errors. |
| SEC-004 | Security | P0 | 00 | Service-role keys, provider secrets, and PATs are excluded from version control and browser bundles. | Secret scanning and bundle checks pass; .env files are ignored. |
| SEC-005 | Security | P0 | 08 | External access follows least privilege and explicit consent, with disconnect/revoke controls. | Integrations page shows scopes/status and supports safe disconnect. |
| SEC-006 | Security | P0 | 09 | Sensitive student, household, and financial values are minimized in logs and analytics. | Structured logger redacts names, account identifiers, notes, and tokens by default. |
| SEC-007 | Security | P0 | 09 | Input validation, output encoding, CSRF/session protection, rate limits, and authorization checks apply to server mutations. | Security tests and review cover OWASP-relevant paths. |
| SEC-008 | Security | P0 | 09 | Data export and account deletion are available with explicit confirmation and retention behavior. | User can export owned/shared-relevant data and request deletion without orphaning required settlement history incorrectly. |
| SEC-009 | Security | P0 | 09 | The app documents that finance figures are informational and may be stale; it is not a bank, broker, tax adviser, or investment adviser. | Relevant screens and terms include concise disclaimers without obstructing normal use. |
| SEC-010 | Security | P0 | 09 | Development MCP tools are scoped to development/test projects and never connected to production financial or personal data by default. | MCP setup file defaults Supabase to project-scoped read-only and marks production prohibited. |
| SEC-011 | Security | P0 | 09 | Dependency, migration, and security scans run in CI before merge/deploy. | CI includes typecheck, lint, tests, build, migration checks, secret scan, and dependency/security review. |
| SEC-012 | Security | P0 | 09 | Every match/reconciliation decision retains an audit record of actor, timestamp, source, and prior/new linkage. | Audit history can explain why each receivable, subscription, shared expense, or settlement was marked paid. |
| FUT-001 | Backlog | P2 | backlog | Receipt OCR is a future enhancement, not MVP. | Tracked in backlog only. |
| FUT-002 | Backlog | P2 | backlog | Barcode scanning is a future enhancement, not MVP. | Tracked in backlog only. |
| FUT-003 | Backlog | P2 | backlog | AI-assisted transaction categorization and monthly reports are future enhancements and require explainability/confirmation. | Tracked in backlog only; no fake AI in MVP. |
| FUT-004 | Backlog | P2 | backlog | Broader budgets, fixed recurring income/expense rules, cards, and richer asset allocation are future enhancements. | Tracked in backlog only. |
| FUT-005 | Backlog | P2 | backlog | Push/email reminder delivery is future work after in-app reminders. | Tracked in backlog only. |
| FUT-006 | Backlog | P2 | backlog | No brokerage auto-execution or open-banking transfer initiation is planned for MVP. | Tracked as explicitly excluded unless separately redesigned and approved. |

## 4. Prioritization

- **P0:** required for a coherent MVP and may not be silently deferred.
- **P1:** required for the complete v1 described in this pack; may follow the first usable vertical slice.
- **P2/backlog:** intentionally excluded from MVP but retained so future work is not forgotten.

## 5. Release gates

A release candidate is not complete until all P0 requirements are implemented, all P1 requirements are either implemented or explicitly scheduled with no misleading UI, cross-user RLS tests pass, formulas reconcile against scenario fixtures, and browser tests pass on mobile and desktop.
