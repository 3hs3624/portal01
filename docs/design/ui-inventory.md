# UI·코드 인벤토리

이 파일은 `python scripts/design_inventory.py`로 생성합니다. 정적 제어·기본 선택지와 동적 UI 코드/블록 명령을 설계서와 대조하기 위한 부록입니다. 사용자 데이터나 실행 중 DOM을 수집하지 않습니다.

동적 행·상태에 따라 값이 바뀌는 텍스트는 소스 표현식으로 남을 수 있습니다. 개별 조작·권한·오류 상태는 앱별 설계서의 기능 표와 함께 읽습니다. 생성 결과는 런타임 전체 경로가 자동 검증됐다는 뜻이 아닙니다.

## index.html

컨트롤 수: 15

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | auth-retry | 다시 시도 | type=button |
| input | email | 이메일 | type=email, maxlength=254, required=true |
| button | login | 인증코드 받기 | type=submit |
| input | otp | 이메일 인증코드 | maxlength=10, required=true |
| button | verify-code | 로그인 | type=submit |
| button | sidebar-toggle | 사이드바 숨기기 | type=button |
| button | open-settings | 포털 설정 | type=button |
| button | logout | 로그아웃 |  |
| button | refresh | ↻ 요약 새로고침 |  |
| input | search | 애플리케이션 검색 |  |
| dialog | portal-settings | portal-settings | aria-labelledby=settings-title |
| button | close-settings | 설정 닫기 | type=button |
| input | show-favorites | show-favorites | type=checkbox |
| button | cancel-settings | 취소 | type=button |
| button | save-settings | 저장 | type=submit |

## cloud-setup.html

컨트롤 수: 1

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| textarea | — | Supabase 초기 설정 SQL |  |

## shared-item.html

컨트롤 수: 2

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | save | 변경사항 저장 |  |
| button | refresh | 최신 내용 다시 열기 |  |

## apps/markdown/index.html

컨트롤 수: 97

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | theme | 테마 변경 |  |
| button | focus | 집중 모드 |  |
| button | openStorage | ▱ 저장소 연결 ● |  |
| button | newDoc | ＋ 새 문서 |  |
| input | docSearch | 문서 검색 |  |
| button | importDoc | ↑ 가져오기 |  |
| button | newFolder | 새 폴더 |  |
| button | editTreeItem | 선택 항목 이름 변경 |  |
| button | moveTreeItem | 선택 항목 이동 |  |
| button | deleteTreeItem | 선택 항목 삭제 |  |
| button | toggleFolders | 모두 펼치기 |  |
| select | treeSort | 정렬 | ; 최근 수정순 [updated] / 이름 오름차순 [name] / 이름 내림차순 [name-desc] / 생성순 [created] |
| button | treeRoot | ⌂ 내 문서 |  |
| button | storageShortcut | 저장소 관리 ↗ |  |
| input | docTitle | 문서 제목 | maxlength=200 |
| button | duplicateDoc | 복제 |  |
| button | deleteDoc | 삭제 |  |
| button | openExport | 내보내기 ↓ |  |
| button | undoEdit | 되돌리기 | disabled=true |
| button | redoEdit | 다시 실행 | disabled=true |
| button | — | 제목 1 |  |
| button | — | 제목 2 |  |
| button | — | 제목 3 |  |
| button | — | B |  |
| button | — | I |  |
| button | — | 밑줄 |  |
| button | — | S |  |
| button | — | ❞ |  |
| button | — | ☷ |  |
| button | — | 1. |  |
| button | — | ☑ |  |
| button | — | ↗ |  |
| button | — | 이미지 삽입 |  |
| button | — | </> |  |
| button | — | { } |  |
| button | — | ▦ |  |
| button | — | ― |  |
| button | — | 행 추가 | type=button, disabled=true |
| button | — | 열 추가 | type=button, disabled=true |
| button | — | 행 삭제 | type=button, disabled=true |
| button | — | 열 삭제 | type=button, disabled=true |
| button | openFind | ⌕ 찾기 |  |
| button | — | Markdown | data-view=edit |
| button | — | 분할 | data-view=split |
| button | — | 문서 | data-view=preview |
| button | toggleOutline | 목차 |  |
| input | findText | 찾을 내용 |  |
| input | replaceText | 바꿀 내용 |  |
| input | matchCase | matchCase | type=checkbox |
| button | findNext | 다음 |  |
| button | replaceOne | 바꾸기 |  |
| button | replaceAll | 모두 바꾸기 |  |
| button | closeFind | 찾기 닫기 |  |
| textarea | editor | Markdown 원본 편집 |  |
| input | previewEditable | previewEditable | type=checkbox, checked=true |
| input | syncScroll | syncScroll | type=checkbox, checked=true |
| input | syncScrollBoth | syncScrollBoth | type=checkbox |
| select | fontSize | 편집 글자 크기 | ; 13 [] / 15 [] / 17 [] / 19 [] |
| button | help | 단축키 ? |  |
| input | fileInput | fileInput | type=file, accept=.md,.markdown,.txt,text/plain,text/markdown, multiple=true |
| dialog | storageDialog | storageDialog | aria-labelledby=storageTitle |
| button | — | 저장소 닫기 |  |
| input | storageAutoSave | storageAutoSave | type=checkbox |
| input | storageAutoRestore | storageAutoRestore | type=checkbox |
| button | storageLoadNow | 불러오기 |  |
| button | storageSaveNow | 지금 저장 |  |
| button | newStorageProfile | ＋ 새 연결 |  |
| dialog | profileDialog | profileDialog | aria-labelledby=profileTitle |
| button | — | 연결 설정 닫기 |  |
| input | profileId | profileId | type=hidden |
| input | profileName | 예: 업무용 OneDrive | required=true, maxlength=80 |
| select | provider | provider | ; 로컬 폴더 [local] / Google Drive [google] / MS OneDrive [onedrive] / SQLite DB [sqlite] / 외부 DB (ODBC) [odbc] |
| select | mode | mode | ; PC 동기화 폴더 [folder] / 클라우드 API 토큰 [api] |
| input | path | D:\Documents\MD-Storage |  |
| input | folderId | folderId |  |
| input | remotePath | remotePath |  |
| select | dialect | dialect | ; SQL Server [sqlserver] / PostgreSQL [postgres] / MySQL [mysql] |
| input | workspaceKey | workspaceKey | maxlength=120 |
| input | credential | credential | type=password |
| button | — | 취소 | type=button |
| button | — | 연결 확인 및 저장 | type=submit |
| dialog | exportDialog | exportDialog | aria-labelledby=exportTitle |
| button | — | 내보내기 닫기 |  |
| button | exportMd | ↓ Markdown 편집 가능한 .md 원본 |  |
| button | exportHtml | ↓ HTML 서식이 포함된 독립 문서 |  |
| button | printDoc | ⎙ 인쇄 / PDF 브라우저 인쇄에서 PDF로 저장 |  |
| button | exportWorkspace | ↓ 작업공간 백업 모든 문서를 JSON으로 보관 |  |
| button | importWorkspace | ↑ 작업공간 복원 백업 JSON에서 문서 전체 복원 |  |
| input | backupInput | backupInput | type=file, accept=.json,application/json |
| dialog | treeItemDialog | treeItemDialog | aria-labelledby=treeItemDialogTitle |
| button | — | 닫기 |  |
| input | treeItemName | treeItemName | required=true, maxlength=80 |
| select | treeItemParent | 대상 폴더 |  |
| button | — | 취소 | type=button |
| button | — | 적용 | type=submit |
| dialog | helpDialog | helpDialog | aria-labelledby=helpTitle |
| button | — | 도움말 닫기 |  |

