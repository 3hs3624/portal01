#!/usr/bin/env python3
"""Reproducible specification appendices. Reads source only; never opens a live DB."""
from pathlib import Path
import argparse,base64,gzip,hashlib,json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/design/appendices'
SQL=['portal-workspaces.sql','portal-workspaces-100mb.sql','portal-admin.sql','portal-admin-update.sql','supabase/migrations/202611030001_user_invitations.sql','supabase/migrations/20261103062618_user_deletion.sql','supabase/migrations/20261103062619_log_retention.sql','portal-projects-relational.sql','portal-projects-consistency.sql','portal-content-relational.sql','portal-item-sharing.sql']
def balanced(s,start):
 depth=0;quote=False;i=start
 while i<len(s):
  c=s[i]
  if c=="'":
   if quote and i+1<len(s) and s[i+1]=="'":i+=2;continue
   quote=not quote
  if not quote:
   if c=='(':depth+=1
   elif c==')':
    depth-=1
    if depth==0:return i
  i+=1
 raise ValueError('Unbalanced SQL')
def split_sql(s):
 out=[];start=0;depth=0;quote=False;i=0
 while i<len(s):
  c=s[i]
  if c=="'":
   if quote and i+1<len(s) and s[i+1]=="'":i+=2;continue
   quote=not quote
  if not quote:
   if c=='(':depth+=1
   elif c==')':depth-=1
   elif c==',' and depth==0:out.append(s[start:i].strip());start=i+1
  i+=1
 return out+[s[start:].strip()]
