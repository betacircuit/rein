#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}
function warn(message) {
  warnings.push(message);
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}
function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const requiredFiles = [
  "START_HERE.md",
  "README.md",
  "AGENTS.md",
  "MASTER_CODEX_PROMPT.md",
  "GOALS.md",
  "PRODUCT_REQUIREMENTS.md",
  "INFORMATION_ARCHITECTURE.md",
  "DOMAIN_RULES.md",
  "UI_UX_SPEC.md",
  "DATA_MODEL.md",
  "API_INTEGRATIONS.md",
  "SUBSCRIPTIONS_SPEC.md",
  "SECURITY_PRIVACY.md",
  "ACCEPTANCE_CRITERIA.md",
  "TRACEABILITY_MATRIX.md",
  "PLANS.md",
  "PROGRESS.md",
  "DECISIONS.md",
  "IMPLEMENTATION_CHECKLIST.md",
  "MCP_AND_SKILLS_SETUP.md",
  "SOURCE_REFERENCES.md",
  "CODEX_HANDOFF_CHECKLIST.md",
  "requirements/requirements.json",
  "docs/openapi.yaml",
  "docs/erd.mmd",
  "docs/flows.mmd",
  "docs/routes.md",
  ".codex/config.toml.example",
  ".mcp.json.example",
  ".env.example",
  "supabase/README.md",
  "supabase/fixtures/demo-data.json",
  "supabase/migrations/0001_extensions_and_types.sql",
  "supabase/migrations/0002_schema.sql",
  "supabase/migrations/0003_functions_rls_views.sql",
  "supabase/migrations/0004_default_categories.sql",
  "scripts/generate-harness.mjs",
  "scripts/check-spec-coverage.mjs",
  "scripts/generate-manifest.mjs",
  "scripts/verify-pack.mjs",
  "scripts/bootstrap.sh",
  "scripts/bootstrap.ps1",
  "templates/github-workflows-ci.yml",
  "templates/gitignore.append",
];
for (const file of requiredFiles) {
  if (!exists(file)) fail(`Missing required artifact: ${file}`);
}

let ledger = { requirements: [] };
try {
  ledger = JSON.parse(read("requirements/requirements.json"));
} catch (error) {
  fail(`Invalid requirements JSON: ${error.message}`);
}
if (!Array.isArray(ledger.requirements) || ledger.requirements.length !== 154) {
  fail(
    `Expected 154 conversation-derived requirements, found ${ledger.requirements?.length ?? "invalid"}.`,
  );
}

try {
  JSON.parse(read("supabase/fixtures/demo-data.json"));
} catch (error) {
  fail(`Invalid demo-data.json: ${error.message}`);
}
try {
  JSON.parse(read(".mcp.json.example"));
} catch (error) {
  fail(`Invalid .mcp.json.example: ${error.message}`);
}

const openapi = read("docs/openapi.yaml");
for (const marker of [
  "openapi: 3.1.0",
  "/api/students:",
  "/api/lessons/{lessonId}/complete:",
  "/api/subscriptions:",
  "/api/households/{householdId}/settlement/summary:",
  "/api/grow/summary:",
  "components:",
  "securitySchemes:",
]) {
  if (!openapi.includes(marker)) fail(`docs/openapi.yaml is missing marker: ${marker}`);
}

const migrations = [
  read("supabase/migrations/0001_extensions_and_types.sql"),
  read("supabase/migrations/0002_schema.sql"),
  read("supabase/migrations/0003_functions_rls_views.sql"),
  read("supabase/migrations/0004_default_categories.sql"),
].join("\n");

const expectedTables = [
  "profiles",
  "households",
  "household_members",
  "external_connections",
  "sync_runs",
  "students",
  "tutoring_schedules",
  "lessons",
  "lesson_prep_items",
  "receivables",
  "accounts",
  "transaction_categories",
  "financial_transactions",
  "receivable_allocations",
  "subscriptions",
  "subscription_splits",
  "subscription_price_history",
  "subscription_occurrences",
  "shared_expenses",
  "shared_expense_splits",
  "settlements",
  "inventory_items",
  "shopping_items",
  "cleaning_tasks",
  "cleaning_completions",
  "grow_plans",
  "investment_contributions",
  "match_suggestions",
  "audit_events",
];
for (const table of expectedTables) {
  if (!migrations.includes(`create table public.${table}`))
    fail(`Missing schema table public.${table}.`);
}

