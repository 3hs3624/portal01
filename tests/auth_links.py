"""Invitation redirects preserve OTP-only sign-in and remove URL credentials."""
import os
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for suffix,notice,clean in [
   ('#error=access_denied&error_code=otp_expired&error_description=untrusted','만료되었거나','/portal01/'),
   ('#access_token=untrusted&refresh_token=untrusted&type=invite','초대받은 이메일','/portal01/'),
   ('?appWindow=markdown&code=untrusted','초대받은 이메일','/portal01/?appWindow=markdown'),
   ('#markdown','일회용 인증코드','/portal01/#markdown')]:
   context=browser.new_context();calls=[]
   context.route('https://tqomsmhicrjsidhuxkcb.supabase.co/**',lambda route:(calls.append(route.request),route.fulfill(status=400,json={'message':'Unexpected request'}))[-1])
   page=context.new_page();page.goto(base+'/portal01/'+suffix);page.locator('#login-panel').wait_for(state='visible')
   assert notice in page.locator('#login-message').inner_text(),page.locator('#login-message').inner_text()
   assert page.url==base+clean,page.url
   assert not page.evaluate('window.__portalAuthenticated===true')
   assert page.evaluate('localStorage.getItem("3hs-auth-session")') is None
   assert not calls,'URL credentials must not trigger authentication'
   context.close()
  print('PASS expired invite message, URL tokens never grant login, credentials scrubbed, app routes preserved',flush=True)
  for status in [200,429]:
   context=browser.new_context();requests=[]
   def mock(route):
    requests.append(route.request)
    route.fulfill(status=status,headers={'access-control-allow-origin':base,'access-control-allow-headers':'authorization,apikey,x-client-info,x-supabase-api-version,content-type'},json={} if status==200 else {'msg':'rate limited','error_code':'over_email_send_rate_limit'})
   context.route('https://tqomsmhicrjsidhuxkcb.supabase.co/**',mock)
   page=context.new_page();page.goto(base+'/portal01/');page.locator('#login-panel').wait_for(state='visible');page.locator('#email').fill('invite-test@example.test');page.locator('#login').click()
   if status==200:
    page.locator('#code-form').wait_for(state='visible')
    request=next(r for r in requests if '/auth/v1/otp' in r.url)
    assert request.post_data_json['create_user'] is False
    assert 'redirect_to='+__import__('urllib.parse',fromlist=['quote']).quote(base+'/portal01/',safe='') in request.url,request.url
   else:
    page.wait_for_function("document.querySelector('#login-message').textContent.includes('요청을 처리하지 못했습니다')")
    assert page.locator('#code-form').is_hidden()
   context.close()
  print('PASS OTP uses portal redirect and blocks auto-signup; failed email request does not show false success',flush=True)
  browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  thread=Thread(target=server.serve_forever,daemon=True);thread.start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown();thread.join()
