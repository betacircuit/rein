# Codex MCP · 플러그인 · 스킬 설치 가이드

이 문서는 **Codex가 개발할 때 쓰는 도구**와 **완성 앱이 런타임에 쓰는 외부 API**를 엄격히 구분한다.

- MCP/스킬/플러그인: Codex의 개발·검증 보조 도구
- Google Calendar API와 금융결제원 오픈뱅킹 API: 완성 앱의 서버 통합
- 어떤 Codex 플러그인도 최종 앱의 런타임 의존성이 되어서는 안 된다.
- 운영 Supabase, 실제 은행 데이터, 개인 캘린더를 개발 MCP에 기본 연결하지 않는다.

## 1. 이 프로젝트에 필요한 것만 요약

| 도구 | 권장도 | 시점 | 목적 |
|---|---:|---:|---|
| Next.js DevTools MCP | 필수 | Phase 00부터 | 실행 중인 Next.js 16+ 앱 오류·라우트·로그 확인 |
| Supabase MCP | 필수 | Phase 01부터 | 로컬 또는 **개발 프로젝트** 스키마·문서 점검; 처음에는 read-only |
| Supabase Agent Skills | 필수 | Phase 00부터 | Auth, SSR, migrations, RLS, Postgres 작성 규칙 |
| Playwright MCP | 권장 | Phase 00부터 | 실제 브라우저 탐색·상태 확인·접근성 스모크 |
| shadcn MCP | 권장 | Phase 00부터 | 공식 컴포넌트 검색·설치 |
| Vercel MCP | 선택 | Phase 09 | Preview 배포·로그 확인; 운영 배포는 별도 승인 |
| GitHub MCP/플러그인 | 선택 | 저장소 원격 작업 시 | 이슈·PR·Actions; 로컬 코딩만 하면 불필요 |
| Codex Security 플러그인/CLI | 권장 | Phase 09 | 승인된 저장소 보안 검토 |
| OpenAI Developer Docs MCP | 선택 | OpenAI API 기능 추가 시 | 현재 MVP에는 OpenAI API 기능이 없으므로 필수 아님 |

**설치하지 않을 것:** Google Calendar MCP, 비공식 KFTC MCP, 범용 DB 쓰기 MCP. 앱 통합은 서버 어댑터와 공식 API로 구현한다.

## 2. 권장 로컬 환경

- Git
- Node.js 22 LTS 이상
- Corepack + pnpm
- Docker Desktop 또는 호환 컨테이너 런타임
- Supabase CLI
- 최신 OpenAI Codex CLI
- 선택: GitHub CLI, Vercel CLI

PowerShell:

```powershell
node --version
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
npm install -g @openai/codex
codex --version
```

macOS/Linux:

```bash
node --version
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
npm install -g @openai/codex
codex --version
```

설치 시점의 공식 문서와 패키지 요구 버전을 다시 확인하고, 앱 생성 후 lockfile을 커밋한다.

## 3. Codex MCP 설정 위치

Codex CLI·Desktop·IDE extension은 같은 Codex 호스트의 MCP 설정을 공유한다. 전역 설정은 `~/.codex/config.toml`, 신뢰한 저장소의 프로젝트 설정은 `.codex/config.toml`이다.

이 팩의 `.codex/config.toml.example`을 복사한 뒤, 실제로 사용할 블록만 활성화한다.

PowerShell:

```powershell
New-Item -ItemType Directory -Force .codex | Out-Null
Copy-Item .codex/config.toml.example .codex/config.toml
codex mcp list
```

macOS/Linux:

```bash
mkdir -p .codex
cp .codex/config.toml.example .codex/config.toml
codex mcp list
```

OAuth 서버는 다음 패턴으로 로그인한다.

```bash
codex mcp login <server-name>
```

MCP 명령 전체는 `codex mcp --help`, TUI 연결 상태는 `/mcp`로 확인한다.

## 4. MCP별 설정

### 4.1 Next.js DevTools MCP — 필수

Next.js 16+ 개발 서버가 실행 중일 때 빌드/런타임 오류, 라우트, 로그, 페이지 메타데이터를 점검한다.

```toml
[mcp_servers.next_devtools]
command = "npx"
args = ["-y", "next-devtools-mcp@latest"]
```

