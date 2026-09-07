import {
  calculateAssetSummary,
  calculateAvailableSurplus,
  calculatePlannedContribution,
  unpaidPlanningObligations,
} from "@/domain/grow/model";
import { calculateHouseholdMoneyProjection } from "@/domain/household/shared-money";
import { toKrw } from "@/domain/money/krw";
import { readDemoGrowState } from "@/lib/grow/demo-store";
import { readDemoSharedMoneyState } from "@/lib/household/shared-money-store";
import { readDemoMoneyState } from "@/lib/money/demo-store";
import { readDemoSubscriptionState } from "@/lib/subscriptions/demo-store";

export async function readGrowSnapshot(month = "2026-09") {
  const grow = await readDemoGrowState();
  if (!grow) return null;
  const [money, household, subscriptions] = await Promise.all([
    readDemoMoneyState(),
    readDemoSharedMoneyState(),
    readDemoSubscriptionState(),
  ]);
  if (!money || !household || !subscriptions) return null;
  const householdProjection = calculateHouseholdMoneyProjection({
    state: household,
    transactions: money.transactions,
    month,
  });
  const currentSubscriptionMember =
    subscriptions.members.find((item) => item.isCurrentUser)?.id ?? "";
  const unpaidSubscriptions = unpaidPlanningObligations(
    subscriptions,
    `${month}-01`,
    `${month}-30`,
    currentSubscriptionMember,
  );
  const reserve =
    money.accounts.find((item) => item.id === grow.plan.reserveAccountId)?.currentBalance ??
    toKrw(0);
  const surplus = calculateAvailableSurplus({
    settledCashInflows: householdProjection.settledIncomeExcludingReimbursements,
    confirmedReimbursements: householdProjection.confirmedReimbursements,
    actualCashOutflows: householdProjection.actualCashOutflow,
    personalExpenses: householdProjection.personalExpense,
    householdResponsibility: householdProjection.householdResponsibility,
    unpaidSubscriptionObligations: unpaidSubscriptions,
    safetyReserveTarget: grow.plan.safetyReserveTarget,
    currentSafetyReserve: reserve,
  });
  const plannedAmount = calculatePlannedContribution(
    surplus.actualAvailableSurplus,
    grow.plan.rule,
  );
  const contribution = grow.contributions.find((item) => item.month === month) ?? null;
  return {
    grow,
    money,
    household,
    subscriptions,
    month,
    householdProjection,
    surplus,
    plannedAmount,
    contribution,
    assets: calculateAssetSummary(money.accounts),
  };
}
