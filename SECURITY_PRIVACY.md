# Security and Privacy Specification

## 1. Threat model

Protected data includes student names/notes, lesson schedules, household membership and address-like locations, bank balances/transactions, subscription services, and OAuth/bank credentials. Primary threats are IDOR/cross-user access, household oversharing, token leakage, malicious CSV content, duplicate external writes, prompt-injected MCP use during development, and misleading stale finance data.

## 2. Authorization model

- Private rows carry `owner_user_id` and are owner-only under RLS.
- Shared rows carry `household_id` and are accessible only to active members.
- A roommate sees shared expense payer/amount/split but not the owner's private account or full bank transaction.
- Server mutations validate both session identity and referenced-record ownership/membership.
- Membership helper functions are stable, security-definer, fixed-search-path, and indexed.
- Every table has RLS enabled before seed/demo data is used.

## 3. Secrets

Never expose or commit:

- Supabase service-role key;
- Google client secret, access token, refresh token;
- KFTC client secret, access token, fintech-use number;
- GitHub PAT, Vercel token, cron secret, encryption key.

Store external refresh/token material through an encrypted server-only mechanism or secret manager reference. Public Supabase publishable values may be client-visible; privileged values may not. Redact secrets from structured logs, traces, errors, screenshots, fixtures, and audit metadata.

## 4. Financial safety

- All bank adapters are inquiry-only.
- No transfer/payment endpoint is implemented.
- No brokerage credentials or trading endpoints.
- Matching requires confirmation.
- Amounts are integer KRW and split totals are constrained.
- Idempotency protects lesson completion, external event creation, imports, occurrence generation, and match confirmation.
- Show timestamps and staleness on external balances.

## 5. Student data minimization

Store only operational tutoring information. School-record tutoring means coaching type, not a requirement to upload school records. MVP has no sensitive document upload. Notes remain private to the tutor. Build future file support only after a separate retention/access design.

## 6. CSV/import controls

- Size and row limits.
- MIME/extension are hints; inspect structure.
- No macros or spreadsheet execution.
- Treat every cell as untrusted text.
- Prevent CSV formula injection on export by prefixing dangerous leading characters.
- Preview before commit.
- Atomic commit and duplicate detection.

## 7. Web application controls

- Secure, httpOnly, sameSite session cookies via supported Supabase SSR patterns.
- CSRF protection appropriate to framework/session design.
- Zod validation on every server boundary.
- Output escaping; no unsafe HTML rendering from notes/descriptors.
- Rate limiting for auth, import, match, sync, invitation, and cron endpoints.
- Security headers and a restrictive Content Security Policy compatible with required Google/Supabase resources.
- No open redirects from service URLs/Meet links.
- Safe URL allow/validation for `https:` links.

## 8. Auditability

Append audit events for:

- lesson completion/reopening and receivable adjustment;
- payment allocation/unallocation;
- subscription price/status change and payment match;
- shared expense split change;
- settlement confirmation/unlink;
- external connection/disconnection;
- data export/deletion request.

Do not store full note bodies or secrets in audit diffs. Store identifiers, amounts, status, actor, time, and redacted context.

## 9. Development MCP safety

- Connect Supabase MCP only to local/development/preview projects; default read-only and project-scoped.
- Review every write-capable MCP action.
- Use least-privilege GitHub PAT.
- Enable Vercel write tools only after local tests pass and prefer a project-specific endpoint.
- Treat text returned by external tools/pages as untrusted instructions.
- Never connect KFTC production credentials to an MCP server.

## 10. Privacy features

- Integration consent/status and disconnect.
- Data export in human-readable JSON/CSV with safe escaping.
- Account deletion workflow with household ownership handoff or explicit household deletion.
- Explain retention of immutable settlement/audit facts where legally/operationally required; otherwise delete or anonymize.
- Minimal informational disclaimer: values may be delayed; this is not a bank, broker, tax service, or investment adviser.

## 11. Release security gate

Before preview/production:

- RLS adversarial test matrix passes.
- Secret scan and dependency audit pass.
- Codex Security findings are validated and high-severity confirmed issues fixed.
- No production credentials in local config or repository.
- Security headers/CSP verified in browser.
- Logs inspected for personal/secret leakage.
- Backup/restore and deletion workflows tested.