for (const marker of [
  "create type public.lesson_status as enum ('scheduled', 'completed', 'cancelled')",
  "create type public.tutoring_subject as enum ('math', 'physics', 'chemistry')",
  "create type public.transaction_kind as enum ('income', 'expense', 'transfer')",
  "create type public.subscription_status as enum ('trial', 'active', 'paused', 'cancelled', 'ended')",
  "create type public.bank_provider as enum ('mock', 'manual_csv', 'kftc_testbed', 'kftc_production')",
  "create or replace function public.complete_lesson",
  "create or replace function public.record_internal_transfer",
  "create or replace function public.ensure_household_subscription_expense",
  "create or replace function public.available_surplus",
  "enable row level security",
]) {
  if (!migrations.includes(marker)) fail(`SQL migration is missing invariant marker: ${marker}`);
}
if (/lesson_status[^;]*(makeup|보강)/i.test(migrations)) {
  fail("SQL lesson_status domain contains a forbidden makeup/보강 value.");
}
if (/transaction_kind[^;]*investment/i.test(migrations)) {
  fail("Investment must not be a transaction kind; contributions must be transfers.");
}

const master = read("MASTER_CODEX_PROMPT.md");
for (const marker of [
  "Home | Tutoring | Money | Household | Settings",
  "Lesson -> Receivable",
  "Subscription -> SubscriptionOccurrence",
  "monthly surplus allocation",
  "chicken breast and Monster",
  "Continue through phases without waiting for another prompt",
]) {
  if (!master.includes(marker)) fail(`Master prompt is missing critical marker: ${marker}`);
}

const subscriptions = read("SUBSCRIPTIONS_SPEC.md");
for (const marker of [
  "7일",
  "30일",
  "TRIAL",
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "ENDED",
  "AI/소프트웨어",
  "클라우드/스토리지",
  "교육",
  "엔터테인먼트",
  "SubscriptionOccurrence",
  "SharedExpense",
  "price history",
]) {
  if (!subscriptions.toLowerCase().includes(marker.toLowerCase())) {
    fail(`SUBSCRIPTIONS_SPEC.md is missing subscription requirement marker: ${marker}`);
  }
}

const config = read(".codex/config.toml.example");
if (config.includes("default_tools_approval_mode")) {
  fail(
    ".codex/config.toml.example contains an unverified MCP config key: default_tools_approval_mode.",
  );
}
if (!config.includes("read_only=true"))
  fail("Supabase MCP must default to project-scoped read-only.");
if (!config.includes("next-devtools-mcp@latest")) fail("Next.js DevTools MCP config is missing.");
if (!config.includes("@playwright/mcp@latest")) fail("Playwright MCP config is missing.");

const env = read(".env.example");
for (const placeholder of [
  "SUPABASE",
  "GOOGLE",
  "KFTC",
  "BANK_PROVIDER",
  "KFTC_PRODUCTION_ENABLED=false",
]) {
  if (!env.includes(placeholder))
    fail(`.env.example is missing safe placeholder/config: ${placeholder}`);
}
if (/=(?:sk-|eyJ|ghp_|github_pat_)[A-Za-z0-9_-]{8,}/.test(env)) {
  fail(".env.example appears to contain a real credential.");
}

const agentsBytes = fs.existsSync(path.join(root, "AGENTS.md"))
  ? fs.statSync(path.join(root, "AGENTS.md")).size
  : 0;
if (agentsBytes > 32 * 1024) {
  fail(
    `AGENTS.md is ${agentsBytes} bytes and exceeds the default 32 KiB Codex project-instruction budget.`,
  );
}

const coverage = spawnSync(
  process.execPath,
  [path.join(root, "scripts", "check-spec-coverage.mjs")],
  {
    cwd: root,
    encoding: "utf8",
  },
);
if (coverage.stdout) process.stdout.write(coverage.stdout);
if (coverage.stderr) process.stderr.write(coverage.stderr);
if (coverage.status !== 0) fail("Specification coverage script failed.");

const manifestPath = path.join(root, "SPEC_MANIFEST.json");
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.requirement_count !== ledger.requirements.length)
      fail("Manifest requirement count is stale.");
    if (Array.isArray(manifest.files)) {
      for (const entry of manifest.files) {
        const absolutePath = path.join(root, entry.path);
        if (!fs.existsSync(absolutePath)) {
          fail(`Manifest references missing file: ${entry.path}`);
          continue;
        }
        const digest = crypto
          .createHash("sha256")
          .update(fs.readFileSync(absolutePath))
          .digest("hex");
        if (digest !== entry.sha256) fail(`Manifest checksum mismatch: ${entry.path}`);
      }
    } else {
      warn("Manifest does not yet contain file checksums; run scripts/generate-manifest.mjs.");
    }
  } catch (error) {
    fail(`SPEC_MANIFEST.json is invalid: ${error.message}`);
  }
} else {
  fail("SPEC_MANIFEST.json is missing.");
}

for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  process.exit(1);
}
console.log(
  "PASS: REIN Codex build pack structure, requirement traceability, contracts, security defaults, and checksums are valid.",
);
