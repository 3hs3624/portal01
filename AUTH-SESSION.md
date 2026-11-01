# Same-browser application sign-in

`auth-session.js` supplies the Supabase client with native, same-origin localStorage access. A signed-in portal session can therefore be restored by another tab/window in the same browser profile. The existing separate-window link keeps `rel="noopener"`; it does not transfer tokens through URLs, messages, or an opener.

The portal still calls the authentication server's `getUser()` and `portal_auth_context` before showing applications. Existing account restrictions, app permissions, token refresh and logout BroadcastChannel remain in place. Logout removes the shared auth session and signs out the other portal windows. Per-user application data remains independently namespaced by `PortalUserId`.

An existing legacy sessionStorage login migrates once when its original portal tab reloads. Anonymous visits do not mark migration complete. Once a shared session has existed, stale legacy tab sessions cannot resurrect it after logout. Refresh the original portal tab once after deployment before opening a separate application window. Sessions can persist across browser restarts until sign-out or server expiry/revocation; private profiles and different browsers do not share login storage.

Run `python3 tests/portal_sso.py` with Python Playwright and Chromium installed (`CHROMIUM_BIN` overrides the executable path). It exercises the actual login SDK and separate-window link against mocked authentication HTTP. It checks legacy migration, an opener-free new window without OTP, refresh, closure of the original tab, cross-tab logout, stale-session rejection, and rejection by the authentication server. No real account or OTP service is contacted.
