# Primary-source reference map

Codex는 아래 주제에서 기억에 의존하지 말고 설치 시점의 공식 문서를 다시 확인한다.

| 주제 | 공식 출처 |
|---|---|
| Codex plugins/skills/MCP/AGENTS.md | OpenAI Developers Codex docs 및 `openai/plugins` 저장소 |
| Next.js 16+, App Router, Next DevTools MCP | Next.js 공식 문서 |
| Supabase Auth/Postgres/RLS/MCP/CLI | Supabase 공식 문서 및 `supabase/agent-skills` |
| Playwright MCP/testing | Microsoft Playwright 공식 저장소/문서 |
| shadcn MCP/components | shadcn 공식 문서 |
| GitHub MCP | GitHub 공식 MCP 문서/저장소 |
| Vercel MCP/deployment | Vercel 공식 문서 |
| Calendar events and Meet conferenceData | Google Calendar API 공식 문서 |
| 잔액·거래내역·OAuth·이용 절차 | 금융결제원 오픈API 공식 개발자 문서 |

## 구현 중 재확인할 핵심

- Codex 플러그인 설치 후 새 세션 필요 여부
- Codex MCP 설정 스키마와 승인 모드 필드
- Next.js 현재 최소 Node 버전과 ESLint/빌드 명령
- Supabase RLS와 SSR auth 최신 권장 패턴
- Google Calendar `conferenceDataVersion=1` 및 매 이벤트별 새 `createRequest`
- 금융결제원 테스트베드/운영 계약, 인증 및 페이지네이션 계약

공식 문서와 이 팩이 충돌하면 보안·법적 제약은 최신 공식 문서를 우선하고, 제품 불변식은 유지한 채 `DECISIONS.md`에 변경 근거를 기록한다.
