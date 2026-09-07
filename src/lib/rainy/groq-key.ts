import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const RAINY_GROQ_COOKIE = "rein_rainy_groq_key";
export const RAINY_GROQ_MARKER_COOKIE = "rein_rainy_groq_ready";

function encryptionKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required for the RAINY provider key.");
  }
  return createHash("sha256")
    .update(secret || "rein-local-groq-session-only")
    .digest();
}

export function sealGroqKey(apiKey: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = JSON.stringify({
    v: 1,
    userId,
    apiKey,
    expiresAt: Date.now() + 8 * 60 * 60 * 1_000,
  });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function openGroqKey(value: string | undefined, userId: string) {
  if (!value) return null;
  try {
    const [ivPart, tagPart, encryptedPart] = value.split(".");
    if (!ivPart || !tagPart || !encryptedPart) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(decoded) as {
      v?: unknown;
      userId?: unknown;
      apiKey?: unknown;
      expiresAt?: unknown;
    };
    if (
      payload.v !== 1 ||
      payload.userId !== userId ||
      typeof payload.apiKey !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    )
      return null;
    return payload.apiKey;
  } catch {
    return null;
  }
}

// A server-held key (single-owner deployments) skips the per-session connect step
// entirely; the cookie-sealed key still wins if a user has explicitly connected one.
export function resolveGroqApiKey(cookieValue: string | undefined, userId: string) {
  return openGroqKey(cookieValue, userId) ?? process.env.GROQ_API_KEY?.trim() ?? null;
}

export function sessionCookieOptions(path: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path,
    priority: "high" as const,
  };
}
