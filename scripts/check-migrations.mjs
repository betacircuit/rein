#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = path.join(root, "supabase", "migrations");
const failures = [];

const files = fs
  .readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) failures.push("SQL migration이 없습니다.");

const prefixes = files.map((file) => file.slice(0, 4));
if (new Set(prefixes).size !== prefixes.length) failures.push("migration 번호가 중복되었습니다.");
if (files.some((file) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(file))) {
  failures.push("migration 파일명은 4자리 순번과 snake_case를 사용해야 합니다.");
}

const sql = files
  .map((file) => fs.readFileSync(path.join(migrationDirectory, file), "utf8"))
  .join("\n");
const tables = [...sql.matchAll(/create table public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
const rlsStart = sql.indexOf("-- RLS enablement.");
const rlsEnd = sql.indexOf("-- Profiles.", rlsStart);
const rlsBlock = rlsStart >= 0 && rlsEnd > rlsStart ? sql.slice(rlsStart, rlsEnd) : "";
const rlsTables = new Set([
  ...[...rlsBlock.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((match) => match[1]),
  ...[...sql.matchAll(/alter table public\.([a-z0-9_]+) enable row level security/gi)].map(
    (match) => match[1],
  ),
]);

for (const table of tables) {
  if (!rlsTables.has(table)) failures.push(`RLS가 활성화되지 않은 테이블: public.${table}`);
}

for (const marker of [
  "amount bigint",
  "create or replace function public.subscription_monthly_equivalent",
  "create or replace function public.available_surplus",
  "create or replace function public.record_internal_transfer",
  "create or replace function public.create_household_with_owner",
  "create or replace function public.invite_household_member",
  "create or replace function public.accept_household_invitation",
  "create or replace function public.leave_household",
  "before update of status, user_id, invitee_email, role on public.household_members",
  "drop policy households_insert_creator on public.households",
  "drop policy household_members_delete_owner on public.household_members",
  "create or replace function public.materialize_tutoring_schedule",
  "create or replace function public.protect_lesson_snapshot",
  "add constraint students_mode_resource_shape",
  "add constraint lessons_status_timestamp_shape",
  "add column included_in_totals",
  "create or replace function public.confirm_receivable_match",
  "create or replace function public.import_financial_transactions_csv",
  "allocation exceeds transaction amount",
  "create or replace function public.materialize_subscription_occurrences",
  "create or replace function public.change_subscription_price",
  "create or replace function public.confirm_subscription_match",
  "paid subscription occurrence history is immutable",
  "terminal subscription status cannot be reactivated",
  "create table public.inventory_adjustments",
  "add column quantity_version",
  "create or replace function public.adjust_inventory_quantity",
  "create or replace function public.ensure_low_stock_shopping_item",
  "create or replace function public.validate_household_operation_relations",
  "cleaning_completion_idempotency_unique",
  "when ct.next_due_on <= current_date then 'due'",
  "create table public.settlement_allocations",
  "create or replace function public.upsert_shared_expense",
  "create or replace function public.refresh_settlement_suggestions",
  "create or replace function public.confirm_settlement_match",
  "create or replace function public.confirm_household_transaction_classification",
  "create or replace function public.responsibility_adjusted_money",
  "shared expense split must allocate every krw",
  "create or replace function public.upsert_grow_plan",
  "create function public.available_surplus",
  "create or replace function public.record_grow_contribution",
  "create or replace view public.v_asset_summary",
  "create or replace view public.v_tutoring_effective_hourly",
  "revoke insert, update, delete on public.grow_plans",
  "external_connections_production_kftc_disabled",
  "external_connections_secret_reference_only",
  "create or replace function public.redact_integration_error",
  "create or replace function public.connect_mock_integration",
  "create or replace function public.begin_integration_sync",
  "create or replace function public.complete_integration_sync",
  "create or replace function public.disconnect_integration",
  "revoke insert, update, delete on public.external_connections",
  "alter type public.account_type add value if not exists 'card'",
  "create table public.account_deletion_requests",
  "create or replace function public.request_account_deletion",
  "revoke insert, update, delete on public.audit_events",
  "create or replace function public.audit_confirmed_match_decision",
  "audit_confirmed_match_decision_trigger",
]) {
  if (!sql.toLowerCase().includes(marker)) failures.push(`필수 migration 표식 누락: ${marker}`);
}

if (/\b(before_state|after_state)\b/i.test(sql)) {
  failures.push("감사 로그는 존재하는 before_data/after_data 열을 사용해야 합니다.");
}

const phaseNineTestPath = path.join(root, "supabase", "tests", "phase09_hardening.sql");
const phaseNineTest = fs.existsSync(phaseNineTestPath)
  ? fs.readFileSync(phaseNineTestPath, "utf8")
  : "";
for (const marker of [
  "card account type is supported",
  "owner can request deletion with explicit confirmation",
  "deletion audit retains actor",
  "clients cannot forge audit history",
  "repeated deletion request is idempotent",
  "outsider cannot read deletion requests",
]) {
  if (!phaseNineTest.includes(marker)) {
    failures.push(`Phase 09 보안/삭제 테스트 표식 누락: ${marker}`);
  }
}

const phaseEightTestPath = path.join(root, "supabase", "tests", "phase08_integrations.sql");
const phaseEightTest = fs.existsSync(phaseEightTestPath)
  ? fs.readFileSync(phaseEightTestPath, "utf8")
  : "";
for (const marker of [
  "minimum-scope Calendar mock can connect without credentials",
  "bank connection has inquiry-only capabilities",
  "duplicate request returns the same sync run",
  "retry does not duplicate a sync run",
  "structured sync errors redact tokens and fintech numbers",
  "incremental cursor is retained for the next sync",
  "Calendar mutation ownership is explicit",
  "owner can explicitly disconnect and revoke",
  "outsider cannot read owner integration state",
]) {
  if (!phaseEightTest.includes(marker)) {
    failures.push(`Phase 08 연동 테스트 표식 누락: ${marker}`);
  }
}

const phaseSevenTestPath = path.join(root, "supabase", "tests", "phase07_grow_analytics.sql");
const phaseSevenTest = fs.existsSync(phaseSevenTestPath)
  ? fs.readFileSync(phaseSevenTestPath, "utf8")
  : "";
for (const marker of [
  "actual available surplus is the primary formula result",
  "unpaid confirmed subscription obligation reduces surplus",
  "contribution is two transfer legs",
  "retry does not duplicate transfer legs",
  "full amount becomes completed",
  "cash plus investment equals total assets despite transfers",
  "effective hourly includes lesson prep and travel",
  "deterministic local insight can be dismissed",
  "paid or skipped obligations are not double-counted",
  "outsider cannot configure a plan with owner accounts",
]) {
  if (!phaseSevenTest.includes(marker)) {
    failures.push(`Phase 07 Grow/분석 테스트 표식 누락: ${marker}`);
  }
}

const phaseSixTestPath = path.join(root, "supabase", "tests", "phase06_shared_money.sql");
const phaseSixTest = fs.existsSync(phaseSixTestPath)
  ? fs.readFileSync(phaseSixTestPath, "utf8")
  : "";
for (const marker of [
  "all agreed categories are available",
  "actual payer is stored separately",
  "split allocates every KRW",
  "payer reversals and refunds net to one pairwise balance",
  "suggestion alone stays inert",
  "partial settlement reduces net balance correctly",
  "historical expenses are not rewritten by settlement",
  "classification candidate stays inert before confirmation",
  "confirmation creates exactly one linked shared expense",
  "responsibility projection counts each shared source once",
  "private account and counterparty details do not leak to roommate projections",
  "outsider cannot mutate shared expense through RPC",
]) {
  if (!phaseSixTest.includes(marker)) {
    failures.push(`Phase 06 공동비 테스트 표식 누락: ${marker}`);
  }
}

const phaseFiveTestPath = path.join(root, "supabase", "tests", "phase05_household_operations.sql");
const phaseFiveTest = fs.existsSync(phaseFiveTestPath)
  ? fs.readFileSync(phaseFiveTestPath, "utf8")
  : "";
for (const marker of [
  "Monster is not all refrigerated",
  "stale concurrent adjustment cannot overwrite newer quantity",
  "inventory audit actor must match the authenticated member",
  "inventory cannot become negative under retry",
  "low-stock action does not create duplicate open shopping items",
  "purchased item links existing financial records without duplication",
  "a task due today is derived as due",
  "completion history retains actor and timestamp",
  "repeated completion does not duplicate history",
  "active roommate sees shared inventory shopping cleaning and completion rows",
  "outsider cannot read household operational rows",
]) {
  if (!phaseFiveTest.includes(marker)) {
    failures.push(`Phase 05 우리집 테스트 표식 누락: ${marker}`);
  }
}

const phaseFourTestPath = path.join(root, "supabase", "tests", "phase04_subscriptions.sql");
const phaseFourTest = fs.existsSync(phaseFourTestPath)
  ? fs.readFileSync(phaseFourTestPath, "utf8")
  : "";
for (const marker of [
  "month-end anchor survives February",
  "repeated occurrence materialization is idempotent",
  "suggestion alone stays inert",
  "confirmation does not duplicate expense transaction",
  "creates exactly one shared expense",
  "split allocates every KRW",
  "paid historical occurrence keeps old price",
  "cancellation stops future occurrences",
  "outsider cannot read subscription occurrences",
]) {
  if (!phaseFourTest.includes(marker)) {
    failures.push(`Phase 04 구독 테스트 표식 누락: ${marker}`);
  }
}

const phaseThreeTestPath = path.join(root, "supabase", "tests", "phase03_money_receivables.sql");
const phaseThreeTest = fs.existsSync(phaseThreeTestPath)
  ? fs.readFileSync(phaseThreeTestPath, "utf8")
  : "";
for (const marker of [
  "complete lesson creates exactly one receivable",
  "unpaid tutoring is not cash income",
  "allocation cannot exceed transaction amount",
  "transfer has no net cash effect",
  "repeated CSV import is idempotent",
  "suggestion alone does not allocate",
  "outsider cannot read owner money accounts",
]) {
  if (!phaseThreeTest.includes(marker)) {
    failures.push(`Phase 03 돈 테스트 표식 누락: ${marker}`);
  }
}

const phaseTwoRlsTestPath = path.join(root, "supabase", "tests", "phase02_tutoring.sql");
const phaseTwoRlsTest = fs.existsSync(phaseTwoRlsTestPath)
  ? fs.readFileSync(phaseTwoRlsTestPath, "utf8")
  : "";
for (const marker of [
  "school record student cannot carry subject",
  "weekly schedule creates September occurrences",
  "repeated materialization is idempotent",
  "materialized lesson snapshot is immutable",
  "outsider cannot read tutoring students",
  "outsider cannot materialize owner schedule",
]) {
  if (!phaseTwoRlsTest.includes(marker)) {
    failures.push(`Phase 02 과외 테스트 표식 누락: ${marker}`);
  }
}

const phaseOneRlsTestPath = path.join(root, "supabase", "tests", "phase01_household_rls.sql");
const phaseOneRlsTest = fs.existsSync(phaseOneRlsTestPath)
  ? fs.readFileSync(phaseOneRlsTestPath, "utf8")
  : "";
for (const marker of [
  "unauthenticated profile access denied",
  "outsider cannot read owner accounts",
  "matching invitee can accept invitation",
  "active roommate can read shared operations",
  "roommate cannot read owner transactions",
  "left member loses shared access",
  "must create households through the atomic RPC",
  "cannot erase membership history with a direct delete",
  "cannot bypass invitation acceptance with a direct insert",
]) {
  if (!phaseOneRlsTest.includes(marker)) {
    failures.push(`Phase 01 RLS 적대적 테스트 표식 누락: ${marker}`);
  }
}

if (/lesson_status[^;]*(makeup|보강)/i.test(sql))
  failures.push("금지된 보강 수업 상태가 schema에 있습니다.");

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log(
  `PASS: ${files.length}개 migration, ${tables.length}개 보호 테이블, 전 테이블 RLS 활성화.`,
);
