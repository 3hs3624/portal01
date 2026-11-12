# 테이블 컬럼 상세 부록

소스 정의 테이블 40개. SQL에서 재생성한 물리 정의이며 운영 DB 실측 결과가 아닙니다.

NULL 표시는 PK의 암묵 NOT NULL을 반영합니다. UNIQUE/FK/CHECK/DEFAULT/IDENTITY는 원문 정의를 함께 제공합니다. `auth.users` 및 Supabase Storage 내부 테이블은 외부 관리 객체이며 별도 재생성하지 않습니다.

## TB-001 public.portal_workspaces

이전 JSON 작업공간·관계형 이전 원본
근거: [portal-workspaces.sql:4](../../../portal-workspaces.sql#L4). PK: `user_id, app_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| app_id | text | 아니오 | 앱 코드 markdown/projects/insight 중 테이블 허용 범위 | app_id text not null check (app_id in ('markdown','insight','projects')) |
| payload | jsonb | 아니오 | 원형 작업공간/서버 백업 JSONB | payload jsonb not null check (jsonb_typeof(payload)='object') |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null default gen_random_uuid() |
| updated_at | timestamptz | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at timestamptz not null default now() |

관계·테이블 제약:
- `primary key (user_id,app_id)`
- `constraint portal_workspace_size check (octet_length(payload::text)<=104857600)`

```sql
create table if not exists public.portal_workspaces (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check (app_id in ('markdown','insight','projects')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  primary key (user_id,app_id),
  constraint portal_workspace_size check (octet_length(payload::text)<=104857600)
);
```

## TB-002 portal_private.migrations

기본 역할 초기화 등 설치 이력
근거: [portal-admin.sql:6](../../../portal-admin.sql#L6). PK: `key`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| key | text | 아니오 | key 도메인 값; 해당 원형 객체 계약 참조 | key text primary key |

관계·테이블 제약:

```sql
create table if not exists portal_private.migrations(key text primary key);
```

## TB-003 portal_private.profiles

인증 계정의 표시 이름·이용 상태
근거: [portal-admin.sql:7](../../../portal-admin.sql#L7). PK: `user_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid primary key references auth.users(id) on delete cascade |
| display_name | text | 아니오 | display_name 도메인 값; 해당 원형 객체 계약 참조 | display_name text not null default '' check(length(display_name)<=100) |
| enabled | boolean | 아니오 | 이용/자동 정리 활성 여부 | enabled boolean not null default true |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 enabled boolean not null default true,created_at timestamptz not null default now()
);
```

## TB-004 portal_private.permissions

고정 권한 코드
근거: [portal-admin.sql:12](../../../portal-admin.sql#L12). PK: `code`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| code | text | 아니오 | 업무 코드(코드 정의서 참조) | code text primary key |
| name | text | 아니오 | 표시 이름 | name text not null |
| scope | text | 아니오 | scope 도메인 값; 해당 원형 객체 계약 참조 | scope text not null |

관계·테이블 제약:

```sql
create table if not exists portal_private.permissions(code text primary key,name text not null,scope text not null);
```

## TB-005 portal_private.roles

역할
근거: [portal-admin.sql:13](../../../portal-admin.sql#L13). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key default gen_random_uuid() |
| code | text | 아니오 | 업무 코드(코드 정의서 참조) | code text unique not null |
| name | text | 아니오 | 표시 이름 | name text not null |
| description | text | 아니오 | description 도메인 값; 해당 원형 객체 계약 참조 | description text not null default '' |
| builtin | boolean | 아니오 | builtin 도메인 값; 해당 원형 객체 계약 참조 | builtin boolean not null default false |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.roles(id uuid primary key default gen_random_uuid(),code text unique not null,name text not null,description text not null default '',builtin boolean not null default false,created_at timestamptz not null default now());
```

## TB-006 portal_private.role_permissions

역할에 부여한 권한
근거: [portal-admin.sql:14](../../../portal-admin.sql#L14). PK: `role_id, permission`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| role_id | uuid | 아니오 | role_id 도메인 값; 해당 원형 객체 계약 참조 | role_id uuid references portal_private.roles(id) on delete cascade |
| permission | text | 아니오 | view 또는 edit; owner는 파생 권한 | permission text references portal_private.permissions(code) on delete cascade |

관계·테이블 제약:
- `primary key(role_id,permission)`

```sql
create table if not exists portal_private.role_permissions(role_id uuid references portal_private.roles(id) on delete cascade,permission text references portal_private.permissions(code) on delete cascade,primary key(role_id,permission));
```

## TB-007 portal_private.user_roles

사용자 직접 역할
근거: [portal-admin.sql:15](../../../portal-admin.sql#L15). PK: `user_id, role_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid references portal_private.profiles(user_id) on delete cascade |
| role_id | uuid | 아니오 | role_id 도메인 값; 해당 원형 객체 계약 참조 | role_id uuid references portal_private.roles(id) on delete cascade |

관계·테이블 제약:
- `primary key(user_id,role_id)`

```sql
create table if not exists portal_private.user_roles(user_id uuid references portal_private.profiles(user_id) on delete cascade,role_id uuid references portal_private.roles(id) on delete cascade,primary key(user_id,role_id));
```

## TB-008 portal_private.groups

사용자 그룹
근거: [portal-admin.sql:16](../../../portal-admin.sql#L16). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key default gen_random_uuid() |
| name | text | 아니오 | 표시 이름 | name text unique not null |
| description | text | 아니오 | description 도메인 값; 해당 원형 객체 계약 참조 | description text not null default '' |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.groups(id uuid primary key default gen_random_uuid(),name text unique not null,description text not null default '',created_at timestamptz not null default now());
```

## TB-009 portal_private.group_members

그룹 구성원
근거: [portal-admin.sql:17](../../../portal-admin.sql#L17). PK: `group_id, user_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| group_id | uuid | 아니오 | group_id 도메인 값; 해당 원형 객체 계약 참조 | group_id uuid references portal_private.groups(id) on delete cascade |
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid references portal_private.profiles(user_id) on delete cascade |

관계·테이블 제약:
- `primary key(group_id,user_id)`

```sql
create table if not exists portal_private.group_members(group_id uuid references portal_private.groups(id) on delete cascade,user_id uuid references portal_private.profiles(user_id) on delete cascade,primary key(group_id,user_id));
```

## TB-010 portal_private.group_roles

그룹 역할
근거: [portal-admin.sql:18](../../../portal-admin.sql#L18). PK: `group_id, role_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| group_id | uuid | 아니오 | group_id 도메인 값; 해당 원형 객체 계약 참조 | group_id uuid references portal_private.groups(id) on delete cascade |
| role_id | uuid | 아니오 | role_id 도메인 값; 해당 원형 객체 계약 참조 | role_id uuid references portal_private.roles(id) on delete cascade |

관계·테이블 제약:
- `primary key(group_id,role_id)`

```sql
create table if not exists portal_private.group_roles(group_id uuid references portal_private.groups(id) on delete cascade,role_id uuid references portal_private.roles(id) on delete cascade,primary key(group_id,role_id));
```

## TB-011 portal_private.access_logs

로그인·세션 복원·로그아웃 기록
근거: [portal-admin.sql:19](../../../portal-admin.sql#L19). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key |
| actor_id | uuid | 아니오 | 행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의 | actor_id uuid not null |
| event | text | 아니오 | event 도메인 값; 해당 원형 객체 계약 참조 | event text not null check(event in('login','session_restore','logout')) |
| user_agent | text | 아니오 | user_agent 도메인 값; 해당 원형 객체 계약 참조 | user_agent text not null default '' |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.access_logs(id uuid primary key,actor_id uuid not null,event text not null check(event in('login','session_restore','logout')),user_agent text not null default '',created_at timestamptz not null default now());
```

명시 인덱스:
```sql
create index if not exists portal_access_actor_time on portal_private.access_logs(actor_id,created_at desc);
create index if not exists portal_access_time on portal_private.access_logs(created_at desc);
```

## TB-012 portal_private.audit_logs

관리 변경 감사
근거: [portal-admin.sql:20](../../../portal-admin.sql#L20). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | bigint | 아니오 | 행 UUID 식별자 | id bigint generated always as identity primary key |
| actor_id | uuid | 아니오 | 행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의 | actor_id uuid not null |
| action | text | 아니오 | action 도메인 값; 해당 원형 객체 계약 참조 | action text not null |
| target_id | uuid | 예 | target_id 도메인 값; 해당 원형 객체 계약 참조 | target_id uuid |
| details | jsonb | 아니오 | details 도메인 값; 해당 원형 객체 계약 참조 | details jsonb not null default '{}' |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.audit_logs(id bigint generated always as identity primary key,actor_id uuid not null,action text not null,target_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
```

명시 인덱스:
```sql
create index if not exists portal_audit_time on portal_private.audit_logs(created_at desc);
```

## TB-013 portal_private.user_invitations

초대 발송 상태·빈도 제한
근거: [supabase/migrations/202611030001_user_invitations.sql:2](../../../supabase/migrations/202611030001_user_invitations.sql#L2). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key default gen_random_uuid() |
| actor_id | uuid | 아니오 | 행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의 | actor_id uuid not null |
| email | text | 아니오 | email 도메인 값; 해당 원형 객체 계약 참조 | email text not null |
| display_name | text | 아니오 | display_name 도메인 값; 해당 원형 객체 계약 참조 | display_name text not null |
| status | text | 아니오 | 작업 상태(코드 정의서 참조) | status text not null default 'pending' check(status in('pending','sent','failed')) |
| user_id | uuid | 예 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:

```sql
create table if not exists portal_private.user_invitations(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,email text not null,
 display_name text not null,status text not null default 'pending' check(status in('pending','sent','failed')),
 user_id uuid,created_at timestamptz not null default now()
);
```

명시 인덱스:
```sql
create index if not exists portal_invite_email_time on portal_private.user_invitations(email,created_at desc);
```

## TB-014 portal_private.user_deletions

계정 삭제 작업 상태
근거: [supabase/migrations/20261103062618_user_deletion.sql:2](../../../supabase/migrations/20261103062618_user_deletion.sql#L2). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key default gen_random_uuid() |
| actor_id | uuid | 아니오 | 행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의 | actor_id uuid not null |
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| email | text | 아니오 | email 도메인 값; 해당 원형 객체 계약 참조 | email text not null |
| status | text | 아니오 | 작업 상태(코드 정의서 참조) | status text not null default 'pending' check(status in('pending','completed','failed')) |
| details | jsonb | 아니오 | details 도메인 값; 해당 원형 객체 계약 참조 | details jsonb not null default '{}' |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |
| finished_at | timestamptz | 예 | finished_at 도메인 값; 해당 원형 객체 계약 참조 | finished_at timestamptz |

관계·테이블 제약:

```sql
create table if not exists portal_private.user_deletions(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,user_id uuid not null,email text not null,
 status text not null default 'pending' check(status in('pending','completed','failed')),
 details jsonb not null default '{}',created_at timestamptz not null default now(),finished_at timestamptz
);
```

명시 인덱스:
```sql
create unique index if not exists portal_user_delete_pending on portal_private.user_deletions(user_id) where status='pending';
```

## TB-015 portal_private.log_retention

로그 보관 정책
근거: [supabase/migrations/20261103062619_log_retention.sql:2](../../../supabase/migrations/20261103062619_log_retention.sql#L2). PK: `singleton`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| singleton | boolean | 아니오 | singleton 도메인 값; 해당 원형 객체 계약 참조 | singleton boolean primary key default true check(singleton) |
| retention_days | int | 아니오 | retention_days 도메인 값; 해당 원형 객체 계약 참조 | retention_days int not null default 180 check(retention_days between 1 and 3650) |
| enabled | boolean | 아니오 | 이용/자동 정리 활성 여부 | enabled boolean not null default true |
| last_run | timestamptz | 예 | last_run 도메인 값; 해당 원형 객체 계약 참조 | last_run timestamptz |
| updated_at | timestamptz | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at timestamptz not null default now() |
| updated_by | uuid | 예 | updated_by 도메인 값; 해당 원형 객체 계약 참조 | updated_by uuid |

관계·테이블 제약:

```sql
create table if not exists portal_private.log_retention(
 singleton boolean primary key default true check(singleton),retention_days int not null default 180 check(retention_days between 1 and 3650),
 enabled boolean not null default true,
 last_run timestamptz,updated_at timestamptz not null default now(),updated_by uuid
);
```

## TB-016 public.portal_pm_workspaces

프로젝트 계정별 헤드·버전·루트 설정
근거: [portal-projects-relational.sql:3](../../../portal-projects-relational.sql#L3). PK: `user_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid primary key references auth.users(id) on delete cascade |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null default gen_random_uuid() |
| updated_at | timestamptz | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at timestamptz not null default now() |
| directories | jsonb | 아니오 | directories 도메인 값; 해당 원형 객체 계약 참조 | directories jsonb not null default '[]' |
| envelope | jsonb | 아니오 | 하위 배열을 제외한 작업공간 루트 속성 | envelope jsonb not null default '{"format":"portal-project-relational","version":1}' |

관계·테이블 제약:
- `constraint pm_directories_array check(jsonb_typeof(directories)='array')`

```sql
create table if not exists public.portal_pm_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision uuid not null default gen_random_uuid(), updated_at timestamptz not null default now(),
 directories jsonb not null default '[]', envelope jsonb not null default '{"format":"portal-project-relational","version":1}',
 constraint pm_directories_array check(jsonb_typeof(directories)='array')
);
```

## TB-017 public.portal_pm_projects

프로젝트 메타데이터·상태의 나머지 속성
근거: [portal-projects-relational.sql:9](../../../portal-projects-relational.sql#L9). PK: `user_id, project_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| name | text | 예 | 표시 이름 | name text |
| client | text | 예 | client 도메인 값; 해당 원형 객체 계약 참조 | client text |
| pm | text | 예 | pm 도메인 값; 해당 원형 객체 계약 참조 | pm text |
| pl | text | 예 | pl 도메인 값; 해당 원형 객체 계약 참조 | pl text |
| start_date | date | 예 | start_date 도메인 값; 해당 원형 객체 계약 참조 | start_date date |
| end_date | date | 예 | end_date 도메인 값; 해당 원형 객체 계약 참조 | end_date date |
| metadata | jsonb | 아니오 | 프로젝트 원형 meta JSON | metadata jsonb not null default '{}' |
| state_extra | jsonb | 아니오 | phases/calendar 등 분리 항목 이외의 현재 상태 | state_extra jsonb not null default '{}' |

관계·테이블 제약:
- `primary key(user_id,project_id)`

```sql
create table if not exists public.portal_pm_projects (
 user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade,
 project_id text not null, name text, client text, pm text, pl text, start_date date, end_date date,
 metadata jsonb not null default '{}', state_extra jsonb not null default '{}',
 primary key(user_id,project_id)
);
```

## TB-018 public.portal_pm_phases

WBS 단계
근거: [portal-projects-relational.sql:15](../../../portal-projects-relational.sql#L15). PK: `user_id, project_id, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null check(position>=0) |
| source_id | text | 예 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text |
| name | text | 예 | 표시 이름 | name text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,project_id,position)`
- `foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade`

```sql
create table if not exists public.portal_pm_phases (
 user_id uuid not null, project_id text not null, position integer not null check(position>=0),
 source_id text, name text, properties jsonb not null, primary key(user_id,project_id,position),
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
```

## TB-019 public.portal_pm_activities

단계 하위 Activity
근거: [portal-projects-relational.sql:20](../../../portal-projects-relational.sql#L20). PK: `user_id, project_id, phase_position, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| phase_position | integer | 아니오 | 상위 단계의 position | phase_position integer not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null check(position>=0) |
| source_id | text | 예 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text |
| name | text | 예 | 표시 이름 | name text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,project_id,phase_position,position)`
- `foreign key(user_id,project_id,phase_position) references public.portal_pm_phases on delete cascade`

```sql
create table if not exists public.portal_pm_activities (
 user_id uuid not null, project_id text not null, phase_position integer not null, position integer not null check(position>=0),
 source_id text, name text, properties jsonb not null, primary key(user_id,project_id,phase_position,position),
 foreign key(user_id,project_id,phase_position) references public.portal_pm_phases on delete cascade
);
```

## TB-020 public.portal_pm_tasks

Activity 하위 태스크
근거: [portal-projects-relational.sql:25](../../../portal-projects-relational.sql#L25). PK: `user_id, project_id, phase_position, activity_position, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| phase_position | integer | 아니오 | 상위 단계의 position | phase_position integer not null |
| activity_position | integer | 아니오 | 상위 Activity의 position | activity_position integer not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null check(position>=0) |
| source_id | text | 예 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text |
| name | text | 예 | 표시 이름 | name text |
| task_group | text | 예 | task_group 도메인 값; 해당 원형 객체 계약 참조 | task_group text |
| assignee | text | 예 | assignee 도메인 값; 해당 원형 객체 계약 참조 | assignee text |
| plan_start | date | 예 | 계획 시작일 | plan_start date |
| plan_end | date | 예 | 계획 완료일 | plan_end date |
| actual_start | date | 예 | 실제 시작일 | actual_start date |
| actual_end | date | 예 | 실제 완료일 | actual_end date |
| progress | numeric | 예 | 태스크 진척 숫자; 원형 WBS는 0~100 | progress numeric |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,project_id,phase_position,activity_position,position)`
- `foreign key(user_id,project_id,phase_position,activity_position) references public.portal_pm_activities on delete cascade`

```sql
create table if not exists public.portal_pm_tasks (
 user_id uuid not null, project_id text not null, phase_position integer not null, activity_position integer not null, position integer not null check(position>=0),
 source_id text, name text, task_group text, assignee text, plan_start date, plan_end date, actual_start date, actual_end date, progress numeric,
 properties jsonb not null, primary key(user_id,project_id,phase_position,activity_position,position),
 foreign key(user_id,project_id,phase_position,activity_position) references public.portal_pm_activities on delete cascade
);
```

명시 인덱스:
```sql
create index if not exists portal_pm_tasks_schedule on public.portal_pm_tasks(user_id,plan_start,plan_end);
create index if not exists portal_pm_tasks_progress on public.portal_pm_tasks(user_id,project_id,progress);
```

## TB-021 public.portal_pm_calendar

공휴일·마일스톤
근거: [portal-projects-relational.sql:33](../../../portal-projects-relational.sql#L33). PK: `user_id, project_id, kind, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| kind | text | 아니오 | kind 도메인 값; 해당 원형 객체 계약 참조 | kind text not null check(kind in('holidays','milestones')) |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| entry_date | date | 예 | 달력 항목 일자 | entry_date date |
| name | text | 예 | 표시 이름 | name text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,project_id,kind,position)`
- `foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade`

```sql
create table if not exists public.portal_pm_calendar (
 user_id uuid not null,project_id text not null,kind text not null check(kind in('holidays','milestones')),position integer not null,
 entry_date date,name text,properties jsonb not null,primary key(user_id,project_id,kind,position),
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
```

## TB-022 public.portal_pm_files

원형 파일 경로·JSON·비공개 바이너리 참조
근거: [portal-projects-relational.sql:38](../../../portal-projects-relational.sql#L38). PK: `user_id, path`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade |
| path | text | 아니오 | 상대 파일 경로; 절대 경로·.. 금지 | path text not null |
| role | text | 아니오 | meta/current/snapshot/json/blob 파일 분류 | role text not null check(role in('meta','current','snapshot','json','blob')) |
| project_id | text | 예 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text |
| document | jsonb | 예 | 파일의 비바이너리 JSON 원형 | document jsonb |
| asset_hash | text | 예 | 바이너리 SHA-256(64자리 소문자 hex) | asset_hash text |
| asset_bytes | bigint | 예 | 바이너리 크기(바이트) | asset_bytes bigint |

관계·테이블 제약:
- `primary key(user_id,path)`
- `constraint pm_asset_reference check((role='blob' and asset_hash is not null and asset_bytes is not null and asset_hash ~ '^[a-f0-9]{64}$' and asset_bytes between 0 and 104857600) or (role<>'blob' and asset_hash is null and asset_bytes is null))`

```sql
create table if not exists public.portal_pm_files (
 user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade,path text not null,
 role text not null check(role in('meta','current','snapshot','json','blob')),project_id text,document jsonb,
 asset_hash text,asset_bytes bigint,primary key(user_id,path),
 constraint pm_asset_reference check((role='blob' and asset_hash is not null and asset_bytes is not null and asset_hash ~ '^[a-f0-9]{64}$' and asset_bytes between 0 and 104857600) or (role<>'blob' and asset_hash is null and asset_bytes is null))
);
```

명시 인덱스:
```sql
create index if not exists portal_pm_files_project on public.portal_pm_files(user_id,project_id);
```

## TB-023 public.portal_pm_versions

저장 스냅샷
근거: [portal-projects-relational.sql:45](../../../portal-projects-relational.sql#L45). PK: `user_id, path`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| project_id | text | 아니오 | project_id 도메인 값; 해당 원형 객체 계약 참조 | project_id text not null |
| path | text | 아니오 | 상대 파일 경로; 절대 경로·.. 금지 | path text not null |
| name | text | 예 | 표시 이름 | name text |
| author | text | 예 | author 도메인 값; 해당 원형 객체 계약 참조 | author text |
| saved_at | timestamptz | 예 | 서버 백업/버전 저장 시각 | saved_at timestamptz |
| state | jsonb | 예 | state 도메인 값; 해당 원형 객체 계약 참조 | state jsonb |

관계·테이블 제약:
- `primary key(user_id,path)`
- `foreign key(user_id,path) references public.portal_pm_files on delete cascade`
- `foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade`

```sql
create table if not exists public.portal_pm_versions (
 user_id uuid not null,project_id text not null,path text not null,name text,author text,saved_at timestamptz,state jsonb,
 primary key(user_id,path),foreign key(user_id,path) references public.portal_pm_files on delete cascade,
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
```

명시 인덱스:
```sql
create index if not exists portal_pm_versions_project on public.portal_pm_versions(user_id,project_id,saved_at desc);
```

## TB-024 public.portal_pm_backups

교체 전 서버 매니페스트
근거: [portal-projects-relational.sql:51](../../../portal-projects-relational.sql#L51). PK: `user_id, revision`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null |
| saved_at | timestamptz | 아니오 | 서버 백업/버전 저장 시각 | saved_at timestamptz not null default now() |
| manifest | jsonb | 아니오 | 프로젝트 파일 매니페스트 백업 | manifest jsonb not null |

관계·테이블 제약:
- `primary key(user_id,revision)`

```sql
create table if not exists public.portal_pm_backups (
 user_id uuid not null references auth.users(id) on delete cascade,revision uuid not null,saved_at timestamptz not null default now(),
 manifest jsonb not null,primary key(user_id,revision)
);
```

명시 인덱스:
```sql
create index if not exists portal_pm_backups_recent on public.portal_pm_backups(user_id,saved_at desc);
```

## TB-025 public.portal_content_workspaces

문서/BI 계정·앱별 헤드와 루트 설정
근거: [portal-content-relational.sql:3](../../../portal-content-relational.sql#L3). PK: `user_id, app_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| app_id | text | 아니오 | 앱 코드 markdown/projects/insight 중 테이블 허용 범위 | app_id text not null check(app_id in('markdown','insight')) |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null default gen_random_uuid() |
| updated_at | timestamptz | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at timestamptz not null default now() |
| envelope | jsonb | 아니오 | 하위 배열을 제외한 작업공간 루트 속성 | envelope jsonb not null |

관계·테이블 제약:
- `primary key(user_id,app_id)`

```sql
create table public.portal_content_workspaces(
 user_id uuid not null references auth.users(id) on delete cascade,app_id text not null check(app_id in('markdown','insight')),
 revision uuid not null default gen_random_uuid(),updated_at timestamptz not null default now(),envelope jsonb not null,primary key(user_id,app_id)
);
```

## TB-026 public.portal_content_backups

문서/BI 교체 전 서버 백업
근거: [portal-content-relational.sql:7](../../../portal-content-relational.sql#L7). PK: `user_id, app_id, revision`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| app_id | text | 아니오 | 앱 코드 markdown/projects/insight 중 테이블 허용 범위 | app_id text not null check(app_id in('markdown','insight')) |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null |
| saved_at | timestamptz | 아니오 | 서버 백업/버전 저장 시각 | saved_at timestamptz not null default now() |
| payload | jsonb | 아니오 | 원형 작업공간/서버 백업 JSONB | payload jsonb not null |

관계·테이블 제약:
- `primary key(user_id,app_id,revision)`

```sql
create table public.portal_content_backups(
 user_id uuid not null references auth.users(id) on delete cascade,app_id text not null check(app_id in('markdown','insight')),revision uuid not null,saved_at timestamptz not null default now(),payload jsonb not null,primary key(user_id,app_id,revision)
);
```

명시 인덱스:
```sql
create index portal_content_backups_recent on public.portal_content_backups(user_id,app_id,saved_at desc);
```

## TB-027 public.portal_ws_folders

문서 폴더 계층
근거: [portal-content-relational.sql:11](../../../portal-content-relational.sql#L11). PK: `user_id, folder_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| folder_id | text | 아니오 | 문서 폴더/폴더 식별자; 문서의 NULL은 루트 | folder_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| name | text | 아니오 | 표시 이름 | name text not null check(btrim(name)<>'' and length(name)<=80) |
| parent_id | text | 예 | 상위 폴더 ID; NULL은 루트 | parent_id text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,folder_id)`
- `foreign key(user_id,parent_id) references public.portal_ws_folders(user_id,folder_id) deferrable initially deferred`

```sql
create table public.portal_ws_folders(
 user_id uuid not null references auth.users(id) on delete cascade,folder_id text not null,position integer not null,name text not null check(btrim(name)<>'' and length(name)<=80),parent_id text,properties jsonb not null,
 primary key(user_id,folder_id),foreign key(user_id,parent_id) references public.portal_ws_folders(user_id,folder_id) deferrable initially deferred
);
```

명시 인덱스:
```sql
create unique index portal_ws_folder_names on public.portal_ws_folders(user_id,coalesce(parent_id,''),btrim(name));
```

## TB-028 public.portal_ws_documents

문서 제목·본문·속성
근거: [portal-content-relational.sql:15](../../../portal-content-relational.sql#L15). PK: `user_id, document_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| document_id | text | 아니오 | document_id 도메인 값; 해당 원형 객체 계약 참조 | document_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| title | text | 아니오 | 제목 | title text not null check(btrim(title)<>'' and length(title)<=200) |
| content | text | 아니오 | 문서 원형 Markdown/확장 블록 문자열 | content text not null check(octet_length(content)<=5242880) |
| folder_id | text | 예 | 문서 폴더/폴더 식별자; 문서의 NULL은 루트 | folder_id text |
| created_at | text | 아니오 | 생성 시각 | created_at text not null |
| updated_at | text | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at text not null |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,document_id)`
- `foreign key(user_id,folder_id) references public.portal_ws_folders deferrable initially deferred`

```sql
create table public.portal_ws_documents(
 user_id uuid not null references auth.users(id) on delete cascade,document_id text not null,position integer not null,title text not null check(btrim(title)<>'' and length(title)<=200),content text not null check(octet_length(content)<=5242880),folder_id text,created_at text not null,updated_at text not null,properties jsonb not null,
 primary key(user_id,document_id),foreign key(user_id,folder_id) references public.portal_ws_folders deferrable initially deferred
);
```

명시 인덱스:
```sql
create index portal_ws_document_folder on public.portal_ws_documents(user_id,folder_id);
create index portal_ws_document_updated on public.portal_ws_documents(user_id,updated_at desc);
```

## TB-029 public.portal_ws_tags

문서 태그 순서
근거: [portal-content-relational.sql:19](../../../portal-content-relational.sql#L19). PK: `user_id, document_id, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| document_id | text | 아니오 | document_id 도메인 값; 해당 원형 객체 계약 참조 | document_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| tag | text | 아니오 | 태그 문자열 | tag text not null check(btrim(tag)<>'' and length(tag)<=40) |

관계·테이블 제약:
- `primary key(user_id,document_id,position)`
- `foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade`

```sql
create table public.portal_ws_tags(
 user_id uuid not null,document_id text not null,position integer not null,tag text not null check(btrim(tag)<>'' and length(tag)<=40),primary key(user_id,document_id,position),foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade
);
```

명시 인덱스:
```sql
create index portal_ws_tags_search on public.portal_ws_tags(user_id,tag);
```

## TB-030 public.portal_ws_comments

문서 페이지 댓글
근거: [portal-content-relational.sql:22](../../../portal-content-relational.sql#L22). PK: `user_id, document_id, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| document_id | text | 아니오 | document_id 도메인 값; 해당 원형 객체 계약 참조 | document_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| comment_id | text | 아니오 | comment_id 도메인 값; 해당 원형 객체 계약 참조 | comment_id text not null |
| author | text | 예 | author 도메인 값; 해당 원형 객체 계약 참조 | author text |
| body | text | 아니오 | 댓글 본문 | body text not null check(btrim(body)<>'' and length(body)<=5000) |
| posted_at | text | 아니오 | 페이지 댓글 작성 시각 문자열 | posted_at text not null |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,document_id,position)`
- `foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade`

```sql
create table public.portal_ws_comments(
 user_id uuid not null,document_id text not null,position integer not null,comment_id text not null,author text,body text not null check(btrim(body)<>'' and length(body)<=5000),posted_at text not null,properties jsonb not null,primary key(user_id,document_id,position),foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade
);
```

## TB-031 public.portal_bi_dashboards

대시보드 메타데이터
근거: [portal-content-relational.sql:25](../../../portal-content-relational.sql#L25). PK: `user_id, dashboard_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| dashboard_id | text | 아니오 | dashboard_id 도메인 값; 해당 원형 객체 계약 참조 | dashboard_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| name | text | 아니오 | 표시 이름 | name text not null |
| updated_at | text | 예 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,dashboard_id)`

```sql
create table public.portal_bi_dashboards(
 user_id uuid not null references auth.users(id) on delete cascade,dashboard_id text not null,position integer not null,name text not null,updated_at text,properties jsonb not null,primary key(user_id,dashboard_id)
);
```

## TB-032 public.portal_bi_cards

대시보드 카드 순서·설정
근거: [portal-content-relational.sql:28](../../../portal-content-relational.sql#L28). PK: `user_id, dashboard_id, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| dashboard_id | text | 아니오 | dashboard_id 도메인 값; 해당 원형 객체 계약 참조 | dashboard_id text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| configuration | jsonb | 아니오 | 카드 차트/KPI 설정 JSONB | configuration jsonb not null |

관계·테이블 제약:
- `primary key(user_id,dashboard_id,position)`
- `foreign key(user_id,dashboard_id) references public.portal_bi_dashboards on delete cascade`

```sql
create table public.portal_bi_cards(
 user_id uuid not null,dashboard_id text not null,position integer not null,configuration jsonb not null,primary key(user_id,dashboard_id,position),foreign key(user_id,dashboard_id) references public.portal_bi_dashboards on delete cascade
);
```

## TB-033 public.portal_bi_sources

연결·분리 데이터 소스
근거: [portal-content-relational.sql:31](../../../portal-content-relational.sql#L31). PK: `user_id, source_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| source_id | text | 아니오 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text not null |
| detached | boolean | 아니오 | true이면 연결 해제 후 조회용 보관 데이터 | detached boolean not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| name | text | 아니오 | 표시 이름 | name text not null |
| connected_at | text | 예 | 클라이언트에서 데이터를 가져오거나 수정한 시각 문자열 | connected_at text |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,source_id)`

```sql
create table public.portal_bi_sources(
 user_id uuid not null references auth.users(id) on delete cascade,source_id text not null,detached boolean not null,position integer not null,name text not null,connected_at text,properties jsonb not null,primary key(user_id,source_id)
);
```

## TB-034 public.portal_bi_sheets

데이터 소스의 시트
근거: [portal-content-relational.sql:34](../../../portal-content-relational.sql#L34). PK: `user_id, source_id, sheet_name`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| source_id | text | 아니오 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text not null |
| sheet_name | text | 아니오 | 소스 안의 시트 이름 | sheet_name text not null |
| properties | jsonb | 아니오 | 추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선 | properties jsonb not null |

관계·테이블 제약:
- `primary key(user_id,source_id,sheet_name)`
- `foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade`

```sql
create table public.portal_bi_sheets(
 user_id uuid not null,source_id text not null,sheet_name text not null,properties jsonb not null,primary key(user_id,source_id,sheet_name),foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade
);
```

## TB-035 public.portal_bi_columns

시트 열 이름·순서
근거: [portal-content-relational.sql:37](../../../portal-content-relational.sql#L37). PK: `user_id, source_id, sheet_name, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| source_id | text | 아니오 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text not null |
| sheet_name | text | 아니오 | 소스 안의 시트 이름 | sheet_name text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| name | text | 아니오 | 표시 이름 | name text not null |

관계·테이블 제약:
- `primary key(user_id,source_id,sheet_name,position)`
- `foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade`

```sql
create table public.portal_bi_columns(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,name text not null,primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade
);
```

## TB-036 public.portal_bi_rows

시트 행 값 배열
근거: [portal-content-relational.sql:40](../../../portal-content-relational.sql#L40). PK: `user_id, source_id, sheet_name, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| source_id | text | 아니오 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text not null |
| sheet_name | text | 아니오 | 소스 안의 시트 이름 | sheet_name text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| values | jsonb | 아니오 | columns position과 대응하는 행 값 배열 | "values" jsonb not null check(jsonb_typeof("values")='array') |

관계·테이블 제약:
- `primary key(user_id,source_id,sheet_name,position)`
- `foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade`

```sql
create table public.portal_bi_rows(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,"values" jsonb not null check(jsonb_typeof("values")='array'),primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade
);
```

## TB-037 public.portal_bi_links

시트의 대시보드 연결
근거: [portal-content-relational.sql:43](../../../portal-content-relational.sql#L43). PK: `user_id, source_id, sheet_name, position`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null |
| source_id | text | 아니오 | 원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키 | source_id text not null |
| sheet_name | text | 아니오 | 소스 안의 시트 이름 | sheet_name text not null |
| position | integer | 아니오 | 원본 배열 순서(0부터); 복합 PK의 일부 | position integer not null |
| link_key | text | 아니오 | saved:<dashboard ID> 또는 draft/preset 연결 키 | link_key text not null |
| name | text | 아니오 | 표시 이름 | name text not null |

관계·테이블 제약:
- `primary key(user_id,source_id,sheet_name,position)`
- `foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade`

```sql
create table public.portal_bi_links(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,link_key text not null,name text not null,primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade
);
```

## TB-038 portal_sharing.shared_items

개인 원본과 독립적인 공유 작업공간
근거: [portal-item-sharing.sql:5](../../../portal-item-sharing.sql#L5). PK: `id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| id | uuid | 아니오 | 행 UUID 식별자 | id uuid primary key default gen_random_uuid() |
| owner_id | uuid | 아니오 | 공유본 소유 계정 UUID | owner_id uuid not null references auth.users(id) on delete cascade |
| app_id | text | 아니오 | 앱 코드 markdown/projects/insight 중 테이블 허용 범위 | app_id text not null check(app_id in('markdown','projects','insight')) |
| source_key | text | 아니오 | 개인 원본 ID; 소유자·앱과 조합해 공유 중복 방지 | source_key text not null check(length(source_key) between 1 and 300) |
| title | text | 아니오 | 제목 | title text not null check(length(btrim(title)) between 1 and 200) |
| workspace | jsonb | 아니오 | 공유 단위의 원형 작업공간 JSONB | workspace jsonb not null |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null default gen_random_uuid() |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |
| updated_at | timestamptz | 아니오 | 최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존 | updated_at timestamptz not null default now() |

관계·테이블 제약:
- `unique(owner_id,app_id,source_key)`
- `check(octet_length(workspace::text)<=26214400)`

```sql
create table portal_sharing.shared_items(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 app_id text not null check(app_id in('markdown','projects','insight')),source_key text not null check(length(source_key) between 1 and 300),
 title text not null check(length(btrim(title)) between 1 and 200),workspace jsonb not null,
 revision uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(owner_id,app_id,source_key),check(octet_length(workspace::text)<=26214400)
);
```

명시 인덱스:
```sql
create index shared_items_owner_updated on portal_sharing.shared_items(owner_id,updated_at desc);
```

## TB-039 portal_sharing.shared_members

공유 수신자와 조회/편집 권한
근거: [portal-item-sharing.sql:12](../../../portal-item-sharing.sql#L12). PK: `item_id, user_id`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| item_id | uuid | 아니오 | item_id 도메인 값; 해당 원형 객체 계약 참조 | item_id uuid not null references portal_sharing.shared_items(id) on delete cascade |
| user_id | uuid | 아니오 | 계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자. | user_id uuid not null references auth.users(id) on delete cascade |
| permission | text | 아니오 | view 또는 edit; owner는 파생 권한 | permission text not null check(permission in('view','edit')) |
| created_at | timestamptz | 아니오 | 생성 시각 | created_at timestamptz not null default now() |

관계·테이블 제약:
- `primary key(item_id,user_id)`

```sql
create table portal_sharing.shared_members(
 item_id uuid not null references portal_sharing.shared_items(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 permission text not null check(permission in('view','edit')),created_at timestamptz not null default now(),primary key(item_id,user_id)
);
```

명시 인덱스:
```sql
create index shared_members_recipient on portal_sharing.shared_members(user_id,item_id);
```

## TB-040 portal_sharing.shared_versions

공유본 교체 전 최근 3개 버전
근거: [portal-item-sharing.sql:18](../../../portal-item-sharing.sql#L18). PK: `item_id, revision`.

| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |
|---|---|---|---|---|
| item_id | uuid | 아니오 | item_id 도메인 값; 해당 원형 객체 계약 참조 | item_id uuid not null references portal_sharing.shared_items(id) on delete cascade |
| revision | uuid | 아니오 | 낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지 | revision uuid not null |
| workspace | jsonb | 아니오 | 공유 단위의 원형 작업공간 JSONB | workspace jsonb not null |
| actor_id | uuid | 아니오 | 행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의 | actor_id uuid not null |
| saved_at | timestamptz | 아니오 | 서버 백업/버전 저장 시각 | saved_at timestamptz not null default now() |

관계·테이블 제약:
- `primary key(item_id,revision)`

```sql
create table portal_sharing.shared_versions(
 item_id uuid not null references portal_sharing.shared_items(id) on delete cascade,revision uuid not null,workspace jsonb not null,actor_id uuid not null,saved_at timestamptz not null default now(),primary key(item_id,revision)
);
```
