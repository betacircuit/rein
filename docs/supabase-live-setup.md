# Supabase 실사용 연결

로컬 앱에는 `REIN / main`의 URL과 publishable key가 연결되어 있다. 서비스 역할 키는 필요하지 않다.

## 1. 원격 스키마 적용

현재 원격 프로젝트에는 `public.profiles`가 없다. Supabase CLI를 이 프로젝트가 속한 계정으로 다시 로그인한 뒤 다음 순서로 진행한다.

```powershell
pnpm exec supabase login
pnpm db:link:rein
pnpm db:push:dry
pnpm db:push:remote
```

`db:push:remote`는 프로덕션 DB를 변경하므로 dry-run 확인과 별도 배포 승인을 받은 뒤에만 실행한다.

## 2. 두 사용자 생성

Supabase Dashboard의 Authentication → Users에서 다음 두 사용자를 만든다. User metadata의 `display_name`도 함께 입력한다.

| 앱 로그인 이름 | Supabase 이메일 별칭 | `display_name` |
|---|---|---|
| 최재원 | `choi.jaewon@rein.local` | 최재원 |
| 김태현 | `kim.taehyeon@rein.local` | 김태현 |

두 계정에는 서로 다른 8자 이상의 비밀번호를 사용한다. `0036`은 Supabase 최소 길이를 충족하지 않고 두 사람이 공유하기에도 안전하지 않다.

## 3. 첫 로그인 순서

최재원이 먼저 로그인하면 `재원·태현 자취방`과 김태현 초대가 생성된다. 그다음 김태현이 로그인하면 초대를 수락하고 두 계정이 같은 우리집에 연결된다.

## 4. 학생과 시간표

학생 메뉴에서 학생을 추가한 뒤 시간표 메뉴에서 학생, 요일, 시작 시각, 종료 시각을 입력한다. 시간표는 분 단위 값을 저장하고 데스크톱에서는 주간 그리드, 모바일에서는 요일별 목록으로 표시한다.
