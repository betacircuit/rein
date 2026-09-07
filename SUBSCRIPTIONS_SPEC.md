# 월 구독료 관리 상세 사양

## 1. 목적과 경계

월 구독료 기능은 반복 결제 서비스를 한곳에 모아 다음을 정확히 보여준다.

- 매달 평균적으로 얼마가 나가는지
- 향후 12개월에 실제로 언제 얼마가 청구될지
- 7일/30일 안에 갱신되거나 체험이 끝나는 항목
- 실제 계좌 거래와 아직 연결되지 않은 청구
- 개인 구독과 자취방 공동 구독에서 내가 부담하는 금액
- 계속 유지할지, 검토할지, 취소 후보인지에 대한 **사용자 직접 기록**

이 기능은 구독 계약을 실제 은행 거래와 동일시하지 않는다. 미래 청구는 `SubscriptionOccurrence`, 실제 돈의 이동은 `FinancialTransaction`, 공동 구독의 경제적 부담은 `SharedExpense`로 분리한다.

```text
Subscription contract
        │
        ├─ price history
        │
        └─ SubscriptionOccurrence (expected charge)
                  │
                  ├─ confirmed match ──> FinancialTransaction (actual cash)
                  │
                  └─ household scope ──> exactly one SharedExpense + splits
```

## 2. 플랫폼 위계

```text
Money
└─ 구독
   ├─ 대시보드
   │  ├─ 월 환산 합계
   │  ├─ 향후 12개월 예상 합계
   │  ├─ 7일 이내 결제
   │  ├─ 30일 이내 결제
   │  ├─ 체험 종료 / 취소 마감
   │  ├─ 미매칭 청구
   │  └─ 연체 또는 확인 필요
   │
   ├─ 전체 구독
   │  ├─ 체험 TRIAL
   │  ├─ 사용 중 ACTIVE
   │  ├─ 일시정지 PAUSED
   │  ├─ 취소 CANCELLED
   │  └─ 종료 ENDED
   │
   ├─ 카테고리
   │  ├─ AI/소프트웨어
   │  ├─ 클라우드/스토리지
   │  ├─ 교육
   │  ├─ 엔터테인먼트
   │  ├─ 통신
   │  ├─ 운동/건강
   │  ├─ 뉴스
   │  └─ 기타
   │
   ├─ 갱신 캘린더
   │  ├─ 월간
   │  ├─ 7일
   │  └─ 30일
   │
   ├─ 검토함
   │  ├─ 계속 사용 KEEP
   │  ├─ 검토 REVIEW
   │  └─ 취소 후보 CANCEL_CANDIDATE
   │
   ├─ 매칭함
   │  ├─ 실제 거래 후보
   │  ├─ 확인 완료
   │  └─ 기각
   │
   └─ 구독 상세
      ├─ 계약 정보
      ├─ 가격 및 결제 주기
      ├─ 다음 결제 / 체험 종료 / 취소 마감
      ├─ 개인 또는 자취방 공동 범위
      ├─ 실제 결제자와 책임 분할
      ├─ 결제 계좌/카드와 거래명 패턴
      ├─ 알림
      ├─ 가격 이력
      ├─ 예상 청구 및 결제 이력
      ├─ 마지막 사용일과 유지 판단
      └─ 일시정지 / 취소 / 종료
```

Money 대시보드와 Home 카드에서 필터가 적용된 구독 목록으로 바로 이동할 수 있어야 한다.

## 3. 상태 모델

DB enum/도메인 상태:

```text
trial      = 무료/유료 체험 중
active     = 정상 반복 결제 대상
paused     = 일시정지; 정지 기간에는 미래 청구를 만들지 않음
cancelled  = 사용자가 취소했으나 과거 계약/결제 이력 보존
ended      = 계약 종료일이 지난 상태; 과거 이력 보존
```

규칙:

- 상태 전환은 과거 occurrence와 transaction 연결을 삭제하지 않는다.
- `cancelled_at` 또는 `ended_at` 이후 미래 occurrence를 생성하지 않는다.
- 이미 결제된 occurrence를 취소 상태 전환 때문에 삭제하지 않는다.
- `paused` 해제 시 명시적 기준일 이후만 다시 생성한다.
- 상태 변경은 audit event를 남긴다.

## 4. 카테고리

