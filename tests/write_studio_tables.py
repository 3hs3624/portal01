"""Table axis menus, safe document mutations, persistence and centered folder chevrons."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler


def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);context=browser.new_context(viewport={'width':1500,'height':1100});page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  context.route('**/portal01/table-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><script>window.__portalAuthenticated=true;window.PortalUserId="table-regression";</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/portal01/table-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();frame=page.frames[1];frame.wait_for_function('!APP.loading')
  table=f.locator('.block-editor-content table');menu=f.locator('#studioTableMenu');palette=f.locator('#studioTablePalette')
  source='| 구분 | 적용 | 비고 |\n| --- | --- | --- |\n| Alpha | One | A |\n| Beta | Two | B |\n'
  def reset(text=source):
   frame.evaluate('(text)=>{currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview");resetEditHistory();historyRecord();}',text)
  def open_axis(axis='row',row=1,col=0):
   cell=table.locator('tr').nth(row).locator('td,th').nth(col);cell.hover();f.locator('#studioTable'+('Row' if axis=='row' else 'Column')+'Handle').click();menu.wait_for(state='visible')
  def action(key):menu.locator('[data-table-menu-action='+key+']').click()
  reset();open_axis();assert table.locator('.selectedCell').count()==3;menu.locator('input').fill('삽입');assert menu.locator('button').count()==2;menu.locator('input').fill('');action('after');assert table.locator('tr').count()==4;assert table.locator('tr').nth(2).inner_text().strip()==''
  f.locator('#undoEdit').click();assert table.locator('tr').count()==3
  open_axis();action('duplicate');assert table.locator('tr').count()==4;assert table.locator('tr').nth(2).inner_text()==table.locator('tr').nth(1).inner_text()
  open_axis(row=2);action('clear');assert table.locator('tr').nth(2).inner_text().strip()=='';assert table.locator('tr').nth(1).inner_text().startswith('Alpha')
  open_axis(row=2);action('delete');assert table.locator('tr').count()==3
  open_axis('column',row=1,col=1);action('before');assert table.locator('tr').nth(0).locator('td,th').count()==4
  open_axis('column',row=1,col=0);action('duplicate');assert table.locator('tr').nth(0).locator('td,th').count()==5
  open_axis('column',row=1,col=0);action('delete');assert table.locator('tr').nth(0).locator('td,th').count()==4
  print('PASS row/column menus, action search, insert, duplicate, clear, delete and undo',flush=True)
  reset();frame.evaluate('RICH.editor.chain().focus().setTextSelection(4).run()');f.locator('#studioTableRowHandle').wait_for();f.locator('#studioTableRowHandle').press('Enter');menu.wait_for(state='visible');page.keyboard.press('Control+d');assert table.locator('tr').count()==4;f.locator('#undoEdit').click();assert table.locator('tr').count()==3

  reset();open_axis();action('color');palette.wait_for(state='visible');palette.locator('[data-table-cell-color="studioBackground:blue"]').click();assert table.locator('tr').nth(1).locator('[data-studio-background=blue]').count()==3
  open_axis();action('color');palette.locator('[data-table-cell-color="studioColor:red"]').click();assert table.locator('tr').nth(1).locator('[data-studio-color=red]').count()==3
  assert 'data-studio-background="blue"' in frame.evaluate('currentDoc().content')
  frame.evaluate('saveDraft()');page.reload();f.locator('.block-editor-content table').wait_for();frame=page.frames[1];assert table.locator('tr').nth(1).locator('[data-studio-background=blue]').count()==3
  open_axis();action('color');palette.locator('[data-table-cell-color="studioBackground:default"]').click();assert table.locator('tr').nth(1).locator('[data-studio-background]').count()==0
  open_axis('column',row=1,col=1);action('color');palette.locator('[data-table-cell-color="studioBackground:green"]').click();assert table.locator('tr').nth(0).locator('[data-studio-background=green]').count()==1
  open_axis();page.keyboard.press('Escape');assert menu.is_hidden()
  print('PASS independent text/background colors, defaults, header colors and persistence after reload',flush=True)
  f.locator('#openExport').click()
  with page.expect_download() as exported:f.locator('#exportHtml').click()
  html=Path(exported.value.path()).read_text();assert 'data-studio-color="red"' in html;assert '[data-studio-color="red"]{color:#c4554d}' in html;f.locator('#exportDialog [data-close]').click()

  reset();table.locator('td').first.hover();f.locator('#studioTableAddRow').click();assert table.locator('tr').count()==4
  table.locator('td').first.hover();f.locator('#studioTableAddColumn').click();assert table.locator('tr').first.locator('td,th').count()==4
  def drag(axis,distance):
   table.locator('td').first.hover();button=f.locator('#studioTableAdd'+('Row' if axis=='row' else 'Column'));box=button.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+(distance if axis=='column' else 0),y+(distance if axis=='row' else 0),steps=6);page.mouse.up()
  drag('row',85);assert table.locator('tr').count()==6
  drag('column',85);assert table.locator('tr').first.locator('td,th').count()==6
  page.once('dialog',lambda dialog:dialog.dismiss());drag('row',-45);assert table.locator('tr').count()==6
  page.once('dialog',lambda dialog:dialog.accept());drag('column',-45);assert table.locator('tr').first.locator('td,th').count()==5
  f.locator('#undoEdit').click();assert table.locator('tr').first.locator('td,th').count()==6
  print('PASS bottom/right click-to-add bars, drag expansion, confirmed reduction, cancellation and atomic undo',flush=True)

  reset();open_axis(row=0);action('delete');assert table.locator('tr').count()==2;assert table.locator('tr').first.locator('th').count()==3;assert table.locator('tr').first.inner_text().startswith('Alpha')
  reset();f.locator('#previewEditable').uncheck();table.locator('td').first.hover();assert f.locator('#studioTableRowHandle').is_hidden();f.locator('#previewEditable').check()
  reset();open_axis();frame.evaluate('APP.activeId="stale-document";document.querySelector("[data-table-menu-action=delete]").click()');assert table.locator('tr').count()==3;frame.evaluate('APP.activeId=APP.documents[0].id')
  print('PASS header promotion, read-only mode and stale-document action rejection',flush=True)
  reset('<table><tbody><tr><th rowspan="2">A</th><th>B</th></tr><tr><td>C</td></tr><tr><td>D</td><td>E</td></tr></tbody></table>');open_axis(row=1,col=0);assert menu.locator('[data-table-menu-action=duplicate]').is_disabled();assert menu.locator('[data-table-menu-action=delete]').is_disabled();page.keyboard.press('Escape');table.locator('td').first.hover();f.locator('#studioTableAddColumn').click();assert frame.evaluate('BlockEngine.TableMap.get(RICH.editor.state.doc.firstChild).width')==3
  reset('| Header |\n| --- |\n| Body |');open_axis('column',row=1,col=0);page.once('dialog',lambda dialog:dialog.dismiss());action('delete');assert table.count()==1;page.once('dialog',lambda dialog:dialog.accept());action('delete');assert table.count()==0;f.locator('#undoEdit').click();assert table.count()==1
  print('PASS merged-cell safeguards, append on merged table, whole-table delete confirmation and undo',flush=True)

  frame.evaluate('''()=>{const now=new Date().toISOString();APP.folders=[{id:'folder-test',name:'Folder',parentId:'',createdAt:now,updatedAt:now}];TREE.collapsed.clear();renderDocList()}''')
  row=f.locator('[data-folder-id=folder-test] > .folder-row');toggle=row.locator('.folder-toggle');icon=row.locator('.folder-icon svg')
  def center(locator):
   b=locator.bounding_box();return b['y']+b['height']/2
  assert abs(center(toggle.locator('svg'))-center(icon))<=1
  toggle.click();assert toggle.get_attribute('aria-expanded')=='false';assert abs(center(toggle.locator('svg'))-center(icon))<=1
  print('PASS expanded and collapsed folder SVGs align with the folder icon center',flush=True)
  assert not errors,errors;browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
