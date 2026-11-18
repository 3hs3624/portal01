# Portal 리스크 관리대장 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 관리 기준

영향/가능성은 정성 판단이며 측정된 사고 빈도가 아닙니다. 역할 담당은 제안입니다. 소유자 확인, 릴리스, 복원 시험, 주요 데이터 계약 변경 때 갱신합니다.

| ID | 리스크 | 영향/가능성 | 탐지 신호 | 대응과 종료 조건 | 상태 |
|---|---|---|---|---|---|
| PR-01 | legacy Pages가 회귀 관문과 독립 배포 | 상/확인됨 | Pages source 변경403 | 소유자 workflow source 설정, 관문 deploy 및 복구 예행 성공 | 오픈 |
| PR-02 | 브라우저 프로필 제거로 로컬 백업까지 소실 | 상/중 | 같은 프로필에만 복구본 | E02 외부 복구본과 새 context 복원 비교 | 오픈 |
| PR-03 | 개인본/공유본 혼동 또는 오래된 revision 덮어쓰기 | 상/중 | 공유 연결 표시와 현재 revision 불일치 | 항목 권한+CAS, 양쪽 백업, 명시적 비교와 이력 | 관리 중 |
| PR-04 | Excel 구조 변경 후 수식/조건부 서식 보존 오인 | 상/중 | 행 mapping 변경, 보존 검사 차이 | 원본 byte와 sheet 관계 비교, 실제 Excel 재계산 검증 | 오픈 |
| PR-05 | 설치형 smoke 성공을 실제 업무 성공으로 오인 | 상/확인됨 | 인증/WBS/IME 증거 없음 | E01-2/E04 실제 OS 수직 시나리오 완료 | 오픈 |
| PR-06 | 오래된 데이터 상세 창이 교체본에 쓰기 | 상/중 | source ID/revision 변경 | opener/requestId/revision 검사, 불명확 결과 재저장 금지 | 관리 중 |
| PR-07 | 비동기 UI 테스트의 좌표/목록 경쟁 상태 | 중/확인됨 | CI 간헐 실패 | 실제 상태 대기, assertion 유지, 재발 시 원인 로그 | 관리 중 |
| PR-08 | 설계서/코드/Drive 사본 내용 불일치 | 상/중 | source hash 또는 발행 manifest 차이 | 원본 ID 유지, 같은 작업에 설계/이력 갱신, 내용 readback | 관리 중 |
| PR-09 | 30일 artifact 만료로 정적 복원 불가 | 중/상 | 실행일+30일 경과 | 보관 정책 결정과 검증된 릴리스 보존. 만료본 성공 표시 금지 | 오픈 |
| PR-10 | 서명/업데이트/SQLite를 현재 제품으로 안내 | 상/중 | 개발판과 정식판 표시 혼동 | E08/E09 전까지 미완료 표시 | 오픈 |
| PR-11 | 기능 추가 범위와 일정 확대 | 중/상 | 선행 검증 전 새 기능 병행 | E 번호와 인수 조건 우선, 실제 공수/장비 대기 구분 | 오픈 |
| PR-12 | 참조 프로젝트의 승인/출시일을 Portal로 전재 | 중/중 | REA CORE ID/일정이 Portal 요구로 혼입 | 구조만 참고, Portal 독립 PTL ID와 근거 사용 | 점검 완료/계속 관리 |

## 책임과 후속

PR-01은 저장소 소유자 설정이 필요합니다. 개발/품질 관련 항목은 개발 담당과 검수자가 확인하고 최종 역할은 사용자와 실제 운영체계에 맞춰 정합니다. 관리 중은 위험 제거 완료를 뜻하지 않습니다. G0 체크리스트와 개선 실행 이력에 상태를 연결합니다.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/executions/2026-11-16-e01.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/executions/2026-11-16-e01.md)
- [docs/design/improvement-roadmap.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/improvement-roadmap.md)
- [docs/design/desktop.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/desktop.md)
