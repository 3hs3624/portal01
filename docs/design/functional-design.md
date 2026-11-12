# Portal01 기능설계서

문서 ID: FN-SPEC-01 · 개정 1.0 · 기준일 2026-11-13(KST). 기준 소스: 웹 86bd308 / 설치형 f9bb1d9. 사용자 시나리오→상태 전이→입출력→권한→저장/오류→검수 순으로 정의합니다. 화면은 SC 코드, 실제 업무 코드/API·원형은 코드 정의서, 영속 구조는 테이블정의서를 참조합니다.

## 1. 공통 처리 원칙

1. 앱 권한과 항목 권한을 모두 충족해야 쓰기를 허용합니다. 버튼 비활성은 UX이며 서버 인가를 대신하지 않습니다.
2. 편집 중 데이터, 브라우저 작업 사본, 선택한 외부 저장본, 공유 작업공간은 서로 다른 상태입니다. 한 상태의 성공을 다른 상태의 성공으로 표시하지 않습니다.
3. 교체/병합 전에 현재 작업과 대상 저장본을 검증하고 양쪽 백업을 완료합니다. 백업 실패 시 교체를 중단합니다.
4. 비교 시점과 적용 직전에 generation·semantic fingerprint·revision을 검사합니다. 날짜가 더 최신이라는 이유만으로 다른 저장 버전을 덮어쓰지 않습니다.
5. 상태가 불명확한 네트워크/메일/삭제 작업은 성공을 추정하거나 무조건 재시도하지 않습니다.
6. 문자열 길이는 해당 UI/validator/DB 제약을 모두 적용합니다. 바이트 제한은 UTF-8/직렬화 크기 기준이며 글자 수와 다릅니다.

## 2. 인증·권한·관리

### FN-A01 이메일 OTP 로그인과 앱 접근

연결 화면: SC-P01/P02. 입력은 이메일/OTP, 출력은 인증 세션과 `{user,permissions,…}` 서버 권한 컨텍스트입니다. 이메일 전송 시 `shouldCreateUser:false`, OTP 검증 후 `portal_auth_context`를 호출합니다. enabled=false 또는 권한 컨텍스트를 얻지 못하면 앱을 열지 않습니다. 기존 세션 복원도 같은 권한 검사를 거칩니다. 앱 진입은 app.<id>.read, 클라우드/공유 쓰기는 read+write가 필요합니다.

앱 직접 URL은 동일 Origin의 인증된 부모/허용된 상세 창을 검증하고 계정별 스토리지 namespace를 적용합니다. 인가되지 않은 앱은 숨기고 포털 로그인으로 이동합니다. 주기적 권한 갱신 중 계정 변경/이용 중지는 열린 프레임을 정리합니다. 불러온 내용을 소급 회수하는 DRM 기능은 아닙니다.

검수: 등록되지 않은 이메일 자동 생성 없음; A 계정 로컬 문서가 B에서 보이지 않음; 이용 중지 후 신규 RPC 거부; 로그아웃 후 iframe 접근 차단. 근거: login.js, app.js, pages-guard.js, tests/portal_sso.py, tests/auth_links.py.

### FN-A02 관리 데이터 및 사용자 초대

연결 화면 SC-P03. 사용자/그룹/역할 조회는 section별 권한과 system.access, 쓰기는 manage 권한을 추가 확인합니다. 직접 역할과 그룹 역할의 권한은 합집합이며 enabled를 먼저 검사합니다. 위임 관리자는 자신보다 큰 권한을 부여·회수하거나 높은 권한 대상을 임의 변경할 수 없습니다. 본인/마지막 활성 관리자 보호를 적용합니다.

초대는 Edge Function→Auth getUser→서버 권한→reserve RPC→Auth 초대 발송→finish RPC 순서입니다. 이메일 소문자·공백 제거, 254자/형식, 표시 이름 100자를 검사합니다. 동일 이메일 10분, 관리자 분당 5건, 전체 하루 100건 제한을 잠금 안에서 검사합니다. 성공 시 신규 profile에 member 역할만 초기 부여합니다. pending/sent/failed 이력과 감사 이벤트를 보관합니다. 클라이언트 전달 관리자 ID/역할은 신뢰하지 않습니다.

