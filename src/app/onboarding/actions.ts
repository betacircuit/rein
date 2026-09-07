"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  readDemoSession,
  saveDemoOnboardingState,
  type DemoOnboardingState,
} from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";

const onboardingSchema = z
  .object({
    displayName: z.string().trim().min(2, "이름을 두 글자 이상 입력해 주세요."),
    school: z.string().trim().max(80, "학교 이름은 80자 이내로 입력해 주세요."),
    major: z.string().trim().max(80, "전공 이름은 80자 이내로 입력해 주세요."),
    academicYear: z.preprocess(
      (value) => (value === "" || value === null ? null : Number(value)),
      z
        .number()
        .int()
        .min(1, "학년은 1 이상이어야 해요.")
        .max(12, "학년은 12 이하여야 해요.")
        .nullable(),
    ),
    householdName: z.string().trim().min(2, "우리집 이름을 두 글자 이상 입력해 주세요."),
    roommateName: z.string().trim().min(2, "룸메이트 이름을 두 글자 이상 입력해 주세요."),
    roommateEmail: z.string().trim(),
    journey: z.enum(["owner", "roommate"]),
  })
  .superRefine((value, context) => {
    if (value.journey === "owner") {
      const emailResult = z.email().safeParse(value.roommateEmail);
      if (!emailResult.success) {
        context.addIssue({
          code: "custom",
          path: ["roommateEmail"],
          message: "초대할 이메일 형식을 확인해 주세요.",
        });
      }
    }
  });

export type OnboardingActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function completeLocalOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const session = await readDemoSession();
  if (!session) return { status: "error", message: "세션이 만료됐어요. 다시 로그인해 주세요." };
  const rateLimit = checkRateLimit({
    key: `onboarding:${session.userId}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: `저장 시도가 너무 많습니다. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`,
    };
  }

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    school: formData.get("school"),
    major: formData.get("major"),
    academicYear: formData.get("academicYear"),
    householdName: formData.get("householdName"),
    roommateName: formData.get("roommateName"),
    roommateEmail: formData.get("roommateEmail"),
    journey: formData.get("journey"),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  if (parsed.data.journey !== session.persona) {
    return { status: "error", message: "로그인에서 선택한 역할과 온보딩 역할이 달라요." };
  }

  const ownerJourney = session.persona === "owner";
  const state: DemoOnboardingState = {
    userId: session.userId,
    profile: {
      displayName: parsed.data.displayName,
      school: parsed.data.school,
      major: parsed.data.major,
      academicYear: parsed.data.academicYear,
    },
    household: {
      name: parsed.data.householdName,
      homeType: "two_room_rental",
      currentRole: ownerJourney ? "owner" : "member",
      currentStatus: "active",
      roommateStatus: ownerJourney ? "invited" : "active",
    },
  };
  await saveDemoOnboardingState(state);
  redirect("/settings/household?onboarded=1");
}
