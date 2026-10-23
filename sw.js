/* Offline support: keeps the app itself available without internet. Case data is never cached here. */
const CACHE = 'case-diary-v1.66.0';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'paper.js', 'files.js', 'step3.js', 'sort.js', 'drafts.js', 'ai.js', 'ease.js', 'viewer.js', 'voice.js', 'bills.js', 'refs.js', 'lib/jszip.min.js', 'lib/docx.umd.js', 'manifest.webmanifest', 'lib/msal-browser.min.js', 'lib/xlsx.full.min.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'cd-share').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // papers shared into Case Diary from WhatsApp, Gallery or Files: keep them for the app, then open it
  if (e.request.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/share-in')) {
    e.respondWith((async () => {
      const fd = await e.request.formData(), files = fd.getAll('files').filter(f => f && f.size);
      const c = await caches.open('cd-share');
      await Promise.all((await c.keys()).map(k => c.delete(k)));
      let i = 0;
      for (const f of files) await c.put(new URL('shared/' + (i++), self.registration.scope).href, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'file') } }));
      return Response.redirect(new URL('./?share=' + files.length, self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!sameOrigin && !fonts) return; // Microsoft sign-in and OneDrive go straight to the network
  e.respondWith(
    fetch(e.request).then(r => { if (r.ok && !u.search.includes('code=')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
