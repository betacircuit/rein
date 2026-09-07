import { describe, expect, it } from "vitest";

import {
  acceptHouseholdInvitation,
  canReadHouseholdResource,
  canReadPrivateResource,
  createOwnerMembership,
  inviteHouseholdMember,
  leaveHousehold,
} from "@/domain/household/membership";

const householdId = "household-1";
const now = "2026-09-02T04:00:00.000Z";
const owner = createOwnerMembership({
  membershipId: "member-owner",
  householdId,
  userId: "user-a",
  displayName: "최재원",
  now,
});

describe("CTX-003 HOM-002 household membership transitions", () => {
  it("creates an active owner and an invited roommate without limiting future members", () => {
    const invitation = inviteHouseholdMember({
      membershipId: "member-roommate",
      householdId,
      inviteeEmail: " ROOMMATE@example.com ",
      displayName: "룸메이트",
      actorMembership: owner,
    });

    expect(owner).toMatchObject({ role: "owner", status: "active", userId: "user-a" });
    expect(invitation).toMatchObject({
      role: "member",
      status: "invited",
      userId: null,
      inviteeEmail: "roommate@example.com",
    });
  });

  it("only lets the matching invitee activate membership", () => {
    const invitation = inviteHouseholdMember({
      membershipId: "member-roommate",
      householdId,
      inviteeEmail: "roommate@example.com",
      displayName: "룸메이트",
      actorMembership: owner,
    });

    expect(() =>
      acceptHouseholdInvitation(invitation, { userId: "user-c", email: "other@example.com" }, now),
    ).toThrow(/현재 계정/);

    expect(
      acceptHouseholdInvitation(
        invitation,
        { userId: "user-b", email: "ROOMMATE@example.com" },
        now,
      ),
    ).toMatchObject({ status: "active", userId: "user-b", inviteeEmail: null, joinedAt: now });
  });

  it("keeps left membership terminal in the domain flow", () => {
    const active = acceptHouseholdInvitation(
      inviteHouseholdMember({
        membershipId: "member-roommate",
        householdId,
        inviteeEmail: "roommate@example.com",
        displayName: "룸메이트",
        actorMembership: owner,
      }),
      { userId: "user-b", email: "roommate@example.com" },
      now,
    );

    expect(leaveHousehold(active, "user-b", "2026-09-03T00:00:00.000Z")).toMatchObject({
      status: "left",
      leftAt: "2026-09-03T00:00:00.000Z",
    });
    expect(() => leaveHousehold(owner, "user-a", now)).toThrow(/소유권/);
  });
});

describe("HOM-001 SEC-001 SEC-002 authorization boundary", () => {
  const activeRoommate = {
    ...owner,
    id: "member-roommate",
    userId: "user-b",
    role: "member" as const,
  };

  it("denies unauthenticated and cross-user private reads", () => {
    expect(canReadPrivateResource(null, "user-a")).toBe(false);
    expect(canReadPrivateResource("user-b", "user-a")).toBe(false);
    expect(canReadPrivateResource("user-a", "user-a")).toBe(true);
  });

  it("allows shared reads only for active members", () => {
    expect(canReadHouseholdResource("user-b", householdId, [owner, activeRoommate])).toBe(true);
    expect(canReadHouseholdResource("user-c", householdId, [owner, activeRoommate])).toBe(false);
    expect(
      canReadHouseholdResource("user-b", householdId, [
        { ...activeRoommate, status: "left", leftAt: now },
      ]),
    ).toBe(false);
  });
});
