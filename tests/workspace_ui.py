"""Shared workspace UI and native app behavior, using isolated local data only."""
import os
import json
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler


def run(base):
 root=Path(__file__).resolve().parents[1]
 assert json.dumps('<style data-portal-workspace>'+(root/'workspace-ui.css').read_text()+'</style></head>',ensure_ascii=False) in (root/'apps/projects/index.html').read_text(),'Embedded popup style must match the shared stylesheet'

 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for app in ['projects','insight']:
   context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light');page=context.new_page();errors=[];csp=[]
   context.on('page',lambda new_page:new_page.on('pageerror',lambda e:errors.append(str(e))))
   context.on('console',lambda m:csp.append(m.text) if 'Content Security Policy' in m.text or m.type=='error' else None)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:csp.append(m.text) if 'Content Security Policy' in m.text else None)
   context.route('**/portal01/ui-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><script>window.__portalAuthenticated=true;window.PortalUserId="workspace-ui-test";</script><iframe src="/portal01/apps/'+app+'/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
   page.goto(base+'/portal01/ui-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();frame=page.frames[1]
   assert f.locator('.portal-workspace-brand strong').inner_text()==('Project Management' if app=='projects' else 'Insight BI')
   assert frame.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()')==('#386bd8' if app=='projects' else '#178367')
   assert f.locator('#portal-app-sidebar').bounding_box()['width']==227
   assert f.locator('.portal-workspace-header').bounding_box()['height']==67
   if app=='projects':
    f.locator('[data-tab=store]').click();f.locator('#tab-store').wait_for(state='visible');assert f.locator('.title-row h1').inner_text()=='저장소 설정'
    f.locator('[data-tab=list]').focus();page.keyboard.press('ArrowDown');assert f.locator('[data-tab=store]').get_attribute('aria-selected')=='true'
    f.locator('[data-tab=list]').click();f.locator('#tab-list').wait_for(state='visible')
    frame.evaluate('PortalWorkspaceAdapter.prepare()');f.locator('#portal-app-theme').click();f.locator('#btn-new').click();f.locator('#p-name').fill('UI regression project');f.locator('#p-client').fill('Local test');f.locator('#p-start').fill('2026-11-01');f.locator('#p-end').fill('2026-12-31')
    with context.expect_page() as popup_event:f.locator('#pm-ok').click()
    popup=popup_event.value;popup.on('pageerror',lambda e:errors.append(str(e)));popup.on('console',lambda m:csp.append(m.text) if 'Content Security Policy' in m.text else None)

    popup.locator('[data-view=baseline]').wait_for(timeout=15000)
    assert popup.locator('html').get_attribute('data-portal-app')=='project-detail'
    assert popup.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()')=='#8fb4ff'
    popup.locator('[data-view=baseline]').click();popup.locator('#view-baseline').wait_for(state='visible')
    popup.close();f.locator('#portal-app-theme').click();f.locator('#list').get_by_text('UI regression project',exact=True).first.wait_for()
    saved=frame.evaluate('PortalWorkspaceAdapter.capture()');assert saved['files'],'Project registration must still persist files'
    print('PASS projects: vertical tabs/keyboard, registration, persisted data, WBS popup palette and navigation',flush=True)
   else:
    f.locator('[data-page=data]').click();f.locator('#data').wait_for(state='visible')
    f.locator('[data-page=settings]').click();f.locator('#settings').wait_for(state='visible');assert f.locator('.portal-storage-entry').is_visible()
    f.locator('[data-page=dashboards]').click();f.locator('#dashboards').wait_for(state='visible')
    print('PASS insight: dashboard, data and settings navigation retain native behavior',flush=True)
   f.locator('.portal-workspace-storage button').click();f.locator('.portal-cloud-dialog').wait_for(state='visible');f.locator('.portal-cloud-close').click()
   f.locator('#portal-app-theme').click();assert frame.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()')==('#8fb4ff' if app=='projects' else '#7cd9b2')

   if app=='insight':
    frame.evaluate("document.documentElement.dataset.portalApp='insight-detail'");assert frame.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()')==('#8fb4ff' if app=='projects' else '#7cd9b2');frame.evaluate("document.documentElement.dataset.portalApp='insight'")
   page.reload();f.locator('#portal-app-tools').wait_for();frame=page.frames[1];assert f.locator('#portal-app-theme').get_attribute('aria-pressed')=='true'
   f.locator('#portal-app-theme').click()
   for width in [1024,768,390]:
    page.set_viewport_size({'width':width,'height':950});
    assert frame.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(app,width,frame.evaluate('[document.documentElement.scrollWidth,innerWidth]'))

    if app=='insight':
     for section in ['data','settings','dashboards']:
      f.locator('[data-page='+section+']').click();assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(app,width,section)
    toggle=f.locator('#portal-sidebar-toggle');toggle.click();assert f.locator('#portal-app-sidebar').is_hidden();assert f.locator('#portal-sidebar-reopen').is_visible();f.locator('#portal-sidebar-reopen').click();assert f.locator('#portal-app-sidebar').is_visible()
   print('PASS '+app+': storage dialog, dark theme persistence, mobile/tablet layout and sidebar reopen',flush=True)
   assert not errors,errors;assert not csp,csp
   context.close()
  context=browser.new_context();page=context.new_page()
  for app in ['projects','insight']:
   page.goto(base+'/portal01/apps/'+app+'/');page.wait_for_url('**/portal01/#'+app);page.locator('#login-panel').wait_for(state='visible');assert not page.evaluate('window.__portalAuthenticated===true')
  print('PASS unauthenticated direct navigation remains protected for both apps',flush=True)
  browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  thread=Thread(target=server.serve_forever,daemon=True);thread.start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown();thread.join()
