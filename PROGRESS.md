# Progress

### 2026-09-05 — 기능·디자인 동결 안정화

- 인증 만료 예외를 안전한 비로그인 상태로 복구하고, 로그인·인증 경계에서 PWA 개인 캐시를 제거하도록 보강했다.
- 서울 기준 날짜·요일 계산을 공용화해 청소, 구독, 알림, 시간표의 고정 날짜를 제거했다. RAINY 일일 저장소는 손상 데이터 검증, 날짜 전환 쓰기 차단, 삭제·변경된 서버 일정 재동기화를 적용했다.
- Groq 시스템 프롬프트 파일 읽기를 프로세스 단위로 재사용하고 불필요한 모노 폰트 프리로드를 끄되, UI 구조·디자인·기능 흐름은 변경하지 않았다.

### 2026-09-04 — Expandable RAINY operator and tutoring resources

- Added the symmetric collapsed rail, click-to-expand desktop chat, accessible mobile drawer, focus boundary, right-aligned unrotated REINY artwork, multi-layer execution burst, and a measured 0–100 loading bar inside the existing workspace.
- Added physical-keyboard PIN entry, validated Google Meet/Sheets tutoring links, the supplied system artwork across login/app backgrounds, and desktop/mobile browser coverage.

### 2026-09-04 — RAINY rail final visual correction

- Removed the cyan brand plate and telemetry labels, enlarged both RAINY graphics by 30 percent without rotation, matched the 240px chat and navigation widths, added the black avatar treatment and animated thinking ellipsis, and constrained the opaque loading surface to the existing gray workspace.

## Current phase

Supabase 실사용 전환 – 앱 연결과 핵심 UI 완료; 원격 migration·사용자 생성 승인 대기

## Status

- [x] Phase 00 app and quality foundation complete
- [x] Transparent local demo authentication and encrypted session boundary implemented
- [x] Profile onboarding and create/join household browser journeys implemented
- [x] Owner/member and invited/active/left domain transitions covered by automated tests
- [x] Phase 01 RLS migration and adversarial pgTAP test written and statically validated
- [ ] Phase 01 migration and pgTAP verified against a live local database — Docker Desktop containerd read-only failure blocks reset/start
- [ ] Phase 01 complete — remains open until the live local RLS suite passes
- [x] Phase 02 student, schedule, lesson, preparation, location, and mock Calendar vertical slices implemented
- [x] Phase 02 owner-only SQL invariants, deterministic recurrence RPC, and adversarial pgTAP suite written and statically validated
- [x] Phase 02 unit, browser, build, security, specification, and repository-boundary checks pass
- [ ] Phase 02 migration and pgTAP verified against a live local database — Docker/local Postgres remains unavailable
- [ ] Phase 02 complete — remains open until the live local RLS suite passes
- [x] Phase 03 local account, transaction, transfer, receivable, allocation, matching, category, and CSV vertical slices implemented
- [x] Phase 03 SQL invariants, confirmation/import RPCs, and adversarial pgTAP suite written and statically validated
- [x] Phase 03 unit, browser, lint, type, build, and migration checks pass
- [ ] Phase 03 migration and pgTAP verified against a live local database — Docker/local Postgres remains unavailable
- [ ] Phase 03 complete — remains open until the live local database suite passes
- [x] Phase 04 local subscription CRUD, renewal dashboard, occurrence calendar, manual review, and explicit matching vertical slices implemented
- [x] Phase 04 effective-price, occurrence, terminal-state, household split, and matching SQL contracts written and statically validated
- [x] Phase 04 unit, browser, lint, type, build, migration, security, and specification checks pass
- [ ] Phase 04 migration and pgTAP verified against a live local database — Docker/local Postgres remains unavailable
- [ ] Phase 04 complete — remains open until the live local database suite passes
- [x] Phase 05 local household overview, inventory CRUD/adjustment, shopping linkage, and cleaning recurrence vertical slices implemented
- [x] Phase 05 atomic inventory, idempotent low-stock/shopping, append-only cleaning, actor binding, and RLS SQL contracts written and statically validated
- [x] Phase 05 unit, browser, lint, type, build, migration, security, and specification checks pass
- [ ] Phase 05 migration and pgTAP verified against a live local database — Docker/local Postgres remains unavailable
- [ ] Phase 05 complete — remains open until the live local database suite passes
- [x] Phase 06 local shared-expense CRUD, exact payer/split editing, settlement matching, and transaction classification vertical slices implemented
- [x] Phase 06 responsibility-adjusted Money analytics/Grow projection and source-row reconciliation implemented
- [x] Phase 06 actor-bound mutation, immutable settled history, exact split, owner-private allocation, and RLS SQL contracts written and statically validated
- [x] Phase 06 unit, browser, lint, type, build, migration, security, and specification checks pass
- [ ] Phase 06 migration and pgTAP verified against a live local database — local Postgres remains unavailable at `127.0.0.1:54322`
- [ ] Phase 06 complete — remains open until the live local database suite passes
- [x] Phase 07 Grow formulas, session-local plan, contribution transfer, three-bucket UI, and asset reconciliation vertical slice implemented
- [x] Phase 07 dynamic action-first Home, month analytics, deterministic subscription insights, and Grow UI implemented
- [x] Phase 07 actor-bound Grow RPCs, exact surplus/asset/hourly views, RLS, and adversarial pgTAP suite written and statically validated
- [x] Phase 07 unit, browser, lint, type, build, migration, security, and specification checks pass
- [ ] Phase 07 migration and pgTAP verified against a live local database — local Postgres remains unavailable at `127.0.0.1:54322`
- [ ] Phase 07 complete — remains open only until the live local database suite passes
- [x] Phase 08 typed Calendar/read-only bank ports, deterministic mock path, bounded retry/redaction primitives, and hard production gate implemented
- [x] Phase 08 local integration status/sync/disconnect UI and focused unit/browser tests pass
- [x] Phase 08 KFTC testbed mapping, server-only secret-reference contract, retry-safe integration SQL/RLS, operator runbook, and failure-state browser coverage implemented
- [x] Phase 08 unit, browser, lint, type, build, migration, security, and specification checks pass
- [ ] Phase 08 migration and pgTAP verified against a live local database — local Postgres remains unavailable at `127.0.0.1:54322`
- [ ] Phase 08 complete — remains open only until the live local database suite passes
- [x] Phase 09 settings, in-app reminders, card account, privacy export/deletion, and disclaimer surfaces implemented
- [x] Phase 09 Korean copy, shared date formatting, progressive forms, confirmation boundaries, responsive navigation, accessibility, useful empty states, and no-dead-control checks implemented
- [x] Phase 09 private offline cache with honest read-only fallback and network-required write refusal implemented
- [x] Phase 09 structured redaction, abuse-prone mutation rate limits, project-scoped read-only MCP example, reconciliation audit, dependency/secret/migration checks, and database-security CI job implemented
- [ ] Phase 09 migration and pgTAP verified against a live local database — local Postgres remains unavailable at `127.0.0.1:54322`
- [ ] Phase 09 preview environment deployed and verified — no Vercel/Supabase preview target or deployment authority was provided; production deployment remains prohibited without separate confirmation
- [ ] Phase 09 complete — remains open until live database and preview-environment evidence pass

## Evidence log

### 2026-09-04 — Supabase 실사용 전환과 주간 시간표

- 로컬 앱은 `REIN / main`의 URL과 publishable key를 `.env.local`에서 사용하며 `DEMO_MODE=false`로 실행한다. service-role key는 사용하지 않는다.
- 로그인은 `@supabase/ssr` 쿠키 세션과 검증된 사용자 조회를 사용한다. 앱 로그인 ID는 최재원·김태현 실명이고 Supabase 내부 이메일 별칭으로 매핑된다.
- 최재원의 첫 로그인은 `재원·태현 자취방`과 김태현 초대를 만들고, 김태현의 첫 로그인은 해당 초대를 수락하도록 연결했다.
- 기본 메뉴를 시간표·학생·우리집·설정으로 줄이고 데모 배지, 빠른 추가, 장문 안내를 제거했다. 이전 데모 전용 하위 화면은 로그인 사용자를 새 원격 화면으로 리디렉션한다.
- 학생 추가를 Supabase `students` 쓰기로 전환했다. 주 시간표는 요일과 시작·종료 시각을 1분 단위로 입력받아 분 단위 duration으로 저장하며, 데스크톱 주간 그리드와 모바일 요일 목록을 제공한다.
- 검증: Prettier, ESLint, TypeScript, Vitest 23개 파일/111개 테스트, 14개 migration/34개 RLS 보호 테이블 정적 검사, 1,266개 파일 secret 검사, 51개 라우트 프로덕션 빌드, 154개 요구사항/286개 파일 checksum이 통과했다. Chrome에서 새 실명·비밀번호 로그인 화면을 확인했다.
- 원격 상태: publishable key 연결은 성공했지만 `public.profiles` 조회가 `PGRST205`로 반환되어 원격 스키마가 비어 있고 Authentication 사용자도 0명임을 확인했다. CLI는 현재 다른 Supabase 조직으로 로그인되어 있어 `iuyutpgehoalxbhjokqe` 링크와 migration 배포를 수행하지 않았다.
- 보안 경계: `0036`은 Supabase 최소 길이를 충족하지 않고 두 사람이 공유하기에 안전하지 않아 적용하지 않았다. 서로 다른 8자 이상 비밀번호와 프로덕션 migration 배포의 명시 확인이 필요하다.
- 리뷰 제약: autoreview는 Windows TruffleHog snapshot의 `file changed while reading` 오류로 모델 리뷰 전에 종료됐다. 이 실패를 리뷰 통과로 기록하지 않는다.

### 2026-09-04 — Phase 09 release hardening continuation