## apps/projects/index.html

컨트롤 수: 33

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | — | 라이트 테마 | type=button |
| button | — | 다크 테마 | type=button |
| button | — | 시스템 테마 | type=button |
| button | btn-xlsx | 목록 엑셀 다운로드 |  |
| button | btn-new | 등록 |  |
| button | btn-reload | 새로고침 |  |
| button | — | 프로젝트 목록 | role=tab, data-tab=list |
| button | — | 저장소 설정 | role=tab, data-tab=store |
| input | f-kw | 검색어 |  |
| select | f-year | 사업연도 | ; 사업연도 전체 [] |
| select | f-pstat | 진행 상태 | ; 진행 상태 전체 [] / 제안 [] / 착수 준비 [] / 진행 중 [] / 검수 [] / 완료 [] / 보류 [] |
| select | f-status | 일정 상태 | ; 일정 상태 전체 [] / 예정 [todo] / 진행 [prog] / 지연 [bad] / 완료 [done] |
| button | btn-search | 조회 |  |
| button | btn-backup | 전체 백업 내려받기 (JSON) |  |
| input | restore-file | 백업 불러오기 | type=file, accept=.json,application/json |
| input | p-name | 사업명 * | maxlength=120, required=true |
| input | p-client | 발주기관 * | maxlength=80, required=true |
| select | p-pstat | 진행 상태 | ; 제안 [] / 착수 준비 [] / 진행 중 [] / 검수 [] / 완료 [] / 보류 [] |
| input | p-start | 사업 시작일 * | type=date, required=true |
| input | p-end | 사업 종료일 * | type=date, required=true |
| input | p-pm | PM | maxlength=40 |
| input | p-pl | PL | maxlength=40 |
| input | p-members | 팀원 | maxlength=300 |
| textarea | p-desc | 설명 | maxlength=2000 |
| textarea | p-note | 비고 | maxlength=1000 |
| button | pm-del | 삭제 |  |
| button | pm-cancel | 취소 |  |
| button | pm-ok | 등록 |  |
| button | c-pick | 폴더 선택 | type=button |
| input | c-name | 저장소 이름 * | maxlength=40 |
| select | c-type | 유형 | ; 로컬 폴더 [local] / OneDrive 동기화 [onedrive] / Google Drive 동기화 [gdrive] |
| button | c-cancel | 취소 |  |
| button | c-ok | 연결 |  |

## apps/projects/index.html#dash-tpl

컨트롤 수: 50

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | — | 현황 대시보드 | data-view=status |
| button | — | 기준정보 설정 | data-view=baseline |
| button | — | 엑셀 연동 | data-view=excel |
| button | — | 저장 이력 | data-view=versions |
| button | — | 스냅샷 비교 | data-view=compare |
| button | — | 가이드 | data-view=guide |
| button | sample-chip | sample 유지 또는 빈 WBS | type=button |
| button | — | 라이트 테마 | type=button |
| button | — | 다크 테마 | type=button |
| button | — | 시스템 테마 | type=button |
| button | base-prev | 이전 작업일 | type=button |
| input | base-input | 진척 기준일 | type=date |
| button | base-next | 다음 작업일 | type=button |
| button | base-today2 | 오늘 | type=button |
| button | base-src2 | 엑셀 기준일 | type=button |
| input | edit-toggle | 일정·진척 입력 | type=checkbox |
| button | — | 단계 |  |
| button | — | Activity |  |
| button | — | 그룹 |  |
| button | — | 전체 |  |
| select | f-phase | 단계 필터 |  |
| button | — | 전체 |  |
| button | — | 지연 |  |
| button | — | 진행 |  |
| button | — | 미착수 |  |
| button | — | 완료 |  |
| button | — | 주 |  |
| button | — | 일 |  |
| button | to-base | 기준일로 이동 |  |
| button | — | WBS 구조 |  |
| button | — | 프로젝트·진척 기준 |  |
| button | — | 공휴일·마일스톤 |  |
| button | btn-xlsx | WBS 엑셀 내려받기 (수식 포함) |  |
| button | btn-load2 | JSON 불러오기 |  |
| button | btn-json | JSON 내려받기 |  |
| button | btn-html | HTML 내보내기 |  |
| button | diff-close | 닫기 |  |
| select | cmp-a | 기준 (A) |  |
| button | cmp-swap | A와 B 바꾸기 | type=button |
| select | cmp-b | 비교 대상 (B) |  |
| input | cmp-file | 스냅샷 파일 불러오기 | type=file, accept=.json,.html,.htm,.xlsx, multiple=true |
| button | cmp-folder | 저장소 스냅샷에서 불러오기 | type=button |
| input | save-name | 저장 명칭 * | maxlength=80, required=true |
| input | save-note | 설명 (선택) | maxlength=200 |
| input | save-author | 작성자 (선택) | maxlength=40 |
| button | save-cancel | 취소 |  |
| button | save-ok | 저장 |  |
| button | cf-cancel | 취소 |  |
| button | cf-reload | 최신본 불러오기 |  |
| button | cf-force | 내 변경으로 덮어쓰기 |  |

