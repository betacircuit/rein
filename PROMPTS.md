# Codex Prompt Library

## Start or resume the whole build

```text
Read AGENTS.md and the complete specification set. Inspect PROGRESS.md and the active phase file. Continue from the first unchecked acceptance item. Before editing, list the requirement IDs you will address. Implement a vertical slice, run pnpm verify and the relevant Playwright tests, update PROGRESS.md and DECISIONS.md, and report concrete evidence. Do not wait for unavailable external credentials; use the defined mock adapter and leave a tested setup path.
```

## Phase verification

```text
Act as a release verifier for the active phase. Read TRACEABILITY_MATRIX.md and ACCEPTANCE_CRITERIA.md. For every requirement assigned to this phase, identify implementation, tests, and browser evidence. Run the full verification suite. Fix defects rather than merely listing them. Mark nothing complete without evidence.
```

## Financial invariant review

```text
Review all ledger, receivable, subscription, shared-expense, settlement, and Grow calculations. Search for duplicate source-of-truth records, floating-point KRW, transfer-as-expense bugs, unpaid-receivable-as-income bugs, paid-subscription double subtraction, and payer-vs-responsibility mistakes. Add scenario tests for every defect found and fix them.
```

## RLS adversarial review

```text
Create two unrelated users plus a two-person household fixture. Prove through automated tests that each user can read only their own private finance/tutoring data; active household members can read shared inventory/cleaning/expenses; nonmembers cannot; and a roommate cannot read private accounts, bank connections, or transactions. Fix policies and indexes, then run Supabase security advisors.
```

## UI/browser review

```text
Use Next.js DevTools MCP and Playwright MCP. Verify every primary route at 360x800 and 1440x900. Exercise keyboard navigation, empty/loading/error/stale states, form validation, dialogs, and no-dead-button behavior. Capture failures, fix them, and rerun. Do not judge only from source code.
```

## Security scan

```text
Run the Codex Security workflow against this repository after tests pass. Prioritize authorization, RLS, token leakage, logs, CSV injection, IDOR, CSRF/session handling, webhook/retry idempotency, and unsafe external MCP/config use. Validate findings before changing code and add regression tests for confirmed issues.
```
