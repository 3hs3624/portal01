"""All app sidebars share width, placement and the portal's actual toggle SVG."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler
import re
from pathlib import Path


def run(base):
 portal=(Path(__file__).resolve().parents[1]/'index.html').read_text()
 portal_svg=re.search(r'<button id="sidebar-toggle".*?(<svg.*?</svg>)',portal).group(1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for app in ['markdown','projects','insight']:
   context=browser.new_context(viewport={'width':1920,'height':1000});page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   context.route('**/portal01/sidebar-test',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="sidebar-test";</script><iframe src="/portal01/apps/'+app+'/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
   page.goto(base+'/portal01/sidebar-test');f=page.frame_locator('iframe');f.locator('#portal-sidebar-toggle').wait_for();frame=page.frames[1]
   # Canonical browser SVG serialization matches the portal, not a similar glyph.
   assert f.locator('#portal-sidebar-toggle svg').evaluate('(svg,expected)=>{const host=document.createElement("div");host.innerHTML=expected;return svg.outerHTML===host.firstChild.outerHTML}',portal_svg)
   for width,expected in [(1920,250),(1700,250),(1440,227),(1200,195),(950,175),(768,175),(640,125),(390,125)]:
    page.set_viewport_size({'width':width,'height':1000});side=f.locator('#portal-app-sidebar');toggle=f.locator('#portal-sidebar-toggle')
    assert side.bounding_box()['width']==expected,(app,width,side.bounding_box()['width'])
    s=side.bounding_box();b=toggle.bounding_box();assert b['x']>s['x']+s['width']/2 and b['x']+b['width']<=s['x']+s['width'],(app,width,s,b)
    assert 0<=b['y']-s['y']<=35,(app,width,s,b)
    before=f.locator('main').bounding_box()['width'];toggle.click();assert side.is_hidden();reopen=f.locator('#portal-sidebar-reopen');assert reopen.is_visible();assert reopen.get_attribute('aria-expanded')=='false'
    assert f.locator('main').bounding_box()['width']>before
    assert reopen.locator('svg').evaluate('(svg,expected)=>{const host=document.createElement("div");host.innerHTML=expected;return svg.outerHTML===host.firstChild.outerHTML}',portal_svg)
    reopen.press('Enter');assert side.is_visible();assert toggle.get_attribute('aria-expanded')=='true'
   f.locator('#portal-sidebar-toggle').click();page.reload();f.locator('#portal-sidebar-reopen').wait_for();assert f.locator('#portal-app-sidebar').is_hidden();f.locator('#portal-sidebar-reopen').click();assert f.locator('#portal-app-sidebar').is_visible()
   page.set_viewport_size({'width':1440,'height':1000})
   handle=f.locator('.portal-sidebar-resizer[aria-controls=portal-app-sidebar]');handle.wait_for(state='visible');side=f.locator('#portal-app-sidebar')
   assert side.bounding_box()['width']==227
   h=handle.bounding_box();page.mouse.move(h['x']+4,h['y']+100);page.mouse.down();page.mouse.move(h['x']+104,h['y']+100,steps=10);page.mouse.up()
   assert side.bounding_box()['width']==327,(app,side.bounding_box())
   assert f.locator('.portal-sidebar-resize-shield:visible').count()==0
   page.reload();f.locator('#portal-sidebar-toggle').wait_for();assert side.bounding_box()['width']==327
   handle.focus();page.keyboard.press('ArrowLeft');assert side.bounding_box()['width']==317
   f.locator('#portal-sidebar-toggle').click();assert handle.is_hidden();f.locator('#portal-sidebar-reopen').click();assert side.bounding_box()['width']==317
   h=handle.bounding_box();page.mouse.move(h['x']+4,h['y']+100);page.mouse.down();page.mouse.move(h['x']+84,h['y']+100,steps=8);page.keyboard.press('Escape');page.mouse.up();assert side.bounding_box()['width']==317
   handle.focus();page.keyboard.press('Home');assert side.bounding_box()['width']==227
   page.reload();f.locator('#portal-sidebar-toggle').wait_for();assert side.bounding_box()['width']==227
   print('PASS '+app+': pointer resize, persistence, keyboard, collapse/reopen, Escape rollback and default reset',flush=True)
   if app=='markdown':
    outline=f.locator('#outlinePane');right=f.locator('.portal-sidebar-resizer[aria-controls=outlinePane]');initial=outline.bounding_box()['width'];before_main=f.locator('.preview-pane').bounding_box()['width']
    h=right.bounding_box();page.mouse.move(h['x']+4,h['y']+100);page.mouse.down();page.mouse.move(h['x']-116,h['y']+100,steps=12);page.mouse.up()
    assert outline.bounding_box()['width']==initial+120
    assert f.locator('.preview-pane').bounding_box()['width']<before_main
    page.reload();right.wait_for(state='visible');assert outline.bounding_box()['width']==initial+120
    f.locator('#portal-sidebar-toggle').click();assert right.is_visible();f.locator('#portal-sidebar-reopen').click()
    right.focus();page.keyboard.press('ArrowLeft');assert outline.bounding_box()['width']==initial+130
    page.frames[1].evaluate("document.body.classList.add('focus')");assert right.is_hidden();page.frames[1].evaluate("document.body.classList.remove('focus')");assert right.is_visible()
    right.dblclick(position={'x':4,'y':100});assert outline.bounding_box()['width']==initial
    page.set_viewport_size({'width':900,'height':1000});right.wait_for(state='hidden');page.set_viewport_size({'width':1440,'height':1000});right.wait_for(state='visible')
    print('PASS ON THIS PAGE: left-edge drag, editor relayout, persistence, left sidebar independence, keyboard, focus/narrow hiding and double-click reset',flush=True)
   assert not errors,errors
   print('PASS '+app+': equal widths at 8 viewports, top-right placement, exact portal icon, collapse/reopen, keyboard and persistence',flush=True)
   context.close()
  context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page()
  context.route('**/portal01/login.js*',lambda r:r.fulfill(content_type='application/javascript',body="""window.__portalAuthenticated=true;window.PortalUserId='portal-resize';window.PortalStorage={getItem:k=>localStorage.getItem('portal-test:'+k),setItem:(k,v)=>localStorage.setItem('portal-test:'+k,v)};document.querySelector('#auth-loading').hidden=true;document.querySelector('#workspace-shell').hidden=false;import('./app.js');"""))
  page.goto(base+'/portal01/');handle=page.locator('.portal-sidebar-resizer');handle.wait_for(state='visible');side=page.locator('#sidebar');before=side.bounding_box()['width'];main=page.locator('.main');main_before=main.bounding_box()['x']
  h=handle.bounding_box();page.mouse.move(h['x']+4,h['y']+100);page.mouse.down();page.mouse.move(h['x']+104,h['y']+100,steps=10);page.mouse.up()
  assert side.bounding_box()['width']==before+100
  assert main.bounding_box()['x']==main_before+100,(main.bounding_box(),main_before)
  page.reload();handle.wait_for(state='visible');assert side.bounding_box()['width']==before+100
  page.locator('#sidebar-toggle').click();assert handle.is_hidden();page.locator('#sidebar-toggle').click();assert side.bounding_box()['width']==before+100
  handle.focus();page.keyboard.press('Home');assert side.bounding_box()['width']==before
  page.set_viewport_size({'width':600,'height':1000});handle.wait_for(state='hidden')
  print('PASS portal: resize aligns main content, persistence, collapse, reset and mobile layout',flush=True)
  context.close()
  browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