- 범위: `CORE-006`, `MON-018`, `SUB-020`, `GROW-012`, `HOM-020`, `INT-009`, `UX-001`–`UX-010`, `SEC-006`–`SEC-012`의 23개 요구사항을 구현 및 재대조했다.
- 설정과 제품 경계: `src/app/settings/**`, `src/app/privacy/page.tsx`, `src/app/money/account-form.tsx`, `supabase/migrations/0013_hardening_privacy.sql`에 설정 계층, 앱 내 알림, 카드 유형, 소유/공유 관련 JSON 내보내기, 명시적 삭제 확인·보존 설명, 정보성 금융 수치와 비은행·비증권·비세무·비자문 고지를 구현했다. `GROW-012`와 `HOM-020`은 매매/브로커 자격증명 및 바코드/OCR 경로가 없음을 정적 계약 테스트로 확인한다.
- UX와 접근성: `src/lib/format/date.ts`로 한국 날짜/시각과 서울 기준 입력 포맷을 중앙화하고 한국어 화면의 불필요한 영어 eyebrow를 제거했다. `src/components/ui/confirm-action.tsx`를 삭제·수업 상태·입금/구독 매칭·정산·공동비 분류·연동 해제·반복 일정 생성·Grow 건너뛰기/취소에 적용했다. 핵심 빈 화면에는 첫 수업, 첫 구독, 거래 가져오기 같은 다음 동작을 연결했다.
- PWA: `public/sw.js`는 공개 셸과 세션별 private cache를 분리하고 cache 기록을 완료까지 기다린다. 오프라인 navigation은 캐시된 최근 HTML에 명시적 offline snapshot 표식을 넣어 반환하며, `src/components/pwa-runtime.tsx`는 브라우저 네트워크 플래그와 이 표식을 함께 확인해 서버 쓰기를 차단하고 성공으로 가장하지 않는다.
- 보안: `src/lib/security/logger.ts`의 민감 필드 기본 redaction, `src/lib/security/rate-limit.ts`의 로컬 데모 사용자별 로그인/온보딩/CSV/매칭/연동 제한, Next Server Action 세션·동일 출처 경계, Zod 서버 재검증을 결합했다. 이 메모리 제한기는 단일 프로세스 로컬 데모용이며 실제 분산 배포 전 공유 저장소/edge 제한기로 교체해야 한다.
- 감사 이력: `supabase/migrations/0014_reconciliation_audit.sql`은 receivable, subscription occurrence, shared expense, settlement match suggestion이 confirmed로 바뀔 때 actor, timestamp, source transaction/evidence, prior/new linkage를 append-only audit에 기록한다. Phase 03/04/06 pgTAP에 실제 수취·구독·정산 확인 감사 단언을 추가했다.
- CI와 운영 경계: `.github/workflows/ci.yml`은 dependency audit와 전체 앱 게이트 외에 격리된 Supabase를 시작해 migration lint 및 전체 RLS/pgTAP을 실행한다. `.mcp.json.example`은 development project ref, `read_only=true`, database/docs 기능만 허용하며 운영 연결 금지를 명시한다. `docs/preview-release-runbook.md`는 별도 preview 데이터베이스, 합성 데이터, 모바일/가로/데스크톱 검증, 운영 승격의 별도 명시 승인을 요구한다.
- 자동 증거: `src/lib/release/phase09-contract.test.ts`, `src/components/ui/confirm-action.test.tsx`, `src/lib/format/date.test.ts`, `src/lib/security/rate-limit.test.ts`, `src/lib/security/logger.test.ts`, `src/lib/data-operations/local-account.test.ts`, `e2e/phase-09.spec.ts`, `supabase/tests/phase09_hardening.sql`에 모든 Phase 09 ID가 이름 또는 직접 단언으로 연결된다. Phase 09 집중 브라우저 실행은 첫 선택자 오류를 수정한 뒤 확인 대화 재검증 2/2가 통과했고, 최종 전체 게이트 결과는 이 항목의 후속 closeout에 기록한다.
- 외부 미검증: 원격 Vercel/Supabase에 배포하거나 쓰지 않았다. Docker/local Postgres와 preview 대상이 없어 migration/RLS의 실제 실행 및 preview URL 증거는 아직 확보하지 못했으며, 이 두 항목을 통과하기 전에는 Phase 09 완료로 표시하지 않는다.
- 최종 closeout: `pnpm verify`가 종료 코드 0으로 통과했다. 결과는 Prettier, ESLint, `next typegen`+TypeScript, Vitest 21개 파일/105개 테스트, 14개 migration/34개 RLS 보호 테이블 정적 검사, 188개 파일 과외 경계 검사, 1,002개 파일 secret 검사, Next.js 프로덕션 빌드 50개 라우트, 154개 요구사항 명세/270개 파일 checksum 검증, Playwright 모바일·데스크톱 94개 테스트 통과다. 집중 Phase 09 브라우저 묶음도 16/16을 통과했다.

### 2026-09-04 — REIN 브랜드와 산업 브루탈리즘 UI

- 제품 표시명, PWA 메타데이터, 아이콘, 패키지명, 오프라인 캐시/내보내기 식별자, Supabase 내부 이메일 별칭을 `Student OS`에서 `REIN`으로 변경했다. 역사적 요구사항 문서와 migration 주석은 변경 이력 보존을 위해 그대로 둔다.
- 사용자 제공 레퍼런스에 맞춰 검은 데스크톱, 종이색 작업 창, 2px 검은 구획선, 하드 섀도, 직각 기하, 모노스페이스 메타 라벨, 시안·주황·마젠타 상태색으로 전역 토큰과 공통 셸·버튼·상태·주요 화면을 재설계했다. Lucide 아이콘, 44px 이상 조작 영역, 명시적 form label, focus outline, reduced-motion 처리는 유지했다.
- `industrial-brutalist-ui` 스킬은 설치 전에 GitHub 원본의 `SKILL.md`와 MIT `LICENSE`를 검토했고, 실행 스크립트·훅·추가 자산이 없음을 확인한 뒤 프로젝트 `.agents/skills/industrial-brutalist-ui`에 두 파일 전체를 설치·검증했다.
- 주 시간표의 HTML time 입력 step을 60초로 바꿔 `13:25` 같은 임의 분 단위 시작·종료 시각을 정확히 저장·배치한다. 서버의 `HH:mm` 검증, 15–600분 수업 길이 제한, 분 단위 위치 계산은 유지한다.
- 검증: Prettier, ESLint, `next typegen`+TypeScript, Vitest 23개 파일/111개 테스트, 14개 migration/34개 RLS 보호 테이블, 202개 과외 경계 파일, 1,271개 비밀 검사, 154개 요구사항 추적성, 59개 라우트 프로덕션 빌드가 통과했다. Chromium으로 1440×900과 390×844의 로그인/공통 셸을 렌더링해 검은 데스크톱, 창 구획, 폼, 하단 내비게이션을 확인했다.
- 리뷰 제약: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`은 Windows 작업트리 snapshot의 `file changed while reading`으로 TruffleHog 단계에서 중단되어 모델 리뷰가 시작되지 않았다. 저장소 자체의 비밀 검사와 전체 자동 검증은 통과했지만 autoreview 통과로 기록하지 않는다.

### 2026-09-02 — Phase 00 foundation continuation

- 범위: `CTX-001`, `CTX-002`, `CTX-005`, `CTX-006`, `CORE-001`, `CORE-002`, `CORE-003`, `CORE-004`, `CORE-007`, `CORE-008`, `CORE-009`, `CORE-010`, `SEC-004`.
- 기반: Next.js App Router, TypeScript strict mode, pnpm lockfile, ESLint, Prettier, Vitest, Playwright, Supabase CLI 설정을 추가했다.
- 앱 셸: `src/components/app-shell.tsx`와 `src/app/globals.css`에 데스크톱 사이드바, 모바일 하단 내비게이션, 한국어 디자인 토큰, 건너뛰기 링크, 전역 빠른 추가를 구현했다. 최상위 내비게이션은 홈, 과외, 돈, 우리집, 설정의 다섯 항목으로 고정했다.
- 빠른 추가: 수업, 과외비, 지출, 구독, 가계 기여금, 공동지출의 여섯 진입점을 `src/components/quick-add.tsx`에 구현했다.
- 핵심 규칙: `src/domain/money/krw.ts`, `src/domain/formulas.ts`, `src/domain/records.ts`에 KRW 정수 금액, 반올림, 구독 월 환산, 이체 제외 현금흐름, 가구 크레딧, 도메인 레코드 분리 규칙을 구현했다.
- 안전장치: `src/lib/runtime-safety.ts`에서 기본 `ko-KR`/`KRW`/`Asia/Seoul`, KFTC 프로덕션 차단, 로컬이 아닌 Supabase 쓰기 차단을 검증한다. 외부 자격증명 없이 동작하는 최재원 데모 페르소나와 명시적 데모 상태를 제공한다.
- 데이터 상태: 로딩, 빈 상태, 오류, 오프라인, 오래된 데이터 상태와 복구 동작을 구현했다.
- 데이터베이스 정적 검증: `pnpm migrations:check` 통과 — 4개 마이그레이션과 29개 보호 테이블의 RLS 활성화/정책 존재를 확인했다. `supabase/tests/phase00_schema_smoke.sql`에 pgTAP 스모크 테스트를 추가했다.
- 보안 정적 검증: `pnpm secrets:check` 통과 — 소스와 번들 대상에서 알려진 비밀 패턴을 검사했다. 원격 Supabase 쓰기와 프로덕션 배포는 수행하지 않았다.
- 품질 결과: `pnpm lint`, `pnpm typecheck`, `pnpm test`(6개 파일, 14개 테스트), `pnpm build`, `pnpm spec:verify`, `pnpm peers check`, `pnpm test:e2e`(8개 테스트) 통과. Playwright는 360px 모바일, 데스크톱 내비게이션/키보드, PWA manifest, 상태 패턴을 검증했다. 프로덕션 빌드는 375×812 세로, 812×375 가로, 1440×1000 데스크톱에서 추가로 캡처해 레이아웃을 확인했다.
- 알려진 제약: `supabase start`는 이미지 다운로드 후 Docker Desktop containerd의 읽기 전용 파일시스템/입출력 오류와 C: 드라이브 공간 소진으로 실패했다. 따라서 `db:reset`, `db:lint`, `db:test`, `db:types`의 실제 로컬 DB 실행 증거는 아직 없다. Docker 상태 복구와 여유 공간 확보 후 이 네 명령을 다시 실행해야 한다.
- 전체 게이트: 자동 생성된 Next.js 지침 블록으로 인한 manifest 불일치를 원본 복원으로 해결한 뒤 `pnpm verify` 전체 묶음이 종료 코드 0으로 통과했다.

### 2026-09-02 — Phase 01 authentication and household boundary

- 범위: `CTX-003`, `HOM-001`, `HOM-002`, `SEC-001`, `SEC-002`.
- 요구사항 매핑: `src/domain/household/membership.ts`는 소유자/멤버 및 초대/활성/탈퇴 전이와 개인/공유 조회 경계를 담당한다. `supabase/migrations/0005_auth_household_boundary.sql`은 원자적 가구 생성, 소유자 초대, 본인 수락, 멤버 탈퇴 RPC와 전이 트리거/RLS를 담당한다. `src/app/login`, `src/app/onboarding`, `src/app/settings/profile`, `src/app/settings/household`은 사용자 여정을 담당한다.
- 인증: 외부 자격증명이 없을 때만 사용하는 로컬 데모 인증을 구현했다. 세션과 온보딩 상태는 AES-256-GCM으로 봉인한 HttpOnly/SameSite 쿠키에 8시간만 저장하며, 온보딩 상태는 해당 세션 사용자 ID에 결속한다. 새 계정 로그인은 이전 온보딩 쿠키를 제거하고, 위조 쿠키는 보안 확인 페이지에서 거부한다. 실제 Supabase 자격증명이 없는 상태를 성공으로 가장하지 않고 모든 인증 화면에 로컬 데모임을 표시한다.
- 가구 경계: 두 칸 임대주택과 한 명의 룸메이트를 기본 시나리오로 제공하되 멤버 수를 스키마에서 둘로 제한하지 않는다. 초대 이메일은 `invited` 동안만 저장되고 활성화 시 제거된다. 멤버 ID와 역할은 일반 업데이트로 바꿀 수 없으며 초대 수락은 로그인 이메일이 일치하는 본인에게만 허용한다.
- 권한: 계좌, 거래, 은행 연결, 개인 구독은 소유자 전용 정책을 유지한다. 우리집과 운영 레코드는 활성 멤버만 읽으며 비회원, 초대 대기, 탈퇴 멤버는 거부한다. 가구/멤버 생성과 멤버십 제거는 RPC와 상태 전이만 허용해 직접 INSERT/DELETE로 초대 수락이나 이력 보존을 우회할 수 없게 했다.
- 테스트: 도메인 단위 테스트 5개를 추가해 총 19개 단위/컴포넌트 테스트가 통과했다. `supabase/tests/phase01_household_rls.sql`에는 비인증, 교차 사용자, 비회원, 초대 수락, 활성 공유 조회, 개인 재무 거부, 탈퇴 후 거부, 직접 가구/멤버 생성과 멤버십 삭제 거부를 포함한 22개 pgTAP 단언을 작성했다. 정적 마이그레이션 검사는 5개 migration과 29개 RLS 보호 테이블을 확인한다.
- 브라우저: `/` 비인증 리다이렉트, 위조 쿠키 거부, 소유자 프로필/가구 생성/초대, 룸메이트 초대 수락, 개인 재무 비공개, 새 데모 계정의 이전 온보딩 상태 격리를 모바일·데스크톱 Chromium에서 검증했다. 최종 `pnpm verify` 결과는 아래 closeout에 기록한다. 로그인·온보딩·우리집 화면을 375×812, 1440×1000, 812×375 가로/reduced-motion/125% 글자 크기에서 추가 캡처했고 가로 넘침이 없음을 확인했다.
- 로컬 DB 차단: 첫 `supabase start`에서 0001–0004 적용까지는 확인했으나 손상된 Studio 이미지 때문에 헬스체크가 실패했다. Studio를 로컬 설정에서 비활성화했지만 후속 `db:reset` 중 Docker containerd 메타데이터 저장소가 다시 read-only가 되어 DB 컨테이너 제거와 54322 재접속이 실패했다. 최종 `pnpm verify:db` 재시도도 `ECONNREFUSED 127.0.0.1:54322`로 종료 코드 1을 반환했다. 원격 Supabase에는 연결하거나 쓰지 않았다. Docker Desktop 상태를 복구한 뒤 `pnpm db:reset`, `pnpm db:lint`, `pnpm db:test`, `pnpm db:types`를 반드시 실행해야 한다.
- 검토 제약: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local`은 Windows 읽기 시 `atime` 변경을 파일 변조로 판단해 중단됐다. 고정 스냅샷 SHA로 재시도했지만 TruffleHog가 로컬 `file:///C:/...` URI를 `C:/C:/...`로 잘못 해석해 엔진 호출 전 실패했다. 직접 소스 검토와 `secrets:check`를 수행했고, TruffleHog 파일시스템 진단에서 나온 유일한 항목은 제외 대상 `node_modules`의 공개 MongoDB 예시 URI였다.
- 최종 closeout: 보안 우회 경로와 데모 세션 교차 결합을 수정한 뒤 `pnpm verify`가 종료 코드 0으로 통과했다. 결과는 Prettier, ESLint, TypeScript, Vitest 7개 파일/19개 테스트, 5개 migration/29개 RLS 테이블 정적 검사, 344개 파일 비밀 검사, Next.js 프로덕션 빌드 17개 경로, 154개 요구사항 명세 검증, Playwright 모바일·데스크톱 18개 테스트 통과다. 라이브 로컬 DB 증거가 없으므로 Phase 01 완료 체크는 유지하지 않는다.

