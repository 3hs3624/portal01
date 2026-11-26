"""User manual navigation, search, auth-role separation, failure recovery and mobile."""
import json
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler,chromium_executable

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'manual-content.json').read_text())
assert len(DATA['articles'])==len({a['id'] for a in DATA['articles']})
assert all(r in {a['id'] for a in DATA['articles']} for a in DATA['articles'] for r in a['related'])

def setup(page,admin=False):
 page.route('**/portal01/apps/**',lambda r:r.fulfill(content_type='text/html',body='<p>App fixture</p>'))
 page.route('**/portal01/login.js*',lambda r:r.fulfill(content_type='application/javascript',body="""
window.__portalAuthenticated=true;window.PortalUserId='manual-test';
window.PortalAccess={configured:true,isAdmin:%s,permissions:['app.markdown.read','app.projects.read','app.insight.read']};
window.PortalStorage={getItem:k=>localStorage.getItem('manual-test:'+k),setItem:(k,v)=>localStorage.setItem('manual-test:'+k,v)};
document.querySelector('#auth-loading').hidden=true;document.querySelector('#workspace-shell').hidden=false;
import('./app.js');"""%('true' if admin else 'false')))

def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=chromium_executable(),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1500,'height':1000});setup(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/portal01/#manual');expect(page.locator('#manual-article h1')).to_have_text('Portal 사용 시작하기')
  expect(page.locator('#manual-link')).to_be_visible();expect(page.locator('#sidebar-system')).to_be_hidden()
  assert page.evaluate("!!(document.querySelector('.sidebar-manual').compareDocumentPosition(document.querySelector('#sidebar-system')) & Node.DOCUMENT_POSITION_FOLLOWING)")
  expect(page.locator('#manual-link')).to_have_attribute('aria-current','page')
  search=page.locator('#manual-search');search.fill('조건부 서식');expect(page.locator('#manual-list a[href="#manual/pm-excel"]')).to_be_visible()
  page.locator('#manual-list a[href="#manual/pm-excel"]').click();expect(page.locator('#manual-article h1')).to_have_text('WBS Excel 업로드·다운로드')
  expect(search).to_have_value('조건부 서식')
  page.locator('#manual-toc button').last.click();expect(page.locator('#manual-section-3')).to_be_focused()
  page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw Error('blocked')};}");page.get_by_role('button',name='이 문서 링크 복사').click();expect(page.locator('.manual-article-footer [role=status]')).to_contain_text('주소창')
  search.fill('<img src=x onerror=alert(1)>');expect(page.locator('#manual-results-status')).to_have_text('0개 문서');assert page.locator('#manual-view img').count()==0
  page.get_by_role('button',name='검색 초기화').click();page.locator('#manual-category').select_option('Write Studio');expect(page.locator('#manual-results-status')).to_have_text('8개 문서')
  page.locator('#manual-list a').first.focus();page.keyboard.press('Enter');expect(page.locator('#manual-article h1')).to_have_text('문서와 폴더, 검색 관리')
  page.locator('.manual-related').first.click();expect(page.locator('#manual-article h1')).to_have_text('Markdown·분할·문서 보기와 문서별 옵션')
  page.evaluate("location.hash='#home'");expect(page.locator('#manual-view')).to_be_hidden();page.locator('#manual-link').click();expect(page.locator('#manual-view')).to_be_visible()
  page.evaluate("location.hash='#manual/no-such-article'");expect(page.locator('#manual-article')).to_contain_text('찾을 수 없는 문서')
  page.goto(base+'/portal01/#manual/pm-excel');expect(page.locator('#manual-article h1')).to_have_text('WBS Excel 업로드·다운로드')
  page.screenshot(path=str(ROOT/'work/manual-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});expect(page.locator('#manual-search')).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  page.screenshot(path=str(ROOT/'work/manual-mobile.png'),full_page=True)
  assert not errors,errors
  admin=browser.new_page();setup(admin,True);admin.goto(base+'/portal01/#manual');expect(admin.locator('#sidebar-system')).to_be_visible();expect(admin.locator('#manual-article')).to_be_visible()
  fail=browser.new_page();setup(fail);fail.route('**/manual-content.json*',lambda r:r.fulfill(status=503,body='offline'))
  fail.goto(base+'/portal01/#manual');expect(fail.get_by_role('button',name='다시 시도',exact=True)).to_be_visible();fail.unroute('**/manual-content.json*');fail.get_by_role('button',name='다시 시도',exact=True).click();expect(fail.locator('#manual-article')).to_be_visible()
  browser.close()
 print('PASS manual: 35 articles/112 sections, member/admin placement, search/filter, direct/related links, keyboard/TOC, copy failure, retry, navigation and mobile')

if __name__=='__main__':
 (ROOT/'work').mkdir(exist_ok=True)
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
