"""Real browser interaction; isolated fixtures, no real accounts or invitation emails."""
import os
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler


def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1500,'height':1000})
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.route('**/portal01/sidebar-host*',lambda r:r.fulfill(content_type='text/html',body='''<script>window.__portalAuthenticated=true;window.PortalUserId='sidebar-regression';</script><iframe style="width:100%;height:950px;border:0" src="/portal01/apps/'''+('insight' if 'insight' in r.request.url else 'markdown')+'''/"></iframe>'''))
  for app in ['markdown','insight']:
   page.goto(base+'/portal01/sidebar-host?'+app)
   f=page.frame_locator('iframe');toggle=f.locator('#portal-sidebar-toggle');toggle.wait_for()
   sidebar=f.locator('#portal-app-sidebar')
   assert sidebar.is_visible()
   expanded=f.locator('main').bounding_box()['width']
   toggle.click();assert sidebar.is_hidden();assert toggle.get_attribute('aria-expanded')=='false'
   assert f.locator('main').bounding_box()['width']>expanded
   page.reload();toggle.wait_for();assert sidebar.is_hidden()
   toggle.focus();page.keyboard.press('Enter');assert sidebar.is_visible()
   page.set_viewport_size({'width':600,'height':1000})
   toggle.click();assert sidebar.is_hidden();assert toggle.is_visible();toggle.click();assert sidebar.is_visible()
   page.set_viewport_size({'width':1500,'height':1000})
   print('PASS '+app+': collapse expands content, reload persists, keyboard and mobile reopen',flush=True)
  page.route('**/portal01/admin-test',lambda r:r.fulfill(content_type='text/html',body='''<meta charset="utf-8"><div id="system-admin-view"></div><script>
window.__portalAuthenticated=true;window.PortalAccess={isAdmin:true,permissions:['system.access','system.users.read','system.users.manage']};
window.rows=[{id:'person',email:'person@example.test',display_name:'Person',enabled:true,role_names:[]}];window.changes=[];window.invites=[];window.failInvite=false;
window.PortalRefreshAccess=async()=>{};
window.PortalAdminAPI={read:async section=>({items:section==='users'?rows:[],total:section==='users'?rows.length:0}),change:async(action,payload)=>{changes.push({action,payload});rows[0].enabled=payload.enabled;},invite:async payload=>{invites.push(payload);if(failInvite)throw Error('사용자 초대 서버 설정이 필요합니다.');return {ok:true}}};
</script><script src="/portal01/admin.js"></script>'''))
  page.goto(base+'/portal01/admin-test');page.evaluate('PortalAdminView.open()')
  page.locator('[data-admin-section=users]').click();add=page.locator('#admin-add');assert add.inner_text()=='사용자 초대',repr(add.inner_text())
  add.click();page.locator('.admin-editor input[type=email]').fill('new@example.test');page.locator('.admin-editor input').nth(1).fill('New Person');page.locator('.admin-editor button[type=submit]').click();page.locator('.admin-editor').wait_for(state='hidden')
  assert page.evaluate('invites')==[{'email':'new@example.test','display_name':'New Person'}]
  assert '발송' in page.locator('#admin-status').inner_text()
  add.click();page.locator('.admin-editor input[type=email]').fill('new@example.test');page.evaluate('failInvite=true');page.locator('.admin-editor button[type=submit]').click();assert page.locator('.admin-editor').is_visible();assert '서버 설정' in page.locator('.admin-editor [role=alert]').inner_text();page.locator('.admin-editor button',has_text='취소').click()
  page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='이용 중지',exact=True).click();assert page.evaluate('changes.length')==0
  page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='이용 중지',exact=True).click();page.get_by_role('button',name='재활성화',exact=True).wait_for()
  page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='재활성화',exact=True).click();page.get_by_role('button',name='이용 중지',exact=True).wait_for()
  assert page.evaluate('changes')==[{'action':'user_save','payload':{'id':'person','enabled':False}},{'action':'user_save','payload':{'id':'person','enabled':True}}]
  page.evaluate("PortalAccess.permissions=['system.access','system.users.read'];PortalAdminView.open()")
  assert add.is_hidden();assert page.get_by_role('button',name='이용 중지',exact=True).count()==0
  assert page.get_by_role('button',name='삭제',exact=True).count()==0
  print('PASS admin: invite form, visible server error, cancel suspension, suspend/reactivate, read-only permissions and no permanent delete',flush=True)
  assert not errors,errors
  browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  thread=Thread(target=server.serve_forever,daemon=True);thread.start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown();thread.join()