정확한 기본 카테고리:

```text
ai_software       AI/소프트웨어
cloud_storage     클라우드/스토리지
education         교육
entertainment     엔터테인먼트
communication     통신
fitness           운동/건강
news              뉴스
other             기타
```

카테고리는 필터와 통계에 쓰지만 특정 상용 서비스 교체 추천이나 광고에 쓰지 않는다.

## 5. 결제 주기

지원 주기:

```text
weekly       매주
monthly      매월
quarterly    3개월
semiannual   6개월
yearly       매년
custom_days  사용자 지정 N일
```

필드:

- `billing_cycle`
- `custom_interval_days`: `custom_days`일 때만 필수이며 양의 정수
- `billing_anchor_date` 또는 `next_charge_date`
- `timezone`: 기본 `Asia/Seoul`

월 환산은 화면 비교용 값이며 실제 결제일/금액을 바꾸지 않는다. 모든 계산은 integer KRW를 유지하고 표시 단계에서만 반올림 정책을 사용한다.

권장 월 환산 공식:

```text
weekly      = amount × 52 / 12
monthly     = amount
quarterly   = amount / 3
semiannual  = amount / 6
yearly      = amount / 12
custom_days = amount × 365.2425 / custom_interval_days / 12
```

구현에서는 공통 formula service를 사용하고, 소수 결과의 정수 KRW 반올림 규칙을 문서화한다. 향후 12개월 예상 합계는 단순 `월 환산 × 12`가 아니라 날짜별 occurrence를 합산한다.

테스트:

- 월말, 윤년, 2월, 연도 경계
- 31일 기준 서비스
- custom interval
- 가격 변경 effective date
- 취소/종료/정지 경계

## 6. 구독 계약 필드

필수:

- 서비스/provider 이름
- 선택적 plan 이름
- 금액과 통화; 기본 KRW
- 상태
- 카테고리
- 결제 주기와 custom interval
- 시작일
- 다음 결제일
- 개인/공동 scope

선택 또는 조건부:

- 체험 종료일 `trial_ends_at`
- 취소 마감일 `cancel_by_at`
- 자동 갱신 `auto_renew`
- 취소일/종료일/일시정지 기간
- 결제 계좌 참조 또는 카드의 안전한 별칭/마스킹 정보
- 거래명/descriptor 패턴
- 서비스 URL
- 메모
- reminder day offsets
- 마지막 사용일; 사용자가 직접 입력
- `keep | review | cancel_candidate` 결정; 사용자가 직접 입력
- 결정 메모와 결정일
- household scope일 때 household, payer member, exact split

전체 카드번호, CVC, 인터넷뱅킹 비밀번호를 저장하지 않는다.

## 7. 개인 구독과 공동 구독

### 개인 구독

- owner만 계약과 결제 계좌 세부를 볼 수 있다.
- 실제 거래는 owner의 private ledger에 존재한다.
- 가용 잉여금에는 owner의 미지급 확정 obligation 전체가 반영된다.

### 자취방 공동 구독

예: 인터넷, 공동 스트리밍, 공동 클라우드.

- active household member는 공동 구독의 서비스명, 총액, 결제 예정일, payer, split을 볼 수 있다.
- 다른 구성원의 개인 계좌번호·잔액·private transaction descriptor는 보지 못한다.
- `actual payer`와 `responsibility split`을 별도로 저장한다.
- presets: 50:50, 나 전부, 친구 전부, custom.
- 모든 integer KRW가 정확히 한 구성원에게 배분되어 split 합계가 총액과 일치해야 한다.

```text
공동 구독 30,000원
실제 결제자: 최재원
경제적 부담: 최재원 15,000 / 친구 15,000
=> 친구가 최재원에게 15,000원 정산 의무
```

## 8. 가격 이력

`SubscriptionPriceHistory`는 최소 다음을 가진다.

- subscription_id
- amount
- currency
- effective_from
- optional effective_until
- change_reason
- created_by / created_at

가격 변경 흐름:

1. 새 금액과 적용일을 입력한다.
2. 기존 가격 이력의 유효기간을 닫는다.
3. 새 이력을 append한다.
4. 과거 paid occurrence는 변경하지 않는다.
5. 아직 materialize되지 않은 미래 occurrence는 새 가격을 사용한다.
6. 이미 생성되었지만 미지급인 미래 occurrence를 변경해야 하면 영향 범위를 보여주고 사용자 확인 후 재생성한다.

