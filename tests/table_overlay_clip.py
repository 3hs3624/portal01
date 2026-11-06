"""Scrolled tables keep resize/reorder guides inside the editor viewport."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from write_studio_blocks import StudioHandler


def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1600,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/clip-host',lambda r:r.fulfill(content_type='text/html',body='<script>window.__portalAuthenticated=true;window.PortalUserId="clip-test"</script><iframe src="/portal01/apps/markdown/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
  page.goto(base+'/clip-host');f=page.frame_locator('iframe');f.locator('.block-editor-content').wait_for();fr=page.frames[1];fr.wait_for_function('()=>!APP.loading')
  text='| Name | Value |\n| --- | --- |\n'+'\n'.join('| Row '+str(i)+' | Value '+str(i)+' |' for i in range(70))
  fr.evaluate('text=>{currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview");}',text)
  fr.evaluate('()=>{let n=document.querySelector(".block-editor-content table").parentElement;while(n&&!(n.scrollHeight>n.clientHeight&&/auto|scroll/.test(getComputedStyle(n).overflowY)))n=n.parentElement;if(!n)throw Error("Missing scroll pane");window.clipScroll=n;n.scrollTop=350}')
  page.wait_for_timeout(150)
  info=fr.evaluate('()=>{const t=document.querySelector(".block-editor-content table"),c=studioTableViewport(t),rows=[...t.rows],index=rows.findIndex(r=>r.getBoundingClientRect().top>c.top+30);const cell=rows[index].cells[0].getBoundingClientRect();return {clip:c,index,cell:{right:cell.right,top:cell.top,height:cell.height},tableTop:t.getBoundingClientRect().top}}')
  clip=info['clip'];assert info['tableTop']<clip['top']
  cell=info['cell'];page.mouse.move(cell['right']-1,cell['top']+cell['height']/2)
  edge=f.get_by_role('button',name='열 너비 조절',exact=True);expect(edge).to_be_visible();r=edge.bounding_box();assert r['y']>=clip['top']-1 and r['y']+r['height']<=clip['bottom']+1,(r,clip)
  table=f.locator('.block-editor-content table');source=table.locator('tr').nth(info['index']);target=table.locator('tr').nth(info['index']+1);source.locator('td').first.hover();handle=f.locator('#studioTableRowHandle');a=handle.bounding_box();z=target.bounding_box();page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down();page.mouse.move(z['x']+30,z['y']+z['height']/2,steps=10)
  line=f.locator('.studio-axis-insertion');expect(line).to_be_visible();r=line.bounding_box();assert r['y']>=clip['top']-1 and r['y']+r['height']<=clip['bottom']+1 and r['x']>=clip['left']-1 and r['x']+r['width']<=clip['right']+1,(r,clip)
  page.mouse.move(clip['left']+30,clip['top']-35,steps=8);expect(line).to_be_hidden();page.mouse.up()
  assert not errors,errors;print('PASS scrolled resize and row insertion guides clipped to editor; leaving editor hides insertion guide',flush=True);browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
