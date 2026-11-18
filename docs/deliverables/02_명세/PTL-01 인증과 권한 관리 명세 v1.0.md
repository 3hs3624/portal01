# PTL-01 인증과 권한 관리 명세 v1.0

작성 기준: 2026-11-18(KST). 웹 33fc8d7, 설치형 14fd9ac. 문서 발행은 제품 승인이나 실제 OS 업무 검증 완료를 뜻하지 않습니다.

## 식별과 상태

명세 ID: PTL-01. 버전1.0. 기존 구현의 문서화 초안이며 사용자 승인일은 미기재입니다. 아래 인수 시나리오는 검수 기준입니다. 테스트 파일의 존재와 이번 문서 검토는 해당 시나리오 실행 성공을 뜻하지 않습니다.

## 목적

등록 사용자가 자기 권한 안에서 포털과 세 앱에 접근하도록 합니다.

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
| PTL-01-AT01 계정과 앱 접근 | 인증된 사용자와 앱 read 권한이 있다 | 앱을 선택한다 | 권한이 있는 앱만 열리고 계정별 작업 사본이 적용된다 |
| PTL-01-AT02 등록되지 않은 사용자 | 등록되지 않은 이메일이다 | OTP 로그인을 요청한다 | 새 계정을 자동 생성하지 않고 허용되지 않은 접근을 거부한다 |
| PTL-01-AT03 조회 사용자 쓰기 | 앱 read만 있고 write가 없다 | 클라우드 내용을 변경하려고 한다 | 서버가 쓰기를 거부한다 |
| PTL-01-AT04 계정 전환 | A 계정의 개인 작업 사본이 있다 | 로그아웃 후 B 계정으로 들어온다 | A의 로컬 문서가 B의 개인 목록으로 노출되지 않는다 |

## 결정과 검증 기록

2026-11-18: REA 형식에 맞춰 Portal 자체 명세로 추출했습니다. 현재 구현과 계획의 차이는 작업 기록과 검토 결과에 남깁니다. 사용자 승인과 실행 결과는 이후 날짜별로 추가합니다.

## 구현 상세 원문

아래 내용은 기존 Portal 설계에서 추출한 상세입니다. 표의 필드·동작·보존·오류를 생략하지 않았으며 문서 내 원래 상대 참조의 원본은 근거 파일에서 확인할 수 있습니다.

### 1. 공통 처리 원칙

1. 앱 권한과 항목 권한을 모두 충족해야 쓰기를 허용합니다. 버튼 비활성은 UX이며 서버 인가를 대신하지 않습니다.
2. 편집 중 데이터, 브라우저 작업 사본, 선택한 외부 저장본, 공유 작업공간은 서로 다른 상태입니다. 한 상태의 성공을 다른 상태의 성공으로 표시하지 않습니다.
3. 교체/병합 전에 현재 작업과 대상 저장본을 검증하고 양쪽 백업을 완료합니다. 백업 실패 시 교체를 중단합니다.
4. 비교 시점과 적용 직전에 generation·semantic fingerprint·revision을 검사합니다. 날짜가 더 최신이라는 이유만으로 다른 저장 버전을 덮어쓰지 않습니다.
5. 상태가 불명확한 네트워크/메일/삭제 작업은 성공을 추정하거나 무조건 재시도하지 않습니다.
6. 문자열 길이는 해당 UI/validator/DB 제약을 모두 적용합니다. 바이트 제한은 UTF-8/직렬화 크기 기준이며 글자 수와 다릅니다.

### 2. 인증·권한·관리

#### FN-A01 이메일 OTP 로그인과 앱 접근

연결 화면: SC-P01/P02. 입력은 이메일/OTP, 출력은 인증 세션과 `{user,permissions,…}` 서버 권한 컨텍스트입니다. 이메일 전송 시 `shouldCreateUser:false`, OTP 검증 후 `portal_auth_context`를 호출합니다. enabled=false 또는 권한 컨텍스트를 얻지 못하면 앱을 열지 않습니다. 기존 세션 복원도 같은 권한 검사를 거칩니다. 앱 진입은 app.<id>.read, 클라우드/공유 쓰기는 read+write가 필요합니다.

