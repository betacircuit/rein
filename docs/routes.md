# Route and Screen Contract

실제 세그먼트 이름은 아래 계약을 기본으로 한다. 사용자에게 보이는 레이블은 한국어이고, URL은 유지보수 가능한 영문 slug를 쓴다. 모든 보호 라우트는 서버에서 인증·권한을 확인하며, 모바일 하단 내비게이션과 데스크톱 사이드바가 같은 정보구조를 사용한다.

## Public/auth

| Route | Purpose | Main actions |
|---|---|---|
| `/` | 인증 상태에 따라 대시보드 또는 로그인으로 이동 | redirect |
| `/login` | 이메일/OAuth 로그인 | sign in |
| `/auth/callback` | Supabase 및 Google OAuth callback 분리 처리 | safe redirect |
| `/onboarding` | 프로필·통화·시간대·자취방 생성/가입 | complete setup |
| `/privacy` | 개인정보·은행 조회 전용·투자 고지 | read |

## Home

| Route | Screen contract |
|---|---|
| `/home` | 오늘 과외/준비/Meet·장소, 이번 달 earned/received/outstanding, 계좌 잔액과 settled inflow/outflow, 구독 7일/체험 종료, 실제 가용 잉여금, 저재고, 청소, 정산, 매칭 검토 큐 |
| `/quick-add` | sheet/dialog route fallback: 수업·수입·지출·입금 처리·재고·공동비 |
| `/review` | 모든 match suggestion과 필요한 사용자 확인 작업 |

## Tutoring

| Route | Screen contract |
|---|---|
| `/tutoring` | 예정/완료 수업과 학생 요약; 보강 탭은 절대 없음 |
| `/tutoring/students` | 검색·필터·학생 목록 |
| `/tutoring/students/new` | SUBJECT/SCHOOL_RECORD, 과목 조건부, 모드, 금액, 일정, 별칭 |
| `/tutoring/students/[studentId]` | 기본정보, 일정, 수업 이력, earned/received/outstanding, 명목·실질 시급 |
| `/tutoring/students/[studentId]/edit` | 학생 기본값 편집; 과거 수업 snapshot 불변 |
| `/tutoring/lessons` | 예정/완료/취소 필터 |
| `/tutoring/lessons/new` | 학생 기본값 복사 후 수업 단위 override |
| `/tutoring/lessons/[lessonId]` | 준비 노트/checklist, Meet 또는 장소, 완료/취소, receivable link |
| `/tutoring/receivables` | OPEN/PARTIAL/PAID/VOID, allocation, deposit suggestions |
| `/tutoring/receivables/[receivableId]` | 수업·학생·할당 내역·잔액·감사 이력 |

## Money

| Route | Screen contract |
|---|---|
| `/money` | 총 보유금액, 계좌별 잔액, 월 입금/출금, 미수, 구독, 잉여금 |
| `/money/accounts` | 계좌 목록, 포함/제외, 동기화 신선도 |
| `/money/accounts/new` | manual/mock/provider metadata 등록; 전체 번호 저장 금지 |
| `/money/accounts/[accountId]` | 현재/가용 잔액, 입출금, stale/error, CSV/sync actions |
| `/money/transactions` | income/expense/transfer, 범위, category, date filters |
| `/money/transactions/new` | 수입·지출·이체; 이체는 양쪽 계좌 필수 |
| `/money/import` | CSV mapping → preview → validation → idempotent commit |
| `/money/receivables` | tutoring receivables cross-link |
| `/money/subscriptions` | 월 환산, 연간 예상, 7/30일, trial/cancel-by, unmatched/overdue |
| `/money/subscriptions/new` | 주기·가격·scope·payer/split·reminder 등록 |
| `/money/subscriptions/[subscriptionId]` | 계약, occurrence calendar, price/history, matching, keep/review/cancel candidate |
| `/money/subscriptions/[subscriptionId]/edit` | 상태 변경 및 취소; history 보존 |
| `/money/grow` | 실제 가용 잉여금, 안전자금·장기 적립·자유자금 계획/완료 |
| `/money/analytics` | cash flow, category spending, student income, effective hourly, fixed/subscription, asset trend |

## Household

| Route | Screen contract |
|---|---|
| `/household` | 공동비·미정산, 저재고, 장보기, 청소 상태 |
| `/household/inventory` | 냉장/냉동/상온, 내 것/친구 것/공용, +/- |
| `/household/inventory/new` | item, quantity/unit, owner, storage, expiry, threshold |
| `/household/inventory/[itemId]` | 수량 조정과 장보기 연결 |
| `/household/shopping` | 개인/멤버/공용 장보기 체크리스트와 구매 연결 |
| `/household/cleaning` | 괜찮음/곧 해야 함/해야 함, 담당, 다음 예정 |
| `/household/cleaning/new` | task/area/assignee/recurrence |
| `/household/cleaning/[taskId]` | 완료 이력, 다음 일정, 완료 액션 |
| `/household/expenses` | 월 공동비, payer, split, linked transaction/subscription |
| `/household/expenses/new` | category, amount, paid-by, 50:50/me/friend/custom exact split |
| `/household/expenses/[expenseId]` | 부담 내역, 결제 증빙 link, audit |
| `/household/settlements` | 멤버별 net balance와 settlement history |
| `/household/settlements/new` | from/to/amount; partial allowed |

## Settings

| Route | Screen contract |
|---|---|
| `/settings` | 설정 허브 |
| `/settings/profile` | display name, optional school/major/year, locale/timezone/currency |
| `/settings/household` | household name, member invite/status, owner controls |
| `/settings/tutoring` | 기본 시간·금액·calendar behavior |
| `/settings/categories` | custom categories; system defaults protected |
| `/settings/accounts` | linked/manual accounts and inclusion |
| `/settings/integrations` | Google Calendar, bank adapter, sync state, disconnect |
| `/settings/reminders` | in-app reminder preferences |
| `/settings/data` | export and deletion workflow |

## Navigation and state rules

- Mobile persistent tabs: `홈`, `과외`, `돈`, `자취`, `설정`.
- Desktop persistent sidebar uses the same five roots; child destinations appear within section navigation.
- Global add is available from every authenticated root. It must not include unsupported actions.
- Every list/detail has loading, empty, recoverable error, offline, and stale-sync variants where relevant.
- A roommate can navigate shared Household data but cannot reach the owner's private Accounts/Transactions/Students routes or infer them through shared APIs.
- Every external-link action has an accessible label and safe disabled/error state.
