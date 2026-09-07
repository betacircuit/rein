# Supabase schema notes

마이그레이션은 `0001`부터 순서대로 적용한다. 이 SQL은 구현 출발점이며 Codex는 로컬 Supabase에서 실제 적용·테스트 후 보완해야 한다. 변경은 기존 파일을 덮어쓰기보다 새 migration으로 추가한다.

## 필수 검증

- 모든 보호 테이블에 RLS가 켜져 있는가
- 무관한 User B가 User A의 private account/transaction/student를 읽지 못하는가
- 같은 household의 roommate가 inventory/cleaning/shared expense는 읽되 private finance는 읽지 못하는가
- 교과 과외에서 수학·물리·화학 외 과목이 거부되는가
- 생기부 과외 subject가 null인가
- 보강 상태가 스키마에 없는가
- lesson completion이 receivable을 중복 생성하지 않는가
- receivable allocation이 amount due를 넘지 않는가
- household split 합계가 정확한가
- own-account transfer 두 leg 합이 순자산/수입/지출을 바꾸지 않는가
- household subscription occurrence당 shared expense가 하나뿐인가

## 주의

- `bigint`를 Supabase/TypeScript 경계에서 문자열로 받을 수 있으므로 금액 codec을 둔다.
- `available_surplus`는 경제적 가용 잉여금이며 계좌 유동성과 다르다.
- 운영 데이터베이스에는 MCP를 연결하지 않는다.