def line(s,i):return s.count('\n',0,i)+1
def cell(s):return str(s).replace('|','\\|').replace('\n',' ')
def source_link(path,n=1):return f'[{path}:{n}](../../../{path}#L{n})'
PURPOSE={
'migrations':'기본 역할 초기화 등 설치 이력', 'profiles':'인증 계정의 표시 이름·이용 상태', 'permissions':'고정 권한 코드', 'roles':'역할', 'role_permissions':'역할에 부여한 권한', 'user_roles':'사용자 직접 역할', 'groups':'사용자 그룹', 'group_members':'그룹 구성원', 'group_roles':'그룹 역할', 'access_logs':'로그인·세션 복원·로그아웃 기록', 'audit_logs':'관리 변경 감사', 'user_invitations':'초대 발송 상태·빈도 제한', 'user_deletions':'계정 삭제 작업 상태', 'log_retention':'로그 보관 정책',
'portal_workspaces':'이전 JSON 작업공간·관계형 이전 원본', 'portal_pm_workspaces':'프로젝트 계정별 헤드·버전·루트 설정', 'portal_pm_projects':'프로젝트 메타데이터·상태의 나머지 속성', 'portal_pm_phases':'WBS 단계', 'portal_pm_activities':'단계 하위 Activity', 'portal_pm_tasks':'Activity 하위 태스크', 'portal_pm_calendar':'공휴일·마일스톤', 'portal_pm_files':'원형 파일 경로·JSON·비공개 바이너리 참조', 'portal_pm_versions':'저장 스냅샷', 'portal_pm_backups':'교체 전 서버 매니페스트', 'portal_content_workspaces':'문서/BI 계정·앱별 헤드와 루트 설정', 'portal_content_backups':'문서/BI 교체 전 서버 백업', 'portal_ws_folders':'문서 폴더 계층', 'portal_ws_documents':'문서 제목·본문·속성', 'portal_ws_tags':'문서 태그 순서', 'portal_ws_comments':'문서 페이지 댓글', 'portal_bi_dashboards':'대시보드 메타데이터', 'portal_bi_cards':'대시보드 카드 순서·설정', 'portal_bi_sources':'연결·분리 데이터 소스', 'portal_bi_sheets':'데이터 소스의 시트', 'portal_bi_columns':'시트 열 이름·순서', 'portal_bi_rows':'시트 행 값 배열', 'portal_bi_links':'시트의 대시보드 연결', 'shared_items':'개인 원본과 독립적인 공유 작업공간', 'shared_members':'공유 수신자와 조회/편집 권한', 'shared_versions':'공유본 교체 전 최근 3개 버전'}
MEANING={'user_id':'계정 UUID; 대부분 소유자/테넌트 키. 공유 구성원 표에서는 수신자.', 'owner_id':'공유본 소유 계정 UUID', 'actor_id':'행위를 실행한 계정 UUID; 삭제 후 감사 보존에 유의', 'revision':'낙관적 동시성 비교용 불투명 UUID; 시각으로 비교 금지', 'position':'원본 배열 순서(0부터); 복합 PK의 일부', 'phase_position':'상위 단계의 position', 'activity_position':'상위 Activity의 position', 'properties':'추가 속성 JSONB; 명시 컬럼 값이 복원 시 우선', 'configuration':'카드 차트/KPI 설정 JSONB', 'envelope':'하위 배열을 제외한 작업공간 루트 속성', 'payload':'원형 작업공간/서버 백업 JSONB', 'workspace':'공유 단위의 원형 작업공간 JSONB', 'manifest':'프로젝트 파일 매니페스트 백업', 'metadata':'프로젝트 원형 meta JSON', 'state_extra':'phases/calendar 등 분리 항목 이외의 현재 상태', 'document':'파일의 비바이너리 JSON 원형', 'values':'columns position과 대응하는 행 값 배열', 'asset_hash':'바이너리 SHA-256(64자리 소문자 hex)', 'asset_bytes':'바이너리 크기(바이트)', 'path':'상대 파일 경로; 절대 경로·.. 금지', 'source_id':'원형 객체 ID; PM에서는 외부 원본 ID, BI에서는 소스 키', 'source_key':'개인 원본 ID; 소유자·앱과 조합해 공유 중복 방지', 'content':'문서 원형 Markdown/확장 블록 문자열', 'parent_id':'상위 폴더 ID; NULL은 루트', 'folder_id':'문서 폴더/폴더 식별자; 문서의 NULL은 루트', 'permission':'view 또는 edit; owner는 파생 권한', 'app_id':'앱 코드 markdown/projects/insight 중 테이블 허용 범위', 'saved_at':'서버 백업/버전 저장 시각', 'updated_at':'최종 수정 시각; 타입이 text인 도메인 필드는 문자열 보존', 'created_at':'생성 시각', 'connected_at':'클라이언트에서 데이터를 가져오거나 수정한 시각 문자열', 'detached':'true이면 연결 해제 후 조회용 보관 데이터', 'sheet_name':'소스 안의 시트 이름', 'link_key':'saved:<dashboard ID> 또는 draft/preset 연결 키', 'progress':'태스크 진척 숫자; 원형 WBS는 0~100', 'entry_date':'달력 항목 일자', 'plan_start':'계획 시작일', 'plan_end':'계획 완료일', 'actual_start':'실제 시작일', 'actual_end':'실제 완료일', 'posted_at':'페이지 댓글 작성 시각 문자열', 'body':'댓글 본문', 'tag':'태그 문자열', 'role':'meta/current/snapshot/json/blob 파일 분류'}
def collect():
 tables=[];functions={};indexes=[];sources={}
 for path in SQL:
  s=(ROOT/path).read_text();sources[path]=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
  for m in re.finditer(r'create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)\s*\(',s,re.I):
   end=balanced(s,m.end()-1);parts=split_sql(s[m.end():end]);cols=[];constraints=[]
   for part in parts:
    part=' '.join(part.split())
    if re.match(r'(constraint|primary|foreign|unique|check)\b',part,re.I):constraints.append(part);continue
    cm=re.match(r'("?\w+"?)\s+(.+)',part);name=cm[1].strip('"');rest=cm[2];typ=re.split(r'\s+(?:not\s+null|null|primary\s+key|unique|references|default|check|generated)\b',rest,1,flags=re.I)[0];cols.append({'name':name,'type':typ,'definition':part})
   pk=[]
   for c in cols:
    if re.search(r'\bprimary key\b',c['definition'],re.I):pk.append(c['name'])
   for c in constraints:
    pm=re.search(r'primary key\s*\(([^)]+)',c,re.I)
    if pm:pk.extend(x.strip().strip('"') for x in pm[1].split(','))
   for c in cols:c['nullable']=not(c['name'] in pk or re.search(r'\bnot null\b',c['definition'],re.I))
   tables.append({'name':m[1],'source':path,'line':line(s,m.start()),'columns':cols,'constraints':constraints,'primaryKey':pk,'ddl':s[m.start():end+1]+';'})
  for m in re.finditer(r'create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?\w+\s+on\s+([\w.]+)[^;]*;',s,re.I):indexes.append({'table':m[1],'sql':m[0],'source':path})
  for m in re.finditer(r'create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\(',s,re.I):
   end=balanced(s,m.end()-1);body=s[end+1:];decl=body[:body.find('$$')] if '$$' in body else body[:500];ret=re.search(r'returns\s+(.+?)\s+language\b',decl,re.I|re.S)
   functions[m[1]]={'name':m[1],'parameters':' '.join(s[m.end():end].split()),'returns':' '.join(ret[1].split()) if ret else '선언 원문 참조','security':'DEFINER' if re.search(r'security\s+definer',decl,re.I) else 'INVOKER','source':path,'line':line(s,m.start())}
 inventory=json.loads((ROOT/'docs/design/ui-inventory.json').read_text());runtime={}
 for module in inventory['modules']:
  name=module['source'].split('#')[0].split(' (inline)')[0];p=ROOT/name
  if p.is_file():runtime[name]=hashlib.sha256(p.read_bytes()).hexdigest()
 return {'runtimeSources':runtime,'tables':tables,'functions':sorted(functions.values(),key=lambda x:x['name']),'indexes':indexes,'sources':sources}
