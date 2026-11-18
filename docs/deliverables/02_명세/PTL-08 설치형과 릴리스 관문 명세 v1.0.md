# PTL-08 설치형과 릴리스 관문 명세 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 식별과 상태

명세 ID: PTL-08. 버전1.0. 기존 구현의 문서화 초안이며 사용자 승인일은 미기재입니다. 아래 인수 시나리오는 검수 기준입니다. 테스트 파일의 존재와 이번 문서 검토는 해당 시나리오 실행 성공을 뜻하지 않습니다.

## 목적

동일 업무 자산을 안전한 Electron 셸과 검증된 릴리스 흐름으로 제공합니다.

## 용어

작업 사본은 현재 환경의 개인 저장본, 외부본은 선택한 폴더/클라우드의 저장본, 공유본은 항목별 별도 공유 작업공간입니다. revision/generation은 덮어쓰기 유효성 검사에 사용하며 수정 시각과 다릅니다. 자세한 원형은 기존 코드/테이블정의서를 따릅니다.

## 업무 규칙과 상태·권한

앱 접근과 항목 권한을 함께 검사합니다. 권한 제한은 서버에서도 강제합니다. 저장소 선택은 데이터 이동과 다르고, 성공/실패/불명확/미검증은 서로 바꿔 쓰지 않습니다. 이 명세에 포함한 구현 상세의 규칙, 기본값, 상한, 키보드와 실패 경계가 규범입니다.

## 화면 요구와 예외

로딩/빈 결과/취소/권한 없음/실패 상태를 표시하고 기존 작업을 보존합니다. 패널 폭, hover 핸들, 선택/입력 확정, 드래그 미리보기와 취소, 보기 전환, 재진입 옵션은 화면설계 및 아래 상세를 따릅니다. UI를 새로 그리더라도 동일한 동작·저장 계약을 유지합니다.

## 비기능과 범위 밖

UI 비활성만으로 인가를 대신하지 않습니다. 계정별 데이터를 분리합니다. 실제 OS/운영 계정/Excel 재계산/부하 검증은 별도 증거를 요구합니다. 이 문서는 REA의 동일 번호 CORE 기능이나 해당 프로젝트의 승인 상태를 가져오지 않습니다. 상세의 후속 항목은 현재 구현이 아닙니다.

## 부록: 인수 시나리오

| ID와 시나리오 | Given | When | Then |
|---|---|---|---|
| PTL-08-AT01 실패 관문 | 동일 commit의 unit case 하나가 실패한다 | 릴리스 흐름을 실행한다 | release-ready와 deploy를 건너뛴다 |
| PTL-08-AT02 증거 변조 | artifact의 자산 hash나 source_sha가 다르다 | 배포 또는 복원을 검증한다 | 거부하고 배포 성공으로 표시하지 않는다 |
| PTL-08-AT03 개발판 패키징 | 회귀와 4대상 preview가 성공했다 | 검증 범위를 기록한다 | smoke/packaging 성공으로 쓰고 실제 인증/WBS/IME 성공으로 확대하지 않는다 |
| PTL-08-AT04 현재 Pages 설정 | source 변경 요청이403이다 | 관문 배포를 시도한다 | 실패를 표시하고 소유자 설정 조치를 안내한다 |
| PTL-08-AT05 자동 복구 예행 | 검증된 production gate가 성공했다 | workflow_run 복구를 수행한다 | 검증만 수행하고 deploy는 skipped여야 한다. 현 상태에서는 아직 미검증이다 |

## 결정과 검증 기록

2026-11-18: REA 형식에 맞춰 Portal 자체 명세로 추출했습니다. 현재 구현과 계획의 차이는 작업 기록과 검토 결과에 남깁니다. 사용자 승인과 실행 결과는 이후 날짜별로 추가합니다.

## 구현 상세 원문

아래 내용은 기존 Portal 설계에서 추출한 상세입니다. 표의 필드·동작·보존·오류를 생략하지 않았으며 문서 내 원래 상대 참조의 원본은 근거 파일에서 확인할 수 있습니다.

## 설치형 현재 설계와 UI·UX 경계

기준일: 2026-11-07. 현재는 **Electron 호환성 프로토타입/개발 빌드**입니다. 웹과 동일한 세 앱 화면·공통 공유 기능을 포함하지만, 서명된 정식 설치판과 전체 네이티브 업무 흐름 검증을 완료한 상태로 기록하지 않습니다.

