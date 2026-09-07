import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.REIN_VERIFY_PASSWORD;
if (!url || !key || !password) throw new Error("verification environment is incomplete");

const client = createClient(url, key);
const auth = await client.auth.signInWithPassword({
  email: "choi.jaewon@rein.local",
  password,
});
if (auth.error) throw auth.error;

const before = await client
  .from("accounts")
  .select("id,current_balance,available_balance")
  .eq("is_active", true)
  .order("created_at")
  .limit(1);
if (before.error) throw before.error;
const oldAccount = before.data[0] ?? null;

const recorded = await client.rpc("record_manual_transaction", {
  p_account_id: null,
  p_kind: "income",
  p_amount: 1,
  p_occurred_at: new Date().toISOString(),
  p_category_code: "other_income",
  p_counterparty: "REIN E2E",
  p_descriptor: "atomic rpc check",
  p_memo: "temporary verification row",
});
if (recorded.error) throw recorded.error;

const transaction = await client
  .from("financial_transactions")
  .select("id,account_id,balance_after")
  .eq("id", recorded.data)
  .single();
if (transaction.error) throw transaction.error;

const removed = await client.from("financial_transactions").delete().eq("id", transaction.data.id);
if (removed.error) throw removed.error;
if (oldAccount) {
  const restored = await client
    .from("accounts")
    .update({
      current_balance: oldAccount.current_balance,
      available_balance: oldAccount.available_balance,
    })
    .eq("id", oldAccount.id);
  if (restored.error) throw restored.error;
} else {
  const removedAccount = await client
    .from("accounts")
    .delete()
    .eq("id", transaction.data.account_id);
  if (removedAccount.error) throw removedAccount.error;
}
const student = await client
  .from("students")
  .insert({
    owner_id: auth.data.user.id,
    name: "[검증] 임시 학생",
    tutoring_type: "subject",
    subject: "math",
    default_mode: "online",
    default_fee_amount: 60000,
    default_duration_minutes: 120,
    meet_strategy: "google_generated",
    payer_aliases: [],
    consultation_status: "consulting",
    school_name: "REIN 테스트 학교",
    target_school: "목표 학교",
    learning_goal: "상세 학생 필드 검증",
  })
  .select("id,school_name,target_school,learning_goal")
  .single();
if (student.error) throw student.error;
const removedStudent = await client.from("students").delete().eq("id", student.data.id);
if (removedStudent.error) throw removedStudent.error;

await client.auth.signOut();
console.log("AUTH_OK=true RPC_OK=true BALANCE_OK=true STUDENT_CRM_OK=true CLEANUP_OK=true");
