# Portal01 테이블정의서

문서 ID: TB-SPEC-01 · 개정1.0 · 2026-11-13(KST). 저장소의 SQL/serializer를 기준으로 한 재구현 물리·논리 설계입니다. 운영 DB를 조회/변경하지 않았습니다. 실서버에서 별도로 적용된 DDL 차이는 설치 전에 비교해야 합니다.

## 1. 물리 사전의 적용 방법

[컬럼 상세 부록](appendices/table-columns.md)은 **40개 테이블·223개 컬럼**의 타입, PK에 의한 NOT NULL, NULL 허용, 기본값/IDENTITY, CHECK/UNIQUE/FK, ON DELETE/DEFERRABLE, 명시 인덱스, CREATE TABLE 원문을 포함합니다. 원문이 요약보다 우선합니다. [기계 판독 계약](appendices/contracts.json)은 같은 정보를 JSON으로 제공합니다. 초기 CREATE만으로 끝내지 말고 아래 정책/trigger/후속 override를 같은 순서로 적용합니다.

PostgreSQL/Supabase의 auth.users, storage.buckets, storage.objects 등은 서비스 관리 객체입니다. 이 프로젝트가 정의한 40개와 구분하며 복사한 가짜 인증 테이블로 운영하지 않습니다. 테스트의 auth 스텁은 테스트 전용입니다.

## 2. 도메인별 테이블 목록·논리 관계

| 도메인 | 테이블 | 관계/집계 루트 |
|---|---|---|
| 관리(14) | migrations,profiles,permissions,roles,role_permissions,user_roles,groups,group_members,group_roles,access_logs,audit_logs,user_invitations,user_deletions,log_retention | portal_private 스키마, profile과 Auth 계정, 사용자/그룹→역할→권한 |
| 기존 JSON(1) | public.portal_workspaces | PK(user_id,app_id); 관계형 이전 시 원본 보존 |
| 프로젝트(9) | portal_pm_workspaces/projects/phases/activities/tasks/calendar/files/versions/backups | 계정 헤드→프로젝트→단계→Activity→Task, files/versions 별도 |
| 문서·BI(13) | portal_content_workspaces/backups,portal_ws_folders/documents/tags/comments,portal_bi_dashboards/cards/sources/sheets/columns/rows/links | 계정·앱 헤드, 문서 계층/BI 연결과 순서 |
| 공유(3) | portal_sharing.shared_items/shared_members/shared_versions | 공유본 ID→수신자/이전본; 소유자 Auth 계정 |

```text
auth.users
 ├─ profiles ─ user_roles ─ roles ─ role_permissions ─ permissions
 │              group_members ─ groups ─ group_roles ─┘
 ├─ portal_pm_workspaces ─ projects ─ phases ─ activities ─ tasks
 │                         ├─ calendar       └─ files ─ versions
 ├─ portal_content_workspaces (user,app)
 ├─ portal_ws_folders ─ documents ─ tags/comments
 ├─ portal_bi_sources ─ sheets ─ columns/rows; sources ─ links
 │   portal_bi_dashboards ─ cards (source 연결은 JSON/serializer 검증)
 └─ shared_items ─ shared_members/shared_versions
```

위 그림은 논리 관계도입니다. 표시한 연결 모두가 물리 FK라는 뜻은 아닙니다. 예: BI dashboard dataSource는 properties의 JSON 참조이며 source FK가 없습니다. 실제 FK는 컬럼 부록 원문만을 사용합니다. 대부분 tenant 복합키로 다른 계정의 동일 도메인 ID가 섞이지 않게 합니다.

## 3. 관계형 매핑·원형 복원

### 3.1 문서

| JSON 경로 | 물리 저장 | 복원 규칙 |
|---|---|---|
| root(하위 배열 외) | portal_content_workspaces.envelope | format/version/activeId/theme 등 유지 |
| folders[i] | portal_ws_folders | position=i; id/name/parentId 명시 컬럼, 나머지 properties |
| documents[i] | portal_ws_documents | position=i; title/content/folderId/createdAt/updatedAt 명시 컬럼 |
| documents[i].tags[j] | portal_ws_tags | position=j, tag 값 |
| documents[i].pageComments[j] | portal_ws_comments | id→comment_id,text→body,date→posted_at,author 및 properties |

folderId/parentId 빈 문자열은 NULL로 정규화하여 루트로 저장하고 원형 복원 규칙을 적용합니다. 폴더 FK는 DEFERRABLE INITIALLY DEFERRED로 같은 transaction의 계층 교체를 허용합니다. 순환/없는 활성 문서/중복 ID는 SQL/validator가 검사합니다. properties와 명시 컬럼이 충돌하면 명시 컬럼을 조립에 우선 사용합니다. 태그/댓글 key 존재 여부와 빈 배열의 원형 의미를 보존합니다.

