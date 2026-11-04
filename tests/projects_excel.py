"""Real XLSX download under production CSP; inspect workbook values with openpyxl."""
from threading import Thread
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import base64,json,sys
from io import BytesIO
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect
from write_studio_blocks import StudioHandler


def run(base,probe=False):
 rows=[]
 for i in range(25):
  id='PRJ20261104'+str(i).zfill(6)+'a';rows.append({'id':id,'name':('Alpha 서울 ' if i%2==0 else 'Beta 부산 ')+str(i),'client':'고객사','startDate':'2026-11-01','endDate':'2026-12-31','pstatus':'진행 중','pm':'김PM','pl':'이PL','members':'팀원 A, 팀원 B','description':'=HYPERLINK("https://example.com","literal")','note':'검증 비고','createdAt':'2026-11-'+str(i+1).zfill(2)+'T00:00:00Z','summary':{'base':'2026-11-04','plan':0.75,'actual':0.5},'lastSave':{'savedAt':'2026-11-04T00:00:00Z','name':'검증 스냅샷'}})
 rows[0]['name']='=1+1';rows[0]['summary']=None
 workspace={'format':'wbs-pm-cloud','version':1,'directories':['projects'],'files':[{'path':'projects/'+r['id']+'.meta.json','data':base64.b64encode(json.dumps({'format':'wbs-pm-meta','version':1,**r},ensure_ascii=False).encode()).decode()} for r in rows]}
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True);page=c.new_page();errors=[];violations=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:violations.append(m.text) if 'Content Security Policy' in m.text else None)
  def route(r):
   if not r.request.url.startswith(base):external.append(r.request.url);return r.abort()
   if '/exceljs.min.js' in r.request.url and not probe and not getattr(route,'failed',False):route.failed=True;return r.fulfill(status=503,content_type='text/plain',body='fixture retry')
   if r.request.url.endswith('/excel-host'):return r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="projects-excel-test"</script><iframe src="/portal01/apps/projects/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>')
   return r.continue_()
  c.route('**/*',route);page.goto(base+'/portal01/excel-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();fr=page.frames[1];fr.evaluate('(workspace)=>PortalWorkspaceAdapter.restore(workspace)',workspace);expect(f.locator('#btn-xlsx')).to_be_enabled();expect(f.locator('#list tbody tr')).to_have_count(10)
  if probe:
   f.locator('#btn-xlsx').click();page.wait_for_timeout(1200);print('REPRODUCTION',{'csp_blocks':len(violations),'export_error':f.locator('#toast').inner_text()},flush=True);browser.close();return
  # A failed local library load can be retried; no CDN or CSP exception is needed.
  f.locator('#btn-xlsx').click();expect(f.locator('#toast')).to_contain_text('엑셀');expect(f.locator('#btn-xlsx')).to_be_enabled()
  with page.expect_download() as info:f.locator('#btn-xlsx').click()
  download=info.value;raw=Path(download.path()).read_bytes();assert raw.startswith(b'PK');assert download.suggested_filename.endswith('.xlsx');wb=load_workbook(BytesIO(raw));ws=wb['프로젝트 목록'];assert ws.max_row==26;assert ws.max_column==18;assert ws['B1'].value=='사업명';assert ws.freeze_panes=='A2';assert ws['K2'].number_format=='0.0%';assert ws['K2'].value==0.75 and ws['L2'].value==0.5
  names=[ws.cell(i,2).value for i in range(2,27)];assert '=1+1' in names;literal=ws.cell(names.index('=1+1')+2,2);assert literal.data_type=='s';assert ws.cell(names.index('=1+1')+2,11).value is None;assert ws['P2'].data_type=='s';assert ws['P2'].value.startswith('=HYPERLINK');assert not any(cell.data_type=='f' for row in ws for cell in row)
  print('PASS actual .xlsx, all 25 records across pagination, Korean text, 18 columns, percentage cells, snapshot labels, blank summaries, literal formula-looking strings and library-load retry',flush=True)
  f.locator('#f-kw').fill('Alpha');f.locator('#btn-search').click()
  with page.expect_download() as info:f.locator('#btn-xlsx').click()
  filtered=load_workbook(BytesIO(Path(info.value.path()).read_bytes())).active;assert filtered.max_row==13;assert all('Alpha' in filtered.cell(i,2).value for i in range(2,14));f.locator('#f-kw').fill('no-matching-project');f.locator('#btn-search').click();f.locator('#btn-xlsx').click();expect(f.locator('#toast')).to_contain_text('내려받을 프로젝트가 없습니다');expect(f.locator('#btn-xlsx')).to_be_enabled();print('PASS current filters and empty-result feedback',flush=True)
  f.locator('#f-kw').fill('');f.locator('#btn-search').click();f.locator('#btn-new').click();f.locator('#p-name').fill('Excel detail regression');f.locator('#p-client').fill('Local fixture');f.locator('#p-start').fill('2026-11-01');f.locator('#p-end').fill('2026-12-31')
  with c.expect_page() as event:f.locator('#pm-ok').click()
  popup=event.value;popup.on('pageerror',lambda e:errors.append(str(e)));popup.on('console',lambda m:violations.append(m.text) if 'Content Security Policy' in m.text else None);popup.locator('[data-view=excel]').wait_for(timeout=15000);popup.locator('[data-view=excel]').click()
  with popup.expect_download() as info:popup.locator('#btn-xlsx').click()
  detail=load_workbook(BytesIO(Path(info.value.path()).read_bytes()));assert {'WBS','기준정보','달력'}.issubset(detail.sheetnames);assert detail['WBS'].max_row>12;assert detail['WBS'].column_dimensions['M'].hidden;assert any(cell.data_type=='f' for row in detail['WBS'] for cell in row);assert detail['WBS']['B2'].value=='Excel detail regression';cached=load_workbook(BytesIO(Path(info.value.path()).read_bytes()),data_only=True);assert cached['기준정보']['B3'].value=='Excel detail regression';assert cached['WBS']['D4'].value.year==2026;assert not errors,errors;assert not violations,violations;assert not external,external;print('PASS detailed WBS .xlsx from real project popup, three worksheets, formulas, hidden stable IDs, project metadata, local library only, no CSP violations or browser errors',flush=True);popup.close();browser.close()

if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port),'--probe' in sys.argv)
 finally:s.shutdown()
