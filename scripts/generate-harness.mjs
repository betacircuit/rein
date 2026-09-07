#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const reqPath = path.join(root, "requirements", "requirements.json");
const outDir = path.join(root, "harness", "build");
const reqs = JSON.parse(fs.readFileSync(reqPath, "utf8")).requirements;

const phases = {
  "00": {
    slug: "foundation",
    title: "Foundation and Product Shell",
    objective:
      "Create the repository foundation, Korean responsive shell, shared domain primitives, fixture path, quality scripts, and hard safety boundaries before feature work.",
    prerequisites: [
      "Read every normative spec file in the order defined by AGENTS.md.",
      "Use a current stable Next.js App Router setup, strict TypeScript, Tailwind, shadcn/ui, Supabase client skeleton, Vitest, and Playwright.",
      "Do not delete this specification pack.",
    ],
    outputs: [
      "App shell with five top-level destinations and global quick-add.",
      "Money/date/time formula primitives using integer KRW and Asia/Seoul.",
      "Loading/empty/error/offline/stale patterns.",
      "Local demo mode and environment validation.",
      "Lint, typecheck, unit, integration, E2E, build, and verify commands.",
    ],
    tests: [
      "360 px and desktop navigation smoke tests.",
      "Integer-KRW and timezone unit tests.",
      "No secret appears in client bundle or tracked files.",
      "No production mutation/deployment path can run silently.",
    ],
  },
  "01": {
    slug: "auth-household-boundary",
    title: "Authentication and Household Privacy Boundary",
    objective:
      "Implement authentication, profiles, household creation/invitation, membership states, and adversarial RLS foundations.",
    prerequisites: [
      "Phase 00 quality gate passes.",
      "Local Supabase is running and migrations are versioned.",
    ],
    outputs: [
      "Profile onboarding.",
      "Create/join household flow for user and roommate.",
      "Owner/member and invited/active/left states.",
      "RLS helper functions and policies for private versus shared data.",
    ],
    tests: [
      "Unauthenticated access denied.",
      "User B cannot read User A private rows.",
      "Nonmember cannot read household rows.",
      "Active member can read allowed shared rows but not private finance.",
    ],
  },
  "02": {
    slug: "tutoring",
    title: "Tutoring Operations",
    objective:
      "Build students, recurrence templates, lessons, prep workflow, online/in-person behavior, and a mock Calendar adapter without introducing receivables yet.",
    prerequisites: ["Phases 00–01 pass.", "Use mock Calendar by default; real OAuth is Phase 08."],
    outputs: [
      "Student CRUD with SUBJECT/SCHOOL_RECORD constraints.",
      "Only math/physics/chemistry for subject tutoring.",
      "Scheduled/completed/cancelled lesson workflow with no makeup domain.",
      "Preparation notes/checklist.",
      "Weekly recurrence materialization and idempotency.",
      "Online Meet and in-person location actions.",
      "Student detail metrics placeholders fed by domain queries.",
    ],
    tests: [
      "Every illegal tutoring type/subject combination is rejected in UI, server, and DB.",
      "Changing student defaults does not mutate historical lessons.",
      "Schedule materialization does not duplicate lessons.",
      "Repository/UI search finds no makeup/보강 domain term.",
      "No document-upload route exists for school-record tutoring.",
    ],
  },
  "03": {
    slug: "money-receivables",
    title: "Ledger, Accounts, and Tutoring Receivables",
    objective:
      "Implement the single actual-cash ledger, accounts, import path, lesson completion receivables, allocations, and confirmation-only matching.",
    prerequisites: [
      "Phase 02 passes.",
      "Use mock/manual finance providers; no production bank access.",
    ],
    outputs: [
      "Accounts and transaction CRUD.",
      "Income/expense/two-leg transfer semantics.",
      "Seed categories.",
      "CSV preview/validation/idempotent import.",
      "Lesson completion → one receivable.",
      "Partial and combined receivable allocations.",
      "Deposit matching suggestions with evidence and audit.",
    ],
    tests: [
      "Completing a lesson twice still yields one receivable.",
      "Partial/combined allocations reconcile and cannot over-allocate.",
      "Transfers do not affect income or spending totals.",
      "Duplicate CSV import adds zero duplicates.",
      "CSV cells beginning with spreadsheet formula markers are safely handled on export/display.",
      "Unpaid tutoring remains outside settled cash and available surplus.",
    ],
  },
  "04": {
    slug: "subscriptions",
    title: "Monthly Subscription Management",
    objective:
      "Implement recurring contracts, price history, expected occurrences, matching, renewal/trial views, and the household-subscription bridge.",
    prerequisites: ["Phase 03 ledger and matching foundation pass."],
    outputs: [
      "Subscription overview and CRUD.",
      "All agreed categories, states, cycles, dates, reminders, scope, account/descriptor metadata.",
      "Deterministic occurrence generation.",
      "Price history.",
      "Actual-charge matching with confirmation.",
      "Household occurrence → exactly one shared expense.",
      "Keep/review/cancel-candidate and last-used notes.",
    ],
    tests: [
      "Cycle-to-month and annual normalization formulas.",
      "Occurrence generation is idempotent and respects cancellation/end.",
      "Changing price retains old history and uses effective price by occurrence date.",
      "Household occurrence cannot create duplicate shared expenses.",
      "Already paid charge is not treated as a second unpaid obligation.",
      "7-day, 30-day, trial, unmatched, and overdue views reconcile.",
    ],
  },
  "05": {
    slug: "household-operations",
    title: "Household Inventory, Shopping, and Cleaning",
    objective:
      "Build fast shared-home operational tools that work well for two roommates while remaining extensible.",
    prerequisites: [
      "Household boundary exists.",
      "Shared money settlement is deliberately deferred to Phase 06.",
    ],
    outputs: [
      "Inventory list/detail and atomic +/- adjustment.",
      "Mine/roommate/shared ownership through member references.",
      "Refrigerated/frozen/room-temperature storage.",
      "Low-stock → shopping linkage.",
      "Personal/member/shared shopping items.",
      "Cleaning recurrence, derived state, completion history.",
      "Demo chicken breast and partially refrigerated Monster stock.",
    ],
    tests: [
      "Inventory cannot become negative under concurrent/retried adjustment.",
      "Low-stock action does not create duplicate open shopping items.",
      "Cleaning completion records actor/time and computes next due.",
      "Roommate sees shared operational rows according to RLS.",
      "Demo seed reflects the exact food/drink context.",
    ],
  },
  "06": {
    slug: "shared-money",
    title: "Shared Household Expenses and Settlement",
    objective:
      "Represent actual payer separately from economic responsibility, compute exact splits and net settlement, and connect shared costs to the private ledger without leaking account data.",
    prerequisites: [
      "Phases 03 and 05 pass.",
      "Household subscription bridge from Phase 04 is available.",
    ],
    outputs: [
      "Shared expense CRUD and agreed categories.",
      "50:50, user-all, roommate-all, and exact custom splits.",
      "Every-KRW split validation.",
      "Net settlement and partial settlements.",
      "Transaction classification/linking.",
      "Roommate settlement matching suggestion.",
      "Responsibility-adjusted Money/Grow projection.",
    ],
    tests: [
      "Split totals always equal total amount.",
      "Payer and responsibility can differ.",
      "Private account/counterparty details do not leak to roommate projections.",
      "Historical expenses are not rewritten by settlement.",
      "One actual charge is counted once across Money, Subscription, and Household.",
      "Partial settlement updates net balance correctly.",
    ],
  },
  "07": {
    slug: "home-grow-analytics",
    title: "Home, Grow, and Analytics",
    objective:
      "Turn the verified domain model into a useful action-first home screen, month analytics, and one conservative student-level surplus-allocation workflow.",
    prerequisites: [
      "All operational and money phases 00–06 pass.",
      "Use formula services rather than component-local arithmetic.",
    ],
    outputs: [
      "Action-first Home dashboard.",
      "Monthly tutoring earned/received/outstanding.",
      "Cash flow, category, student, effective hourly, subscription/fixed cost, asset trend analytics.",
      "Available-surplus formula.",
      "Safety reserve/long-term/flexible allocation.",
      "Fixed or percentage contribution rule.",
      "Planned/completed contribution linked to transfer.",
      "Neutral educational risk disclosure.",
    ],
    tests: [
      "Unpaid tutoring is excluded from settled cash and surplus.",
      "User household responsibility, not merely cash paid, affects surplus.",
      "Paid obligations are not subtracted twice.",
      "Investment contribution is a transfer and total assets remain unchanged.",
      "Nominal/effective hourly formulas include correct time inputs.",
      "Every chart has a readable text/table equivalent.",
      "Dashboard totals reconcile with detail screens.",
    ],
  },
  "08": {
    slug: "integrations",
    title: "Google Calendar and Read-only Banking Integrations",
    objective:
      "Implement real adapters behind safe interfaces while preserving a complete credential-free mock/manual product path.",
    prerequisites: [
      "Core product passes with mock adapters.",
      "Use development Google project and KFTC testbed only.",
      "Do not connect production personal/financial data through MCP.",
    ],
    outputs: [
      "Minimum-scope Google OAuth and Calendar adapter.",
      "Unique conference create request per lesson event.",
      "Stored external IDs, sync state, errors, disconnect/revoke.",
      "Read-only bank provider contract for balance/history.",
      "KFTC testbed adapter shape, pagination, incremental sync, redaction.",
      "Bounded retry/idempotency and contract tests.",
      "Production KFTC hard feature gate.",
    ],
    tests: [
      "Unrelated Calendar events are never modified/deleted.",
      "Every generated lesson conference uses a fresh request ID.",
      "Provider tokens are server-only and absent from client/storage tables.",
      "Pagination/import retries produce no duplicate transaction.",
      "Mock, manual, unavailable, stale, revoked, and error states remain fully usable.",
      "Production KFTC path cannot enable without explicit operational gates.",
    ],
  },
  "09": {
    slug: "hardening-release",
    title: "Hardening, Accessibility, Export, and Preview Release",
    objective:
      "Finish the product rather than merely demonstrating it: accessibility, PWA behavior, settings, privacy operations, CI, security evidence, and preview deployment.",
    prerequisites: [
      "Phases 00–08 pass locally.",
      "Production deployment remains a separately confirmed action.",
    ],
    outputs: [
      "Complete settings hierarchy.",
      "Data export and deletion with retention explanation.",
      "PWA manifest/offline read-only shell.",
      "WCAG 2.2 AA-oriented fixes.",
      "No-dead-button sweep.",
      "Security, dependency, migration, and secret scans.",
      "CI workflow and preview deployment documentation.",
      "Requirement evidence in PROGRESS.md.",
    ],
    tests: [
      "Keyboard-only and mobile touch journeys.",
      "Axe/accessibility smoke and text alternatives.",
      "RLS adversarial matrix for all protected tables.",
      "Export round-trip/sanitization and deletion confirmation.",
      "Offline read behavior is honest; unsafe writes are not silently queued.",
      "No secret or sensitive log leakage.",
      "Every P0/P1 requirement has evidence and all pack checks pass.",
    ],
  },
  backlog: {
    slug: "backlog",
    title: "Explicit Post-MVP Backlog",
    objective:
      "Keep deferred ideas visible without creating placeholder controls, hidden partial implementations, or scope creep in MVP.",
    prerequisites: [
      "Do not implement these during the main phases unless the user explicitly reprioritizes them.",
    ],
    outputs: [
      "Backlog issues/notes only, with privacy and safety implications.",
      "No dead navigation or fake buttons.",
    ],
    tests: [
      "Search confirms the features are absent from active UI except as clearly labeled roadmap documentation.",
    ],
  },
};

