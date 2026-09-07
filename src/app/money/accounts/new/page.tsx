import { MoneyNav } from "@/app/money/money-ui";
import { AccountForm } from "@/app/money/account-form";

export const metadata = { title: "계좌 추가 | 돈" };
export default function NewAccountPage() {
  return (
    <div>
      <MoneyNav current="계좌" />
      <header>
        <p className="text-sm font-extrabold text-[var(--accent-dark)]">계좌 등록</p>
        <h1 className="mt-2 text-3xl font-black">계좌 추가</h1>
        <p className="mt-2 text-sm text-[var(--muted-ink)]">
          현재 단계에서는 로컬 데모 저장소에만 저장됩니다.
        </p>
      </header>
      <div className="mt-6">
        <AccountForm />
      </div>
    </div>
  );
}
