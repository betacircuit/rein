# Architecture Decision Log

## ADR-001 — Product shape

**Decision:** Build a mobile-first responsive web PWA rather than separate native apps.  
**Reason:** One codebase fits the personal/student scope and still supports desktop management.

## ADR-002 — Backend

**Decision:** Supabase Postgres/Auth/Realtime/RLS.  
**Reason:** Relational integrity is critical for payments, splits, and RLS; Supabase offers a compact stack.

## ADR-003 — ORM

**Decision:** Do not start with Prisma. Use SQL migrations, generated Supabase types, and typed repository/domain services.  
**Reason:** Avoid a second schema source and preserve direct RLS/Postgres features.

## ADR-004 — Financial source of truth

**Decision:** One financial transaction ledger linked to domain records; no duplicate “income row” per feature.  
**Reason:** Cross-module reconciliation and transfer exclusion require one source of actual movement.

## ADR-005 — Google Meet

**Decision:** Generate unique conference data per lesson event by default; optional manually supplied fixed URL only.  
**Reason:** Privacy/access safety and clear ownership of conference data.

## ADR-006 — Bank integration

**Decision:** Read-only provider adapter with mock/manual first, KFTC testbed next, production gated.  
**Reason:** The application must be useful before institutional onboarding and must not initiate transfers.

## ADR-007 — Grow

**Decision:** Track surplus allocation and investment-account transfers, not securities or trades.  
**Reason:** Fits a student-level discipline tool and avoids brokerage/advice complexity.

## ADR-008 — Household privacy

**Decision:** Shared domain records are visible to members; underlying private ledger/account details remain owner-only.  
**Reason:** Collaboration must not become financial surveillance.

## ADR-009 — Credential-free Phase 00 runtime

**Decision:** Phase 00 runs with explicit local demo data when external credentials are absent, while production KFTC access and non-local Supabase writes fail closed.  
**Reason:** The foundation must be demonstrable without pretending mocks are live data or risking writes to an external project.

## ADR-010 — Compatible quality toolchain

**Decision:** Pin TypeScript 6.0.3 and ESLint 9.39.5 instead of blindly selecting every registry `latest` tag.  
**Reason:** These versions satisfy the installed Next.js and typescript-eslint peer ranges and make dependency validation reproducible.

## ADR-011 — Browser tests use the production server

**Decision:** Playwright builds the app and tests it through `next start`; development mode is not the default E2E server.  
**Reason:** This verifies the production artifact and avoids Next.js development cache growth during constrained local runs.

## ADR-012 — Transparent local authentication adapter

**Decision:** When `DEMO_MODE` is enabled and Supabase credentials are absent, use an explicitly labeled local authentication journey with AES-256-GCM sealed HttpOnly cookies that expire after eight hours. Non-demo runtime still requires configured authentication infrastructure.  
**Reason:** Phase 01 must remain testable without external credentials, but a mock session must not be presented as a live account or be readable and editable by client JavaScript.

## ADR-013 — Household membership changes use narrow RPCs

**Decision:** Bootstrap household ownership, invite a member, accept an invitation, and leave a household through fixed-search-path security-definer functions guarded by an immutable-identity transition trigger. Store invitee email only while membership is invited.  
**Reason:** Generic row updates cannot safely express who may perform each transition and previously allowed an owner to bypass invite acceptance semantics.

## ADR-014 — Supabase Studio is optional for local verification

**Decision:** Disable local Supabase Studio while its downloaded image fails with an invalid package configuration; Postgres, Auth, SQL lint, pgTAP, and generated types remain the required database evidence.  
**Reason:** An optional administration UI must not block database security verification, while the Docker containerd failure itself remains a documented external blocker rather than a skipped test.

## ADR-015 — Membership history and demo identity are fail-closed

**Decision:** Allow household and membership creation only through the narrow Phase 01 RPCs, disallow direct membership deletion, and bind each sealed demo onboarding payload to the session user ID that created it.  
**Reason:** Direct row mutations would bypass invitation acceptance or erase membership history, while an unbound browser cookie could combine one local demo identity's profile with another identity's session.

