"""Automatic first save, editable in-flight saves, recovery on failure and reload persistence."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':1500,'height':1000});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.route('**/autosave-host',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="autosave-test"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/autosave-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>Boolean(!APP.loading&&ST.ready)');assert f.locator('#saveWorkspace').evaluate('(e)=>e.tagName')=='SPAN';assert f.get_by_role('button',name='저장',exact=True).count()==0
  fr.evaluate("storageAPI('preferences',{autoSave:false})");page.reload();f.locator('.block-editor-content').wait_for(state='attached');fr=page.frames[1];fr.wait_for_function('()=>Boolean(!APP.loading&&ST.ready&&ST.settings.autoSave)');assert fr.evaluate("$('#storageAutoSave').checked&&$('#storageAutoSave').disabled")
  f.locator('#docTitle').fill('자동저장 첫 문서');fr.evaluate("setView('edit')");f.locator('#editor').fill('자동저장 본문');fr.wait_for_function('()=>Boolean(ST.revision&&!ST.dirty&&!ST.saving)');expect(f.locator('#saveWorkspace')).to_contain_text('자동저장 완료');saved=fr.evaluate("storageAPI('load',{id:activeStorage().id})");assert saved['workspace']['documents'][0]['title']=='자동저장 첫 문서';assert saved['workspace']['documents'][0]['content']=='자동저장 본문'
  fr.evaluate("()=>{window.__realStorageAPI=storageAPI;storageAPI=async(a,p)=>{if(a==='save'){window.__savingTest=true;await new Promise(r=>setTimeout(r,700));}return __realStorageAPI(a,p)}}")
  f.locator('#editor').fill('첫 저장 작업');fr.wait_for_function('()=>Boolean(window.__savingTest&&ST.saving)');expect(f.locator('#editor')).to_be_enabled();f.locator('#editor').fill('저장 중에도 계속 입력');fr.wait_for_function('()=>Boolean(!ST.dirty&&!ST.saving)');saved=fr.evaluate("storageAPI('load',{id:activeStorage().id})");assert saved['workspace']['documents'][0]['content']=='저장 중에도 계속 입력'
  fr.evaluate("()=>{storageAPI=async(a,p)=>{if(a==='save')throw Error('검증용 저장 실패');return __realStorageAPI(a,p)}}");f.locator('#docTitle').fill('실패 후 복구할 문서');fr.wait_for_function('()=>Boolean(ST.blocked&&!ST.saving)');expect(f.locator('#saveWorkspace')).to_have_text('자동저장 실패');fr.wait_for_function('()=>Boolean(APP.localGeneration===APP.generation)');draft=fr.evaluate('readDraft()');assert draft['documents'][0]['title']=='실패 후 복구할 문서';saved=fr.evaluate("storageAPI('load',{id:activeStorage().id})");assert saved['workspace']['documents'][0]['title']=='자동저장 첫 문서'
  fr.evaluate('()=>{storageAPI=__realStorageAPI}');f.locator('#editor').press('Control+s');fr.wait_for_function('()=>Boolean(!ST.dirty&&!ST.blocked&&!ST.busy)');page.reload();f.locator('.block-editor-content').wait_for(state='attached');fr=page.frames[1];fr.wait_for_function('()=>Boolean(!APP.loading)');expect(f.locator('#docTitle')).to_have_value('실패 후 복구할 문서');expect(f.locator('#editor')).to_have_value('저장 중에도 계속 입력');assert not errors,errors
  print('PASS automatic first save, old preference migration, status-only UI, continued typing in flight, newest generation persisted, failure draft recovery, retry and reload',flush=True);b.close()
if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port))
 finally:s.shutdown()
