import {
  ArrowRight,
  Crown,
  ReceiptText,
  Refrigerator,
  ShoppingBasket,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HouseholdNav } from "@/app/household/household-ui";
import { MasterRules, type MasterRule } from "@/app/household/master-rules";
import { calculateHouseholdOverview } from "@/domain/household/operations";
import { formatKrw } from "@/domain/money/krw";
import { readDemoHouseholdState, readHouseholdCostRows } from "@/lib/household/demo-store";
import { requireSupabaseUser } from "@/lib/supabase/server";

export const metadata = { title: "자취방" };

const householdTools = [
  {
    href: "/household/inventory",
    title: "냉장고 재고",
    description: "냉장·냉동·실온 수량, 소비기한, 부족 기준",
    icon: Refrigerator,
  },
  {
    href: "/household/shopping",
    title: "장보기",
    description: "부족 재고 연결, 구매 완료와 거래 기록 연결",
    icon: ShoppingBasket,
  },
  {
    href: "/household/cleaning",
    title: "청소 루틴",
    description: "담당자, 반복 주기, 완료 기록과 다음 예정일",
    icon: Sparkles,
  },
  {
    href: "/household/expenses",
    title: "공동비·정산",
    description: "공동 지출 분담과 정산 상태 추적",
    icon: ReceiptText,
  },
] as const;

export default async function HouseholdPage() {
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login");
  const operations = await readDemoHouseholdState();
  const costRows = operations ? await readHouseholdCostRows(operations) : [];
  const overview = operations ? calculateHouseholdOverview(operations, costRows) : null;
  const settlementLabel = overview && overview.settlementCredit >= 0n ? "받을 정산" : "보낼 정산";
  const settlementAmount = overview
    ? overview.settlementCredit < 0n
      ? -overview.settlementCredit
      : overview.settlementCredit
    : 0n;

  const { data: myMembership } = await auth.supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .maybeSingle();
  const [{ data: members }, { data: household }, { data: ruleRows }] = myMembership
    ? await Promise.all([
        auth.supabase
          .from("household_members")
          .select("id, display_name, role, status")
          .eq("household_id", myMembership.household_id)
          .order("role"),
        auth.supabase
          .from("households")
          .select("name")
          .eq("id", myMembership.household_id)
          .single(),
        auth.supabase
          .from("household_master_rules")
          .select("id, title, detail")
          .eq("household_id", myMembership.household_id)
          .order("sort_order")
          .order("created_at"),
      ])
    : [{ data: [] }, { data: null }, { data: [] }];
  const masterRules = (ruleRows ?? []) as MasterRule[];

  return (
    <div className="mx-auto max-w-6xl">
      <HouseholdNav current="상태판" />
      <header className="border-b-4 border-black bg-[var(--cyan)] p-4 sm:p-5">
        <h1 className="mt-1 text-4xl font-black tracking-[-0.065em]">자취방</h1>
        <p className="mt-1 font-bold">{household?.name ?? "재원·태현 자취방"}</p>
      </header>
      {overview && operations && (
        <section className="rein-household-overview" aria-labelledby="household-overview-title">
          <header>
            <p className="rein-meta">HOUSEHOLD STATUS</p>
            <h2 id="household-overview-title">둘이 사는 집은, 상태만 같이 봐도 가벼워져요</h2>
          </header>
          <div className="rein-household-overview__stats">
            <article>
              <span>이번 달 공동비</span>
              <strong>{formatKrw(overview.sharedMonthlyCost)}</strong>
            </article>
            <article>
              <span>내 분담액</span>
              <strong>{formatKrw(overview.userShare)}</strong>
            </article>
            <article>
              <span>현재 정산</span>
              <strong>
                {settlementLabel} {formatKrw(settlementAmount)}
              </strong>
            </article>
            <Link href={`/household/inventory?stock=low`}>
              부족 재고 {overview.lowStockCount}개
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="rein-household-overview__sources" id="shared-costs">
            <div>
              <h3>합계의 원천 행</h3>
              <output>
                {settlementLabel} {formatKrw(settlementAmount)}
              </output>
            </div>
            <ul>
              {costRows.map((row) => (
                <li key={row.id}>
                  <a href={row.sourceHref}>{row.label}</a>
                  <strong>{formatKrw(row.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="집 멤버">
        {(members ?? []).map((member) => (
          <article
            className="border-2 border-black bg-[var(--surface)] p-5 shadow-[5px_5px_0_#101010]"
            key={member.id}
          >
            <span className="grid size-11 place-items-center border-2 border-black bg-[var(--orange)] text-black">
              {member.role === "owner" ? (
                <Crown aria-hidden="true" className="size-5" />
              ) : (
                <UserRound aria-hidden="true" className="size-5" />
              )}
            </span>
            <h2 className="mt-4 text-lg font-black">{member.display_name}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--muted-ink)]">
              {member.role === "owner"
                ? "관리자"
                : member.status === "active"
                  ? "룸메이트"
                  : "초대 대기"}
            </p>
          </article>
        ))}
      </section>
      {!members?.length && (
        <p className="mt-5 border-2 border-black bg-[var(--surface)] p-5 font-bold shadow-[5px_5px_0_#101010]">
          첫 로그인 후 두 사람의 집이 자동으로 연결됩니다.
        </p>
      )}
      <section className="rein-household-capabilities" aria-labelledby="household-tools-title">
        <header>
          <p className="rein-meta">HOUSE OPS / ACTIVE</p>
          <h2 id="household-tools-title">지금 가능한 것</h2>
        </header>
        <div>
          {householdTools.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon aria-hidden="true" />
                <strong>{item.title}</strong>
                <small>{item.description}</small>
                <ArrowRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
      <MasterRules rules={masterRules} />
    </div>
  );
}
