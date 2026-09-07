type RateLimitBucket = { count: number; resetAt: number };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  studentOsRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets = (globalRateLimit.studentOsRateLimitBuckets ??= new Map());

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`요청이 너무 많습니다. ${retryAfterSeconds}초 후 다시 시도해 주세요.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  if (!key || !Number.isSafeInteger(limit) || limit < 1 || windowMs < 1) {
    throw new Error("속도 제한 설정이 올바르지 않습니다.");
  }

  const current = buckets.get(key);
  const bucket =
    !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

export function enforceRateLimit(options: RateLimitOptions) {
  const result = checkRateLimit(options);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
  return result;
}

export function resetRateLimitsForTests() {
  if (process.env.NODE_ENV !== "test") throw new Error("테스트 환경에서만 초기화할 수 있습니다.");
  buckets.clear();
}