## ADR-016 — Credential-free tutoring state is session-keyed process memory

**Decision:** In demo mode, keep tutoring students, schedules, lessons, preparation, and mock finance in a server-process `Map` keyed by the authenticated local user ID; do not serialize the aggregate into a browser cookie.  
**Reason:** The tutoring aggregate quickly exceeds reliable cookie size limits. Process-local storage preserves the owner boundary and complete interactive flow without remote writes, while remaining honestly ephemeral across server restarts.

## ADR-017 — Lessons are immutable operational snapshots

**Decision:** Copy the student's fee, duration, mode, location, and meeting strategy when a lesson is created, and reject later changes to those snapshot fields in both the domain model and database trigger. Student default edits affect only future lessons.  
**Reason:** Historical lesson metrics and later receivable reconciliation must describe what was actually scheduled, not whatever defaults happen to exist when a report is viewed.

## ADR-018 — Recurrence and Calendar remain deterministic adapters

**Decision:** Materialize weekly schedules from Asia/Seoul local dates with a schedule/date occurrence key, and model Calendar/Meet behind a mock adapter until Phase 08. Generated mock meetings are unique per lesson; manually supplied reusable URLs remain explicitly user-managed and carry no generated conference identifier.  
**Reason:** Stable occurrence keys make retries safe, while adapter semantics let Phase 02 verify the full workflow without credentials or falsely claiming that external events were created.

## ADR-019 — Receivables are earned-work records, not cash transactions

**Decision:** Completing a lesson idempotently creates one receivable, while cash income exists only as a financial transaction and payments are represented by allocations between the two records. Tutoring metrics read received/outstanding amounts from this allocation ledger.  
**Reason:** Treating earned but unpaid tutoring as a deposit would inflate cash, duplicate income when payment arrives, and make partial or combined payments impossible to reconcile safely.

## ADR-020 — Matching suggestions are inert evidence packets

**Decision:** Score deposit candidates from amount, payer/student aliases, and timing, store the evidence and confidence, and require an explicit confirmation operation before creating an allocation. A dismissed suggestion remains resolved and is not silently regenerated.  
**Reason:** Similar amounts and payer names are useful hints but insufficient authority to mutate a financial ledger; preserving the human decision also provides an audit boundary.

## ADR-021 — Credential-free finance uses a provider-neutral, idempotent import boundary

**Decision:** Keep mock, manual CSV, KFTC testbed, and KFTC production behind one read-only BankProvider interface. Manual imports are previewed and validated, neutralize spreadsheet formula markers, and use deterministic per-account fingerprints; KFTC variants fail closed without credentials.  
**Reason:** The complete ledger workflow must work locally before bank onboarding without fabricating a live connection, while the same data boundary must prevent duplicate imports and unsafe partial batches.

## ADR-022 — Account balances are snapshots; transactions do not rewrite them implicitly

**Decision:** Store current and available account balances with an as-of/sync time and calculate cash flow from transactions. Manual income or expense entries do not silently mutate an account snapshot; explicit two-leg local transfers adjust the demo snapshots together.  
**Reason:** Bank balances and transaction histories can arrive on different schedules. Recomputing or incrementing a synchronized balance from every imported/manual row would double count and obscure the balance's provenance.

## ADR-023 — Subscription forecasts are occurrences, not transactions

**Decision:** Keep subscription definitions, effective-dated prices, generated billing occurrences, and actual financial transactions as separate records. Monthly equivalent is a comparison metric, while the annual projection sums generated unpaid occurrences.  
**Reason:** A renewal schedule is an obligation forecast, not proof that cash moved. Separating the records prevents future charges from inflating the ledger and preserves historical prices.

## ADR-024 — Subscription matching requires explicit, bounded confirmation