fs.mkdirSync(outDir, { recursive: true });

for (const [phase, meta] of Object.entries(phases)) {
  const selected = reqs.filter((r) => r.phase === phase);
  const number = phase === "backlog" ? "backlog" : `phase-${phase}`;
  const filename = phase === "backlog" ? "backlog.md" : `${number}-${meta.slug}.md`;
  const lines = [];
  lines.push(`# ${phase === "backlog" ? "" : `Phase ${phase} — `}${meta.title}`.trim());
  lines.push("");
  lines.push(`## Objective\n\n${meta.objective}`);
  lines.push("");
  lines.push("## Codex execution instruction");
  lines.push("");
  lines.push("```text");
  lines.push(
    `Implement ${phase === "backlog" ? "only the documentation for" : `Phase ${phase} of`} Student OS. Read AGENTS.md and all normative specifications first.`,
  );
  lines.push(
    "Before editing, enumerate the requirement IDs in this file and map them to concrete files, domain services, migrations, UI routes, and tests.",
  );
  lines.push(
    "Then implement the vertical slices completely. Do not stop at planning or static mockups. Preserve every cross-module invariant and do not invent incompatible fields.",
  );
  lines.push(
    "Run the quality gate, real browser checks, RLS/security checks where applicable, and update PROGRESS.md plus DECISIONS.md with evidence.",
  );
  lines.push(
    "Do not mark the phase complete while any acceptance statement below lacks automated or inspectable evidence.",
  );
  lines.push("```");
  lines.push("");
  lines.push("## Prerequisites");
  lines.push("");
  for (const item of meta.prerequisites) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Expected outputs");
  lines.push("");
  for (const item of meta.outputs) lines.push(`- ${item}`);
  lines.push("");
  lines.push(`## Normative requirements (${selected.length})`);
  lines.push("");
  for (const r of selected) {
    lines.push(`### [ ] ${r.id} — ${r.area} — ${r.priority}`);
    lines.push("");
    lines.push(`**Requirement:** ${r.requirement}`);
    lines.push("");
    lines.push(`**Acceptance:** ${r.acceptance}`);
    lines.push("");
    lines.push(
      "**Evidence to record:** implementation file(s), migration/policy if any, test name(s), and browser verification screenshot/log in `PROGRESS.md`.",
    );
    lines.push("");
  }
  lines.push("## Required tests and review");
  lines.push("");
  for (const item of meta.tests) lines.push(`- [ ] ${item}`);
  lines.push(
    "- [ ] `pnpm lint`, `pnpm typecheck`, relevant unit/integration/RLS tests, `pnpm test:e2e`, and `pnpm build` pass.",
  );
  lines.push(
    "- [ ] `node scripts/check-spec-coverage.mjs` and `node scripts/verify-pack.mjs` pass.",
  );
  lines.push(
    "- [ ] No console error, dead action, fabricated success state, or undocumented external-only block remains.",
  );
  lines.push("");
  lines.push("## Exit report template");
  lines.push("");
  lines.push("```text");
  lines.push(`Phase: ${phase}`);
  lines.push("Requirement evidence: <ID -> files/tests>");
  lines.push("Commands run: <command + result>");
  lines.push("Browser journeys verified: <viewport + route + result>");
  lines.push("Security/RLS checks: <result>");
  lines.push(
    "External blockers: <none or precise credential/eligibility item; mock path must still pass>",
  );
  lines.push("Decisions/risks recorded: <DECISIONS.md entries>");
  lines.push("```");
  lines.push("");
  fs.writeFileSync(path.join(outDir, filename), `${lines.join("\n")}\n`);
}

console.log(
  `Generated ${Object.keys(phases).length} harness files from ${reqs.length} requirements.`,
);
