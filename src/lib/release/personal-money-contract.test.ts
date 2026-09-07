import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("개인 금융 입력 계약", () => {
  it("거래 입력에서 계좌 선택을 숨기고 서버 자동 라우팅을 사용한다", () => {
    const form = read("src/app/money/transaction-form.tsx");
    const action = read("src/app/money/remote-actions.ts");
    const migration = read("supabase/migrations/0023_money_auto_routing_and_corrections.sql");

    expect(form).not.toContain('name="accountId"');
    expect(action).toContain("p_account_id: null");
    expect(migration).toContain("external_account_reference = 'rein-woori'");
    expect(migration).toContain("external_account_reference = 'rein-kb'");
  });

  it("가져온 거래는 원본 필드 대신 분류와 표시 정보만 교정한다", () => {
    const migration = read("supabase/migrations/0023_money_auto_routing_and_corrections.sql");
    const correctionStart = migration.indexOf(
      "create or replace function public.correct_financial_transaction",
    );
    const correctionEnd = migration.indexOf(
      "create or replace function public.delete_manual_financial_transaction",
    );
    const correction = migration.slice(correctionStart, correctionEnd);

    expect(correction).toContain("set category_id = v_category_id");
    expect(correction).not.toContain("set amount =");
    expect(correction).not.toContain("occurred_at =");
    expect(correction).not.toContain("source =");
  });
});
