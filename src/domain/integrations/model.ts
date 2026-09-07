import { createHash } from "node:crypto";

import type { Lesson } from "@/domain/tutoring/model";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const READ_ONLY_BANK_CAPABILITIES = [
  "account_discovery",
  "balance_inquiry",
  "transaction_history",
] as const;

export type ConnectionStatus = "disconnected" | "pending" | "connected" | "error" | "revoked";
export type SyncFreshness = "current" | "stale" | "error" | "disconnected";

export type IntegrationConnection = {
  id: string;
  ownerId: string;
  kind: "google_calendar" | "bank";
  provider: "mock" | "google" | "manual_csv" | "kftc_testbed" | "kftc_production";
  status: ConnectionStatus;
  scopes: string[];
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export function syncFreshness(
  connection: IntegrationConnection,
  now: string,
  staleAfterHours = 24,
): SyncFreshness {
  if (connection.status === "disconnected" || connection.status === "revoked")
    return "disconnected";
  if (connection.status === "error") return "error";
  if (!connection.lastSuccessAt) return "stale";
  return new Date(now).getTime() - new Date(connection.lastSuccessAt).getTime() >
    staleAfterHours * 3_600_000
    ? "stale"
    : "current";
}

export function redactIntegrationText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(
      /(access_token|refresh_token|client_secret|fintech_use_num)=([^&\s]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(/\b\d{10,16}\b/g, "[REDACTED_NUMBER]");
}

export class ExternalProviderError extends Error {
  constructor(
    message: string,
    readonly code: "timeout" | "rate_limited" | "provider_error",
    readonly retryable: boolean,
  ) {
    super(redactIntegrationText(message));
  }
}

export async function withBoundedRetry<T>(input: {
  operation: (attempt: number) => Promise<T>;
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  onRetry?: (event: IntegrationLogEvent) => void;
}) {
  const maxAttempts = input.maxAttempts ?? 3;
  const sleep =
    input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const random = input.random ?? Math.random;
  const baseDelayMs = input.baseDelayMs ?? 100;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await input.operation(attempt);
    } catch (error) {
      lastError = error;
      if (!(error instanceof ExternalProviderError) || !error.retryable || attempt === maxAttempts)
        throw error;
      const delayMs = baseDelayMs * 2 ** (attempt - 1) + Math.floor(random() * 25);
      input.onRetry?.(
        integrationLogEvent("external_retry", {
          attempt,
          delayMs,
          code: error.code,
          message: error.message,
        }),
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}

export type CalendarEventResult = {
  eventId: string;
  calendarId: string;
  htmlUrl: string;
  meetUrl: string | null;
  conferenceRequestId: string | null;
  appLessonId: string;
};

export interface CalendarProvider {
  createLessonEvent(lesson: Lesson): Promise<CalendarEventResult>;
  updateLessonEvent(lesson: Lesson, event: CalendarEventResult): Promise<CalendarEventResult>;
  cancelLessonEvent(event: CalendarEventResult): Promise<void>;
}

export type IntegrationLogEvent = {
  event: string;
  attempt?: number;
  delayMs?: number;
  code?: string;
  message?: string;
};

export function integrationLogEvent(event: string, fields: Omit<IntegrationLogEvent, "event">) {
  return {
    event,
    ...fields,
    ...(fields.message ? { message: redactIntegrationText(fields.message) } : {}),
  } satisfies IntegrationLogEvent;
}

function stableGoogleId(prefix: string, lessonId: string) {
  return `${prefix}${createHash("sha256").update(lessonId).digest("hex").slice(0, 30)}`;
}

export class MockCalendarProvider implements CalendarProvider {
  async createLessonEvent(lesson: Lesson): Promise<CalendarEventResult> {
    const generated = lesson.mode === "online" && lesson.meetStrategy === "google_generated";
    return {
      eventId: `mock-event-${lesson.id}`,
      calendarId: "mock-primary",
      htmlUrl: `https://calendar.mock.local/events/${lesson.id}`,
      meetUrl: generated ? `https://meet.mock.local/${lesson.id}` : lesson.meetUrl,
      conferenceRequestId: generated ? stableGoogleId("meet", lesson.id) : null,
      appLessonId: lesson.id,
    };
  }
  async updateLessonEvent(lesson: Lesson, event: CalendarEventResult) {
    if (event.appLessonId !== lesson.id) throw new Error("연결된 수업의 일정만 수정할 수 있어요.");
    return this.createLessonEvent(lesson);
  }
  async cancelLessonEvent(event: CalendarEventResult) {
    if (!event.eventId.startsWith("mock-event-") || event.appLessonId.length === 0)
      throw new Error("앱이 만든 일정만 취소할 수 있어요.");
  }
}

type FetchLike = typeof fetch;

export class GoogleCalendarProvider implements CalendarProvider {
  constructor(
    private readonly config: { accessToken: string; calendarId: string; fetcher?: FetchLike },
  ) {}

  async createLessonEvent(lesson: Lesson): Promise<CalendarEventResult> {
    const eventId = stableGoogleId("studentos", lesson.id);
    const conferenceRequestId =
      lesson.mode === "online" && lesson.meetStrategy === "google_generated"
        ? stableGoogleId("meet", lesson.id)
        : null;
    const body = {
      id: eventId,
      summary: "과외 수업",
      start: { dateTime: lesson.startsAt, timeZone: lesson.timezone },
      end: { dateTime: lesson.endsAt, timeZone: lesson.timezone },
      extendedProperties: { private: { studentOsLessonId: lesson.id } },
      ...(conferenceRequestId
        ? { conferenceData: { createRequest: { requestId: conferenceRequestId } } }
        : {}),
    };
    const fetcher = this.config.fetcher ?? fetch;
    const response = await fetcher(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.config.calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    let resultResponse = response;
    if (response.status === 409) {
      resultResponse = await fetcher(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(eventId)}`,
        { headers: { authorization: `Bearer ${this.config.accessToken}` } },
      );
    }
    if (!resultResponse.ok)
      throw new ExternalProviderError(
        `Google Calendar provider_error ${resultResponse.status}`,
        resultResponse.status === 429 ? "rate_limited" : "provider_error",
        resultResponse.status === 429 || resultResponse.status >= 500,
      );
    const result = (await resultResponse.json()) as {
      id: string;
      htmlLink: string;
      hangoutLink?: string;
    };
    return {
      eventId: result.id,
      calendarId: this.config.calendarId,
      htmlUrl: result.htmlLink,
      meetUrl: result.hangoutLink ?? null,
      conferenceRequestId,
      appLessonId: lesson.id,
    };
  }

  async updateLessonEvent(lesson: Lesson, event: CalendarEventResult) {
    if (event.appLessonId !== lesson.id || event.calendarId !== this.config.calendarId)
      throw new Error("연결된 수업의 일정만 수정할 수 있어요.");
    const fetcher = this.config.fetcher ?? fetch;
    const response = await fetcher(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendarId)}/events/${encodeURIComponent(event.eventId)}?conferenceDataVersion=1`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          summary: "과외 수업",
          start: { dateTime: lesson.startsAt, timeZone: lesson.timezone },
          end: { dateTime: lesson.endsAt, timeZone: lesson.timezone },
          extendedProperties: { private: { studentOsLessonId: lesson.id } },
        }),
      },
    );
    if (!response.ok)
      throw new ExternalProviderError(
        `Google Calendar provider_error ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_error",
        response.status === 429 || response.status >= 500,
      );
    const result = (await response.json()) as {
      id: string;
      htmlLink: string;
      hangoutLink?: string;
    };
    return {
      ...event,
      eventId: result.id,
      htmlUrl: result.htmlLink,
      meetUrl: result.hangoutLink ?? event.meetUrl,
    };
  }

  async cancelLessonEvent(event: CalendarEventResult) {
    if (event.appLessonId.length === 0 || event.calendarId !== this.config.calendarId)
      throw new Error("앱이 만들거나 명시적으로 연결한 일정만 취소할 수 있어요.");
    const fetcher = this.config.fetcher ?? fetch;
    const response = await fetcher(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendarId)}/events/${encodeURIComponent(event.eventId)}`,
      { method: "DELETE", headers: { authorization: `Bearer ${this.config.accessToken}` } },
    );
    if (!response.ok && response.status !== 410)
      throw new ExternalProviderError(
        `Google Calendar provider_error ${response.status}`,
        "provider_error",
        response.status === 429 || response.status >= 500,
      );
  }
}

export type BankTransaction = {
  externalId: string;
  occurredAt: string;
  direction: "inflow" | "outflow";
  amount: bigint;
  description: string;
  balanceAfter: bigint | null;
};

export type BankTransactionPage = { rows: BankTransaction[]; nextCursor: string | null };

export interface ReadOnlyBankProvider {
  readonly capabilities: typeof READ_ONLY_BANK_CAPABILITIES;
  listAccounts(): Promise<Array<{ reference: string; nickname: string }>>;
  getBalance(
    accountReference: string,
  ): Promise<{ balance: bigint; available: bigint | null; asOf: string }>;
  listTransactions(accountReference: string, cursor: string | null): Promise<BankTransactionPage>;
  revoke(): Promise<void>;
}

export class MockBankProvider implements ReadOnlyBankProvider {
  readonly capabilities = READ_ONLY_BANK_CAPABILITIES;
  private revoked = false;

  async listAccounts() {
    this.assertConnected();
    return [{ reference: "mock-account-reference", nickname: "생활비 계좌" }];
  }
  async getBalance(accountReference: string) {
    void accountReference;
    this.assertConnected();
    return { balance: 4_821_430n, available: 4_821_430n, asOf: "2026-09-03T09:00:00+09:00" };
  }
  async listTransactions(accountReference: string, cursor: string | null) {
    void accountReference;
    void cursor;
    this.assertConnected();
    return { rows: [], nextCursor: null };
  }
  async revoke() {
    this.revoked = true;
  }
  private assertConnected() {
    if (this.revoked)
      throw new ExternalProviderError("mock connection revoked", "provider_error", false);
  }
}

type KftcTransactionRow = {
  tran_date: string;
  tran_time: string;
  inout_type: "입금" | "출금";
  tran_amt: string;
  after_balance_amt?: string;
  print_content?: string;
  tran_id?: string;
};

export class KftcTestbedProvider implements ReadOnlyBankProvider {
  readonly capabilities = READ_ONLY_BANK_CAPABILITIES;
  constructor(
    private readonly config: {
      accessToken: string;
      fintechUseNum: string;
      fetcher?: FetchLike;
      baseUrl?: string;
    },
  ) {}

  async listAccounts() {
    return [{ reference: "server-side-fintech-reference", nickname: "KFTC 테스트 계좌" }];
  }
  async getBalance(accountReference: string) {
    void accountReference;
    const payload = await this.request("/v2.0/account/balance/fin_num", null);
    return {
      balance: BigInt(String(payload.balance_amt)),
      available: payload.available_amt == null ? null : BigInt(String(payload.available_amt)),
      asOf: String(payload.as_of ?? new Date().toISOString()),
    };
  }
  async listTransactions(
    accountReference: string,
    cursor: string | null,
  ): Promise<BankTransactionPage> {
    void accountReference;
    const payload = await this.request("/v2.0/account/transaction_list/fin_num", cursor);
    const rows = (payload.res_list ?? []) as KftcTransactionRow[];
    return {
      rows: rows.map((row) => ({
        externalId:
          row.tran_id ??
          createHash("sha256")
            .update(
              `${row.tran_date}|${row.tran_time}|${row.inout_type}|${row.tran_amt}|${row.print_content ?? ""}`,
            )
            .digest("hex"),
        occurredAt: `${row.tran_date.slice(0, 4)}-${row.tran_date.slice(4, 6)}-${row.tran_date.slice(6, 8)}T${row.tran_time.slice(0, 2)}:${row.tran_time.slice(2, 4)}:${row.tran_time.slice(4, 6)}+09:00`,
        direction: row.inout_type === "입금" ? ("inflow" as const) : ("outflow" as const),
        amount: BigInt(row.tran_amt),
        description: row.print_content ?? "",
        balanceAfter: row.after_balance_amt == null ? null : BigInt(row.after_balance_amt),
      })),
      nextCursor: payload.next_page_yn === "Y" ? String(payload.be_tran_seq ?? "") || null : null,
    };
  }
  async revoke() {
    // Provider revocation is performed by the server-side OAuth/KFTC credential service.
  }
  private async request(path: string, cursor: string | null) {
    const fetcher = this.config.fetcher ?? fetch;
    const url = new URL(path, this.config.baseUrl ?? "https://openapi.openbanking.or.kr");
    url.searchParams.set("fintech_use_num", this.config.fintechUseNum);
    if (cursor) url.searchParams.set("be_tran_seq", cursor);
    const response = await fetcher(url, {
      headers: { authorization: `Bearer ${this.config.accessToken}` },
    });
    if (!response.ok)
      throw new ExternalProviderError(
        `KFTC provider_error ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_error",
        response.status === 429 || response.status >= 500,
      );
    return (await response.json()) as Record<string, unknown> & {
      res_list?: KftcTransactionRow[];
    };
  }
}

export class KftcProductionProvider implements ReadOnlyBankProvider {
  readonly capabilities = READ_ONLY_BANK_CAPABILITIES;
  constructor() {
    assertKftcProductionDisabled({ provider: "kftc_production", productionEnabled: false });
  }
  async listAccounts(): Promise<Array<{ reference: string; nickname: string }>> {
    return [];
  }
  async getBalance(): Promise<{ balance: bigint; available: bigint | null; asOf: string }> {
    throw new Error("KFTC 운영 연결은 비활성입니다.");
  }
  async listTransactions(): Promise<BankTransactionPage> {
    throw new Error("KFTC 운영 연결은 비활성입니다.");
  }
  async revoke() {}
}

export async function collectTransactionHistory(
  provider: ReadOnlyBankProvider,
  accountReference: string,
  maxPages = 20,
) {
  const unique = new Map<string, BankTransaction>();
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  for (let page = 0; page < maxPages; page += 1) {
    const result = await provider.listTransactions(accountReference, cursor);
    for (const row of result.rows) if (!unique.has(row.externalId)) unique.set(row.externalId, row);
    if (!result.nextCursor) return { rows: [...unique.values()], nextCursor: null };
    if (seenCursors.has(result.nextCursor))
      throw new Error("은행 페이지 커서가 반복되어 동기화를 중단했어요.");
    seenCursors.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  return { rows: [...unique.values()], nextCursor: cursor };
}

export function assertKftcProductionDisabled(config: {
  provider: string;
  productionEnabled: boolean;
  institutionApproved?: boolean;
  contractApproved?: boolean;
  securityApproved?: boolean;
}) {
  if (
    config.provider === "kftc_production" ||
    config.productionEnabled ||
    config.institutionApproved ||
    config.contractApproved ||
    config.securityApproved
  )
    throw new Error(
      "KFTC 운영 연결은 기관·계약·보안 승인 후 별도 릴리스에서만 활성화할 수 있어요.",
    );
}
