# Portal 산출물 관리

2026-11-18(KST). REA의 실제 5폴더/17문서 역할을 Portal 자료로 구성했습니다. 관리 위치는 [내 드라이브 > ChatGPT > Portal](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)입니다.

| 폴더 | 핵심 문서 | 기존 자료 |
|---|---|---|
| 01_계획 | 수행계획2종, G0, 리스크, 기능 범위, 기존 개발 계획:6개 | 기존 개발 계획 ID 유지 |
| 02_명세 | PTL-01~08:8개 | 기존 네 정의서와 2026-11-13 ZIP |
| 03_설계(ADR) | PADR-001~011 모음:1개 | 현행 재구성과 제안 구분 |
| 04_작업기록 | 기존 계획 대비 실행 이력:1개 | 과거 내용 보존, 2026-11-18 추가 |
| 05_검토 | 산출물/명세 정합성 점검:1개 | 전체 문서 찾아가기 포함 |

핵심 대응17개, 추가 네 정의서와 보관 ZIP을 합쳐22파일(네이티브 문서21개,ZIP1개)입니다. REA 원본은 변경하지 않습니다. Portal 앱/DB/사용자 자료/배포를 변경한 작업이 아닙니다.

[전체 문서 목록과 대응표](https://docs.google.com/document/d/18PXQjVGVIkMzgDAhKuu9vwX8CBnCteK8NVrjIlCrfRg/edit?usp=drivesdk)에서 Google 문서를 찾아갑니다.

## 다시 생성하거나 갱신하기

1. 기존 docs/design의 현재 기능과 코드 근거를 확인합니다. scripts/build_deliverables.py의 기준 SHA와 계획 내용을 실제 변경 범위에 맞춰 검토합니다. 날짜/승인/테스트 성공을 추정하지 않습니다.
2. `python scripts/build_deliverables.py`로 Markdown17종과 manifest.json을 생성합니다. 네 정의서는 원본 경로를 그대로 참조합니다.
3. manifest.json의 source_hashes와 문서별sha256을 비교합니다. 변경된 역할의 Google Docs를 drive-publication.json의 기존 ID로 갱신합니다. 이 스크립트 자체는 Drive에 쓰거나 앱을 배포하지 않습니다.
4. 기존 계획/이력은 통째 교체하지 않고 날짜별 상태/변경만 추가합니다. 발행 본문/제목/표 셀과 부모 폴더를 확인한 뒤 publication manifest의 해시/검증일을 갱신합니다.
5. 이전 계획 대비 실행/실패/미완료를 작업 기록에 추가합니다. 사용자 검수·운영 OS·부하·인쇄 검증이 없으면 별도 미검증으로 유지합니다.

## 파일의 역할

- manifest.json: 재생성 입력 파일 hash, 기준 코드, Markdown 경로/해시와 문서 역할.
- drive-publication.json: 실제 폴더/Doc ID/URL, 게시 및 readback 검증 범위. 새 파일 생성 시 기존 ID 유무를 먼저 확인합니다.
- 네 정의서: [기존 재구현 계약](../design/README.md). PTL 요약이나 소스 추출본으로 기존 상세를 삭제하지 않습니다.

현재 Pages403 대기, E01-2 실제 OS 업무 미완료, E02~E12 미착수는 그대로입니다. 설치형 개발판 패키징 성공을 정식판·인증/IME/파일 업무 성공으로 바꾸지 않습니다.
