import { createHash } from "node:crypto";

import { deleteDemoSession, readDemoOnboardingState, readDemoSession } from "@/lib/auth/session";
import { purgeDemoGrowState, readDemoGrowState } from "@/lib/grow/demo-store";
import { purgeDemoHouseholdState, readDemoHouseholdState } from "@/lib/household/demo-store";
import {
  purgeDemoSharedMoneyState,
  readDemoSharedMoneyState,
} from "@/lib/household/shared-money-store";
import {
  purgeDemoIntegrationConnections,
  readDemoIntegrationConnections,
} from "@/lib/integrations/demo-store";
import { purgeDemoMoneyState, readDemoMoneyState } from "@/lib/money/demo-store";
import {
  purgeDemoSubscriptionState,
  readDemoSubscriptionState,
} from "@/lib/subscriptions/demo-store";
import { purgeDemoTutoringState, readDemoTutoringState } from "@/lib/tutoring/demo-store";

export async function buildLocalDataExport() {
  const session = await readDemoSession();
  if (!session) return null;
  const [profile, tutoring, money, subscriptions, household, sharedMoney, grow, integrations] =
    await Promise.all([
      readDemoOnboardingState(),
      readDemoTutoringState(),
      readDemoMoneyState(),
      readDemoSubscriptionState(),
      readDemoHouseholdState(),
      readDemoSharedMoneyState(),
      readDemoGrowState(),
      readDemoIntegrationConnections(),
    ]);
  return {
    schema: "rein.local-export.v1",
    exportedAt: new Date().toISOString(),
    ownerReference: createHash("sha256").update(session.userId).digest("hex").slice(0, 16),
    retention: {
      mode: "local_demo",
      note: "내보내기는 현재 세션 소유 데이터와 이 세션에 투영된 공동 기록을 포함합니다.",
    },
    data: { profile, tutoring, money, subscriptions, household, sharedMoney, grow, integrations },
  };
}

export function stringifyLocalDataExport(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

export async function deleteCurrentLocalAccount() {
  const session = await readDemoSession();
  if (!session) return false;
  purgeDemoTutoringState(session.userId);
  purgeDemoMoneyState(session.userId);
  purgeDemoSubscriptionState(session.userId);
  purgeDemoHouseholdState(session.userId);
  purgeDemoSharedMoneyState(session.userId);
  purgeDemoGrowState(session.userId);
  purgeDemoIntegrationConnections(session.userId);
  await deleteDemoSession();
  return true;
}