## apps/insight/index.html

컨트롤 수: 102

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | theme | 테마 변경 |  |
| button | — | ▦ 분석 대시보드 | data-page=dashboards |
| button | — | ▤ 데이터 탐색 | data-page=data |
| button | — | ⚙ 설정 | data-page=settings |
| button | createDashboard | ＋ 대시보드 만들기 |  |
| button | openConnections | ＋ 데이터 연결 |  |
| button | editDashboard | edit |  |
| input | dashboardListSearch | 대시보드 검색 |  |
| select | dashboardListStatus | 연결 상태 | ; 모든 상태 [all] / 연결됨 [connected] / 연결 해제 · 조회 전용 [readonly] / 데이터 연결 필요 [missing] |
| select | dashboardListSort | 대시보드 정렬 | ; 최근 수정순 [updated] / 이름순 [name] |
| button | backToDashboards | ← 대시보드 목록 |  |
| select | slicerColumn | 슬라이서 추가할 열 |  |
| button | addSlicer | ＋ 슬라이서 | type=button |
| button | clearSlicers | 전체 선택 초기화 | type=button |
| select | boardLayout | boardLayout | ; 균등 2열 [grid] / 첫 차트 강조 [focus] / 촘촘한 3열 [compact] |
| button | undoBoard | ↶ 되돌리기 | disabled=true |
| button | save | 대시보드 저장 |  |
| button | openStudio | ＋ CHART STUDIO |  |
| button | openKpiCreator | ＋ 카드 |  |
| select | boardExportFormat | 대시보드 저장 형식 | ; PNG 이미지 [png] / PDF 문서 [pdf] |
| button | exportBoard | 대시보드 전체 저장 ↓ |  |
| select | interactionMode | interactionMode | ; 사용 안 함 [none] / 교차 필터 [cross] / 드릴다운 [drill] |
| button | storageLoadNow | 저장소에서 불러오기 |  |
| button | storageSaveNow | 지금 저장 |  |
| input | storageAutoSave | storageAutoSave | type=checkbox |
| input | storageAutoRestore | storageAutoRestore | type=checkbox |
| button | newStorageProfile | ＋ 새 연결 | disabled=true |
| dialog | storageProfileDialog | storageProfileDialog | aria-labelledby=storageProfileDialogTitle |
| button | closeStorageProfile | 저장소 연결 닫기 | type=button |
| input | storageProfileId | storageProfileId | type=hidden |
| input | storageProfileName | 예: 업무용 OneDrive | required=true, maxlength=80 |
| select | storageProvider | storageProvider | ; 로컬 폴더 [local] / Google Drive [google] / MS OneDrive [onedrive] / SQLite DB [sqlite] / 외부 DB (ODBC) [odbc] |
| select | storageMode | storageMode | ; PC 동기화 폴더 [folder] / 클라우드 API 토큰 [api] |
| input | storagePath | D:\BI-Storage |  |
| input | storageFolder | root 또는 폴더 URL의 ID |  |
| input | storageRemote | insight-bi-workspace.json |  |
| select | storageDialect | storageDialect | ; SQL Server [sqlserver] / PostgreSQL [postgres] / MySQL [mysql] |
| input | storageKey | storageKey | maxlength=120 |
| input | storageCredential | 서버 실행 중에만 사용 · 저장 파일에 미포함 | type=password |
| button | cancelStorageProfile | 취소 | type=button |
| button | connectStorage | 연결 확인 및 저장 | type=submit |
| dialog | connectionsDialog | connectionsDialog | aria-labelledby=connectionsHeading |
| input | file | file | type=file, accept=.xlsx,.xlsm,.csv,.tsv,.xls |
| button | closeConnections | 데이터 연결 닫기 |  |
| button | — | 연결 및 데이터 불러오기 → | type=submit |
| dialog | dataLookupDialog | dataLookupDialog | aria-labelledby=lookupHeading |
| button | closeDataLookup | 데이터 조회 닫기 |  |
| input | dataLookupSearch | 데이터 조회 검색 |  |
| dialog | deleteDataDialog | deleteDataDialog | aria-labelledby=deleteDataTitle |
| button | cancelDataDelete | 취소 |  |
| button | keepDataDashboards | 대시보드 유지 · 조회 전용 |  |
| button | confirmDataDelete | 데이터와 대시보드 삭제 |  |
| dialog | studioDialog | studioDialog | aria-labelledby=studioTitle |
| input | chartEditName | 비워 두면 기본 제목 | maxlength=100 |
| button | closeStudio | 차트 스튜디오 닫기 |  |
| button | applySelected | 선택 차트에 적용 |  |
| button | pin | ＋ 새 차트 추가 |  |
| button | image | PNG 저장 ↓ |  |
| select | dimension | dimension |  |
| select | measure | measure |  |
| select | aggregate | aggregate | ; 합계 [sum] / 평균 [avg] / 건수 [count] / 최솟값 [min] / 최댓값 [max] |
| select | sort | sort | ; 기준순 [natural] / 값 내림차순 [desc] / 값 오름차순 [asc] |
| select | dateGrain | dateGrain |  |
| select | extraMeasures | extraMeasures | multiple=true |
| select | splitBy | splitBy |  |
| select | drillDimension0 | drillDimension0 |  |
| select | drillDimension1 | drillDimension1 |  |
| select | drillDimension2 | drillDimension2 |  |
| select | drillDimension3 | drillDimension3 |  |
| dialog | kpiEditDialog | kpiEditDialog | aria-labelledby=kpiEditTitle |
| input | kpiEditName | 비워 두면 기본 제목 | maxlength=100 |
| select | kpiEditMetric | kpiEditMetric | ; 분석 대상 [rows] / 합계 [sum] / 평균 [avg] / 데이터 필드 [fields] |
| select | kpiEditMeasure | kpiEditMeasure |  |
| button | cancelKpiEdit | 취소 | type=button |
| button | kpiSubmit | 이 카드에 적용 | type=submit |
| dialog | relinkDashboardDialog | relinkDashboardDialog |  |
| select | relinkDashboardSource | relinkDashboardSource | required=true |
| button | cancelRelinkDashboard | 취소 | type=button |
| button | — | 연결하여 열기 | type=submit |
| dialog | createSourceLookupDialog | createSourceLookupDialog | aria-labelledby=createSourceLookupTitle |
| button | closeCreateSourceLookup | 연결 데이터 조회 닫기 | type=button |
| input | createSourceSearch | 연결 데이터 검색 |  |
| dialog | createDashboardDialog | createDashboardDialog |  |
| input | newDashboardName | 예: 월간 실적 | required=true, maxlength=60 |
| input | newDashboardSource | newDashboardSource | type=hidden |
| button | lookupNewDashboardSource | 연결 데이터 조회 | type=button |
| select | newDashboardTemplate | newDashboardTemplate | ; 기본1 · 종합 현황 [basic1] / 기본2 · 추이·비교 [basic2] / 기본3 · 분포·상세 [basic3] |
| button | cancelCreateDashboard | 취소 | type=button |
| button | — | 만들기 | type=submit |
| dialog | manageDashboardDialog | manageDashboardDialog |  |
| input | renameDashboardName | renameDashboardName | required=true, maxlength=60 |
| button | cancelManageDashboard | 취소 | type=button |
| button | commitManageDashboard | 적용 | type=submit |
| dialog | dashboardDialog | dashboardDialog |  |
| input | dashboardTitleInput | 예: 월간 영업 실적 | maxlength=60, required=true |
| textarea | dashboardDescriptionInput | 이 대시보드의 용도를 적어 주세요. | maxlength=240 |
| button | cancelDashboardSave | 취소 | type=button |
| button | copyDashboard | 새 대시보드로 저장 | type=submit |
| button | updateDashboard | 현재 대시보드 업데이트 | type=submit |
| dialog | deleteDashboardDialog | deleteDashboardDialog |  |
| button | cancelDashboardDelete | 취소 |  |
| button | confirmDashboardDelete | 삭제 |  |

