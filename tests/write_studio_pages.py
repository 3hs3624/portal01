"""Page rows, nested insertion, contextual actions, comments and guarded routes."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
import re
from playwright.sync_api import sync_playwright, expect
from write_studio_blocks import StudioHandler, ROOT


def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=browser.new_context(viewport={'width':1450,'height':1100});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.add_init_script('window.__portalAuthenticated=true;window.PortalUserId="page-regression";window.PortalStorage=localStorage;')
  c.route('**/portal01/page-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/portal01/page-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('!APP.loading');owner=fr.evaluate('APP.activeId');target=fr.evaluate(r'''()=>{const d=newRecord('사업진행 계획(by 전략사업팀)','# Project plan\n\nPreview body\n\n<script>window.__badPreview=true</script>');APP.documents.push(d);return d.id}''')
  def reset(content):
   fr.evaluate('''text=>{currentDoc().content=text;$('#editor').value=text;RICH.markdown=null;renderEditor();setView('preview');resetEditHistory();historyRecord()}''',content)
  source='<details data-studio-toggle="true" data-level="2" open><summary>Projects</summary><div data-studio-toggle-body="true"><p><a href="#doc-'+target+'">Old title</a></p></div></details>'
  reset(source);row=f.locator('.studio-page-row');expect(row.locator('.studio-page-link')).to_have_text('사업진행 계획(by 전략사업팀)');expect(row.locator('svg')).to_be_visible();assert row.bounding_box()['height']<=46;assert row.locator('svg').bounding_box()['width']==17;f.locator('.studio-toggle-arrow').click();expect(row).to_be_hidden();f.locator('.studio-toggle-arrow').click();expect(row).to_be_visible()
  menu=f.locator('#studioPageMenu')
  def show():row.hover();row.get_by_label('페이지 메뉴 열기').click();expect(menu).to_be_visible()
  show();expect(row).to_have_class(re.compile('studio-page-selected'));menu.get_by_role('menuitem',name='☆ 즐겨찾기에 추가',exact=True).click();assert fr.evaluate('(id)=>APP.documents.find(d=>d.id===id).favorite',target) is True;show();expect(menu.get_by_role('menuitem',name='★ 즐겨찾기에서 제거',exact=True)).to_be_visible();page.keyboard.press('Escape');expect(menu).to_be_hidden()
  row.click(button='right');expect(menu).to_be_visible();page.keyboard.press('Escape');row.locator('.studio-page-link').focus();page.keyboard.press('Control+/');expect(menu).to_be_visible();page.keyboard.press('Escape')
  for mode,label in [('side','사이드 미리보기'),('center','중앙 미리보기')]:
   show();menu.get_by_role('menuitem',name=re.compile('다음에서 열기')).click();menu.get_by_role('menuitem',name=label,exact=True).click();preview=f.locator('#studioPagePreview');expect(preview).to_be_visible();expect(preview).to_have_attribute('data-mode',mode);expect(preview).to_contain_text('Preview body');assert fr.evaluate('APP.activeId')==owner;assert fr.evaluate('window.__badPreview') is None;preview.get_by_role('button',name='닫기',exact=True).click()
  show();menu.get_by_role('menuitem',name=re.compile('댓글')).click();comments=f.locator('#studioPageComments');comments.get_by_label('페이지 댓글 내용').fill('검토 의견 <script>');comments.get_by_role('button',name='댓글 등록').click();expect(comments.locator('.studio-page-comment p')).to_have_text('검토 의견 <script>');assert fr.evaluate('(id)=>APP.documents.find(d=>d.id===id).pageComments.length',target)==1;comments.get_by_role('button',name='닫기',exact=True).click()
  fr.evaluate('navigator.clipboard.writeText=async text=>window.__pageCopied=text');show();menu.get_by_role('menuitem',name=re.compile('링크 복사')).click();copied=fr.evaluate('window.__pageCopied');assert copied==base+'/portal01/?studioDoc='+target+'#markdown';fr.evaluate('saveDraft()');page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('!APP.loading');expect(row).to_be_visible();assert fr.evaluate('(id)=>APP.documents.find(d=>d.id===id).pageComments[0].text',target)=='검토 의견 <script>'
  # Stored link row renders live document titles and retains backlinks.
  fr.evaluate('(id)=>{APP.documents.find(d=>d.id===id).title="Renamed project";document.dispatchEvent(new Event("studio:page-metadata-changed"))}',target);expect(row.locator('a')).to_have_text('Renamed project');row.locator('a').click();expect(f.locator('#docTitle')).to_have_value('Renamed project');f.get_by_role('button',name='페이지 댓글',exact=True).click();expect(comments).to_contain_text('검토 의견 <script>');page.once('dialog',lambda d:d.dismiss());comments.get_by_role('button',name='삭제',exact=True).click();expect(comments.locator('.studio-page-comment')).to_have_count(1);page.once('dialog',lambda d:d.accept());comments.get_by_role('button',name='삭제',exact=True).click();expect(comments.locator('.studio-page-comment')).to_have_count(0);comments.get_by_role('button',name='닫기',exact=True).click();fr.evaluate('(id)=>selectDocument(id)',owner)
  # New page insertion keeps the page row inside the enclosing toggle.
  reset('<details data-studio-toggle="true" open><summary>Projects</summary><div data-studio-toggle-body="true"><p>/</p></div></details>');f.locator('details p').click();page.keyboard.press('End');fr.evaluate('updateSlashMenu()');page.once('dialog',lambda d:d.accept('New child'));f.locator('#slashMenu [data-command=page]').click();expect(f.locator('details .studio-page-row')).to_have_count(1);expect(f.locator('details .studio-page-row a')).to_have_text('New child');assert fr.evaluate('APP.documents.some(d=>d.title==="New child")') is True
  f.locator('#undoEdit').click();expect(f.locator('details .studio-page-row')).to_have_count(0);f.locator('#redoEdit').click();expect(f.locator('details .studio-page-row')).to_have_count(1)
  # Existing-page picker creates a page row, while inline mentions stay inline.
  reset('Start');fr.evaluate('''()=>{const b=richTopBlocks()[0];insertStudioExtra('pageLink',{document:APP.activeId,id:b.id,mode:'add'})}''');f.locator('dialog.studio-dialog').get_by_role('button',name='Renamed project',exact=True).click();expect(row).to_have_count(1);fr.evaluate('saveDraft()');page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('!APP.loading');expect(row.locator('a')).to_have_text('Renamed project');assert fr.evaluate('references(currentDoc()).includes("'+target+'")') is True
  f.locator('#previewEditable').uncheck();show();expect(menu.get_by_role('menuitem',name=re.compile('즐겨찾기'))).to_be_disabled();menu.get_by_role('menuitem',name=re.compile('댓글')).click();expect(comments.get_by_label('페이지 댓글 내용')).to_be_enabled();comments.get_by_label('페이지 댓글 내용').fill('Reading-mode page comment');expect(comments.get_by_role('button',name='댓글 등록')).to_be_enabled();comments.get_by_role('button',name='댓글 등록').click();expect(comments.locator('.studio-page-comment')).to_have_count(1);comments.get_by_role('button',name='닫기',exact=True).click();f.locator('#previewEditable').check()
  print('PASS page icons/live titles, toggle nesting, handle/right-click/Ctrl+/ menu, favorites, previews and HTML sanitization, comments add/delete/cancel/reload, page link, new child/undo/redo, existing-page picker, backlinks and read-only protection',flush=True)
  show();assert row.bounding_box()['height']<=46;page.screenshot(path=str(Path('work/page-menu-preview.png').resolve()));page.keyboard.press('Escape');fr.evaluate('saveDraft()')
  root_html=re.sub('<script type="module" src="/portal01/login.js[^>]*></script>','',(ROOT/'index.html').read_text());c.route(re.compile('.*/portal01/\\?studioDoc=.*'),lambda r:r.fulfill(content_type='text/html',body=root_html));c.route('**/portal01/modules.json*',lambda r:r.fulfill(content_type='application/json',body='[{"id":"markdown","name":"Write Studio","category":"문서","metric":"문서"}]'))
  show();menu.get_by_role('menuitem',name=re.compile('다음에서 열기')).click()
  with page.expect_popup() as popup_info:menu.get_by_role('menuitem',name='새 탭',exact=True).click()
  popup=popup_info.value;popup.wait_for_url(re.compile('.*/portal01/\\?studioDoc=.*'));assert popup.evaluate('window.opener') is None;popup.add_script_tag(url=base+'/portal01/app.js');popup.evaluate('document.querySelector("#workspace-shell").hidden=false;document.querySelector("#auth-loading").hidden=true');pf=popup.frame_locator('#frames iframe');pf.locator('.block-editor-content').wait_for();new=popup.frames[1];new.wait_for_function('!APP.loading');assert new.evaluate('APP.activeId')==target;assert new.evaluate('location.hash')=='#doc='+target;popup.close();print('PASS real new-tab action saves first, removes opener, routes through portal to intended page',flush=True)
  assert not errors,errors;browser.close()

if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port))
 finally:s.shutdown()
