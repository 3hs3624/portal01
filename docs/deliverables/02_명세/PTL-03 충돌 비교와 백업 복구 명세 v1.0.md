# PTL-03 충돌 비교와 백업 복구 명세 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 식별과 상태

명세 ID: PTL-03. 버전1.0. 기존 구현의 문서화 초안이며 사용자 승인일은 미기재입니다. 아래 인수 시나리오는 검수 기준입니다. 테스트 파일의 존재와 이번 문서 검토는 해당 시나리오 실행 성공을 뜻하지 않습니다.

## 목적

충돌을 날짜만으로 덮어쓰지 않고 두 사본을 보호한 뒤 적용합니다.

## 용어

작업 사본은 현재 환경의 개인 저장본, 외부본은 선택한 폴더/클라우드의 저장본, 공유본은 항목별 별도 공유 작업공간입니다. revision/generation은 덮어쓰기 유효성 검사에 사용하며 수정 시각과 다릅니다. 자세한 원형은 기존 코드/테이블정의서를 따릅니다.

## 업무 규칙과 상태·권한

앱 접근과 항목 권한을 함께 검사합니다. 권한 제한은 서버에서도 강제합니다. 저장소 선택은 데이터 이동과 다르고, 성공/실패/불명확/미검증은 서로 바꿔 쓰지 않습니다. 이 명세에 포함한 구현 상세의 규칙, 기본값, 상한, 키보드와 실패 경계가 규범입니다.

## 화면 요구와 예외

로딩/빈 결과/취소/권한 없음/실패 상태를 표시하고 기존 작업을 보존합니다. 패널 폭, hover 핸들, 선택/입력 확정, 드래그 미리보기와 취소, 보기 전환, 재진입 옵션은 화면설계 및 아래 상세를 따릅니다. UI를 새로 그리더라도 동일한 동작·저장 계약을 유지합니다.

## 비기능과 범위 밖

UI 비활성만으로 인가를 대신하지 않습니다. 계정별 데이터를 분리합니다. 실제 OS/운영 계정/Excel 재계산/부하 검증은 별도 증거를 요구합니다. 이 문서는 REA의 동일 번호 CORE 기능이나 해당 프로젝트의 승인 상태를 가져오지 않습니다. 상세의 후속 항목은 현재 구현이 아닙니다.

## 부록: 인수 시나리오

| ID와 시나리오 | Given | When | Then |
|---|---|---|---|
| PTL-03-AT01 양쪽 보관 | 현재와 저장본의 동일 항목이 모두 변경됐다 | 둘 다 보관을 선택한다 | 앱별 ID/참조를 재매핑하고 두 자료를 유지한다 |
| PTL-03-AT02 적용 전 변경 | 비교 후 현재 generation 또는 외부 revision이 바뀐다 | 적용한다 | 오래된 비교로 덮어쓰지 않고 재비교를 요구한다 |
| PTL-03-AT03 백업 실패 | 교체 전에 한쪽 백업이 실패한다 | 불러오기를 확정한다 | 교체를 중단하고 기존 작업을 유지한다 |
| PTL-03-AT04 전체 복원 | BI 복구본에 소스/보드/링크가 있다 | 복원한다 | 연결 참조를 함께 복원한다. 새 환경 외부 복구 시험은 E02로 별도 수행한다 |

## 결정과 검증 기록

2026-11-18: REA 형식에 맞춰 Portal 자체 명세로 추출했습니다. 현재 구현과 계획의 차이는 작업 기록과 검토 결과에 남깁니다. 사용자 승인과 실행 결과는 이후 날짜별로 추가합니다.

## 구현 상세 원문

아래 내용은 기존 Portal 설계에서 추출한 상세입니다. 표의 필드·동작·보존·오류를 생략하지 않았으며 문서 내 원래 상대 참조의 원본은 근거 파일에서 확인할 수 있습니다.

#### FN-C03 비교·추천·병합

항목 상태는 동일(same), 현재만(current), 저장본만(remote), 충돌(conflict)입니다. 동일 여부는 JSONB 객체 키 순서에 영향받지 않는 canonical signature로 판단하되 배열 순서는 보존합니다. 현재/저장본의 수정일을 모두 유효하게 파싱하고 다르면 최근 쪽 추천, 같거나 불명확하면 both입니다. 생성일은 작성 시작 시점/정렬 기준이고 충돌 덮어쓰기 우선권이 아닙니다.

- WS: 문서/폴더별 비교·보관 선택, 복사 시 문서 ID/폴더 관계/활성 ID 정합성을 유지합니다.
- PM: 프로젝트별 파일 집합 비교. both이면 새 프로젝트 ID로 경로와 JSON 내부 projectId/id/이름을 바꾸고, 저장소 정보는 별도 storage-archive 아래 보관합니다. 바이너리 파일은 byte-preserve합니다.
- BI: 연결된 전체 작업공간 한 묶음으로 비교. both이면 저장본의 source/dashboard/origin ID·links·retainedDashboards 참조를 함께 재매핑합니다. 시트만 분리하여 깨진 연결을 만들지 않습니다.

