"""Switching/moving editor panes preserves source and removes stale rich controls."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from write_studio_blocks import StudioHandler


def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1600,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/view-host',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="view-test"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/view-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading')
  text='# Keep this heading\n\nOriginal paragraph\n\n| Name | Value |\n| --- | --- |\n| Alpha | 1 |\n| Beta | 2 |\n'
  fr.evaluate('text=>{currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview")}',text)
  f.locator('.block-editor-content p').first.hover();expect(f.locator('#blockControls')).to_be_visible()
  fr.evaluate('RICH.editor.commands.setTextSelection({from:1,to:4});updateSelectionBubble()');expect(f.locator('#selectionBubble')).to_be_visible()
  f.locator('button[data-view=edit]').click();expect(f.locator('#blockControls')).to_be_hidden();expect(f.locator('#selectionBubble')).to_be_hidden();expect(f.locator('#editor')).to_have_value(text)
  assert f.locator('#editor').bounding_box()['width']>500
  for view in ['split','preview','edit','split','edit']:
   f.locator('button[data-view='+view+']').click();expect(f.locator('#editor')).to_have_value(text)
   if view=='edit':expect(f.locator('#blockControls')).to_be_hidden()
  f.locator('#editor').click();f.locator('#editor').press('Control+End');page.keyboard.type('\nSource edit survives')
  # Switch before the debounced source preview fires.
  f.locator('button[data-view=preview]').click();expect(f.locator('.block-editor-content')).to_contain_text('Source edit survives')
  f.locator('button[data-view=split]').click();resize=f.locator('#resizer');r=resize.bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+100);page.mouse.down();page.mouse.move(r['x']+120,r['y']+100,steps=8);page.mouse.up()
  f.locator('.block-editor-content p').first.hover();control=f.locator('#blockControls');expect(control).to_be_visible();a=control.bounding_box();pane=f.locator('#preview').bounding_box();assert a['x']>=pane['x'] and a['y']>=pane['y'],(a,pane)
  cell=f.locator('.block-editor-content table tr').nth(1).locator('td').first;cell.hover();expect(f.locator('#studioTableRowHandle')).to_be_visible()
  f.locator('button[data-view=edit]').click();expect(f.locator('#studioTableRowHandle')).to_be_hidden();expect(f.locator('.studio-column-edge')).to_be_hidden();expect(f.locator('#blockControls')).to_be_hidden()
  assert fr.evaluate('$("#editor").value===currentDoc().content')
  assert not errors,errors;print('PASS document/Markdown/split transitions, no stale controls, source edits preserved and handles realign after pane movement',flush=True);browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
