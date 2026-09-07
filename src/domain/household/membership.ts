export const householdRoles = ["owner", "member"] as const;
export const membershipStatuses = ["invited", "active", "left"] as const;

export type HouseholdRole = (typeof householdRoles)[number];
export type MembershipStatus = (typeof membershipStatuses)[number];

export type HouseholdMembership = {
  id: string;
  householdId: string;
  userId: string | null;
  inviteeEmail: string | null;
  displayName: string;
  role: HouseholdRole;
  status: MembershipStatus;
  joinedAt: string | null;
  leftAt: string | null;
};

export type HouseholdActor = {
  userId: string;
  email: string;
};

function normalizedEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function createOwnerMembership(input: {
  membershipId: string;
  householdId: string;
  userId: string;
  displayName: string;
  now: string;
}): HouseholdMembership {
  return {
    id: input.membershipId,
    householdId: input.householdId,
    userId: input.userId,
    inviteeEmail: null,
    displayName: input.displayName.trim(),
    role: "owner",
    status: "active",
    joinedAt: input.now,
    leftAt: null,
  };
}

export function inviteHouseholdMember(input: {
  membershipId: string;
  householdId: string;
  inviteeEmail: string;
  displayName: string;
  actorMembership: HouseholdMembership;
}): HouseholdMembership {
  if (
    input.actorMembership.householdId !== input.householdId ||
    input.actorMembership.role !== "owner" ||
    input.actorMembership.status !== "active"
  ) {
    throw new Error("활성 소유자만 우리집 멤버를 초대할 수 있어요.");
  }

  const inviteeEmail = normalizedEmail(input.inviteeEmail);
  if (!inviteeEmail.includes("@")) throw new Error("초대 이메일을 확인해 주세요.");

  return {
    id: input.membershipId,
    householdId: input.householdId,
    userId: null,
    inviteeEmail,
    displayName: input.displayName.trim(),
    role: "member",
    status: "invited",
    joinedAt: null,
    leftAt: null,
  };
}

export function acceptHouseholdInvitation(
  membership: HouseholdMembership,
  actor: HouseholdActor,
  now: string,
): HouseholdMembership {
  if (membership.status !== "invited" || !membership.inviteeEmail) {
    throw new Error("수락할 수 있는 초대가 아니에요.");
  }
  if (normalizedEmail(membership.inviteeEmail) !== normalizedEmail(actor.email)) {
    throw new Error("현재 계정으로 받은 초대가 아니에요.");
  }

  return {
    ...membership,
    userId: actor.userId,
    inviteeEmail: null,
    status: "active",
    joinedAt: now,
  };
}

export function leaveHousehold(
  membership: HouseholdMembership,
  actorUserId: string,
  now: string,
): HouseholdMembership {
  if (membership.userId !== actorUserId || membership.status !== "active") {
    throw new Error("활성 멤버 본인만 우리집에서 나갈 수 있어요.");
  }
  if (membership.role === "owner") {
    throw new Error("소유권을 넘기기 전에는 우리집을 나갈 수 없어요.");
  }

  return { ...membership, status: "left", leftAt: now };
}

export function canReadPrivateResource(actorUserId: string | null, ownerUserId: string) {
  return actorUserId !== null && actorUserId === ownerUserId;
}

export function canReadHouseholdResource(
  actorUserId: string | null,
  householdId: string,
  memberships: readonly HouseholdMembership[],
) {
  if (!actorUserId) return false;
  return memberships.some(
    (membership) =>
      membership.householdId === householdId &&
      membership.userId === actorUserId &&
      membership.status === "active",
  );
}
