# 화면 컨트롤 상세 부록

정적 8개 HTML 원천의 전 컨트롤입니다. 동적 메뉴·행 동작은 화면설계서와 기능설계서의 SC/FN 계약을 함께 적용합니다.

## index.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | auth-retry | 다시 시도 | {"id": "auth-retry", "type": "button"} |  |
| input | email | 이메일 | {"id": "email", "type": "email", "maxlength": "254", "required": "true", "placeholder": "name@example.com"} |  |
| button | login | 인증코드 받기 | {"id": "login", "type": "submit"} |  |
| input | otp | 이메일 인증코드 | {"id": "otp", "maxlength": "10", "required": "true"} |  |
| button | verify-code | 로그인 | {"id": "verify-code", "type": "submit"} |  |
| button | sidebar-toggle | 사이드바 숨기기 | {"id": "sidebar-toggle", "type": "button", "aria-label": "사이드바 숨기기"} |  |
| button | open-settings | 포털 설정 | {"id": "open-settings", "type": "button", "aria-label": "포털 설정", "title": "포털 설정"} |  |
| button | logout | 로그아웃 | {"id": "logout"} |  |
| button | refresh | ↻ 요약 새로고침 | {"id": "refresh"} |  |
| input | search | 애플리케이션 검색 | {"id": "search", "placeholder": "애플리케이션 검색", "aria-label": "애플리케이션 검색"} |  |
| dialog | portal-settings | portal-settings | {"id": "portal-settings", "aria-labelledby": "settings-title"} |  |
| button | close-settings | 설정 닫기 | {"id": "close-settings", "type": "button", "aria-label": "설정 닫기"} |  |
| input | show-favorites | show-favorites | {"id": "show-favorites", "type": "checkbox"} |  |
| button | cancel-settings | 취소 | {"id": "cancel-settings", "type": "button"} |  |
| button | save-settings | 저장 | {"id": "save-settings", "type": "submit"} |  |
## cloud-setup.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| textarea | 동적/ID 없음 | Supabase 초기 설정 SQL | {"aria-label": "Supabase 초기 설정 SQL"} |  |
## shared-item.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | save | 변경사항 저장 | {"id": "save"} |  |
| button | refresh | 최신 내용 다시 열기 | {"id": "refresh"} |  |
## apps/markdown/index.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | theme | 테마 변경 | {"id": "theme", "title": "밝은/어두운 테마", "aria-label": "테마 변경"} |  |
| button | focus | 집중 모드 | {"id": "focus", "title": "집중 모드 (Esc로 종료)"} |  |
| button | openStorage | ▱ 저장소 연결 ● | {"id": "openStorage"} |  |
| button | newDoc | ＋ 새 문서 | {"id": "newDoc"} |  |
| input | docSearch | 문서 검색 | {"id": "docSearch", "placeholder": "문서 검색", "aria-label": "문서 검색"} |  |
| button | importDoc | ↑ 가져오기 | {"id": "importDoc", "title": "Markdown 파일 가져오기"} |  |
| button | newFolder | 새 폴더 | {"id": "newFolder", "title": "새 폴더", "aria-label": "새 폴더"} |  |
| button | editTreeItem | 선택 항목 이름 변경 | {"id": "editTreeItem", "title": "선택 항목 이름 변경", "aria-label": "선택 항목 이름 변경"} |  |
| button | moveTreeItem | 선택 항목 이동 | {"id": "moveTreeItem", "title": "선택 항목 이동", "aria-label": "선택 항목 이동"} |  |
| button | deleteTreeItem | 선택 항목 삭제 | {"id": "deleteTreeItem", "title": "선택 항목 삭제", "aria-label": "선택 항목 삭제"} |  |
| button | toggleFolders | 모두 펼치기 | {"id": "toggleFolders", "title": "모두 펼치기", "aria-label": "모두 펼치기"} |  |
| select | treeSort | 정렬 | {"id": "treeSort"} | updated=최근 수정순; name=이름 오름차순; name-desc=이름 내림차순; created=생성순 |
| button | treeRoot | ⌂ 내 문서 | {"id": "treeRoot", "title": "최상위 위치 선택"} |  |
| button | storageShortcut | 저장소 관리 ↗ | {"id": "storageShortcut"} |  |
| input | docTitle | 문서 제목 | {"id": "docTitle", "aria-label": "문서 제목", "maxlength": "200", "placeholder": "제목 없는 문서"} |  |
| button | duplicateDoc | 복제 | {"id": "duplicateDoc", "title": "문서 복제"} |  |
| button | deleteDoc | 삭제 | {"id": "deleteDoc", "title": "문서 삭제"} |  |
| button | openExport | 내보내기 ↓ | {"id": "openExport"} |  |
| button | undoEdit | 되돌리기 | {"id": "undoEdit", "title": "되돌리기 (Ctrl+Z)", "aria-label": "되돌리기", "disabled": "true"} |  |
| button | redoEdit | 다시 실행 | {"id": "redoEdit", "title": "다시 실행 (Ctrl+Shift+Z / Ctrl+Y)", "aria-label": "다시 실행", "disabled": "true"} |  |
| button | 동적/ID 없음 | 제목 1 | {"title": "제목 1", "aria-label": "제목 1"} |  |
| button | 동적/ID 없음 | 제목 2 | {"title": "제목 2", "aria-label": "제목 2"} |  |
| button | 동적/ID 없음 | 제목 3 | {"title": "제목 3", "aria-label": "제목 3"} |  |
| button | 동적/ID 없음 | B | {"title": "굵게 (Ctrl+B)"} |  |
| button | 동적/ID 없음 | I | {"title": "기울임 (Ctrl+I)"} |  |
| button | 동적/ID 없음 | 밑줄 | {"title": "밑줄 (Ctrl+U)", "aria-label": "밑줄"} |  |
| button | 동적/ID 없음 | S | {"title": "취소선"} |  |
| button | 동적/ID 없음 | ❞ | {"title": "인용"} |  |
| button | 동적/ID 없음 | ☷ | {"title": "글머리 목록"} |  |
| button | 동적/ID 없음 | 1. | {"title": "번호 목록"} |  |
| button | 동적/ID 없음 | ☑ | {"title": "할 일"} |  |
| button | 동적/ID 없음 | ↗ | {"title": "링크 (Ctrl+K)"} |  |
| button | 동적/ID 없음 | 이미지 삽입 | {"title": "이미지 삽입", "aria-label": "이미지 삽입"} |  |
| button | 동적/ID 없음 | </> | {"title": "인라인 코드"} |  |
| button | 동적/ID 없음 | { } | {"title": "코드 블록"} |  |
| button | 동적/ID 없음 | ▦ | {"title": "표 삽입"} |  |
| button | 동적/ID 없음 | ― | {"title": "구분선"} |  |
| button | 동적/ID 없음 | 행 추가 | {"type": "button", "title": "선택한 행 아래에 추가", "disabled": "true"} |  |
| button | 동적/ID 없음 | 열 추가 | {"type": "button", "title": "선택한 열 오른쪽에 추가", "disabled": "true"} |  |
| button | 동적/ID 없음 | 행 삭제 | {"type": "button", "title": "선택한 행 삭제 · 머리글 삭제 시 다음 행이 머리글이 됩니다", "disabled": "true"} |  |
| button | 동적/ID 없음 | 열 삭제 | {"type": "button", "title": "선택한 열 삭제", "disabled": "true"} |  |
| button | openFind | ⌕ 찾기 | {"id": "openFind", "title": "찾기·바꾸기 (Ctrl+F)"} |  |
| button | 동적/ID 없음 | Markdown | {"data-view": "edit"} |  |
| button | 동적/ID 없음 | 분할 | {"data-view": "split"} |  |
| button | 동적/ID 없음 | 문서 | {"data-view": "preview"} |  |
| button | toggleOutline | 목차 | {"id": "toggleOutline", "title": "목차 표시"} |  |
| input | findText | 찾을 내용 | {"id": "findText", "placeholder": "찾을 내용", "aria-label": "찾을 내용"} |  |
| input | replaceText | 바꿀 내용 | {"id": "replaceText", "placeholder": "바꿀 내용", "aria-label": "바꿀 내용"} |  |
| input | matchCase | matchCase | {"id": "matchCase", "type": "checkbox"} |  |
| button | findNext | 다음 | {"id": "findNext"} |  |
| button | replaceOne | 바꾸기 | {"id": "replaceOne"} |  |
| button | replaceAll | 모두 바꾸기 | {"id": "replaceAll"} |  |
| button | closeFind | 찾기 닫기 | {"id": "closeFind", "aria-label": "찾기 닫기"} |  |
| textarea | editor | Markdown 원본 편집 | {"id": "editor", "aria-label": "Markdown 원본 편집"} |  |
| input | previewEditable | previewEditable | {"id": "previewEditable", "type": "checkbox", "checked": "true"} |  |
| input | syncScroll | syncScroll | {"id": "syncScroll", "type": "checkbox", "checked": "true"} |  |
| input | syncScrollBoth | syncScrollBoth | {"id": "syncScrollBoth", "type": "checkbox"} |  |
| select | fontSize | 편집 글자 크기 | {"id": "fontSize", "aria-label": "편집 글자 크기"} | =13; =15; =17; =19 |
| button | help | 단축키 ? | {"id": "help"} |  |
| input | fileInput | fileInput | {"type": "file", "id": "fileInput", "accept": ".md,.markdown,.txt,text/plain,text/markdown", "multiple": "true"} |  |
| dialog | storageDialog | storageDialog | {"id": "storageDialog", "aria-labelledby": "storageTitle"} |  |
| button | 동적/ID 없음 | 저장소 닫기 | {"aria-label": "저장소 닫기"} |  |
| input | storageAutoSave | storageAutoSave | {"id": "storageAutoSave", "type": "checkbox"} |  |
| input | storageAutoRestore | storageAutoRestore | {"id": "storageAutoRestore", "type": "checkbox"} |  |
| button | storageLoadNow | 불러오기 | {"id": "storageLoadNow"} |  |
| button | storageSaveNow | 지금 저장 | {"id": "storageSaveNow"} |  |
| button | newStorageProfile | ＋ 새 연결 | {"id": "newStorageProfile"} |  |
| dialog | profileDialog | profileDialog | {"id": "profileDialog", "aria-labelledby": "profileTitle"} |  |
| button | 동적/ID 없음 | 연결 설정 닫기 | {"aria-label": "연결 설정 닫기"} |  |
| input | profileId | profileId | {"id": "profileId", "type": "hidden"} |  |
| input | profileName | 예: 업무용 OneDrive | {"id": "profileName", "required": "true", "maxlength": "80", "placeholder": "예: 업무용 OneDrive"} |  |
| select | provider | provider | {"id": "provider"} | local=로컬 폴더; google=Google Drive; onedrive=MS OneDrive; sqlite=SQLite DB; odbc=외부 DB (ODBC) |
| select | mode | mode | {"id": "mode"} | folder=PC 동기화 폴더; api=클라우드 API 토큰 |
| input | path | D:\Documents\MD-Storage | {"id": "path", "placeholder": "D:\\Documents\\MD-Storage"} |  |
| input | folderId | folderId | {"id": "folderId"} |  |
| input | remotePath | remotePath | {"id": "remotePath"} |  |
| select | dialect | dialect | {"id": "dialect"} | sqlserver=SQL Server; postgres=PostgreSQL; mysql=MySQL |
| input | workspaceKey | workspaceKey | {"id": "workspaceKey", "maxlength": "120"} |  |
| input | credential | credential | {"id": "credential", "type": "password"} |  |
| button | 동적/ID 없음 | 취소 | {"type": "button"} |  |
| button | 동적/ID 없음 | 연결 확인 및 저장 | {"type": "submit"} |  |
| dialog | exportDialog | exportDialog | {"id": "exportDialog", "aria-labelledby": "exportTitle"} |  |
| button | 동적/ID 없음 | 내보내기 닫기 | {"aria-label": "내보내기 닫기"} |  |
| button | exportMd | ↓ Markdown 편집 가능한 .md 원본 | {"id": "exportMd"} |  |
| button | exportHtml | ↓ HTML 서식이 포함된 독립 문서 | {"id": "exportHtml"} |  |
| button | printDoc | ⎙ 인쇄 / PDF 브라우저 인쇄에서 PDF로 저장 | {"id": "printDoc"} |  |
| button | exportWorkspace | ↓ 작업공간 백업 모든 문서를 JSON으로 보관 | {"id": "exportWorkspace"} |  |
| button | importWorkspace | ↑ 작업공간 복원 백업 JSON에서 문서 전체 복원 | {"id": "importWorkspace"} |  |
| input | backupInput | backupInput | {"type": "file", "id": "backupInput", "accept": ".json,application/json"} |  |
| dialog | treeItemDialog | treeItemDialog | {"id": "treeItemDialog", "aria-labelledby": "treeItemDialogTitle"} |  |
| button | 동적/ID 없음 | 닫기 | {"aria-label": "닫기"} |  |
| input | treeItemName | treeItemName | {"id": "treeItemName", "required": "true", "maxlength": "80"} |  |
| select | treeItemParent | 대상 폴더 | {"id": "treeItemParent", "aria-label": "대상 폴더"} |  |
| button | 동적/ID 없음 | 취소 | {"type": "button"} |  |
| button | 동적/ID 없음 | 적용 | {"type": "submit"} |  |
| dialog | helpDialog | helpDialog | {"id": "helpDialog", "aria-labelledby": "helpTitle"} |  |
| button | 동적/ID 없음 | 도움말 닫기 | {"aria-label": "도움말 닫기"} |  |
## apps/projects/index.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | 동적/ID 없음 | 라이트 테마 | {"type": "button", "title": "라이트", "aria-label": "라이트 테마"} |  |
| button | 동적/ID 없음 | 다크 테마 | {"type": "button", "title": "다크", "aria-label": "다크 테마"} |  |
| button | 동적/ID 없음 | 시스템 테마 | {"type": "button", "title": "시스템 설정 따르기", "aria-label": "시스템 테마"} |  |
| button | btn-xlsx | 목록 엑셀 다운로드 | {"id": "btn-xlsx"} |  |
| button | btn-new | 등록 | {"id": "btn-new"} |  |
| button | btn-reload | 새로고침 | {"id": "btn-reload"} |  |
| button | 동적/ID 없음 | 프로젝트 목록 | {"role": "tab", "data-tab": "list"} |  |
| button | 동적/ID 없음 | 저장소 설정 | {"role": "tab", "data-tab": "store"} |  |
| input | f-kw | 검색어 | {"id": "f-kw", "placeholder": "사업명, 발주기관, PM, PL, 팀원, 설명, 비고", "aria-label": "검색어"} |  |
| select | f-year | 사업연도 | {"id": "f-year", "aria-label": "사업연도"} | =사업연도 전체 |
| select | f-pstat | 진행 상태 | {"id": "f-pstat", "aria-label": "진행 상태"} | =진행 상태 전체; =제안; =착수 준비; =진행 중; =검수; =완료; =보류 |
| select | f-status | 일정 상태 | {"id": "f-status", "aria-label": "일정 상태"} | =일정 상태 전체; todo=예정; prog=진행; bad=지연; done=완료 |
| button | btn-search | 조회 | {"id": "btn-search"} |  |
| button | btn-backup | 전체 백업 내려받기 (JSON) | {"id": "btn-backup"} |  |
| input | restore-file | 백업 불러오기 | {"type": "file", "id": "restore-file", "accept": ".json,application/json"} |  |
| input | p-name | 사업명 * | {"id": "p-name", "maxlength": "120", "required": "true"} |  |
| input | p-client | 발주기관 * | {"id": "p-client", "maxlength": "80", "required": "true"} |  |
| select | p-pstat | 진행 상태 | {"id": "p-pstat"} | =제안; =착수 준비; =진행 중; =검수; =완료; =보류 |
| input | p-start | 사업 시작일 * | {"type": "date", "id": "p-start", "required": "true"} |  |
| input | p-end | 사업 종료일 * | {"type": "date", "id": "p-end", "required": "true"} |  |
| input | p-pm | PM | {"id": "p-pm", "maxlength": "40", "placeholder": "이름"} |  |
| input | p-pl | PL | {"id": "p-pl", "maxlength": "40", "placeholder": "이름"} |  |
| input | p-members | 팀원 | {"id": "p-members", "maxlength": "300", "placeholder": "쉼표로 구분 (예: 홍길동, 김철수, 이영희)"} |  |
| textarea | p-desc | 설명 | {"id": "p-desc", "maxlength": "2000", "placeholder": "사업 개요, 주요 범위"} |  |
| textarea | p-note | 비고 | {"id": "p-note", "maxlength": "1000"} |  |
| button | pm-del | 삭제 | {"id": "pm-del"} |  |
| button | pm-cancel | 취소 | {"id": "pm-cancel"} |  |
| button | pm-ok | 등록 | {"id": "pm-ok"} |  |
| button | c-pick | 폴더 선택 | {"id": "c-pick", "type": "button"} |  |
| input | c-name | 저장소 이름 * | {"id": "c-name", "maxlength": "40", "placeholder": "예: 팀 공유"} |  |
| select | c-type | 유형 | {"id": "c-type"} | local=로컬 폴더; onedrive=OneDrive 동기화; gdrive=Google Drive 동기화 |
| button | c-cancel | 취소 | {"id": "c-cancel"} |  |
| button | c-ok | 연결 | {"id": "c-ok"} |  |
## apps/projects/index.html#dash-tpl

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | 동적/ID 없음 | 현황 대시보드 | {"data-view": "status"} |  |
| button | 동적/ID 없음 | 기준정보 설정 | {"data-view": "baseline"} |  |
| button | 동적/ID 없음 | 엑셀 연동 | {"data-view": "excel"} |  |
| button | 동적/ID 없음 | 저장 이력 | {"data-view": "versions"} |  |
| button | 동적/ID 없음 | 스냅샷 비교 | {"data-view": "compare"} |  |
| button | 동적/ID 없음 | 가이드 | {"data-view": "guide"} |  |
| button | sample-chip | sample 유지 또는 빈 WBS | {"type": "button", "id": "sample-chip"} |  |
| button | 동적/ID 없음 | 라이트 테마 | {"type": "button", "title": "라이트", "aria-label": "라이트 테마"} |  |
| button | 동적/ID 없음 | 다크 테마 | {"type": "button", "title": "다크", "aria-label": "다크 테마"} |  |
| button | 동적/ID 없음 | 시스템 테마 | {"type": "button", "title": "시스템 설정 따르기", "aria-label": "시스템 테마"} |  |
| button | base-prev | 이전 작업일 | {"id": "base-prev", "type": "button", "aria-label": "이전 작업일", "title": "이전 작업일"} |  |
| input | base-input | 진척 기준일 | {"type": "date", "id": "base-input"} |  |
| button | base-next | 다음 작업일 | {"id": "base-next", "type": "button", "aria-label": "다음 작업일", "title": "다음 작업일"} |  |
| button | base-today2 | 오늘 | {"id": "base-today2", "type": "button"} |  |
| button | base-src2 | 엑셀 기준일 | {"id": "base-src2", "type": "button"} |  |
| input | edit-toggle | 일정·진척 입력 | {"type": "checkbox", "id": "edit-toggle"} |  |
| button | 동적/ID 없음 | 단계 | {} |  |
| button | 동적/ID 없음 | Activity | {} |  |
| button | 동적/ID 없음 | 그룹 | {} |  |
| button | 동적/ID 없음 | 전체 | {} |  |
| select | f-phase | 단계 필터 | {"id": "f-phase", "aria-label": "단계 필터"} |  |
| button | 동적/ID 없음 | 전체 | {} |  |
| button | 동적/ID 없음 | 지연 | {} |  |
| button | 동적/ID 없음 | 진행 | {} |  |
| button | 동적/ID 없음 | 미착수 | {} |  |
| button | 동적/ID 없음 | 완료 | {} |  |
| button | 동적/ID 없음 | 주 | {} |  |
| button | 동적/ID 없음 | 일 | {} |  |
| button | to-base | 기준일로 이동 | {"id": "to-base"} |  |
| button | 동적/ID 없음 | WBS 구조 | {} |  |
| button | 동적/ID 없음 | 프로젝트·진척 기준 | {} |  |
| button | 동적/ID 없음 | 공휴일·마일스톤 | {} |  |
| button | btn-xlsx | WBS 엑셀 내려받기 (수식 포함) | {"id": "btn-xlsx"} |  |
| button | btn-load2 | JSON 불러오기 | {"id": "btn-load2"} |  |
| button | btn-json | JSON 내려받기 | {"id": "btn-json"} |  |
| button | btn-html | HTML 내보내기 | {"id": "btn-html"} |  |
| button | diff-close | 닫기 | {"id": "diff-close"} |  |
| select | cmp-a | 기준 (A) | {"id": "cmp-a"} |  |
| button | cmp-swap | A와 B 바꾸기 | {"id": "cmp-swap", "type": "button", "aria-label": "A와 B 바꾸기", "title": "A와 B 바꾸기"} |  |
| select | cmp-b | 비교 대상 (B) | {"id": "cmp-b"} |  |
| input | cmp-file | 스냅샷 파일 불러오기 | {"type": "file", "id": "cmp-file", "accept": ".json,.html,.htm,.xlsx", "multiple": "true"} |  |
| button | cmp-folder | 저장소 스냅샷에서 불러오기 | {"id": "cmp-folder", "type": "button"} |  |
| input | save-name | 저장 명칭 * | {"id": "save-name", "maxlength": "80", "placeholder": "예: 10월 4주차 주간보고", "required": "true"} |  |
| input | save-note | 설명 (선택) | {"id": "save-note", "maxlength": "200", "placeholder": "예: 개발 지연분 실적 반영"} |  |
| input | save-author | 작성자 (선택) | {"id": "save-author", "maxlength": "40", "placeholder": "이름"} |  |
| button | save-cancel | 취소 | {"id": "save-cancel"} |  |
| button | save-ok | 저장 | {"id": "save-ok"} |  |
| button | cf-cancel | 취소 | {"id": "cf-cancel"} |  |
| button | cf-reload | 최신본 불러오기 | {"id": "cf-reload"} |  |
| button | cf-force | 내 변경으로 덮어쓰기 | {"id": "cf-force"} |  |
## apps/insight/index.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | theme | 테마 변경 | {"id": "theme", "aria-label": "테마 변경"} |  |
| button | 동적/ID 없음 | ▦ 분석 대시보드 | {"data-page": "dashboards"} |  |
| button | 동적/ID 없음 | ▤ 데이터 탐색 | {"data-page": "data"} |  |
| button | 동적/ID 없음 | ⚙ 설정 | {"data-page": "settings"} |  |
| button | createDashboard | ＋ 대시보드 만들기 | {"id": "createDashboard"} |  |
| button | openConnections | ＋ 데이터 연결 | {"id": "openConnections"} |  |
| button | editDashboard | edit | {"id": "editDashboard"} |  |
| input | dashboardListSearch | 대시보드 검색 | {"id": "dashboardListSearch", "placeholder": "대시보드·데이터 이름 검색", "aria-label": "대시보드 검색"} |  |
| select | dashboardListStatus | 연결 상태 | {"id": "dashboardListStatus", "aria-label": "연결 상태"} | all=모든 상태; connected=연결됨; readonly=연결 해제 · 조회 전용; missing=데이터 연결 필요 |
| select | dashboardListSort | 대시보드 정렬 | {"id": "dashboardListSort", "aria-label": "대시보드 정렬"} | updated=최근 수정순; name=이름순 |
| button | backToDashboards | ← 대시보드 목록 | {"id": "backToDashboards"} |  |
| select | slicerColumn | 슬라이서 추가할 열 | {"id": "slicerColumn", "aria-label": "슬라이서 추가할 열"} |  |
| button | addSlicer | ＋ 슬라이서 | {"id": "addSlicer", "type": "button"} |  |
| button | clearSlicers | 전체 선택 초기화 | {"id": "clearSlicers", "type": "button"} |  |
| select | boardLayout | boardLayout | {"id": "boardLayout"} | grid=균등 2열; focus=첫 차트 강조; compact=촘촘한 3열 |
| button | undoBoard | ↶ 되돌리기 | {"id": "undoBoard", "title": "Ctrl+Z", "disabled": "true"} |  |
| button | save | 대시보드 저장 | {"id": "save"} |  |
| button | openStudio | ＋ CHART STUDIO | {"id": "openStudio"} |  |
| button | openKpiCreator | ＋ 카드 | {"id": "openKpiCreator"} |  |
| select | boardExportFormat | 대시보드 저장 형식 | {"id": "boardExportFormat", "aria-label": "대시보드 저장 형식"} | png=PNG 이미지; pdf=PDF 문서 |
| button | exportBoard | 대시보드 전체 저장 ↓ | {"id": "exportBoard"} |  |
| select | interactionMode | interactionMode | {"id": "interactionMode"} | none=사용 안 함; cross=교차 필터; drill=드릴다운 |
| button | storageLoadNow | 저장소에서 불러오기 | {"id": "storageLoadNow"} |  |
| button | storageSaveNow | 지금 저장 | {"id": "storageSaveNow"} |  |
| input | storageAutoSave | storageAutoSave | {"id": "storageAutoSave", "type": "checkbox"} |  |
| input | storageAutoRestore | storageAutoRestore | {"id": "storageAutoRestore", "type": "checkbox"} |  |
| button | newStorageProfile | ＋ 새 연결 | {"id": "newStorageProfile", "disabled": "true"} |  |
| dialog | storageProfileDialog | storageProfileDialog | {"id": "storageProfileDialog", "aria-labelledby": "storageProfileDialogTitle"} |  |
| button | closeStorageProfile | 저장소 연결 닫기 | {"id": "closeStorageProfile", "type": "button", "aria-label": "저장소 연결 닫기"} |  |
| input | storageProfileId | storageProfileId | {"type": "hidden", "id": "storageProfileId"} |  |
| input | storageProfileName | 예: 업무용 OneDrive | {"id": "storageProfileName", "required": "true", "maxlength": "80", "placeholder": "예: 업무용 OneDrive"} |  |
| select | storageProvider | storageProvider | {"id": "storageProvider"} | local=로컬 폴더; google=Google Drive; onedrive=MS OneDrive; sqlite=SQLite DB; odbc=외부 DB (ODBC) |
| select | storageMode | storageMode | {"id": "storageMode"} | folder=PC 동기화 폴더; api=클라우드 API 토큰 |
| input | storagePath | D:\BI-Storage | {"id": "storagePath", "placeholder": "D:\\BI-Storage"} |  |
| input | storageFolder | root 또는 폴더 URL의 ID | {"id": "storageFolder", "placeholder": "root 또는 폴더 URL의 ID"} |  |
| input | storageRemote | insight-bi-workspace.json | {"id": "storageRemote", "placeholder": "insight-bi-workspace.json"} |  |
| select | storageDialect | storageDialect | {"id": "storageDialect"} | sqlserver=SQL Server; postgres=PostgreSQL; mysql=MySQL |
| input | storageKey | storageKey | {"id": "storageKey", "maxlength": "120"} |  |
| input | storageCredential | 서버 실행 중에만 사용 · 저장 파일에 미포함 | {"id": "storageCredential", "type": "password", "placeholder": "서버 실행 중에만 사용 · 저장 파일에 미포함"} |  |
| button | cancelStorageProfile | 취소 | {"id": "cancelStorageProfile", "type": "button"} |  |
| button | connectStorage | 연결 확인 및 저장 | {"id": "connectStorage", "type": "submit"} |  |
| dialog | connectionsDialog | connectionsDialog | {"id": "connectionsDialog", "aria-labelledby": "connectionsHeading"} |  |
| input | file | file | {"id": "file", "type": "file", "accept": ".xlsx,.xlsm,.csv,.tsv,.xls"} |  |
| button | closeConnections | 데이터 연결 닫기 | {"id": "closeConnections", "aria-label": "데이터 연결 닫기"} |  |
| button | 동적/ID 없음 | 연결 및 데이터 불러오기 → | {"type": "submit"} |  |
| dialog | dataLookupDialog | dataLookupDialog | {"id": "dataLookupDialog", "aria-labelledby": "lookupHeading"} |  |
| button | closeDataLookup | 데이터 조회 닫기 | {"id": "closeDataLookup", "aria-label": "데이터 조회 닫기"} |  |
| input | dataLookupSearch | 데이터 조회 검색 | {"id": "dataLookupSearch", "placeholder": "데이터 이름·시트·대시보드 검색", "aria-label": "데이터 조회 검색"} |  |
| dialog | deleteDataDialog | deleteDataDialog | {"id": "deleteDataDialog", "aria-labelledby": "deleteDataTitle"} |  |
| button | cancelDataDelete | 취소 | {"id": "cancelDataDelete"} |  |
| button | keepDataDashboards | 대시보드 유지 · 조회 전용 | {"id": "keepDataDashboards"} |  |
| button | confirmDataDelete | 데이터와 대시보드 삭제 | {"id": "confirmDataDelete"} |  |
| dialog | studioDialog | studioDialog | {"id": "studioDialog", "aria-labelledby": "studioTitle"} |  |
| input | chartEditName | 비워 두면 기본 제목 | {"id": "chartEditName", "maxlength": "100", "placeholder": "비워 두면 기본 제목"} |  |
| button | closeStudio | 차트 스튜디오 닫기 | {"id": "closeStudio", "aria-label": "차트 스튜디오 닫기"} |  |
| button | applySelected | 선택 차트에 적용 | {"id": "applySelected"} |  |
| button | pin | ＋ 새 차트 추가 | {"id": "pin"} |  |
| button | image | PNG 저장 ↓ | {"id": "image"} |  |
| select | dimension | dimension | {"id": "dimension"} |  |
| select | measure | measure | {"id": "measure"} |  |
| select | aggregate | aggregate | {"id": "aggregate"} | sum=합계; avg=평균; count=건수; min=최솟값; max=최댓값 |
| select | sort | sort | {"id": "sort"} | natural=기준순; desc=값 내림차순; asc=값 오름차순 |
| select | dateGrain | dateGrain | {"id": "dateGrain"} |  |
| select | extraMeasures | extraMeasures | {"id": "extraMeasures", "multiple": "true"} |  |
| select | splitBy | splitBy | {"id": "splitBy"} |  |
| select | drillDimension0 | drillDimension0 | {"id": "drillDimension0"} |  |
| select | drillDimension1 | drillDimension1 | {"id": "drillDimension1"} |  |
| select | drillDimension2 | drillDimension2 | {"id": "drillDimension2"} |  |
| select | drillDimension3 | drillDimension3 | {"id": "drillDimension3"} |  |
| dialog | kpiEditDialog | kpiEditDialog | {"id": "kpiEditDialog", "aria-labelledby": "kpiEditTitle"} |  |
| input | kpiEditName | 비워 두면 기본 제목 | {"id": "kpiEditName", "maxlength": "100", "placeholder": "비워 두면 기본 제목"} |  |
| select | kpiEditMetric | kpiEditMetric | {"id": "kpiEditMetric"} | rows=분석 대상; sum=합계; avg=평균; fields=데이터 필드 |
| select | kpiEditMeasure | kpiEditMeasure | {"id": "kpiEditMeasure"} |  |
| button | cancelKpiEdit | 취소 | {"type": "button", "id": "cancelKpiEdit"} |  |
| button | kpiSubmit | 이 카드에 적용 | {"type": "submit", "id": "kpiSubmit"} |  |
| dialog | relinkDashboardDialog | relinkDashboardDialog | {"id": "relinkDashboardDialog"} |  |
| select | relinkDashboardSource | relinkDashboardSource | {"id": "relinkDashboardSource", "required": "true"} |  |
| button | cancelRelinkDashboard | 취소 | {"id": "cancelRelinkDashboard", "type": "button"} |  |
| button | 동적/ID 없음 | 연결하여 열기 | {"type": "submit"} |  |
| dialog | createSourceLookupDialog | createSourceLookupDialog | {"id": "createSourceLookupDialog", "aria-labelledby": "createSourceLookupTitle"} |  |
| button | closeCreateSourceLookup | 연결 데이터 조회 닫기 | {"id": "closeCreateSourceLookup", "type": "button", "aria-label": "연결 데이터 조회 닫기"} |  |
| input | createSourceSearch | 연결 데이터 검색 | {"id": "createSourceSearch", "aria-label": "연결 데이터 검색", "placeholder": "데이터 이름·시트 검색"} |  |
| dialog | createDashboardDialog | createDashboardDialog | {"id": "createDashboardDialog"} |  |
| input | newDashboardName | 예: 월간 실적 | {"id": "newDashboardName", "required": "true", "maxlength": "60", "placeholder": "예: 월간 실적"} |  |
| input | newDashboardSource | newDashboardSource | {"id": "newDashboardSource", "type": "hidden"} |  |
| button | lookupNewDashboardSource | 연결 데이터 조회 | {"id": "lookupNewDashboardSource", "type": "button", "aria-label": "연결 데이터 조회"} |  |
| select | newDashboardTemplate | newDashboardTemplate | {"id": "newDashboardTemplate"} | basic1=기본1 · 종합 현황; basic2=기본2 · 추이·비교; basic3=기본3 · 분포·상세 |
| button | cancelCreateDashboard | 취소 | {"type": "button", "id": "cancelCreateDashboard"} |  |
| button | 동적/ID 없음 | 만들기 | {"type": "submit"} |  |
| dialog | manageDashboardDialog | manageDashboardDialog | {"id": "manageDashboardDialog"} |  |
| input | renameDashboardName | renameDashboardName | {"id": "renameDashboardName", "required": "true", "maxlength": "60"} |  |
| button | cancelManageDashboard | 취소 | {"id": "cancelManageDashboard", "type": "button"} |  |
| button | commitManageDashboard | 적용 | {"id": "commitManageDashboard", "type": "submit"} |  |
| dialog | dashboardDialog | dashboardDialog | {"id": "dashboardDialog"} |  |
| input | dashboardTitleInput | 예: 월간 영업 실적 | {"id": "dashboardTitleInput", "maxlength": "60", "required": "true", "placeholder": "예: 월간 영업 실적"} |  |
| textarea | dashboardDescriptionInput | 이 대시보드의 용도를 적어 주세요. | {"id": "dashboardDescriptionInput", "maxlength": "240", "placeholder": "이 대시보드의 용도를 적어 주세요."} |  |
| button | cancelDashboardSave | 취소 | {"type": "button", "id": "cancelDashboardSave"} |  |
| button | copyDashboard | 새 대시보드로 저장 | {"type": "submit", "id": "copyDashboard"} |  |
| button | updateDashboard | 현재 대시보드 업데이트 | {"type": "submit", "id": "updateDashboard"} |  |
| dialog | deleteDashboardDialog | deleteDashboardDialog | {"id": "deleteDashboardDialog"} |  |
| button | cancelDashboardDelete | 취소 | {"id": "cancelDashboardDelete"} |  |
| button | confirmDashboardDelete | 삭제 | {"id": "confirmDashboardDelete"} |  |
## apps/insight/data-detail.html

| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |
|---|---|---|---|---|
| button | closeDetail | 창 닫기 | {"id": "closeDetail"} |  |
| button | editData | 편집 | {"id": "editData"} |  |
| button | saveData | 저장 | {"id": "saveData"} |  |
| button | cancelData | 취소 | {"id": "cancelData"} |  |
| button | uploadCsv | CSV 업로드 ↑ | {"id": "uploadCsv"} |  |
| input | csvFile | csvFile | {"id": "csvFile", "type": "file", "accept": ".csv,text/csv"} |  |
| button | csvAll | 전체 CSV ↓ | {"id": "csvAll"} |  |
| button | csv | 필터 결과 CSV ↓ | {"id": "csv"} |  |
| input | search | 데이터 검색 | {"id": "search", "placeholder": "모든 열에서 검색…", "aria-label": "데이터 검색"} |  |
| select | filterColumn | filterColumn | {"id": "filterColumn"} |  |
| select | filterValue | filterValue | {"id": "filterValue"} |  |
| button | clear | 필터 초기화 | {"id": "clear"} |  |
| button | addRow | ＋ 행 추가 | {"id": "addRow"} |  |
| button | addColumn | ＋ 열 추가 | {"id": "addColumn"} |  |
| button | prev | ← 이전 | {"id": "prev"} |  |
| button | next | 다음 → | {"id": "next"} |  |