### 1. 사용자 관점의 구성

| 진입/동작 | 현재 동작 | 경계·실패 상태 |
|---|---|---|
| 앱 실행 | Portal01 Preview 창, 기존 포털 로그인·앱 화면 | 인증을 우회하지 않습니다. 실패 시 시작 오류 대화상자. |
| 기본 창 | 1440×960, 최소 900×600 | 첫 화면 준비 후 표시. OS 기본 창 이동·크기 조절 사용. |
| 웹 주소 | 기존 GitHub Pages 웹 버전 유지 | 설치형 실행과 브라우저 접속이 각각 가능합니다. |
| 앱 내 UI | 세 웹 앱의 동일 정적 자산 | UI 세부 사양은 앱별 설계서를 따릅니다. 공유 창 체크박스·패널 폭 등 공통 변경도 같은 소스로 반영. |
| 개인 데이터 | OS 앱 데이터 아래 `Portal01-Preview` 별도 프로필 | Chrome/Edge 등의 기존 데이터가 자동으로 나타나지 않습니다. |
| 앱 주소 | `portal01://workspace/portal01/` | /portal01 절대 경로를 대응. 허용 루트 밖 경로·심볼릭 링크 이탈·잘못된 Origin은 404/차단. |
| 외부 탐색 | 허용된 앱 주소 외 최상위 이동 차단 | 임의 외부 주소를 네이티브 권한으로 열지 않습니다. |
| 새 창 | 현재 Insight 데이터 상세 경로만 제한 허용 | 일반 새 창/Project WBS 팝업을 포함한 전체 창 흐름은 추가 전환·검증 대상입니다. |
| 권한 요청 | 기본 거부 | 웹 File System Access와 실제 OS 폴더·파일 권한은 아직 전체 지원을 보장하지 않습니다. |
| 종료/재실행 | 플랫폼 기본 창 수명주기 | Mac은 창을 닫아도 앱이 유지될 수 있고, 활성화 시 창을 다시 엽니다. |

### 2. 보안·데이터 경계

renderer는 Node 통합을 끄고 sandbox/contextIsolation/webSecurity를 켭니다. file:// 로드나 webSecurity 해제를 기본으로 사용하지 않습니다. 허용된 사용자 정의 프로토콜의 파일을 읽어 응답합니다. renderer에 임의 fs/shell/SQL API를 노출하지 않습니다.

현재 작업 데이터의 기준은 Electron 프로필의 브라우저 저장소입니다. 로컬 SQLite·전용 Main 저장 서비스·OS 보안 키링·정식 HostBridge는 후속 단계입니다. 포털의 parent/opener 기반 앱 호환 구조를 유지하며 앱별 WebContentsView 격리는 아직 완료되지 않았습니다.

웹·설치형은 같은 Supabase 서비스를 사용할 수 있으나 각 환경의 세션·로컬 작업은 분리됩니다. 실제 인증/권한·네트워크·Origin 정책은 배포 환경에서 검증해야 합니다. 기존 자료는 현재의 JSON·폴더·클라우드 반영/불러오기 경로로 이전합니다.

### 3. 소스·패키징·배포

