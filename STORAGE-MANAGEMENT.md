# 세 앱 공통 저장소 관리

`storage-flow.js`는 저장소 선택 → 현재 작업/저장본 비교 → 검토 → 양쪽 백업 → 적용 화면과 보호 규칙을 담당합니다. `cloud-ui.js`는 공통 진입점입니다. 스타일은 `storage-flow.css`를 공유합니다.

앱 어댑터는 기존 파일 형식 그대로 capture/validate/restore, 변경 감지, 비교·병합을 제공합니다.

| 앱 | 어댑터 | 보관 단위 | 형식 |
| --- | --- | --- | --- |
| Write Studio | apps/markdown/storage-flow.js | 문서 | md-editor-workspace |
| Insight BI | storage-adapters.js / storage-models.js | 대시보드·연결 데이터 묶음 | insight-bi-workspace |
| Project Management | storage-adapters.js / PortalWorkspaceAdapter | 프로젝트와 관련 파일 전체 | wbs-pm-cloud |

## 저장과 복구

- 브라우저의 작업 저장과 외부 저장소 반영은 구분합니다. 외부 전송은 사용자가 저장소에 반영을 실행할 때만 합니다.
- Write Studio와 Insight BI는 브라우저 자동저장을 사용합니다. Insight BI는 빈 브라우저 저장소에서도 최초 변경부터 자동저장을 준비합니다. 기존 사용자의 자동저장 설정은 유지합니다.
- 프로젝트 저장소 반영은 열린 대시보드 변경도 함께 처리합니다. 검토 단계는 파일을 쓰지 않고 미저장 작업을 포함한 스냅샷을 구성합니다. 적용 시 먼저 현재 작업과 대상 저장본을 백업하고, 대시보드를 네이티브 프로젝트 저장 이력으로 저장한 뒤 최신 파일 묶음을 외부에 반영합니다. 네이티브 저장의 충돌을 강제 무시하지 않습니다. 외부 전송 실패 시 이미 완료된 프로젝트 저장 이력은 유지됩니다.
- 전체 프로젝트 불러오기·합치기는 열린 프로젝트 창이 있으면 쓰기 전에 중단합니다. BI도 데이터 상세 창이 열려 있으면 복원을 중단합니다.
- 비교는 생성일 우선 덮어쓰기가 아닙니다. 문서/프로젝트 ID 및 실제 내용으로 충돌을 감지하고, 최근 수정일은 추천에만 사용합니다. 불명확한 충돌은 둘 다 보관이 기본입니다.
- BI는 연결 관계를 깨는 행 단위 자동 병합을 하지 않습니다. 둘 다 보관하면 저장본의 데이터·대시보드를 새 ID로 복사하고 dataSource, originId, saved-dashboard links를 함께 변경합니다. 업무 데이터의 셀 값은 바꾸지 않습니다. 비교 미리보기는 데이터별 최대 50행입니다.
- 프로젝트 둘 다 보관은 새 프로젝트 ID로 관련 메타·현재본·스냅샷·엑셀 파일을 함께 복사합니다. 바이너리 내용은 그대로 유지합니다. 저장소 정보/삭제 보관함 충돌본은 별도 archive 경로에 보관합니다.

## 공통 보호 규칙

현재 작업 generation과 내용 fingerprint, 외부 저장본 revision과 payload를 적용 전에 확인합니다. 폴더 쓰기는 기존 expected revision/payload 계약을 사용합니다. 백업 실패 시 교체하지 않습니다. 클라우드 저장은 기존 인증·계정·앱별 RPC 권한을 사용하며 스키마나 권한을 바꾸지 않습니다.

계정별 IndexedDB에 최근 10개 백업을 보관하고, 수동 백업·목록 복구·JSON 다운로드·JSON 가져오기를 지원합니다. Write Studio 기존 `studio-storage-backups`와 선택 위치를 유지하며, 다른 두 앱은 `portal-storage-backups-<app>`를 사용합니다. 이전 `portal-cloud-recovery`의 앱별 복구본도 최초 목록 열기에서 가져옵니다. 백업은 같은 브라우저에 있으므로 별도 JSON 다운로드가 기기 손실에 대비하는 수단입니다.

기존 작업공간 JSON, 폴더 경로, 클라우드 app 키는 바꾸지 않습니다. 프로젝트의 기존 WBS-PM 폴더 연결과 개별 저장 이력도 유지됩니다. OneDrive/Google Drive는 PC 동기화 폴더이며 동기화 완료는 PC 앱에서 확인합니다.

## 검증

- `node tests/storage_models.cjs`: 프로젝트 파일 묶음/엑셀 보존, BI 참조 복사, 셀 값 불변, 저장 시각 제외 비교.
- `python tests/shared_storage_flow.py`: 최초 BI 자동저장, 양쪽 백업, 실제 열려 있는 프로젝트 변경 반영, 창 열림 차단, 충돌 감지, JSON 및 모바일 화면.
- 기존 Write Studio 저장소·자동저장, 폴더 충돌, 두 앱 UI, 클라우드 크기/인증 계약 회귀 검증.
