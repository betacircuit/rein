"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteCurrentLocalAccount } from "@/lib/data-operations/local-account";
import { assertSafeRuntime, readRuntimeSafetyConfig } from "@/lib/runtime-safety";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const confirmationSchema = z.object({
  confirmation: z.literal("내 로컬 데이터 삭제"),
});

export async function deleteLocalAccountAction(formData: FormData) {
  assertSafeRuntime(readRuntimeSafetyConfig(process.env));
  confirmationSchema.parse({ confirmation: formData.get("confirmation") });
  if (!(await deleteCurrentLocalAccount())) redirect("/login");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