## apps/insight/data-detail.html

컨트롤 수: 16

| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |
|---|---|---|---|
| button | closeDetail | 창 닫기 |  |
| button | editData | 편집 |  |
| button | saveData | 저장 |  |
| button | cancelData | 취소 |  |
| button | uploadCsv | CSV 업로드 ↑ |  |
| input | csvFile | csvFile | type=file, accept=.csv,text/csv |
| button | csvAll | 전체 CSV ↓ |  |
| button | csv | 필터 결과 CSV ↓ |  |
| input | search | 데이터 검색 |  |
| select | filterColumn | filterColumn |  |
| select | filterValue | filterValue |  |
| button | clear | 필터 초기화 |  |
| button | addRow | ＋ 행 추가 |  |
| button | addColumn | ＋ 열 추가 |  |
| button | prev | ← 이전 |  |
| button | next | 다음 → |  |

## 동적 블록 메뉴 전체 명령

추천 위치는 사용 이력에 따라 달라집니다. 아래 분류는 선언된 기본 분류이며 현재 추천 순서를 뜻하지 않습니다. 작업/색상 명령은 추천 집계 대상에서 제외합니다.

| 명령 ID | 표시 이름 | 기본 분류 |
|---|---|---|
| ai | AI 블록 | 고급 블록 |
| breadcrumb | 이동 경로 | 고급 블록 |
| button | 버튼 | 고급 블록 |
| columns2 | 2개의 열 | 고급 블록 |
| columns3 | 3개의 열 | 고급 블록 |
| columns4 | 4개의 열 | 고급 블록 |
| columns5 | 5개의 열 | 고급 블록 |
| equation | 수학 공식 블록 | 고급 블록 |
| sync | 동기화 블록 | 고급 블록 |
| tabs | 탭 | 고급 블록 |
| toc | 목차 | 고급 블록 |
| toggle1 | 토글 제목1 | 고급 블록 |
| toggle2 | 토글 제목2 | 고급 블록 |
| bullet | 글머리 기호 목록 | 기본 블록 |
| callout | 콜아웃 | 기본 블록 |
| heading1 | 제목1 | 기본 블록 |
| heading2 | 제목2 | 기본 블록 |
| heading3 | 제목3 | 기본 블록 |
| heading4 | 제목4 | 기본 블록 |
| number | 번호 매기기 목록 | 기본 블록 |
| page | 페이지 | 기본 블록 |
| pageLink | 페이지 링크 | 기본 블록 |
| paragraph | 텍스트 | 기본 블록 |
| quote | 인용 | 기본 블록 |
| rule | 구분선 | 기본 블록 |
| table | 표 | 기본 블록 |
| task | 할 일 목록 | 기본 블록 |
| toggle | 토글 목록 | 기본 블록 |
| chart-bar | 세로 막대 차트 | 데이터베이스 |
| chart-donut | 도넛 차트 | 데이터베이스 |
| chart-horizontal | 가로 막대 차트 | 데이터베이스 |
| chart-line | 꺾은선 차트 | 데이터베이스 |
| chart-number | 숫자 차트 | 데이터베이스 |
| db-board | 보드 보기 | 데이터베이스 |
| db-calendar | 캘린더 보기 | 데이터베이스 |
| db-dashboard | 대시보드 보기 | 데이터베이스 |
| db-feed | 피드 보기 | 데이터베이스 |
| db-form | 폼 | 데이터베이스 |
| db-gallery | 갤러리 보기 | 데이터베이스 |
| db-inline | 데이터베이스 - 인라인 | 데이터베이스 |
| db-list | 리스트 보기 | 데이터베이스 |
| db-map | 지도 보기 | 데이터베이스 |
| db-page | 데이터베이스 - 전체 페이지 | 데이터베이스 |
| db-source | 데이터 소스 보기 연결 | 데이터베이스 |
| db-table | 표 보기 | 데이터베이스 |
| db-timeline | 타임라인 보기 | 데이터베이스 |
| audio | 오디오 | 미디어 |
| bookmark | 웹 북마크 | 미디어 |
| fence | 코드 블록 | 미디어 |
| file | 파일 | 미디어 |
| image | 이미지 | 미디어 |
| link | 링크 | 미디어 |
| video | 동영상 | 미디어 |
| color-studioBackground-blue | 파란색 배경 | 배경 색상 |
| color-studioBackground-brown | 갈색 배경 | 배경 색상 |
| color-studioBackground-default | 기본 배경 | 배경 색상 |
| color-studioBackground-gray | 회색 배경 | 배경 색상 |
| color-studioBackground-green | 초록색 배경 | 배경 색상 |
| color-studioBackground-orange | 주황색 배경 | 배경 색상 |
| color-studioBackground-pink | 분홍색 배경 | 배경 색상 |
| color-studioBackground-purple | 보라색 배경 | 배경 색상 |
| color-studioBackground-red | 빨간색 배경 | 배경 색상 |
| color-studioBackground-yellow | 노란색 배경 | 배경 색상 |
| date | 날짜 또는 리마인더 | 인라인 |
| emoji | 이모지 | 인라인 |
| inlineEquation | 인라인 수학 공식 | 인라인 |
| mention | 사용자 멘션하기 | 인라인 |
| pageMention | 페이지나 데이터 소스 멘션 | 인라인 |
| html | HTML | 임베드 |
| service-Abstract | Abstract | 임베드 |
| service-Figma | Figma | 임베드 |
| service-Framer | Framer | 임베드 |
| service-GitHub Gist | GitHub Gist | 임베드 |
| service-Google Drive | Google Drive | 임베드 |
| service-Google Maps | Google Maps | 임베드 |
| service-Invision | Invision | 임베드 |
| service-Miro | Miro | 임베드 |
| service-Mixpanel | Mixpanel | 임베드 |
| service-Sketch | Sketch | 임베드 |
| service-Whimsical | Whimsical | 임베드 |
| urlEmbed | 임베드 | 임베드 |
| action-ai | AI에게 질문하기 | 작업 |
| action-copy | 블록 링크 복사 | 작업 |
| action-delete | 삭제 | 작업 |
| action-duplicate | 복제 | 작업 |
| action-move | 옮기기 | 작업 |
| action-present | 여기에서 발표 | 작업 |
| embed | HTML · 임베드 | 추천 |
| mermaid | 코드 - Mermaid | 추천 |
| note | AI 노트 | 추천 |
| toggle3 | 토글 제목3 | 추천 |
| color-studioColor-blue | 파란색 텍스트 | 텍스트 색상 |
| color-studioColor-brown | 갈색 텍스트 | 텍스트 색상 |
| color-studioColor-default | 기본 텍스트 | 텍스트 색상 |
| color-studioColor-gray | 회색 텍스트 | 텍스트 색상 |
| color-studioColor-green | 초록색 텍스트 | 텍스트 색상 |
| color-studioColor-orange | 주황색 텍스트 | 텍스트 색상 |
| color-studioColor-pink | 분홍색 텍스트 | 텍스트 색상 |
| color-studioColor-purple | 보라색 텍스트 | 텍스트 색상 |
| color-studioColor-red | 빨간색 텍스트 | 텍스트 색상 |
| color-studioColor-yellow | 노란색 텍스트 | 텍스트 색상 |

