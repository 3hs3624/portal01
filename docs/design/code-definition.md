# Portal01 코드 정의서

문서 ID: CD-SPEC-01 · 개정1.0 · 2026-11-13(KST). 여기서 ‘코드’는 업무 공통코드/상태값과 프로그램 모듈·API·데이터 계약을 모두 뜻합니다. 실제 구현 기준은 웹86bd308/설치형f9bb1d9. 전체 선언 함수·39개 DB 함수 시그니처·101개 블록 명령은 [코드 카탈로그](appendices/code-catalog.md)입니다.

## 1. 식별 규칙과 호환성

| 대상 | 규칙 | 사용 시 주의 |
|---|---|---|
| 앱 | markdown / projects / insight | 표시 이름·URL 폴더·권한·DB app_id를 같은 코드로 연결 |
| Auth/역할/그룹/공유 ID | UUID | 표시 이름으로 FK를 대신하지 않음 |
| 문서/폴더/행/카드 ID | 해당 생성기의 고유 문자열/UUID | JSON에서 원형 보존; 복제 시 새 ID와 참조 동시 변경 |
| 프로젝트 ID | PRJ 접두사+시각·고유 접미 | 파일 경로/meta.id/pkg.projectId 정합성 |
| PM 단계/Activity/태스크 | P/A/T 등 생성 ID | 시트 숨은 ID를 없애면 이름 매칭으로 퇴행 |
| 저장 revision | 불투명 UUID 또는 PM 파일 rev 정수 | UUID를 날짜/대소로 비교 금지; exact equality CAS |
| 스냅샷 no | 프로젝트 안 증가 정수 | 삭제 후 기존 번호를 다른 버전으로 재사용하지 않음 |
| asset_hash | SHA-256 소문자 hex64 | 내용 주소. 길이·해시 모두 검증 |
| row/column position | 0부터 시작하는 정수 | DB 순서 복원 기준; 이름 정렬로 대체 금지 |

문서 ID UI/FN/CD/TB는 설계 추적 ID이며 런타임 데이터에 새 필드로 쓰지 않습니다. 외부 링크·파일 이름은 식별자가 아닙니다. 문자열 ISO 시각과 SQL timestamptz를 타입에 맞게 구분하고 사용자 표시 날짜는 KST를 따릅니다.

## 2. 권한·업무 공통코드

### 2.1 권한

| 권한 코드 | 의미 |
|---|---|
| system.access | 시스템관리 진입 |
| system.users.read / system.users.manage | 사용자 조회 / 상태·역할·초대·삭제 |
| system.groups.read / system.groups.manage | 그룹 조회 / 구성원·역할 관리 |
| system.roles.read / system.roles.manage | 역할 조회 / 사용자 정의 역할·권한 관리 |
| system.permissions.read | 고정 권한 목록 조회 |
| system.logs.read / system.logs.manage | 접속 로그 조회 / 보관 정책·정리 |
| system.audit.read | 감사 로그 조회 |
| app.markdown.read / app.markdown.write | Write Studio 사용 / 클라우드·공유 쓰기 |
| app.projects.read / app.projects.write | Project Management 사용 / 클라우드·공유 쓰기 |
| app.insight.read / app.insight.write | Insight BI 사용 / 클라우드·공유 쓰기 |

역할 code는 system_admin/member가 기본이며 사용자 정의 역할을 추가할 수 있습니다. scope는 system/application. enabled=false면 역할을 갖더라도 유효 권한이 없습니다. 직접 사용자 역할+그룹 역할의 permission 합집합으로 판정합니다. 초기 member에 앱 권한을 부여하되 migration marker 이후 재실행으로 관리자 변경을 덮어쓰지 않습니다.

### 2.2 상태·선택지

