# Codex Handoff Checklist

이 체크리스트는 사양 팩을 Codex에 넘긴 뒤 “그럴듯한 화면 몇 개”에서 멈추지 않고, 실제 동작·데이터 무결성·RLS·브라우저 검증까지 완료시키기 위한 운영 절차다.

## A. 첫 세션 전

```text
[ ] ZIP을 새 Git 저장소 루트에 해제했다.
[ ] Node.js 22+, pnpm, Git, Docker/Supabase CLI, Codex CLI를 확인했다.
[ ] PowerShell에서는 scripts/bootstrap.ps1을 실행했다.
[ ] macOS/Linux에서는 scripts/bootstrap.sh를 실행했다.
[ ] requirements/requirements.json의 154개 요구사항 검사가 통과했다.
[ ] .codex/config.toml에 필요한 MCP만 활성화했다.
[ ] Supabase Agent Skills를 공식 명령으로 설치했다.
[ ] Supabase MCP는 local 또는 명시적인 dev project_ref이며 read-only로 시작한다.
[ ] 실제 은행·운영 Supabase·개인 캘린더 자격을 연결하지 않았다.
[ ] MASTER_CODEX_PROMPT.md를 수정하지 않고 첫 프롬프트로 사용할 준비가 됐다.
```

## B. Codex 첫 프롬프트

1. 저장소 루트에서 Codex를 시작한다.
2. `MASTER_CODEX_PROMPT.md` 전체를 붙여 넣는다.
3. Codex가 다음을 먼저 수행하는지 확인한다.

```text
- AGENTS.md와 필수 사양 읽기
- 현재 저장소 구조 확인
- Phase 00 요구사항 ID 열거
- 구현 계획 제시 후 실제 코드 작성 시작
- 사양 팩 삭제/축약 금지
- 외부 자격이 없어도 mock 경로 완성
```

Codex가 또 요구사항을 물어보며 멈추면 다음 재개 프롬프트를 사용한다.

```text
Read AGENTS.md, PROGRESS.md, and the active harness phase. Continue from the first unchecked requirement. Do not re-plan the whole product or wait for unavailable credentials. Implement the next complete vertical slice, run the required checks and real-browser verification, update evidence, and continue unless a destructive production action requires my approval.
```

## C. 매 Phase 종료 조건

```text
[ ] 해당 phase 파일의 모든 P0/P1 요구사항에 구현 파일과 테스트 증거가 있다.
[ ] schema/domain → server operation → UI → tests 순서의 수직 슬라이스다.
[ ] lint, typecheck, unit/integration, build가 통과한다.
[ ] 관련 Playwright 흐름을 360×800과 1440×900에서 검증했다.
[ ] RLS가 관련되면 두 사용자·비회원 공격 시나리오가 통과한다.
[ ] 빈/로딩/오류/권한없음/오프라인 또는 stale 상태가 있다.
[ ] 중복 실제 거래가 생성되지 않는다.
[ ] PROGRESS.md와 DECISIONS.md가 갱신됐다.
[ ] node scripts/check-spec-coverage.mjs가 통과한다.
[ ] node scripts/verify-pack.mjs가 통과한다.
```

## D. 모듈별 치명적 회귀 확인

### 과외

```text
[ ] 교과는 수학·물리·화학뿐이다.
[ ] 생기부 과외 subject는 null이다.
[ ] 화상/대면 기본값과 수업별 override가 있다.
[ ] 수업 상태는 예정/완료/취소뿐이며 보강이 없다.
[ ] 예정 수업에 준비 메모/체크리스트가 있다.
[ ] 완료를 재시도해도 receivable은 정확히 하나다.
[ ] 미수금은 현금 수입으로 잡히지 않는다.
[ ] Meet/location 액션이 모드에 맞다.
```

### 돈·계좌

```text
[ ] KRW는 정수 bigint/numeric으로 처리한다.
[ ] 수입/지출/이체가 분리된다.
[ ] 내 계좌 간 이체는 두 leg이며 수입·지출에서 제외된다.
[ ] 잔액과 입출금은 freshness/stale 시간을 표시한다.
[ ] CSV 재수입은 중복을 만들지 않고 formula injection을 방어한다.
[ ] 은행 기능은 조회 전용이며 송금 endpoint가 없다.
```

### 구독

```text
[ ] 월 환산·향후 12개월·7/30일·trial/cancel-by·미매칭/연체가 있다.
[ ] status/category/cycle/필드가 사양과 정확히 일치한다.
[ ] 계약과 occurrence와 실제 거래가 분리된다.
[ ] 가격 변경은 history를 남긴다.
[ ] 개인/공동과 payer/split이 분리된다.
[ ] 공동 구독 occurrence 하나가 shared expense를 최대 하나만 만든다.
[ ] 취소 후 과거 결제 이력은 보존된다.
```

### Grow

```text
[ ] 안전자금/장기 적립/자유자금 세 버킷만 제공한다.
[ ] 적립 완료는 expense가 아니라 transfer다.
[ ] 실제 입금 수입만 가용 잉여금에 들어간다.
[ ] 공동비는 내가 부담할 몫을 반영한다.
[ ] 이미 결제된 구독/고정비를 이중 차감하지 않는다.
[ ] 매수/매도/추천/수익 보장 기능이 없다.
```

### 자취방

```text
[ ] 냉장/냉동/상온과 내 것/친구 것/공용을 구분한다.
[ ] 닭가슴살과 냉장·상온으로 나뉜 Monster demo가 있다.
[ ] 수량 +/-는 음수가 되지 않고 재시도에 안전하다.
[ ] 청소 담당/주기/마지막/다음/상태/완료 이력이 있다.
[ ] 공동비의 실제 결제자와 부담 분할이 분리된다.
[ ] 모든 1원이 정확히 분할되고 순정산/부분정산이 된다.
[ ] 친구에게 개인 계좌·거래 세부가 노출되지 않는다.
```

## E. 외부 통합 승인 게이트

Codex가 다음 행동을 하려면 사용자의 별도 승인이 필요하다.

```text
- Production Supabase 변경
- 실제 KFTC production 활성화
- 실제 금융/개인 데이터를 MCP에 연결
- Vercel Production 배포
- Git push, PR 생성/병합
- OAuth scope 확대
- 돈 이동, 자동이체, 투자 주문
```

자격이 없을 때 허용되는 완료 상태:

```text
- typed adapter interface
- mock/manual provider
- contract tests
- OAuth 시작/콜백 skeleton
- 설정 UI와 disconnected/stale/error states
- 실연동 runbook
```

## F. 최종 출시 전

```text
[ ] 154개 요구사항 각각에 증거가 있거나 P2 backlog로 명시됐다.
[ ] 모든 P0/P1이 구현됐다.
[ ] 모든 주요 버튼이 실제 작동하거나 명확히 disabled/deferred다.
[ ] 전체 RLS adversarial matrix가 통과한다.
[ ] 접근성, 키보드, 모바일 touch target 검증이 통과한다.
[ ] export/delete, secret scan, dependency/migration scan이 통과한다.
[ ] 대시보드 합계가 상세 화면과 일치한다.
[ ] Preview에서만 최종 smoke를 수행했다.
[ ] Production 전환은 별도 사용자 승인 단계다.
```
