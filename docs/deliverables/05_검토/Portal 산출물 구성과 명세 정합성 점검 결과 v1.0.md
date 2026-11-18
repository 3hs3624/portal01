# Portal 산출물 구성과 명세 정합성 점검 결과 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 대상과 결론

REA의 실제 5개 폴더와 하위17개 Google Docs를 확인했습니다. 동일한 분류와 문서 역할로 Portal 산출물을 만들 수 있습니다. 참조본은 읽기 전용으로 유지합니다. 문서 형식을 적용한 것이 REA 제품 기능과 Portal의 기능이 같다는 의미는 아닙니다.

## 폴더와 산출물 대응

| REA 참조 | Portal 대응 | 처리 |
|---|---|---|
| 01_계획 / 팀 수행계획 v0.1 | 팀 운영 비교안 v0.1 | 신규 제안. 과거 승인 이력으로 만들지 않음 |
| 01_계획 / G0 체크리스트 | Portal G0 실행 체크리스트 | 법무 게이트 대신 Portal 착수/배포 점검 |
| 01_계획 / 1인+AI 수행계획 v0.2 | 1인+AI 활용안 v0.2 | 실제 운영 방식과 후속 제안 구분 |
| 01_계획 / 리스크 대장 | Portal 리스크 관리대장 | Portal 데이터·배포·설치형 위험 |
| 01_계획 / 기능 범위 | Portal 기능 범위 정의서 | PTL-01~08 및 E01~E12 연결 |
| 01_계획 / 개발 계획서 | 기존 개선 검토 및 실행 계획 | 기존 ID·원문·변경 이력 보존 |
| 02_명세 / CORE 8종 | PTL-01~08 명세 | 동일 형식, Portal 자체 규칙/인수 시나리오 |
| 03_설계(ADR) / ADR 모음 | PADR-001~011 | 현행 사후 기록과 미구현 제안 구분 |
| 04_작업기록 / 일자별 기록 | 기존 개선 계획 대비 실행 이력 | 과거 결과 보존, 2026-11-18 문서 작업 추가 |
| 05_검토 / 클린룸 점검 | 본 산출물/명세 정합성 점검 | Portal 문서 범위 검토, 법률 의견 아님 |

## 기존 정의서와 이력 보존

화면설계서, 기능설계서, 코드 정의서, 테이블정의서와 기존 설계 ZIP은 ID를 유지하고 02_명세로 분류합니다. ZIP은 2026-11-13 기준 보관본이며 이번 최신 문서 전체가 담긴 ZIP으로 이름 바꾸지 않습니다. 기존 개발 계획은 01_계획, 실행 이력은 04_작업기록에 둡니다. 새로 만든 Studio나 REA 폴더로 이동하지 않습니다.

## 문서 작성 검토

| 항목 | 판정 | 범위/제약 |
|---|---|---|
| REA 원본 구조 확인 | 확인 | Claude 부모와 REA ID,5폴더17문서 |
| 명세 구조 적용 | 작성 | 목적/근거/용어/규칙/권한/예외/화면/범위밖/인수 시나리오 |
| 기존 상세 보존 | 작성 | 8개 명세에 관련 원문 추출, 네 정의서 유지 |
| 계획/현행/실행 구분 | 확인 | E01 전체 완료 아님, Pages403 대기, 실제 OS 업무 미완료 |
| ADR 승인 구분 | 확인 | 기존 구현 사후 재구성/제안, 사용자 승인일 생성 안 함 |
| 경로와 Doc ID | 발행 후 확인 | 재조회한 폴더/문서 ID와 원문 링크 대조 |
| 테스트 통과 주장 | 제한 | 기존 E01 증거만 인용, 신규 제품 회귀·운영 검수로 표시 안 함 |

## 미완료 및 후속

웹 배포 관문 활성화와 원격 복구 예행은 기존403 대기 상태입니다. E01-2 실제 OS 업무, E02~E12는 본 문서 작업으로 실행하지 않습니다. PTL 인수 시나리오는 검수 기준이며 모든 시나리오가 자동화되거나 이번에 실행됐다고 기록하지 않습니다. 사용자 검수 승인, 법률 적합성, 실제 화면 렌더링/인쇄 적합성은 별도입니다.

## 향후 같은 구조로 재생성하는 방법

scripts/build_deliverables.py를 실행하면 source 기반 Markdown과 source hash manifest를 docs/deliverables에 재생성합니다. Drive 발행은 별도 작업으로 수행하며 drive-publication.json의 기존 ID를 재사용하고 revision 검사 후 갱신합니다. 동일 폴더 아래 중복 이름 문서를 자동으로 만들지 않습니다. 변경된 원문 hash를 확인하고 관련 PTL/네 정의서/ADR/작업 이력을 함께 갱신합니다.

문서 발행 목록에는 상대 경로, 원문 hash, 발행 ID와 부모 폴더, 작성/확인 범위를 남깁니다. 계획서와 작업 기록은 기존 ID로 관리하고 과거 내용은 삭제하지 않습니다.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [AGENTS.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/AGENTS.md)
- [docs/design/README.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/README.md)
- [docs/design/execution-history.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/execution-history.md)
- [docs/design/executions/2026-11-16-e01.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/executions/2026-11-16-e01.md)
