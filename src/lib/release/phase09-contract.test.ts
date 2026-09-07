import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function readTree(path: string): string {
  return readdirSync(join(root, path), { withFileTypes: true })
    .flatMap((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory()
        ? readTree(child)
        : /\.(ts|tsx)$/.test(entry.name)
          ? read(child)
          : [];
    })
    .join("\n");
}

describe("Phase 09 inspectable release contract", () => {
  const appSource = readTree("src/app");

  test("CORE-006 settings uses authenticated Supabase identity and sign-out", () => {
    const settings = read("src/app/settings/page.tsx");
    expect(settings).toContain("requireSupabaseUser");
    expect(settings).toContain("findIdentityByEmail");
    expect(settings).toContain("signOutAction");
    expect(settings).not.toContain("demoProfile");
  });

  test("MON-018 schema and account UI support manual card accounts", () => {
    expect(read("supabase/migrations/0013_hardening_privacy.sql")).toContain(
      "alter type public.account_type add value if not exists 'card'",
    );
    expect(read("src/app/money/account-form.tsx")).toContain('<option value="card">카드</option>');
  });

  test("GROW-012 and HOM-020 omit brokerage execution, barcode, and OCR controls", () => {
    const routeFiles = readdirSync(join(root, "src/app"), { recursive: true })
      .map(String)
      .join("\n");
    expect(routeFiles).not.toMatch(/(?:^|[\\/])(buy|sell|brokerage)(?:[\\/]|$)/i);
    expect(appSource).not.toMatch(/name=["'](?:brokerageCredential|brokerageToken)["']/i);
    expect(appSource).not.toMatch(/(?:barcode|바코드|receipt\s*ocr|영수증\s*ocr)/i);
  });

  test("INT-009 runbook gates preview and production separately", () => {
    const runbook = read("docs/preview-release-runbook.md");
    expect(runbook).toContain("별도 Supabase development 프로젝트");
    expect(runbook).toContain("사용자의 별도 명시적 확인");
    expect(runbook).toContain("운영 배포");
  });

  test("UX-001 production labels do not retain avoidable English eyebrows", () => {
    for (const label of [
      "Student defaults",
      "New student",
      "Shared money",
      "Matching desk",
      "Confirmation desk",
      "Manual review",
      "Renewal rail",
    ]) {
      expect(appSource).not.toContain(`>${label}<`);
      expect(appSource).not.toContain(`"${label}"`);
    }
  });

  test("UX-002 navigation has desktop, mobile, focus, touch, and safe-area contracts", () => {
    const shell = read("src/components/app-shell.tsx");
    expect(shell).toContain("lg:flex lg:flex-col");
    expect(shell).toContain('aria-label="모바일 주요 메뉴"');
    expect(shell).toContain("env(safe-area-inset-bottom)");
    expect(shell).toContain("min-h-11");
    expect(shell).toContain("focus-visible:ring-2");
    expect(shell).toContain('href: "/home"');
    expect(shell).toContain('href: "/tutoring/students"');
    expect(shell).not.toContain("QuickAdd");
  });

  test("UX-003 primary forms use conditional progressive disclosure", () => {
    const studentForm = read("src/app/tutoring/students/student-form.tsx");
    expect(studentForm).toMatch(/type === "subject"[\s\S]*mode === "in_person"/);
    const scheduleForm = read("src/app/tutoring/schedule/schedule-form.tsx");
    expect(scheduleForm).toContain('name="startTime"');
    expect(scheduleForm).toContain('name="endTime"');
    expect(read("src/app/money/subscriptions/subscription-form.tsx")).toMatch(
      /cycle === "custom_days"[\s\S]*scope === "household"/,
    );
    expect(read("src/app/household/expenses/shared-expense-form.tsx")).toMatch(
      /preset === "custom_amounts"[\s\S]*preset === "custom_percentages"/,
    );
  });

  test("UX-004 delete, cancel, match, settle, unlink, and regenerate surfaces require confirmation", () => {
    for (const path of [
      "src/app/money/transactions/[transactionId]/page.tsx",
      "src/app/tutoring/lessons/[lessonId]/page.tsx",
      "src/app/money/matches/page.tsx",
      "src/app/money/subscriptions/matches/page.tsx",
      "src/app/household/settlements/page.tsx",
      "src/app/settings/integrations/page.tsx",
      "src/app/tutoring/students/[studentId]/page.tsx",
    ]) {
      expect(read(path)).toMatch(/ConfirmActionForm|ConfirmSubmitButton/);
      expect(read(path)).toContain("confirmMessage=");
    }
  });

  test("UX-007 analytics present readable labeled numbers and lists without color-only charts", () => {
    const analytics = read("src/app/money/analytics/page.tsx");
    expect(analytics).toContain('aria-label="월간 현금 흐름"');
    expect(analytics).toContain("과외 실질 시간당 수입");
    expect(analytics).toContain("분류별 실제 흐름");
    expect(analytics).not.toMatch(/<(canvas|svg)\b/);
  });

  test("UX-009 and UX-010 avoid inert placeholders and route key empty states to a next action", () => {
    expect(appSource).not.toMatch(/href=["']#["']/);
    expect(appSource).not.toMatch(/javascript:/i);
    expect(appSource).not.toMatch(/onClick=\{\(\) => \{\}\}/);
    expect(read("src/app/tutoring/lessons/page.tsx")).toContain('href="/tutoring/lessons/new"');
    expect(read("src/app/money/matches/page.tsx")).toContain('href="/money/transactions/import"');
    expect(read("src/app/money/subscriptions/calendar/page.tsx")).toContain(
      'href="/money/subscriptions/new"',
    );
  });

  test("SEC-010 MCP example is development-scoped, read-only, and production-prohibited", () => {
    const config = JSON.parse(read(".mcp.json.example")) as {
      mcpServers: Record<string, { url?: string }>;
      _studentOsSafety: string;
    };
    const url = config.mcpServers["supabase-development-readonly"]?.url ?? "";
    expect(url).toContain("project_ref=");
    expect(url).toContain("read_only=true");
    expect(url).toContain("features=database%2Cdocs");
    expect(config._studentOsSafety).toContain("PRODUCTION PROHIBITED");
    expect(existsSync(join(root, "docs/mcp-safety.md"))).toBe(true);
  });

  test("SEC-011 CI runs dependency, app, migration, secret, and database security gates", () => {
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("pnpm audit --audit-level=high");
    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain("supabase db lint --local");
    expect(workflow).toContain("supabase test db");
  });

  test("SEC-012 reconciliation audit stores actor, source, and prior/new linkage", () => {
    const migration = read("supabase/migrations/0014_reconciliation_audit.sql");
    expect(migration).toContain("v_actor_id uuid := auth.uid()");
    expect(migration).toContain("'source', 'match_suggestion'");
    expect(migration).toContain("before_data, after_data, metadata");
    expect(migration).toContain("'linked_transaction_id', null");
    expect(migration).toContain("'linked_transaction_id', new.transaction_id");
  });
});