### 3.2 Insight BI

| JSON 경로 | 물리 저장 | 복원 규칙 |
|---|---|---|
| dashboards[i] | portal_bi_dashboards | id/name/updatedAt와 properties, position |
| board[j] | portal_bi_cards | configuration 원형, dashboard 복합 FK, position |
| sources[i]/detached[i] | portal_bi_sources | detached boolean, position/name/connected_at/properties |
| source.sheets[name] | portal_bi_sheets | sheet_name 및 추가 properties |
| sheet.columns[j] | portal_bi_columns | name, position=j |
| sheet.rows[j] | portal_bi_rows | values 배열, position=j |
| source.links[sheet][j] | portal_bi_links | link_key/name/sheet_name/position |

row.values를 position 순 columns와 대응합니다. 배열을 이름순으로 정렬하거나 JSONB 객체로 임의 변환하지 않습니다. Map은 영속화 시 배열로 변환합니다. DB 직접 업데이트 시와 앱 전체 저장 시 revision을 모두 바꿉니다. readOnly/originId/retainedDashboards와 유동적인 차트 설정은 properties/configuration에 보존합니다.

### 3.3 프로젝트

| 원형 | 물리 저장 | 비고 |
|---|---|---|
| 계정 매니페스트 | portal_pm_workspaces | revision/directories/envelope |
| projects/<id>.meta.json | portal_pm_projects.metadata 및 파일 role=meta | name/client/pm/pl/start/end 명시 컬럼 |
| current.project 등 하위 외 속성 | portal_pm_projects.state_extra | 원형 내용과 알려진 컬럼 동기화 |
| phases/p.activities/a.tasks | portal_pm_phases/activities/tasks | position 복합 PK, 원본 source_id, properties |
| holidays/milestones | portal_pm_calendar | kind/position/date/name/properties |
| 경로/JSON/바이너리 참조 | portal_pm_files | role별 document 또는 asset_hash/asset_bytes |
| snapshots | portal_pm_versions | path/user FK, project FK, name/author/saved_at/state |
| 교체 전 매니페스트 | portal_pm_backups | 계정+revision, 최근10개 |

files role=blob이면 hash/bytes 필수, 아닌 role은 이 둘이 NULL이어야 합니다. hash는64hex/bytes0~100MiB. 원형 .xlsx나 JSON 내부 excelTemplate의 바이너리는 Storage 자산으로 추출하고 load에서 해시/크기 검증 후 복원합니다. 사용자 원본 Excel 수식/서식은 JSON 값모델로 재생성하지 않습니다.

### 3.4 공유

공유 workspace는 별도 JSONB snapshot입니다. 같은 owner/app/source_key는 UNIQUE이며 개인 원본을 FK로 참조하지 않으므로 원본 삭제 후 관리가 유지됩니다. 수신자 permission은 view/edit CHECK. canEdit/owner는 응답에서 계산하고 컬럼으로 저장하지 않습니다. 이전본 actor_id는 해당 이전본 교체를 일으킨 사용자이며 ‘현재 마지막 수정자 이름’을 추정하는 근거로 사용하지 않습니다.

## 4. RLS·권한·정합성

| 집합 | 직접 접근 | 정책/서버 검증 |
|---|---|---|
| portal_private 전부 | anon/authenticated 테이블 권한 없음 | 관리 RPC의 권한·enabled·위임/마지막 관리자 검사 |
| portal_workspaces | authenticated, legacy 정책 및 최신 guard | user_id=auth.uid, 현재 앱 read/write 및 관계형 이전 방지 |
| portal_pm_* | authenticated SELECT/INSERT/UPDATE/DELETE, RLS | 소유 user_id+projects.read; 쓰기 read+write |
| portal_content_*/ws_*/bi_* | authenticated CRUD, RLS | 소유 user_id+해당 앱 read; 쓰기 read+write |
| portal_sharing.* | 직접 테이블 권한 없음, RLS 방어 | public invoker RPC→비공개 authorized definer 함수 |
| Storage 프로젝트 자산 | private bucket, 사용자별 정책 | user UUID 경로·projects 권한·내용 해시 |

UPDATE는 USING과 WITH CHECK 양쪽에 계정/앱 조건을 적용합니다. SECURITY DEFINER를 이유 없이 INVOKER로 바꾸거나 반대로 권한 문제를 풀기 위해 public DEFINER를 새로 노출하지 않습니다. 정확한 GRANT/REVOKE/search_path/함수 EXECUTE 범위는 배포 SQL을 그대로 검토해야 합니다. DB 함수39개 중 공개 API와 비공개 helper를 구분합니다.

