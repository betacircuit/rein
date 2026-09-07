import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TransactionCorrectionForm } from "@/app/money/transaction-correction-form";
import { readRemoteTransaction } from "@/lib/money/remote-repository";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const data = await readRemoteTransaction(transactionId);
  if (!data) redirect(`/login?next=/money/transactions/${transactionId}/edit`);
  if (!data.transaction) notFound();
  if (data.transaction.kind === "transfer") redirect(`/money/transactions/${transactionId}`);

  return (
    <div className="mx-auto max-w-4xl">
      <Link className="rein-back-link" href={`/money/transactions/${transactionId}`}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        거래로 돌아가기
      </Link>
      <header className="my-5">
        <h1 className="text-4xl font-black tracking-[-0.055em]">거래 수정</h1>
        <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
          원본 계좌·금액·거래 시각은 유지하고 분류와 표시 정보만 바로잡습니다.
        </p>
      </header>
      <TransactionCorrectionForm categories={data.categories} transaction={data.transaction} />
    </div>
  );
}
