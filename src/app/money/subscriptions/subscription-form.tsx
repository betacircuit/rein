"use client";

import { useActionState, useState } from "react";

import {
  saveSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/money/subscriptions/actions";
import {
  categoryLabels,
  cycleLabels,
  statusLabels,
} from "@/app/money/subscriptions/subscription-ui";
import { Button } from "@/components/ui/button";
import type { Account } from "@/domain/money/ledger";
import {
  addDateDays,
  subscriptionCategories,
  subscriptionStatuses,
  type Subscription,
  type SubscriptionMember,
  type SubscriptionSplit,
} from "@/domain/subscriptions/model";
import { formatSeoulDateKey } from "@/lib/format/date";

const initial: SubscriptionActionState = { status: "idle" };
const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 text-base outline-none focus:ring-2 focus:ring-[var(--focus)]";

function FieldError({ errors }: { errors: string[] | undefined }) {
  if (!errors?.[0]) return null;
  return (
    <span className="mt-2 block text-xs font-bold text-[var(--danger-ink)]" role="alert">
      {errors[0]}
    </span>
  );
}

export function SubscriptionForm({
  subscription,
  accounts,
  members,
  splits = [],
}: {
  subscription?: Subscription;
  accounts: Account[];
  members: SubscriptionMember[];
  splits?: SubscriptionSplit[];
}) {
  const [state, action, pending] = useActionState(saveSubscriptionAction, initial);
  const [cycle, setCycle] = useState(subscription?.billingCycle ?? "monthly");
  const [status, setStatus] = useState(subscription?.status ?? "active");
  const [scope, setScope] = useState(subscription?.scope ?? "private");
  const owner = members.find((item) => item.isCurrentUser);
  const roommate = members.find((item) => !item.isCurrentUser);
  const storedOwnerShare =
    splits.find((item) => item.memberId === owner?.id)?.shareBasisPoints ?? 5_000;
  const [ownerShare, setOwnerShare] = useState(
    subscription?.scope === "household" ? storedOwnerShare / 100 : 100,
  );
  const roommateShare = 100 - ownerShare;
  const today = formatSeoulDateKey();

  return (
    <form action={action} className="space-y-6">
      {subscription && <input name="subscriptionId" type="hidden" value={subscription.id} />}
      {state.status === "error" && (
        <div
          className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-wash)] p-4 text-sm font-bold text-[var(--danger-ink)]"
          role="alert"
          tabIndex={-1}
        >
          {state.message}
        </div>
      )}

      <fieldset className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-black">기본 정보</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-extrabold">
            구독 이름 *
            <input className={inputClass} defaultValue={subscription?.name} name="name" required />
            <FieldError errors={state.errors?.name} />
          </label>
          <label className="text-sm font-extrabold">
            제공사
            <input
              className={inputClass}
              defaultValue={subscription?.providerName ?? ""}
              name="providerName"
            />
          </label>
          <label className="text-sm font-extrabold">
            요금제
            <input
              className={inputClass}
              defaultValue={subscription?.planName ?? ""}
              name="planName"
            />
          </label>
          <label className="text-sm font-extrabold">
            분류
            <select className={inputClass} defaultValue={subscription?.category} name="category">
              {subscriptionCategories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-extrabold">
            상태
            <select
              className={inputClass}
              disabled={subscription?.status === "cancelled" || subscription?.status === "ended"}
              name="status"
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              {subscriptionStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
            {(subscription?.status === "cancelled" || subscription?.status === "ended") && (
              <input name="status" type="hidden" value={subscription.status} />
            )}
          </label>
          <label className="text-sm font-extrabold">
            결제 계좌·카드
            <select
              className={inputClass}
              defaultValue={subscription?.paymentAccountId ?? ""}
              name="paymentAccountId"
            >
              <option value="">지정하지 않음</option>
              {accounts
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname} · {item.institutionName}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-black">가격과 청구 일정</legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-extrabold">
            금액(원) *
            <input
              className={inputClass}
              defaultValue={subscription?.amount.toString()}
              min="1"
              name="amount"
              required
              type="number"
            />
            <FieldError errors={state.errors?.amount} />
          </label>
          <label className="text-sm font-extrabold">
            청구 주기
            <select
              className={inputClass}
              name="billingCycle"
              onChange={(event) => setCycle(event.target.value as typeof cycle)}
              value={cycle}
            >
              {Object.entries(cycleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {cycle === "custom_days" && (
            <label className="text-sm font-extrabold">
              주기 일수 *
              <input
                className={inputClass}
                defaultValue={subscription?.customCycleDays ?? 30}
                min="1"
                name="customCycleDays"
                type="number"
              />
              <FieldError errors={state.errors?.customCycleDays} />
            </label>
          )}
          <label className="text-sm font-extrabold">
            시작일 *
            <input
              className={inputClass}
              defaultValue={subscription?.startedOn ?? today}
              name="startedOn"
              required
              type="date"
            />
          </label>
          <label className="text-sm font-extrabold">
            청구 기준일 *
            <input
              className={inputClass}
              defaultValue={subscription?.billingAnchorOn ?? today}
              name="billingAnchorOn"
              required
              type="date"
            />
          </label>
          <label className="text-sm font-extrabold">
            다음 결제일 *
            <input
              className={inputClass}
              defaultValue={subscription?.nextBillingOn ?? addDateDays(today, 30)}
              name="nextBillingOn"
              required
              type="date"
            />
          </label>
          {subscription && (
            <>
              <label className="text-sm font-extrabold">
                새 가격 적용일
                <input
                  className={inputClass}
                  defaultValue={subscription.nextBillingOn}
                  name="priceEffectiveOn"
                  type="date"
                />
              </label>
              <label className="text-sm font-extrabold sm:col-span-2">
                가격 변경 메모
                <input className={inputClass} name="priceNote" placeholder="예: 학생 할인 종료" />
              </label>
            </>
          )}
        </div>
        <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-extrabold">
          <input
            defaultChecked={subscription?.autoRenews ?? true}
            name="autoRenews"
            type="checkbox"
          />
          자동 갱신
        </label>
      </fieldset>

      <fieldset className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-black">체험·알림</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-extrabold">
            체험 종료일{status === "trial" ? " *" : ""}
            <input
              className={inputClass}
              defaultValue={subscription?.trialEndsOn ?? ""}
              name="trialEndsOn"
              type="date"
            />
            <FieldError errors={state.errors?.trialEndsOn} />
          </label>
          <label className="text-sm font-extrabold">
            해지 권장일
            <input
              className={inputClass}
              defaultValue={subscription?.cancelByOn ?? ""}
              name="cancelByOn"
              type="date"
            />
          </label>
          <label className="text-sm font-extrabold sm:col-span-2">
            미리 알림(일 전)
            <input
              className={inputClass}
              defaultValue={subscription?.reminderDaysBefore.join(", ") ?? "7, 1"}
              name="reminderDaysBefore"
              placeholder="7, 3, 1"
            />
            <span className="mt-2 block text-xs font-normal text-[var(--muted-ink)]">
              Asia/Seoul 기준이며 같은 일수는 한 번만 저장합니다.
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-black">공유 범위와 분담</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["private", "household"] as const).map((item) => (
            <label
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] px-4 text-sm font-extrabold"
              key={item}
            >
              <input
                checked={scope === item}
                name="scope"
                onChange={() => setScope(item)}
                type="radio"
                value={item}
              />
              {item === "private" ? "나만 보기" : "우리집과 함께 보기"}
            </label>
          ))}
        </div>
        {scope === "household" && (
          <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-extrabold">
                결제자
                <select
                  className={inputClass}
                  defaultValue={subscription?.payerMemberId ?? owner?.id}
                  name="payerMemberId"
                >
                  {members.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-sm font-extrabold">빠른 분담</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button onClick={() => setOwnerShare(50)} type="button" variant="outline">
                    반반
                  </Button>
                  <Button onClick={() => setOwnerShare(100)} type="button" variant="outline">
                    내가 전부
                  </Button>
                  <Button onClick={() => setOwnerShare(0)} type="button" variant="outline">
                    룸메이트가 전부
                  </Button>
                </div>
              </div>
              <label className="text-sm font-extrabold">
                {owner?.name ?? "나"} 분담률(%)
                <input
                  className={inputClass}
                  max="100"
                  min="0"
                  name="ownerShare"
                  onChange={(event) => setOwnerShare(Number(event.target.value))}
                  step="0.01"
                  type="number"
                  value={ownerShare}
                />
                <FieldError errors={state.errors?.ownerShare} />
              </label>
              <label className="text-sm font-extrabold">
                {roommate?.name ?? "룸메이트"} 분담률(%)
                <input
                  className={inputClass}
                  name="roommateShare"
                  readOnly
                  type="number"
                  value={roommateShare}
                />
              </label>
            </div>
          </div>
        )}
        {scope === "private" && (
          <>
            <input name="ownerShare" type="hidden" value="100" />
            <input name="roommateShare" type="hidden" value="0" />
          </>
        )}
      </fieldset>

      <fieldset className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
        <legend className="px-2 text-lg font-black">매칭과 메모</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-extrabold sm:col-span-2">
            거래명 패턴
            <input
              className={inputClass}
              defaultValue={subscription?.descriptorAliases.join(", ") ?? ""}
              name="descriptorAliases"
              placeholder="제공사명, 카드 명세 표기"
            />
          </label>
          <label className="text-sm font-extrabold">
            서비스 주소
            <input
              className={inputClass}
              defaultValue={subscription?.serviceUrl ?? ""}
              inputMode="url"
              name="serviceUrl"
              placeholder="https://"
              type="url"
            />
            <FieldError errors={state.errors?.serviceUrl} />
          </label>
          <label className="text-sm font-extrabold">
            메모
            <textarea
              className={`${inputClass} min-h-28 py-3`}
              defaultValue={subscription?.notes ?? ""}
              name="notes"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="accent">
          {pending ? "저장 중…" : "구독 저장"}
        </Button>
      </div>
    </form>
  );
}