검수: timestamp 같음/없음, JSON 키 순서 변화, 같은 제목 다른 ID, 폴더 순환, 프로젝트 경로 충돌, BI 참조 보존. 근거: storage-models.js, markdown/storage-compare.js, storage_compare.cjs/storage_models.cjs.

#### FN-C04 백업 후 적용·실패 복구

현재 작업→capture/validate→비교 토큰 확인→target 최신 확인→양쪽 백업→다시 generation 확인→쓰기/CAS 또는 로컬 복원 순서입니다. 서버 저장 성공 후 현재 화면 복원만 실패하면 partialSave를 표시하고 양쪽 백업을 안내합니다. 중간에 변경된 현재 화면을 과거 snapshot으로 교체하지 않습니다.

브라우저 백업 DB는 앱별 snapshots store, 최신 10개 보관입니다. 수동 백업/JSON 가져오기/내려받기/내용 비교·복원을 지원합니다. imported JSON도 검증 후 별도 백업 항목으로 저장합니다. 복원 자체는 외부 저장소를 덮어쓰지 않습니다. 공유 서버 이전 버전 3개, 관계형 서버 백업 10개와 이 브라우저 백업 10개는 별개입니다.

#### FN-C05 관계형 클라우드·이전 JSON 호환

포털 SDK 경계에서 전후 getUser로 계정을 확인합니다. PM은 `portal_project_workspace_*`, WS/BI는 `portal_content_workspace_*` RPC를 사용합니다. 관계형 헤드가 없으면 portal_workspaces의 legacy-json을 읽고, 사용자가 명시적으로 저장할 때 새 구조로 전환합니다. 과거 JSON을 자동 삭제하지 않습니다. 전환 후 구 클라이언트 덮어쓰기는 guard로 차단합니다.

서버는 계정+앱 read/write, size/형식/참조 검증, advisory lock+행 잠금, expected revision CAS, 이전본 백업, bulk flag 하에서 하위 데이터 교체, 새 revision 응답을 한 트랜잭션으로 처리합니다. 실패하면 전부 롤백합니다. 직접 관계형 컬럼을 수정해도 touch trigger가 revision을 갱신하며 알려진 속성은 properties의 옛 값에 가려지지 않습니다.

#### FN-C06 공유 생성·부여·해제

공유 단위는 WS 1문서(다른 폴더/문서 제외), PM 1프로젝트(meta/current/history/Excel), BI 1대시보드+연결 시트입니다. 개인 원본과 공유 작업공간은 별도입니다. ensure는 owner/app/source_key별 중복을 방지하고 최초 원형을 생성합니다. 기존 공유본이 있으면 개인 최신본으로 자동 재동기화하지 않습니다.

등록·확인·활성·앱 read 권한이 있는 수신자 검색, view/edit 선택, 선택 사용자 순차 grant를 수행합니다. edit 부여에는 수신자 write도 필요합니다. 소유자만 members/grant/revoke를 수행합니다. 부분 실패 시 적용 완료 수를 표시하고 미처리 선택은 유지합니다. 원본 삭제 후에도 소유자 목록에서 관리합니다.

#### FN-C07 공유 저장·권한 변경·충돌

get으로 서버 인가한 뒤 shared-item 안에 실제 앱을 로드합니다. get의 canEdit는 owner/edit와 앱 write의 교집합입니다. UI·저장 adapter를 모두 잠그며 서버에서도 매 요청 검사합니다. save는 현재 revision을 포함하고 mismatch PT409이면 자동 재시도/덮어쓰기를 하지 않습니다. 공유 크기 25MiB/항목, 소유자 현재본 합 100MiB이며 이전 3개 버전을 별도 보관합니다.

15초 주기로 get: canEdit 변경은 즉시 UI 재적용, 새 revision은 최신본 안내, 일시 네트워크 오류는 프레임 보존, 명시 권한 회수/로그인 변경은 프레임 제거입니다. 동시 타이핑 CRDT/자동 병합·수신자 알림 메일은 현재 사양이 아닙니다. 검수: item_sharing_ui.py/item_sharing_sql.mjs.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/functional-design.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/functional-design.md)
- [apps/markdown/storage-compare.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/apps/markdown/storage-compare.js)
- [storage-flow.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/storage-flow.js)
- [tests/storage_compare.cjs](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/storage_compare.cjs)
- [tests/folder_storage_conflicts.cjs](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/folder_storage_conflicts.cjs)
- [tests/shared_storage_flow.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/shared_storage_flow.py)