| 코드 집합 | 저장 값 | 의미/기본값 |
|---|---|---|
| 접속 이벤트 | login/session_restore/logout | 인증 이벤트 UUID로 중복 방지 |
| 초대 상태 | pending/sent/failed | 기본 pending |
| 삭제 상태 | pending/completed/failed | 기본 pending; pending은 재활성화 차단 |
| 저장소 UI provider | local/onedrive/gdrive/browser/supabase | 기본 local; browser는 현재 사본과 별도 수동 백업 |
| 기존 연결 provider | local/google/onedrive/sqlite/odbc | 서버형 UI 호환 코드; 정적 웹 직접 DB 지원과 다름 |
| 비교 상태 | same/current/remote/conflict | 동일/현재만/저장본만/양쪽 다름 |
| 보관 선택 | current/remote/both | 충돌 기본 both |
| 적용 모드 | save/load/merge/backup | 외부 반영/불러오기/병합/복구본 사용 |
| 공유 권한 | view/edit | owner는 DB permission이 아니라 소유자로부터 파생 |
| WS 보기 | edit/split/preview | 초기 로컬값 없으면 preview |
| DB 페이지 열기 | side/center/full | 기본 side |
| DB 보기 | table/board/timeline/calendar/list/gallery/chart/feed/map | 기본 table |
| 프로젝트 진행 표시 | 제안/착수 준비/진행 중/검수/완료/보류 | 목록의 pstatus 한글 값 자체를 저장 |
| 일정 판정 | done/todo/bad/prog | 완료/예정/지연 또는 기한경과/진행 |
| WBS 태스크 | done/prog/todo | 진척·실제 시작으로 계산 |
| WBS 지연 | overdue/lateStart/lateFinish/null | 종료 지연/착수 지연/지연 완료/없음 |
| 격차 경보 | ok/warn/bad | 기본 임계5/10%p |
| PM 파일 role | meta/current/snapshot/json/blob | SQL 변환시 분류 |
| 달력 kind | holidays/milestones | 공휴일/마일스톤 |
| BI 연결 상태 | connected/readonly/missing | 정상/조회 보관/재연결 필요 |
| BI 차트 | bar/horizontal/line/area/donut/scatter/heatmap/treemap/histogram/boxplot/waterfall/funnel/table | 표시명은 앱 types 선언 |
| KPI | rows/sum/avg/fields | 행수/합계/평균/필드수 |
| 날짜 묶음 | raw/year/quarter/month/day/hour | 원본/연/분기/월/일/시 |
| 카드 필터 op | eq/neq/contains/gt/gte/lt/lte/between/empty/notEmpty | 모든 조건 AND |
| 정렬 방향 | asc/desc | DB/차트 기능별 natural 등 별도 코드는 원문 선택지 참조 |

DB 속성 타입·연산자·관계/롤업과 블록별 payload는 apps/markdown/block-widgets.js 및 database-*.js의 원형을 사용합니다. 사용자 정의 타입이라고 해서 필드 이름을 RDB 컬럼으로 생성하지 않습니다. 정적 모든 select의 value/label과 block action ID는 두 생성 부록에 누락 없이 보관합니다.

## 3. 원형 JSON 데이터 계약

아래는 실제 키 이름/기본 타입을 설명하는 최소 예시입니다. 임의 사용자 데이터가 아니며 schema/version 값은 변경 없이 유지합니다. 추가 속성은 validator가 허용하는 범위에서 원형 보존합니다.

### 3.1 Write Studio

```json
{"format":"md-editor-workspace","version":1,"documents":[{"id":"doc-example","title":"문서","content":"# 제목\n본문","createdAt":"2026-11-13T00:00:00.000Z","updatedAt":"2026-11-13T00:00:00.000Z","folderId":"","editorOptions":{"directEdit":true,"syncScroll":true,"syncScrollBoth":false},"tags":[],"pageComments":[]}],"folders":[],"activeId":"doc-example","theme":"light"}
```

- documents: 필수 배열, id 중복 금지/title 비어 있지 않음·200자/content 문자열·5MiB. activeId는 문서와 대응해야 합니다. 실제 editorOptions 키/정규화는 scroll-sync.js의 문서별 옵션 처리 원전을 확인합니다. 위 옵션 이름을 새 구현에서 임의로 SQL 컬럼화하지 않습니다.
- folders: id/name/parentId 및 선택 속성. 루트 빈 값과 SQL NULL을 변환합니다. 폴더명80자·순환 금지.
- pageComments: id/text/date/author 및 속성. SQL은 body/posted_at으로 변환하고 돌아올 때 원래 키로 조립합니다.
- recovery: 브라우저 초안 내부 profileId/revision/pending/base 보조정보이며 외부 공용 payload 제한/비교에서 특별 취급합니다.
- 데이터베이스/페이지/블록은 content 안 확장 직렬화이며 SQL에 별도 사용자 테이블을 만들지 않습니다. 원형이 임의 HTML 실행 허가를 의미하지 않습니다.

