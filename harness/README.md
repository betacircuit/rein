# Build Harness

`harness/build/`는 Codex가 큰 프롬프트를 한 번에 흉내만 내지 않고, 검증 가능한 순서로 완성하도록 하는 실행 체크리스트다.

## 사용 규칙

1. `MASTER_CODEX_PROMPT.md`를 먼저 전달한다.
2. Codex가 `AGENTS.md`와 필수 문서를 읽었는지 확인한다.
3. `phase-00`부터 번호순으로 진행한다.
4. 각 단계 시작 시 해당 파일의 요구사항 ID를 구현 파일/테스트에 매핑한다.
5. 단계 종료 시 `PROGRESS.md`에 ID별 증거를 남긴다.
6. 테스트가 실패하거나 이전 단계 불변식이 깨지면 다음 단계로 가지 않는다.
7. `backlog.md` 항목은 UI에 빈 버튼으로 만들지 않는다.

각 고유 요구사항 ID는 정확히 하나의 단계 파일에만 배정된다. `scripts/check-spec-coverage.mjs`가 배정 누락/중복과 핵심 문서 추적성을 검사한다.
