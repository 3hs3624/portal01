# PTL-02 자동저장과 저장소 연결 명세 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 식별과 상태

명세 ID: PTL-02. 버전1.0. 기존 구현의 문서화 초안이며 사용자 승인일은 미기재입니다. 아래 인수 시나리오는 검수 기준입니다. 테스트 파일의 존재와 이번 문서 검토는 해당 시나리오 실행 성공을 뜻하지 않습니다.

## 목적

작업 사본 저장과 외부 저장 반영을 명확히 구분합니다.

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
| PTL-02-AT01 저장 성공 | 개인 문서에 변경이 있고 작업 사본 쓰기가 가능하다 | 자동저장 트랜잭션이 성공한다 | 작업 사본 완료로 표시하고 외부 미반영 상태는 별도 유지한다 |
| PTL-02-AT02 저장 실패 | dirty 입력이 있고 IndexedDB 쓰기가 실패한다 | 저장 결과를 처리한다 | 입력과 dirty를 유지하고 실패/재시도 상태를 표시한다 |
| PTL-02-AT03 이전 응답 | generation N을 저장하는 동안 N+1 변경이 있다 | N 성공 응답을 받는다 | N+1까지 저장 완료로 표시하지 않는다 |
| PTL-02-AT04 폴더 선택 취소 | 현재 작업이 있다 | 폴더 선택을 취소한다 | 기존 데이터를 이동하거나 지우지 않는다 |

## 결정과 검증 기록

2026-11-18: REA 형식에 맞춰 Portal 자체 명세로 추출했습니다. 현재 구현과 계획의 차이는 작업 기록과 검토 결과에 남깁니다. 사용자 승인과 실행 결과는 이후 날짜별로 추가합니다.

## 구현 상세 원문

아래 내용은 기존 Portal 설계에서 추출한 상세입니다. 표의 필드·동작·보존·오류를 생략하지 않았으며 문서 내 원래 상대 참조의 원본은 근거 파일에서 확인할 수 있습니다.

#### FN-C01 작업 사본 자동저장과 상태

화면 SC-C01/W02/B03. WS는 초안 저장(약400ms)과 작업공간 저장(약1600ms), BI는 약900ms debounce를 사용합니다. PM 가상 파일은 쓰기 종료 시 IndexedDB 트랜잭션으로 보관합니다. 성공은 실제 commit 후 표시합니다. 저장 응답의 작업 generation보다 새 변경이 있으면 저장 대기 상태를 유지합니다. 상태는 준비/대기/진행/성공/실패, 외부는 미확인/첫 저장 필요/반영 대기/완료/실패입니다.

실패 시 dirty를 지우지 않고 입력/초안을 유지합니다. WS의 이전 recovery.pending 초안은 복구 안내와 기존 비교 흐름으로 연결합니다. Shared session에서는 브라우저 사본 저장을 클라우드 공유 성공으로 대신 표시하지 않고 공유 commit 결과를 사용합니다.

검수: IndexedDB abort·용량 부족·잘못된 revision은 실패 표시, 이전 응답이 새 변경을 완료 처리하지 않음. 근거: storage-status.js, pages-runtime.js, cloud-files.js, apps/* storage 모듈; storage_feedback.py.

#### FN-C02 저장 위치 선택·연결·불러오기

입력 provider/name/폴더 handle 또는 클라우드 로그인. 선택과 연결은 데이터 이동과 분리합니다. info→필요 시 load→원형 validate→현재/대상 summary를 표시합니다. folder 권한은 사용자 동작에서 요청하며 취소는 AbortError 안내로 끝냅니다. OneDrive/Google Drive는 PC 동기화 폴더이며 서비스 API 실시간 동기화로 해석하지 않습니다.

불러오기 확인에는 원형, 현재 generation/fingerprint, provider, target revision/workspace를 고정합니다. 적용 직전에 다시 읽어 같은 버전/내용인지 검사합니다. 현재 작업 변경·대상 변경·계정 변경·열린 WBS 창/데이터 상세 미저장 등 앱별 beforeApply 제약이 있으면 중단합니다.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/functional-design.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/functional-design.md)
- [storage-status.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/storage-status.js)
- [storage-flow.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/storage-flow.js)
- [tests/storage_feedback.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/storage_feedback.py)
- [tests/write_studio_storage_flow.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/write_studio_storage_flow.py)
