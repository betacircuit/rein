"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSupabaseUser } from "@/lib/supabase/server";

export type RemoteMoneyActionState = { status: "idle" | "error"; message?: string };
const schema = z.object({
  studentId: z.string().uuid().nullable(),
  kind: z.enum(["income", "expense"]),
  amount: z.coerce.number().int().positive("금액은 1원 이상이어야 합니다.").max(10_000_000_000),
  categoryCode: z.string().trim().min(1, "분류를 선택해 주세요."),
  counterparty: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null),
  descriptor: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || null),
  memo: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});

export async function recordRemoteTransactionAction(
  _previous: RemoteMoneyActionState,
  formData: FormData,
): Promise<RemoteMoneyActionState> {
  const parsed = schema.safeParse({
    studentId: formData.get("studentId") || null,
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    categoryCode: formData.get("categoryCode"),
    counterparty: formData.get("counterparty") || "",
    descriptor: formData.get("descriptor") || "",
    memo: formData.get("memo") || "",
  });
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
    };
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const { error } = await auth.supabase.rpc("record_student_transaction", {
    p_account_id: null,
    p_kind: parsed.data.kind,
    p_amount: parsed.data.amount,
    p_occurred_at: new Date().toISOString(),
    p_category_code: parsed.data.categoryCode,
    p_counterparty: parsed.data.counterparty,
    p_descriptor: parsed.data.descriptor,
    p_memo: parsed.data.memo,
    p_student_id: parsed.data.kind === "income" ? parsed.data.studentId : null,
  });
  if (error)
    return { status: "error", message: "거래를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  redirect("/money?saved=1");
}

const correctionSchema = z.object({
  transactionId: z.string().uuid(),
  categoryCode: z.string().trim().min(1, "분류를 선택해 주세요."),
  counterparty: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null),
  descriptor: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || null),
  memo: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});

export async function correctRemoteTransactionAction(
  _previous: RemoteMoneyActionState,
  formData: FormData,
): Promise<RemoteMoneyActionState> {
  const parsed = correctionSchema.safeParse({
    transactionId: formData.get("transactionId"),
    categoryCode: formData.get("categoryCode"),
    counterparty: formData.get("counterparty") || "",
    descriptor: formData.get("descriptor") || "",
    memo: formData.get("memo") || "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
    };
  }
  const auth = await requireSupabaseUser();
  if (!auth) return { status: "error", message: "다시 로그인해 주세요." };
  const { error } = await auth.supabase.rpc("correct_financial_transaction", {
    p_transaction_id: parsed.data.transactionId,
    p_category_code: parsed.data.categoryCode,
    p_counterparty: parsed.data.counterparty,
    p_descriptor: parsed.data.descriptor,
    p_memo: parsed.data.memo,
  });
  if (error) {
    return {
      status: "error",
      message: "거래 수정 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  redirect(`/money/transactions/${parsed.data.transactionId}?saved=1`);
}

const transactionIdSchema = z.string().uuid();

export async function deleteRemoteTransactionAction(formData: FormData) {
  const transactionId = transactionIdSchema.safeParse(formData.get("transactionId"));
  if (!transactionId.success) return;
  const auth = await requireSupabaseUser();
  if (!auth) redirect(`/login?next=/money/transactions/${transactionId.data}`);
  const { error } = await auth.supabase.rpc("delete_manual_financial_transaction", {
    p_transaction_id: transactionId.data,
  });
  if (error) redirect(`/money/transactions/${transactionId.data}?deleteError=1`);
  redirect("/money/transactions?deleted=1");
}
