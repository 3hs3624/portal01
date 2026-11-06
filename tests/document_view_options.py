"""Each document retains preview editing and both scroll options across switches/reload/backups."""
from threading import Thread
from http.server import ThreadingHTTPServer
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(accept_downloads=True,viewport={'width':1450,'height':1050});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));c.route('**/view-options-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><script>window.__portalAuthenticated=true;window.PortalUserId="view-options-test"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'));page.goto(base+'/view-options-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading&&ST.ready')
  def flags():return [f.locator('#'+id).is_checked() for id in ['previewEditable','syncScroll','syncScrollBoth']]
  def settled():fr.wait_for_function('()=>!ST.dirty&&!ST.saving&&!ST.busy')
  f.locator('#docTitle').fill('문서 A');fr.evaluate("setView('edit')");f.locator('#editor').fill('# 원본 본문\n\n설정만 바꾸어도 본문을 유지합니다.');settled();fr.evaluate("setView('split')");a=fr.evaluate('APP.activeId');timestamp=fr.evaluate('currentDoc().updatedAt');body=fr.evaluate('currentDoc().content')
  f.locator('#syncScrollBoth').check();f.locator('#previewEditable').uncheck();settled();assert flags()==[False,True,True];assert fr.evaluate('RICH.editor.isEditable') is False;assert fr.evaluate('currentDoc().updatedAt')==timestamp;assert fr.evaluate('currentDoc().content')==body
  other=fr.evaluate("()=>{const d=newRecord('문서 B','B의 본문');APP.documents.push(d);selectDocument(d.id);changed();return d.id}");assert flags()==[True,True,False];f.locator('#syncScroll').uncheck();settled();assert flags()==[True,False,False];expect(f.locator('#syncScrollBoth')).to_be_disabled();assert fr.evaluate('RICH.editor.isEditable') is True
  fr.evaluate('id=>selectDocument(id)',a);assert flags()==[False,True,True];expect(f.locator('#syncScrollBoth')).to_be_enabled();fr.evaluate('id=>selectDocument(id)',other);assert flags()==[True,False,False]
  # A third document starts from defaults rather than inheriting the last active document.
  third=fr.evaluate("()=>{const d=newRecord('새 문서','');APP.documents.push(d);selectDocument(d.id);changed();return d.id}");assert flags()==[True,True,False];fr.evaluate('id=>selectDocument(id)',other);settled();page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading&&ST.ready');assert fr.evaluate('APP.activeId')==other;assert flags()==[True,False,False];fr.evaluate('id=>selectDocument(id)',a);assert flags()==[False,True,True]
  # Native backup carries the settings with each document and supports restoring them.
  original=fr.evaluate('captureWorkspace()');assert next(d for d in original['documents'] if d['id']==a)['editorOptions']=={'directEdit':False,'syncScroll':True,'syncScrollBoth':True};assert next(d for d in original['documents'] if d['id']==other)['editorOptions']=={'directEdit':True,'syncScroll':False,'syncScrollBoth':False}
  f.locator('#previewEditable').check();settled();fr.evaluate('w=>restoreWorkspace(w)',original);assert flags()==[False,True,True];fr.evaluate('id=>selectDocument(id)',other);assert flags()==[True,False,False]
  f.locator('#portal-cloud-open').click();dialog=f.locator('.studio-storage-dialog');dialog.get_by_role('button',name='백업·복구 목록',exact=True).click()
  with page.expect_download() as d:dialog.get_by_role('button',name='현재 작업 JSON 내려받기',exact=True).click()
  backup=json.loads(Path(d.value.path()).read_text());assert next(x for x in backup['documents'] if x['id']==a)['editorOptions']['directEdit'] is False;dialog.get_by_role('button',name='저장소 닫기').click()
  # Older documents preserve the old browser preference as their initial per-document default.
  fr.evaluate("()=>{localStorage.setItem('md-editor-direct-v2','false');localStorage.setItem('md-editor-scroll-sync','false');localStorage.setItem('md-editor-scroll-sync-both','true');for(const d of APP.documents)delete d.editorOptions;changed(false)}");settled();page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading&&ST.ready');assert flags()==[False,False,True];assert fr.evaluate('currentDoc().editorOptions===undefined');expect(f.locator('#syncScrollBoth')).to_be_disabled();f.locator('#previewEditable').check();settled();fr.evaluate('id=>selectDocument(id)',a);assert flags()==[False,False,True];assert not errors,errors;print('PASS per-document options, preview editability, independent defaults, switching/reload, unchanged content/timestamp, JSON backup/restore and legacy preference migration',flush=True);b.close()
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=server.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(server.server_port))
 finally:server.shutdown()
