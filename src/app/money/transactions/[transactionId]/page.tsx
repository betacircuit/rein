import { ArrowLeft, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { readRemoteTransaction } from "@/lib/money/remote-repository";

import { deleteRemoteTransactionAction } from "../../remote-actions";

const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "long",
  timeStyle: "short",
});
const sourceLabels = {
  manual: "직접 입력",
  manual_csv: "CSV 가져오기",
  mock_sync: "모의 은행 동기화",
  bank_sync: "은행 동기화",
  system: "시스템",
} as const;

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ saved?: string; deleteError?: string }>;
}) {
  const { transactionId } = await params;
  const [data, query] = await Promise.all([readRemoteTransaction(transactionId), searchParams]);
  if (!data) redirect(`/login?next=/money/transactions/${transactionId}`);
  if (!data.transaction) notFound();
  const transaction = data.transaction;
  const editable = transaction.kind !== "transfer";

  return (
    <div className="mx-auto max-w-4xl">
      <Link className="rein-back-link" href="/money/transactions">
        <ArrowLeft aria-hidden="true" className="size-4" />
        전체 거래
      </Link>
      {query.saved && (
        <p
          className="mt-5 border-2 border-black bg-[var(--success-wash)] p-3 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="status"
        >
          거래 수정 내용을 저장했습니다.
        </p>
      )}
      {query.deleteError && (
        <p
          className="mt-5 border-2 border-black bg-[var(--danger-wash)] p-3 text-sm font-black shadow-[4px_4px_0_#343146]"
          role="alert"
        >
          연결된 정산이나 수입 내역이 있어 삭제할 수 없습니다.
        </p>
      )}
      <header className="rein-section-head mt-5">
        <div>
          <p className="rein-meta">
            {transaction.accountName} / {sourceLabels[transaction.source]}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">
            {transaction.counterparty || transaction.descriptor || transaction.categoryName}
          </h1>
          <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
            {date.format(new Date(transaction.occurredAt))}
          </p>
        </div>
        {editable && (
          <Button asChild variant="outline">
            <Link href={`/money/transactions/${transaction.id}/edit`}>
              <Edit3 aria-hidden="true" className="size-4" />
              수정
            </Link>
          </Button>
        )}
      </header>
      <section className="mt-5 border-2 border-black bg-[var(--surface)] p-5 shadow-[7px_7px_0_#343146] sm:p-6">
        <p
          className={`text-4xl font-black tabular-nums ${transaction.direction === "inflow" ? "text-[var(--success-ink)]" : ""}`}
        >
          {transaction.direction === "inflow" ? "+" : "−"}
          {won.format(transaction.amount)}
        </p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["분류", transaction.categoryName],
            ["계좌", transaction.accountName],
            ["거래 상대", transaction.counterparty || "없음"],
            ["표시 내용", transaction.descriptor || "없음"],
            ["원본", sourceLabels[transaction.source]],
            ["메모", transaction.memo || "없음"],
          ].map(([label, value]) => (
            <div className="border-t-2 border-black pt-3" key={label}>
              <dt className="rein-meta text-[var(--muted-ink)]">{label}</dt>
              <dd className="mt-1 font-black whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        </dl>
        {transaction.source !== "manual" && transaction.kind !== "transfer" && (
          <p className="mt-5 border-2 border-black bg-[var(--surface-muted)] p-3 text-sm font-bold">
            가져온 계좌·금액·발생 시각은 보존되며 분류와 표시 정보만 수정할 수 있습니다.
          </p>
        )}
        {transaction.source === "manual" && transaction.kind !== "transfer" && (
          <ConfirmActionForm
            action={deleteRemoteTransactionAction}
            className="mt-6 border-t-2 border-black pt-5"
            confirmMessage="이 직접 입력 거래를 삭제할까요? 계좌 잔액도 함께 되돌아갑니다."
          >
            <input name="transactionId" type="hidden" value={transaction.id} />
            <Button type="submit" variant="destructive">
              <Trash2 aria-hidden="true" className="size-4" />
              거래 삭제
            </Button>
          </ConfirmActionForm>
        )}
      </section>
    </div>
  );
}
