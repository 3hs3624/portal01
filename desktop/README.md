# Portal01 desktop compatibility prototype

웹 버전은 기존 GitHub Pages 주소를 유지합니다. 이 디렉터리는 별도로 빌드하는 설치형 전환의 **0단계 호환성 프로토타입**입니다. 정식 설치판·SQLite 전환·보안 키링·클라우드 동기화 완료를 의미하지 않습니다.

## 실행

Node.js 24 LTS와 해당 OS의 GUI 환경이 필요합니다.

```sh
cd desktop
npm ci
npm test
npm run stage
npm start
```

`npm run pack`은 현재 OS의 압축 해제된 앱을 `release/`에 생성합니다. `npm run dist`는 현재 OS의 설치 파일을 만듭니다. Mac arm64/x64 빌드는 각각 해당 아키텍처에서 검증합니다. 서명 인증서와 notarization을 설정하기 전 생성물은 개발용입니다. 인증서·토큰은 저장소에 추가하지 않습니다.

## 웹과의 관계

- 기존 세 앱과 로그인·권한 코드를 재사용합니다. 인증을 우회하거나 가짜 계정을 넣지 않습니다.
- `/portal01/` 경로를 `portal01://workspace/portal01/`에 대응시킵니다. `file://` 로드나 webSecurity 해제를 사용하지 않습니다.
- 개인 데이터는 별도 `Portal01-Preview` 프로필에 저장됩니다. Chrome/Edge 브라우저의 기존 저장 데이터와 공유되지 않습니다.
- 현재 프로토타입의 작업 데이터는 Electron의 브라우저 저장소를 사용합니다. SQLite·native HostBridge·OS 보안 키링은 다음 단계입니다. 실제 조직 데이터를 넣기 전 이 전환과 인증·CORS 검증을 마쳐야 합니다.
- 네이티브 파일·클라우드 쓰기 기능을 새로 열지 않습니다. File System Access API, 엑셀 왕복, 인증 후 화면, Project 팝업, Insight 상세 창은 추가 실기기 검증 대상입니다.
- Node 통합 끄기, sandbox·contextIsolation·webSecurity 켜기를 유지합니다. 임의 외부 최상위 탐색·일반 새 창·권한 요청은 기본 차단합니다. Insight 상세 페이지의 기존 opener 흐름만 제한적으로 허용합니다.
- 앱별 WebContentsView 격리와 parent/opener 호출의 HostBridge 전환은 아직 구현하지 않았습니다. 현재 단계는 기존 iframe 셸의 호환성 검증입니다.

## 빌드와 검증

`desktop-preview` 브랜치의 별도 GitHub Actions가 Windows, Mac arm64/x64, Linux에서 공개 리소스 스테이징, 보안 경로 테스트, 실제 Electron 로그인 화면 스모크 테스트와 압축 해제된 앱 패키징을 수행합니다. 결과물은 7일간 개발용 artifact로 보관하고 Releases나 웹 페이지에 자동 게시하지 않습니다. Linux의 `--no-sandbox`는 격리된 CI 실행에 한정하며 앱 기본 실행에는 추가하지 않습니다.

스모크 테스트는 로그인 전 셸·세 앱 HTML 제공·로컬 스토리지·렌더러 격리만 확인합니다. 실제 인증·한글 IME·원본 엑셀 조건부 서식·간트 색상·파일 충돌 복구를 검증한 것으로 해석하지 않습니다. Windows/Mac/Linux 설치와 사용자 권한·오프라인 정책 확인 후 다음 단계로 진행합니다.

## 다음 단계

1. OS별 스모크 및 패키징 보고서 확인, 인증·팝업·한글·엑셀 실기기 검증.
2. 웹/설치형 HostBridge 경계와 앱별 권한 명세 도입.
3. Main의 SQLite·첨부파일·원자적 저장, 기존 데이터 가져오기와 백업/복구.
4. OS 보안 키링, 조직/개인 프로필, Supabase 네이티브 연동.
5. 서명 설치 파일, 안전한 업데이트, 실제 단말 베타.

프로토타입 변경은 별도 `desktop-preview` 브랜치에 저장하고, 웹의 `gh-pages` 배포와 분리합니다. 공개 런타임 자산만 스테이징하고 SQL·테스트·작업 폴더·Git 정보는 패키지에 포함하지 않습니다.