**Decision:** Suggest an expense match only when it is within seven days of the occurrence and score amount, descriptor, and expected account evidence. Confirmation reuses the existing expense transaction; a household occurrence creates at most one shared expense with exact integer-KRW splits.  
**Reason:** Repeated descriptors can match many future renewals, and creating a second expense during reconciliation would double count cash. A narrow time window plus a human confirmation boundary keeps suggestions useful but inert.

## ADR-025 — Subscription usage evidence is manual and terminal states preserve history

**Decision:** Store keep/review/cancel-candidate and last-used dates only as user-entered observations. Cancelled and ended subscriptions cannot be reactivated in place and stop mutable future occurrences while retaining paid history.  
**Reason:** The app has no authoritative service-usage telemetry, and rewriting a terminal subscription or paid occurrence would make past decisions and reconciliation misleading.

## ADR-026 — Household demo state is operationally shared but session-isolated

**Decision:** Keep the credential-free household aggregate in server-process memory keyed by the sealed demo user ID, derive friendly ownership labels from member references, and project confirmed Phase 04 household subscription expenses into the overview without copying their transaction or split records. Keep pre-Phase-06 rent and management rows read-only.  
**Reason:** Phase 05 needs complete interactive household flows without remote writes, while cross-module totals must still point to one source and parallel browser personas must not mutate each other's ephemeral test state. Phase 06 will replace the read-only base cost projection with the full shared-expense repository.

## ADR-027 — Inventory quantity changes require versioned, append-only commands

**Decision:** Represent local quantities as integer thousandths, require expected version plus idempotency key for adjustments, reject stale or negative results, and append before/after audit rows. In Postgres, revoke direct quantity-column updates and expose only a row-locking security-definer RPC bound to the authenticated member.  
**Reason:** A check constraint prevents negative committed values but cannot by itself prevent lost updates, duplicate retries, actor impersonation, or explain how a quantity changed.

## ADR-028 — Cleaning status is derived and completion is the historical fact

**Decision:** Derive OK, due-soon, and due from active state, next due date, and warning lead; treat the due date itself as due. Completion is append-only, actor-bound, and idempotent, and recurrence advances from the Korea-local completion date rather than from an old schedule anchor.  
**Reason:** Persisted status labels drift as time passes. A completion event plus deterministic next-date calculation preserves who did the work and keeps repeated requests from creating fictional history.

## ADR-029 — Shared-money cash movement and responsibility remain separate

**Decision:** Keep the owner's financial transaction as the one source of actual cash movement, and calculate each member's economic responsibility from exact integer-KRW shared-expense splits. A settlement allocation reconciles the two but never creates a duplicate income or expense row.  
**Reason:** The person who pays a bill is not necessarily the person who bears all of it. Combining cash paid, responsibility, and reimbursement into one number would overstate spending or available surplus and break partial-settlement reconciliation.

## ADR-030 — Shared facts are collaborative; financial evidence stays owner-private

**Decision:** Active household members may read shared expense, split, and aggregate settlement facts, while linked transaction details and settlement allocations remain visible only to the transaction owner. Suggestions are inert, and actor-bound security-definer RPCs perform every shared-money mutation and confirmation.  
**Reason:** Roommates need enough shared evidence to agree on who owes whom, but a shared bill must not reveal another member's account, full transaction history, counterparty, or private classification decisions.

## ADR-031 — Grow contributions are account transfers governed by one monthly rule

**Decision:** Calculate one responsibility-adjusted available-surplus value, split it into safety reserve, long-term contribution, and flexible money, and derive the contribution from either a fixed amount or an integer-basis-point percentage with a cap. Record completion only through linked two-leg transfers between the user's own accounts.  
**Reason:** A single auditable method is easier to follow than investment recommendations, while transfer linkage proves progress without inflating spending or changing total assets.

## ADR-032 — Home and analytics aggregate source records without owning duplicate totals