### 2026-09-02 — Phase 02 tutoring operations

- 범위와 구현: `TUT-001`, `TUT-002`, `TUT-003`, `TUT-004`, `TUT-005`, `TUT-006`, `TUT-007`, `TUT-008`, `TUT-009`, `TUT-010`, `TUT-012`, `TUT-013`, `TUT-019`, `TUT-020`. `src/domain/tutoring/model.ts`가 학생 조합, 수업 기본값 스냅샷, 세 상태 전이, Asia/Seoul 반복 일정, mock 캘린더/Meet, 월별 지표를 소유하고 `src/app/tutoring/actions.ts`가 모든 폼 입력을 서버에서 다시 검증한다.
- `TUT-001`–`TUT-004`: `src/app/tutoring/students/student-form.tsx`는 교과/생기부와 온라인/대면에 따라 관련 필드만 노출한다. 교과는 수학·물리·화학만 선택 가능하고 생기부의 과목은 null이며, 대면은 장소, 온라인은 회의 방식이 필수다. 도메인 단위 테스트와 `supabase/migrations/0006_tutoring_operations.sql`의 조합 제약, `phase02_tutoring.sql`의 불법 조합 단언이 같은 경계를 검증한다.
- `TUT-005`, `TUT-008`: `createLessonFromStudent`는 학생의 금액·시간·방식·장소/회의 전략을 한 번 복사하고 수업별 덮어쓰기를 허용한다. `protect_lesson_snapshot` 트리거는 생성된 수업의 소유자, 학생, 일정, 발생 키, 시각, 방식, 금액과 접속 자원 변경을 거부한다. 단위 테스트와 브라우저 테스트 모두 학생 기본 수업료를 70,000원으로 바꾼 뒤 기존 60,000원 수업이 유지됨을 확인했다.
- `TUT-006`: 상태는 예정·완료·취소만 존재하고 완료/취소 후 다른 상태로 되돌릴 수 없다. `scripts/check-tutoring-boundaries.mjs`는 `src`, `supabase`, `e2e` 73개 파일에서 금지된 대체 상태 용어와 과외 문서 업로드 입력이 없음을 확인한다.
- `TUT-007`: 홈의 오늘 수업 링크와 `/tutoring/lessons/[lessonId]`에서 준비 메모·체크리스트를 확인하고, 예정 수업의 문구와 항목을 수정하거나 완료 표시할 수 있다. 서버 액션 뒤 상세와 오늘 레일을 재검증해 변경이 즉시 반영된다.
- `TUT-009`: 로컬 도메인과 `materialize_tutoring_schedule` 보안 정의자 RPC가 일정 ID와 현지 날짜로 동일한 발생 키를 만들며 중복 삽입을 무시한다. 단위 테스트는 서울 현지 수요일 18시가 반복 범위에서 결정적으로 생성되고 두 번째 실행이 빈 결과임을 검증하며, pgTAP은 9월 5건/재실행 0건을 단언한다.
- `TUT-010`, `TUT-012`, `TUT-013`: 외부 자격증명 없이 생성형 회의는 수업별 고유 `conferenceRequestId`와 `*.mock.local` 주소를 만들고, 직접 관리 주소는 conferenceData로 가장하지 않는다. 대면 수업은 Meet 대신 방문 장소와 지도 검색을 노출한다. 실제 Google 계정, 일정, 회의실에는 쓰지 않았다.
- `TUT-019`, `TUT-020`: 학생 상세는 선택 월의 예정/완료/취소 횟수와 발생·입금·미수 금액을 도메인 질의 결과로 보여주며 반복 일정과 수업 이력을 함께 제공한다. 입금·미수 예시는 수업 상태와 분리된 로컬 정산 레코드에서 합산한다. 학생에는 최소 운영 메모와 입금자 별칭만 저장하고 문서 업로드 경로는 만들지 않았다.
- 로컬 데모 저장소: `src/lib/tutoring/demo-store.ts`는 큰 payload를 쿠키에 넣지 않고 봉인된 인증 세션의 사용자 ID별 프로세스 메모리에만 저장한다. 테스트 프로젝트마다 다른 로컬 ID를 사용해 모바일/데스크톱 병렬 실행 사이의 상태 간섭도 차단했다. 서버 재시작 시 초기화되는 명시적 mock이며 원격 Supabase 쓰기는 없다.
- 브라우저 증거: `e2e/phase-02.spec.ts`의 네 여정을 Pixel 5와 Desktop Chrome에서 실행했다. 오늘 레일→준비 메모 수정→체크→mock 캘린더 연결, 생기부/대면 학생 생성과 과목 숨김, 기본값 복사 후 수업별 금액·시간 덮어쓰기, 학생 기본값 변경 후 과거 금액 보존이 통과했다. 각 여정은 브라우저 console/page error가 비어 있음도 단언하며 Phase 00–02 전체 Playwright 결과는 26/26 통과다.
- 품질 증거: Prettier, ESLint, `next typegen`+TypeScript, Vitest 8개 파일/27개 테스트, 6개 migration/29개 RLS 테이블 정적 검사, 과외 경계 검사, 비밀 검사, Next.js 프로덕션 빌드 21개 경로, 154개 요구사항 명세 무결성 검사가 통과했다. `pnpm spec:verify`는 명세 스크립트의 포맷 후 체크섬을 명시적으로 갱신한 뒤 다시 통과했다.
- 데이터베이스 차단: `pnpm verify:db`는 `ECONNREFUSED 127.0.0.1:54322`로 실패했다. 이어서 `pnpm db:start`를 재시도했지만 Docker가 2분 동안 출력 없이 응답하지 않아 중단했다. `supabase/tests/phase02_tutoring.sql`의 14개 pgTAP 단언은 작성·정적 검증만 완료됐으며 라이브 실행으로 검증됐다고 표시하지 않는다. 원격 Supabase에는 연결하거나 쓰지 않았다.
- 검토: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`을 두 번 실행했으나 Windows에서 읽기 중 파일 메타데이터가 달라졌다고 판단하는 snapshot 단계에서 모두 중단되어 모델 검토는 시작되지 않았다. 직접 소스/보안 경계를 재검토하고 전체 자동화 게이트를 수행했지만 autoreview 자체를 통과했다고 주장하지 않는다.

### 2026-09-02 — Phase 03 money ledger and tutoring receivables

- 범위: `TUT-014`, `TUT-015`, `TUT-016`, `TUT-017`, `MON-001`, `MON-002`, `MON-003`, `MON-004`, `MON-005`, `MON-006`, `MON-007`, `MON-008`, `MON-009`, `MON-011`, `MON-013`, `MON-014`, `MON-015`, `MON-020`.
- 원장과 계좌: `src/domain/money/ledger.ts`, `src/lib/money/demo-store.ts`, `src/app/money/actions.ts`가 세션 소유자별 로컬 계좌, 수입·지출 CRUD, 연결된 두 다리 이체, 포함 잔액과 이체 제외 현금흐름을 담당한다. 계좌 화면은 기관·별칭·종류·KRW 잔액·출금 가능 잔액·동기화 시점·마스킹 번호만 노출하고 전체 번호는 입력하지 않는다.
- 과외 정산: 수업 완료 액션은 `ensureLessonReceivable`을 통해 수업별 받을 돈을 정확히 한 건만 생성한다. `deriveLessonFinances`가 과외 월 지표의 입금·미수 원본을 Money allocation으로 바꿔 수업, 받을 돈, 실제 거래를 분리했다. 부분·복수 입금 연결은 받을 돈과 입금 양쪽 잔여액을 모두 잠그며 초과 연결을 거부한다.
- 명시적 매칭: 금액, 입금자 별칭/학생, 수업일 거리로 신뢰도와 세 근거를 생성하지만 suggestion 자체는 allocation을 만들지 않는다. `/money/matches`의 확정 동작만 입금을 연결하며 제외 선택도 별도 상태로 보존한다.
- 거래 가져오기와 공급자: `BankProvider`는 mock/manual CSV를 실제 로컬 경로로 제공하고 KFTC testbed/production은 자격증명이 없으면 실패한다. CSV는 1MB 제한, 필수 열/날짜/방향/정수 금액 검증, formula marker 무해화, 미리보기, 결정적 fingerprint 중복 제거를 거쳐 한 번에 커밋한다.
- 분류와 분석: 시스템 수입 4종과 지출 9종을 migration과 로컬 저장소에 같은 코드로 두었다. `/settings/money`에서 사용자 분류를 추가·숨김·복원하고 거래 폼과 `/money/analytics`의 분류별 실제 흐름이 같은 저장 원본을 사용한다.
- SQL/RLS: `supabase/migrations/0007_money_receivables.sql`은 계좌 합계 포함 여부, 거래 연결 유일 인덱스, 받을 돈/입금 양쪽 초과 배분 방지, actor/owner 검증, 명시적 match confirm/dismiss, 원자적·멱등 CSV import RPC를 추가한다. 기존 owner RLS를 유지하고 RPC 실행은 authenticated 역할로 한정했다. `supabase/tests/phase03_money_receivables.sql`에는 완료 재실행 1건, 미수/현금 분리, 부분·합산 결제, 거래액 초과 거부, 이체 두 다리/순효과 0, CSV 재실행 0건, suggestion 비활성, 명시적 확정, outsider 차단의 19개 pgTAP 단언을 작성했다.
- 브라우저 증거: `e2e/phase-03.spec.ts`를 Pixel 5와 Desktop Chrome에서 실행했다. 개요 합계/이체·미수 분리, 수동 거래 생성·수정·삭제, 매칭 근거와 확정 전 비활성, CSV formula marker 처리와 재가져오기 중복 제외, 사용자 분류 설정→거래 폼 노출이 모두 통과했다. 812×375 가로 화면, reduced-motion, 125% 글자 크기에서도 수평 넘침과 주요 동작 가림이 없음을 추가 확인했다. Phase 03 단독 결과는 12/12이며 각 여정의 console/page error가 비어 있음도 단언한다.
- 최종 품질 증거: `pnpm verify`가 종료 코드 0으로 통과했다. Prettier, ESLint, `next typegen`+TypeScript, Vitest 9개 파일/33개 테스트, 7개 migration/29개 RLS 보호 테이블 정적 검사, 102개 과외 경계 파일 검사, 646개 로컬 소스/설정 비밀 검사, Next.js 프로덕션 빌드 33개 경로, 154개 요구사항 명세/checksum, 당시 전체 Playwright 36개 테스트가 성공했다. 이후 접근성 아이콘 표식과 계좌번호 마스킹 검증을 보강한 뒤 lint/type/unit/migration/build를 재통과했고, 반응형 검사를 더한 최종 전체 Playwright 38개도 통과했다.
- 외부 경계: 모든 실행은 로컬 mock/process-memory 저장소와 로컬 파일에서만 이뤄졌다. KFTC, Google, 원격 Supabase, 프로덕션 배포에는 연결하거나 쓰지 않았다.
- 남은 차단: Docker/local Postgres가 여전히 준비되지 않아 migration 0007과 pgTAP 19개를 실제 DB에서 실행한 증거는 없다. 따라서 migration 정적 검사와 애플리케이션 테스트가 통과했어도 Phase 03 완료 체크는 열어 둔다.
- DB 재시도: `pnpm verify:db`는 `supabase db lint --local`에서 `ECONNREFUSED 127.0.0.1:54322`로 종료 코드 1을 반환해 pgTAP 단계까지 진행하지 못했다. 원격 프로젝트로 우회하지 않았다.
- 검토: autoreview 스킬의 `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`을 실행했지만 기존 Windows file metadata snapshot 문제(`file changed while reading`)로 TruffleHog 사전 단계에서 종료되어 모델 검토는 시작되지 않았다. 대신 변경 경로를 직접 재검토하고 UI 스킬의 접근성/반응형 체크에 따라 장식 아이콘을 스크린리더에서 숨기고 812×375/reduced-motion/125% 글자 E2E를 추가했다.

### 2026-09-02 — Phase 04 subscription lifecycle and reconciliation

- 범위: `SUB-001`–`SUB-016`, `SUB-019`. `src/domain/subscriptions/model.ts`와 세션별 로컬 저장소가 구독 원본, 유효일 가격 이력, 청구 발생분, 매칭 제안, 우리집 공동지출을 서로 다른 레코드로 유지한다. 외부 자격증명이나 원격 Supabase 쓰기는 사용하지 않았다.
- 대시보드와 일정: `/money/subscriptions`는 활성·체험 구독의 월 환산액과 생성된 미결 발생분의 향후 1년 실제 합계를 구분하고 7일/30일, 체험 종료, 거래 미연결, 연체 필터를 제공한다. `/calendar`는 이번 달·7일·30일·1년 범위의 청구 레일을 제공하며 홈과 빠른 기록에서도 구독 흐름으로 진입할 수 있다.
- 수명주기: 제공사·요금제·8개 분류·5개 상태·6개 청구 주기·시작/기준/다음 결제일·체험/해지 권장일·자동 갱신·중복 제거 알림·HTTPS 서비스 주소·결제 계좌·거래명 패턴을 서버에서 재검증한다. 월말과 윤년 기준일을 보존하고 반복 생성은 멱등이며, 청구 설정 변경은 결제 이력을 보존한 채 미래의 가변 전망만 다시 만든다. 해지·종료는 미래 발생분을 중단하고 다시 활성화하지 않는다.
- 가격과 수동 판단: 가격 변경은 적용일별 이력을 추가하고 결제·환불된 과거 발생분을 수정하지 않는다. `/review`의 유지·검토·해지 후보와 마지막 사용일은 사용자가 직접 기록한 증거로만 표시하며 관찰된 사용량으로 표현하지 않는다.
- 명시적 매칭: 실제 지출/출금 중 금액, 거래명, 결제 계좌, 예정일 ±7일을 근거로 후보를 만들지만 제안 자체는 아무 레코드도 바꾸지 않는다. 사용자의 확정만 기존 거래를 발생분에 연결하고, 우리집 구독이면 발생분당 공동지출을 정확히 한 건 생성해 basis point 분담과 정수 원 단위 나머지를 결정적으로 배분한다.
- SQL/RLS: `supabase/migrations/0008_subscription_operations.sql`은 월말/윤년 다음 결제일, 발생분 생성, 유효일 가격 변경, 결제 이력 보호, 종료 상태 보호, 명시적 매칭 RPC와 실제 발생분 기반 연간 전망 뷰를 추가한다. 개인 구독은 소유자만, 우리집 구독과 파생 레코드는 활성 멤버만 읽는 기존 RLS 경계를 유지한다. `phase04_subscriptions.sql`에는 수식·달력 경계·멱등성·가격 이력·제안 비활성·거래 중복 방지·공동지출 1건·모든 원 분담·종료·외부인 차단을 다루는 pgTAP 30개 단언을 작성했다.
- 애플리케이션 검증: 구독 도메인 단위 테스트 10개를 포함한 전체 Vitest, 타입, 린트, 정적 migration 검사가 통과했다. Playwright는 모바일과 데스크톱에서 대시보드/필터/일정, 생성과 가격 변경, 확인 전용 매칭과 공동지출 연결, 수동 유지 판단, 375px 세로와 812×375 가로/reduced-motion/125% 글자 크기를 검증한다. 최종 전체 게이트의 정확한 개수와 DB 재시도 결과는 아래 최종 closeout에 기록한다.
- 최종 closeout: Prettier, ESLint, `next typegen`+TypeScript, Vitest 10개 파일/43개 테스트, 8개 migration/29개 RLS 보호 테이블 정적 검사, 117개 파일 과외 경계 검사, 740개 로컬 소스/설정 비밀 검사, Next.js 프로덕션 빌드 37개 경로, 154개 요구사항 명세/checksum, Playwright 모바일·데스크톱 48개 테스트가 통과했다. 체크섬을 갱신한 최종 `pnpm verify` 결과는 이 기록 이후 재실행해 확정한다.
- DB 재시도: `pnpm verify:db`는 `supabase db lint --local`에서 `ECONNREFUSED 127.0.0.1:54322`로 종료 코드 1을 반환해 pgTAP 30개 실행까지 진행하지 못했다. migration과 pgTAP은 정적으로만 검증됐으며, 원격 Supabase에는 연결하거나 쓰지 않았다.
- 검토 제약: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`은 이번에도 TruffleHog용 Windows 스냅샷에서 `file changed while reading`으로 종료돼 모델 검토가 시작되지 않았다. 이를 성공으로 간주하지 않았고, 직접 검토에서 향후 반복 청구의 과다 매칭을 ±7일로 제한하고 일정 변경 시 미래 전망만 재생성하며 공동 결제자 멤버 검증을 보강했다.

