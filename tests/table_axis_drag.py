"""Real pointer/HTML drags for both table implementations, history and persisted widths."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.parse import quote
import json
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':1600,'height':1100});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.route('**/axis-host',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="axis-test"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'));page.goto(base+'/axis-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading')
  def load(text):fr.evaluate('text=>{currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview");resetEditHistory();historyRecord()}',text)
  def pointer_drag(source,target,dx=0):
   a=source.bounding_box();z=target.bounding_box();page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.mouse.move(z['x']+z['width']/2+dx,z['y']+z['height']/2,steps=12);page.mouse.up()
  def resize(cell,delta):
   r=cell.bounding_box();page.mouse.move(r['x']+r['width']-1,r['y']+r['height']/2);edge=f.get_by_role('button',name='열 너비 조절',exact=True);expect(edge).to_be_visible();a=edge.bounding_box();page.mouse.move(a['x']+a['width']/2,a['y']+min(12,a['height']/2));page.mouse.down();page.mouse.move(a['x']+a['width']/2+delta,a['y']+12,steps=10);page.mouse.up()
  load('| Name | Status | Note |\n| --- | --- | --- |\n| Alpha | One | A |\n| Beta | Two | B |\n');table=f.locator('.block-editor-content table');table.locator('tr').nth(1).locator('td').first.hover();pointer_drag(f.locator('#studioTableColumnHandle'),table.locator('tr').first.locator('th').nth(2));expect(table.locator('tr').first).to_have_text('StatusNoteName');expect(table.locator('tr').nth(1)).to_have_text('OneAAlpha');expect(f.locator('#studioTableMenu')).to_be_hidden();f.locator('#undoEdit').click();expect(table.locator('tr').first).to_have_text('NameStatusNote')
  table.locator('tr').nth(2).locator('td').first.hover();pointer_drag(f.locator('#studioTableRowHandle'),table.locator('tr').nth(1).locator('td').first);expect(table.locator('tr').nth(1)).to_contain_text('Beta');f.locator('#undoEdit').click();expect(table.locator('tr').nth(1)).to_contain_text('Alpha')
  resize(table.locator('tr').first.locator('th').first,90);width=fr.evaluate('RICH.editor.state.doc.firstChild.firstChild.firstChild.attrs.colwidth[0]');assert width>=100,width;fr.evaluate('saveDraft()');fr.wait_for_function('()=>!ST.dirty&&!ST.saving');page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading');assert fr.evaluate('RICH.editor.state.doc.firstChild.firstChild.firstChild.attrs.colwidth[0]')==width;print('PASS normal table column/row handle drag, undo, edge resize and reload width persistence',flush=True)
  data={'title':'Axes','view':'table','fields':[{'id':'title','name':'이름','type':'text'},{'id':'status','name':'상태','type':'text'}],'rows':[{'id':'r'+str(i),'title':'Record '+str(i),'status':'State '+str(i)} for i in range(3)]};load('<section data-studio-widget="database" data-studio-data="'+quote(json.dumps(data),safe='')+'"><p>DB</p></section>');db=f.locator('[data-studio-widget=database]');db.get_by_role('button',name='이름',exact=True).hover();db.get_by_role('button',name='열 이동: 이름',exact=True).drag_to(db.get_by_role('button',name='상태',exact=True));assert fr.evaluate('JSON.parse(RICH.editor.state.doc.firstChild.attrs.data).fields.map(f=>f.id)')==['status','title']
  db.locator('tr[data-row-id=r2]').hover();db.get_by_role('button',name='행 메뉴: Record 2',exact=True).drag_to(db.locator('tr[data-row-id=r0]'));expect(db.locator('tr[data-row-id]').first).to_contain_text('Record 2');resize(db.locator('th').nth(1),100);current=fr.evaluate('JSON.parse(RICH.editor.state.doc.firstChild.attrs.data)');assert next(f for f in current['fields'] if f['id']=='title')['width']==520;assert abs(db.locator('th').nth(1).bounding_box()['width']-520)<3
  fr.evaluate('saveDraft()');fr.wait_for_function('()=>!ST.dirty&&!ST.saving');page.reload();f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading');restored=fr.evaluate('JSON.parse(RICH.editor.state.doc.firstChild.attrs.data)');assert restored['fields']==current['fields'];assert [r['id'] for r in restored['rows']]==['r2','r0','r1'];expect(db.locator('th').nth(1)).to_be_visible();assert abs(db.locator('th').nth(1).bounding_box()['width']-520)<3;assert not errors,errors;print('PASS database column/row handle drag, per-field edge width and restored order/widths',flush=True);b.close()
if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port))
 finally:s.shutdown()