## 9. 예상 청구 `SubscriptionOccurrence`

구독 계약과 별도 엔터티이며 최소 필드:

- subscription_id
- due_at/date
- expected_amount
- currency
- status: scheduled, unmatched, paid, skipped, refunded
- price_history_id 또는 사용 가격 스냅샷
- generated_key/idempotency key
- matched_transaction_id nullable
- shared_expense_id nullable
- paid_at nullable
- skipped reason

규칙:

- 미래 occurrence를 만들었다고 실제 지출을 생성하지 않는다.
- 동일 구독·결제일에는 occurrence가 하나만 존재한다.
- bounded horizon만 생성한다. 예: 과거 필요한 범위 + 향후 12개월.
- 재시도해도 중복되지 않는다.
- 취소/종료 이후 생성하지 않는다.
- 이미 paid인 occurrence를 자동 재생성하거나 덮어쓰지 않는다.

## 10. 실제 거래 매칭

후보 생성 증거:

- 금액 일치 또는 허용 오차
- descriptor/상호명 패턴
- 예상 계좌
- 결제 예정일과 실제 거래일 거리
- 과거에 확인된 동일 서비스 패턴

매칭 흐름:

1. 계좌 동기화/CSV/수동 거래가 ledger에 들어온다.
2. 시스템은 suggestion만 만든다.
3. UI가 근거와 충돌 가능성을 보여준다.
4. 사용자가 확인한다.
5. occurrence에 actual transaction을 연결한다.
6. occurrence를 paid로 바꾼다.
7. audit event를 남긴다.
8. 이미 존재하는 expense transaction을 복제하지 않는다.

한 actual transaction을 둘 이상의 상충하는 occurrence에 자동 연결하지 않는다. 수동 해제/재연결도 확인과 audit가 필요하다.

## 11. 공동 구독과 `SharedExpense` 연결

공동 scope의 paid occurrence에는 정확히 하나의 `SharedExpense`만 생성하거나 연결한다.

```text
SubscriptionOccurrence 1 ── 0..1 FinancialTransaction
SubscriptionOccurrence 1 ── 0..1 SharedExpense
```

- transaction은 실제 cash source of truth다.
- shared expense는 household의 경제적 부담 source of truth다.
- 구독 화면, 돈 화면, 자취방 화면이 같은 source ID를 참조한다.
- 같은 결제를 세 화면 합계에 세 번 더하지 않는다.
- DB unique constraint 또는 idempotent service로 one-to-one을 보장한다.

## 12. 대시보드 계산

### 월 환산 합계

trial/active 중 포함 규칙을 만족하는 구독의 normalized monthly equivalent 합계. 공동 구독은 화면 문맥에 따라 전체 금액과 “내 부담”을 구분한다.

### 향후 12개월 예상 합계

오늘 기준 다음 12개월 occurrence의 expected amount 합계. 가격 변경, 종료일, 체험, 정지를 반영한다.

### 7일 / 30일 이내

`Asia/Seoul` 날짜 기준으로 아직 paid/skipped가 아닌 occurrence를 필터한다. 월/연도 경계를 정확히 넘는다.

### 체험 종료 / 취소 마감

trial end와 cancel-by 중 먼저 오는 의미 있는 날짜를 표시한다. 중복 reminder를 만들지 않는다.

### 미매칭 / 연체

- 미매칭: 예정일이 지났거나 가까운데 actual transaction 연결이 없음
- 연체/확인 필요: 결제 실패를 직접 확인할 데이터가 없는 경우 “결제 실패”라고 단정하지 않고 “확인 필요”로 표시

## 13. 가용 잉여금과의 연결

가용 잉여금에는 계획 기간 안의 **미지급 확정 구독 의무**만 반영한다.

- 이미 actual expense transaction으로 결제된 occurrence를 다시 빼지 않는다.
- cancelled/ended 이후 occurrence는 빼지 않는다.
- skipped occurrence는 빼지 않는다.
- household scope는 현재 사용자의 responsibility split만 뺀다.
- unpaid tutoring receivable은 수입에 넣지 않는다.
- 계좌 간 transfer는 수입/지출에 넣지 않는다.

