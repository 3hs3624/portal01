# 기능 변경과 설계서 동기화

이 저장소의 기능·UI·UX 현재 사양은 `docs/design/README.md`에서 시작한다. 사용자의 요청에 따라 향후 기능을 추가·수정·삭제할 때 관련 설계서를 같은 작업/커밋에서 갱신한다.

## 반드시 갱신할 내용

- 화면 구성, 메뉴/버튼/입력·기본값·표시 문구, 레이아웃/반응형, 키보드·포인터·드래그 등 조작 방식.
- 정상 흐름뿐 아니라 로딩·빈 결과·입력 오류·저장 실패·취소·충돌·권한별 제한·재진입 상태.
- 저장 위치·데이터 형식·식별자·참조·권한·마이그레이션·호환성·복구 및 실제 배포/검증 범위.
- 동적으로 생성되는 메뉴·보기·카드·행 작업도 누락하지 않는다. 정적 HTML만 보고 완료로 판단하지 않는다.

## 변경 범위에 따른 문서

- Write Studio: `docs/design/write-studio.md`.
- Project Management 및 내장 WBS 대시보드: `docs/design/project-management.md`.
- Insight BI: `docs/design/insight-bi.md`.
- 인증/관리/저장소/공유/공통 화면: `docs/design/common.md` 및 영향을 받는 앱 문서.
- 설치형 실행/네이티브 저장/패키징/업데이트: `docs/design/desktop.md`.
- 항상 `docs/design/CHANGELOG.md`에 실제 변경·근거·검증 또는 미검증 범위를 추가한다.

`python scripts/design_inventory.py`로 UI·코드 인벤토리를 재생성하고 `--check`로 일치 여부를 확인한다. `python scripts/check_design_docs.py --base <기준 커밋> --head <변경 커밋>`로 갱신 누락을 확인한다. CI를 통과시키기 위한 날짜 변경만 하지 말고 실제 변경된 동작과 상태를 설명한다. 테스트/캐시 버전만 바뀐 경우 사용자 동작 변경을 만들어 기록하지 않는다.

구현 코드와 테스트가 근거다. 계획·추정·환경 의존 기능을 현재 완료 사양으로 쓰지 않는다. 문서에 실제 사용자 데이터·토큰·비밀 키를 넣지 않는다. 기존 상세 기술 문서가 충돌하면 함께 정정하고 링크한다.

웹과 설치형이 같은 기능 변경을 받으면 양쪽 브랜치의 설계서도 맞춘다. 문서 변경만으로 기존 사용자 데이터 변경, 이메일 발송, 권한 부여, 서버 재마이그레이션을 실행하지 않는다. 문서 확인에 필요한 검증만 수행한다.

## 재구현 설계 패키지

`docs/design/screen-design.md`, `functional-design.md`, `code-definition.md`, `table-definition.md`는 재구현 계약이다. 화면/기능/코드값·API·형식/DB 구조 변경 시 해당 계약도 같은 작업에서 갱신한다. `python scripts/spec_catalog.py`로 컬럼·RPC·코드/컨트롤 부록을 재생성하고 `--check`로 검증한다. 원형/DDL 제약과 요약이 다르면 원문을 확인해 정정한다. Google Drive 게시본 갱신을 요청받으면 문서 ID를 확인하여 해당 파일을 갱신하며 중복 파일을 임의 생성하지 않는다.