앱 직접 URL은 동일 Origin의 인증된 부모/허용된 상세 창을 검증하고 계정별 스토리지 namespace를 적용합니다. 인가되지 않은 앱은 숨기고 포털 로그인으로 이동합니다. 주기적 권한 갱신 중 계정 변경/이용 중지는 열린 프레임을 정리합니다. 불러온 내용을 소급 회수하는 DRM 기능은 아닙니다.

검수: 등록되지 않은 이메일 자동 생성 없음; A 계정 로컬 문서가 B에서 보이지 않음; 이용 중지 후 신규 RPC 거부; 로그아웃 후 iframe 접근 차단. 근거: login.js, app.js, pages-guard.js, tests/portal_sso.py, tests/auth_links.py.

#### FN-A02 관리 데이터 및 사용자 초대

연결 화면 SC-P03. 사용자/그룹/역할 조회는 section별 권한과 system.access, 쓰기는 manage 권한을 추가 확인합니다. 직접 역할과 그룹 역할의 권한은 합집합이며 enabled를 먼저 검사합니다. 위임 관리자는 자신보다 큰 권한을 부여·회수하거나 높은 권한 대상을 임의 변경할 수 없습니다. 본인/마지막 활성 관리자 보호를 적용합니다.

초대는 Edge Function→Auth getUser→서버 권한→reserve RPC→Auth 초대 발송→finish RPC 순서입니다. 이메일 소문자·공백 제거, 254자/형식, 표시 이름 100자를 검사합니다. 동일 이메일 10분, 관리자 분당 5건, 전체 하루 100건 제한을 잠금 안에서 검사합니다. 성공 시 신규 profile에 member 역할만 초기 부여합니다. pending/sent/failed 이력과 감사 이벤트를 보관합니다. 클라이언트 전달 관리자 ID/역할은 신뢰하지 않습니다.

검수: 초대 실패에도 관리자 승격 없음, 중복/제한 거부, 일부 결과 불명확 시 자동 메일 재발송 없음. 근거: portal-admin*.sql, user_invitations migration, portal-user-invite/handler.mjs, user_invite_handler.mjs/user_invite_sql.mjs.

#### FN-A03 계정 영구 삭제·로그 보관

삭제는 preview에서 이메일/관련 저장 건수를 서버 계산한 뒤 정확한 이메일 재입력과 delete 요청을 받습니다. 본인·마지막 활성 관리자·권한 초과·Storage 소유 파일 등을 검사합니다. 삭제를 예약하고 이용 중지한 뒤 Auth 계정을 삭제하며 FK로 클라우드 행을 정리합니다. 실패/불명확은 이용 중지 유지, 진행 중 재활성화 금지입니다. 브라우저/로컬 폴더/외부 동기화 파일을 삭제하지 않습니다.

로그 보관 설정은 기본180일/1~3650일, 활성 여부·마지막 실행을 관리합니다. 자동 정리는 KST 일자당 중복 실행을 제한하고 삭제 건수/기준을 감사 기록합니다. 실제 사용자 계정 삭제·메일 발송·운영 로그 정리는 문서 검증에 포함하지 않습니다. 근거: user_deletion/log_retention migrations, user_delete_handler.mjs, admin_deletion_sql.mjs.

## 근거와 연관 문서

REA는 문서 분류와 형식만 참고합니다. Portal 업무 규칙은 자체 소스와 기존 설계에서 가져옵니다.

- [REA 참조 산출물](https://drive.google.com/drive/folders/1wSEfyVgxhPJDyyzRKUAKu0B5KLUdHJ_1)
- [Portal 문서 관리 위치](https://drive.google.com/drive/folders/1tHzs_6RVrJYmKnLKyyLrMQ8nwE3xRMIe)
- [docs/design/functional-design.md](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/docs/design/functional-design.md)
- [login.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/login.js)
- [app.js](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/app.js)
- [portal-admin.sql](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/portal-admin.sql)
- [tests/portal_sso.py](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/portal_sso.py)
- [tests/user_invite_handler.mjs](https://github.com/3hs3624/portal01/blob/33fc8d703028d14819db78910b08d018bd04bca1/tests/user_invite_handler.mjs)