프로젝트 루트의 `.mcp.json`을 쓰는 클라이언트에는 `.mcp.json.example`도 제공되어 있다. Codex에서는 `.codex/config.toml` 하나만으로 충분하므로 중복 서버를 두 번 실행하지 않는다.

### 4.2 Supabase MCP — 필수, 로컬/개발만

가장 안전한 순서:

1. 처음에는 로컬 Supabase와 migration 파일을 사용한다.
2. 원격 개발 프로젝트가 생기면 `project_ref`로 범위를 고정한다.
3. 최초에는 `read_only=true`를 유지한다.
4. 스키마 변경은 MCP 즉흥 수정이 아니라 Git에 남는 SQL migration으로 한다.
5. 운영 프로젝트나 실제 금융·학생 데이터에는 연결하지 않는다.

원격 개발 프로젝트 예시:

```toml
[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=REPLACE_WITH_DEV_PROJECT_REF&read_only=true"
```

로컬 Supabase MCP를 쓰는 경우 공식 로컬 엔드포인트를 별도 서버명으로 추가할 수 있다.

```toml
[mcp_servers.supabase_local]
url = "http://127.0.0.1:54321/mcp"
```

둘 다 동시에 쓰면 Codex가 대상을 혼동할 수 있으므로 활성 서버명을 명확히 하고, 쓰기 전에는 항상 로컬/개발 프로젝트인지 확인한다.

### 4.3 Playwright MCP — 권장

실제 브라우저에서 360×800 모바일과 1440×900 데스크톱, 폼, 다이얼로그, 빈/오류/오프라인 상태를 검증한다.

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest", "--isolated"]
```

`--isolated`는 테스트 세션을 개인 로그인 브라우저와 분리한다. 앱의 자동화 테스트 자체는 MCP가 아니라 저장소의 Playwright Test로 작성하고 CI에서 실행한다.

#### 대안: Playwright CLI + Skills

대규모 반복 검증에서 토큰 효율을 우선하면 MCP 대신 공식 Playwright CLI와 스킬을 사용할 수 있다.

```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
```

처음에는 둘 중 하나로 시작하고, 필요할 때만 병행한다.

### 4.4 shadcn MCP — 권장

```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
```

공식 registry 컴포넌트를 검색·설치하는 용도다. 컴포넌트를 설치한 뒤에는 생성 코드를 저장소 소스로 취급하고 접근성·디자인 일관성을 직접 검증한다.

### 4.5 Vercel MCP — Phase 09 선택

Preview 환경이 준비된 뒤에만 추가한다.

```bash
codex mcp add vercel --url https://mcp.vercel.com
codex mcp login vercel
```

Codex가 Preview를 읽거나 만들 수 있어도 **Production 배포와 환경변수 변경은 사용자 명시 승인 없이 하지 않는다.**

### 4.6 GitHub MCP — 원격 이슈/PR이 필요할 때만

Codex는 로컬 저장소를 MCP 없이 읽고 수정할 수 있다. GitHub MCP는 원격 이슈·PR·Actions를 다룰 때만 추가한다.

공식 GitHub MCP를 쓸 때는 다음 원칙을 지킨다.

- 처음에는 read-only 모드
- 필요한 toolset만 활성화
- 최소 권한 fine-grained PAT
- PAT는 셸 환경변수로만 전달
- push/PR 생성은 사용자 승인 후

로컬 Docker 방식 예시를 쓸 경우 공식 GitHub MCP 문서의 최신 Codex 설정을 확인한다. 이 팩은 민감 토큰이 들어갈 수 있는 GitHub MCP 블록을 기본 설정에 활성화하지 않는다.

### 4.7 OpenAI Developer Docs MCP — 선택

현재 Student OS MVP는 OpenAI API를 호출하지 않는다. 향후 설명 가능한 AI 지출 분류나 월간 리포트를 구현하는 별도 단계에서만 추가한다.

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
```

## 5. 필수 스킬 설치

### 5.1 Supabase Agent Skills — 필수

저장소 루트에서:

```bash
npx skills add supabase/agent-skills
```

필요한 두 핵심 스킬만 설치하려면:

```bash
npx skills add supabase/agent-skills --skill supabase
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
```

업데이트:

```bash
npx skills update
```