예:

```text
개인 구독 12,000원 미지급      -> 12,000 차감
공동 구독 30,000원, 내 몫 50% -> 15,000 차감
이미 카드/계좌에서 결제됨       -> ledger expense에 포함, obligation 재차감 금지
```

## 14. 알림

MVP는 앱 내부 reminder center가 기준이다.

- due in 7 days
- due in 30 days
- trial ending
- cancel-by soon
- unmatched/overdue review

Push/email delivery는 향후 기능이다. 작동하지 않는 notification toggle을 두지 않는다.

## 15. 유지·검토·취소 후보

사용자가 수동으로 선택:

```text
keep              계속 사용
review            검토 필요
cancel_candidate  취소 후보
```

허용되는 로컬 deterministic insight:

- 같은 카테고리에 active 구독이 2개 이상: “중복 여부 검토”
- 사용자가 입력한 last-used date가 오래됨: “최근 사용 여부 검토”
- trial cancel-by가 가까움
- 연간 결제처럼 큰 cash charge가 가까움

금지:

- 실제 사용 데이터를 보지 않았는데 “사용하지 않는다”고 단정
- 특정 상용 서비스로 교체 추천
- 광고/affiliate 우선순위
- 자동 취소
- 수익/절약 보장

모든 insight는 규칙과 source record를 설명하고 dismiss 가능해야 한다.

## 16. 핵심 사용자 흐름

### 새 구독

```text
구독 추가
→ 서비스/금액/주기/다음 결제 입력
→ 개인 또는 공동 선택
→ 공동이면 payer와 split 입력
→ 저장
→ bounded future occurrences 생성
```

### 계좌 결제 확인

```text
실제 출금 import
→ occurrence 후보와 근거 표시
→ 사용자 확인
→ occurrence paid
→ 공동이면 exactly one shared expense 연결
→ Home/Money/Household/Grow 합계 갱신
```

### 가격 변경

```text
금액 변경 + effective date
→ price history append
→ 과거 이력 보존
→ 미래 occurrence만 안전하게 반영
```

### 취소

```text
취소/종료일 입력
→ 영향 받을 미래 occurrence 미리보기
→ 확인
→ 이후 생성 중단
→ 과거 occurrence/transaction/shared expense 보존
```

## 17. 화면별 필수 상태

각 화면에 다음이 있어야 한다.

- loading skeleton
- empty state와 첫 구독 추가 CTA
- error + retry
- stale account/match data 표시
- unauthorized/not household member
- no upcoming charge
- disconnected bank provider에서도 수동 사용 가능

## 18. 보안과 프라이버시

- private subscription은 owner-only RLS.
- household subscription은 active member만 shared 필드를 읽는다.
- 개인 payment account/transaction detail은 roommate에게 숨긴다.
- URL/notes/descriptor는 출력 인코딩한다.
- mutation은 server authorization + Zod + RLS를 모두 거친다.
- 매칭, 취소, unlink, 가격 변경은 audit한다.
- OAuth/bank token을 subscription row에 저장하지 않는다.

## 19. 최소 테스트 매트릭스

```text
[ ] 모든 상태 전환과 forecast 포함/제외
[ ] 모든 카테고리 필터
[ ] 6개 cycle + custom days 월 환산
[ ] 7일/30일 날짜 경계
[ ] trial/cancel-by reminder 중복 방지
[ ] 개인/공동 RLS
[ ] 50:50/한 명 전부/custom every-KRW split
[ ] price history effective date
[ ] occurrence idempotent generation
[ ] 실제 transaction match confirm/dismiss/unlink
[ ] household occurrence -> max one shared expense
[ ] paid obligation double-subtraction 방지
[ ] cancelled/ended history 보존
[ ] roommate private account leakage 방지
[ ] no dead push/email control
```

## 20. 완료 기준

- SUB-001부터 SUB-020까지 구현·테스트·브라우저 증거가 있다.
- 월 구독료가 Money, Home, Household, Grow에 중복 없이 반영된다.
- 실제 은행 자격 없이 mock/manual transaction으로 전체 흐름이 동작한다.
- 사용자가 “앞으로 얼마가 언제 나가고, 내가 실제로 얼마를 부담하며, 어느 거래로 결제됐는지”를 추적할 수 있다.
