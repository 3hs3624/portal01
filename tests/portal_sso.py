"""Exercise the real login SDK with mocked auth HTTP; never contacts real accounts."""
import base64
import json
import os
from pathlib import Path
import time
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler


def run(base, chromium):
    user = {"id": "e78ee520-ff2c-4dab-85b3-0dd8d3c85f95", "email": "sso-test@example.test", "email_confirmed_at": "2026-01-01T00:00:00Z", "aud": "authenticated", "role": "authenticated"}
    now = int(time.time())
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    token = encode({"alg": "HS256", "typ": "JWT"}) + '.' + encode({"sub": user['id'], "exp": now + 3600, "iat": now, "role": "authenticated"}) + '.test-only-signature'
    session = {"access_token": token, "refresh_token": "test-only-refresh", "expires_at": now + 3600, "expires_in": 3600, "token_type": "bearer", "user": user}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context()
        requests = []
        def mock_auth(route):
            url = route.request.url
            requests.append(url)
            headers = {'access-control-allow-origin': base, 'access-control-allow-headers': 'authorization,apikey,x-client-info,x-supabase-api-version,content-type,accept'}
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=headers)
            elif '/auth/v1/user' in url:
                route.fulfill(json=user, headers=headers)
            elif '/auth/v1/logout' in url:
                route.fulfill(status=204, headers=headers)
            elif '/rest/v1/rpc/portal_auth_context' in url:
                route.fulfill(json={'configured': False, 'enabled': True, 'isAdmin': False, 'permissions': None}, headers=headers)
            else:
                route.fulfill(status=400, json={'error': 'Unexpected test request'}, headers=headers)
        context.route('https://tqomsmhicrjsidhuxkcb.supabase.co/**', mock_auth)
        context.route('**/portal01/modules.json*', lambda route: route.fulfill(json=[{'id': 'markdown', 'name': 'Write Studio', 'category': '문서', 'metric': '문서'}]))
        page = context.new_page()
        page.goto(base + '/portal01/#markdown')
        page.locator('#login-panel').wait_for(state='visible')
        assert page.evaluate('localStorage.getItem("3hs-auth-local-migrated-v1")') is None
        page.evaluate('(session)=>sessionStorage.setItem("3hs-auth-session",JSON.stringify(session))', session)
        page.reload()
        page.wait_for_function('() => window.__portalAuthenticated===true')
        assert page.evaluate('sessionStorage.getItem("3hs-auth-session")') is None
        assert page.evaluate('Boolean(localStorage.getItem("3hs-auth-session"))')
        print('PASS legacy tab session migrates to shared login storage', flush=True)
        app = page.frame_locator('#frames iframe')
        app.locator('#portal-app-tools').wait_for()
        with context.expect_page() as new_page:
            app.locator('.portal-app-external').click()
        popup = new_page.value
        popup.wait_for_url('**/portal01/?appWindow=markdown#markdown')
        popup.wait_for_load_state()
        popup.wait_for_function('() => window.__portalAuthenticated===true')
        assert popup.evaluate('window.opener===null')
        assert popup.evaluate('sessionStorage.getItem("3hs-auth-session")') is None
        assert popup.locator('#login-panel').is_hidden()
        assert popup.locator('#sidebar').is_hidden()
        assert popup.locator('.main > header').is_hidden()
        assert popup.locator('#frames iframe').count() == 1
        popup.frame_locator('#frames iframe').locator('.block-editor-content').wait_for()
        assert popup.frame_locator('#frames iframe').locator('.portal-app-external').count() == 0
        bounds=popup.locator('#frames iframe').bounding_box()
        assert bounds['x']==0 and bounds['y']==0
        assert bounds['height']==popup.evaluate('innerHeight')
        assert bounds['width']==popup.evaluate('innerWidth')
        assert popup.title()=='Write Studio'
        print('PASS detached application fills the window without portal navigation/header',flush=True)
        assert len([url for url in requests if '/auth/v1/user' in url]) >= 2
        assert not any('/auth/v1/otp' in url for url in requests)
        print('PASS actual separate-window button restores login without opener or OTP', flush=True)
        popup.reload()
        popup.wait_for_function('() => window.__portalAuthenticated===true')
        print('PASS separate window remains signed in after refresh', flush=True)
        page.close()
        popup.reload()
        popup.wait_for_function('() => window.__portalAuthenticated===true')
        print('PASS separate window remains signed in after original closes', flush=True)
        peer = context.new_page()
        peer.goto(base + '/portal01/')
        peer.wait_for_function('() => window.__portalAuthenticated===true')
        peer.locator('#logout').click()
        popup.locator('#login-panel').wait_for(state='visible')
        assert not popup.evaluate('window.__portalAuthenticated===true')
        peer.locator('#login-panel').wait_for(state='visible')
        assert not peer.evaluate('window.__portalAuthenticated===true')
        assert peer.evaluate('localStorage.getItem("3hs-auth-session")') is None
        print('PASS logout clears shared session and closes authenticated UI in other tabs', flush=True)
        # Old, still-open tab sessions must never resurrect a session after logout.
        peer.evaluate('(session)=>sessionStorage.setItem("3hs-auth-session",JSON.stringify(session))', session)
        peer.reload()
        peer.locator('#login-panel').wait_for(state='visible')
        assert not peer.evaluate('window.__portalAuthenticated===true')
        print('PASS stale per-tab session cannot restore login after shared logout', flush=True)
        # Local storage alone never grants access: the server must accept getUser.
        peer.evaluate('(session)=>localStorage.setItem("3hs-auth-session",JSON.stringify(session))', session)
        context.unroute('https://tqomsmhicrjsidhuxkcb.supabase.co/**')
        context.route('https://tqomsmhicrjsidhuxkcb.supabase.co/**', lambda route: route.fulfill(status=401, headers={'access-control-allow-origin': base}, json={'msg': 'Invalid test session'}))
        peer.reload()
        peer.locator('#login-panel').wait_for(state='visible')
        assert not peer.evaluate('window.__portalAuthenticated===true')
        print('PASS server-rejected session cannot open the workspace', flush=True)
        browser.close()


if __name__ == '__main__':
    chromium = os.environ.get('CHROMIUM_BIN', '/usr/lib/chromium/chromium')
    with ThreadingHTTPServer(('127.0.0.1', 0), StudioHandler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            run('http://127.0.0.1:' + str(server.server_port), chromium)
        finally:
            server.shutdown()
            thread.join()
