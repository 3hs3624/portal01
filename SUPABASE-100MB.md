# Supabase 작업공간 100MB 확장

클라우드 작업공간을 계정·앱별 100 MiB(104,857,600바이트)까지 저장하도록 클라이언트와 SQL을 변경했습니다. Supabase 프로젝트 전체의 요금제나 디스크 할당량을 변경하는 작업은 아닙니다.

## 기존 프로젝트에 적용

1. Supabase 대시보드에서 연결된 프로젝트의 **SQL Editor → New query**를 엽니다.
2. `portal-workspaces-100mb.sql` 전체를 붙여 넣고 `postgres` 역할로 실행합니다. 사이트의 `cloud-setup.html`에서도 업데이트 SQL을 내려받을 수 있습니다.
3. 포털을 새로고침하고 저장소 연결을 다시 확인합니다.

SQL은 기존 테이블의 `portal_workspace_size` 제약과 `portal_workspace_save` 저장 함수의 크기 제한을 함께 변경합니다. 기존 payload, revision, 사용자별 RLS 및 앱 접근 정책을 유지합니다. 다시 실행할 수 있으며 데이터를 삭제하지 않습니다. 신규 프로젝트용 `portal-workspaces.sql`과 설정 페이지 SQL도 100MB로 맞췄습니다.

이 저장소를 GitHub Pages에 배포하는 것만으로 Supabase의 DB 제약이 변경되지는 않습니다. DB 관리자 연결이 없는 클라우드 환경에서는 SQL을 자동 실행할 수 없으므로, **관리자가 위 SQL을 실행해야 실제 100MB 저장이 가능합니다.** 비밀번호나 service_role 키를 채팅이나 사이트에 입력할 필요는 없습니다.

적용 결과는 다음 읽기 전용 쿼리로 확인할 수 있습니다.

```sql
select pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.portal_workspaces'::regclass
and conname = 'portal_workspace_size';

select position('104857600' in pg_get_functiondef(
  'public.portal_workspace_save(text,jsonb,uuid)'::regprocedure
)) > 0 as save_function_uses_100mib;
```

첫 결과에 `104857600`, 두 번째 결과에 `true`가 표시되어야 합니다.

Write Studio 전체 작업공간·백업 복원과 앱 내부 브라우저 작업 사본도 100MB를 처리하도록 맞췄습니다. 기존 문서 한 개의 5MB 제한, 프로젝트 개별 파일 및 행·열 개수 제한, 별도 브라우저/폴더 저장소의 49MB 제한은 그대로입니다.

## 검증

```sh
node --expose-gc --max-old-space-size=1536 tests/cloud_workspace_limits.cjs
# pglast가 설치된 Python 환경:
python3 tests/workspace_sql.py
```

클라이언트 100MiB 경계와 초과 거절, 한글 UTF-8 크기, 52MB 문서 작업공간 복원, 프로젝트 작업공간 확장, 인증·앱 선택 검증을 확인합니다. PostgreSQL 및 PL/pgSQL 파서로 SQL을 검증하고 설정 페이지 SQL의 일치 여부를 확인합니다. 실제 Supabase DB에서의 적용·저장은 별도 확인이 필요합니다.
