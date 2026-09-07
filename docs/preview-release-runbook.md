# 미리보기 릴리스 절차

이 문서는 배포 권한을 부여하지 않는다. 현재 작업에서는 로컬 실행만 허용되며 Vercel 배포와 원격 Supabase migration은 수행하지 않는다.

## 미리보기 전 확인

개발자는 `pnpm install --frozen-lockfile`, `pnpm audit --audit-level=high`, `pnpm verify`를 실행한다. Docker 기반 로컬 Supabase가 준비된 환경에서는 `pnpm db:reset`, `pnpm verify:db`도 통과해야 한다. secret scan 결과와 변경된 migration을 직접 검토하고, `.env`나 MCP 설정에 운영 URL·service role·금융 자격증명이 없는지 확인한다.

미리보기는 별도 Vercel preview 프로젝트와 별도 Supabase development 프로젝트만 사용한다. 데이터는 합성 fixture만 허용하며 실제 학생, 룸메이트, 계좌, 거래, Google/KFTC 운영 자격증명을 넣지 않는다. migration은 먼저 로컬 DB, 그다음 폐기 가능한 development DB에서 적용·rollback/restore 절차를 확인한다.

## 미리보기 검증

모바일 375×812, 가로 812×375, 데스크톱에서 로그인부터 핵심 흐름을 수행한다. 키보드만으로 탐색하고 focus, 오류 요약, 확인 대화, 오프라인 읽기와 쓰기 거부, 내보내기와 삭제를 확인한다. 브라우저 console/page error, 보안 헤더, manifest/service worker, 비밀값 없는 로그를 검사한다.

## 운영 승격

미리보기 성공은 운영 승격 승인이 아니다. 운영 배포에는 사용자의 별도 명시적 확인, 변경 목록과 검증 증거, 백업/복구 계획, production migration 대상 확인, 승인된 secret manager 참조가 모두 필요하다. KFTC 운영은 기관 신청·계약·동의·보안 심사와 별도 코드 릴리스 없이는 계속 차단한다.
