#!/usr/bin/env node
/* Static smoke test — catches the class of bugs this audit fixed.
   Usage: node scripts/smoke.mjs [origin]
   Default: http://127.0.0.1:8788  (npm run dev) */
const origin = process.argv[2] || 'http://127.0.0.1:8788';
const pages = ['/', '/bn/', '/ar/', '/en-us/', '/404.html', '/icab-ca-governance-mithun-mutsuddi.html'];
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

for (const p of pages) {
  console.log('\n== ' + p + ' ==');
  let html, status;
  try { const r = await fetch(origin + p); status = r.status; html = await r.text(); }
  catch (e) { ok(false, 'fetch failed: ' + e.message); continue; }
  ok(status === 200, 'HTTP ' + status);
  const b64 = (html.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{2000,}/g) || []);
  ok(b64.length === 0, 'no giant inline base64 blobs (found ' + b64.length + ')');
  const imgSrcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1])
    .filter(s => !s.startsWith('data:') && !s.startsWith('http'));
  for (const src of [...new Set(imgSrcs)]) {
    const url = new URL(src, origin + p).href;
    try { const r = await fetch(url, { method: 'HEAD' }); ok(r.ok, 'img ' + src + ' → ' + r.status); }
    catch { ok(false, 'img ' + src + ' unreachable'); }
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  const noDim = imgs.filter(i => !/width="/.test(i) || !/height="/.test(i));
  ok(noDim.length === 0, 'all <img> have width+height (missing: ' + noDim.length + ')');
  if (p.endsWith('index.html') || p === '/') {
    ok(/loading="lazy"/.test(html), 'lazy loading present');
    ok(/rel="preload" as="image"/.test(html), 'hero image preloaded');
  }
}
console.log('\n' + (fail ? '❌ ' + fail + ' check(s) failed' : '✅ all checks passed'));
process.exit(fail ? 1 : 0);