def table_md(d):
 o=['# 테이블 컬럼 상세 부록','',f"소스 정의 테이블 {len(d['tables'])}개. SQL에서 재생성한 물리 정의이며 운영 DB 실측 결과가 아닙니다.",'','NULL 표시는 PK의 암묵 NOT NULL을 반영합니다. UNIQUE/FK/CHECK/DEFAULT/IDENTITY는 원문 정의를 함께 제공합니다. `auth.users` 및 Supabase Storage 내부 테이블은 외부 관리 객체이며 별도 재생성하지 않습니다.','']
 for i,t in enumerate(d['tables'],1):
  o +=[f"## TB-{i:03} {t['name']}",'',PURPOSE.get(t['name'].split('.')[-1],t['name']),f"근거: {source_link(t['source'],t['line'])}. PK: `"+', '.join(t['primaryKey'])+'`.','', '| 컬럼 | 물리 타입 | NULL 허용 | 의미 | 원문 제약·기본값 |','|---|---|---|---|---|']
  for c in t['columns']:
   note=MEANING.get(c['name'],{'id':'행 UUID 식별자','name':'표시 이름','title':'제목','enabled':'이용/자동 정리 활성 여부','code':'업무 코드(코드 정의서 참조)','status':'작업 상태(코드 정의서 참조)'}.get(c['name'],c['name']+' 도메인 값; 해당 원형 객체 계약 참조'))
   o.append('| '+' | '.join(map(cell,[c['name'],c['type'],'예' if c['nullable'] else '아니오',note,c['definition']]))+' |')
  o +=['','관계·테이블 제약:']+['- `'+c+'`' for c in t['constraints']]+['','```sql',t['ddl'],'```','']
  idx=[x['sql'] for x in d['indexes'] if x['table']==t['name']]
  if idx:o+=['명시 인덱스:','```sql','\n'.join(idx),'```','']
 return '\n'.join(o)
def catalog_md(d):
 inv=json.loads((ROOT/'docs/design/ui-inventory.json').read_text());o=['# 코드·RPC·화면 계약 카탈로그','', '자동 추출 부록. 익명 콜백의 완전한 호출 그래프가 아니라 재구현 시 원문을 찾기 위한 색인입니다.','', '## RPC 및 DB 보조 함수','','| 함수 | 인자(기본값 포함) | 반환 | 실행 권한 모델 | 최종 정의 근거 |','|---|---|---|---|---|']
 for f in d['functions']:o.append('| '+' | '.join(map(cell,[f['name'],f['parameters'],f['returns'],f['security'],source_link(f['source'],f['line'])]))+' |')
 o+=['','## UI 모듈별 선언 함수','','| 모듈 | 선언 함수 |','|---|---|']
 for m in inv['modules']:o.append('| '+cell(m['source'])+' | '+cell(', '.join(m['functions']) or '객체/IIFE/콜백; 원문 참조')+' |')
 o+=['','## 블록 명령 코드 전체','','| 코드 | 표시 이름 | 분류 | 구현 |','|---|---|---|---|']
 for r in inv['blockCommands']:o.append('| '+' | '.join(cell(r[k]) for k in ['id','label','group','source'])+' |')
 return '\n'.join(o)+'\n'
def control_md():
 inv=json.loads((ROOT/'docs/design/ui-inventory.json').read_text());o=['# 화면 컨트롤 상세 부록','','정적 8개 HTML 원천의 전 컨트롤입니다. 동적 메뉴·행 동작은 화면설계서와 기능설계서의 SC/FN 계약을 함께 적용합니다.','']
 for s in inv['screens']:
  o +=['## '+s['source'],'','| 제어 종류 | ID/이름 | 표시·접근성 이름 | 입력 제약·초기 속성 | 선택지 |','|---|---|---|---|---|']
  for c in s['controls']:
   a=c['attributes'];o.append('| '+' | '.join(map(cell,[c['tag'],a.get('id',a.get('name','동적/ID 없음')),c['label'],json.dumps(a,ensure_ascii=False),'; '.join(x['value']+'='+x['label'] for x in c['options'])]))+' |')
 return '\n'.join(o)+'\n'
def outputs():
 d=collect();return {'table-columns.md':table_md(d),'code-catalog.md':catalog_md(d),'screen-controls.md':control_md(),'contracts.json':json.dumps(d,ensure_ascii=False,indent=2)+'\n'}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();stale=[]
 for n,s in outputs().items():
  f=OUT/n
  if a.check:
   if not f.exists() or f.read_text()!=s:stale.append(n)
  else:f.write_text(s)
 if stale:print('Regenerate specification appendices: '+', '.join(stale));return 1
 d=collect();print(f"Specification catalog {'verified' if a.check else 'generated'}: {len(d['tables'])} tables, {sum(len(t['columns']) for t in d['tables'])} columns, {len(d['functions'])} DB functions")
 return 0
if __name__=='__main__':sys.exit(main())
