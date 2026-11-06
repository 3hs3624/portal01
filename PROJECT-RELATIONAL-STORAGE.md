# Project Management 관계형 클라우드 저장

Supabase 저장소만 관계형 테이블 + JSONB + 비공개 Storage 방식으로 전환합니다. 브라우저 작업 사본과 기존 WBS-PM 로컬 폴더, OneDrive/Google Drive 동기화 폴더는 기존 JSON·엑셀 형식을 그대로 사용합니다. 공통 저장소 선택·비교·백업·복구 화면도 유지합니다.

## 구성

- `portal_pm_workspaces`: 계정별 저장 버전·저장 시각·디렉터리 구성.
- `portal_pm_projects`: 프로젝트 이름·발주처·PM/PL·시작/종료일 및 확장 속성.
- `portal_pm_phases`, `portal_pm_activities`, `portal_pm_tasks`: 단계 → 활동 → 작업 관계와 표시 순서. 작업의 계획/실적 날짜·진척률·그룹·담당자를 조회 가능한 컬럼으로 저장합니다. 원본 식별자 중복도 순서 키로 구분해 보존합니다.
- `portal_pm_calendar`: 휴일·마일스톤의 날짜·명칭·확장 속성.
- `portal_pm_versions`: 기존 프로젝트 저장 이력의 이름·작성자·시각과 당시 상태(JSONB).
- `portal_pm_files`: 기존 파일 경로와 JSON 문서/첨부파일 참조. 현재 WBS 트리는 단계·활동·작업 테이블에서 재구성합니다.
- `portal_pm_backups`: 교체 직전 클라우드 상태를 계정별 최근 10개 보관합니다. 기존 브라우저 백업 목록과 별개의 서버 복구 자료입니다.
- 비공개 `portal-project-assets` 버킷: 엑셀 파일과 `excelTemplate.data` 원본 바이트. 계정 UUID/내용 SHA-256 경로로 중복 저장을 줄이고, 덮어쓰지 않습니다.

유동적인 설정·추가 속성·과거 저장 이력은 JSONB로 유지합니다. 현재 WBS 전체를 JSONB 한 칸에 두고 검색용 컬럼만 복사하는 방식은 아닙니다. 관계형 작업 컬럼을 수정하면 불러온 WBS에도 반영되고 저장 버전이 변경됩니다. 원본 속성은 확장 JSONB에 보존합니다.

## 저장·불러오기

1. 로컬 작업은 기존 방식으로 작성합니다. 외부 전송은 공통 화면에서 사용자가 적용할 때 실행합니다.
2. `project-cloud.js`가 네이티브 작업공간 파일을 변환하고, 첨부파일을 먼저 비공개 Storage에 올립니다. 같은 내용은 한 번만 전송하며, 기존 객체도 해시·크기를 검증합니다.
3. `portal_project_workspace_save`가 한 트랜잭션에서 버전을 확인하고 백업·관계형 데이터 교체를 실행합니다. 실패하면 데이터베이스 변경은 롤백합니다. 전송 중 계정이 바뀌면 저장·복원을 중단합니다.
4. 불러오기는 관계형 행에서 네이티브 JSON 파일을 재구성하고 첨부파일을 검증해 원래 바이트로 복원합니다. 기존 로컬 파일 저장·JSON 백업·엑셀 수식/서식 보존 기능을 이어서 사용할 수 있습니다.

현재 단계에서는 저장소 반영 단위가 작업공간 전체입니다. 데이터는 관계형 행으로 저장하지만 항목별 실시간 동기화/충돌 병합 API까지 제공하지는 않습니다.

## 기존 데이터와 배포

기존 `portal_workspaces`의 프로젝트 JSON은 삭제하지 않습니다. 새 관계형 저장본이 없으면 기존 JSON을 읽고, 사용자가 다음 Supabase 저장을 적용할 때 전환합니다. 관계형 저장 후 오래된 클라이언트가 기존 JSON을 덮어쓰려고 하면 버전 충돌로 차단합니다. 다른 두 앱의 JSON 저장은 유지합니다.

실제 Supabase 마이그레이션 버전은 `20261106050419_project_relational_storage`입니다. `portal-projects-relational.sql`은 해당 배포 SQL의 검토용 사본이며 `supabase/migrations/`의 동일 버전과 일치합니다. 기존 프로젝트가 없는 환경에도 같은 구조를 적용합니다. 추가 정합성·권한 평가 최적화는 `portal-projects-consistency.sql`로 적용했습니다. 새 환경은 기본 포털 권한 설정 → 관계형 저장소 SQL → 정합성 SQL 순서로 구성합니다.

`portal-project-assets` Edge Function은 Auth getUser와 기존 프로젝트 쓰기 권한을 확인한 뒤 고정된 비공개 버킷을 Storage API로 준비합니다. 실제 객체 전송은 사용자 JWT와 RLS로 수행합니다. 버킷은 첫 첨부파일 저장 때 생성됩니다. 서비스 키는 함수 환경에만 있으며 브라우저에 전달하지 않습니다. 이미 공개로 설정된 동명 버킷이 있으면 저장을 중단합니다.

모든 새 테이블은 계정 소유권 + 기존 포털 앱 권한으로 RLS를 적용하고, 함수는 SECURITY INVOKER를 사용합니다. 사용자 삭제 시 관계형 행은 FK로 삭제되며 객체는 기존 계정 삭제의 Storage 정리 대상입니다. 복구 자료가 참조하는 파일을 잃지 않도록 업로드 객체를 자동 삭제하지 않습니다. 실패한 업로드 후 남은 미참조 객체는 추후 참조 검사 기반으로 정리할 수 있습니다.

## 검증

SQL 검증은 `@electric-sql/pglite` 설치가 필요하며 `PGLITE_MODULE`로 설치 모듈 경로를 지정할 수 있습니다.

- `node tests/project_relational_sql.mjs`: 실제 PostgreSQL 엔진(PGlite)에서 원본 WBS 왕복, typed 컬럼 수정·버전 변경, 계정/읽기 전용/비활성/익명 접근, CAS, 실패 롤백, 기존 JSON 전환, 서버 백업 10개.
- 실제 Supabase에서도 트랜잭션 내 검증 계정으로 저장·조회·컬럼 수정·CAS·계정 격리·익명 차단을 실행하고 전체 검증 데이터를 롤백했습니다.
- `node tests/project_cloud.cjs`: 엑셀/템플릿 바이트 보존, 중복 제거, JSON 직렬화 차이 허용, 파일 무결성·경로·세션·업로드 실패.
- `node tests/project_assets_handler.mjs`: 함수 인증·프로젝트 권한·CORS·비공개 버킷·비밀키 비노출.
- `python tests/project_relational_ui.py`: 실제 프로젝트 화면 → 관계형 클라이언트 → 비공개 파일 전송 → 반복 저장 → 네이티브 복원/JSON 백업.
- 기존 공통 저장소·자동저장·클라우드 용량/권한 회귀 검증.

프로덕션 보안 advisor 검사에서 새 프로젝트 테이블/함수에 대한 신규 경고는 없었습니다. 기존 포털 관리 함수·Auth 설정에 대한 기존 경고는 이번 변경 범위 밖입니다.
