"""Browser regressions for Write Studio; uses a test-only authenticated parent."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
from threading import Thread
import os
import shutil
ROOT = Path(__file__).resolve().parents[1]

class StudioHandler(SimpleHTTPRequestHandler):

    def translate_path(self, path):
        request = unquote(urlsplit(path).path)
        relative = request[len('/portal01/'):] if request.startswith('/portal01/') else '.missing'
        target = (ROOT / relative).resolve()
        return str(target if target.is_relative_to(ROOT) else ROOT / '.missing')

    def log_message(self, format, *args):
        pass
from playwright.sync_api import sync_playwright

def run_browser_suite(base_url, chromium):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = b.new_page(viewport={'width': 1500, 'height': 1100})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/portal01/test-host', lambda r: r.fulfill(content_type='text/html', body='<html><script>window.__portalAuthenticated=true;window.PortalUserId="block-regression";</script><iframe src="/portal01/apps/markdown/" style="width:100%;height:1050px;border:0"></iframe></html>'))
        page.goto(base_url + '/portal01/test-host')
        f = page.frame_locator('iframe')
        f.locator('.block-editor-content').wait_for()
        frame = page.frames[1]
        frame.wait_for_function('!APP.loading')

        def js(s):
            return frame.evaluate(s)

        def reset(text='Alpha\n\nBeta\n\nGamma'):
            frame.evaluate('(text)=>{closeBlockMenus();currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview");$("#preview").scrollTop=0;resetEditHistory();historyRecord();}', text)

        def insert(cmd):
            frame.evaluate('(cmd)=>{const b=richTopBlocks()[0];openInsertMenu(b,340,420);runSlash(cmd);}', cmd)
        reset()
        f.locator('.block-editor-content p').first.hover()
        assert f.locator('#blockControls button').count() == 2
        f.locator('.block-handle').click()
        assert f.locator('#blockMenu').is_visible()
        assert f.locator('#blockMenu').get_by_role('button', name='댓글', exact=False).count() == 1
        assert js('(()=>{const r=blockMenu.getBoundingClientRect();return r.bottom<=innerHeight&&r.left>=0;})()')
        f.locator('#blockMenu').get_by_role('button', name='색', exact=False).click()
        f.locator('#blockMenu').get_by_role('button', name='파란색 텍스트', exact=True).click()
        assert js('richTopBlocks()[0].node.attrs.studioColor') == 'blue'
        print('PASS gutter, action menu, color')
        reset()
        first = f.locator('.block-editor-content p').first
        third = f.locator('.block-editor-content p').nth(2)
        first.hover()
        handle = f.locator('.block-handle').bounding_box()
        target = third.bounding_box()
        page.mouse.move(handle['x'] + 12, handle['y'] + 12)
        page.mouse.down()
        page.mouse.move(target['x'] + 50, target['y'] + target['height'] - 2, steps=12)
        page.mouse.up()
        assert js('richTopBlocks().map(b=>b.node.textContent)') == ['Beta', 'Gamma', 'Alpha']
        print('PASS drag reorder')
        reset()
        f.locator('.block-editor-content p').first.click(button='right')
        assert f.locator('#slashMenu').is_visible()
        f.locator('#slashMenu input').fill('제목4')
        f.locator('#slashMenu button[data-command="heading4"]').click()
        assert f.locator('.block-editor-content h4').count() == 1
        reset('')
        f.locator('.block-editor-content p').click()
        page.keyboard.type('/heading2')
        assert f.locator('#slashMenu').is_visible()
        page.keyboard.press('Enter')
        assert f.locator('.block-editor-content h2').count() == 1
        assert '/' not in js('RICH.editor.state.doc.textContent')
        print('PASS context insertion, slash keyboard')
        for cmd in ['toggle', 'toggle1', 'toggle2', 'toggle3', 'callout', 'note', 'db-table', 'db-board', 'db-gallery', 'db-list', 'db-feed', 'db-dashboard', 'db-calendar', 'db-timeline', 'db-map', 'db-form', 'chart-bar', 'chart-horizontal', 'chart-line', 'chart-donut', 'chart-number', 'columns2', 'columns3', 'columns4', 'columns5', 'tabs', 'toc', 'breadcrumb', 'button', 'ai', 'equation', 'mermaid']:
            reset()
            insert(cmd)
            frame.wait_for_timeout(50)
            before = js('JSON.parse(signature(RICH.editor.state.doc.toJSON()))')
            text = js('previewMarkdown()')
            frame.evaluate('(text)=>{RICH.markdown=null;renderRichDocument(text);}', text)
            after = js('JSON.parse(signature(RICH.editor.state.doc.toJSON()))')
            assert before == after, (cmd, before, after)
            print('PASS insert / reload', cmd)
        reset()
        insert('db-table')
        f.locator('.studio-widget').get_by_role('button', name='+ 새 항목', exact=True).click()
        f.locator('dialog[open] input[aria-label="이름"]').fill('Project A')
        f.locator('dialog[open] input[aria-label="값"]').fill('42')
        f.locator('dialog[open] input[aria-label="날짜"]').fill('2026-11-03')
        f.locator('dialog[open] input[aria-label="위도"]').fill('37.5')
        f.locator('dialog[open] input[aria-label="경도"]').fill('127')
        f.locator('dialog[open]').get_by_role('button', name='저장', exact=True).click()
        assert 'Project A' in f.locator('.studio-db-table').inner_text()
        for view in ['board', 'gallery', 'list', 'feed', 'dashboard', 'calendar', 'timeline', 'map', 'form', 'bar', 'horizontal', 'line', 'donut', 'number', 'table']:
            f.locator('select[aria-label="데이터베이스 보기"]').select_option(view)
            assert js('JSON.parse(richTopBlocks().find(b=>b.node.type.name==="studioWidget").node.attrs.data).rows[0].title') == 'Project A'
        print('PASS database CRUD, 15 views retain data')
        f.locator('.studio-db-toolbar input').fill('does-not-exist')
        assert 'Project A' not in f.locator('.studio-db-body').inner_text()
        f.locator('.studio-db-toolbar input').fill('Project A')
        assert 'Project A' in f.locator('.studio-db-body').inner_text()
        print('PASS database filter')
        reset()
        js('activateBlock(richTopBlocks()[0].id);openAnnotations("comment")')
        f.locator('dialog[open] textarea').fill('A saved comment')
        f.locator('dialog[open]').get_by_role('button', name='댓글 등록', exact=True).click()
        assert 'A saved comment' in js('richTopBlocks()[0].node.attrs.studioNotes')
        f.locator('dialog[open]').get_by_role('button', name='닫기', exact=False).click()
        js('activateBlock(richTopBlocks()[0].id);openAnnotations("suggestion")')
        f.locator('dialog[open] textarea').fill('Updated Alpha')
        f.locator('dialog[open]').get_by_role('button', name='제안 등록', exact=True).click()
        f.locator('dialog[open]').get_by_role('button', name='수락', exact=True).click()
        assert js('richTopBlocks()[0].node.textContent') == 'Updated Alpha'
        f.locator('dialog[open]').get_by_role('button', name='닫기', exact=False).click()
        print('PASS saved comment and accept suggestion')
        reset()
        insert('equation')
        f.locator('.studio-equation .katex').wait_for()
        reset()
        insert('mermaid')
        f.locator('.studio-mermaid svg').wait_for(timeout=20000)
        print('PASS KaTeX and Mermaid render')
        reset()
        js('activateBlock(richTopBlocks()[0].id);startBlockPresentation()')
        assert f.locator('.studio-presentation[open]').is_visible()
        page.keyboard.press('ArrowRight')
        assert 'Beta' in f.locator('.studio-slide').inner_text()
        page.keyboard.press('Escape')
        print('PASS presentation navigation')
        reset()
        f.locator('.block-editor-content p').first.click()
        page.keyboard.press('Control+d')
        assert js('richTopBlocks().length') == 4
        js('runEditHistory("undo")')
        assert js('richTopBlocks().length') == 3
        print('PASS duplicate and undo')
        reset('')
        f.locator('.block-editor-content p').click()
        page.keyboard.type('/color-studioBackground-green')
        page.keyboard.press('Enter')
        assert js('richTopBlocks()[0].node.attrs.studioBackground') == 'green'
        print('PASS slash background palette')
        reset()
        insert('sync')
        f.locator('dialog[open]').get_by_role('button', name='Beta', exact=True).click()
        assert 'Beta' in f.locator('[data-studio-widget="sync"]').inner_text()
        js('(()=>{const b=richTopBlocks().find(b=>b.node.textContent==="Beta");RICH.editor.commands.insertContentAt({from:b.pos+1,to:b.pos+b.node.nodeSize-1},"Beta changed");})()')
        assert 'Beta changed' in f.locator('[data-studio-widget="sync"]').inner_text()
        print('PASS synchronized block follows original')
        reset()
        insert('db-table')
        insert('db-source')
        f.locator('dialog[open] button').filter(has_text=' / ').click()
        linked = f.locator('[data-studio-widget="database-link"]')
        linked.get_by_role('button', name='+ 새 항목', exact=True).click()
        f.locator('dialog[open] input[aria-label="이름"]').fill('Linked row')
        f.locator('dialog[open]').get_by_role('button', name='저장', exact=True).click()
        assert js('JSON.parse(richTopBlocks().find(b=>b.node.attrs.kind==="database").node.attrs.data).rows[0].title') == 'Linked row'
        print('PASS linked database edits original')
        reset()
        insert('image')
        f.locator('dialog[open] input[type=file]').set_input_files({'name': 'pixel.png', 'mimeType': 'image/png', 'buffer': __import__('base64').b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6l8AAAAASUVORK5CYII=')})
        f.locator('.studio-widget img').wait_for()
        frame.wait_for_function('document.querySelector(".studio-widget img").naturalWidth===1')
        text = js('previewMarkdown()')
        frame.evaluate('(text)=>{RICH.markdown=null;renderRichDocument(text);}', text)
        frame.wait_for_function('document.querySelector(".studio-widget img").naturalWidth===1')
        print('PASS local image attachment persists')
        reset()
        page.once('dialog', lambda d: d.accept('x^2 + y^2'))
        insert('inlineEquation')
        f.locator('.studio-inline-equation .katex').wait_for()
        before = js('JSON.parse(signature(RICH.editor.state.doc.toJSON()))')
        text = js('previewMarkdown()')
        frame.evaluate('(text)=>{RICH.markdown=null;renderRichDocument(text);}', text)
        assert before == js('JSON.parse(signature(RICH.editor.state.doc.toJSON()))')
        print('PASS inline formula persistence')
        reset()
        js('navigator.clipboard.writeText=async text=>window.__copiedBlock=text;activateBlock(richTopBlocks()[0].id);copyBlockLink()')
        copied = js('window.__copiedBlock')
        assert '/portal01/?studioDoc=' in copied and '#markdown' in copied
        assert js('richTopBlocks()[0].id.startsWith("link-")')
        print('PASS portal block link uses persistent block ID')
        reset()
        js('window.__targetDoc=newRecord("Move destination","Existing text");APP.documents.push(__targetDoc);activateBlock(richTopBlocks()[0].id);openBlockMenu(BLOCK_UI.id,340,400);showMoveMenu()')
        f.locator('#blockMenu').get_by_role('button', name='Move destination', exact=True).click()
        assert js('richTopBlocks()[0].node.textContent') == 'Beta'
        assert 'Alpha' in js('__targetDoc.content')
        js('runEditHistory("undo")')
        assert js('richTopBlocks()[0].node.textContent') == 'Alpha'
        assert js('__targetDoc.content') == 'Existing text'
        js('runEditHistory("redo")')
        assert js('richTopBlocks()[0].node.textContent') == 'Beta'
        assert 'Alpha' in js('__targetDoc.content')
        print('PASS cross-document move and atomic undo / redo')
        reset()
        page.once('dialog', lambda d: d.accept('<p onclick="window.__studioXSS=1">Safe HTML</p><script>window.__studioXSS=1</script>'))
        insert('embed')
        assert js('window.__studioXSS') is None
        assert 'onclick' not in js('richTopBlocks().find(b=>b.node.type.name==="studioEmbed").node.attrs.html')
        assert '<script>' not in js('previewMarkdown()')
        print('PASS embedded HTML strips executable content')
        reset()
        js('navigator.clipboard.writeText=async text=>window.__copiedBlock=text;activateBlock(richTopBlocks()[0].id);copyBlockLink()')
        copied = js('window.__copiedBlock')
        expectedDoc = js('APP.activeId')
        expectedBlock = js('richTopBlocks()[0].id')
        frame.evaluate('saveDraft()')
        root_html = (ROOT / 'index.html').read_text()
        root_html = __import__('re').sub('<script type="module" src="/portal01/login.js[^>]*></script>', '', root_html)
        page.route(__import__('re').compile('.*/portal01/\\?studioDoc=.*'), lambda r: r.fulfill(content_type='text/html', body=root_html))
        page.route('**/portal01/modules.json*', lambda r: r.fulfill(content_type='application/json', body='[{"id":"markdown","name":"Write Studio","category":"문서","metric":"문서"}]'))
        page.add_init_script('window.__portalAuthenticated=true;window.PortalUserId="block-regression";window.PortalStorage=localStorage;')
        page.goto(copied)
        page.add_script_tag(url=base_url + '/portal01/app.js')
        page.evaluate('document.querySelector("#workspace-shell").hidden=false;document.querySelector("#auth-loading").hidden=true;')
        page.frame_locator('#frames iframe').locator('.block-editor-content').wait_for()
        newFrame = page.frames[1]
        newFrame.wait_for_function('!APP.loading')
        assert newFrame.evaluate('APP.activeId') == expectedDoc
        assert newFrame.evaluate('location.hash') == '#block=' + expectedDoc + '&id=' + expectedBlock
        assert newFrame.evaluate('(id)=>richTopBlocks().some(b=>b.id===id)', expectedBlock)
        print('PASS portal route reopens saved document and block')
        assert not errors, errors
        print('PASS no browser errors')
        b.close()
if __name__ == '__main__':
    chromium = os.environ.get('CHROMIUM_BIN') or ('/usr/lib/chromium/chromium' if Path('/usr/lib/chromium/chromium').exists() else shutil.which('chromium'))
    if not chromium:
        raise SystemExit('Set CHROMIUM_BIN to an installed Chromium executable.')
    with ThreadingHTTPServer(('127.0.0.1', 0), StudioHandler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            run_browser_suite('http://127.0.0.1:' + str(server.server_port), chromium)
        finally:
            server.shutdown()
            thread.join()