### 3.2 프로젝트 로컬 패키지·관계형 매니페스트

```json
{"format":"wbs-pm-cloud","version":1,"directories":["projects"],"files":[{"path":"projects/PRJ-example.meta.json","data":"<JSON UTF-8의 base64>"},{"path":"projects/PRJ-example.json","data":"<JSON UTF-8의 base64>"}]}
```

meta 형식은 wbs-pm-meta/version1/id/name/client/pm/pl/startDate/endDate/members/description/note/pstatus/createdAt 등. current index는 wbs-dashboard/schema4/projectId/rev/modifiedAt/modifiedBy/current/snapshots. popup에서 사용하는 package는 schema3을 포함하고 current.schema=2입니다. 세 schema를 하나로 단순 치환하지 않습니다.

current는 project/settings/phases/holidays/milestones/sample/excelTemplate. tasks는 id/name/group/assignee/planStart/planEnd/actStart/actEnd/progress 등을 보관합니다. snapshots에는 no/name/note/author/savedAt/summary/state 또는 file/xlsx 참조가 있습니다. 파일 경로: projects/<id>.meta.json, projects/<id>.json, projects/<id>/snapshots/*, deleted/* 등입니다.

서버 전송은 `portal-project-relational/version1`, directories, files로 변환합니다. JSON 파일은 `{path,kind:'json',document}`, 바이너리는 `{path,kind:'blob',hash,bytes}`. JSON 내부 excelTemplate.data도 content-addressed asset 참조로 추출했다가 load 시 base64로 복원합니다. 불러오기와 JSON 내려받기는 다시 wbs-pm-cloud 원형입니다.

### 3.3 Insight BI

```json
{"format":"insight-bi-workspace","version":1,"dashboards":[],"sources":[{"id":"source-example","name":"샘플","signature":"file:example","connectedAt":"2026-11-13T00:00:00.000Z","sheets":{"Sheet1":{"columns":["이름","값"],"rows":[["A",10],["B",20]]}},"links":{},"readOnly":false}],"detached":[],"theme":"light"}
```

- dashboard: id/name/description/updatedAt/sheet/dataSource/schema/explorer/board/layout/filters 등. dataSource는 id/name/sheet, schema는 사용 열 name/type 목록입니다.
- 카드 configuration: kind(KPI이면 kpi), type, title, dimension, measure, aggregate, sort, position{x,y,w,h}, cardFilters 및 추가 지표/계열/기간/드릴 설정. 실제 safeConfig/safeAnalysisConfig에서 허용 키를 검증합니다.
- source: id/signature/name/connectedAt/sheets/links/revisions/readOnly/originId/retainedDashboards 등. links는 시트별 `[key,name]` 배열로 영속화하고 런타임 Map과 변환합니다.
- row values의 index는 columns index와 대응합니다. 중첩 JSONB row를 객체별 임의 컬럼으로 바꾸지 않습니다. detached는 보관 조회 데이터입니다.

## 4. 프로그램 계층·파일 책임·로딩 순서

| 계층 | 모듈 | 공개 계약/책임 |
|---|---|---|
| 인증/포털 | login.js, auth-link.js, app.js, admin.js | OTP·권한 컨텍스트·앱 프레임·관리 API |
| 앱 가드 | pages-guard.js, sharing-frame.js | parent/opener/Origin·계정·공유 ID 검증, storage namespace |
| 로컬 런타임 | pages-runtime.js, cloud-files.js | PagesStorage/PagesAPI, PM 가상 파일·직렬화 큐 |
| 표시/연결 | app-shell.js, bridge.js, sidebar-resize.js | 도구/요약 메시지/계정별 패널 폭 |
| 공통 저장 | storage-status.js, storage-flow.js, storage-adapters.js, cloud-ui.js, folder-storage.js | 상태·비교/백업/연결/앱별 adapter |
| 클라우드 | content-cloud.js, project-cloud.js | 원형↔관계형 변환·SDK·CAS·asset 해시 검증 |
| 공유 | sharing-cloud.js, item-sharing.js, item-sharing-adapters.js, shared-item.js | 선택 단위 캡처·부여·공유 native 앱·권한 보호 |
| WS | app.js/editor-core.js/block-ui.js/block-widgets.js/database-*.js/table-*.js/file-sync.js | 문서/블록/표/DB/이력/파일 정합성 |
| PM | apps/projects/index.html (inline + dash-tpl), workbook-preserve.js | 목록/폴더 API/WBS/OOXML 원형 보존 |
| BI | app.js/dashboards.js/board-studio.js/data-catalog.js/table-model.js/data-editor-bridge.js | 데이터/집계/보드/상세 창/모델 |
| 네이티브 | desktop/src/main.cjs/policy.cjs | 프로토콜·BrowserWindow·경로/새 창/권한 정책 |

앱 가드가 앱 상태를 읽기 전에 실행되어야 하며 sharing-frame 뒤에 storage-status를 로드합니다. 앱 코어/각 helper→저장 adapter→공통 cloud-ui→shell→bridge→공유 adapter 순서를 기존 HTML에 맞춥니다. PM 내장 스크립트와 document.write된 팝업은 부모 CSP의 SHA-256 허용 목록에 포함해야 합니다. 라이브러리 버전은 vendored 파일 및 desktop lockfile이 원전입니다.

## 5. JavaScript 공개 인터페이스

| 계약 | 입력 | 출력·예외 |
|---|---|---|
| PagesStorage.handle(action,payload) | status/preferences/load/changes/save; id='browser',workspace,revision | settings/features 또는 {hasWorkspace,workspace?,revision,savedAt}; save CAS mismatch/100MiB 초과 거부 |
| PortalCloudAPI.info/load/save(app,w,expected) | app와 원형, 저장 전 expected revision | 앱별 클라우드 SDK adapter 응답; 인증/계정 전후 검사 |
| PortalFolderStorage.info/load/save(provider,workspace,revision,expectedWorkspace) | provider와 원형 및 비교 기준 | 연결 metadata/저장본/새 revision; 파일 외부 변경 거부 |
| PortalStorageFlow.create(A) | app/title/unit/capture/validate/compare/generation/restore, 선택 beforeWrite/beforeApply/settle | {open}; UI→백업/CAS/복원 엔진 |
| PortalWorkspaceAdapter | capture/validate/prepare/beforeWrite/beforeApply/restore | PM 원형 및 열린 WBS flush·창 검사 |
| PortalItemSharing | init({capture,mount,note}),share(key),open(id),openOrLocal(key,local) | 목록/대화상자; 선택 단위만 캡처 |
| PortalSharingAPI.request(action,args) | 공유 action 아래 표 | RPC data; 오류 code 보존 |
| PortalShareSession | id/app/canEdit/workspace/revision, commit(workspace,revision),storage(action,payload) | 공유 서버 commit, 조회 쓰기 거부 |
| PortalSharedItemAdapter.flush() | 편집 가능 현재 native 앱 | 로컬 편집을 공유 서버에 반영; 준비/권한 오류 |
| PortalWorkbookPreserve | preserve(state,generated,layout),inspect(bytes) | {bytes,preserved,structureChanged?,inspection?}; XML/보존 오류 |
| PortalStorageStatus | ready/pending/saving/saved/failure/external/mount, generation/description | 실제 저장 상태; 데이터 저장 자체를 수행하지 않음 |

A.capture는 원형 작업공간, validate는 검증 결과/예외, generation은 작업 버전, fingerprint는 의미 동등성, compare.compare/merge/summary는 앱별 모델입니다. restore(workspace,expectedGeneration)는 작업본을 실제 복원하고 실패를 throw해야 합니다. 성공처럼 보이는 빈 반환으로 오류를 삼키지 않습니다.

## 6. RPC·HTTP·메시지 계약

### 6.1 공통 RPC

| RPC | 주요 인자 | 반환/인가 |
|---|---|---|
| portal_auth_context | 없음 | configured/enabled/displayName/isAdmin/permissions |
| portal_can_access | p_app,p_action(read/write) | boolean |
| portal_record_access | p_event,p_id UUID,p_user_agent | boolean; 허용 이벤트/중복 ID 검사 |
| portal_admin_read | p_section,p_limit=50,p_offset=0,p_query='' | items/total/limit/offset, section 권한 |
| portal_admin_change | p_action,p_data JSON object | action별 결과/감사 기록; 서버 관리 권한 |
| portal_log_settings | p_settings nullable | retention_days/enabled/last_run/updated_at/updated_by |
| portal_project_workspace_info/get | 없음 | hasWorkspace/revision/savedAt/backend 및 get.workspace |
| portal_project_workspace_save | p_workspace,p_expected UUID|null | 새 revision/savedAt; read+write·CAS |
| portal_content_workspace_info/get | p_app markdown/insight | 같은 저장본 envelope |
| portal_content_workspace_save | p_app,p_workspace,p_expected | 새 revision/savedAt; 앱별 검증·CAS |
| portal_workspace_get/save | p_app 및 save workspace/expected | 이전 JSON 호환; 관계형 이전 후 guard |
| portal_item_share | p_action,p_args JSON | 아래 action별 계약 |

관리 action은 user_save/user_roles/group_save/group_delete/group_members/group_roles/role_save/role_delete 및 최신 관리 확장의 사용자·로그 삭제/정리입니다. 모든 payload의 정확한 key와 기본값은 최종 portal_admin_change 정의 및 admin.js 대응 함수를 사용합니다. 전체 SQL helper와 최종 override 경로는 자동 카탈로그에 포함합니다. service-only 초대/삭제 RPC를 일반 브라우저 호출로 바꾸지 않습니다.

### 6.2 항목 공유 action

| action | p_args | 응답 |
|---|---|---|
| users | app, query 문자열 | [{id,name,email}] 최대100 |
| list | app | [{id,app,source_key,title,updated_at,revision,owner,owner_name,permission}] |
| ensure | app,key,title,workspace | {id,title,revision,owner:true,permission:'owner'} |
| get | id | {id,app,title,workspace,revision,updatedAt,owner,permission,canEdit} |
| save | id,workspace,revision,title | {id,revision,savedAt} |
| members | id | [{id,name,email,permission,enabled}] |
| grant | id,user(UUID),permission(view/edit) | 멤버 목록 |
| revoke | id,user(UUID) | 멤버 목록 |

ensure가 기존 공유본을 반환할 때 workspace를 새 개인본으로 덮어쓰지 않습니다. list의 updated_at과 get의 updatedAt은 실제 응답 차이이므로 client mapping을 유지합니다. owner만 members/grant/revoke, save는 canEdit와 CAS를 검사합니다.

### 6.3 Edge HTTP

각 endpoint는 POST JSON, OPTIONS, 정확한 Origin과 Bearer 세션을 검사합니다. verify_jwt=false는 인증 생략이 아니라 함수 내부 Auth getUser+DB 검증을 위한 설정입니다.

| 경로 | body | 결과/실패 |
|---|---|---|
| /functions/v1/portal-user-invite | {email,display_name} | 초대 상태 message;400입력/401인증/403권한/409중복·제한/503설정·불명확 |
| /functions/v1/portal-user-delete | {action:'preview',id} 또는 {action:'delete',id,confirm_email} | 서버 preview/삭제 결과; 상태·권한·확인 검사 |
| /functions/v1/portal-project-assets | {action:'ensure'} | 비공개 bucket 준비 message; 일반 파일은 사용자 SDK로 접근 |

서버 환경은 SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/PORTAL_ORIGIN. service role은 함수 서버에만 둡니다. 클라이언트 설정의 공개 URL/키와 비밀 키를 혼동하지 않습니다.

### 6.4 프레임·상세 창 메시지

- 앱→포털: `{type:'3hs:summary',version:1,id,metrics,items:[{name,date}],updatedAt}`. 최근 제목 최대5개, 2초 주기/종료/refresh 응답; 본문 전체를 보내지 않습니다.
- 포털→앱: `{type:'3hs:refresh'}`. origin+source가 parent인지 검사합니다.
- BI 상세: bi-data-request/bi-data-response/bi-data-permissions/bi-data-save/bi-data-saved/bi-data-save-error 계열. dataDetailWindows에 등록한 window와 source/sheet/revision을 검사합니다. 정확한 table/mapping/requestId는 data-editor-bridge.js를 따릅니다.
- DOM events: portal:local-workspace-saved, portal:cloud-working-change, portal:share-permission 및 studio:* 뷰/문서/작업 상태 이벤트. 저장 이벤트는 성공 트랜잭션 후 발생해야 합니다.

## 7. 오류·제한·보관 정책

| 코드/조건 | 의미 | 클라이언트 처리 |
|---|---|---|
| 42501 | 인증/소유/권한 거부 | 재로그인·권한 확인, 명시 회수는 공유 프레임 제거 |
| PT409 | revision/상태 충돌 | 입력 보존·최신본 재비교; 무조건 재시도 금지 |
| PT404 | 대상 없음 | 목록 재조회/대상 확인 |
| 22023 | 형식/크기/참조 오류 | 원형/제한 안내, 미반영 |
| PGRST202 | RPC 미배포 | 관리자 설정 안내 |
| AbortError | 폴더 선택 취소 | 작업 보존, 취소 안내 |
| 503/네트워크 | 서비스·설정·결과 불명확 | 실패/대기 표시, 성공 추정 금지 |

100MiB=104857600bytes(서버 작업공간), 25MiB=26214400bytes(공유 항목), 5MiB=5242880bytes(문서 UTF-8), 폴더/별도 백업49MiB, 업로드 파일30MiB. PM 파일/디렉터리 각5000·경로300자·파일 base64 길이15MiB 등은 validator의 정확한 검사 단위를 적용합니다. 공유 이전3개·관계형 서버10개·브라우저10개 백업을 서로 합산한 하나의 이력으로 표시하지 않습니다.

## 8. 로컬 저장·실행·빌드

계정 namespace는 `3hs-user:<uid>:`이며 공유는 `3hs-user:<uid>:shared:<id>:`를 추가합니다. pages-guard가 localStorage/sessionStorage/IndexedDB 접근을 감싸므로 아래 논리 DB명을 물리 전역명으로 하드코딩해 우회하지 않습니다.

| 논리 저장소 | store/키 | 용도 |
|---|---|---|
| pages-workspace-<app> | records/settings,workspace | 현재 작업공간·설정·revision |
| md-editor | drafts/md-editor-draft-v1 | WS 초안·recovery |
| portal-wbs-cloud-files | files/working | PM 가상 파일 원형 |
| portal-storage-connections | records | 폴더 연결 handle/별도 백업 연결 |
| studio-storage-backups / portal-storage-backups-<app> | snapshots/id | 최근10개 복구본 |
| portal-cloud-recovery | backups/<app> | 이전 백업 마이그레이션 원본 |

기타 UI 키(보기·폰트·추천·폴더 펼침·폭·theme·BI 라이브러리)는 해당 모듈의 storage 호출이 원전입니다. 실제 OS SQLite/키링은 현재 미구현입니다. 설치형 profile은 Portal01-Preview로 브라우저와 독립합니다.

웹은 정적 /portal01/ 경로와 동일 Origin iframe 구조로 제공합니다. 테스트는 Python3/Playwright/Chromium 및 SQL용 PGlite가 필요합니다. 설치형은 Node/npm lock 기반 `npm --prefix desktop ci`, test, stage, pack 순서이며 OS별 네이티브 빌드/스모크를 실행합니다. signed installer/자동 업데이트를 현재 완료로 간주하지 않습니다. 모든 정확한 실행 명령·검수는 재구현 인수인계 안내를 따릅니다.
