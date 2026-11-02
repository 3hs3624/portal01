# 사용자 초대 및 이용 상태 관리

시스템관리 → 사용자에서 **사용자 초대**, **이용 중지**, **재활성화**를 사용합니다.
초대된 계정에는 기존 등록 정책과 같은 일반 사용자(member) 역할만 부여됩니다.
추가 앱 권한과 관리자 역할은 별도의 역할 메뉴에서 관리합니다.
이용 중지는 인증 계정·문서를 삭제하지 않습니다. 인증 계정 영구 삭제는 제공하지 않습니다.

초대 메일은 계정 등록 안내입니다. 사용자는 포털의 기존 이메일 인증코드 로그인으로 접속합니다.
로그인 SDK의 자동 신규 가입 금지(`shouldCreateUser: false`)는 그대로 유지합니다.
초대 API는 클라이언트에서 전송한 역할이나 관리자 ID를 신뢰하지 않습니다.
서버가 Auth `/user`와 `portal_auth_context`로 요청자를 검증하고,
SQL에서 `system.access`와 `system.users.manage`를 다시 확인합니다.
초대 요청·발송 성공·발송 실패를 관리 변경 이력에 기록합니다.
같은 이메일은 10분 내 다시 요청할 수 없고, 관리자별 분당 5건·전체 하루 100건으로 제한합니다.
메일 발송 결과를 확인할 수 없으면 자동으로 재시도하지 않습니다.

## Supabase 배포 순서

대상 프로젝트: `tqomsmhicrjsidhuxkcb`.
기존 `portal-admin.sql`이 설치된 프로젝트를 전제로 합니다.
기존 데이터나 정책을 초기화하거나 `portal-admin.sql`을 다시 실행할 필요는 없습니다.

1. Supabase SQL Editor에서 `supabase/migrations/202611030001_user_invitations.sql`을 실행합니다.
   초대 전용 테이블과 service_role 전용 RPC 두 개를 추가하는 트랜잭션입니다.
2. 인증된 Supabase CLI로 저장소 루트에서 실행합니다.

   ```sh
   supabase functions deploy portal-user-invite --project-ref tqomsmhicrjsidhuxkcb --no-verify-jwt
   ```

   또는 Supabase Edge Functions 화면에 `portal-user-invite`를 만들고
   `index.ts`, `handler.mjs` 두 파일을 그대로 배포합니다.
   플랫폼의 legacy JWT 검사는 끕니다. 함수 내부의 Auth 서버 검증과 DB 권한 검사는 필수이며 항상 실행됩니다.
3. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 함수의 기본 서버 환경 변수입니다.
   비밀 키를 Pages 파일, 프런트엔드 설정, GitHub 저장소나 채팅에 넣지 마세요.
   기본 허용 Origin은 `https://3hs3624.github.io`입니다.
   호스트가 달라지면 서버의 `PORTAL_ORIGIN`을 해당 정확한 Origin으로 설정합니다.
4. Supabase Auth의 Redirect URLs에 `https://3hs3624.github.io/portal01/`을 허용하고 메일 발송 설정을 확인합니다.
5. 시스템관리의 사용자 초대에서 본인이 관리하는 테스트 이메일로 확인합니다.
   메일 수신, 기존 OTP 로그인, 일반 사용자 역할, 변경 이력을 확인한 후 운영합니다.
   실제 이메일 발송은 모의 검증에 포함하지 않습니다.

SQL과 함수를 배포하기 전에는 초대 기능을 사용할 수 없습니다.
이용 중지·재활성화는 기존 `portal_admin_change('user_save', ...)`를 그대로 사용하므로
기존 관리자 API가 설치된 환경에서 별도 DB 변경 없이 동작합니다.
다른 사용자의 기존 화면은 기존 권한 재검사 주기(약 60초, 백그라운드 탭에서는 지연 가능)에 따라 닫힙니다.
서버의 앱 권한 검사와 클라우드 저장소 정책은 중지된 계정의 새 요청을 차단합니다.
기존 화면에 이미 로드된 내용을 소급해서 회수하지는 않습니다.

## 검증

저장소 루트에서:

```sh
node tests/user_invite_handler.mjs
CHROMIUM_BIN=/usr/bin/chromium python3 tests/admin_sidebar.py
CHROMIUM_BIN=/usr/bin/chromium python3 tests/portal_sso.py
npm --prefix work/sql-check install @electric-sql/pglite --no-audit --no-fund
PGLITE_MODULE=../work/sql-check/node_modules/@electric-sql/pglite/dist/index.js node tests/user_invite_sql.mjs
```

브라우저 검증에는 Python Playwright와 Chromium이 필요합니다.
SQL 검증은 메모리 내 PostgreSQL에서 실제 함수와 권한을 실행하며 운영 DB를 변경하지 않습니다.
