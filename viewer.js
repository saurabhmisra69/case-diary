/* Case Diary — view papers inside the app.
   PDFs, photos, audio and video open full-screen in the app itself, with Download and Share.
   Word / Excel files still open in the Office app (files.js). The PDF reader (pdf.js) loads only when first needed. */
'use strict';

const VIEWABLE = { pdf: 'pdf', jpg: 'img', jpeg: 'img', png: 'img', webp: 'img', gif: 'img', heic: 'img', mp3: 'audio', m4a: 'audio', ogg: 'audio', opus: 'audio', wav: 'audio', mp4: 'video', '3gp': 'video', mov: 'video' };
let pdfLibLoading = null;
function loadPdfLib() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfLibLoading) pdfLibLoading = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'lib/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; ok(window.pdfjsLib); };
    s.onerror = () => { pdfLibLoading = null; bad(new Error('PDF reader could not load')); };
    document.head.appendChild(s);
  });
  return pdfLibLoading;
}

const V = { blob: null, name: '', kind: '', scale: 1, pdf: null, url: '' };
function closeViewer() {
  const el = document.getElementById('viewer'); if (el) el.remove();
  document.body.style.overflow = '';
  if (V.url) URL.revokeObjectURL(V.url);
  if (V.pdf) V.pdf.destroy();
  Object.assign(V, { blob: null, pdf: null, url: '' });
  if (history.state && history.state.viewer) history.back();
}
window.addEventListener('popstate', () => { if (document.getElementById('viewer')) { history.pushState(null, ''); closeViewer(); } });

async function viewFile(it) {
  const ext = (it.name.split('.').pop() || '').toLowerCase();
  V.kind = VIEWABLE[ext]; V.name = it.name; V.scale = 1;
  document.body.style.overflow = 'hidden';
  history.pushState({ viewer: 1 }, '');
  const root = document.createElement('div'); root.id = 'viewer';
  root.innerHTML = `<div class="v-bar">
      <button class="v-btn" data-v="close" aria-label="Close">${I.x}</button>
      <b class="v-name">${esc(it.name)}</b>
      ${V.kind === 'pdf' ? `<button class="v-btn" data-v="out" aria-label="Zoom out">−</button><button class="v-btn" data-v="in" aria-label="Zoom in">+</button>` : ''}
      <button class="v-btn v-dl" data-v="dl">Download</button>
      ${navigator.canShare ? `<button class="v-btn" data-v="share">Share</button>` : ''}
    </div>
    <div class="v-body" id="v_body"><p class="v-msg">Opening ${esc(it.name)}…</p></div>`;
  document.body.appendChild(root);
  root.addEventListener('click', onViewerClick);
  try {
    const r = await g('/me/drive/items/' + it.id + '/content');
    if (!r.ok) throw new Error('OneDrive ' + r.status);
    V.blob = await r.blob();
    const body = document.getElementById('v_body'); if (!body) return;
    if (V.kind === 'pdf') {
      const lib = await loadPdfLib();
      V.pdf = await lib.getDocument({ data: await V.blob.arrayBuffer() }).promise;
      await drawPdf();
    } else {
      V.url = URL.createObjectURL(V.blob);
      body.innerHTML = V.kind === 'img' ? `<img class="v-img" src="${V.url}" alt="${esc(it.name)}">`
        : V.kind === 'audio' ? `<audio controls autoplay src="${V.url}" style="width:100%;margin-top:30vh"></audio>`
        : `<video controls autoplay playsinline src="${V.url}" style="width:100%;max-height:80vh"></video>`;
    }
  } catch (e) {
    const body = document.getElementById('v_body');
    if (body) body.innerHTML = `<p class="v-msg">Could not open this file here (${esc(e.message)}).<br><button class="v-btn v-dl" data-v="web">Open in OneDrive instead</button></p>`;
    V.webUrl = it.webUrl;
  }
  V.webUrl = it.webUrl;
}

async function drawPdf() {
  const body = document.getElementById('v_body'); if (!body || !V.pdf) return;
  body.innerHTML = '';
  const width = Math.min(body.clientWidth - 16, 1100) * V.scale, dpr = Math.min(window.devicePixelRatio || 1, 3);
  for (let n = 1; n <= V.pdf.numPages; n++) {
    const page = await V.pdf.getPage(n);
    const base = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: (width / base.width) * dpr });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px'; c.className = 'v-page';
    body.appendChild(c);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    if (!document.getElementById('viewer')) return;
  }
  const foot = document.createElement('p'); foot.className = 'v-msg'; foot.textContent = V.pdf.numPages + ' page' + (V.pdf.numPages > 1 ? 's' : '');
  body.appendChild(foot);
}

async function onViewerClick(e) {
  const b = e.target.closest('[data-v]'); if (!b) return;
  const a = b.dataset.v;
  if (a === 'close') closeViewer();
  else if (a === 'in' || a === 'out') { V.scale = Math.max(0.6, Math.min(3, V.scale * (a === 'in' ? 1.25 : 0.8))); drawPdf(); }
  else if (a === 'dl') {
    if (!V.blob) { toast('Still opening…'); return; }
    const link = document.createElement('a'); link.href = URL.createObjectURL(V.blob); link.download = V.name; document.body.appendChild(link); link.click(); link.remove();
    toast('Saved to Downloads: ' + V.name, 3500);
  }
  else if (a === 'share') {
    if (!V.blob) { toast('Still opening…'); return; }
    const f = new File([V.blob], V.name, { type: V.blob.type || 'application/octet-stream' });
    try { await navigator.share({ files: [f], title: V.name }); } catch (er) { if (er.name !== 'AbortError') toast('Could not share this file'); }
  }
  else if (a === 'web') { if (V.webUrl) window.open(V.webUrl, '_blank'); }
}
