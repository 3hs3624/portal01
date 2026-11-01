/* Shared same-origin login storage. Never put session tokens in window URLs. */
(() => {
  "use strict";
  const key = "3hs-auth-session";
  const migrated = "3hs-auth-local-migrated-v1";
  const get = Storage.prototype.getItem;
  const set = Storage.prototype.setItem;
  const remove = Storage.prototype.removeItem;
  const shared = localStorage;
  // Upgrade one existing tab session without reviving stale sessions after logout.
  if (!get.call(shared, migrated)) {
    const legacy = get.call(sessionStorage, key);
    if (!get.call(shared, key) && legacy) set.call(shared, key, legacy);
    if (get.call(shared, key)) set.call(shared, migrated, "1");
  }
  remove.call(sessionStorage, key);
  window.PortalAuthStorage = Object.freeze({
    getItem: (name) => get.call(shared, name),
    setItem: (name, value) => {
      set.call(shared, name, value);
      if (name === key) set.call(shared, migrated, "1");
    },
    removeItem: (name) => remove.call(shared, name),
  });
})();
