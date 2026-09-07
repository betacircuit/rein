# Student OS Codex Build Pack — START HERE

이 번들은 지금까지 대화에서 확정한 요구사항을 **누락 방지형 개발 사양**으로 바꾼 것이다. 임시 제품명은 `Student OS`다. 완성 앱은 과외 운영, 돈·계좌·구독, 월 잉여금 배분, 친구와 사는 자취방 운영을 하나의 데이터 흐름으로 묶는 한국어 PWA다.

## 1. 가장 빠른 사용법

### Windows PowerShell

```powershell
Expand-Archive .\student-os-codex-pack.zip -DestinationPath .\student-os
Set-Location .\student-os
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\bootstrap.ps1 -InstallSupabaseSkills
codex mcp list
codex
```

### macOS/Linux

```bash
unzip student-os-codex-pack.zip -d student-os
cd student-os
./scripts/bootstrap.sh --install-supabase-skills
codex mcp list
codex
```

Codex가 열리면 `MASTER_CODEX_PROMPT.md` 전체를 첫 메시지로 붙여 넣는다. Phase 00부터 Phase 09까지 진행하게 한다. 외부 키가 없는 Google·KFTC 연동은 mock/manual adapter로 완성하게 하며, 실제 운영 자격을 기다리느라 구현을 멈추게 하지 않는다.

## 2. 반드시 읽을 파일 순서

Codex는 `AGENTS.md`에 따라 다음을 읽는다.

1. `GOALS.md`
2. `PRODUCT_REQUIREMENTS.md`
3. `INFORMATION_ARCHITECTURE.md`
4. `DOMAIN_RULES.md`
5. `UI_UX_SPEC.md`
6. `DATA_MODEL.md`
7. `API_INTEGRATIONS.md`
8. `SUBSCRIPTIONS_SPEC.md`
9. `SECURITY_PRIVACY.md`
10. `ACCEPTANCE_CRITERIA.md`
11. `TRACEABILITY_MATRIX.md`
12. `PLANS.md`와 현재 `harness/build/phase-*.md`

## 3. 핵심 산출물 지도

| 파일/폴더 | 역할 |
|---|---|
| `MASTER_CODEX_PROMPT.md` | Codex에 그대로 붙이는 전체 빌드 프롬프트 |
| `AGENTS.md` | 저장소에서 항상 적용되는 에이전트 규칙 |
| `requirements/requirements.json` | 154개 요구사항의 기계 판독 원장 |
| `PRODUCT_REQUIREMENTS.md` | 제품 요구사항 표 |
| `INFORMATION_ARCHITECTURE.md` | 전체 플랫폼·화면 위계 |
| `SUBSCRIPTIONS_SPEC.md` | 월 구독료 상세 위계·상태·계산·공동비 연결 |
| `DATA_MODEL.md` | 엔터티·관계·금액/날짜 모델 |
| `DOMAIN_RULES.md` | 이중계상 방지와 업무 불변식 |
| `docs/openapi.yaml` | 서버 계약 초안 |
| `supabase/migrations/*` | DB enum/table/function/RLS/seed 초안 |
| `harness/build/*` | Phase 00–09 실행 체크리스트 |
| `TRACEABILITY_MATRIX.md` | 요구사항 → 단계 → 증거 연결 |
| `MCP_AND_SKILLS_SETUP.md` | Codex MCP·공식 스킬 설치법 |
| `CODEX_HANDOFF_CHECKLIST.md` | 세션 운영·완료 판정 체크리스트 |
| `scripts/check-spec-coverage.mjs` | 요구사항 누락·중복 검사 |
| `scripts/verify-pack.mjs` | 파일·계약·보안 기본값·checksum 검사 |
| `SPEC_MANIFEST.json` | 전체 파일 SHA-256 manifest |

## 4. 이 번들이 고정하는 데이터 원칙

```text
Lesson -> Receivable -> allocation -> actual FinancialTransaction
Subscription -> SubscriptionOccurrence -> actual FinancialTransaction
                                    -> one SharedExpense if household scoped
SharedExpense -> member splits -> Settlement -> actual FinancialTransaction
Grow plan -> contribution -> two-leg transfer between own accounts
```

- 수업한 사실과 실제 입금은 다르다.
- 미래 구독 청구와 실제 출금은 다르다.
- 이체는 지출이 아니다.
- 공동비는 실제 결제자와 경제적 부담자가 다를 수 있다.
- 같은 실제 거래는 여러 모듈에 표시돼도 한 번만 계산한다.

## 5. 대화 요구사항 보존 확인

- 사용자 기본: 최재원, 서울대학교 전기정보공학부 2학년, 한국어·KRW·Asia/Seoul.
- 과외: 교과/생기부, 교과는 수학·물리·화학만, 화상/대면, 수업 준비 메모, 보강 없음, Google Meet, 미수금·실질 시급.
- 돈: 계좌 잔액·입출금·보유액, 수입/지출/이체, 조회 전용 은행 adapter, 정산·매칭.
- 구독: 월 환산·향후 12개월·7/30일·체험/취소 마감·가격 이력·개인/공동·실제 거래 매칭.
- Grow: 과외 고정 수입과 실제 지출·공동 부담을 반영한 가용 잉여금, 안전자금/장기 적립/자유자금.
- 자취: 친구와 투룸, 냉장고/재고, 닭가슴살과 일부만 냉장한 Monster, 청소, 공동비, exact split과 정산.
- 홈: 오늘 수업·준비·돈·구독·집 상태와 확인할 매칭을 행동 우선으로 통합.

## 6. 검증 명령

```bash
node scripts/check-spec-coverage.mjs
node scripts/generate-manifest.mjs
node scripts/verify-pack.mjs
```

초기 앱 코드가 생성된 뒤 Codex가 `pnpm verify`를 만들고 lint, typecheck, unit/integration, browser tests, build를 묶어야 한다.

## 7. 산출물 성격과 한계

이 번들은 완성 앱 소스가 아니라 **제품 사양 + Codex 실행 프롬프트 + 에이전트 하네스 + 초기 DB/API 설계 + 검증 도구**다. 제공 SQL은 구현 출발점이므로 Codex가 로컬 Supabase에 실제 적용하고 RLS/함수/트랜잭션 테스트를 거쳐 수정해야 한다. KFTC production, 실제 Google OAuth, Vercel Production은 자격·비밀키·사용자 승인이 있어야 마지막 연결을 수행한다.
