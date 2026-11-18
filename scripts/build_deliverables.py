#!/usr/bin/env python3
"""Rebuild Portal's REA-shaped documentation from the checked-in design baseline.

No Drive write, application deployment or production-data operation is performed.
Drive IDs and publication checks are kept separately in drive-publication.json.
"""
from pathlib import Path
import hashlib,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/deliverables'
DESIGN=ROOT/'docs/design'
DATE='2026-11-18'
WEB='33fc8d703028d14819db78910b08d018bd04bca1'
DESKTOP='14fd9acc4c7f2fba1e4523b2f209662318030143'
BASE=f'https://github.com/3hs3624/portal01/blob/{WEB}/'
REA='https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1'
PORTAL='https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe'
MANIFEST=[]

def write(folder,name,body,sources=()):
    path=OUT/folder/(name+'.md');path.parent.mkdir(parents=True,exist_ok=True)
    intro=f'# {name}\n\n작성 기준: {DATE}(KST). 웹 {WEB[:7]}, 설치형 {DESKTOP[:7]}. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.\n\n'
    refs='\n## 근거와 연관 문서\n\nREA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.\n\n'
    refs+=f'- [REA 참조 산출물]({REA})\n- [Portal 문서 관리 위치]({PORTAL})\n'
    refs+=''.join(f'- [{s}]({BASE}{s})\n' for s in sources)
    path.write_text(intro+body.strip()+'\n'+refs,encoding='utf-8')
    MANIFEST.append({'folder':folder,'title':name,'path':path.relative_to(ROOT).as_posix(),'sources':list(sources),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

def source(fn):return (DESIGN/fn).read_text()

def section(fn,start,end=None):
    s=source(fn);a=s.index(start);b=s.index(end,a) if end else len(s)
    return s[a:b].strip()

def detail(text):
    # Keep all original paragraphs/tables, nest source headings below the appendix.
    return re.sub(r'^(#{1,5}) ',lambda m:'#'+m[1]+' ',text,flags=re.M)

write('01_계획','Portal 수행계획서 v0.1 (팀 운영 비교안)', '''
## 문서의 위치와 상태

상태는 제안, 실제 팀 구성과 예산은 미확정입니다. REA의 팀 수행계획서에 대응하는 비교안이며 과거 승인본을 재현한 문서가 아닙니다. 현재 실행 기준은 1인과 AI 활용안 및 기존 개선 계획입니다. 팀 확대를 승인했다는 의미가 없습니다.

## 목적과 산출물

Write Studio, Project Management, Insight BI의 현재 데이터와 사용 흐름을 유지하면서 저장 신뢰성, 공유 구분, 설치형 업무 완결성을 높입니다. 결과물은 기존 네 정의서, 기능별 PTL 명세, 설계 결정 기록, 검증 보고서, 계획 대비 실행 이력입니다.

| 역할 | 책임 | 인수 조건 |
|---|---|---|
| 제품 책임 | 범위, 우선순위, 대상 OS, 사용자 검수 판단 | 범위와 미완료 항목 확인 |
| 개발 책임 | 공통 저장, 앱 기능, Electron 경계 구현 | PTL ID와 코드 변경 대응 |
| 품질 책임 | 정상/실패/충돌, 데이터 왕복, OS 검수 | 환경과 commit에 연결된 실행 증거 |
| 문서 책임 | 화면, 기능, 코드, 테이블과 이력 동기화 | 링크와 버전, 변경 이력 일치 |

한 사람이 여러 역할을 수행할 수 있습니다. 별도 인력 수, 인건비, 출시일은 지정하지 않습니다. 코드 작성자가 자동으로 최종 검수 승인자가 되지 않으며 실제 검수 여부를 명시합니다.

## 작업 흐름과 게이트

요구와 현행 근거 확인 → PTL 명세의 정상/실패 시나리오 → 구현 → 관련 자동 검사 → 실환경 검증 → 설계서와 이력 갱신 순서입니다. 데이터 삭제나 계정 권한 변경은 문서 정리 작업에 포함하지 않습니다.

G0는 문서와 실행 근거 정합성, G1은 웹 배포 관문, G2는 외부 복원, G3는 설치형 핵심 업무, G4는 서명/업데이트 인수로 정의합니다. REA의 법무 게이트와 같은 이름을 사용하더라도 Portal의 별도 기준입니다.

## 일정과 전환 조건

기존 E01~E09의 60~100인일 추정은 개발자 1명 전담 기준입니다. 팀으로 나누면 그 수치를 단순히 인원수로 나누지 않습니다. 공유 저장과 데이터 이전처럼 선행 계약이 있는 작업은 같은 기준으로 검증합니다. 실제 가용 시간과 담당자가 정해진 후 별도 일정 승인을 받습니다.

## 변경 통제

현재는 웹 정적 앱과 Electron 개발판을 유지합니다. 새 백엔드 프레임워크, REA의 ITSM 엔진, 17명 조직, 법무 일정은 채택하지 않습니다. 새로운 요구는 기존 E 번호 또는 새 번호에 연결하고 현재 구현/계획/검증을 구분합니다.
''', ['docs/design/improvement-roadmap.md','docs/design/handoff.md'])

write('01_계획','G0 실행 체크리스트 v1.0', '''
## 게이트 정의

G0는 Portal 산출물과 릴리스 준비의 착수 점검입니다. 상태는 부분 충족, 배포 관문 활성화 대기입니다. 체크된 항목은 문서 작성 기준의 확인 범위에 한정됩니다.

| ID | 확인 항목 | 판정 | 근거 또는 다음 조치 |
|---|---|---|---|
| G0-01 | REA 5폴더/17문서 구조와 명세 형식 확인 | 확인 | 2026-11-18 Drive 원문 열람 |
| G0-02 | Portal 기존 네 정의서와 원본 보존 | 확인 | 기존 ID를 유지하고 02_명세로 분류 |
| G0-03 | 웹/설치형 기준 SHA 식별 | 확인 | 웹33fc8d7, 설치형14fd9ac |
| G0-04 | 6회귀묶음, 24명령 증거 | 확인 | 정상 후보43789420296 및 이전 E01 실행 이력 |
| G0-05 | 의도적 실패 시 release-ready/deploy 건너뛰기 | 확인 | 실패 시험43787977198 |
| G0-06 | Pages source=GitHub Actions | 대기 | source 변경이403으로 거부됨. 소유자 설정 필요 |
| G0-07 | 관문을 통한 웹 production 배포 | 미완료 | legacy Pages 성공을 새 관문 성공으로 대체하지 않음 |
| G0-08 | 원격 artifact 복구 예행 | 미검증 | 관문 배포 성공 후 validate 성공/deploy skipped 확인 |
| G0-09 | 설치형 실제 계정/파일/WBS/IME | 미완료 | 4대상 smoke/packaging과 별도 |
| G0-10 | 새 프로필에서 외부 백업 복원 | 미착수 | E02 실행 시 fixture와 semantic 비교 |
| G0-11 | 사용자 검수와 우선 OS 확정 | 미확정 | 실제 사용 환경 확인 |

## 해소 순서

저장소 소유자가 Settings > Pages > Build and deployment > Source를 GitHub Actions로 변경합니다. 최신 gh-pages Quality gate and web release를 재실행하고 deploy 성공을 확인합니다. 이어지는 Restore verified web release가 검증만 수행하고 재배포하지 않았는지 확인합니다. 이 결과를 새 실행 이력으로 추가하기 전에는 상태를 완료로 바꾸지 않습니다.

## 실패 시 조치

실패한 case, commit, 환경, 로그 링크를 보관하고 다른 묶음의 성공으로 상쇄하지 않습니다. 토큰을 문서나 채팅에 복사하지 않습니다. 운영 사용자 자료를 복원 시험용 fixture로 쓰지 않습니다. 본 체크리스트를 작성한 것이 위 대기 작업을 실행했다는 의미가 아닙니다.
''',['docs/design/executions/2026-11-16-e01.md','.github/workflows/quality-gate.yml','.github/workflows/restore-web-release.yml'])

write('01_계획','Portal 수행계획서 v0.2 (1인 + AI 활용안)', '''
## 운영 기준

상태는 현행 운영 방식의 정리와 후속 제안입니다. 사용자는 범위, 최종 검수, 환경 설정과 업무 판단을 맡고 AI는 허용된 작업의 분석, 명세, 구현, 테스트, 문서 정리를 수행합니다. 이 문서는 별도 하위 에이전트 실행을 요청하거나 자동화 작업을 예약하지 않습니다.

## 목표와 원칙

기존 세 앱을 유지하고 웹과 설치형의 공통 업무 계약을 하나로 관리합니다. 자동저장 성공과 외부 저장본 반영 성공을 구분하며 개인본과 공유본을 혼동하지 않게 합니다. 자료를 바꾸기 전에 백업과 대상 버전 검증을 완료합니다.

## 일의 단위

작업 하나에는 계획 ID, PTL 명세 ID, 입력/출력, 정상 흐름, 실패/취소, 데이터 영향, 검증 환경, 코드 기준, 문서 변경이 포함됩니다. 과거 계획을 최신 결과로 지우지 않고 날짜별 실행 항목을 추가합니다. 필수 변경이 빠진 채 테스트 수만 늘려 완료 처리하지 않습니다.

| 단계 | AI가 준비하는 결과 | 확인 기준 |
|---|---|---|
| 분석 | 코드/설계의 현재 동작과 요청 차이 | 추측 대신 원문 경로와 version |
| 명세 | PTL 규칙, 권한, 오류, 인수 시나리오 | 현행/신규/범위 밖 구분 |
| 구현 | 승인된 범위의 변경과 관련 검사 | 기존 데이터 계약 유지 |
| 검증 | 성공/실패, 실환경/fixture 결과 | 실제 실행과 미실행 구분 |
| 기록 | 계획 대비 차이, 근거, 남은 일 | Portal 관리본과 소스 사본 연결 |

## 우선순위와 일정

첫 단위 E01-1의 코드와 회귀 검증은 완료했으나 production 관문 활성화는 대기입니다. E01-2 OS 업무 시험과 E02 백업 복원을 다음 중요 항목으로 유지합니다. E03 공유 흐름, E04 설치형 수직 기능, E05 Excel, E06 문서, E07 BI, E08 SQLite, E09 정식 패키징은 기존 의존관계를 따릅니다.

가용 시간, 목표 OS, 인증서 준비 기간이 확인되지 않았으므로 새 달력 출시일을 약속하지 않습니다. 60~100인일은 기존 계획의 추정이며 AI 처리 시간이나 경과 일수와 같지 않습니다. 실제 공수는 미측정입니다.

## 품질과 데이터 보호

fixture 회귀와 실제 인증/OS 시험을 별도 기록합니다. 개인 작업 사본은 계정별 namespace, 서버는 RLS/RPC를 사용합니다. 비교 중 작업본이나 외부 revision이 달라지면 다시 확인합니다. 데이터 삭제, 초대 메일, 사용자 권한 부여를 문서 작성에 부수적으로 실행하지 않습니다.

## 기록과 인수

Drive Portal의 원본 ID를 유지하고 같은 작업에서 관련 정의서와 작업 기록을 갱신합니다. 출처 파일 hash, 발행된 Doc ID, 대상 폴더, 검증 범위를 목록으로 남깁니다. 지원되지 않는 기능은 미래 계획으로 기록합니다. 실제 사용자 검수 전에는 검토자가 승인한 것으로 쓰지 않습니다.
''',['AGENTS.md','docs/design/improvement-roadmap.md','docs/design/execution-history.md'])

write('01_계획','Portal 리스크 관리대장 v1.0', '''
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
''',['docs/design/executions/2026-11-16-e01.md','docs/design/improvement-roadmap.md','docs/design/desktop.md'])

write('01_계획','Portal 기능 범위 정의서 v1.0', '''
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
''',['docs/design/functional-design.md','docs/design/screen-design.md','docs/design/code-definition.md','docs/design/table-definition.md','docs/design/improvement-roadmap.md'])

SPECS=[
('PTL-01 인증과 권한 관리', '등록 사용자가 자기 권한 안에서 포털과 세 앱에 접근하도록 합니다.', ['functional-design.md'], lambda:section('functional-design.md','## 1. 공통 처리 원칙','## 3. 저장소'),
 ['login.js','app.js','portal-admin.sql','tests/portal_sso.py','tests/user_invite_handler.mjs'],
 [('계정과 앱 접근','인증된 사용자와 앱 read 권한이 있다','앱을 선택한다','권한이 있는 앱만 열리고 계정별 작업 사본이 적용된다'),('등록되지 않은 사용자','등록되지 않은 이메일이다','OTP 로그인을 요청한다','새 계정을 자동 생성하지 않고 허용되지 않은 접근을 거부한다'),('조회 사용자 쓰기','앱 read만 있고 write가 없다','클라우드 내용을 변경하려고 한다','서버가 쓰기를 거부한다'),('계정 전환','A 계정의 개인 작업 사본이 있다','로그아웃 후 B 계정으로 들어온다','A의 로컬 문서가 B의 개인 목록으로 노출되지 않는다')]),
('PTL-02 자동저장과 저장소 연결', '작업 사본 저장과 외부 저장 반영을 명확히 구분합니다.', ['functional-design.md'],lambda:section('functional-design.md','### FN-C01','### FN-C03'),
 ['storage-status.js','storage-flow.js','tests/storage_feedback.py','tests/write_studio_storage_flow.py'],
 [('저장 성공','개인 문서에 변경이 있고 작업 사본 쓰기가 가능하다','자동저장 트랜잭션이 성공한다','작업 사본 완료로 표시하고 외부 미반영 상태는 별도 유지한다'),('저장 실패','dirty 입력이 있고 IndexedDB 쓰기가 실패한다','저장 결과를 처리한다','입력과 dirty를 유지하고 실패/재시도 상태를 표시한다'),('이전 응답','generation N을 저장하는 동안 N+1 변경이 있다','N 성공 응답을 받는다','N+1까지 저장 완료로 표시하지 않는다'),('폴더 선택 취소','현재 작업이 있다','폴더 선택을 취소한다','기존 데이터를 이동하거나 지우지 않는다')]),
('PTL-03 충돌 비교와 백업 복구', '충돌을 날짜만으로 덮어쓰지 않고 두 사본을 보호한 뒤 적용합니다.', ['functional-design.md'],lambda:section('functional-design.md','### FN-C03','## 4.'),
 ['apps/markdown/storage-compare.js','storage-flow.js','tests/storage_compare.cjs','tests/folder_storage_conflicts.cjs','tests/shared_storage_flow.py'],
 [('양쪽 보관','현재와 저장본의 동일 항목이 모두 변경됐다','둘 다 보관을 선택한다','앱별 ID/참조를 재매핑하고 두 자료를 유지한다'),('적용 전 변경','비교 후 현재 generation 또는 외부 revision이 바뀐다','적용한다','오래된 비교로 덮어쓰지 않고 재비교를 요구한다'),('백업 실패','교체 전에 한쪽 백업이 실패한다','불러오기를 확정한다','교체를 중단하고 기존 작업을 유지한다'),('전체 복원','BI 복구본에 소스/보드/링크가 있다','복원한다','연결 참조를 함께 복원한다. 새 환경 외부 복구 시험은 E02로 별도 수행한다')]),
('PTL-04 항목 공유와 공동 작업', '소유자가 등록 사용자에게 조회 또는 편집 권한으로 항목을 공유합니다.', ['common.md'],lambda:source('common.md'),
 ['item-sharing.js','portal-item-sharing.sql','ITEM-SHARING.md','tests/item_sharing_ui.py','tests/item_sharing_sql.mjs'],
 [('사용자 선택','소유자가 공유 창을 연다','이름/이메일로 검색해 등록 사용자를 선택한다','맨 왼쪽 체크박스와 이름이 한 행에 표시되고 선택 수가 갱신된다'),('조회 권한','사용자가 view로 공유받았다','공유 항목을 연 뒤 저장을 시도한다','내용을 조회할 수 있고 쓰기는 서버에서 거부된다'),('편집 권한','사용자가 edit이고 expected revision이 최신이다','공유 저장을 완료한다','공유 작업공간 revision이 갱신되고 개인 원본과 별도 상태로 표시된다'),('권한 회수','소유자가 사용자 공유를 회수했다','해당 사용자가 다음 서버 요청을 보낸다','접근이 거부된다. 이미 내려받은 데이터를 DRM으로 삭제하지 않는다')]),
('PTL-05 Write Studio 문서와 표 편집', '문서와 확장 블록을 UI 상태와 데이터 계약을 유지하며 편집합니다.', ['write-studio.md'],lambda:source('write-studio.md'),
 ['apps/markdown/BLOCKS.md','tests/table_axis_drag.py','tests/editor_view_transition.py','tests/database_usability.py','tests/document_view_options.py'],
 [('DB 새 페이지 입력','편집 가능한 DB가 있다','새 페이지 제목 입력 후 Enter 또는 표 밖을 클릭한다','제목을 한 번 확정하고 해당 열 폭에 맞는 셀로 표시한다'),('머리글 고정','첫 행 또는 첫 열이 머리글 고정이다','해당 축 또는 그 위치로 다른 축을 드래그한다','고정 영역 순서 변경을 제한한다'),('드래그 취소','행/열을 끄는 중이다','Esc를 누른다','원래 순서로 복원되고 편집창 밖 삽입선이 남지 않는다'),('Markdown 전환','리치 표 도구가 보인다','Markdown 보기로 전환하고 편집창을 스크롤한다','리치 핸들이 숨겨지고 원본 textarea와 줄 번호가 정상 배치된다'),('문서별 옵션','문서A와 B의 editorOptions가 다르다','문서를 전환하고 다시 연다','직접 편집/스크롤 동기화/양방향 선택을 문서별로 복원한다')]),
('PTL-06 Project Management WBS와 Excel', '프로젝트, WBS, 원본 Excel 템플릿을 함께 보존하며 일정과 진척을 관리합니다.', ['project-management.md'],lambda:source('project-management.md'),
 ['apps/projects/index.html','apps/projects/workbook-preserve.js','tests/projects_excel.py','tests/projects_sample_choices.py','tests/project_relational_sql.mjs'],
 [('원본 왕복','원본 workbook과 행 mapping이 유효하다','진척을 변경해 업로드/다운로드한다','WBS/기준정보/달력, 수식, 서식, 조건부 서식과 원본 구조의 보존 검사를 수행한다'),('구조 변경','행 추가로 원본 mapping이 달라졌다','다운로드한다','원본 그대로 보존된다고 오인시키지 않고 해당 새 레이아웃 계약을 적용한다'),('sample 유지','샘플 WBS가 있다','샘플 표시만 해제를 선택한다','데이터를 유지하고 샘플 상태를 해제한다'),('빈 WBS','샘플 WBS가 있다','빈 WBS로 시작을 명시 선택한다','샘플 단계를 삭제하고 빈 작업으로 시작한다'),('집계','하위 태스크의 계획 공수E와 경과J, 실적L이 있다','상위 진척을 계산한다','계획률은 ΣJ/ΣE, 실적률은 ΣL/ΣE이고 단순 퍼센트 평균으로 바꾸지 않는다')]),
('PTL-07 Insight BI 데이터와 대시보드', '데이터 연결과 차트 구성을 함께 관리하고 오래된 상세 창의 덮어쓰기를 막습니다.', ['insight-bi.md'],lambda:source('insight-bi.md'),
 ['apps/insight/index.html','tests/shared_storage_flow.py','tests/item_sharing_ui.py','tests/content_relational_sql.mjs'],
 [('오래된 상세 창','열린 창의 source revision이 원본보다 오래됐다','저장 요청을 보낸다','현재 데이터를 덮어쓰지 않고 다시 열도록 안내한다'),('열 제거','저장 차트에서 참조하는 열이 교체본에 없다','데이터를 교체한다','열 연결 오류를 표시하고 임의 다른 열로 바꾸지 않는다'),('원본 행 확인','차트가 현재 필터 데이터로 집계됐다','차트 원본 행 보기를 연다','적용 필터와 해당 원본 행을 확인할 수 있다'),('공유 보드','조회 또는 편집으로 보드를 공유받았다','보드를 연다','소스/시트 포함 범위를 표시하고 받은 권한에 따라 저장을 제한한다')]),
('PTL-08 설치형과 릴리스 관문', '동일 업무 자산을 안전한 Electron 셸과 검증된 릴리스 흐름으로 제공합니다.', ['desktop.md','executions/2026-11-16-e01.md'],lambda:source('desktop.md')+'\n\n'+source('executions/2026-11-16-e01.md'),
 ['.github/workflows/quality-gate.yml','.github/workflows/business-regression.yml','.github/workflows/restore-web-release.yml','scripts/regression.py','scripts/stage_release.py','tests/release_gate.py'],
 [('실패 관문','동일 commit의 unit case 하나가 실패한다','릴리스 흐름을 실행한다','release-ready와 deploy를 건너뛴다'),('증거 변조','artifact의 자산 hash나 source_sha가 다르다','배포 또는 복원을 검증한다','거부하고 배포 성공으로 표시하지 않는다'),('개발판 패키징','회귀와 4대상 preview가 성공했다','검증 범위를 기록한다','smoke/packaging 성공으로 쓰고 실제 인증/WBS/IME 성공으로 확대하지 않는다'),('현재 Pages 설정','source 변경 요청이403이다','관문 배포를 시도한다','실패를 표시하고 소유자 설정 조치를 안내한다'),('자동 복구 예행','검증된 production gate가 성공했다','workflow_run 복구를 수행한다','검증만 수행하고 deploy는 skipped여야 한다. 현 상태에서는 아직 미검증이다')])
]

for title,purpose,srcs,getdetail,paths,scenarios in SPECS:
    code=title.split()[0]
    rows='\n'.join(f'| {code}-AT{i:02d} {n} | {given} | {when} | {then} |' for i,(n,given,when,then) in enumerate(scenarios,1))
    body=f'''## 식별과 상태

명세 ID: {code}. 버전1.0. 기존 구현의 문서화 초안이며 사용자 승인일은 미기재입니다. 아래 인수 시나리오는 검수 기준입니다. 테스트 파일의 존재와 이번 문서 검토는 해당 시나리오 실행 성공을 뜻하지 않습니다.

## 목적

{purpose}

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
{rows}

## 결정과 검증 기록

2026-11-18: REA 형식에 맞춰 Portal 자체 명세로 추출했습니다. 현재 구현과 계획의 차이는 작업 기록과 검토 결과에 남깁니다. 사용자 승인과 실행 결과는 이후 날짜별로 추가합니다.

## 구현 상세 원문

아래 내용은 기존 Portal 설계에서 추출한 상세입니다. 표의 필드·동작·보존·오류를 생략하지 않았으며 문서 내 원래 상대 참조의 원본은 근거 파일에서 확인할 수 있습니다.

{detail(getdetail())}
'''
    write('02_명세',title+' 명세 v1.0',body,['docs/design/'+s for s in srcs]+paths)

ADR=[
('PADR-001','세 앱과 정적 웹 셸 유지','현행 구현 재구성','app.js, apps/*, pages-guard.js','하나의 포털에서 동일 Origin 앱과 공통 인증을 사용합니다.','현재 셸 유지 / 새 SPA 일괄 전환','현행을 설명하며 프레임워크 전환은 채택하지 않습니다.','메시지와 parent/opener 계약을 유지해야 합니다.','앱 격리 방식 또는 보안 경계 변경 요구 시'),
('PADR-002','로컬 저장과 관계형/JSONB 혼합','현행 구현 재구성','CONTENT-RELATIONAL-STORAGE.md, PROJECT-RELATIONAL-STORAGE.md','유동 블록과 설정은 JSONB, 조회/참조 구조는 관계형, 파일은 별도 저장 경로를 사용합니다.','전체 JSON / 전체 정규화 / 혼합','현재 hybrid 원형과 JSON/폴더 호환을 보존합니다.','JSON을 없앴다고 안내하지 않으며 전체 파일 참조 검증이 필요합니다.','새 schema 또는 offline 동기화 설계 시'),
('PADR-003','저장 사본/외부본/공유본 상태 분리','현행 구현 재구성','storage-status.js, docs/design/functional-design.md','한 위치 저장 성공을 다른 위치 성공으로 표시하지 않습니다.','통합 성공 표시 / 위치별 상태','generation에 대응한 실제 저장 성공을 사용합니다.','사용자는 반영 대기·실패를 구분할 수 있어야 합니다.','외부 자동 반영 정책 E02 결정 시'),
('PADR-004','CAS와 양쪽 백업 기반 교체','현행 구현 재구성','apps/markdown/storage-compare.js, storage-flow.js','비교 후 변경될 수 있으므로 적용 직전에 revision과 현재 generation을 다시 검사합니다.','최신 시각 덮어쓰기 / CAS와 백업','양쪽 자료 보호 후 명시 적용합니다.','백업 실패는 교체 실패이며 생성일은 우선권이 아닙니다.','서버 병합 또는 실시간 동시편집 도입 시'),
('PADR-005','항목 단위 별도 공유 작업공간','현행 구현 재구성','ITEM-SHARING.md, portal-item-sharing.sql','개인 원본과 공유 변경을 별도로 관리합니다.','개인 원본 링크 / 독립 공유 workspace','소유자와 view/edit 권한, 서버 인가, expected revision을 사용합니다.','원본 삭제 후에도 소유자의 공유 관리 경로가 필요합니다.','원본/공유본 자동 동기화 요구 시'),
('PADR-006','문서별 메타데이터와 확장 블록','현행 구현 재구성','apps/markdown/BLOCKS.md, docs/design/write-studio.md','일반 Markdown만으로 DB/보기/댓글/옵션을 모두 표현할 수 없습니다.','표준 Markdown만 / 안정 ID와 확장 데이터','기존 확장 원형과 문서별 editorOptions를 유지합니다.','표준 리더 요약과 Portal 편집 원형을 구분합니다.','포맷 version 변경 시'),
('PADR-007','원본 workbook 보존과 행 mapping','현행 구현 재구성','apps/projects/workbook-preserve.js, docs/design/project-management.md','수식·조건부 서식은 값만 내보내기로 재현할 수 없습니다.','값 기반 새파일 / 원본 패키지 변경','원본 바이너리와 mapping을 유지하고 변경 셀을 반영합니다.','구조 변경은 원본 그대로 보존 범위와 구분해야 합니다.','E05 실제 재계산/구조검증 확장 시'),
('PADR-008','BI 전체 참조와 상세창 revision 계약','현행 구현 재구성','docs/design/insight-bi.md, docs/design/code-definition.md','소스/시트/보드/링크와 열린 상세창은 서로 참조합니다.','시트만 교체 / 전체 검증과 revision','교체/복구는 ID 참조와 메시지 requestId·Origin·revision을 검증합니다.','오래된 창의 자동 재저장은 허용하지 않습니다.','멀티윈도 공유편집 모델 변경 시'),
('PADR-009','Electron 프로토콜과 최소 권한','현행 구현 재구성','docs/design/desktop.md, desktop-preview/desktop/src','Node를 편집 renderer에 노출하지 않고 웹 자산을 제공합니다.','file://+Node / custom protocol+sandbox','현행 custom protocol, contextIsolation, 탐색/경로 제한을 유지합니다.','프로필 분리와 미완료 native 파일/창 업무를 명시합니다.','HostBridge 또는 WebContentsView 도입 시'),
('PADR-010','동일 commit 회귀와 무결성 artifact','구현됨 / 웹 활성화 대기','scripts/regression.py, scripts/stage_release.py, .github/workflows/quality-gate.yml','실패 commit이나 다른 commit의 증거로 배포하지 않습니다.','별도 branch build / gate artifact','6suite/24command와 hash manifest를 요구하는 관문 코드를 적용했습니다.','Pages source 변경403으로 실제 관문 배포는 대기입니다.','소유자 source 설정과 원격 복구 예행 완료 시'),
('PADR-011','설치형 저장 계층 분리와 정식 배포','제안 / 미구현','docs/design/improvement-roadmap.md E04/E08/E09','프로토타입을 실제 업무 설치형으로 완성하려면 창/파일/인증/저장을 분리 검증해야 합니다.','renderer 직접 접근 / 좁은 HostBridge+Main 서비스','후자를 검토 대상으로 유지하며 SQLite·키링·서명·업데이트 완료로 기록하지 않습니다.','데이터 이전과 offline 정책, rollback 호환성의 구체 설계가 필요합니다.','실제 우선 OS와 업무 검증 범위 확정 시')
]
body='''## 적용 기준

REA의 ADR-001~011 구성 방식을 따르지만 Portal 결정 식별자는 PADR입니다. 기존 코드에서 확인된 선택은 사후 재구성 기록이며 새로 사용자 승인을 받은 것으로 쓰지 않습니다. 제안은 구현과 별개입니다. REA의 Spring/Carbon/워크플로/결재 엔진 결정은 적용하지 않습니다.
'''
for ident,subject,status,evidence,context,options,decision,consequence,revisit in ADR:
    body+=f'\n## {ident} {subject}\n\n상태: {status}. 기록일: {DATE}. 승인일: 별도 확인 없음.\n\n### 배경\n\n{context}\n\n### 선택지\n\n{options}\n\n### 결정 또는 현행 선택\n\n{decision}\n\n### 결과와 경계\n\n{consequence}\n\n### 재검토 조건과 근거\n\n{revisit}. 근거: {evidence}.\n'
write('03_설계(ADR)','Portal ADR 모음 (PADR-001~011) v1.0',body,['docs/design/common.md','docs/design/desktop.md','docs/design/improvement-roadmap.md','docs/design/executions/2026-11-16-e01.md'])

write('05_검토','Portal 산출물 구성과 명세 정합성 점검 결과 v1.0', '''
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
''',['AGENTS.md','docs/design/README.md','docs/design/execution-history.md','docs/design/executions/2026-11-16-e01.md'])

# Existing source documents are reused; never fabricate historical equivalents.
for folder,title,src in [('01_계획','Portal 개발 계획서 (기존 개선 검토 및 실행 계획)','improvement-roadmap.md'),('04_작업기록','Portal 개선 계획 대비 실행 이력','execution-history.md')]:
    write(folder,title,source(src),['docs/design/'+src])

for fn in ['screen-design.md','functional-design.md','code-definition.md','table-definition.md']:
    MANIFEST.append({'folder':'02_명세','title':'기존 '+fn,'path':'docs/design/'+fn,'sources':['docs/design/'+fn],'sha256':hashlib.sha256((DESIGN/fn).read_bytes()).hexdigest(),'reuse':True})
inputs=sorted({p for m in MANIFEST for p in m['sources'] if (ROOT/p).is_file()})
manifest={'schema':1,'date_kst':DATE,'web_sha':WEB,'desktop_sha':DESKTOP,'reference_folder':REA,'destination_folder':PORTAL,'documents':MANIFEST,'source_hashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in inputs}}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {sum(not m.get("reuse") for m in MANIFEST)} REA-role documents; retained 4 original design contracts')