검수: 초대 실패에도 관리자 승격 없음, 중복/제한 거부, 일부 결과 불명확 시 자동 메일 재발송 없음. 근거: portal-admin*.sql, user_invitations migration, portal-user-invite/handler.mjs, user_invite_handler.mjs/user_invite_sql.mjs.

### FN-A03 계정 영구 삭제·로그 보관

삭제는 preview에서 이메일/관련 저장 건수를 서버 계산한 뒤 정확한 이메일 재입력과 delete 요청을 받습니다. 본인·마지막 활성 관리자·권한 초과·Storage 소유 파일 등을 검사합니다. 삭제를 예약하고 이용 중지한 뒤 Auth 계정을 삭제하며 FK로 클라우드 행을 정리합니다. 실패/불명확은 이용 중지 유지, 진행 중 재활성화 금지입니다. 브라우저/로컬 폴더/외부 동기화 파일을 삭제하지 않습니다.

로그 보관 설정은 기본180일/1~3650일, 활성 여부·마지막 실행을 관리합니다. 자동 정리는 KST 일자당 중복 실행을 제한하고 삭제 건수/기준을 감사 기록합니다. 실제 사용자 계정 삭제·메일 발송·운영 로그 정리는 문서 검증에 포함하지 않습니다. 근거: user_deletion/log_retention migrations, user_delete_handler.mjs, admin_deletion_sql.mjs.

## 3. 저장소·백업·공유

### FN-C01 작업 사본 자동저장과 상태

화면 SC-C01/W02/B03. WS는 초안 저장(약400ms)과 작업공간 저장(약1600ms), BI는 약900ms debounce를 사용합니다. PM 가상 파일은 쓰기 종료 시 IndexedDB 트랜잭션으로 보관합니다. 성공은 실제 commit 후 표시합니다. 저장 응답의 작업 generation보다 새 변경이 있으면 저장 대기 상태를 유지합니다. 상태는 준비/대기/진행/성공/실패, 외부는 미확인/첫 저장 필요/반영 대기/완료/실패입니다.

실패 시 dirty를 지우지 않고 입력/초안을 유지합니다. WS의 이전 recovery.pending 초안은 복구 안내와 기존 비교 흐름으로 연결합니다. Shared session에서는 브라우저 사본 저장을 클라우드 공유 성공으로 대신 표시하지 않고 공유 commit 결과를 사용합니다.

