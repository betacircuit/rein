const sensitiveKey =
  /(name|student|note|memo|account|counterparty|descriptor|token|secret|api.?key|groq.?key|cookie|credential|authorization|fintech|email|address|location)/i;

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (depth > 5) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item, key, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitize(childValue, childKey, depth + 1),
      ]),
    );
  if (typeof value === "string")
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
      .replace(/\bgsk_[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_GROQ_KEY]")
      .replace(/\b\d{10,16}\b/g, "[REDACTED_NUMBER]");
  return value;
}

export function safeLogPayload(event: string, fields: Record<string, unknown>) {
  const sanitized = sanitize(fields) as Record<string, unknown>;
  return { event, ...sanitized };
}