**Decision:** Build the action-first Home and month analytics as server-side projections over the tutoring, ledger, subscription, household, and Grow stores. Keep forecast, earned, received, outstanding, actual cash, economic responsibility, and available surplus visibly distinct, and link every alert or insight to its source workflow.  
**Reason:** Persisting dashboard copies would drift after a match, settlement, or transfer. Source-derived projections keep detail screens reconcilable and preserve the rule that suggestions remain inert until explicit confirmation.

## ADR-033 — Grow database mutations are actor-bound and retry-safe

**Decision:** Revoke authenticated direct writes to Grow plans, contributions, contribution-transfer links, and dismissed insights. Expose bounded security-definer RPCs that derive the actor from `auth.uid()`, validate owned reserve/investment accounts, create only two-leg internal transfers, and deduplicate contribution retries with a caller idempotency key.  
**Reason:** RLS owner checks alone do not prove that a completed contribution has a valid paired transfer or prevent a retried request from overstating progress. The RPC boundary makes the accounting invariant atomic and testable.

## ADR-034 — External adapters expose capabilities, ownership, and freshness before provider details

**Decision:** Keep Calendar and banking behind typed ports. Calendar events use a stable per-lesson app event ID and a distinct stable conference request ID, and only app-owned or explicitly linked events may be cancelled. Banking exposes account discovery, balance inquiry, and transaction history only; pagination is bounded and duplicate-safe, while production KFTC remains unconditionally blocked in this release line.  
**Reason:** Provider payloads, retries, and credentials should not leak into core workflows or UI. Explicit capability and ownership boundaries prevent accidental payment features, unrelated Calendar mutation, stale-data claims, and unsafe production graduation.

## ADR-035 — Integration state is client-readable, but secrets and mutations are server-bound

**Decision:** Store only an encrypted secret-manager reference in connection rows, never provider credentials. Revoke authenticated direct connection/sync writes; actor-bound RPCs record idempotent attempts, terminal results, redacted errors, cursors, and explicit revocation. Keep production KFTC blocked independently in runtime validation, provider construction, and a database constraint.  
**Reason:** RLS can isolate an owner's row but does not make a plaintext token safe or prove a retry is one logical job. Separate secret custody, command boundaries, and three independent production gates reduce leakage, fabricated freshness, duplicate imports, and accidental operational enablement.

## ADR-036 — Offline recent data is a marked private snapshot and never a writable replica

**Decision:** Cache only successful same-origin navigation responses in a session-cleared private cache, inject an offline-snapshot marker when serving a cached navigation, and reject every form POST while either the browser is offline or the rendered document carries that marker. Do not queue financial writes in this release.  
**Reason:** Browser network state alone is unreliable during service-worker fallback. A document-level provenance marker makes the read-only state explicit and prevents a cached page from presenting a write as successful when no server can receive it.

## ADR-037 — High-impact actions share one consequence-aware confirmation boundary

**Decision:** Use a client confirmation form for delete, cancel, match, settle, classify, allocate, unlink, and regenerate actions so pointer and implicit keyboard submission follow the same guard. Keep the mutation itself in a validated server action and add per-user in-memory limits to abuse-prone local-demo login, onboarding, CSV, match, and integration paths.  
**Reason:** Scattered click handlers miss Enter-key submission and do not protect the server boundary. The shared form gives consistent accessible behavior, while the rate limiter reduces accidental or scripted local abuse; a distributed limiter remains required before multi-instance production deployment.

## ADR-038 — Confirmation audit is triggered by the decision transition

**Decision:** When a match suggestion transitions from suggested to confirmed, append a separate reconciliation audit row containing authenticated actor, source suggestion/transaction/evidence, target kind/id, and explicit before/after linkage. Prevent authenticated clients from inserting or rewriting audit rows directly.  
**Reason:** Domain-specific RPC logs varied in detail and some retained only an after snapshot. Auditing the common status transition covers receivable, subscription, shared-expense, and settlement decisions consistently without trusting each caller to remember the evidence contract.

## ADR-039 — Preview automation may verify, but cannot silently promote

