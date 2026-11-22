'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const ORIGIN = 'portal01://workspace';
function appURL(value) {
  try { const u = new URL(value); return u.protocol === 'portal01:' && u.hostname === 'workspace' && !u.port && !u.username && !u.password; }
  catch { return false; }
}
async function assetPath(root, value) {
  if (!appURL(value)) throw new Error('Invalid application origin');
  const u = new URL(value);
  let pathname = decodeURIComponent(u.pathname);
  if (!pathname.startsWith('/portal01/') || pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid asset path');
  let relative = pathname.slice('/portal01/'.length);
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const resolvedRoot = await fs.realpath(root);
  const target = await fs.realpath(path.resolve(resolvedRoot, relative));
  const relation = path.relative(resolvedRoot, target);
  if (relation.startsWith('..') || path.isAbsolute(relation)) throw new Error('Asset outside application');
  if (!(await fs.stat(target)).isFile()) throw new Error('Asset is not a file');
  return target;
}
module.exports = { ORIGIN, appURL, assetPath };
