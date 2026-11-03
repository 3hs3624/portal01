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
   assert not errors,errors
   print('PASS '+app+': equal widths at 8 viewports, top-right placement, exact portal icon, collapse/reopen, keyboard and persistence',flush=True)
   context.close()
  browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
