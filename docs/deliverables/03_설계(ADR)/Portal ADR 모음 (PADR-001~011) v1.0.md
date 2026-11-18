# Portal ADR 모음 (PADR-001~011) v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 적용 기준

REA의 ADR-001~011 구성 방식을 따르지만 Portal 결정 식별자는 PADR입니다. 기존 코드에서 확인된 선택은 사후 재구성 기록이며 새로 사용자 승인을 받은 것으로 쓰지 않습니다. 제안은 구현과 별개입니다. REA의 Spring/Carbon/워크플로/결재 엔진 결정은 적용하지 않습니다.

## PADR-001 세 앱과 정적 웹 셸 유지

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

하나의 포털에서 동일 Origin 앱과 공통 인증을 사용합니다.

### 선택지

현재 셸 유지 / 새 SPA 일괄 전환

### 결정 또는 현행 선택

현행을 설명하며 프레임워크 전환은 채택하지 않습니다.

### 결과와 경계

메시지와 parent/opener 계약을 유지해야 합니다.

### 재검토 조건과 근거

앱 격리 방식 또는 보안 경계 변경 요구 시. 근거: app.js, apps/*, pages-guard.js.

## PADR-002 로컬 저장과 관계형/JSONB 혼합

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

유동 블록과 설정은 JSONB, 조회/참조 구조는 관계형, 파일은 별도 저장 경로를 사용합니다.

### 선택지

전체 JSON / 전체 정규화 / 혼합

### 결정 또는 현행 선택

현재 hybrid 원형과 JSON/폴더 호환을 보존합니다.

### 결과와 경계

JSON을 없앴다고 안내하지 않으며 전체 파일 참조 검증이 필요합니다.

### 재검토 조건과 근거

새 schema 또는 offline 동기화 설계 시. 근거: CONTENT-RELATIONAL-STORAGE.md, PROJECT-RELATIONAL-STORAGE.md.

## PADR-003 저장 사본/외부본/공유본 상태 분리

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

한 위치 저장 성공을 다른 위치 성공으로 표시하지 않습니다.

### 선택지

통합 성공 표시 / 위치별 상태

### 결정 또는 현행 선택

generation에 대응한 실제 저장 성공을 사용합니다.

### 결과와 경계

사용자는 반영 대기·실패를 구분할 수 있어야 합니다.

### 재검토 조건과 근거

외부 자동 반영 정책 E02 결정 시. 근거: storage-status.js, docs/design/functional-design.md.

## PADR-004 CAS와 양쪽 백업 기반 교체

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

비교 후 변경될 수 있으므로 적용 직전에 revision과 현재 generation을 다시 검사합니다.

### 선택지

최신 시각 덮어쓰기 / CAS와 백업

### 결정 또는 현행 선택

양쪽 자료 보호 후 명시 적용합니다.

### 결과와 경계

백업 실패는 교체 실패이며 생성일은 우선권이 아닙니다.

### 재검토 조건과 근거

서버 병합 또는 실시간 동시편집 도입 시. 근거: apps/markdown/storage-compare.js, storage-flow.js.

## PADR-005 항목 단위 별도 공유 작업공간

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

개인 원본과 공유 변경을 별도로 관리합니다.

### 선택지

개인 원본 링크 / 독립 공유 workspace

### 결정 또는 현행 선택

소유자와 view/edit 권한, 서버 인가, expected revision을 사용합니다.

### 결과와 경계

원본 삭제 후에도 소유자의 공유 관리 경로가 필요합니다.

### 재검토 조건과 근거

원본/공유본 자동 동기화 요구 시. 근거: ITEM-SHARING.md, portal-item-sharing.sql.

## PADR-006 문서별 메타데이터와 확장 블록

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

일반 Markdown만으로 DB/보기/댓글/옵션을 모두 표현할 수 없습니다.

### 선택지

표준 Markdown만 / 안정 ID와 확장 데이터

### 결정 또는 현행 선택

기존 확장 원형과 문서별 editorOptions를 유지합니다.

### 결과와 경계

표준 리더 요약과 Portal 편집 원형을 구분합니다.

### 재검토 조건과 근거

포맷 version 변경 시. 근거: apps/markdown/BLOCKS.md, docs/design/write-studio.md.

## PADR-007 원본 workbook 보존과 행 mapping

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

수식·조건부 서식은 값만 내보내기로 재현할 수 없습니다.

### 선택지

값 기반 새파일 / 원본 패키지 변경

### 결정 또는 현행 선택

원본 바이너리와 mapping을 유지하고 변경 셀을 반영합니다.

### 결과와 경계

구조 변경은 원본 그대로 보존 범위와 구분해야 합니다.

### 재검토 조건과 근거

E05 실제 재계산/구조검증 확장 시. 근거: apps/projects/workbook-preserve.js, docs/design/project-management.md.

## PADR-008 BI 전체 참조와 상세창 revision 계약

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

소스/시트/보드/링크와 열린 상세창은 서로 참조합니다.

### 선택지

시트만 교체 / 전체 검증과 revision

### 결정 또는 현행 선택

교체/복구는 ID 참조와 메시지 requestId·Origin·revision을 검증합니다.

### 결과와 경계

오래된 창의 자동 재저장은 허용하지 않습니다.

### 재검토 조건과 근거

멀티윈도 공유편집 모델 변경 시. 근거: docs/design/insight-bi.md, docs/design/code-definition.md.

## PADR-009 Electron 프로토콜과 최소 권한

상태: 현행 구현 재구성. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

Node를 편집 renderer에 노출하지 않고 웹 자산을 제공합니다.

### 선택지

file://+Node / custom protocol+sandbox

### 결정 또는 현행 선택

현행 custom protocol, contextIsolation, 탐색/경로 제한을 유지합니다.

### 결과와 경계

프로필 분리와 미완료 native 파일/창 업무를 명시합니다.

### 재검토 조건과 근거

HostBridge 또는 WebContentsView 도입 시. 근거: docs/design/desktop.md, desktop-preview/desktop/src.

## PADR-010 동일 commit 회귀와 무결성 artifact

상태: 구현됨 / 웹 활성화 대기. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

실패 commit이나 다른 commit의 증거로 배포하지 않습니다.

### 선택지

별도 branch build / gate artifact

### 결정 또는 현행 선택

6suite/24command와 hash manifest를 요구하는 관문 코드를 적용했습니다.

### 결과와 경계

Pages source 변경403으로 실제 관문 배포는 대기입니다.

### 재검토 조건과 근거

소유자 source 설정과 원격 복구 예행 완료 시. 근거: scripts/regression.py, scripts/stage_release.py, .github/workflows/quality-gate.yml.

## PADR-011 설치형 저장 계층 분리와 정식 배포

상태: 제안 / 미구현. 기록일: 2026-11-18. 승인일: 별도 확인 없음.

### 배경

프로토타입을 실제 업무 설치형으로 완성하려면 창/파일/인증/저장을 분리 검증해야 합니다.

### 선택지

renderer 직접 접근 / 좁은 HostBridge+Main 서비스

### 결정 또는 현행 선택

후자를 검토 대상으로 유지하며 SQLite·키링·서명·업데이트 완료로 기록하지 않습니다.

### 결과와 경계

데이터 이전과 offline 정책, rollback 호환성의 구체 설계가 필요합니다.

### 재검토 조건과 근거

실제 우선 OS와 업무 검증 범위 확정 시. 근거: docs/design/improvement-roadmap.md E04/E08/E09.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/common.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/common.md)
- [docs/design/desktop.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/desktop.md)
- [docs/design/improvement-roadmap.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/improvement-roadmap.md)
- [docs/design/executions/2026-11-16-e01.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/executions/2026-11-16-e01.md)
