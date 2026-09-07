# Implementation Checklist

## Repository
- [ ] `pnpm-lock.yaml` committed
- [ ] strict TypeScript
- [ ] lint, typecheck, unit, integration, E2E, build scripts
- [ ] `.env.example` complete; real `.env*` ignored
- [ ] CI workflow and preview deployment

## Domain
- [ ] KRW integer helpers
- [ ] time/date helpers fixed to Asia/Seoul
- [ ] transaction transfer pairing
- [ ] idempotent lesson completion/receivable
- [ ] receivable allocations
- [ ] subscription occurrence generator and matcher
- [ ] household split and settlement calculator
- [ ] available-surplus formula

## Security
- [ ] RLS on every table
- [ ] cross-user/nonmember tests
- [ ] secrets server-only
- [ ] logs redacted
- [ ] CSV import sanitization/duplicate checks
- [ ] audit log for matching
- [ ] dependency/secret/security scans

## UX
- [ ] mobile bottom nav
- [ ] desktop sidebar
- [ ] global add
- [ ] empty/loading/error/stale states
- [ ] keyboard/accessibility checks
- [ ] no dead buttons
- [ ] PWA manifest/offline honesty

## Integration
- [ ] mock Google adapter
- [ ] real Google Calendar adapter
- [ ] mock/manual bank adapter
- [ ] KFTC testbed contract
- [ ] production KFTC flag remains disabled
