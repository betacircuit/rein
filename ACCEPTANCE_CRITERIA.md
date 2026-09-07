# Acceptance Criteria and Scenario Suite

Use the IDs in test names. These scenarios are minimum evidence, not the complete test suite.

## A. Tutoring

### AC-TUT-01 — Online math lesson to paid income
**Given** an online Mathematics student with a weekly schedule, fee, duration, payer alias, and preparation checklist  
**When** a lesson is materialized, Calendar mock creates a unique event, the user completes it, a deposit is imported, and the user confirms the suggested match  
**Then** exactly one receivable exists, exactly one allocation links the deposit, the receivable is paid, settled tutoring income increases, and no duplicate transaction is created.  
Requirements: TUT-001, TUT-002, TUT-004, TUT-007, TUT-009–TUT-017.

### AC-TUT-02 — School-record tutoring
SCHOOL_RECORD hides/rejects subject, persists null, supports online/offline and prep notes, and appears as “생기부” on cards. Requirements: TUT-001, TUT-003.

### AC-TUT-03 — No makeup concept
Search schema, generated types, routes, UI copy, filters, fixtures, and tests: no makeup/보강 state or action. Cancelled lessons create no receivable. Requirement: TUT-006.

### AC-TUT-04 — Effective hourly rate
A 60,000 KRW lesson with 120 lesson, 30 prep, and 40 travel minutes shows nominal 30,000 KRW/hour and effective rate based on 190 minutes, with documented rounding. Requirement: TUT-018.

## B. Money and receivables

### AC-MON-01 — Transfer is not spending
A 100,000 KRW transfer from a bank account to an investment account creates two linked transfer legs. Monthly income and expense are unchanged, and total assets are unchanged. Requirements: MON-005, MON-006, GROW-003.

### AC-MON-02 — CSV idempotency and safety
Import a fixture twice; second import skips all duplicates. Text beginning with `=`, `+`, `-`, or `@` is never executed and safe export is escaped. Requirements: MON-013, MON-014, SEC-007.

### AC-MON-03 — Unpaid tutoring is not cash
A completed unpaid lesson increases earned and receivable totals but not account balance, settled income, cash remaining, or available surplus. Requirements: MON-020, GROW-006.

## C. Subscriptions

### AC-SUB-01 — Cycle normalization
Unit tests cover weekly, monthly, quarterly, half-yearly, yearly, and custom-day monthly equivalents plus a next-12-month occurrence projection. Requirements: SUB-002, SUB-006.

### AC-SUB-02 — Paid charge not double counted
A monthly subscription charge is imported and matched. It appears once in expense; the occurrence becomes paid; available surplus subtracts it once, not as both actual expense and unpaid obligation. Requirements: SUB-012, SUB-013, SUB-018.

### AC-SUB-03 — Household subscription bridge
A household internet subscription paid by the user with 50:50 split creates one occurrence, links one transaction, creates one shared expense, and makes the roommate owe exactly half. No duplicated expense exists. Requirements: SUB-008, SUB-009, SUB-014.

### AC-SUB-04 — Trial/cancellation
Trial ending and cancel-by dates appear in the correct window. Cancellation preserves history and stops future occurrences after end date. Requirements: SUB-007, SUB-019.

## D. Household

### AC-HOM-01 — Inventory and shopping
Demo has chicken breast and Monster; some Monster is refrigerated and some room temperature. Reducing chicken breast to threshold offers one idempotent shopping item. Requirements: CTX-004, HOM-004–HOM-009.

### AC-HOM-02 — Cleaning recurrence
Completing a due bathroom task records actor/time, changes status from due to OK, and advances next due deterministically. Requirements: HOM-010–HOM-012.

### AC-HOM-03 — Payer vs burden
User pays 700,000 KRW rent; split is 350,000/350,000. Cash outflow is 700,000, user economic burden is 350,000, and roommate owes 350,000. Requirements: MON-016, HOM-014–HOM-018.

### AC-HOM-04 — Partial settlement
Roommate pays 200,000 of 350,000. A confirmed deposit allocation leaves 150,000 outstanding and preserves expense history. Requirement: HOM-017.

## E. Grow

### AC-GROW-01 — Available surplus
Scenario includes settled tutoring income, unpaid tutoring, personal expenses, rent split with user prepayment, one paid subscription, one unpaid due subscription, safety top-up, and an investment transfer. The formula excludes unpaid income and transfer, uses user household share, and subtracts the paid subscription only once. Requirements: GROW-005–GROW-008, SUB-018.

### AC-GROW-02 — Contribution
A planned fixed or percentage contribution becomes complete only after manual confirmation or transfer match. It changes cash/investment composition but not total assets. Requirements: GROW-001–GROW-004, GROW-011–GROW-012.

## F. Authorization/security

### AC-SEC-01 — RLS matrix
Create User A, roommate A2, and unrelated User B. A/A2 can access shared household records; B cannot. A2 cannot access A's students, accounts, private transactions, external connections, or personal subscriptions. Requirements: SEC-001, SEC-002.

### AC-SEC-02 — Secret/log inspection
Build client bundle and exercise integration errors. No service key, OAuth token, KFTC token/fintech number, PAT, full account number, or sensitive note appears. Requirements: SEC-003, SEC-004, SEC-006.

## G. UI/PWA

### AC-UX-01 — Responsive navigation
At 360×800, bottom navigation and global add work without overlap. At 1440×900, sidebar/secondary navigation work. All primary routes are keyboard accessible. Requirements: CORE-001, CORE-002, UX-002, UX-005.

### AC-UX-02 — State completeness
For every primary list/detail: empty, loading, error, stale/offline, and success states are verified. There are no dead buttons. Requirements: CORE-009, UX-008–UX-010.

### AC-UX-03 — Home action priority
On mobile, today's lesson prep and required actions appear before secondary charts. All dashboard figures cross-link and reconcile. Requirements: DASH-001–DASH-008.

## H. External-unavailable behavior

### AC-INT-01 — Google unavailable
Mock flow remains complete. Real adapter displays disconnected/permission/error states, retries idempotently, and never creates duplicate events. Requirements: INT-001–INT-003, INT-006–INT-008.

### AC-INT-02 — KFTC unavailable/unapproved
App supports manual account and CSV/mock sync. Production flag is off and UI never claims live sync. Requirements: MON-010–MON-014, INT-004–INT-008.

## Definition of product complete

- All P0 and P1 requirement evidence recorded.
- `pnpm verify` passes on a clean clone.
- Local Supabase reset/migrations/seed pass.
- Playwright suite passes mobile/desktop.
- RLS matrix passes.
- Preview deployment passes smoke tests.
- Validated high-severity security findings are fixed.
- No external-only credential gap breaks the demo path.