## 동적 UI·처리 모듈

선택지·행·카드·권한 버튼처럼 런타임에 생성되는 UI의 추적 시작점입니다. 함수 목록은 선언형 함수 기준이며 익명/화살표 콜백 전체를 열거한 목록은 아닙니다.

| 코드 | 선언 함수 | 추출 UI 라벨/설정 키 |
|---|---|---|
| admin.js | actions, all, button, checkboxList, cleanupLogs, clear, create, deleteLog, dialog, editLogSettings, editRecord, field, load, mutate, removeRecord, row, status, table, toggleUser | 해당 소스의 생성 로직 참조 |
| app-shell.js | apply, current, icon, init, paint, setCollapsed, setupWorkspace | 해당 소스의 생성 로직 참조 |
| app.js | allowedApp, appFrameSource, appIcon, date, menuLink, node, openSettings, orderedModules, preferenceRecord, render, renderNavigation, route, setSidebarCollapsed, starIcon, syncAccess, toggleFavorite, updateOrderButtons, visibleModules | 해당 소스의 생성 로직 참조 |
| apps/insight/analysis-controls.js | refreshAnalysisControls, renderAnalysisStatus, renderTableCard | 해당 소스의 생성 로직 참조 |
| apps/insight/app.js | actionIcon, analysisCardConfig, analysisTable, api, applyAnalysisFilters, applySlicerRows, bindAnalysisClick, cardFiltered, changeSheet, connection, currentConfig, dateBucket, demo, download, draw, field, filterComparable, filtered, grouped, init, isDate, listActionButton, multiSeriesData, multiSeriesOption, notify, numeric, optionFor, profile, recommendations, refreshControls, renderAll, renderBoard, renderChart, resetAnalysisView, safeAnalysisConfig, safeCardFilters, safeSlicers, selectOptions, setData, showPage, tableChartOption, upload | 해당 소스의 생성 로직 참조 |
| apps/insight/board-studio.js | applyStudioSelection, canvasText, exportDashboard, initBoardStudio, initKpiEditor, kpiContent, kpiEditDraft, loadExportImage, makeBoardCanvas, openCardStudio, openKpiCreator, openKpiEditor, renderKpiEditPreview, withDefaultKpis | 해당 소스의 생성 로직 참조 |
| apps/insight/card-filters.js | cardFilterRules, changeSlicer, initCardAndSlicerFilters, previewCardFilters, renderCardFilterEditor, renderDashboardSlicers, setCardFilterRules | 해당 소스의 생성 로직 참조 |
| apps/insight/dashboard-library.js | commitDashboardMetadata, creationSourceEntry, dashboardLibraryEntries, filteredDashboardLibrary, initCreateSourceLookup, initDashboardLibrary, initRelinkDashboard, openCreateDashboard, openDashboardManagement, openLibraryDashboard, openRelinkDashboard, renderCreateSourceLookup, renderDashboardList | 해당 소스의 생성 로직 참조 |
| apps/insight/dashboards.js | applyPreset, applySavedDashboard, applyTileStyles, bindTileGesture, boardHistorySnapshot, buildPreset, createDashboardRecord, dashboardCompatibility, dashboardSnapshot, ensureBoardPositions, initBoardUndo, initDashboardEditor, initDashboards, openDashboardSave, overlaps, previewTilePosition, proposeTilePositions, readDashboards, renderDashboardBoard, renderTemplatePicker, resetBoardHistory, safeConfig, saveDashboard, selectDashboardTemplate, setDashboardEditing, settlePositions, shouldUndoBoardEvent, snapshotSignature, syncEditMode, trackBoardHistory, undoBoardEdit, updateDashboardUI, updateUndoButton, validPosition, writeDashboards | 해당 소스의 생성 로직 참조 |
| apps/insight/data-catalog.js | cacheDatabase, catalogEntries, clearSelectedData, dashboardsForSelectedData, findDataRecord, findLinkedDashboard, initDataManagement, linkedDashboardNames, loadDetachedSnapshots, openDataDetail, openDeleteData, registerConnectedData, removeConnectedData, renderConnectedDataPicker, renderDataCatalog, renderDataLookup, retainedEntries, saveDetachedSnapshot, savedForSource, selectConnectedData, sourceMatches, trackDataDashboard | 해당 소스의 생성 로직 참조 |
| apps/insight/data-detail.js | button, cancelEditing, detailRows, downloadTableCSV, moveColumn, options, receive, refreshFilters, refreshValues, render, request, saveTable, syncEditing, tableChanged, tableDirty | 해당 소스의 생성 로직 참조 |
| apps/insight/data-editor-bridge.js | applyDetailTable, detailRevision, remapTableConfig | 해당 소스의 생성 로직 참조 |
| apps/insight/edit-session.js | beginDashboardSession, dashboardHasEdits, discardDashboardDraft, editSessionKey, editSessionSnapshot, finishDashboardExit, guardDashboardExit, persistDashboardDraft, restoreEditSnapshot | 해당 소스의 생성 로직 참조 |
| apps/insight/navigation-state.js | captureViewState, dashboardCompatibilityForView, rememberViewState, restoreViewState | 해당 소스의 생성 로직 참조 |
| apps/insight/storage-worker.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| apps/insight/table-model.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| apps/insight/workspace-storage.js | activeStorage, captureWorkspace, closeStorageProfile, editStorageProfile, hydrateStorageSource, initWorkspaceStorage, loadWorkspaceNow, openStorageProfile, renderStorageFields, renderStorageList, replaceDetachedStorage, restoreWorkspaceBundle, saveWorkspaceInWorker, saveWorkspaceNow, setStorageFormBusy, storageAPI, storageAction, storageChanged, storageSourceRecord, storageStatus, validateWorkspaceBundle | 해당 소스의 생성 로직 참조 |
| apps/markdown/app.js | applyEdit, captureWorkspace, changed, command, currentDoc, download, fileName, findMatches, findNext, importFiles, init, newRecord, onEditorInput, onError, openDraftDB, openFind, readDraft, renderDocList, renderEditor, renderMetadata, restoreWorkspace, safeAction, saveDraft, selectDocument, setFont, setView, toast, updateCursor, updateFindCount | 해당 소스의 생성 로직 참조 |
| apps/markdown/axis-drag.js | bind, clear, draw, locate, parts, preview, rows, studioTableViewport, tick | 해당 소스의 생성 로직 참조 |
| apps/markdown/block-recommendations.js | menu, read, recommend, record, recordBlockRecommendation | 해당 소스의 생성 로직 참조 |
| apps/markdown/block-ui.js | activateBlock, blockUIValid, closeBlockMenus, convertStudioBlock, copyBlockLink, currentStudioBlock, handleRichKey, menuButton, menuHeading, menuSearch, openAnnotations, openBlockMenu, openInsertMenu, openStudioAI, openStudioDialog, placeStudioMenu, renderInsertItems, restoreBlockLink, runSlash, selectBlockText, showColorMenu, showConvertMenu, showListMenu, showMoveMenu, showSkillsMenu, startBlockPresentation, studioDecodeAttribute, studioExtensions, studioNeedsHTML, studioNotes, studioParagraph, studioPatch, studioReplace, studioSerialize, submenu, updateBlockControls, updateSlashMenu | 거절, 다음, 닫기, 뒤로, 메뉴 닫기, 문서 맨 아래로, 문서 맨 위로, 발표 종료, 삭제, 상위 수준으로 내어쓰기, 이전, 이전 토글 아래로 들여쓰기, 질문과 블록 내용 복사 |
| apps/markdown/block-widgets.js | chooseStudioDocument, chooseStudioSource, databaseFieldInput, editDatabaseRow, insertExtraInline, insertExtraNode, insertStudioExtra, newStudioDatabase, openStudioMediaPicker, renderStudioChart, renderStudioDatabase, renderStudioMath, renderStudioMedia, renderStudioMermaid, renderStudioWidget, safeStudioURL, studioEmbedURL, studioInlineEquationExtension, studioLoadScript, studioSVG, studioSourceOptions, studioWidgetExtensions, studioWidgetNode, updateStudioSource, widgetButton, widgetSummary | +, + 새 항목, + 속성, URL 삽입, 공식 편집, 버튼 설정, 삭제, 삽입, 속성 삭제, 원본 편집, 이름 변경, 저장, 주소 변경, 질문 복사, 추가, 코드 편집, 편집, 항목 삭제 |
| apps/markdown/column-resize.js | finish, hide, position | 해당 소스의 생성 로직 참조 |
| apps/markdown/database-charts.js | aggregate, config, controls, dateKey, download, render | PNG 다운로드, SVG 다운로드 |
| apps/markdown/database-layout.js | clearRecordMark, controls, copyView, editField, icon, inlineCell, modeRecord, openRecord, refresh, render | calendarUnit, cardLayout, cardPreview, cardSize, conditionColor, conditionField, dateField, endField, equalColumns, fitMedia, freezeFirstColumn, freezeFirstRow, groupField, initialLoad, latField, lngField, locationField, openMode, pageIcons, propertyWrap, showAuthor, showTitle, subItems, tableGroupField, titleWrap, verticalLines, weekends, wrap, ↓ 더 불러오기, 속성 삭제, 속성 저장, 열기, ＋ 새 페이지 |
| apps/markdown/database-ui.js | addProperty, anchorFor, apply, button, close, decorateTable, enhance, guard, heading, icon, item, label, newRow, open, patch, position, resizeColumn, show, syncTitle | 고급 보기 추가, 그룹화, 레이아웃, 모든 보기 설정, 보기 링크 복사, 보기 이름 변경, 복제, 빈 페이지 추가, 삭제, 새 페이지 상세 입력, 속성 추가, 속성 편집, 속성 표시, 속성까지 입력해서 추가, 아래로 이동, 위로 이동, 정렬, 정렬 지우기, 조건부 색상, 차트 편집, 페이지 열기, 필터, 필터 지우기, ＋ 새 속성 |
| apps/markdown/database-views.js | applyRoute, configure, fields, filter, layout, normalize, render | 보기 링크 복사, 보기 삭제, 보기 설정, 차트 편집, 취소, ＋ 보기 추가 |
| apps/markdown/document-library.js | allTags, close, color, date, draw, editTags, editView, fileCount, label, modal, open, rows, sync, tagCell, titleCell | 해당 소스의 생성 로직 참조 |
| apps/markdown/document-tree.js | bindTreeDrag, bindTreeDrop, branch, folderPath, moveTreeRecord, openTreeItem, parentChoices, persistTreeUI, renderDocumentTree, selectFolder, selectTreeDocument, treeCompare, treeIcon, treeSelection, updateFolderToggle | 해당 소스의 생성 로직 참조 |
| apps/markdown/edit-history.js | historyBoundary, historyRecord, historySnapshot, recordEditHistory, resetEditHistory, restorePreviewSelection, runEditHistory, syncEditHistory, trimEditHistory | 해당 소스의 생성 로직 참조 |
| apps/markdown/editor-core.js | edit, matches, validate | 해당 소스의 생성 로직 참조 |
| apps/markdown/file-sync.js | applyFileMerge, bodyHash, checkFileChanges, createRecoveryBase, openFileConflicts, reconcileExternal, rememberFileBaseline, resolveFileConflicts, restoreRecoveryBase, showExternal | 해당 소스의 생성 로직 참조 |
| apps/markdown/folder-model.js | descendants, validate | 해당 소스의 생성 로직 참조 |
| apps/markdown/knowledge.js | openDocumentLink, references, renderDocumentChoices, renderKnowledge | 해당 소스의 생성 로직 참조 |
| apps/markdown/page-actions.js | close, commentLock, copy, drawMenu, insert, insertStudioPage, item, notify, open, openComments, pageURL, place, promote, render, show, syncComments, valid | ← 페이지 메뉴, ↗ 다음에서 열기, ↗ 링크 복사, ▣ 댓글 |
| apps/markdown/rich-editor.js | codeText, flushSourcePreview, onPreviewInput, previewCommand, previewHasFocus, previewMarkdown, syncPreviewEditable | 해당 소스의 생성 로직 참조 |
| apps/markdown/rich-v2.js | activeRichBlock, cloneRichBlock, engineRoot, ensureRichEditor, flushSourcePreview, focusRichEditor, indentRichBlock, moveRichBlock, mutateRichBlocks, onPreviewInput, previewCommand, previewHasFocus, previewMarkdown, renderRichDocument, richBlockAt, richBlockRect, richBlocks, richEngineActive, richExportHTML, richSanitize, richSiblingBlocks, richTopBlocks, serializeRichNode, signature, syncPreviewEditable, updateSelectionBubble, visit | 해당 소스의 생성 로직 참조 |
| apps/markdown/scroll-sync.js | applyDocumentViewOptions, defaultDocumentViewOptions, saveDocumentViewOptions, syncEditorScroll, updateScrollOptions | 해당 소스의 생성 로직 참조 |
| apps/markdown/storage-compare.js | compare, fingerprint, merge, path, summary | 해당 소스의 생성 로직 참조 |
| apps/markdown/storage-flow.js | busyEditor, capture, restore | 해당 소스의 생성 로직 참조 |
| apps/markdown/storage.js | activeStorage, initStorage, loadRemote, openProfile, profileFields, renderStorage, saveRemote, saveWorkspace, storageAPI, storageChanged, storageStatus | 해당 소스의 생성 로직 참조 |
| apps/markdown/table-grid.js | alignTableColumn, editEngineTable, engineTableContext, gridTSV, handleGridCopy, handleGridPaste, moveTableRow, parseTSV, replaceEngineTable, tableSort | 해당 소스의 생성 로직 참조 |
| apps/markdown/table-menu.js | cloneCell, close, commit, context, gridBounds, headerFlags, hideHandles, item, mutate, offsets, open, openPalette, place, refresh, render, resizeAxis, select, show, stopDrag, toggleHeader, valid | 작업 메뉴로 돌아가기 |
| apps/markdown/table-tools.js | currentTableContext, editPreviewTable, editSelectedTable, editSourceTable, queueTableTools, selectedPreviewCell, sourceTableContext, tableLineCells, tableMarkdown, updateTableTools | 해당 소스의 생성 로직 참조 |
| apps/markdown/workspace-merge.js | items, merge | 해당 소스의 생성 로직 참조 |
| apps/projects/workbook-preserve.js | patchCell, patchSheet, path, preserve, strings, unpack | 해당 소스의 생성 로직 참조 |
| auth-link.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| auth-session.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| bridge.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| cloud-files.js | bytes, capture, clean, directory, encode, fileHandle, hydrate, join, persist, validate, walk | 해당 소스의 생성 로직 참조 |
| cloud-ui.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| content-cloud.js | call, create, failure, user, validate | 해당 소스의 생성 로직 참조 |
| excel.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| folder-storage.js | directory, read, record, writeFile | 해당 소스의 생성 로직 참조 |
| item-sharing-adapters.js | capture, init, protect, wait | 해당 소스의 생성 로직 참조 |
| item-sharing.js | members, message, openItem, refresh, share, users | 해당 소스의 생성 로직 참조 |
| login.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| pages-guard.js | detailHost | 해당 소스의 생성 로직 참조 |
| pages-runtime.js | csv, table, transact | 해당 소스의 생성 로직 참조 |
| project-cloud.js | asset, base64, bytes, check, create, error, hash, load, pack, path, rpc, templates, unpack, user, validate | 해당 소스의 생성 로직 참조 |
| shared-item.js | fail, itemTitle | 해당 소스의 생성 로직 참조 |
| sharing-cloud.js | create | 해당 소스의 생성 로직 참조 |
| sharing-frame.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| sidebar-resize.js | apply, finish, notify, position, restore, save | 해당 소스의 생성 로직 참조 |
| storage-adapters.js | IIFE/객체/콜백 참조 | 해당 소스의 생성 로직 참조 |
| storage-flow.js | api, apply, backupPair, backupView, backups, begin, busyEditor, capture, comparison, db, download, downloadBackup, field, freshTarget, header, importLegacy, main, markPending, open, putBackups, refresh, render, renderRows, restore, review, run, say, showBackups, summaryCard | 해당 소스의 생성 로직 참조 |
| storage-models.js | compare, encode, insightItems, projectItems, projectKey, semanticFile, summary | 해당 소스의 생성 로직 참조 |
| apps/projects/index.html (inline) | applyTheme, checkStore, closeForm, countStores, deleteProject, deleteStore, download, fileExists, fillWindow, filtered, getTemplate, init, legacyBackup, listMetas, load, loadExcel, metaFor, newId, noticeHTML, openConnect, openDashboard, openForm, openImport, openWindow, portalActivateCloudStore, readForm, readJSON, readProject, reconnect, relinkStore, render, renderAll, renderImport, renderStoreBox, renderStoreTab, rootOf, runImport, selectStore, setTab, showBlocked, snapDir, snapFile, status, storeErr, submitForm, unlinkStore, winFeatures, writeFile, writeMeta, writeProject | 해당 소스의 생성 로직 참조 |
| apps/projects/index.html#dash-tpl (inline) | addLoaded, agg, applyCellEdit, applySaved, applyStaged, applyTheme, bindCal, bindCompare, bindGantt, bindGuide, bindProj, bindStatic, bindVersions, bindWBS, boot, buildDocument, buildImport, buildWorkbook, changed, closeConflict, closeLoad, closeSamplePop, closeSave, commitExt, compareSources, compute, confirmHTML, conflictForce, conflictReload, cv, diffStates, diffTable, doDelete, doSave, downloadHTML, downloadJSON, exitExt, exitPreview, exportXlsx, findNode, findTask, flatTasks, gapState, gotoTask, hostInfo, hostNotify, keepFocus, leafCalc, leavesOf, listSnapFolder, loadExcel, loadFolderList, loadPicked, lockBasic, makeCal, move, normalize, offerFile, openConflict, openLoad, openSamplePop, openSave, parentArr, parseWorkbook, preservedBytes, readFile, readSnapFile, recompute, regroup, renderAll, renderBanner, renderCal, renderCompare, renderDashboard, renderDiff, renderGantt, renderImport, renderLoad, renderLoc, renderPreview, renderProj, renderSample, renderSaveTargets, renderSavebox, renderStoreChip, renderVersions, renderWBS, restoreVersion, rollup, rowHTML, safeJSON, savedTask, scrollToBase, setDepth, setSub, setView, snapFileName, storeInfo, storeSave, storeSnapList, summarize, syncBasicFromHost, taskPanelHTML, tipHTML, toDateStr, toPct, toPkg, toast, visibleRows | 해당 소스의 생성 로직 참조 |

정적 컨트롤 합계: 316 / 블록 명령: 101 / 모듈: 69
