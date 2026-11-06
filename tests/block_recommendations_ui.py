"""Recommendations follow actual successful menu insertions, not cancelled dialogs or content loads."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':1450,'height':1050});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def host(user):return '<script>window.__portalAuthenticated=true;window.PortalUserId="'+user+'"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'
  c.route('**/recommendation-host',lambda r:r.fulfill(content_type='text/html',body=host('recommendation-user')));page.goto(base+'/recommendation-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading&&ST.ready')
  def open_menu():fr.evaluate("()=>{setView('preview');openInsertMenu(richTopBlocks()[0],300,170)}")
  def commands():return fr.evaluate('BlockRecommendations.recommend(SLASH,localStorage)')
  assert commands()==['note','embed','mermaid','toggle3'];open_menu();assert fr.evaluate('BlockRecommendations.read(localStorage).length')==0
  page.once('dialog',lambda d:d.dismiss());f.locator('#slashMenu [data-command=embed]').click();assert fr.evaluate('BlockRecommendations.read(localStorage).length')==0
  open_menu();f.locator('#slashMenu [data-command=table]').click();assert commands()[0]=='table';assert fr.evaluate('BlockRecommendations.read(localStorage).length')==1
  open_menu();expect(f.locator('#slashMenu [data-command]').first).to_have_attribute('data-command','table');assert f.locator('#slashMenu [data-command=table]').count()==1;f.locator('#slashMenu [data-command=mermaid]').click();assert fr.evaluate('BlockRecommendations.read(localStorage).length')==2
  open_menu();f.locator('#slashMenu [data-command=table]').click();assert commands()[0]=='table';open_menu();f.locator('#slashMenu [data-command=db-board]').click();history=fr.evaluate('BlockRecommendations.read(localStorage)');assert [x['command'] for x in history]==['table','mermaid','table','db-board'];assert commands()[0]=='table'
  fr.evaluate("()=>{const d=newRecord('다른 문서','');APP.documents.push(d);selectDocument(d.id);changed()}");assert commands()[0]=='table';fr.wait_for_function('()=>!ST.dirty&&!ST.saving');page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading&&ST.ready');assert commands()[0]=='table';open_menu();f.locator('#slashMenu .studio-menu-search').fill('표');assert f.locator('#slashMenu [data-command=table]').count()==1;fr.evaluate('closeBlockMenus()')
  c.route('**/recommendation-other',lambda r:r.fulfill(content_type='text/html',body=host('recommendation-other-user')));other=c.new_page();other.goto(base+'/recommendation-other');of=other.frame_locator('iframe');of.locator('.block-editor-content').wait_for();other.frames[1].wait_for_function('()=>!APP.loading&&ST.ready');assert other.frames[1].evaluate('BlockRecommendations.recommend(SLASH,localStorage)')==['note','embed','mermaid','toggle3'];other.close();assert not errors,errors;print('PASS cancelled prompts excluded, successful basic/widget insertions counted, recent/frequent ranking, no duplicate/search regressions, reload and account isolation',flush=True);b.close()
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=server.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(server.server_port))
 finally:server.shutdown()
