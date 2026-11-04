"""Exercise both sample choices, cancel, revert, save and reopen through the actual hosted dashboard."""
from threading import Thread
from http.server import ThreadingHTTPServer
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(accept_downloads=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.route('**/sample-host',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="sample-choice-test"</script><iframe src="/portal01/apps/projects/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/sample-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();fr=page.frames[1];fr.evaluate("PortalWorkspaceAdapter.restore({format:'wbs-pm-cloud',version:1,directories:['projects'],files:[]})");expect(f.locator('#btn-new')).to_be_enabled()
  def state(popup):
   popup.locator('[data-view=versions]').click()
   with popup.expect_download() as d:popup.locator('#btn-json').click()
   return json.loads(Path(d.value.path()).read_text())['state']
  for mode in ['keep','clear']:
   name='Sample choice '+mode;f.locator('#btn-new').click();f.locator('#p-name').fill(name);f.locator('#p-client').fill('Fixture client');f.locator('#p-start').fill('2026-11-01');f.locator('#p-end').fill('2026-12-31')
   with c.expect_page() as event:f.locator('#pm-ok').click()
   pop=event.value;pop.on('pageerror',lambda e:errors.append(str(e)));expect(pop.locator('#sample-chip')).to_have_text('sample 유지 또는 빈 WBS');original=state(pop);assert original['sample'] and original['phases']
   pop.locator('#sample-chip').click();pop.locator('#sp-clear').click();expect(pop.locator('#sp-clear')).to_have_text('한 번 더 누르면 WBS를 비웁니다');pop.locator('#sp-close').click();assert state(pop)==original
   pop.locator('#sample-chip').click();expect(pop.locator('#sp-clear')).to_have_text('빈 WBS로 시작 (샘플 삭제)');pop.locator('#sp-'+mode).click()
   if mode=='clear':pop.locator('#sp-clear').click()
   expected=state(pop);assert expected['sample'] is False;assert expected['project']['name']==original['project']['name'];assert expected['holidays']==original['holidays']
   if mode=='keep':assert {k:v for k,v in original.items() if k!='sample'}=={k:v for k,v in expected.items() if k!='sample'}
   else:assert expected['phases']==[];assert expected['project']['sourceBaseDate'] is None;assert expected['project']['sourceFile']=='';assert expected['milestones']==[{'date':'2026-12-31','name':'사업 종료'}]
   expect(pop.locator('#sample-wrap')).to_be_hidden();pop.locator('#btn-revert').click();assert state(pop)==original
   pop.locator('#sample-chip').click();pop.locator('#sp-'+mode).click()
   if mode=='clear':pop.locator('#sp-clear').click()
   pop.locator('#btn-save').click();pop.locator('#save-name').fill('Verified '+mode);pop.locator('#save-author').fill('Regression');pop.locator('#save-ok').click();expect(pop.locator('#save-modal')).to_be_hidden();expect(pop.locator('#btn-revert')).to_have_count(0);assert state(pop)==expected;pop.close()
   with c.expect_page() as event:f.get_by_text(name,exact=True).click()
   reopened=event.value;reopened.on('pageerror',lambda e:errors.append(str(e)));reopened.locator('[data-view=versions]').wait_for();assert state(reopened)==expected;expect(reopened.locator('#sample-wrap')).to_be_hidden();reopened.close();print('PASS',mode,'cancel confirmation, exact data semantics, revert, save and reopen',flush=True)
  assert not errors,errors;b.close()
if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port))
 finally:s.shutdown()
