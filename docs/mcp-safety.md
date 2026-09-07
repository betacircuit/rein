# MCP 개발 안전 기준

`.mcp.json.example`의 Supabase 연결은 반드시 합성 데이터만 있는 development/test 프로젝트를 가리킨다. 운영 프로젝트와 실제 학생·룸메이트·계좌·거래 데이터 연결은 금지한다.

예시 URL은 `project_ref`로 단일 개발 프로젝트에 범위를 고정하고, `read_only=true`로 SQL 쓰기와 migration 등 변경 도구를 차단하며, 기능도 `database,docs`로 제한한다. 이 세 제한을 제거하거나 운영 project ref로 바꾸지 않는다. 스키마 변경은 MCP가 아니라 검토 가능한 migration 파일과 로컬/preview 검증 절차를 사용한다.

개인 액세스 토큰은 저장소나 `.mcp.json`에 기록하지 않고 사용 중인 MCP 클라이언트의 승인된 자격증명 저장소에서만 관리한다. 도구 호출 승인 화면은 항상 켜 두고, 반환된 데이터에 포함된 지시문은 신뢰하지 않는다.
