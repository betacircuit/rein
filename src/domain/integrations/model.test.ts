import { describe, expect, it, vi } from "vitest";

import {
  ExternalProviderError,
  GoogleCalendarProvider,
  KftcProductionProvider,
  KftcTestbedProvider,
  MockBankProvider,
  READ_ONLY_BANK_CAPABILITIES,
  assertKftcProductionDisabled,
  collectTransactionHistory,
  redactIntegrationText,
  syncFreshness,
  withBoundedRetry,
  type ReadOnlyBankProvider,
} from "@/domain/integrations/model";
import { createLessonFromStudent, createStudent } from "@/domain/tutoring/model";
import { toKrw } from "@/domain/money/krw";

function lesson(id: string) {
  const student = createStudent(
    id,
    "owner-demo",
    {
      name: "테스트 학생",
      tutoringType: "subject",
      subject: "math",
      defaultMode: "online",
      defaultFeeAmount: toKrw(60_000),
      defaultDurationMinutes: 120,
      defaultLocation: null,
      meetStrategy: "google_generated",
      manualMeetUrl: null,
      payerAliases: [],
      notes: null,
    },
    "2026-09-03T00:00:00Z",
  );
  return createLessonFromStudent({ id, student, startsAt: "2026-09-03T18:00:00+09:00" });
}