### 2026-09-03 — Phase 05 household operations

- 범위와 요구사항 매핑: `CTX-004`, `HOM-003`–`HOM-012`. `src/domain/household/operations.ts`는 0.001 단위 정밀도의 재고 수량, 멤버 참조 소유권, 재고 버전/조정 이력, 부족 판정, 장보기 원천 연결, 청소 파생 상태·반복·완료 이력을 담당한다. `src/lib/household/demo-store.ts`는 세션 사용자별 로컬 aggregate와 닭가슴살·냉장 몬스터 2캔·실온 몬스터 6캔을 제공하고, `src/app/household/actions.ts`는 모든 mutation을 로컬 데모 런타임·현재 멤버·Zod 검증 뒤 실행한다.
- `HOM-003`: `/household` 상태판은 9월 공동비 780,000원, 현재 사용자의 책임 몫 390,000원, 실제 선결제액 700,000원, 받을 정산 310,000원, 부족 재고와 청소 상태를 원천 행에서 합산한다. 각 카드는 공동비 원천 행, 부족 재고 필터, 청소 필터로 연결되며 Phase 04에서 확정된 공동 구독 지출도 `readHouseholdCostRows`가 동일 행으로 참조한다. Phase 06 전까지 월세·관리비 기본 행은 읽기 전용이고 공동비 생성 버튼은 다음 단계임을 명시한다.
- `HOM-004`–`HOM-006`: `/household/inventory`, `/new`, `/[inventoryItemId]`에서 이름, 3자리 소수 수량, 단위, 공용/활성 멤버 소유, 냉장·냉동·실온, 소비기한, 부족 기준, 메모를 생성·상세·수정한다. UI의 “내 것/민수 것”은 저장 문자열이 아니라 멤버 ID와 현재 세션에서 계산한다. 보관 필터는 MVP의 세 값만 사용하며 데모 Monster 재고를 냉장과 실온 두 원천 행으로 분리했다.
- `HOM-007`–`HOM-009`: ±1 수량 변경은 기대 버전과 멱등 키를 요구하고, 음수 결과·오래된 버전·다른 멤버 actor를 거부하며 before/after 조정 이력을 남긴다. 부족 재고→장보기는 열린 원천 항목 하나만 생성한다. 직접 장보기는 개인 멤버/공용을 지원하고 구매 시 현재 사용자의 기존 거래와 현재 우리집 공동비 ID만 연결하며 금융 레코드를 복제하지 않는다.
- `HOM-010`–`HOM-012`: `/household/cleaning`과 `/new`는 제목, 공간, 담당 멤버, 한 번/간격일/주간 반복, 마지막 완료, 다음 날짜, 미리 알림, 활성 상태를 다룬다. `deriveCleaningState`는 다음 날짜 당일을 `due`, 경고 범위를 `due_soon`, 나머지를 `ok`로 계산한다. 완료는 현재 로그인 멤버와 시각·메모를 append-only 이력에 남기고 완료일 기준으로 다음 날짜를 결정적으로 계산하며 같은 요청 키의 재시도는 한 번만 반영한다.
- SQL/RLS: `supabase/migrations/0009_household_operations.sql`은 `quantity_version`, `inventory_adjustments`, 동일 가구 참조 트리거, `adjust_inventory_quantity`, `ensure_low_stock_shopping_item`, 멱등 `complete_cleaning_task`, 당일 포함 청소 상태 뷰를 추가한다. 재고 수량 직접 UPDATE와 청소 완료 이력의 직접 INSERT/UPDATE/DELETE 권한을 제거하고 세 RPC가 로그인 사용자의 실제 멤버 ID를 actor로만 받도록 고정했다. `supabase/tests/phase05_household_operations.sql`에는 정확한 데모 맥락, stale/음수/재시도 수량, actor 사칭 거부, 장보기 중복 방지·원천/금융 참조, 청소 당일 상태·완료 이력·다음 날짜, 룸메이트 허용·외부인 거부를 다루는 pgTAP 31개 단언을 작성했다. 정적 검사는 9개 migration과 30개 RLS 보호 테이블을 확인한다.
- 단위·브라우저 증거: `operations.test.ts`의 14개 Phase 05 테스트를 포함한 전체 Vitest는 11개 파일/57개 테스트를 통과한다. `e2e/phase-05.spec.ts`는 Pixel 5와 Desktop Chrome에서 상태판 합계/링크, Monster 보관 분리, 원자적 수량과 부족→장보기, 재고 생성·수정·조정 이력, 멤버 장보기와 기존 참조 연결, 청소 완료→OK·다음 날짜·이력을 검증해 12/12 통과했다. 375×812 세로 및 812×375 가로/reduced-motion/125% 글자에서도 수평 넘침과 콘솔/page error가 없었다.
- UI 검토: 기존 민트·잉크 토큰을 유지하고 “집 한 줄 상태” 레일만 Phase 05의 고유 정보 구조로 추가했다. 보조 메뉴와 필터는 좁은 화면에서 줄바꿈/가로 이동이 가능하고, Lucide 아이콘·텍스트 상태·44px 이상 조작 영역·명시적 label·focus ring·reduced-motion을 유지한다. 경고색은 새 semantic token으로 올려 컴포넌트의 임의 색상 사용을 제거했다.
- 외부 경계와 DB 차단: 애플리케이션 변경은 세션형 process-memory mock에만 저장했고 원격 Supabase, 외부 계정, 프로덕션 배포에는 연결하거나 쓰지 않았다. `pnpm verify:db`는 `supabase db lint --local`에서 `ECONNREFUSED 127.0.0.1:54322`로 종료 코드 1을 반환해 pgTAP 31개 실행 전에 멈췄다. 원격 프로젝트로 우회하지 않았으며 migration/RLS는 정적 검증만 통과한 것으로 기록한다.
- 검토 제약: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`을 코드 수정 전후 두 번 실행했으나 모두 Windows TruffleHog 스냅샷의 `file changed while reading` 단계에서 종료되어 모델 검토는 시작되지 않았다. 직접 권한 검토에서 멤버 ID만 같은 집이면 룸메이트를 actor로 기록할 수 있던 문제를 발견해 로컬 도메인과 세 SQL RPC 모두 `auth.uid()`/현재 멤버 일치를 요구하도록 수정하고 집중 테스트를 재통과했다.
- 최종 closeout: `pnpm verify`가 종료 코드 0으로 통과했다. Prettier, ESLint, `next typegen`+TypeScript, Vitest 11개 파일/57개 테스트, 9개 migration/30개 RLS 보호 테이블 정적 검사, 134개 파일 과외 경계 검사, 825개 로컬 소스/설정 비밀 검사, Next.js 프로덕션 빌드 42개 경로, 154개 요구사항 명세/checksum, Playwright 모바일·데스크톱 60개 테스트가 모두 성공했다. 별도 `pnpm spec:coverage`도 11개 Phase 05 요구사항이 정확히 한 빌드 단계에 연결됨을 확인했다.

### 2026-09-03 — Phase 06 shared money

- 범위와 요구사항 매핑: `MON-016`, `HOM-013`–`HOM-019`를 구현했다. `src/domain/household/shared-money.ts`는 실제 결제자와 경제적 부담을 분리하고, 10개 공동비 분류, 균등·본인 전액·룸메이트 전액·직접 금액·직접 비율 분담, 안정적인 largest-remainder 원 단위 배분, 결제자 반전·환불·부분 정산을 포함한 pairwise netting을 소유한다.
- 사용자 흐름: `/household/expenses`, `/household/expenses/new`, `/household/expenses/[expenseId]`, `/household/settlements`를 구현하고 가구 내비게이션과 빠른 추가를 연결했다. 거래의 공동 장보기·주거·공과금·개인 분류는 확인 전까지 원장을 바꾸지 않으며, 입금 정산 후보도 사용자가 명시적으로 확정한 뒤에만 일부 또는 전액 배분된다.
- 원장 조정: 공동비 목록은 수동 입력, 확인된 거래, 구독 발생분을 중복 복사하지 않고 한 source row로 투영한다. Money 분석과 Grow는 실제 현금 지출, 개인 부담, 공동비 책임액, 일반 수입에서 제외한 정산 입금, 확인된 상환액을 분리해 공동비를 누락하거나 두 번 세지 않는다.
- 개인정보와 변경 불가 이력: 로컬 액션과 SQL RPC는 현재 인증 사용자/활성 멤버/거래 소유자/방향/금액을 다시 검증한다. 룸메이트에게는 공동 사실만 보이고 계좌·상대방·거래 상세와 정산 allocation은 소유자 전용이다. 정산 배분이 시작된 기간과 이미 정산·취소된 공동비는 편집할 수 없고, 연결을 해제하거나 취소할 때 소유 거래의 공동 범위를 안전하게 되돌린다.
- 데이터베이스 계약: `supabase/migrations/0010_shared_money_settlement.sql`에 `settlement_allocations`, 환불 entry kind, 정확한 split 검증, 공동비 upsert/취소, 정산 후보/확정, 거래 분류 확정, 멤버 잔액 view, 책임 조정 Money 함수를 추가했다. `supabase/tests/phase06_shared_money.sql`은 36개 pgTAP 선언으로 정확한 분담, 결제자 반전, 환불, 부분 정산, 중복 방지, 명시적 분류, 이중 집계 방지, 룸메이트·외부인 RLS를 검증하도록 작성했다.
- 최종 closeout: `pnpm verify`가 종료 코드 0으로 통과했다. Prettier, ESLint, `next typegen`+TypeScript, Vitest 12개 파일/67개 테스트, 10개 migration/31개 RLS 보호 테이블 정적 검사, 147개 파일 과외 경계 검사, 888개 로컬 소스/설정 비밀 검사, Next.js 프로덕션 빌드 45개 라우트, 154개 요구사항 명세/checksum, Playwright 모바일·데스크톱 70개 테스트가 모두 성공했다. 별도 `pnpm spec:coverage`도 8개 Phase 06 요구사항이 정확히 한 빌드 단계에 연결됨을 확인했다.
- 로컬 DB 차단: `pnpm verify:db`는 원격 연결 없이 `supabase db lint --local`만 시도했고, 로컬 Postgres가 실행되지 않아 `ECONNREFUSED 127.0.0.1:54322`로 종료됐다. 따라서 Phase 06 SQL과 36개 pgTAP은 정적으로 검증됐지만 실제 DB 실행 증거는 아직 없으며 완료 체크는 보류한다.
- 검토 제약: `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`은 기존 세션들과 동일하게 Windows TruffleHog 스냅샷의 `file changed while reading` 단계에서 종료되어 모델 리뷰가 시작되지 않았다. 대신 직접 경계 검토에서 정산·취소 이력 재편집, 타인 소유 거래 링크 변경, 연결 거래의 개인 재분류 가능성을 찾아 로컬 도메인과 SQL RPC 모두 차단하고 회귀 테스트를 보강했다.

### 2026-09-03 — Phase 07 Home, Grow, Analytics 구현 완료

- `src/domain/grow/model.ts`와 `src/domain/analytics/model.ts`에 actual cash remaining, actual available surplus, 비상금 보충, 정액/비율·상한 기여 계획, 기여 상태, 현금/장기 자산 합계, 미지급 구독 의무, 명목/실질 시급, 월 경계 비교 공식을 추가했다. `model.test.ts`는 settled cash, 개인비, 공동 책임, 비상금, paid/matched/skipped/cancelled/household-split 구독 의무와 이체 불변식을 검증한다.
- `src/app/page.tsx`는 과외 유형·시간·방식·준비·Meet/장소를 포함한 오늘 수업과 확인 액션을 가장 먼저 보여 준다. 그 뒤 활성 일정 기반 월 예상, 완료 수업 발생, 확정 입금, 미수금, 포함 계좌 잔액, 실제 월 입·출금, Grow 잉여금/상태, 청소·재고·정산 잔액을 각 원천 화면에 연결한다. 과외·구독·공동비 분류·정산 제안은 확정 전 비활성 상태로 분리했다.
- `src/app/money/analytics/page.tsx`는 월 선택과 이전 달 비교/자료 없음 상태, 진행 중인 현재 월 표시, 이체 제외 현금 흐름, 부호 있는 분류별 흐름, 학생별 명목/실질 시간당 수입, 미결제 구독 의무, 현금/책임 조정, 날짜가 표시된 현금·투자·총자산 스냅샷을 렌더링한다. 이전 자산 스냅샷이 없으면 추세를 꾸며내지 않고 빈 상태를 설명한다.
- 구독 대시보드와 actions는 저장된 분류 및 사용자가 직접 표시한 검토 상태만으로 결정론적 insight를 만들고 원본 구독 링크, 규칙 설명, 멱등 dismiss를 제공한다. 특정 대체 상품이나 이용량 추정은 하지 않는다.
- `supabase/migrations/0011_grow_analytics.sql`은 직접 Grow 쓰기 권한을 제거하고 actor-bound `upsert_grow_plan`, `record_grow_contribution`, `dismiss_local_insight`, 기여-transfer 연결, 책임 조정 `available_surplus`, `v_asset_summary`, `v_tutoring_effective_hourly`를 추가한다. `phase07_grow_analytics.sql`의 pgTAP 29개 단언은 규칙/상한, 의무 중복 제거, transfer 재시도, partial/completed, 총자산, 시간당 수입, insight, 외부인 차단을 다룬다.
- 검증: Phase 07 최종 `pnpm verify`가 종료 코드 0으로 통과했다. Vitest 14개 파일/74개 테스트, Playwright Pixel 5 + Desktop Chrome 76/76, TypeScript, ESLint, Prettier, 45-route build, 11개 migration/33개 RLS 보호 테이블 정적 검사, tutoring boundary, secret scan, specification pack이 성공했다. 앞선 전체 E2E는 Grow의 기존 정산 근거 제목 회귀 2건을 찾아냈고 호환 제목/라벨 복구 후 최종 전체 회귀가 통과했다.
- 라이브 DB 검증은 `NO_LOCAL_POSTGRES_LISTENER` 및 `LegacyDbConnectError: ECONNREFUSED 127.0.0.1:54322`로 차단됐다. 원격 Supabase 쓰기나 배포는 수행하지 않았다.
- closeout 자동 리뷰는 `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`으로 시도했지만, 기존과 같은 Windows TruffleHog 스냅샷 `file changed while reading` 오류로 모델 호출 전 종료됐다. 전체 자동 검증과 직접 변경 경계 검토로 대체했으며 이 제약을 검증 성공으로 기록하지 않는다.

### 2026-09-03 — Phase 08 연동 경계 시작

- 요구사항 `TUT-011`, `MON-010`, `MON-012`, `INT-001`–`INT-008`, `INT-010`, `SEC-003`, `SEC-005`를 Calendar adapter, read-only bank port, retry/redaction, 로컬 connection store, 설정 UI, 후속 SQL/RLS와 테스트로 매핑했다.
- `src/domain/integrations/model.ts`는 최소 Calendar 이벤트 scope, mock/Google Calendar provider, 수업별 고유·재시도 안정 event/conference ID, `conferenceDataVersion=1`, 409 중복 생성 조회 복구, 앱 소유 이벤트 수정·취소 경계, 조회 전용 mock/KFTC testbed bank provider, bounded pagination/중복 제거, stale/error/disconnected 판정, 지수 backoff+jitter, token/fintech/account-like 값 redaction, KFTC 운영 하드 차단을 제공한다. 실제 네트워크나 자격증명은 사용하지 않았다.
- 기존 과외 Calendar 액션은 provider port의 `MockCalendarProvider`를 사용한다. `/settings/integrations`는 세션별 Calendar/은행 mock의 허용 범위, 마지막 시도/성공, 최신성, 동기화와 해제/재연결을 실제로 변경하며 Google/KFTC가 자격 없이는 비활성임을 명시한다.
- `supabase/migrations/0012_integration_boundaries.sql`은 provider별 최소 scope, 운영 KFTC 거부, 암호화 secret reference 형식, Calendar 이벤트 소유권/고유 ID, actor-bound mock 연결·동기화 시작/완료·해제 RPC, idempotency key, cursor/count, redacted terminal error를 강제한다. authenticated 직접 쓰기는 제거했고 `phase08_integrations.sql`에 30개 pgTAP 단언을 작성했다.
- `docs/integration-operations.md`는 토큰의 서버 전용 저장, Google 동의 범위, 조회 전용 은행 capability, mock/CSV 대체 경로, 운영 승격 전 기관·계약·동의·보안 전제와 코드/DB/환경의 삼중 하드 게이트를 기록한다.
- 집중 검증은 TypeScript, ESLint, Vitest 15개 파일/84개 테스트, 12개 migration/33개 RLS 보호 테이블 정적 검사, 923개 파일 secret scan, 154개 요구사항 추적성, 46-route production build를 통과했다. Phase 08 Playwright는 Pixel 5와 Desktop Chrome에서 최신→오래됨→복구, 오류→복구, 해제→재연결, CSV 대체 경로를 검증해 최종 2/2 통과했고 console/page error가 없었다. 두 중간 실패는 각각 결합 텍스트 선택자와 재렌더 후 닫힌 details 선택자라는 테스트 결함이었으며 접근성 스냅샷에 맞춰 수정했다.
- 최종 전체 회귀 `pnpm verify`가 종료 코드 0으로 통과했다. Prettier, ESLint, `next typegen`+TypeScript, Vitest 15개 파일/84개 테스트, 12개 migration/33개 RLS 보호 테이블 정적 검사, 165개 파일 과외 경계 검사, 923개 파일 secret scan, 46-route production build, 154개 요구사항 명세/checksum, Playwright 모바일·데스크톱 78/78이 모두 성공했다.
- 로컬 DB listener가 없어 migration 0012와 pgTAP 30개는 아직 실제 Postgres에서 실행하지 못했다. 원격 Supabase로 우회하지 않았고 외부 Google/KFTC 호출이나 프로덕션 배포도 수행하지 않았다.
- closeout 자동 리뷰는 `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`으로 재시도했지만 Windows TruffleHog 스냅샷의 `file changed while reading`에서 다시 종료되어 모델 리뷰가 시작되지 않았다. 이 실패는 검증 성공으로 간주하지 않으며 전체 자동 게이트와 직접 연동 경계 검토 결과만 증거로 남긴다.

### 2026-09-04 — 원본 REIN 로고 적용 및 시각 체계 정비

- 사용자가 제공한 `Gemini_Generated_Image_hrqmluhrqmluhrqm (1).png`를 재생성·보정·배경 제거 없이 `public/rein-logo.png`로 그대로 복사했다. 원본과 대상의 SHA-256은 모두 `741F63BA7FF156C4EE3A8BB1198A7A853C7810C17FF4F0E24C6A2CA6599ED9E8`이다.
- `BrandLogo`를 단일 진입점으로 두고 로그인 화면, 데스크톱 사이드바, 모바일 헤더, 문서 아이콘과 PWA manifest가 모두 같은 원본 PNG를 사용하도록 바꿨다. 원본에 체크보드가 불투명 픽셀로 포함되어 있어 그 배경도 의도대로 보존했다.
- 원본의 주황·시안·자홍·남색을 전역 토큰으로 옮기고, 각진 창 프레임, 굵은 구획선, 오프셋 그림자, 타이틀바 컨트롤, 체크보드 캔버스로 전체 셸과 로그인 화면을 재구성했다. 유사 로고나 파생 이미지는 만들지 않았다.
- 1440×900 데스크톱, 390×844 및 375×812 모바일, 812×375 가로 화면에서 직접 렌더링을 확인했다. 원본 비율 유지, 로그인·사이드바 표시, 가로 넘침 없음, 모바일 폼 접근성을 확인했다.
- Prettier, ESLint, `next typegen`+TypeScript, Vitest 23개 파일/111개 테스트, 14개 migration/34개 RLS 보호 테이블 정적 검사, 1,312개 파일 secret scan, 60-route production build, 154개 요구사항 명세 검증이 통과했다. 원본 경로·1071×992 실제 로드 크기·모바일/가로 반응형·WCAG 2.0/2.1/2.2 AA를 검증하는 전용 Playwright 4건도 모두 통과했으며, 서버가 전달한 PNG의 SHA-256도 원본과 일치했다.
- 기존 전체 Playwright 묶음은 원격 Supabase 로그인으로 전환된 뒤에도 제거된 `로컬 데모 시작` 버튼을 요구하는 구식 세션 부트스트랩 때문에 실패했다. 이를 UI 회귀로 오인해 계정이나 원격 DB를 임의 변경하지 않았고, 테스트 인증 전환을 후속 작업으로 남겼다.
- closeout 자동 리뷰는 `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`으로 실행했지만 Windows TruffleHog 스냅샷의 `file changed while reading`에서 종료되어 모델 리뷰가 시작되지 않았다. 이 실패는 검토 통과로 간주하지 않는다.

### 2026-09-04 — RAINY 전역 UI 오퍼레이터

- RAINY를 전역 3열 셸의 제한형 UI 오퍼레이터로 확장했다. 결정론적 라우터는 고정 내부 경로 이동, 현재 화면 제목/영역 읽기, 본문 경계 스크롤, 비밀값이 아닌 단일 폼 필드 입력, 중앙 카탈로그에 등록된 `type="button"` 비파괴 동작만 허용한다. 학생 이름 입력과 거래 수입/지출 전환을 실제 브라우저에서 실행하되 폼 제출·삭제·결제는 자동화하지 않는다.
- 권한 경계는 NFKC·다중 URL decode·슬래시 정규화 뒤 `/api/*`, `/api/settings/*`, 환경 토큰/API 키, 관리자·보안·설정 변경을 차단한다. 설정·인증 경로에서는 읽기/입력/버튼 실행도 중단하며 `ACCESS DENIED: RESTRICTED DOMAIN`을 고정 배너로 표시한다. 과외 일정 서버 액션은 DB 조회 전에 동일 검사를 다시 수행하고 원문 명령을 응답하지 않으며 사용자별 속도 제한을 적용한다.
- AppShell 전역 Canvas는 미완료 작업 수와 일시적인 실행/API 응답 payload를 0–100 강수량으로 변환한다. 허용된 UI 제어 또는 API 호출 때만 2회 미만의 짧은 번개가 발생하고, RAINY avatar는 대기·해석 중·실행 중·차단됨 슬롯을 노출한다. Canvas/번개는 `aria-hidden`, `pointer-events:none`이며 reduced-motion과 숨겨진 탭에서 RAF를 정지한다.
- IBM Plex Sans KR를 한국어 본문에, IBM Plex Mono를 RAINY·상태·계측에 `next/font`로 self-host했다. RAINY의 반복 설명, 중복 온라인/운영자 문구, 셸 상태 장식, 홈의 중복 영문 메타를 제거하고 3px 검정 경계와 최소 44px 조작 영역을 보강했다. 전체 화면 드래그는 없고 오늘 할 일 손잡이만 draggable이며 위·아래 버튼을 유지한다.
- 별도 비판 에이전트가 구현 전후 UI/UX·접근성·권한을 두 차례 감사했다. 지적된 모바일 대화 로그 스크롤 탈취, 본문 밖 하단 이동, 단일 opt-in 버튼, 성공 전 번개, API 응답 미반영, 라이브 영역 중복, 32px 완료 버튼, 필터 중 재정렬 문제를 수정했다.
- 검증: Prettier, ESLint, `next typegen`+TypeScript, 전체 Vitest 27개 파일/142개 테스트, 17개 migration/34개 RLS 보호 테이블 정적 검사, tutoring boundary, 1,299개 로컬 파일 비밀 검사, 60-route production build가 통과했다. RAINY Playwright는 Pixel 5와 Desktop Chrome에서 이동·입력·비제출, UI 카탈로그 실행, 강수량/번개, 네트워크 없는 제한 차단, reduced-motion, 드래그 범위, 가로 넘침과 Axe를 검증해 8/8 통과했다.

### 2026-09-04 — 투명 로고와 도어벨 PIN 로그인

- 자동 이미지 편집 결과는 원본을 다시 그린 흔적이 있어 앱에 사용하지 않았다. 대신 `scripts/extract-rein-logo.mjs`가 원본의 밝은 중성 체크보드 픽셀만 투명화하고 빈 캔버스를 자른다. 결과는 871×509 RGBA PNG이며 투명 픽셀 127,690개, 유지된 불투명 픽셀 315,649개, 유지 픽셀의 RGB 변경 0개로 검증했다.
- 로그인 화면을 최재원·김태현 이름판, 네 자리 마스킹 PIN 표시, 3×4 물리 번호판, 한 자리 지우기, 벨 모양 로그인 버튼으로 바꿨다. 숫자 입력은 키보드·붙여넣기도 지원하고 버튼은 최소 60px 높이와 10px 간격을 사용한다.
- 클라이언트와 서버 모두 네 자리 PIN을 다루며 서버는 정확히 `0036`만 Supabase 인증으로 전달한다. 기존 분당 로그인 제한은 유지했다.
- Next.js 개발 서버의 CSP에는 개발 모드에서만 `unsafe-eval`과 웹소켓을 허용하고 `127.0.0.1`을 `allowedDevOrigins`에 추가했다. 운영 CSP는 기존 제한을 유지한다.
- 전용 Playwright는 모바일·데스크톱에서 이름 선택, 잘못된 PIN 거부, `0-0-3-6` 입력, 벨 활성화, 375×812 및 812×375 무가로넘침, 확대 글꼴·reduced-motion, 투명 로고 실제 크기와 WCAG AA를 검증해 6/6 통과했다.
- 원격 Supabase 프로젝트는 현재 CLI 계정에 표시되지 않고 저장소도 링크되지 않아 Auth 최소 길이 설정과 두 사용자 계정의 실제 비밀번호 변경은 수행하지 않았다.
- closeout 자동 리뷰는 `python C:\Users\Jaewon\.codex\skills\autoreview\scripts\autoreview --mode local --stream-engine-output`으로 실행했지만 Windows TruffleHog 스냅샷의 `file changed while reading`에서 종료되어 모델 리뷰가 시작되지 않았다. 이 실패는 검토 통과로 간주하지 않는다.

### 2026-09-04 — 로그인 창 하단 경계와 흰 캔버스

- 로그인 화면 바깥 캔버스를 순백색으로 바꾸고 전역 체크보드·스캔라인을 제거했다. 원본 REIN 로고와 창 내부 색상은 변경하지 않았다.
- 데스크톱 로그인 폼의 여백과 번호판을 최소 48px 터치 높이로 압축했다. 잘못된 PIN 오류가 표시된 1440×690 뷰포트에서도 창 하단은 667px에서 끝나며 문서 자체는 뷰포트보다 길어지지 않는다.
- 흰 배경과 오류 상태 하단 경계를 회귀 검사에 추가했고, Playwright 모바일·데스크톱 전용 묶음은 8/8 통과했다. Prettier, ESLint, TypeScript도 통과했다.

### 2026-09-04 — 오늘의 중요 일정과 RAINY 제어 레일

- `src/app/tutoring/schedule/page.tsx`와 `rainy-panel.tsx`에 오늘의 고정 수업을 시간순으로 보여 주는 오른쪽 우선순위 레일과 대화형 일정 입력을 추가했다. 데스크톱에서는 시간표 오른쪽에 고정되고, 모바일에서는 시간표 편집보다 먼저 읽히도록 배치했다.
- `src/lib/rainy/command.ts`와 `schedule/actions.ts`는 학생 이름, 오늘·내일·요일, 오전·오후 또는 24시간제 시각, 명시 수업 시간을 해석한 뒤 기존 인증·RLS 경계를 거쳐 `tutoring_schedules`에 저장한다. 애매한 12시간제 시각은 추측하지 않고 재질문하며, 삭제·취소·결제는 기존 확인 흐름을 우회하지 않는다.
- 자동화 범위를 화면에 `주간 수업 추가`로 명시하고 학생·수입·지출 관리 바로가기를 제공했다. 실제로 수행하지 않는 범용 AI 작업을 성공처럼 표시하지 않는다.
- 검증: 전용 Vitest 4/4, Playwright 모바일·데스크톱 2/2와 RAINY 영역 WCAG 2.0/2.1/2.2 AA 점검, 390×844 및 1440×900 직접 렌더링, 가로 넘침 없음, 한국어 오류 회복 흐름을 통과했다. 전체 Vitest 24개 파일/115개 테스트, Prettier, ESLint, TypeScript, 60-route 프로덕션 빌드, 154개 요구사항 명세와 307개 파일 checksum 검증도 통과했다.

### 2026-09-04 — RAINY 오늘 작업 공간 재구성

- RAINY를 주 시간표의 오른쪽 레일에서 제거하고 `/home`을 `오늘 할 일 + RAINY 대화` 전용 시작 화면으로 바꿨다. 첫 내비게이션과 로그인·루트 리디렉션도 `/home`으로 연결하고, 주 시간표는 `주 시간표 보기` 링크를 통해 독립 화면으로 유지한다.
- 사용자 제공 마스코트는 이미지 편집을 거친 뒤 `public/rainy-mascot.png`의 실제 RGBA 투명 PNG로 저장했다. 체크무늬/흰 배경은 알파 0으로 만들고 마스코트, 우산, 물방울과 작은 일정 아이콘을 보존했다.
- 대화 명령은 오늘 할 일 추가·완료, 중요 항목만 보기, 집중 모드 켜기/끄기를 실제 클라이언트 상태와 날짜별 로컬 저장소에 반영한다. 등록 학생 이름을 포함한 수업 명령은 기존 인증·RLS·서버 검증을 거쳐 주 시간표에 저장하며 삭제·취소·결제 자동 실행은 계속 차단한다.
- 명령 실행 동안 마스코트만 위로 떠오르고 번개·비가 표시된다. `prefers-reduced-motion`에서는 이동과 비를 제거하고 정적인 번개 피드백을 남긴다.
- `draggable=true`는 오늘 할 일 카드 안의 점 손잡이에만 존재한다. 페이지와 다른 영역은 드래그할 수 없고, 같은 순서 변경을 위·아래 버튼으로도 수행할 수 있어 키보드와 단일 포인터 대안을 제공한다.
- 집중 검증은 새 명령 파서 단위 테스트 4개, 기존 일정 명령·릴리스 계약을 포함한 21개 테스트, ESLint, TypeScript, 60-route 프로덕션 빌드를 통과했다. Playwright는 Pixel 5와 Desktop Chrome에서 대화형 추가·설정 변경·드래그 범위·순서 버튼·가로 넘침·RAINY 영역 WCAG 2.0/2.1/2.2 AA를 검증했다.
- 전체 `pnpm verify`는 Prettier, ESLint, TypeScript, Vitest 25개 파일/119개 테스트, 17개 migration/34개 RLS 보호 테이블 정적 검사, 과외 경계, 비밀 검사, 60-route 빌드와 154개 요구사항/checksum까지 통과했다. 마지막 전체 Playwright 묶음은 원격 Supabase 로그인 전환 전에 작성된 `로컬 데모 시작` 부트스트랩을 기다리는 기존 Phase 00/01 테스트에서 다시 실패해 중단했다. 새 RAINY 전용 모바일·데스크톱 2/2는 별도로 재실행해 통과했으며, 기존 인증 테스트 노후화를 새 기능의 성공으로 숨기지 않는다.

### 2026-09-04 — 전역 3열 셸과 오른쪽 RAINY 레일

- 사용자의 구조 정정에 따라 데스크톱 앱 셸을 `왼쪽 내비게이션 17rem / 유동 가운데 페이지 / 오른쪽 RAINY 20rem`의 명시적 3열로 바꿨다. 가운데 열은 양쪽 폭을 실제로 예약하므로 설정·학생·금융 페이지가 어느 레일 아래에도 가려지지 않는다.
- RAINY와 주요 할 일을 `/home` 전용 컴포넌트에서 루트 레이아웃의 전역 오른쪽 레일로 옮겼다. 가운데 경로가 `/settings` 등으로 바뀌어도 레일과 오늘 할 일 상태가 유지된다. 좁은 화면에서는 같은 레일이 가운데 본문 다음으로 내려가며 하단 내비게이션과 겹치지 않는다.
- `/home` 가운데에는 날짜, 오늘 수업, 활성 학생, 현금 흐름과 주요 업무 바로가기를 남기고 할 일·채팅 중복을 제거했다. 오른쪽 레일에는 날짜별 로컬 할 일, 중요/완료 상태, grip-only 순서 드래그, 위·아래 버튼 대안, RAINY 대화와 비·번개 실행 피드백을 압축 배치했다.
- 루트 레일과 가운데 홈이 같은 Supabase 과외 데이터를 중복 조회하던 문제는 React request cache로 한 번만 읽도록 수정했다. 레일 조회 실패는 빈 주요 할 일 상태로 격리하여 보조 레일 때문에 가운데 페이지 전체가 오류 경계로 교체되지 않는다.
- 전용 Playwright는 Pixel 5와 Desktop Chrome에서 대화형 할 일 추가, 순서 버튼과 실제 drag, 전체 draggable 범위, 집중 모드, `/settings` 이동 뒤 레일/할 일 유지, 좌·중앙·우 geometry 비중첩, 무가로넘침과 레일 WCAG 2.0/2.1/2.2 AA를 검증해 2/2 통과했다. 1440×900 설정 화면도 직접 렌더링해 3열을 확인했다.

### 2026-09-04 — REINY 비주얼, Groq 대화, 3계좌·집 연결 UI

- 구형 `01–05 / 아이콘 / 라벨` 왼쪽 내비게이션을 복원하고 아이콘 전용 셀과 라벨 여백을 분리했다. 데스크톱 1208px부터 `왼쪽 17rem / 가운데 / 오른쪽 22rem` 3열을 고정하고 오른쪽 레일은 사방 3px 경계와 8px 하드 섀도를 가진 플로팅 창으로 바꿨다.
- 로그인 배경은 사용자 제공 네온 그리드 이미지로 교체했다. REINY 원본의 체크보드는 결정적 픽셀 분류로 투명화해 `public/reiny-profile.png`로 만들고, 오른쪽 상단에 시계 방향 1.2도 회전해 배치했다. Copilot형 채팅 로그에는 RAINY 프로필, 역할 라벨, 문서형 응답 행과 사용자 프롬프트 행을 사용한다.
- 주요 할 일은 넓은 본문 열과 별도 하단 완료·위·아래 조작 행으로 재배치했다. 드래그는 손잡이에만 유지하고 키보드/단일 포인터 순서 변경 버튼을 보존했다. 전역 및 데이터 로딩은 REIN 6색 면의 계단식 3D 큐브와 로딩 바로 통일했다.
- 설정에서 Groq 키를 검증한 뒤 사용자·8시간 만료가 결합된 AES-GCM HttpOnly 세션 쿠키로만 보관한다. 일반 대화만 고정 Groq Chat Completions 엔드포인트로 보내며 결정론적 UI 라우터와 모델 출력은 연결하지 않는다. 제한 도메인과 `gsk_` 원문은 DOM 기록 전에 차단하고 로그 redaction을 확장했다.
- 최재원 화면에 우리은행 생활비 카드, 카카오뱅크 500,000원 상한, KB국민은행 저축 계좌의 읽기 전용 유지 흐름을 추가했다. 실제 송금은 만들지 않았다. 집 화면과 설정은 최재원·김태현의 원격 멤버십을 함께 표시하고, 관리자만 RLS 아래에서 집 이름을 다시 설정할 수 있다. 학생 목록은 넓은 화면에서도 2단을 넘지 않는다.
- 검증: Prettier, ESLint, Next typegen+TypeScript, Vitest 28개 파일/145개 테스트, 61-route production build, RAINY Playwright 모바일·데스크톱 8/8을 통과했다. 로그인·홈(할 일 3개)·학생·돈·설정을 1208×900 실제 브라우저로 캡처해 3열 비중첩과 내부 스크롤을 확인했다.
- 비판 에이전트의 출시 보류 항목을 반영해 주요 할 일 3개가 1208×900에서 모두 온전히 보이도록 영역과 44px 조작 셀을 재구성했고, 경로 전환 때 목록 스크롤을 상단으로 복구한다. 설정 화면에는 보호 구역 안내를 선제 노출하고, 1180–1350px 학생 헤더와 3계좌 카드를 재배치했다. RAINY Playwright는 모바일 6/6, 데스크톱 6/6으로 최종 통과했다.

### 2026-09-05 — 학생·개인 통합 주 시간표

- `TUT-009`, `TUT-019`, `UX-005`: 학생 카드와 상세에 모든 정기 수업의 요일·시작·종료 시각을 월요일 기준으로 정렬해 표시했다. 학생 수업과 개인 일정은 한 시간표에서 충돌 레인으로 나뉘어 겹쳐도 서로 가리지 않는다.
- 개인 일정은 학생 FK가 필수인 `tutoring_schedules`를 재사용하지 않고 `personal_schedule_blocks`에 분리했다. 소유자 RLS와 서버 액션의 인증·소유자 조건을 중복 적용하고, 데이터베이스 트리거가 소유자별 생성 순서와 0–14 색상 인덱스를 직렬화해 클라이언트 조작 및 동시 저장 충돌을 막는다.
- 새 일정과 기존 일정 이동은 먼저 클라이언트 드래프트로 표시된다. 저장 전 손잡이 드래그, 방향키, 요일·시간 필드로 위치를 조정한 뒤 명시적 저장을 눌러야 서버가 변경한다. 기존 학생 일정의 학생 FK는 편집 중 고정하고 서버에서도 원본 학생과 일치하는지 다시 확인해 이미 materialize된 수업 연결을 보호한다.
- 개인 일정은 생성 순서대로 15색을 순환한다. 학생 수업도 동일한 15색 브루탈리즘 팔레트를 사용하되, 한 학생의 반복 수업을 빠르게 찾도록 학생 ID 기반 안정 색을 유지한다.
- 검증: 전용 시간표 Vitest 10/10과 전체 Vitest 33개 파일/165개 테스트, Next typegen+TypeScript, 61-route production build, 23개 migration/35개 RLS 테이블 정적 검사, tutoring boundary, 비밀 검사와 154개 요구사항/checksum 검증을 통과했다. pgTAP에는 개인 일정 생성 순서·색상 및 외부 사용자 비가시성 단언을 추가했지만 Docker 엔진이 꺼져 있어 라이브 DB 실행은 검증하지 않았다. 전체 ESLint/format은 병렬 작업 중인 돈 보드와 RAINY 테스트 파일의 범위 밖 오류가 남아 있어 최종 통과로 표시하지 않는다.
### 2026-09-05 — 금융·집·주 시간표 운영 화면 확장

- `MON-003`, `MON-004`, `MON-010`, `MON-011`, `MON-012`: 수입·지출 입력에 로그인형 숫자판(`00`, `000` 포함)을 재사용하고, 최재원 계정의 내부 장부를 KB국민은행 → 카카오뱅크 → 우리은행 순서의 3계좌로 고정했다. 지출은 우리은행 생활비 카드, 수입은 KB국민은행으로 서버에서 자동 라우팅하며 외부 API 거래는 원본 계좌·금액·발생 시각을 잠그고 분류·표시·메모만 정정할 수 있다. 내부 장부 준비 상태와 실제 은행 API 연결 상태를 분리해 미연결 상태를 연결됨으로 표시하지 않는다.
- `HOM-009`, `HOM-010`, `HOM-011`, `HOM-020`: 장보기 항목에 당근·쿠팡·알리 검색 연결과 별도 구매 완료 흐름을 추가했고, 화장실 청소를 주 1회 최우선 루틴으로 정렬했다. 외부 쇼핑 링크 열기는 구매 완료나 거래 생성을 자동 확정하지 않는다.
- `TUT-009`, `TUT-019`, `UX-003`, `UX-005`, `UX-009`: 학생 카드와 상세에 정기 수업 요일·시간을 표시하고, 학생 수업과 개인 일정을 함께 보여 주는 주 시간표를 구성했다. 개인 블록은 15색을 생성 순서대로 순환하며 저장 전 초안만 그립으로 이동할 수 있고 방향키·버튼 대체 조작을 제공한다.
- 설정 화면에 금융 분류·과외 기본값·외부 연동·알림·데이터 관리 진입점을 추가하고, RAINY에는 관련 화면 이동과 안전한 UI 보조만 허용했다. 설정·비밀키·관리자·송금 영역의 하드 차단은 유지했다. 오른쪽 REINY 로고는 회전 없이 약 30% 확대했다.
- 검증은 Prettier, ESLint, TypeScript, Vitest 34파일/174테스트, 23개 마이그레이션/35개 RLS 보호 테이블 정적 검사, 과외 경계 검사, 비밀 검사, 61-route production build, 154개 요구사항 추적 검사를 통과했다. 실제 브라우저에서 설정·금융 입력·3계좌·장보기·청소·학생·주 시간표를 확인했고 콘솔 오류는 0건이었다.
- `0022_personal_schedule_blocks.sql`과 `0023_money_auto_routing_and_corrections.sql`은 코드와 정적 검증을 완료했지만 원격 Supabase에는 적용하지 않았다. Docker가 꺼져 있어 새 pgTAP 선언은 실제 로컬 Postgres에서 실행하지 못했다.