**Decision:** CI runs dependency review, application gates, migration lint, and the complete local RLS/pgTAP suite using an isolated Supabase stack. MCP examples are development-project-scoped and read-only. Preview deployment uses synthetic data and remains distinct from production promotion, which requires a separate explicit user confirmation and reviewed recovery plan.  
**Reason:** A green application build does not prove database authorization, and a convenient development connector must not inherit organization-wide or production access. Separating verification from promotion preserves an inspectable release boundary.

## ADR-040 — REIN uses a retro-window industrial brutalist system

**Decision:** Rename the product-facing identity to REIN and use one consistent retro-window system: checkerboard desktop substrate, warm paper work surfaces, rigid 2–3px compartment lines, hard offset shadows, monospace operational labels, and cyan/orange/magenta title-bar accents sampled from the canonical logo. Preserve semantic HTML, visible focus, 44px-class targets, reduced motion, and readable Korean typography even where the visual reference is intentionally abrasive.  
**Reason:** The two-user tutoring and household tool should feel like a compact personal control panel rather than a generic rounded SaaS dashboard. One shared shell and token layer lets legacy routes inherit the direction without changing their domain behavior.

## ADR-041 — The supplied PNG is the canonical REIN brand asset

**Decision:** Keep the user-supplied PNG as the sole canonical source for `public/rein-logo.png`. The only permitted asset transformation is the user-requested deterministic checkerboard extraction: change qualifying background alpha to transparent and trim empty canvas while preserving every retained foreground RGB value. Do not use a generated, redrawn, recolored, or visually similar replacement.
**Reason:** The user explicitly selected this exact artwork, prohibited a similar generated replacement, and later requested background removal. A reproducible pixel classifier satisfies both constraints while preventing silent changes to the visible logo.

## ADR-042 — REIN login uses a fixed shared four-digit doorbell PIN

**Decision:** Present 최재원 and 김태현 as physical-style nameplates and accept only the shared four-digit PIN `0036` through a touch keypad or the paste- and keyboard-compatible password field. Keep the server-side rate limit and Supabase password verification in place; the UI must not bypass authentication.
**Reason:** This matches the explicitly requested two-person doorbell interaction. The four-digit shared secret is intentionally accepted as a convenience tradeoff, while server validation and throttling still prevent accidental fallback to arbitrary PINs.

## ADR-043 — RAINY executes only bounded, unambiguous schedule commands

**Decision:** Place RAINY beside the weekly timetable as a visible personal-operator rail. It may create an authenticated weekly tutoring schedule only after resolving an existing student, weekday, explicit start time, and safe duration. Ambiguous 12-hour times trigger a clarification message, while deletion, cancellation, payment, and other high-impact commands remain behind their existing confirmation workflows.  
**Reason:** The requested conversational control should perform a real useful action without pretending a general AI integration exists or allowing natural-language ambiguity to bypass authorization, domain validation, and consequence-aware confirmation.

## ADR-044 — RAINY is an ambient Today operator, and only task handles drag

**Decision:** Supersede ADR-043's weekly-timetable placement by making `/home` the ambient Today workspace: open-layout task slips and a conversational RAINY share the existing Swiss-industrial substrate without an enclosing window. Persist lightweight Today task/view state by Seoul date in local storage, merge current scheduled lessons into that date, and keep authenticated weekly schedule creation on the existing server action. Restrict native `draggable` to each task's visible grip; provide explicit move-up and move-down buttons, and never attach drag handlers or draggable state to the page, workspace, chat, or mascot. RAINY's rise, lightning, and rain visualize command execution but do not determine correctness, and reduced-motion users receive a static state cue.
**Reason:** The requested hierarchy is “today first,” not a timetable with a chatbot sidebar. Date-scoped local state makes immediate conversational changes tangible without inventing an unapproved database table, while the server boundary still protects durable schedule writes. A grip-only drag region prevents accidental full-screen movement, and button alternatives satisfy keyboard, touch, and WCAG 2.2 dragging requirements.