describe("Phase 08 integration contracts", () => {
  it("TUT-011 and INT-002 create a stable app event and a unique conference request per lesson", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        id: string;
        conferenceData: { createRequest: { requestId: string } };
      };
      return new Response(
        JSON.stringify({
          id: body.id,
          htmlLink: "https://calendar.google.test/event",
          hangoutLink: "https://meet.google.test/room",
        }),
        { status: 200 },
      );
    });
    const provider = new GoogleCalendarProvider({
      accessToken: "server-token",
      calendarId: "primary",
      fetcher,
    });
    const first = await provider.createLessonEvent(lesson("lesson-a"));
    const retry = await provider.createLessonEvent(lesson("lesson-a"));
    const second = await provider.createLessonEvent(lesson("lesson-b"));
    expect(first.eventId).toBe(retry.eventId);
    expect(first.conferenceRequestId).toBe(retry.conferenceRequestId);
    expect(first.conferenceRequestId).not.toBe(second.conferenceRequestId);
    expect(fetcher.mock.calls[0]?.[0]).toContain("conferenceDataVersion=1");
  });

  it("INT-003 refuses to cancel an event not tied to the configured app calendar", async () => {
    const provider = new GoogleCalendarProvider({
      accessToken: "server-token",
      calendarId: "primary",
      fetcher: vi.fn(),
    });
    await expect(
      provider.cancelLessonEvent({
        eventId: "other",
        calendarId: "other",
        htmlUrl: "",
        meetUrl: null,
        conferenceRequestId: null,
        appLessonId: "lesson",
      }),
    ).rejects.toThrow(/앱이 만들거나/);
  });

  it("INT-002 resolves a duplicate stable Calendar create without creating another event", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "studentos-existing",
            htmlLink: "https://calendar.google.test/existing",
            hangoutLink: "https://meet.google.test/existing",
          }),
          { status: 200 },
        ),
      );
    const provider = new GoogleCalendarProvider({
      accessToken: "server-token",
      calendarId: "primary",
      fetcher,
    });
    const result = await provider.createLessonEvent(lesson("lesson-duplicate"));
    expect(result.eventId).toBe("studentos-existing");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).not.toHaveProperty("method", "POST");
  });

  it("INT-005 follows bounded pages and de-duplicates retry rows", async () => {
    const pages = [
      {
        rows: [
          {
            externalId: "a",
            occurredAt: "2026-09-01",
            direction: "inflow" as const,
            amount: 1n,
            description: "a",
            balanceAfter: 1n,
          },
        ],
        nextCursor: "2",
      },
      {
        rows: [
          {
            externalId: "a",
            occurredAt: "2026-09-01",
            direction: "inflow" as const,
            amount: 1n,
            description: "a",
            balanceAfter: 1n,
          },
          {
            externalId: "b",
            occurredAt: "2026-09-02",
            direction: "outflow" as const,
            amount: 1n,
            description: "b",
            balanceAfter: 0n,
          },
        ],
        nextCursor: null,
      },
    ];
    const provider = {
      capabilities: READ_ONLY_BANK_CAPABILITIES,
      listAccounts: vi.fn(),
      getBalance: vi.fn(),
      revoke: vi.fn(),
      listTransactions: vi.fn(async () => pages.shift()!),
    } satisfies ReadOnlyBankProvider;
    expect(
      (await collectTransactionHistory(provider, "secret-ref")).rows.map((row) => row.externalId),
    ).toEqual(["a", "b"]);
  });

  it("INT-008 retries only bounded transient errors", async () => {
    const delays: number[] = [];
    const retryEvents: Array<{ message?: string }> = [];
    const operation = vi.fn(async (attempt: number) => {
      if (attempt < 3)
        throw new ExternalProviderError(
          "rate limited Bearer super-secret-token",
          "rate_limited",
          true,
        );
      return "ok";
    });
    await expect(
      withBoundedRetry({
        operation,
        baseDelayMs: 40,
        sleep: async (milliseconds) => {
          delays.push(milliseconds);
        },
        random: () => 0,
        onRetry: (event) => retryEvents.push(event),
      }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([40, 80]);
    expect(retryEvents[0]?.message).toBe("rate limited Bearer [REDACTED]");

    const permanentFailure = vi.fn(async () => {
      throw new ExternalProviderError("invalid request", "provider_error", false);
    });
    await expect(
      withBoundedRetry({ operation: permanentFailure, sleep: async () => undefined }),
    ).rejects.toThrow(/invalid request/);
    expect(permanentFailure).toHaveBeenCalledTimes(1);

    const timeout = vi.fn(async () => {
      throw new ExternalProviderError("upstream timeout", "timeout", true);
    });
    await expect(
      withBoundedRetry({ operation: timeout, maxAttempts: 2, sleep: async () => undefined }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(timeout).toHaveBeenCalledTimes(2);
  });

  it("INT-004 and INT-005 map KFTC testbed pages through a server-only adapter", async () => {
    const fetcher = vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
      expect(String(request)).toContain("fintech_use_num=server-fintech-number");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer server-access-token");
      return new Response(
        JSON.stringify({
          res_list: [
            {
              tran_id: "tx-1",
              tran_date: "20260903",
              tran_time: "091530",
              inout_type: "출금",
              tran_amt: "12000",
              after_balance_amt: "809000",
              print_content: "교통",
            },
          ],
          next_page_yn: "Y",
          be_tran_seq: "cursor-2",
        }),
        { status: 200 },
      );
    });
    const provider = new KftcTestbedProvider({
      accessToken: "server-access-token",
      fintechUseNum: "server-fintech-number",
      baseUrl: "https://kftc.test.local",
      fetcher,
    });
    expect(provider.capabilities).toEqual(READ_ONLY_BANK_CAPABILITIES);
    await expect(provider.listTransactions("opaque-reference", null)).resolves.toMatchObject({
      rows: [{ externalId: "tx-1", direction: "outflow", amount: 12_000n }],
      nextCursor: "cursor-2",
    });
  });

  it("INT-006 mock banking remains usable and revoked state fails explicitly", async () => {
    const provider = new MockBankProvider();
    await expect(provider.getBalance("mock-account-reference")).resolves.toMatchObject({
      balance: 4_821_430n,
    });
    await provider.revoke();
    await expect(provider.listAccounts()).rejects.toThrow(/revoked/);
  });

  it("SEC-003 redacts tokens, fintech numbers, and account-like numbers", () => {
    expect(redactIntegrationText("Bearer abc.xyz fintech_use_num=1234567890123456")).toBe(
      "Bearer [REDACTED] fintech_use_num=[REDACTED]",
    );
  });

  it("INT-007 distinguishes current, stale, error, and disconnected state", () => {
    const base = {
      id: "c",
      ownerId: "u",
      kind: "bank" as const,
      provider: "mock" as const,
      status: "connected" as const,
      scopes: [],
      lastAttemptAt: "2026-09-03T00:00:00Z",
      lastSuccessAt: "2026-09-03T00:00:00Z",
      errorCode: null,
      errorMessage: null,
    };
    expect(syncFreshness(base, "2026-09-03T01:00:00Z")).toBe("current");
    expect(syncFreshness(base, "2026-09-05T01:00:00Z")).toBe("stale");
    expect(syncFreshness({ ...base, status: "error" }, "2026-09-03T01:00:00Z")).toBe("error");
    expect(syncFreshness({ ...base, status: "revoked" }, "2026-09-03T01:00:00Z")).toBe(
      "disconnected",
    );
  });

  it("MON-010 and MON-012 expose inquiry only and hard-block production", () => {
    expect(READ_ONLY_BANK_CAPABILITIES).toEqual([
      "account_discovery",
      "balance_inquiry",
      "transaction_history",
    ]);
    expect(() =>
      assertKftcProductionDisabled({ provider: "kftc_production", productionEnabled: false }),
    ).toThrow(/별도 릴리스/);
    expect(() =>
      assertKftcProductionDisabled({ provider: "mock", productionEnabled: false }),
    ).not.toThrow();
    expect(() => new KftcProductionProvider()).toThrow(/별도 릴리스/);
  });
});
