# Student OS — Repository Agent Instructions

## Mission
Build a production-minded, mobile-first Korean PWA that operates a student's tutoring work, cash flow, subscriptions, simple surplus allocation, and two-person household. The full source of truth is the repository specification set; do not silently simplify or omit a requirement.

## Mandatory reading order before coding
1. `GOALS.md`
2. `PRODUCT_REQUIREMENTS.md`
3. `INFORMATION_ARCHITECTURE.md`
4. `DOMAIN_RULES.md`
5. `UI_UX_SPEC.md`
6. `DATA_MODEL.md`
7. `API_INTEGRATIONS.md`
8. `SUBSCRIPTIONS_SPEC.md`
9. `SECURITY_PRIVACY.md`
10. `ACCEPTANCE_CRITERIA.md`
11. `TRACEABILITY_MATRIX.md`
12. `PLANS.md` and the active `harness/build/phase-*.md`

## Non-negotiable domain rules
- Korean UI, KRW integer money, `Asia/Seoul` timezone.
- Tutoring types: subject tutoring or school-record tutoring. Subject tutoring allows only math, physics, chemistry. School-record tutoring has null subject.
- Lesson states: scheduled, completed, cancelled. Never add makeup/보강 concepts.
- Keep lesson, receivable, planned obligations, and actual transactions separate.
- Transfers are not expenses. Investment contributions are transfers.
- Never count unpaid tutoring as cash income.
- Shared expense payer and responsibility split are separate.
- Household members can see shared data, never another member's private bank/account ledger.
- Subscription occurrence is a planned obligation; payment links to an actual transaction. Never duplicate a charge.
- Default Google Meet strategy is a unique conference per lesson event. Never copy conference data across unrelated events. A manually provided fixed Meet URL is an explicit optional exception.
- Bank connectivity is read-only and adapter-based. No money movement. KFTC production remains feature-flagged off until legal/contract/security onboarding is complete.
- No brokerage execution, performance guarantees, or personalized security recommendations.

## Engineering constraints
- Use current stable Next.js 16+ App Router, TypeScript strict mode, Tailwind, shadcn/ui, Supabase Postgres/Auth/Realtime/RLS, Zod, React Hook Form, Vitest, Testing Library, and Playwright. Verify current package APIs from primary docs before installation and commit a lockfile.
- Prefer Server Components and Server Actions where appropriate. Keep secrets and privileged Supabase clients server-only.
- Use Supabase migrations as schema source of truth. Generate database TypeScript types after migrations.
- Every user/household table must have RLS and tests. Every formula must be centralized and unit-tested.
- Use accessible semantic HTML, keyboard operation, visible focus, sufficient contrast, and 44px-class touch targets.
- Do not add dependencies when a small local utility is clearer. Do not introduce Prisma unless a written decision record proves it is necessary.
- Never put service-role keys, OAuth tokens, KFTC credentials, PATs, or full bank account numbers in code, fixtures, client bundles, or logs.

## Agent operating protocol
1. Inspect the repository and active phase.
2. State a concise implementation plan and affected requirement IDs.
3. Implement vertically: schema/domain → server operation → UI → tests → docs.
4. Run formatting, lint, typecheck, unit/integration tests, build, and relevant E2E.
5. Use configured MCP tools only against local/development resources. Prompt before write-capable MCP actions unless the active phase explicitly authorizes a local/test write.
6. Update `PROGRESS.md`, `DECISIONS.md`, and requirement status after each phase.
7. Do not push, deploy production, enable production KFTC, or mutate a production database without explicit user confirmation.
8. When credentials are missing, finish the contract, mock adapter, tests, UI state, and setup instructions instead of blocking the build.

## Definition of done for each change
- Linked requirement IDs are implemented or explicitly deferred according to scope.
- Happy path, empty state, loading state, error state, and authorization failure are handled.
- No duplicate money record is created by cross-module linkage.
- Tests cover domain invariants and regression risk.
- `pnpm verify` passes.
- UI is verified in a real browser at mobile and desktop widths.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
