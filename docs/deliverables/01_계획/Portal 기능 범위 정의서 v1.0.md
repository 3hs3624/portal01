# Portal 기능 범위 정의서 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 분류 기준

현재 구현 기준과 후속 개선을 구분합니다. PTL은 이번에 부여한 문서 식별자로 새 서버 권한 코드나 DB enum이 아닙니다. 모든 정적 입력/버튼은 기존 화면설계서와 제어 부록, 데이터 구조는 코드/테이블정의서가 규범 상세입니다. 이 요약을 사용해 기존 세부 기능을 생략하지 않습니다.

| ID | 영역 | 현재 범위 | 문서/검증 기준 | 후속 |
|---|---|---|---|---|
| PTL-01 | 인증과 계정/역할 | 이메일 OTP, 앱 read/write, 사용자/그룹/역할, 초대/삭제/로그 | 기능설계 FN-A01~A03, 서버 RPC/Edge | 운영 계정 전수 검수 별도 |
| PTL-02 | 작업 사본과 저장소 | 자동저장, 상태, 브라우저/폴더/클라우드 연결 | FN-C01~C02, storage_feedback | 외부 자동 백업 정책 E02 |
| PTL-03 | 충돌과 복구 | generation/revision 비교, 양쪽 백업, 병합/복원 | FN-C03 이후, storage_compare | 새 환경 외부 복원 E02 |
| PTL-04 | 공유 | 등록 사용자 선택, view/edit, 소유자 권한 관리/회수, 공유 세션 | item-sharing RPC/SQL/UI | 소유자 버전복원 동선 E03 |
| PTL-05 | Write Studio | 문서/폴더, Markdown/분할/문서, 블록, 일반표/DB, 페이지/댓글, 검색/추천/옵션 | 앱 전체 설계와 101명령 부록 | 삭제복구/키보드 E06 |
| PTL-06 | Project Management | 목록/등록, WBS/간트, 계산/지연, sample/빈WBS, 이력/비교, Excel 보존 | PM 전체 설계, projects_excel | Excel 의미/실OS 왕복 E05 |
| PTL-07 | Insight BI | 파일/시트, 편집 상세창, 분석/필터/차트/카드/대시보드, 조회 보관/공유 | BI 전체 설계, 상세 메시지 계약 | 교체 사전비교/성능 E07 |
| PTL-08 | 설치형과 릴리스 | Electron 개발판, 경로/탐색 보호, 4대상 smoke/packaging, 회귀 관문 코드 | 설치형 설계와 E01 실행 근거 | 업무 수직 E04, SQLite E08, 서명 E09 |

## 범위별 공통 인수

생성/편집/저장/재열기에서 ID와 값, 순서를 유지합니다. 조회 권한은 버튼뿐 아니라 서버 쓰기를 제한합니다. 실패와 취소는 기존 작업을 보존하고 성공을 추정하지 않습니다. UI의 비활성/로딩/빈 화면, 선택 상태, 키보드, 드래그, 좁은 폭도 기능 계약입니다.

## 현재 완료로 표시하지 않는 항목

실시간 동시 타이핑 병합, AI 자동 응답 생성, 정적 Pages의 ODBC/서버 데이터 연결, 로컬 SQLite, 서명/공증·자동 업데이트, 전체 OS에서의 실제 WBS/인증/IME 업무는 완료 범위가 아닙니다. REA의 워크플로 엔진, ITSM 우선순위/결재선, CORE 식별자와 출시일도 Portal 기능이 아닙니다.

## 후속 계획과 문서 연결

E01~E12의 원래 우선순위, 공수와 선행은 기존 개선 개발 계획서를 유지합니다. 이번 PTL 8개 명세는 기존 네 정의서를 대체하지 않고, 동작/규칙/인수 시나리오를 기능 단위로 찾아가는 진입점입니다. 명세의 시나리오는 별도 실행 증거가 없으면 검수 기준이며 통과 기록이 아닙니다.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/functional-design.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/functional-design.md)
- [docs/design/screen-design.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/screen-design.md)
- [docs/design/code-definition.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/code-definition.md)
- [docs/design/table-definition.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/table-definition.md)
- [docs/design/improvement-roadmap.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/improvement-roadmap.md)