프로젝트/content touch trigger는 직접 행 수정에도 헤드 revision/updated_at을 바꿉니다. bulk 전체 교체 중에는 해당 set_config 플래그로 중간 touch를 제어하고 마지막 헤드를 유지합니다. legacy guard는 새 구조 이후 구 JSON 덮어쓰기를 막습니다. 정합성 patch의 함수 override를 빠뜨리면 직접 컬럼 수정이 properties에 가려질 수 있습니다.

## 5. 인덱스·잠금·보관

PK/UNIQUE로 기본 B-tree를 제공하며 명시 인덱스는 컬럼 부록에 모두 수록합니다. PM schedule(user_id,plan_start,plan_end), progress(user_id,project_id,progress), versions(user_id,project_id,saved_at DESC), content backups(user_id,app_id,saved_at DESC), 문서 폴더/수정일/태그, 공유 수신자/소유자 수정일, 접속 actor/time 등이 실제 패턴입니다.

로그/초대/삭제/공유/작업공간 쓰기는 구현된 advisory lock와 FOR UPDATE를 유지합니다. tenant/app별 쓰기 범위를 과도하게 전역 직렬화하지 않습니다. 서버 저장은 expected revision CAS를 transaction 안에서 수행하고 하위 행 교체·백업을 원자화합니다.

- PM/content 서버 이전본: 계정/앱 단위 최근10개. 공유 이전본: 항목당3개. 브라우저 백업10개는 별도 IndexedDB.
- 로그: 기본180일(1~3650일), 정리 설정/마지막 실행/감사 유지.
- Auth 삭제: 참조 CASCADE를 적용하되 모든 actor_id가 FK인 것은 아닙니다. 관리/감사 이력의 실제 FK 유무는 부록 원문을 따릅니다.
- PM 삭제 보관함은 폴더 내 deleted JSON이며 RDB 서버 백업과 다릅니다.

## 6. 로컬·파일·객체 저장 정의

브라우저 논리 DB/store/key와 계정/공유 namespace는 코드 정의서8장을 따릅니다. 공통 backup entry는 id/at/reason/provider/workspace/sourceSavedAt?/revision?이며 snapshots keyPath=id입니다. IndexedDB는 설치형에서도 현재 작업 저장 기준입니다. 실제 로컬 SQLite schema는 아직 없으며 설계된 것으로 만들지 않습니다.

Folder 저장은 선택한 root/3HS-Workspace/<앱 폴더> 경로와 기존 원형 파일을 사용하고 handle·권한·저장 revision을 별도로 보관합니다. 폴더 변경은 연결 변경이며 자동 데이터 이전이 아닙니다. OneDrive/Google Drive 서비스 DB와 직접 동기화하는 구조가 아닙니다.

`portal-project-assets` private bucket은 user UUID/SHA-256 경로, MIME application/octet-stream, 최대100MiB로 준비합니다. 신규 업로드는 immutable(upsert=false), 중복은 다운로드 후 길이·해시 비교합니다. DB 매니페스트 commit 실패로 참조 없는 업로드가 생길 수 있으므로 별도 수명주기 정책 없이 기존 자산을 임의 정리하지 않습니다.

## 7. 신규 환경 배포 순서와 검수

1. Supabase Auth/서비스 관리 스키마와 서버 환경·Origin·Redirect URL을 준비합니다. 계정 비밀/서비스 키는 클라이언트와 설계서에 넣지 않습니다.
2. portal-workspaces.sql(신규는100MiB 포함), 필요한 기존 환경의100MiB patch는 관리자 권한 설정/관계형 전환 전에 적용합니다.
3. portal-admin.sql→portal-admin-update.sql→user_invitations→user_deletion→log_retention 마이그레이션을 적용합니다. 초기 관리자는 별도 통제된 운영 절차로 지정합니다.
4. portal-projects-relational.sql→portal-projects-consistency.sql→portal-content-relational.sql→portal-item-sharing.sql을 적용합니다.
5. Edge Functions 3개, private bucket 설정, 로그 예약 작업을 배포·확인합니다. migration 파일이 root SQL과 같은 내용이면 둘 다 중복 실행하지 않습니다. CREATE가 비멱등인 파일을 기존 운영에 그대로 재실행하지 않습니다.
6. DB 카탈로그와40개/223컬럼·PK/FK/CHECK/인덱스/RLS/GRANT/최종 함수 정의를 비교합니다. 익명·다른 계정·read-only·disabled·CAS 충돌·트랜잭션 롤백을 테스트합니다.
7. 원형→관계형→원형 semantic equality, 배열 순서/ID/알려진 필드 NULL 수정/legacy 이전/asset hash/삭제 FK/백업 개수를 검수합니다.

운영 데이터 migration은 재개발 산출물 제출과 별도 작업입니다. 이 문서는 빈 새 환경의 원전을 정리한 것이며 실제 운영 schema drift가 없다는 보증이 아닙니다. 자동 생성 부록의 SQL별 SHA-256으로 비교할 수 있습니다.
