"""Deletion confirmations and retention settings against isolated UI fixtures."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler


def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/portal01/admin-delete-test',lambda r:r.fulfill(content_type='text/html',body='''<meta charset=utf-8><div id="system-admin-view"></div><script>
window.__portalAuthenticated=true;window.PortalAccess={isAdmin:true,permissions:['system.access','system.users.read','system.users.manage','system.groups.read','system.groups.manage','system.roles.read','system.roles.manage','system.permissions.read','system.logs.read','system.audit.read','system.logs.manage']};
window.data={users:[{id:'22222222-2222-4222-8222-222222222222',email:'target@example.test',display_name:'Target',enabled:true}],groups:[{id:'group',name:'Group',member_ids:[],role_ids:[]}],roles:[{id:'custom',name:'Custom role',permissions:[],builtin:false},{id:'builtin',code:'system_admin',name:'Admin',permissions:[],builtin:true}],permissions:[],access:[{id:'access-1',created_at:'2026-01-01',event:'login'}],audit:[{id:7,created_at:'2026-01-01',action:'test',details:{}}]};window.changes=[];window.deletedLogs=[];window.settings={retention_days:180,enabled:true};window.failDelete=true;window.invocations=[];
window.PortalRefreshAccess=async()=>{};
window.PortalAdminAPI={read:async section=>({items:data[section]||[],total:(data[section]||[]).length}),change:async(action,payload)=>{changes.push({action,payload});data[action==='group_delete'?'groups':'roles']=[];},deleteUser:async body=>{invocations.push(body);if(body.action==='preview')return {...data.users[0],workspace_count:2};if(failDelete)throw Error('삭제 실패: 이용 중지 상태를 확인해 주세요.');data.users=[];return {ok:true,message:'사용자를 영구 삭제했습니다.'}},deleteLog:async(section,id)=>{deletedLogs.push({section,id});data[section]=[];},logSettings:async payload=>{if(payload)settings={...settings,...payload};return settings},cleanupLogs:async()=>({access_deleted:3,audit_deleted:2})};
</script><script src="/portal01/admin.js"></script>'''))
  page.goto(base+'/portal01/admin-delete-test');page.evaluate('PortalAdminView.open()')
  page.locator('[data-admin-section=users]').click();page.get_by_role('button',name='삭제',exact=True).click();modal=page.locator('.admin-editor');modal.get_by_text('클라우드 작업공간 2개',exact=False).wait_for();save=modal.get_by_role('button',name='영구 삭제',exact=True);assert save.is_disabled()
  modal.locator('input[type=email]').fill('wrong@example.test');modal.locator('input[type=checkbox]').check();assert save.is_disabled();modal.locator('input[type=email]').fill('target@example.test');assert save.is_enabled();save.click();modal.locator('[role=alert]').get_by_text('삭제 실패',exact=False).wait_for();assert modal.is_visible()
  page.evaluate('failDelete=false');save.click();modal.wait_for(state='hidden');assert '영구 삭제' in page.locator('#admin-status').inner_text()
  assert page.evaluate('invocations.at(-1).confirm_email')=='target@example.test'
  for section in ['groups','roles']:
   page.locator('[data-admin-section='+section+']').click();assert page.get_by_role('button',name='삭제',exact=True).count()==1
   page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='삭제',exact=True).click();assert page.get_by_role('button',name='삭제',exact=True).count()==1
   page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='삭제',exact=True).click();page.get_by_role('button',name='삭제',exact=True).wait_for(state='detached');assert '삭제했습니다' in page.locator('#admin-status').inner_text()
  assert len(page.evaluate('changes'))==2
  for section in ['access','audit']:
   page.locator('[data-admin-section='+section+']').click();page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='삭제',exact=True).click();page.get_by_role('button',name='삭제',exact=True).wait_for(state='detached');assert '선택한 로그' in page.locator('#admin-status').inner_text()
  assert len(page.evaluate('deletedLogs'))==2
  page.get_by_role('button',name='로그 보관·자동 삭제 설정',exact=True).click();modal=page.locator('.admin-editor');days=modal.locator('input[type=number]');assert days.input_value()=='180';assert modal.locator('select').count()==0
  days.fill('365');page.once('dialog',lambda d:d.accept());modal.get_by_role('button',name='저장',exact=True).click();modal.wait_for(state='hidden');assert page.evaluate('settings.retention_days')==365
  def confirm_cleanup(d):
   assert '365일' in d.message;d.accept()
  page.once('dialog',confirm_cleanup);page.get_by_role('button',name='보관 기간 지난 로그 지금 정리',exact=True).click();page.wait_for_function("document.querySelector('#admin-status').textContent.includes('접속로그 3건')")
  page.evaluate("PortalAccess.permissions=['system.access','system.users.read','system.logs.read','system.audit.read'];PortalAdminView.open()")
  page.locator('[data-admin-section=access]').click();assert page.get_by_role('button',name='로그 보관·자동 삭제 설정',exact=True).count()==0;assert page.get_by_role('button',name='삭제',exact=True).count()==0
  assert not errors,errors;print('PASS admin UI: email re-entry, scope warning, failure/success feedback, cancellable group/role/log deletion, builtin guard, default 180 editable to 365 and permission checks',flush=True);b.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