## ADR-045 — RAINY is a persistent third-column rail, not Home page content

**Decision:** Supersede ADR-044's Home-page placement with a global three-column application shell. On desktop, reserve fixed physical widths for the left navigation and right RAINY rail while the current route owns the fluid center column. Mount one server-fed/client-interactive RAINY rail through the root layout so route transitions preserve conversation-era task state; on narrow screens, place that same rail after the center content instead of rendering a duplicate instance. Request-cache shared tutoring reads and catch auxiliary rail failures so the rail never replaces the center route with a global error boundary. Keep `draggable` exclusively on task grips inside the right rail, with move buttons as the non-drag alternative.
**Reason:** RAINY and priority tasks are persistent operational context, while settings, tutoring, money, and household are the work surface. Encoding those roles in the shell produces the requested left/center/right hierarchy on every route, prevents overlay collisions, preserves state during navigation, and contains optional-data failures without weakening authenticated schedule mutations.

## ADR-046 — RAINY automation is a deny-by-default UI capability catalog

**Decision:** RAINY may translate Korean chat into only typed, deterministic commands: fixed internal navigation, bounded visible-state summaries, `#main-content` scrolling, one unambiguous non-secret form field fill without submission, and non-destructive `type="button"` controls registered in a central path-aware catalog. Never accept model-provided URLs, selectors, JavaScript, arbitrary fetch targets, submit buttons, or destructive controls. Normalize encoded input before both client and server checks; hard-block configuration APIs, credentials, admin/security operations, and all automation while inside settings or authentication routes with `ACCESS DENIED: RESTRICTED DOMAIN`.
**Reason:** “Site-wide control” must not turn natural language into ambient code execution. A small capability catalog makes every possible side effect inspectable, lets navigation and reversible UI assistance remain low-touch, and keeps configuration, secrets, submissions, deletion, and money movement outside the agent boundary even if client code is bypassed.

## ADR-047 — RAINY weather is global execution telemetry, not correctness

**Decision:** Render one pointer-inert Canvas behind the application shell. Map active task count and transient command/API response payload to a clamped 0–100 precipitation signal, and trigger the global lightning overlay only for an actual allowlisted UI control or API execution. Model the mascot as `idle`, `thinking`, `executing`, and `blocked` slots with textual status. Stop Canvas motion for reduced-motion users and hidden tabs; never let weather overlays capture focus, pointer input, or drag state.
**Reason:** The requested rain and lightning can make RAINY feel embedded in the environment while remaining honest telemetry. Separating the visual signal from action success, permission checks, and chat feedback prevents animation from implying that a rejected or failed request changed application state.

## ADR-048 — Groq is a conversation provider, never the site command authority

**Decision:** Send only unrecognized, bounded chat history to Groq through a same-origin authenticated server route. Store a validated Groq key only as an AES-GCM-encrypted, user-bound, expiring HttpOnly session cookie scoped to `/api/rainy`; never place it in source, client state, local storage, logs, or model-visible messages. Keep all navigation and UI execution in the deterministic deny-by-default command router, and never feed model output back into that router.  
**Reason:** This provides the requested real AI conversation without letting probabilistic output cross the hard settings, secret, destructive-action, or arbitrary-API boundary.

## ADR-049 — Personal bank roles are a read-only operating map

**Decision:** For 최재원 only, present 우리은행 as the living-expense card, 카카오뱅크 with a 500,000 KRW usage ceiling, and KB국민은행 as the savings account. Match and show balances only from the current user's RLS-filtered accounts; otherwise show an honest disconnected state. The visual flow is planning information and never initiates a transfer.  
**Reason:** The user's bank-maintenance model is useful as an at-a-glance operating system, while the repository explicitly forbids money movement and requires each member's private ledger to remain invisible to the other household member.

## ADR-050 — Personal weekly blocks stay separate from tutoring recurrence

