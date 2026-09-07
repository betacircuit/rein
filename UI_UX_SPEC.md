# UI/UX Specification

## 1. Visual direction

A calm, compact student dashboard: clear typography, generous touch targets, cards only where grouping helps, and minimal decorative gradients. Finance screens should feel trustworthy but not like a brokerage terminal. Use neutral semantic colors and always pair color with text/icon/status.

## 2. App shell

### Mobile
- Header: page title, contextual action, sync indicator when relevant.
- Bottom navigation: Home, Tutoring, Money, Household, Settings.
- Global add button/action sheet reachable with thumb and screen reader.
- Respect iOS/Android safe areas.

### Desktop
- 240–280px sidebar.
- Main content max width appropriate to page; detail pages may use a secondary rail.
- Keyboard shortcuts may be added only with visible discoverability.

## 3. Home layout order

1. Date and greeting.
2. Today's lessons, prep checklist, Meet/location action.
3. Required actions: match suggestions, overdue receivable, subscription/trial, cleaning.
4. Money summary: projected fixed tutoring income (clearly labeled forecast), earned/received/outstanding tutoring, settled income, expense, and account total. Forecast never appears as settled cash or available surplus.
5. Actual available surplus and Grow contribution.
6. Household summary: low stock, cleaning, settlement.
7. Secondary analytics/recent transactions.

## 4. Key screen wireframes

### Home
```text
[9월 1일 화요일]                           [동기화 상태]
오늘 준비할 일
┌ 18:00 김OO · 수학 · 화상 ───────────────┐
│ □ 숙제 확인  □ 미적분 오답 3문제          │
│ [수업 상세]                    [Meet 입장] │
└──────────────────────────────────────────┘

확인 필요 3
- 240,000원 입금 → 김OO 과외비로 추정 [검토]
- 구독 2건이 7일 안에 결제 예정          [보기]
- 화장실 청소 오늘                       [완료]

이번 달 과외       발생 720,000 / 입금 480,000 / 미수 240,000
내 돈              계좌 4,821,430 / 수입 1,820,000 / 지출 1,137,500
실제 가용 잉여금    409,000 / 장기 적립 계획 200,000
우리집              닭가슴살 2개 · 받을 정산 42,300
```

### Student detail
- Identity chip: 교과(수학/물리/화학) or 생기부.
- Default mode and action.
- Default fee/duration/schedule.
- This-month metrics.
- Next lesson prep.
- Lesson timeline.
- Receivables/payment history.
- Nominal/effective hourly rate.

### Lesson detail
- Status, date/time, duration, amount, mode.
- Prep note and checklist editable while scheduled.
- Meet/location action.
- Calendar sync state and retry.
- Completion sheet: actual duration, prep minutes, travel minutes, completion note.
- Completed state: linked receivable and payment status.
- Cancel action; no makeup action.

### Money overview
- Total account balance with last-sync freshness.
- Monthly settled inflow/outflow; transfers excluded.
- Outstanding receivable.
- Subscription obligation.
- Household responsibility and settlement.
- Actual available surplus.

### Subscription dashboard
- Monthly equivalent, next-12-month projection.
- 7-day/30-day due cards.
- Trial and cancel-by card.
- Category list.
- Active/trial/paused/cancelled filters.
- Review candidates.

### Household overview
- Month shared cost, user's economic share, cash paid, settlement net.
- Inventory summary and low-stock CTA.
- Cleaning due list with one-tap completion.
- Shared expense recent list.

### Shared expense form
1. Description/category/date/amount.
2. Actual payer.
3. Split preset or custom.
4. Optional link to imported transaction/subscription occurrence.
5. Review exact owed amounts before save.

### Grow
- Distinguish cash remaining from actual available surplus.
- Explain formula with expandable rows.
- Safety reserve current/target/top-up.
- Planned long-term contribution and completion.
- Cash vs long-term tracked assets.
- Neutral loss-risk disclosure.

## 5. Form behavior

- Use React Hook Form + Zod with server revalidation.
- Save buttons show pending state and prevent duplicate submission.
- Conditional fields:
  - School-record tutoring hides subject.
  - Online shows Meet strategy; in-person shows location.
  - Household subscription shows payer/split.
  - Custom billing shows interval days.
- Preserve user input after recoverable server errors.

## 6. Empty states

Examples:
- No students: “첫 학생을 등록하면 수업 준비와 과외비가 연결돼요.”
- No bank connection: offer mock/demo, manual account, CSV import; do not imply live KFTC is instantly available.
- No subscriptions: “매달 자동으로 나가는 비용부터 등록해 보세요.”
- No household: create household and invite friend.
- No Grow plan: show formula and create a modest plan, not investment hype.

## 7. Status/freshness

Balances and transactions show `마지막 동기화`. Stale data uses text such as “3일 전 기준” rather than only a warning color. Failed sync keeps the last known value with a visible error label.

## 8. Accessibility

- Semantic headings/landmarks.
- Every input has persistent label and described error.
- Dialog focus trap and return focus.
- No swipe-only action.
- Charts have text/table equivalents.
- Currency is read naturally by assistive technology.
- Reduced-motion preference respected.
