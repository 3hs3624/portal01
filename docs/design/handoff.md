# Portal01 재구현 설계 패키지·인수인계

작성일: 2026-11-13(KST). 업무 구현 기준은 웹 `86bd308b` / 설치형 `f9bb1d93`입니다. 이 기준의 현재 구현을 문서화했으며 이번 작업에서 제품 동작·사용자 데이터·서버 schema를 바꾸지 않습니다.

## 읽는 순서와 납품 범위

1. [화면설계서](screen-design.md): SC별 진입·레이아웃·제어·상태·접근성·반응형·키보드/드래그·취소/재진입.
2. [기능설계서](functional-design.md): FN별 업무 규칙·알고리즘·입출력·권한·트랜잭션·실패/복원·검수.
3. [코드 정의서](code-definition.md): 공통 코드값·식별자·JSON 원형·JS/RPC/HTTP/메시지 계약·오류/한도·실행 계층.
4. [테이블정의서](table-definition.md): 도메인 관계·관계형 매핑·RLS/GRANT·trigger/CAS·백업·DDL 적용 순서.
5. 부록: [316개 화면 컨트롤](appendices/screen-controls.md), [70개 UI 모듈·39개 DB 함수·101개 블록 명령](appendices/code-catalog.md), [40개 테이블·223개 컬럼](appendices/table-columns.md), [기계 판독 계약/원문 SHA-256](appendices/contracts.json).
6. 앱별 세부 명세: common.md/write-studio.md/project-management.md/insight-bi.md/desktop.md와 ui-inventory를 위 계약의 규범 상세로 사용합니다.

Google Drive 게시본 네 문서에는 관련 규범 부록과 앱별 상세 설계를 함께 포함합니다. 저장소의 상대 링크는 해당 코드 기준의 GitHub 원전을 가리킵니다. Drive에서 공유 권한을 임의로 공개 전환하지 않습니다.

## 신규 개발 작업 순서

- 동일 동작을 목표로 하는 경우 SC/FN 계약과 원형 format/version/ID/배열 순서를 먼저 고정합니다. 새 프레임워크 선택은 가능하지만 데이터 계약·권한·계산·실패 흐름을 바꾸지 않습니다.
- 포털 인증/권한 셸→계정별 로컬 adapter→앱 핵심 모델→저장소 비교·CAS/백업→관계형 RPC→공유→설치형 경계 순으로 수직 시나리오를 구현합니다.
- WBS는 compute/leafCalc/agg와 Excel 원형 보존을 별도 검증합니다. BI는 데이터·대시보드 참조/열 mapping을 보드 화면보다 먼저 검증합니다. 문서는 Markdown/블록/DB를 단순 HTML로만 변환하지 않습니다.
- 저장소에 포함된 테스트는 신규 구현의 동등성 판정 기준으로 이식할 수 있습니다. 실제 계정/단말 검증은 별도하며 테스트 파일 존재가 통과 증거는 아닙니다.

## 실행·검증

웹은 /portal01/ 루트의 정적 HTML/CSS/JS와 동일 Origin iframe입니다. 앱 직접 URL만 열면 인증 가드가 차단합니다. 인증·권한·RPC를 갖춘 개발용 Supabase를 별도로 연결하거나 테스트의 가짜 인증 호스트를 사용합니다. 배포 키를 문서/소스에 새로 넣지 않습니다. 관리/관계형/공유 SQL은 테이블정의서 순서와 기존 설치 상태를 확인해 적용합니다.

```sh
python scripts/design_inventory.py --check
python scripts/spec_catalog.py --check
python tests/design_docs.py
python tests/spec_catalog.py
node tests/storage_models.cjs
node tests/storage_compare.cjs
python tests/storage_feedback.py
python tests/item_sharing_ui.py
python tests/write_studio_storage_flow.py
python tests/shared_storage_flow.py
python tests/projects_excel.py --format-fixture
python tests/sidebar_layout.py
```

Python UI 테스트에는 Playwright와 Chromium(/usr/bin/chromium 또는 테스트별 설정)이 필요합니다. 서버는 tests/write_studio_blocks.py의 로컬 정적 Handler를 사용합니다. work 디렉터리에 검증 이미지/임시 데이터가 만들어질 수 있으며 운영 사용자 자료를 넣지 않습니다.

SQL 테스트는 `@electric-sql/pglite`를 사용합니다. 예:

```sh
PGLITE_MODULE=../work/sql-check/node_modules/@electric-sql/pglite/dist/index.js node tests/content_relational_sql.mjs
PGLITE_MODULE=../work/sql-check/node_modules/@electric-sql/pglite/dist/index.js node tests/project_relational_sql.mjs
PGLITE_MODULE=../work/sql-check/node_modules/@electric-sql/pglite/dist/index.js node tests/item_sharing_sql.mjs
```

설치형 소스는 desktop-preview/desktop에서 확인합니다. `npm --prefix desktop ci`, `npm --prefix desktop test`, `npm --prefix desktop run stage`, `npm --prefix desktop run pack -- --publish never`가 개발판 패키지 경로입니다. Ubuntu/Windows/Mac Intel/ARM은 각 OS에서 빌드합니다. 현재 개발판은 서명/공증/자동 업데이트·전체 네이티브 파일/SQLite·WBS 창 전환을 완료한 제품이 아닙니다.

## 변경·추적·검증 경계

화면 ID→기능 ID→원형/API→테이블→테스트를 네 설계서 표로 추적합니다. 제어/enum은 생성 부록, 업무 흐름/오류/권한은 수동 명세가 책임집니다. 코드가 바뀌면 두 종류 모두 같은 커밋에서 갱신합니다. `spec_catalog.py --check`는 SQL·주요 런타임 SHA·제어/함수/명령 불일치를 잡지만 설명의 의미적 정확성을 자동 보증하지 않습니다.

이번 문서 작업의 검증은 소스 추출 정확성, 참조/링크, 정의서 완전성 규칙, 기존 문서 검증입니다. 운영 DB schema 실측·운영 계정 삭제/메일/부하/모든 OS 실단말 테스트는 수행하지 않습니다. 후속 계획을 현재 구현으로 적지 않습니다.
