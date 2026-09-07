import { readFile } from "node:fs/promises";
import path from "node:path";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { RAINY_GROQ_COOKIE, resolveGroqApiKey } from "@/lib/rainy/groq-key";
import { isRainyRestrictedRequest } from "@/lib/rainy/site-command-router";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requireSupabaseUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1_200),
      }),
    )
    .min(1)
    .max(12),
});

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1),
});

const rainyAgentPrompt = readFile(
  path.join(process.cwd(), "config", "rainy-agent.yaml"),
  "utf8",
).catch(() => "agent:\n  name: RAINY\npermission_boundary:\n  default: deny");

function json(message: string, status: number, extra?: Record<string, string>) {
  return Response.json(
    { message },
    { status, headers: { "Cache-Control": "private, no-store", ...extra } },
  );
}

export async function POST(request: Request) {
  const auth = await requireSupabaseUser();
  if (!auth) return json("로그인이 필요합니다.", 401);

  const incomingHeaders = await headers();
  const origin = incomingHeaders.get("origin");
  const host = incomingHeaders.get("host");
  try {
    if (!origin || !host || new URL(origin).host !== host) throw new Error("origin mismatch");
  } catch {
    return json("요청 출처를 확인할 수 없습니다.", 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json("대화 요청 형식이 올바르지 않습니다.", 415);
  }

  const limit = checkRateLimit({ key: `rainy-chat:${auth.user.id}`, limit: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return json("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const apiKey = resolveGroqApiKey((await cookies()).get(RAINY_GROQ_COOKIE)?.value, auth.user.id);
  if (!apiKey) return json("설정에서 Groq API 키를 연결해 주세요.", 409);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json("대화 요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json("대화가 너무 길거나 형식이 올바르지 않습니다.", 400);

  // Only the newest turn is checked: earlier turns (including RAINY's own past
  // replies) are replayed as context on every request, and scanning all of them
  // let a single flagged phrase permanently lock the rest of the conversation.
  const latestMessage = parsed.data.messages.at(-1);
  if (latestMessage && isRainyRestrictedRequest(latestMessage.content)) {
    return json("ACCESS DENIED: RESTRICTED DOMAIN", 403);
  }

  const totalCharacters = parsed.data.messages.reduce((sum, item) => sum + item.content.length, 0);
  if (totalCharacters > 6_000) return json("대화가 너무 깁니다. 새 대화로 이어 주세요.", 413);

  const yaml = await rainyAgentPrompt;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `${yaml}\nYou are the conversational layer only. Never claim a site action ran. The deterministic local router alone executes actions. Answer in concise Korean.`,
          },
          ...parsed.data.messages,
        ],
        temperature: 0.35,
        max_completion_tokens: 480,
        tool_choice: "none",
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (upstream.status === 401) return json("Groq API 키를 확인해 주세요.", 401);
    if (upstream.status === 429)
      return json("Groq 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.", 429);
    if (!upstream.ok) return json("Groq 응답을 받지 못했습니다.", 502);
    const result = responseSchema.safeParse(await upstream.json());
    if (!result.success) return json("Groq 응답 형식을 확인하지 못했습니다.", 502);
    const answer = result.data.choices[0]?.message.content;
    if (!answer) return json("Groq 응답 형식을 확인하지 못했습니다.", 502);
    return Response.json(
      { message: answer.slice(0, 4_000) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return json(
      error instanceof Error && error.name === "AbortError"
        ? "Groq 응답 시간이 초과되었습니다."
        : "Groq 연결이 중단되었습니다.",
      504,
    );
  } finally {
    clearTimeout(timeout);
  }
}
