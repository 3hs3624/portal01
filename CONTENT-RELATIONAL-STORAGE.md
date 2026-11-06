# Write Studio · Insight BI 관계형 저장

Supabase를 선택했을 때 두 앱도 관계형 저장을 사용합니다. 이전에 적용한 Project Management와 함께 세 앱의 클라우드 저장이 관계형 테이블 + 유동적인 본문/설정 데이터의 혼합 구조가 됩니다. 브라우저 자동저장과 로컬·OneDrive·Google Drive 폴더의 JSON 저장은 기존 방식을 유지합니다.

## 데이터 구성

Write Studio는 `portal_ws_folders`, `portal_ws_documents`, `portal_ws_tags`, `portal_ws_comments`로 폴더·문서·태그·댓글을 분리합니다. 문서 제목·본문·폴더 연결·생성/수정 시각을 컬럼으로 조회할 수 있습니다. 본문은 원래 Markdown/블록 문자열이며 본문에 포함된 데이터베이스 블록도 그대로 보존합니다. 본문 내부의 각 데이터베이스 셀까지 별도 SQL 행으로 분리하는 단계는 포함하지 않습니다. 추가 문서 속성은 JSONB로 보관합니다.

Insight BI는 `portal_bi_dashboards`, `portal_bi_cards`, `portal_bi_sources`, `portal_bi_sheets`, `portal_bi_columns`, `portal_bi_rows`, `portal_bi_links`로 구성합니다. 대시보드·카드·소스·시트·열·행·연결을 각각 행으로 저장하며, 데이터 행의 값 배열과 차트 설정·보관 대시보드 설정은 JSONB를 사용합니다. 동적으로 다른 컬럼을 갖는 데이터 소스에도 DDL을 새로 만들지 않습니다.

공통 `portal_content_workspaces`가 계정·앱별 버전과 루트 설정을, `portal_content_backups`가 교체 전 서버 저장본을 최근 10개씩 보관합니다. 문서·폴더·댓글·카드·소스·데이터 열/행의 배열 순서와 식별자, 연결 관계를 유지합니다. 외부 파일 링크는 링크로 유지하며 임의로 다운로드하지 않습니다.

## 저장과 이전

- `content-cloud.js`가 기존 Supabase SDK를 통해 새 RPC를 호출합니다. 포털의 인증·앱 권한을 그대로 사용하고 전송 전후 계정 변경을 확인합니다.
- 저장소 반영은 현재 작업공간 단위의 트랜잭션입니다. 항목별 실시간 동기화 API는 별도 단계입니다. 브라우저 자동저장이 외부 클라우드 자동 전송으로 바뀌지는 않습니다.
- 새 저장본이 없으면 기존 `portal_workspaces` JSON을 읽습니다. 다음 명시적 Supabase 반영 때 관계형 저장으로 전환하며 원래 JSON은 삭제하지 않습니다.
- 관계형 저장 후 이전 클라이언트가 JSON을 덮어쓰려고 하면 충돌로 중단합니다. 다른 기기의 저장 버전이 바뀌어도 자동 덮어쓰지 않습니다.
- 불러오기·JSON 백업은 기존 `md-editor-workspace`, `insight-bi-workspace` 형식입니다. 기존 비교·병합·양쪽 백업·복구 UI를 사용합니다.
- JSONB가 객체 키 순서를 바꾸는 것은 실제 내용 변경으로 판단하지 않습니다. 문서 비교와 저장본 fingerprint를 키 순서에 무관하게 처리합니다.

## 권한과 정합성

모든 테이블에서 RLS를 사용하고 계정 소유권 + 기존 앱의 읽기/쓰기 권한을 함께 확인합니다. 함수는 SECURITY INVOKER이며 익명 실행을 허용하지 않습니다. 문서/폴더 연결 및 BI 하위 데이터는 복합 FK로 계정을 구분합니다. 사용자 삭제 시 관련 행과 서버 백업도 정리됩니다.

버전 확인·이전 저장본 백업·관계형 행 교체는 한 트랜잭션입니다. 잘못된 폴더 순환·부모/활성 문서·데이터 행 구조·크기 오류가 나면 전체 롤백합니다. 직접 컬럼을 수정해도 저장 버전이 변경되며, 문서 폴더 연결을 비우거나 날짜 속성을 비우는 수정이 예전 JSON 속성에 가려지지 않도록 동기화합니다.

## 배포와 검증

실제 Supabase 마이그레이션은 `20261106060914_content_relational_storage`이며 `portal-content-relational.sql`과 동일합니다. 새 환경은 기본 포털 권한/저장소 → 프로젝트 관계형 SQL 및 정합성 SQL → 이 SQL 순서로 구성합니다. CLI를 사용할 수 없는 실행 환경이므로 원격 MCP에서 만든 실제 버전의 마이그레이션을 저장소에 그대로 보관합니다.

SQL 테스트에는 `@electric-sql/pglite`가 필요하며 `PGLITE_MODULE`로 설치 모듈 경로를 지정할 수 있습니다.

- `node tests/content_cloud.cjs`: 새 앱별 전송 경로, 기존 JSON 읽기, CAS, 계정 변경/인증 차단, JSONB 객체 키 순서 비교.
- `node tests/content_relational_sql.mjs`: 실제 PostgreSQL 엔진에서 두 앱의 원형 왕복, 관계형 조회/수정, 10,000행, 폴더 순환·행 구조 오류 롤백, 계정·권한 격리, 서버 백업 10개, 이전 JSON 전환, 사용자 삭제 FK.
- 실제 Supabase에서도 검증 계정 두 개를 트랜잭션 안에서 사용해 저장·복원·관계형 분리·CAS·계정 격리·익명 차단을 확인한 뒤 전체 롤백했습니다.
- `python tests/content_relational_ui.py`: 실제 문서/BI 화면에서 저장·반복 저장·로컬 변경·클라우드 복원·원본 JSON 백업.
- 기존 세 앱 저장소·포털 로그인·프로젝트 관계형 저장 회귀 검증.

보안 advisor에서 이번 테이블/함수에 대한 신규 경고는 없었습니다. 기존 포털 관리 함수와 Auth 설정 경고는 유지됩니다.
