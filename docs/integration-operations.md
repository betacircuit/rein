# 외부 연동 운영 경계

Student OS의 외부 연동은 서버 어댑터만 사용한다. 브라우저 번들, `NEXT_PUBLIC_*` 환경변수, 일반 애플리케이션 테이블에는 Google/KFTC access token, refresh token, client secret, `fintech_use_num`을 넣지 않는다. 데이터베이스에는 `vault://`, `kms://`, `secret-manager://` 형식의 암호화 저장소 참조만 허용한다.

Google OAuth 동의 화면은 `https://www.googleapis.com/auth/calendar.events` 하나만 요청한다. 앱이 만든 이벤트나 사용자가 명시적으로 연결한 이벤트만 수정·취소하며, 연결 해제 시 서버의 토큰 철회 절차를 먼저 수행하고 데이터베이스 참조를 제거한다. 개인 Calendar용 Codex 플러그인은 개발 편의 기능일 뿐 애플리케이션 의존성이 아니다.

은행 어댑터의 capability는 계좌 조회, 잔액 조회, 거래내역 조회뿐이다. 출금이체, 입금이체, 결제 시작 endpoint와 UI는 만들지 않는다. 자격증명이 없을 때는 mock 또는 검증·미리보기·중복 제거를 거치는 수동 CSV 경로를 사용한다.

## KFTC 운영 승격 금지

현재 릴리스에서는 `BANK_PROVIDER=kftc_production` 또는 `KFTC_PRODUCTION_ENABLED=true` 중 하나라도 설정되면 시작 단계에서 실패한다. 데이터베이스도 `kftc_production` 연결 생성을 check constraint로 거부하고, `KftcProductionProvider` 생성자는 항상 예외를 던진다. 따라서 환경변수 변경만으로 운영 연결을 켤 수 없다.

향후 별도 릴리스에서만 기관 신청 및 이용 적격성, 계약, 사용자 동의 문구, 보안 심사, 키 관리와 철회 절차, 테스트베드 회귀, 운영자 승인 기록을 모두 확인한 뒤 코드·데이터베이스·운영 설정의 세 하드 게이트를 함께 변경한다. 이 문서는 승인 자체를 대신하지 않는다.

## 장애와 로그

동기화는 idempotency key, 제한된 페이지 수, 안정적인 외부 거래 ID로 중복을 막는다. timeout, 429, 5xx만 제한 횟수 내에서 지수 backoff와 jitter로 재시도한다. 마지막 시도와 성공 시각은 따로 기록하고, 실패 상태는 복구 동작과 함께 표시한다. 구조화 로그와 저장 오류에는 토큰, secret, fintech 번호, 계좌처럼 보이는 긴 숫자를 기록하기 전에 반드시 redaction을 적용한다.