**Decision:** Store personal weekly blocks in an owner-RLS table instead of attaching them to a fabricated student or lesson. Allocate personal-block creation order and its 15-colour palette index inside a serialized database trigger. Render student and personal blocks through the same collision-aware timetable; personal colours rotate by creation order, while all blocks use the same 15-colour palette and a student's colour remains stable across that student's recurring blocks. Only the explicit draft grip is draggable, with weekday/time fields and arrow keys as equivalent save-before-commit controls.
**Reason:** Personal commitments must not materialize tutoring lessons, fees, or receivables. Server-assigned colour order resists concurrent client races, while a stable student colour makes repeated weekly lessons identifiable without reducing the requested palette. Keeping movement as an unsaved client draft prevents pointer mistakes from mutating durable data and preserves a keyboard/touch path.
## ADR-051 — 수입·지출 장부는 사용자 선택 대신 검증된 역할로 자동 라우팅한다

**Decision:** 최재원 계정의 지출은 우리은행 생활비 카드, 수입은 KB국민은행으로 서버에서 자동 라우팅한다. 카카오뱅크는 500,000원 사용 한도 역할을 유지하고 화면 순서는 KB국민은행 → 카카오뱅크 → 우리은행으로 고정한다. 외부 API 거래의 원본 계좌·금액·발생 시각은 수정하지 않고 분류·표시·메모만 정정하게 한다. 내부 장부 준비와 실제 은행 API 연결은 서로 다른 상태로 표시한다.  
**Reason:** 사용자가 매번 장부를 고르는 중복 입력을 없애면서도 외부 거래 원본과 감사 가능성을 보존하고, 준비된 로컬 장부를 실제 금융기관 연결로 오인하지 않게 하기 위해서다.

## ADR-052 — 쇼핑 연결과 구매 확정은 분리하며 화장실 청소를 주간 최우선으로 둔다

**Decision:** 장보기의 당근·쿠팡·알리 버튼은 검색어가 인코딩된 외부 검색만 새 탭에서 열고, 구매 완료·거래·공동비 연결은 별도 명시 동작으로 둔다. 청소 루틴은 화장실을 기본 최우선 항목으로 두고 매주 1회 반복한다.  
**Reason:** 외부 판매처 방문을 실제 구매로 간주하면 허위 재고·금융 기록이 생긴다. 가장 중요한 반복 청소를 눈에 띄게 유지하되 완료 확정은 사용자 통제 아래 두기 위해서다.

## ADR-053 — RAINY는 운영 화면을 보조하지만 설정과 금융 권한 경계를 넘지 않는다

**Decision:** RAINY는 금융 입력, 장보기, 청소, 재고, 공동비 등 허용된 화면으로 이동하고 비밀이 아닌 필드를 채우거나 비파괴 UI 동작을 보조할 수 있다. 설정 API, 인증 정보, 관리자·보안 영역, 송금, 제출·삭제 확정에는 접근하지 않는다.  
**Reason:** 관련 업무 전반을 대화로 빠르게 시작할 수 있게 하면서도 자연어 모델이 핵심 설정이나 실제 금융 행위를 우회 실행하지 못하게 하기 위해서다.

## ADR-054 — 세션·날짜·클라이언트 저장소는 실패 가능한 경계로 취급한다

**Decision:** 만료되거나 손상된 인증 정보는 비인증 상태로 복구하고, 로그아웃·인증 화면에서는 개인용 PWA 캐시를 제거한다. 서울 기준 날짜와 요일 계산은 공용 유틸리티로 통일한다. RAINY의 일일 저장 데이터는 런타임 검증 후 현재 서버 시간표와 병합하며 날짜 키가 바뀌는 동안 이전 데이터를 새 날짜에 쓰지 않는다.  
**Reason:** 화면과 기능을 바꾸지 않고도 자정 전환, 세션 만료, 손상된 브라우저 저장소, 변경된 시간표 때문에 오래된 개인 데이터가 노출되거나 현재 일정이 덮이는 오류를 방지하기 위해서다.
