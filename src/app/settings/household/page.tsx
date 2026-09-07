import { Crown, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { requireSupabaseUser } from "@/lib/supabase/server";
import { HouseholdSettingsForm } from "./household-settings-form";

export const metadata = { title: "집 다시 설정" };

export default async function HouseholdSettingsPage() {
  const auth = await requireSupabaseUser();
  if (!auth) redirect("/login");
  const { data: memberships } = await auth.supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .limit(2);
  const membership = memberships?.length === 1 ? memberships[0] : null;
  const [{ data: household }, { data: members }] = membership
    ? await Promise.all([
        auth.supabase.from("households").select("name").eq("id", membership.household_id).single(),
        auth.supabase
          .from("household_members")
          .select("id, display_name, role, status")
          .eq("household_id", membership.household_id)
          .in("status", ["active", "invited"])
          .order("role"),
      ])
    : [{ data: null }, { data: [] }];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b-4 border-black bg-[var(--cyan)] p-5">
        <h1 className="text-4xl font-black tracking-[-0.065em]">집 다시 설정</h1>
      </header>
      <section className="rein-household-link-panel" aria-labelledby="household-link-title">
        <div>
          <p className="rein-meta">2 USERS / LINKED HOME</p>
          <h2 id="household-link-title">최재원 × 김태현</h2>
        </div>
        <div className="rein-household-members">
          {(members ?? []).map((member) => (
            <article key={member.id}>
              {member.role === "owner" ? (
                <Crown aria-hidden="true" />
              ) : (
                <UserRound aria-hidden="true" />
              )}
              <strong>{member.display_name}</strong>
              <span>{member.status === "active" ? "연결됨" : "초대 대기"}</span>
            </article>
          ))}
        </div>
        <HouseholdSettingsForm
          canEdit={membership?.role === "owner"}
          name={household?.name ?? "재원·태현 자취방"}
        />
      </section>
    </div>
  );
}
