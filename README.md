# Student OS — Codex Full-Build Specification Pack

`Student OS`는 과외 운영, 개인 현금흐름, 계좌 현황, 월 구독료, 월 잉여금 배분, 친구와 사는 자취방 운영을 하나의 중복 없는 데이터 흐름으로 묶는 한국어 PWA의 개발 사양이다.

이 저장소는 완성 앱 자체가 아니라 **Codex가 완성 앱을 구현하도록 만드는 실행 가능한 핸드오프 팩**이다. 제품 요구사항, 정보구조, 데이터 모델, Supabase migration 초안, OpenAPI 계약, RLS 원칙, 테스트 시나리오, 단계별 빌드 하네스, MCP/스킬 설치법, 누락 검사를 포함한다.

## 현재 팩 상태

- 대화 파생 요구사항: 154개
- 우선순위: P0 131개, P1 17개, P2 backlog 6개
- 실행 단계: Phase 00–09 + 명시적 backlog
- 기본 UI: 한국어, KRW, Asia/Seoul, mobile-first PWA
- 검증: 요구사항 traceability + 필수 파일/계약/보안 기본값 + SHA-256 manifest

## 시작

1. `START_HERE.md`를 읽는다.
2. `MCP_AND_SKILLS_SETUP.md`의 최소 도구만 구성한다.
3. `scripts/bootstrap.ps1` 또는 `scripts/bootstrap.sh`를 실행한다.
4. Codex CLI를 저장소 루트에서 연다.
5. `MASTER_CODEX_PROMPT.md` 전체를 첫 프롬프트로 전달한다.
6. Phase 00부터 Phase 09까지 `harness/build` 순서로 진행한다.

## 핵심 불변식

- `Lesson -> Receivable -> FinancialTransaction`을 분리한다.
- `Subscription -> SubscriptionOccurrence -> FinancialTransaction/SharedExpense`를 분리한다.
- 이체는 지출이 아니다.
- 공동비의 실제 결제자와 경제적 부담자는 다를 수 있다.
- 생기부 과외는 과목이 없고, 교과 과외 과목은 수학·물리·화학뿐이다.
- 수업 상태는 예정·완료·취소뿐이며 보강 개념은 없다.
- 은행 연동은 조회 전용이고 실제 송금 기능을 만들지 않는다.
- Grow는 월 잉여금 배분/기록이며 거래 실행이나 수익 보장을 하지 않는다.
- roommate는 공동 데이터를 볼 수 있지만 다른 사람의 private bank ledger를 볼 수 없다.
- Home은 자체 금액을 저장하지 않고 각 source record에서 계산한다.

## 주요 파일

- `MASTER_CODEX_PROMPT.md`: 전체 구현 지시
- `requirements/requirements.json`: 요구사항 원장
- `PRODUCT_REQUIREMENTS.md`: 사람이 읽는 요구사항
- `INFORMATION_ARCHITECTURE.md`: 전체 위계
- `SUBSCRIPTIONS_SPEC.md`: 월 구독료 상세 사양
- `DATA_MODEL.md`, `DOMAIN_RULES.md`: 데이터와 계산 규칙
- `supabase/migrations`: SQL 출발점
- `docs/openapi.yaml`: API 계약
- `harness/build`: 단계별 실행 프롬프트
- `MCP_AND_SKILLS_SETUP.md`: 도구 설정
- `CODEX_HANDOFF_CHECKLIST.md`: 운영 체크리스트
- `TRACEABILITY_MATRIX.md`: 요구사항 증거 추적

## 팩 검증

```bash
node scripts/check-spec-coverage.mjs
node scripts/generate-manifest.mjs
node scripts/verify-pack.mjs
```

검증은 154개 ID의 중복·누락, product spec/master prompt/phase 추적성, JSON/OpenAPI/SQL 핵심 구조, 구독·과외·돈 불변식, MCP 안전 기본값, 파일 checksum을 확인한다.

## 앱 구현 후 Codex가 추가해야 할 것

- 실제 Next.js source와 lockfile
- `pnpm verify`
- Supabase local config 및 DB/RLS tests
- Vitest/Testing Library tests
- Playwright E2E 및 접근성 smoke
- CI workflow 활성화
- Preview deployment runbook

실제 외부 자격이 없어도 mock calendar, mock/manual bank provider, demo household data로 모든 핵심 사용자 흐름이 동작해야 한다.