Codex는 저장소의 `.agents/skills`를 읽는다. 설치 후 `git status`로 추가 파일을 검토하고, 공식 Supabase 원본인지 확인한 뒤 팀 공유가 필요하면 커밋한다.

### 5.2 Codex 플러그인 — 가용할 때 선택 설치

Codex CLI에서 `/plugins`를 열고 계정·환경에 표시되는 공식 플러그인만 설치한다. 플러그인 설치 후 **새 세션**을 시작해야 스킬과 도구가 로드된다. Codex IDE extension은 플러그인을 지원하지 않으므로 CLI 또는 ChatGPT Desktop의 Codex를 사용한다.

검색 우선순위:

- `build-web-apps`: 제품형 프런트엔드 구현 보조
- `codex-security`: Phase 09 보안 검토
- `github`: 원격 저장소 작업을 할 때
- `vercel`: Preview 배포를 할 때
- `supabase`: 공식 항목이 현재 디렉터리에 노출될 때만

플러그인 카탈로그는 계정·surface에 따라 달라질 수 있다. 검색되지 않는 이름을 비공식 복제본으로 대체하지 않는다. Supabase는 위의 공식 Agent Skills + MCP 구성이면 충분하다.

## 6. 앱 통합과 혼동하면 안 되는 것

### Google Calendar / Google Meet

Codex 개인 Google Calendar 플러그인을 앱 기능으로 쓰지 않는다. 완성 앱이 자체 OAuth 동의를 받고 서버에서 Google Calendar API를 호출한다. 개발 중에는 mock adapter와 테스트 캘린더를 사용한다.

### 은행 계좌

KFTC/은행 MCP를 설치하지 않는다. 완성 앱의 서버 어댑터는 `MOCK`, `MANUAL_CSV`, `KFTC_TESTBED`, 비활성 기본값의 `KFTC_PRODUCTION`을 구현한다. 조회 전용이며 송금·자동이체 실행 기능은 없다.

## 7. 단계별 활성 도구

| 단계 | 활성 도구 |
|---|---|
| Phase 00 | Next DevTools, Playwright, shadcn, Supabase Skills |
| Phase 01 | 로컬 Supabase + 필요 시 개발 Supabase read-only MCP |
| Phase 02–07 | Next DevTools, Playwright, Supabase; GitHub는 필요 시만 |
| Phase 08 | 공식 Google/KFTC 문서와 개발 OAuth/testbed; 실제 개인 금융 데이터 금지 |
| Phase 09 | Codex Security, GitHub, Vercel Preview |

## 8. 설치 확인 체크리스트

```text
[ ] codex --version 실행
[ ] codex mcp list에서 필요한 서버만 Connected
[ ] Next.js MCP는 개발 서버 기동 후 오류/라우트 조회 가능
[ ] Supabase MCP 대상이 local 또는 명시적 dev project_ref
[ ] Supabase 원격 MCP가 read_only=true로 시작
[ ] Supabase Skills가 .agents/skills 또는 Codex 인식 위치에 있음
[ ] Playwright가 isolated 테스트 브라우저를 사용
[ ] 운영 토큰·service role·PAT가 Git 추적 파일에 없음
[ ] Google/KFTC 실제 자격이 없어도 mock 경로로 전체 앱 실행 가능
[ ] Production 배포/DB/KFTC 변경은 승인 없이는 불가능
```

## 9. 공식 출처

설치 직전에 최신 내용을 확인할 공식 문서:

- OpenAI Codex MCP: `https://developers.openai.com/codex/mcp/`
- OpenAI Codex Skills: `https://developers.openai.com/codex/skills/`
- OpenAI Codex Plugins: `https://developers.openai.com/codex/plugins/`
- Next.js MCP: `https://nextjs.org/docs/app/guides/mcp`
- Supabase MCP: `https://supabase.com/docs/guides/ai-tools/mcp`
- Supabase Agent Skills: `https://supabase.com/docs/guides/ai-tools/ai-skills`
- Playwright MCP: `https://github.com/microsoft/playwright-mcp`
- shadcn MCP: `https://ui.shadcn.com/docs/mcp`
- Vercel MCP: `https://vercel.com/docs/agent-resources/vercel-mcp`
- GitHub MCP: `https://github.com/github/github-mcp-server`
