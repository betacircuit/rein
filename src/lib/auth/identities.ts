export const APP_IDENTITIES = [
  {
    loginId: "최재원",
    displayName: "최재원",
    email: "choi.jaewon@rein.local",
    role: "owner" as const,
  },
  {
    loginId: "김태현",
    displayName: "김태현",
    email: "kim.taehyeon@rein.local",
    role: "roommate" as const,
  },
] as const;

export type AppIdentity = (typeof APP_IDENTITIES)[number];

export function findAppIdentity(loginId: string) {
  const normalized = loginId.replace(/\s+/g, "").trim();
  return APP_IDENTITIES.find((identity) => identity.loginId === normalized) ?? null;
}

export function findIdentityByEmail(email: string | undefined) {
  return APP_IDENTITIES.find((identity) => identity.email === email?.toLowerCase()) ?? null;
}