설치형 소스는 [desktop-preview/desktop](https://github.com/3hs3624/portal01/tree/desktop-preview/desktop)에 있습니다. 웹 브랜치에 desktop 디렉터리가 없는 경우에도 이 설계서를 유지합니다.

- `src/main.cjs`: 앱 프로토콜, BrowserWindow, 탐색·새 창·권한 정책.
- `src/policy.cjs`: Origin·경로·실제 파일 검사.
- `scripts/stage.cjs`: 공개 런타임 HTML/CSS/JS/JSON 및 앱 폴더만 스테이징. SQL·작업 폴더·테스트·Git 정보 제외.
- `package.json`/lock: 고정된 의존성 해석과 Windows NSIS, Mac DMG/ZIP, Linux AppImage/deb 대상 구성.
- `npm run pack`: 현재 OS의 압축 해제된 앱. `dist`: 해당 설치 패키지 생성 명령. 설정 존재와 실제 정식 패키지 릴리스 완료를 구분.
- `scripts/archive.cjs`: 실행 권한·심볼릭 링크를 보존하는 개발 아카이브 생성.

운영 웹은 `gh-pages`, 설치형 개발 빌드는 `desktop-preview`로 구분합니다. 현재 GitHub Actions는 Ubuntu x64, Windows x64, Mac arm64/Intel x64에서 검사·Electron 스모크·unpacked 패키징·아카이브를 실행하고 7일간 artifact로 보관합니다. 실제 Releases에 자동 게시하지 않습니다. 서명/공증된 설치판·자동 업데이트는 아직 구현 완료 항목이 아닙니다.

### 4. 검증 범위

정책 테스트는 Origin·경로 이탈·심볼릭 링크를 검사합니다. 스모크는 실제 Electron 로그인 셸, 세 앱 HTML 제공, 프로필 저장소, 렌더러 보안 설정, 공통 목차 리사이저의 네이티브 마우스 드래그·폭 저장을 확인합니다. Linux CI의 `--no-sandbox` 예외는 격리된 테스트 실행에만 사용하며 제품 기본 실행 정책과 구분합니다.

웹의 공유/편집/엑셀 테스트가 통과했다고 전체 실제 단말의 인증·한글 IME·인쇄·WBS 팝업·파일 잠금·조건부 서식 왕복·강제 종료 복구·업데이트 검증을 완료한 것으로 기록하지 않습니다. 각 신규 검증 결과를 변경 이력에 명시해야 합니다.

### 5. 후속 설계 항목

HostBridge 분리, 네이티브 파일/SQLite 작업공간, 계정별 보안 키링, 개인/조직 오프라인 정책, 데이터 이전·복구, Windows 서명·Mac 공증, 안전한 업데이트와 마이그레이션, 실제 OS 단말 베타가 남아 있습니다. 이 항목들은 코드·검증이 추가될 때 현재 사양으로 이동합니다.

### 업무 회귀를 통과한 개발 패키징 (2026-11-16)

설치형 preview packaging은 reusable business-regression 성공에 의존하도록 전환합니다. fixture 웹 회귀와 네 OS의 기존 Electron 셸/정책/스모크·개발 아카이브를 각각 실행하며 전체 실제 사용자 인증/WBS·파일·IME 업무(E04)를 완료로 간주하지 않습니다. 배포 대상 SHA와 결과는 [E01 실행 기록](executions/2026-11-16-e01.md)에 기록합니다.


## EX-20261116-E01 계획 대비 실행 기록

계획: 2026-11-14 개선 계획 E01. 착수일: 2026-11-16(KST). 현재 상태: E01-1 구현·회귀 검증 및 설치형 패키징 완료. 웹 관문 활성화는 GitHub Pages source 변경403으로 대기. E01 전체 완료 아님.

### 계획 대비 구현

| 계획 | 구현 | 완료 판정 근거 |
|---|---|---|
| 업무 테스트를 배포 관문으로 연결 | 재사용 business-regression workflow, unit/SQL/저장/공유/Excel/편집·레이아웃 6개 suite | 정상 후보43788850797: 6묶음24명령 성공 |
| 실패 시 배포 차단 | release-ready→deploy 의존성, 동일 커밋·모든 case 성공 증거 검증 | 43787977198: 의도적 unit 실패, release-ready/deploy skipped |
| 복구 가능한 배포 결과 | SHA-256 정적 자산 manifest, 보고서·검증 artifact30일 보관, 수동 복원 workflow | verified-web-release 생성·동일 커밋/해시 검증 성공. 원격 복구 예행은 웹 관문 활성화 후 확인 필요 |
| 웹/설치형 영향 확인 | 웹 Pages workflow 배포, 설치형 package job은 업무 회귀 성공 후 실행 | 설치형43788857190: 회귀+4대상 smoke/패키징 성공. 웹 deploy는 설정403으로 실패 |
| 완료/미검증 구분 | 이력 인덱스·항목별 실행 기록·Google Drive 기존 계획 업데이트 | 이 기록 및 실행 이력 인덱스 작성; Portal 게시본 연계 |

### 변경 내용

- ci: Python/SQL 도구 버전 고정, Node lockfile. 실제 Supabase/사용자 계정이 없는 PGlite fixture만 사용.
- scripts/regression.py: 순차 case, 실패/시간초과 이후 not_run, 로그·시각·환경·SHA 보고서, 전체 보고서 검증.
- scripts/stage_release.py: 성공 보고서 확인 후 공개 자산만 stage, source SHA·파일 hash manifest, 변조/누락/추가 경로 검증.
- quality-gate workflow: 후보/PR에서 회귀, gh-pages에서만 검증 artifact 배포. 독립 branch-build가 테스트보다 먼저 배포하지 않도록 Pages source를 workflow로 전환하고 확인.
- restore-web-release workflow: 같은 저장소의 성공한 production run만 선택, reports/hash 재검증 후 정적 파일만 수동 복원. DB/schema 호환성 확인을 별도로 요구.
- tests/release_gate.py: 실패·timeout·case 누락·오래된 SHA·중복 suite·artifact 변조·정적 자산 포함 범위·workflow 의존성 검사.
- 브라우저 fixture: CHROMIUM_BIN으로 CI 설치 브라우저를 지정, 존재하지 않는 경로는 명시 실패.

### 검증 기록

로컬 실행은 work/e01-local의 report.json과 로그에 보관합니다. 로컬 작업 중 생성된 보고서는 원격 최종 커밋 증거를 대신하지 않습니다. 원격 최종 SHA·실행 URL·부정 시험·배포/복원 결과는 아래 완료 검증 절에 추가합니다.

### 복구 절차와 경계

GitHub Actions의 Restore verified web release를 gh-pages에서 수동 실행합니다. 성공한 production quality-gate run_id와 정적 파일 복원/DB 호환성 확인을 지정합니다. artifact 유효30일 내에서만 동작하며, 현재 gate가 지원하지 않는 과거 보고서 형식·만료 artifact는 거부합니다. 데이터베이스 migration·사용자 자료·클라우드 revision을 되돌리는 기능이 아닙니다.

### 남은 범위

E04의 OS별 실제 인증/WBS 팝업/파일/IME 업무는 별도 검증 대상입니다. 이번 게이트는 fixture 기반 웹 업무를 검증하며 운영 데이터/메일/권한·DB를 변경하지 않습니다. 인일은 측정하지 않았으며 계획3~5인일을 실제 공수로 복사하지 않습니다.

정상 production 배포 후에는 Restore verified web release의 workflow_run으로 동일 검증 artifact를 별도 실행에서 다운로드·증거/해시 검증하는 비파괴 복구 예행을 자동 수행합니다. 이 자동 경로는 실제 재배포를 하지 않으며, 재배포는 workflow_dispatch와 정적 복원 확인을 함께 만족할 때만 실행합니다.

### 구현 중 발견 및 수정 이력

아래 실패는 완료 근거가 아니며, 배포 차단 동작과 수정 경과를 남깁니다.

| 실행 | 발견 | 처리 |
|---|---|---|
| 43787127266 | unit helper의 Playwright 조기 import, viewport 변경 직후 모바일 CSS 측정 | 브라우저 import 지연, 실제 CSS 갱신 대기 |
| 43787620978 / 43787821433 | 비동기 백업 목록의 즉시 개수 검사 | 두 번째 백업 행 표시를 기다린 뒤 검증 |
| 43788147773 / 43788201254 | viewport 변경 직후 사이드바 overlay의 이전 좌표로 pointer 입력 | aria-valuenow로 위치 갱신 대기, 폭·드래그 동작 assertion 유지 |
| 43788767228 | reload 이전 iframe 객체로 위치 검사 | 현재 locator를 사용하도록 수정; 로컬 3앱·포털 드래그 회귀 통과 |

초기 gh-pages 반영은 기존 branch 기반 Pages가 별도로 빌드하는 전환 구간입니다. 그 구간의 legacy Pages 성공은 새 회귀 관문 통과 근거가 아닙니다. workflow source 전환·검증 artifact 배포가 성공한 실행부터 새 관문 적용 완료로 판단합니다.

### 계획 대비 범위 차이와 후속 인수 조건

E01 전체를 일괄 완료 처리하지 않습니다. 이번 실행의 완료 단위는 **E01-1 공통 업무 회귀·배포 관문**입니다. 기존 계획의 OS별 실제 사용자 업무 smoke(인증 이후 작성·저장·재열기, WBS 상세 창과 파일 선택·한글 입력)는 설치형 셸/리사이저 smoke·패키징 성공과 다릅니다. 이 부분은 **E01-2 미완료**로 유지하고 E04 수직 구현과 함께 실제 OS에서 검증합니다.

PR과 릴리스는 현재 안전을 위해 같은 6개 전체 묶음을 실행합니다. 계획의 빠른 PR/전체 릴리스 분리 최적화는 수행하지 않았으며, 실측 실행 시간·누락 위험을 검토한 뒤 분리합니다. 자동 recovery 예행은 artifact 다운로드·재검증까지만 실행합니다. 실제 이전 자산을 production에 재배포하는 파괴 가능 시험은 이번에 실행하지 않았습니다.

### 최종 실행 증거 (2026-11-16 KST)

| 구분 | 대상/실행 | 결과 |
|---|---|---|
| 웹 구현 commit | 7ef438e0b87fcfde715f0697e537b3e8e4da6775 | 코드·회귀 최종 기준; 이후 이력/오류 안내 문서 커밋은 별도 |
| 정상 후보 | https://github.com/3hs3624/portal01/actions/runs/43788850797 | 전체 회귀·design·release-ready success, 후보이므로 deploy skipped |
| production 관문 | https://github.com/3hs3624/portal01/actions/runs/43788853182 | 회귀 6묶음24명령·release-ready·deploy 안의 artifact 재검증 success; Pages source PUT403에서 실패, gated deploy 미실행 |
| 공개 배포 artifact | https://github.com/3hs3624/portal01/actions/runs/43788853182/artifacts/14191781759 | verified-web-release, 보고서와 hash manifest 포함, 30일 보관 |
| 실패 주입 | https://github.com/3hs3624/portal01/actions/runs/43787977198 | unit 고의 실패; 다른5묶음/design 성공; release-ready/deploy skipped. 별도 ci-probe 브랜치이며 운영 코드에 병합하지 않음 |
| 설치형 commit | b8075f9a2c010659c35c04f513f6afd9b3043163 | 웹과 같은 회귀·추가 preview 의존성 |
| 설치형 최종 | https://github.com/3hs3624/portal01/actions/runs/43788857190 | 6회귀묶음 및 Windows2025/LinuxUbuntu22.04/Mac15 ARM/Mac15 Intel smoke·패키징 모두 success |
| 로컬 계약 검사 | tests/release_gate.py / tests/design_docs.py | 각각15개/10개 검사 성공; 최신 unit13명령 묶음 성공 |

### 웹 관문 활성화 대기와 해소 절차

GitHub Actions의 pages:write 토큰으로 Pages source를 legacy에서 workflow로 변경하려 했으나 GitHub API가 Resource not accessible by integration(403)을 반환했습니다. 현재 연결된 GitHub 도구에는 저장소 Pages 설정 변경 기능이 없고 CLI API도 접근 제한이 있어 관리자 설정 변경을 수행하지 못했습니다. 자동 승인 심사 거절이 아니라 GitHub/API 권한 제한입니다.

저장소 소유자가 GitHub 저장소 Settings > Pages > Build and deployment > Source를 **GitHub Actions**로 한 번 변경한 뒤, gh-pages의 최신 Quality gate and web release를 재실행합니다. deploy 성공과 후속 Restore verified web release의 validate 성공/deploy skipped를 확인하면 별도 실행 이력으로 활성화 완료를 추가합니다. 토큰 공유는 필요하지 않습니다.

현재 웹 주소와 기존 legacy Pages는 유지되며, 새 관문이 production을 보호한다고 표시하지 않습니다. 초기 반영은 업무 UI/저장 데이터가 아닌 CI·테스트·설계서 변경입니다. 기존 legacy build 성공을 새 gated 배포 성공으로 기록하지 않습니다. 실제 production 원복과 원격 복구 예행은 미검증입니다.

계획3~5인일은 추정치이며 실제 인일은 미측정입니다. 실행일2026-11-16에 구현·검증 범위를 수행했습니다. E01-2와 E02~E12는 본 실행의 완료 범위에 포함하지 않습니다.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/desktop.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/desktop.md)
- [docs/design/executions/2026-11-16-e01.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/executions/2026-11-16-e01.md)
- [.github/workflows/quality-gate.yml](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/.github/workflows/quality-gate.yml)
- [.github/workflows/business-regression.yml](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/.github/workflows/business-regression.yml)
- [.github/workflows/restore-web-release.yml](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/.github/workflows/restore-web-release.yml)
- [scripts/regression.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/scripts/regression.py)
- [scripts/stage_release.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/scripts/stage_release.py)
- [tests/release_gate.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/release_gate.py)