검수: IndexedDB abort·용량 부족·잘못된 revision은 실패 표시, 이전 응답이 새 변경을 완료 처리하지 않음. 근거: storage-status.js, pages-runtime.js, cloud-files.js, apps/* storage 모듈; storage_feedback.py.

### FN-C02 저장 위치 선택·연결·불러오기

입력 provider/name/폴더 handle 또는 클라우드 로그인. 선택과 연결은 데이터 이동과 분리합니다. info→필요 시 load→원형 validate→현재/대상 summary를 표시합니다. folder 권한은 사용자 동작에서 요청하며 취소는 AbortError 안내로 끝냅니다. OneDrive/Google Drive는 PC 동기화 폴더이며 서비스 API 실시간 동기화로 해석하지 않습니다.

불러오기 확인에는 원형, 현재 generation/fingerprint, provider, target revision/workspace를 고정합니다. 적용 직전에 다시 읽어 같은 버전/내용인지 검사합니다. 현재 작업 변경·대상 변경·계정 변경·열린 WBS 창/데이터 상세 미저장 등 앱별 beforeApply 제약이 있으면 중단합니다.

### FN-C03 비교·추천·병합

항목 상태는 동일(same), 현재만(current), 저장본만(remote), 충돌(conflict)입니다. 동일 여부는 JSONB 객체 키 순서에 영향받지 않는 canonical signature로 판단하되 배열 순서는 보존합니다. 현재/저장본의 수정일을 모두 유효하게 파싱하고 다르면 최근 쪽 추천, 같거나 불명확하면 both입니다. 생성일은 작성 시작 시점/정렬 기준이고 충돌 덮어쓰기 우선권이 아닙니다.

- WS: 문서/폴더별 비교·보관 선택, 복사 시 문서 ID/폴더 관계/활성 ID 정합성을 유지합니다.
- PM: 프로젝트별 파일 집합 비교. both이면 새 프로젝트 ID로 경로와 JSON 내부 projectId/id/이름을 바꾸고, 저장소 정보는 별도 storage-archive 아래 보관합니다. 바이너리 파일은 byte-preserve합니다.
- BI: 연결된 전체 작업공간 한 묶음으로 비교. both이면 저장본의 source/dashboard/origin ID·links·retainedDashboards 참조를 함께 재매핑합니다. 시트만 분리하여 깨진 연결을 만들지 않습니다.

검수: timestamp 같음/없음, JSON 키 순서 변화, 같은 제목 다른 ID, 폴더 순환, 프로젝트 경로 충돌, BI 참조 보존. 근거: storage-models.js, markdown/storage-compare.js, storage_compare.cjs/storage_models.cjs.

### FN-C04 백업 후 적용·실패 복구

현재 작업→capture/validate→비교 토큰 확인→target 최신 확인→양쪽 백업→다시 generation 확인→쓰기/CAS 또는 로컬 복원 순서입니다. 서버 저장 성공 후 현재 화면 복원만 실패하면 partialSave를 표시하고 양쪽 백업을 안내합니다. 중간에 변경된 현재 화면을 과거 snapshot으로 교체하지 않습니다.

브라우저 백업 DB는 앱별 snapshots store, 최신 10개 보관입니다. 수동 백업/JSON 가져오기/내려받기/내용 비교·복원을 지원합니다. imported JSON도 검증 후 별도 백업 항목으로 저장합니다. 복원 자체는 외부 저장소를 덮어쓰지 않습니다. 공유 서버 이전 버전 3개, 관계형 서버 백업 10개와 이 브라우저 백업 10개는 별개입니다.

### FN-C05 관계형 클라우드·이전 JSON 호환

포털 SDK 경계에서 전후 getUser로 계정을 확인합니다. PM은 `portal_project_workspace_*`, WS/BI는 `portal_content_workspace_*` RPC를 사용합니다. 관계형 헤드가 없으면 portal_workspaces의 legacy-json을 읽고, 사용자가 명시적으로 저장할 때 새 구조로 전환합니다. 과거 JSON을 자동 삭제하지 않습니다. 전환 후 구 클라이언트 덮어쓰기는 guard로 차단합니다.

서버는 계정+앱 read/write, size/형식/참조 검증, advisory lock+행 잠금, expected revision CAS, 이전본 백업, bulk flag 하에서 하위 데이터 교체, 새 revision 응답을 한 트랜잭션으로 처리합니다. 실패하면 전부 롤백합니다. 직접 관계형 컬럼을 수정해도 touch trigger가 revision을 갱신하며 알려진 속성은 properties의 옛 값에 가려지지 않습니다.

### FN-C06 공유 생성·부여·해제

공유 단위는 WS 1문서(다른 폴더/문서 제외), PM 1프로젝트(meta/current/history/Excel), BI 1대시보드+연결 시트입니다. 개인 원본과 공유 작업공간은 별도입니다. ensure는 owner/app/source_key별 중복을 방지하고 최초 원형을 생성합니다. 기존 공유본이 있으면 개인 최신본으로 자동 재동기화하지 않습니다.

등록·확인·활성·앱 read 권한이 있는 수신자 검색, view/edit 선택, 선택 사용자 순차 grant를 수행합니다. edit 부여에는 수신자 write도 필요합니다. 소유자만 members/grant/revoke를 수행합니다. 부분 실패 시 적용 완료 수를 표시하고 미처리 선택은 유지합니다. 원본 삭제 후에도 소유자 목록에서 관리합니다.

### FN-C07 공유 저장·권한 변경·충돌

get으로 서버 인가한 뒤 shared-item 안에 실제 앱을 로드합니다. get의 canEdit는 owner/edit와 앱 write의 교집합입니다. UI·저장 adapter를 모두 잠그며 서버에서도 매 요청 검사합니다. save는 현재 revision을 포함하고 mismatch PT409이면 자동 재시도/덮어쓰기를 하지 않습니다. 공유 크기 25MiB/항목, 소유자 현재본 합 100MiB이며 이전 3개 버전을 별도 보관합니다.

15초 주기로 get: canEdit 변경은 즉시 UI 재적용, 새 revision은 최신본 안내, 일시 네트워크 오류는 프레임 보존, 명시 권한 회수/로그인 변경은 프레임 제거입니다. 동시 타이핑 CRDT/자동 병합·수신자 알림 메일은 현재 사양이 아닙니다. 검수: item_sharing_ui.py/item_sharing_sql.mjs.

## 4. Write Studio

### FN-W01 문서·폴더·메타데이터

문서는 고유 ID/제목/content/createdAt/updatedAt/folderId와 선택 속성으로 생성합니다. 제목 필수·200자, 본문 UTF-8 5MiB, 작업공간100MiB, 중복 ID/유효하지 않은 activeId/폴더 참조는 거부합니다. 폴더 이름 필수·80자, 자기 자신/자손으로 이동 금지입니다. 문서 복제는 새 ID·새 생성 시각으로 분리합니다. 태그·즐겨찾기·댓글·연결은 해당 문서 속성에 보관합니다.

검색은 제목+본문 대소문자 정규화 검색, 정렬은 수정/이름 오름·내림/생성입니다. 즐겨찾기/최근 필터와 폴더 선택을 조합하며 검색 중에는 일치하는 자손이 보이도록 펼칩니다. 삭제/가져오기/폴더 이동 후 유효한 활성 문서를 선택합니다. 검수: write_studio_hierarchy.py, document_metadata.cjs.

### FN-W02 편집·보기·개별 옵션

소스 Markdown과 구조화 editor state를 문서 content로 왕복합니다. 소스 변경 확정 전 보기 전환을 막지 말고 flush한 뒤 뷰를 전환합니다. 직접 편집·스크롤 동기화·양방향은 문서별 editorOptions, 전체 보기/글자 크기는 로컬 UI 설정입니다. 링크/임베드의 URL·HTML은 허용 정책으로 정리합니다.

실행 취소는 문서별 기록과 편집 epoch/선택 영역을 관리합니다. 다른 문서·연관 문서를 함께 바꾸는 작업은 동일 undo 단위로 복원합니다. 보기 전환/문서 변경 시 표/블록 overlay·메뉴·포커스를 정리합니다. 외부 탭 변경은 잠금과 초안 보호를 적용합니다. 검수: editor_view_transition.py, document_view_options.py.

### FN-W03 블록·추천·복합 콘텐츠

슬래시/블록 메뉴의 명령 ID를 editor action으로 매핑합니다. 텍스트·제목·목록·체크·인용·코드·Mermaid·수식·이미지·파일·서비스 임베드·다단·데이터베이스 등은 101개 선언 명령과 저장 직렬화를 동일하게 유지합니다. 메뉴의 표시명 변경으로 저장 ID를 바꾸지 않습니다. 최근 사용/빈도 추천은 사용자 로컬 이력을 사용하며 색상/작업은 집계에서 제외합니다. AI 블록은 노트/입력 구조이며 원격 AI 실행을 완료로 가정하지 않습니다.

### FN-W04 일반 표·그리드 조작

행/열 추가·삭제·정렬·정렬방향·이동·폭 조절은 editor transaction 및 history 경계로 처리합니다. 마지막 축 삭제는 표 전체 삭제 가능성을 확인합니다. 헤더 플래그가 켜진 첫 행/열은 이동 출발·목표에서 제외합니다. 병합 구조에서 안전하지 않은 이동은 비활성화합니다. 탭/개행/인용 셀 붙여넣기는 TSV parser로 처리하며 한번 5,000셀 제한입니다. 드래그 취소는 원형과 폭을 되돌리고 안내선은 뷰포트 안으로 clip합니다.

### FN-W05 데이터베이스·페이지·댓글

DB 스키마/행/뷰/너비/순서/옵션은 문서 내부 확장 블록으로 직렬화합니다. DB 이름/속성/타입/보기 ID와 행 ID를 유지합니다. 필터·정렬·그룹은 보기별 설정, 숨김은 삭제가 아닙니다. 새 행 Enter/blur 확정은 commit 한번, IME composition 동안 연기, Esc는 취소입니다. 다중 선택은 행 ID 집합, 전체 선택은 현재 표시 범위와 UI 선택 규칙을 따릅니다.

페이지 열기는 side/center/full로 레이아웃만 바꾸고 문서 연결·제목/속성/본문/댓글을 보존합니다. 수식·관계·롤업은 DB 모듈의 validator/계산을 사용하고 RDB 전용 외부 조회로 새로 해석하지 않습니다. 댓글 본문은 공백만 금지·5,000자이며 실패 시 입력을 보존합니다. 읽기 권한은 shared adapter와 서버에서 쓰기를 거부합니다. 정확한 타입/보기/연산자는 코드 정의서 및 DB 모듈을 적용합니다.

### FN-W06 내보내기·복구

Markdown/작업공간 JSON/문서 내보내기의 형식을 구분합니다. JSON 복원은 EditorCore.validate 후 적용하며 외부 첨부 링크는 링크로 유지합니다. 이전 pending recovery 초안과 서버본이 다르면 기존 reconcile 비교를 수행하고 무조건 서버본으로 덮어쓰지 않습니다. 검수: write_studio_pages.py, page_comments.py, write_studio_storage_flow.py, storage_feedback.py.

## 5. Project Management 및 WBS

### FN-M01 프로젝트·파일·식별자

프로젝트 ID는 `PRJ`+시각/고유 접미 구조이며 원본 파일명과 meta.id/current.projectId의 정합성을 유지합니다. meta, current 인덱스, snapshot JSON, 선택 Excel 파일을 구분합니다. 목록 필터는 연도/진행/일정/검색을 모두 만족하고 생성일 역순으로 정렬합니다. 목록 Excel은 화면 페이지와 무관하게 필터된 전체 결과, 문자열 시작 `=`도 수식으로 실행하지 않습니다.

### FN-M02 WBS 정규화

현재 상태 schema=2, root project/settings/phases/holidays/milestones/sample. project 기본은 새 프로젝트, 빈 담당/설명, 날짜 nullable, baseDate 오늘입니다. settings 기본 applyHolidays=false/warnGap=5/dangerGap=10. phase/activity/task에 고유 ID를 보장하고 group은 trim·연속 그룹 구조로 정리합니다. progress는 Number 변환 후 0~100 clamp, 유효하지 않은 계획/실제 날짜는 null입니다. 계산 중 rows는 phase→activity→연속 group→task 계층이며 그룹을 같은 이름만으로 전역 합치지 않습니다.

### FN-M03 계획·실적·진척 계산(규범)

날짜는 일 단위로 비교합니다. 토/일과, applyHolidays가 true일 때 holidays.date를 비근무일로 제외합니다. NWD(a,b)는 양 끝 포함 근무일 수이며 a>b이면 부호를 바꿉니다. 태스크 ps/pe/as/ae, 기준일 base, K=clamp(progress/100,0,1)로 둡니다.

```text
valid = ps != null AND pe != null AND pe >= ps
E = valid ? NWD(ps,pe) : 0
J = !valid ? 0 : ps > base ? 0 : base > pe ? E : NWD(ps,base)
L = E * K
태스크 계획률 = E != 0 ? J/E : 0
상위/전체 실적률 = SUM(L) / SUM(E), 분모 0이면 0
상위/전체 계획률 = SUM(J) / SUM(E), 분모 0이면 0
```

단순 태스크 진척 평균을 사용하지 않습니다. 상위 span=NWD(min ps,max pe)와 xJ는 표시용이며 SUM(E/J) 집계와 다릅니다. 상위 실제 완료일은 모든 하위 태스크가 K>=1이고 ae가 있을 때만 max(ae), 아니면 null입니다.

상태: K>=1 done; 실제 시작일 또는 K>0이면 prog; 나머지 todo. 지연 우선순위는 미완료·pe<base면 overdue, 미착수·ps<base면 lateStart, 완료·ae>pe면 lateFinish입니다. 차이는 근무일로 계산합니다. gap 경고 기본 5%p/위험10%p. 목록 별도 판정은 actual>=0.9995 완료→사업 시작 전 예정→plan-actual>=0.10 지연→종료일 경과→진행 순입니다.

검수 예: 휴일 없는 월~금5일 계획, 수요일 기준·진척40%이면 E=5/J=3/L=2, 계획60%/실적40%. 길이 다른 태스크는 E 가중 집계. 주말만 구간 E=0이면 NaN/Infinity가 아니라0.

### FN-M04 검증·간트·달력

계획 누락/역전, 실제 완료만 입력/역전은 오류. 실제 완료인데 K<1, K=1인데 ae없음, 진척 있으나 as없음, 실적일이 기준일 이후이면 경고입니다. 태스크 경로/ID를 제공해 해당 행으로 이동합니다. 간트 범위는 사업/태스크 일자/기준일 전체를 포함하고 주 단위로 확장합니다. 계획·실적·마일스톤/오늘·기준일 표시는 테마별 색을 적용합니다.

### FN-M05 저장·이력·샘플

저장은 현재 pkg.rev와 디스크 rev를 비교합니다. 불일치 시 확인 없이 쓰지 않고 최신 이후 이력을 충돌 백업으로 병합할 수 있습니다. snapshot은 번호·명칭·설명·작성자·시각·summary·state/참조 파일을 보관하며 `.json` 파일명이 겹치면 접미를 늘립니다. current index 갱신 후에만 저장 성공을 알립니다. 외부 파일/이력 미리보기는 읽기 전용이며 복원은 작업본 변경 후 새 저장입니다.

샘플 유지 선택은 sample 플래그만 해제하고 태스크를 유지, 빈 WBS는 sample 단계를 제거합니다. 실제 Excel 전체 교체는 샘플 표시를 해제합니다. 관리 창 없는 단독 HTML은 부모 저장 API가 없어 조회/내려받기만 허용합니다.

### FN-M06 Excel 파싱·매칭·반영

.xlsx를 ExcelJS로 로드하고 WBS 또는 헤더(단계/Activity)가 있는 시트를 찾습니다. 날짜는 Date/Excel serial/날짜 문자열을 정규화하고 진척은 `%`/0~1/0~100을 받아0~100으로 변환합니다. 숨은 M열 안정 ID를 우선 매칭하고 없으면 단계/Activity/그룹/태스크 이름 문맥으로 매칭합니다. 전체 교체는 원본에 없는 작업을 삭제 예정으로 표시, 일정·진척 모드는 일치 작업의 날짜/진척만 바꿉니다. 기준일 적용은 별도 선택입니다. 변경 표·통계 후 적용하며, 저장 전에는 작업본만 바뀝니다.

### FN-M07 Excel 수식·서식·조건부 간트 보존

원본 XLSX bytes를 excelTemplate.data(base64), 시트/layout와 함께 보관합니다. 동일 layout kind 구조이면 원본 ZIP/XML에 수정 값을 patch하고 기존 formula/custom sheet/style/조건부 규칙/열너비/행높이/숨은 ID를 보존합니다. 알려진 metadata만 갱신하고 fullCalcOnLoad/forceFullCalc/auto 계산을 설정합니다. solid 조건부 색의 fgColor가 없거나 0이면 bgColor를 전경에도 보완합니다.

업로드와 다운로드 시 수식/조건부 규칙/스타일 셀 개수를 검사하며 감소하면 내보내지 않습니다. 실제 수식 값 계산은 Excel 재계산을 따릅니다. 구조 변경은 생성 계산 양식으로 전환하고 원본은 보관합니다. WBS·기준정보·달력 3시트와 사용자 시트를 구분합니다. 검수: projects_excel.py --format-fixture로 실제 업로드→수정→재업로드→다운로드 후 수식·스타일·조건부 규칙을 비교합니다.

## 6. Insight BI

### FN-B01 파일 연결·표 모델·안정 식별자

정적 웹은 XLSX/CSV/TSV/JSON 객체 배열을 읽습니다. 파일30MiB, 최대1,000열/100,000행. CSV의 인용부호/개행을 파싱하고 빈/중복 헤더는 고유 열명으로 바꿉니다. 유효한 열이 하나도 없으면 거부합니다. 연결 소스 ID/signature와 시트 names, columns 순서, rows 값 배열을 보존합니다. saved dashboard는 dataSource.id+sheet로 연결하고 이름만 같은 소스로 임의 연결하지 않습니다.

기존 ID 교체 시 연결된 저장 대시보드 schema의 시트/열이 사라지면 변경 전 거부하고 필요한 이름을 안내합니다. 상세 창 수정은 origin/opener·source/sheet·revision을 검사하고 mapping을 먼저 검증합니다. 헤더 rename은 차원·지표·filters/slicers/schema/카드 참조를 함께 갱신합니다.

### FN-B02 대시보드 수명주기·편집 세션

저장 record는 id/name/description/updatedAt/dataSource/schema/explorer/board/layout/filters 등입니다. 같은 소스에서 같은 이름만으로 덮어쓰지 않고 ID별 저장/복사를 분리합니다. 열기는 schema의 누락 열과 profile type 변화를 검사합니다. 데이터가 끊기면 원본 연결 필요 또는 보관 조회 상태로 표시합니다.

edit 진입은 원본 snapshot을 고정하고 변경을 임시 적용, 저장은 유효한 구성을 commit, 취소는 원래 배치/구성을 복원합니다. 제목 변경은 보관 대시보드 사본도 반영합니다. 삭제는 연결된 보관본과 마지막 보관 소스 정리를 고려하지만 업무 원본 파일을 삭제하지 않습니다.

### FN-B03 필터·집계·차트·카드

전역 검색/열 필터/날짜 범위/슬라이서를 먼저, 카드 조건을 추가 적용하고 차원/날짜 버킷/계열로 그룹화합니다. 모든 카드 조건은 AND입니다. 숫자 변환 실패는 numeric 집계에서 제외하고 count와 sum/avg는 구분합니다. 차트 종류에 없는 필드를 자동 추정하여 다른 열로 바꾸지 않습니다. 추가 지표 기본 포함 최대6개, 계열 최대24개, 드릴 차원 최대4개, 카드 조건 최대20개이며 필터 값 후보는 최대300개입니다.

KPI rows는 필터 후 행 수, fields는 열 수, sum/avg는 선택 measure 숫자 값입니다. 보드 위치/크기·차트별 설정과 분석 중 임시 확대/드릴 상태를 구분합니다. 카드 이동/크기 변경은 저장 또는 undo 가능한 편집 작업입니다. 상세 chart type/operator 원형은 코드 정의서와 101개 블록 명령 목록과 혼동하지 않습니다.

### FN-B04 원본 행·갱신 시각·내보내기

카드 원본 행은 analysisCardConfig+cardFiltered 결과로, 집계 전 원형 rows를 읽기 전용100행 페이지로 제공합니다. 대시보드·카드 조건은 적용하지만 선택 차트 점만 자동 제한하는 별도 기능은 아닙니다. 갱신 시각은 connectedAt로 마지막 가져오기/상세 수정 시각이며 원본 서버 실시간 상태가 아닙니다. 원본 행 dialog는 데이터를 바꾸지 않습니다.

보드 PNG/PDF는 현재 카드들을 canvas로 렌더링하고 준비되지 않은 라이브러리/이미지/필터 오류를 안내합니다. 원본/분석 CSV 구분과 문자 이스케이프를 적용합니다. 검수: storage_feedback.py, data detail/table 관련 테스트, existing Insight 기능 설계.

## 7. 재구현 완료 조건과 추적

| 묶음 | 화면 | 주 데이터 | 필수 회귀 근거 |
|---|---|---|---|
| 인증/관리 | P01~P04 | private 계정/역할/로그 | portal_sso.py, auth_links.py, user_*_handler.mjs, admin_deletion_sql.mjs |
| 저장·관계형 | C01~C03 | 작업공간·revision·백업 | storage_models.cjs, shared_storage_flow.py, content/project_relational_sql.mjs |
| 항목 공유 | C04~C05 | shared_items/members/versions | item_sharing_sql.mjs, item_sharing_ui.py |
| 문서/블록/DB | W01~W06 | md-editor-workspace/content | write_studio_*、database_layouts.py、table_axis_drag.py、page_comments.py |
| 프로젝트/WBS | M01~M05 | meta/pkg/current/snapshots | projects_excel.py, projects_sample_choices.py, project_relational_ui.py |
| BI | B01~B04 | sources/sheets/dashboards/cards | content_relational_ui.py, storage_feedback.py, BI table/filter tests |
| 공통 레이아웃 | 모든 앱 | UI 설정 | sidebar_layout.py, editor_view_transition.py, table_overlay_clip.py |

테스트 파일명만으로 테스트를 수행했다고 판정하지 않습니다. 새 환경에서 로컬 테스트용 고정 계정/데이터로 재실행하고 결과를 남깁니다. 운영 데이터 변경·메일 발송·정식 설치판 검증은 별도 승인/검수입니다. 설치형 현재 범위와 남은 네이티브 저장·WBS 팝업·서명/업데이트는 desktop.md를 기준으로 완료와 계획을 구분합니다.
