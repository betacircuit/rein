# Requirement Traceability Matrix

Every requirement below is sourced from the conversation-derived product contract. Codex must use IDs in code comments only where useful, but must use IDs in test names, phase checklists, and progress evidence.

| ID | Area | Planned phase | Specification source | Required evidence | Acceptance |
|---|---|---|---|---|---|
| CTX-001 | Context | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-001` | Demo profile and product documentation reflect the persona; school/major storage remains optional and private. |
| CTX-002 | Context | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-002` | Dates, money, week boundaries, reminders, and seed data use ko-KR, KRW, and Asia/Seoul. |
| CTX-003 | Context | Phase 01 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-003` | A household can contain the user and one roommate, while the schema remains extensible to more members. |
| CTX-004 | Context | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-004` | Demo data includes chicken breast and Monster items in appropriate locations without treating all Monster cans as refrigerated. |
| CTX-005 | Context | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-005` | UI language, density, onboarding, and feature scope remain simple and student-friendly. |
| CTX-006 | Context | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CTX-006` | Core journeys pass at 360px mobile width and desktop widths; installable PWA behavior is present where supported. |
| CORE-001 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-001` | All five top-level destinations exist and are reachable from persistent mobile/desktop navigation. |
| CORE-002 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-002` | Quick-add is reachable in one tap/click and opens context-aware creation actions. |
| CORE-003 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-003` | Cross-module links use a single source record plus references rather than copied amounts. |
| CORE-004 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-004` | Lesson, receivable, subscription occurrence/shared expense, and financial transaction are separate entities. |
| CORE-005 | Core IA | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-005` | Analytics page renders each metric from real domain queries with empty/loading/error states. |
| CORE-006 | Core IA | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-006` | Each settings area has a functional page or explicitly labeled deferred adapter without dead controls. |
| CORE-007 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-007` | Database uses bigint or numeric integer amounts; TypeScript domain converters prevent precision loss. |
| CORE-008 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-008` | Formula module and unit tests cover dashboard, settlement, subscription normalization, and surplus totals. |
| CORE-009 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-009` | Every data surface provides accessible status feedback and safe retry behavior. |
| CORE-010 | Core IA | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `CORE-010` | External writes require explicit user action and production changes require explicit operator confirmation. |
| TUT-001 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-001` | Student form requires exactly one tutoring type and filters relevant fields. |
| TUT-002 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-002` | UI, validation, database constraint, and tests reject every other subject. |
| TUT-003 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-003` | Subject is null and hidden for SCHOOL_RECORD; database check constraint enforces this. |
| TUT-004 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-004` | Student creation requires a default mode and conditionally requires location or Meet behavior. |
| TUT-005 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-005` | Changing a student's default does not mutate historical lessons. |
| TUT-006 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-006` | No enum, field, filter, badge, or workflow named makeup/보강 exists. |
| TUT-007 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-007` | Prep text/checklist can be edited before class and is visible on Home and lesson detail. |
| TUT-008 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-008` | New lessons prefill amount/duration and allow per-lesson overrides without changing history. |
| TUT-009 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-009` | Schedule generation is deterministic across Asia/Seoul daylight/time boundaries and avoids duplicates. |
| TUT-010 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-010` | Authorized users can create/sync an event and open its Meet URL from the app. |
| TUT-011 | Tutoring | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-011` | Calendar adapter uses conferenceData.createRequest with conferenceDataVersion=1 for each generated lesson event. |
| TUT-012 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-012` | Manual fixed URL is never represented as copied Google conferenceData and can be disabled per lesson. |
| TUT-013 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-013` | Lesson card displays the correct action for its mode. |
| TUT-014 | Tutoring | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-014` | The operation is idempotent and covered by a transaction/integration test. |
| TUT-015 | Tutoring | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-015` | Unpaid completed work is representable without fake income, and paid income is traceable to its receivable. |
| TUT-016 | Tutoring | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-016` | Partial and combined payments reconcile correctly and never exceed amount due. |
| TUT-017 | Tutoring | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-017` | Suggested matches show evidence and confidence; no match is committed without explicit approval. |
| TUT-018 | Tutoring | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-018` | Student and lesson analytics show nominal and effective hourly rates using documented formulas. |
| TUT-019 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-019` | All figures reconcile to ledger/receivable records for selected month. |
| TUT-020 | Tutoring | Phase 02 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `TUT-020` | MVP contains no document upload flow; notes are access-controlled and minimal. |
| MON-001 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-001` | Every destination exists with coherent cross-links. |
| MON-002 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-002` | Account list/detail exposes those fields without displaying a full account number. |
| MON-003 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-003` | Totals exclude hidden/excluded accounts and transfers are not counted as income or expense. |
| MON-004 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-004` | Validated forms persist, edit, and delete manual ledger entries with audit timestamps. |
| MON-005 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-005` | Every ledger row has one kind and transfer rows use a linked transfer group. |
| MON-006 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-006` | Moving 100,000 KRW from bank to investment leaves net worth unchanged and adds zero spending. |
| MON-007 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-007` | Default categories are seeded and user categories can be managed in Settings. |
| MON-008 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-008` | Default categories are seeded and categorization appears in analytics. |
| MON-009 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-009` | Household links point to shared expense/settlement records while personal transactions remain private. |
| MON-010 | Money | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-010` | No withdrawal, deposit-transfer, payment initiation, or credential collection UI is implemented. |
| MON-011 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-011` | MVP runs fully with mock/manual providers; testbed/prod are isolated behind the same interface. |
| MON-012 | Money | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-012` | Feature flag and operator documentation prevent accidental production activation. |
| MON-013 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-013` | Importer provides preview, duplicate detection, mapping, and rollback-safe commit. |
| MON-014 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-014` | Re-sync/re-import creates no duplicates. |
| MON-015 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-015` | Each linkage is traceable and uniqueness constraints prevent duplicate payment linkage. |
| MON-016 | Money | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-016` | A user paying 100% of rent but owing 50% sees cash outflow 100% and personal burden 50%, with the remainder receivable from roommate. |
| MON-017 | Money | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-017` | Total assets and component values reconcile and transfers do not change total assets. |
| MON-018 | Money | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-018` | Schema supports all types while UI labels unsupported sync modes honestly. |
| MON-019 | Money | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-019` | Comparison uses consistent date boundaries and indicates incomplete current-month data. |
| MON-020 | Money | Phase 03 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `MON-020` | Outstanding receivables never inflate account balance or settled-income totals. |
| SUB-001 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-001` | Subscriptions is reachable from Money and dashboard cards link to filtered views. |
| SUB-002 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-002` | All metrics are derived from active records and occurrence/payment status. |
| SUB-003 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-003` | Status transitions preserve history and affect forecasts correctly. |
| SUB-004 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-004` | Default categories exist and are filterable. |
| SUB-005 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-005` | Create/edit/detail flows expose and validate all fields. |
| SUB-006 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-006` | Monthly-equivalent formula tests cover every cycle including leap/year boundary cases. |
| SUB-007 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-007` | Upcoming and trial-reminder queries use Asia/Seoul dates and avoid duplicate reminders. |
| SUB-008 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-008` | Household subscriptions require a household and are visible to active household members without exposing private account data. |
| SUB-009 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-009` | 50:50, one-person-all, and custom split presets produce exact integer KRW allocations. |
| SUB-010 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-010` | Optional fields are safe, editable, and not required for basic use. |
| SUB-011 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-011` | Editing amount creates an effective-dated history row and preserves past forecasts/payments. |
| SUB-012 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-012` | Future dues exist before payment without creating fake bank spending. |
| SUB-013 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-013` | Confirmed match marks occurrence paid and does not generate a duplicate expense. |
| SUB-014 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-014` | One occurrence maps to at most one transaction and one shared expense. |
| SUB-015 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-015` | Calendar/list views agree across month boundaries. |
| SUB-016 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-016` | The app never claims usage it cannot observe; decisions are explicitly user-entered. |
| SUB-017 | Subscriptions | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-017` | Insight explains its rule and source records; it is dismissible and deterministic. |
| SUB-018 | Subscriptions | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-018` | Formula tests cover unpaid, matched, skipped, cancelled, and household split cases. |
| SUB-019 | Subscriptions | Phase 04 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-019` | History remains visible and forecasts exclude post-end dates. |
| SUB-020 | Subscriptions | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SUB-020` | MVP has an in-app reminder center with no misleading unavailable notification toggle. |
| GROW-001 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-001` | No stock picking, leverage, derivatives, auto-trading, or return guarantee appears. |
| GROW-002 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-002` | Monthly plan and completion state show all three buckets. |
| GROW-003 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-003` | Contribution transfer changes asset composition but not total assets or spending. |
| GROW-004 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-004` | A contribution can be pending, partially completed, completed, skipped, or cancelled. |
| GROW-005 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-005` | Home and Grow display the same tested value for the selected planning period. |
| GROW-006 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-006` | Open receivables are excluded until a linked payment transaction exists. |
| GROW-007 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-007` | Scenario tests document and verify every term. |
| GROW-008 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-008` | Shared-expense prepayment/settlement scenarios show different but reconcilable figures. |
| GROW-009 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-009` | Values are manual or account-derived and clearly timestamped. |
| GROW-010 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-010` | Copy review finds no guarantee, urgency, or personalized security recommendation. |
| GROW-011 | Grow | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-011` | Rules produce deterministic integer KRW planned amounts with a configurable cap. |
| GROW-012 | Grow | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `GROW-012` | There is no buy/sell endpoint or brokerage credential field. |
| HOM-001 | Household | Phase 01 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-001` | Roommate can access shared household records but never the user's private accounts/transactions. |
| HOM-002 | Household | Phase 01 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-002` | Invite acceptance and membership checks are enforced by RLS and tests. |
| HOM-003 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-003` | Cards link to filtered detail and reconcile to source rows. |
| HOM-004 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-004` | Create/edit/detail flows and schema include every field. |
| HOM-005 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-005` | UI renders friendly labels for the current two-person household and schema supports additional members. |
| HOM-006 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-006` | List filters and validation use exactly those options in MVP. |
| HOM-007 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-007` | Concurrent adjustment test prevents lost updates and negative quantity. |
| HOM-008 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-008` | Action is idempotent and links shopping item to its inventory source. |
| HOM-009 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-009` | Purchased status and linkage do not duplicate financial records. |
| HOM-010 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-010` | Task creation and completion correctly advance the next due time. |
| HOM-011 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-011` | State is calculated from now, next due, and warning lead time rather than manually drifting. |
| HOM-012 | Household | Phase 05 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-012` | Completion history is retained and next due is deterministic. |
| HOM-013 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-013` | All categories are available and appear in monthly totals. |
| HOM-014 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-014` | Payer and split totals are independently editable before settlement. |
| HOM-015 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-015` | Rounding assigns every KRW exactly once and split sum equals total. |
| HOM-016 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-016` | Pairwise netting test covers payer reversals, refunds, and partial settlements. |
| HOM-017 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-017` | Confirmed allocation changes settlement status and retains transaction traceability. |
| HOM-018 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-018` | No shared cost is omitted or counted twice in dashboard formulas. |
| HOM-019 | Household | Phase 06 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-019` | Classification creates/links the correct shared expense only after confirmation. |
| HOM-020 | Household | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `HOM-020` | No fake OCR/barcode control exists in production UI. |
| DASH-001 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-001` | Today's schedule is ordered and each lesson card has the correct primary action. |
| DASH-002 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-002` | Forecast is clearly labeled and reconciles to schedule/fee assumptions; earned, received, and outstanding match lesson/receivable/payment records; forecast is never treated as settled cash or available surplus. |
| DASH-003 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-003` | Transfers and unpaid receivables are excluded from income/expense. |
| DASH-004 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-004` | Cards link to correctly filtered subscription views. |
| DASH-005 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-005` | Values match Grow page and formulas. |
| DASH-006 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-006` | Each alert links to the source household module. |
| DASH-007 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-007` | Suggestions can be reviewed, accepted, or dismissed without silent mutation. |
| DASH-008 | Home dashboard | Phase 07 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `DASH-008` | Mobile first viewport exposes today's actions before secondary analytics. |
| INT-001 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-001` | Consent screen/scopes are documented and tokens are server-only. |
| INT-002 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-002` | Retry is idempotent using a stable app event identifier. |
| INT-003 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-003` | Only events created or explicitly linked by the app can be mutated. |
| INT-004 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-004` | Threat model and implementation tests verify secrets are absent from client bundles/logs. |
| INT-005 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-005` | Adapter follows next-page state and stops without duplicate or skipped records. |
| INT-006 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-006` | The complete app can be demonstrated without real Google/KFTC credentials. |
| INT-007 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-007` | UI never presents stale balances as silently current. |
| INT-008 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-008` | Tests cover timeout, rate limit, duplicate request, and provider error cases. |
| INT-009 | Integrations | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-009` | Runbook requires preview verification and explicit production confirmation. |
| INT-010 | Integrations | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `INT-010` | Application runs without any Codex connector installed. |
| UX-001 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-001` | No mixed-language production labels except unavoidable service names. |
| UX-002 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-002` | Navigation remains reachable, keyboard accessible, and safe-area aware. |
| UX-003 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-003` | Student, subscription, and shared-expense forms reveal only relevant fields. |
| UX-004 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-004` | Delete, cancel, match, settle, unlink, and regenerate actions have safe dialogs/undo where practical. |
| UX-005 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-005` | Automated accessibility checks pass and manual keyboard/screen-reader smoke checks are documented. |
| UX-006 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-006` | All date formatting routes through shared utilities and tests. |
| UX-007 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-007` | Every chart has a table/summary and works without color alone. |
| UX-008 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-008` | Offline behavior is honest and never pretends a financial write succeeded. |
| UX-009 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-009` | E2E crawl finds no dead interactive controls. |
| UX-010 | UX | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `UX-010` | New-account demo can reach a useful first record from each empty page. |
| SEC-001 | Security | Phase 01 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-001` | Automated RLS tests prove cross-user and nonmember access is denied. |
| SEC-002 | Security | Phase 01 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-002` | Roommate cannot query accounts, private transactions, bank connections, or private subscriptions. |
| SEC-003 | Security | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-003` | Secrets use a server-side encrypted secret reference and are redacted from logs/errors. |
| SEC-004 | Security | Phase 00 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-004` | Secret scanning and bundle checks pass; .env files are ignored. |
| SEC-005 | Security | Phase 08 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-005` | Integrations page shows scopes/status and supports safe disconnect. |
| SEC-006 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-006` | Structured logger redacts names, account identifiers, notes, and tokens by default. |
| SEC-007 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-007` | Security tests and review cover OWASP-relevant paths. |
| SEC-008 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-008` | User can export owned/shared-relevant data and request deletion without orphaning required settlement history incorrectly. |
| SEC-009 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-009` | Relevant screens and terms include concise disclaimers without obstructing normal use. |
| SEC-010 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-010` | MCP setup file defaults Supabase to project-scoped read-only and marks production prohibited. |
| SEC-011 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-011` | CI includes typecheck, lint, tests, build, migration checks, secret scan, and dependency/security review. |
| SEC-012 | Security | Phase 09 | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `SEC-012` | Audit history can explain why each receivable, subscription, shared expense, or settlement was marked paid. |
| FUT-001 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-001` | Tracked in backlog only. |
| FUT-002 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-002` | Tracked in backlog only. |
| FUT-003 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-003` | Tracked in backlog only; no fake AI in MVP. |
| FUT-004 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-004` | Tracked in backlog only. |
| FUT-005 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-005` | Tracked in backlog only. |
| FUT-006 | Backlog | Phase backlog | `PRODUCT_REQUIREMENTS.md` | domain/UI/integration test named with `FUT-006` | Tracked as explicitly excluded unless separately redesigned and approved. |

## Coverage rule

A requirement may be marked complete only when:

1. The implementation location is recorded in `PROGRESS.md`.
2. At least one automated test or explicit verified artifact contains the requirement ID.
3. The acceptance statement is demonstrated.
4. No higher-level invariant in `DOMAIN_RULES.md` is violated.

Run `node scripts/check-spec-coverage.mjs` to verify that every requirement ID is represented in this matrix and the master prompt.
