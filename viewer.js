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
      ${V.kind === 'pdf' || V.kind === 'img' ? `<button class="v-btn v-read" data-v="read">Read</button>` : ''}
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
  else if (a === 'read') readThisPaper();
  else if (a === 'rclose') { const p = document.getElementById('v_read'); if (p) p.remove(); }
  else if (a === 'go') { const fn = (V.actions || [])[+b.dataset.i]; if (fn) { closeViewer(); setTimeout(fn, 150); } }
  else if (a === 'copy') { try { await navigator.clipboard.writeText(V.readText || ''); toast('Copied'); } catch (er) { toast('Could not copy'); } }
}

/* ---------- "Read" — Claude reads the paper that is open and offers what to do next ---------- */
function readPrompt(m) {
  return `You are assisting an Indian advocate (Saurabh Misra, Lucknow). Read the attached paper${m ? ` from the matter "${m.title}" (${m.type || ''} ${m.caseNo || ''}; ${m.court || ''}; we act for the ${m.side || 'client'})` : ''}. Today is ${todayIso()}.
Reply with ONLY a JSON object:
{"kind": "order" | "judgment" | "notice" | "petition/application" | "affidavit" | "FIR/charge-sheet" | "evidence/statement" | "other",
 "title": "what this paper is, in a few words",
 "summary": "3 to 6 short plain-English sentences: what it says and what it means for our client; refer to any court as Hon'ble Court",
 "orderDate": "YYYY-MM-DD or empty",
 "happened": one of ${JSON.stringify(typeof HAPPENED !== 'undefined' ? HAPPENED : [])} or empty,
 "nextDate": "YYYY-MM-DD or empty", "purpose": "what the next date is for, or empty", "item": "", "courtNo": "",
 "interimRelief": "interim protection granted (e.g. 'no coercive action shall be taken against the applicant'), or empty",
 "operatesTill": "till when the interim order operates, or empty",
 "directions": [{"text": "what must be done", "by": "who", "dueDate": "YYYY-MM-DD or empty"}],
 "watch": ["anything risky or urgent the advocate should notice, e.g. interim order lapsing, last opportunity, costs, warrant"],
 "sameMatter": true or false}
Never guess a date; leave it empty if unclear.`;
}
async function readThisPaper() {
  if (!V.blob) { toast('Still opening…'); return; }
  if (!aiKey()) { closeViewer(); setTimeout(() => { sheetAiKey(); toast('First add your API key'); }, 150); return; }
  const m = S.tab === 'matter' ? find(S.mid) : null;
  const old = document.getElementById('v_read'); if (old) old.remove();
  const panel = document.createElement('div'); panel.id = 'v_read'; panel.className = 'v-read-panel';
  panel.innerHTML = '<p class="v-msg" style="margin:8px 0">Reading… about 10–30 seconds.</p>';
  document.getElementById('viewer').appendChild(panel);
  let o;
  try {
    const isPdf = V.kind === 'pdf';
    if (isPdf && V.blob.size > 30 * 1024 * 1024) throw new Error('This PDF is too large to read (over 30 MB)');
    const blob = isPdf ? V.blob : await shrinkImage(V.blob, 1800);
    const data = await toB64(blob);
    const part = isPdf ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 1500, messages: [{ role: 'user', content: [part, { type: 'text', text: readPrompt(m) }] }] }) });
    if (r.status === 401) throw new Error('The API key was not accepted (More › Order reading)');
    if (!r.ok) { let t = ''; try { t = (await r.json()).error?.message || ''; } catch (e) {} throw new Error('Could not read (' + r.status + ') ' + t); }
    const t = ((await r.json()).content || []).map(c => c.text || '').join('');
    o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  } catch (e) { panel.innerHTML = `<p class="v-msg">${esc(e.message)}</p><button class="v-btn" data-v="rclose">Close</button>`; return; }
  if (!document.getElementById('v_read')) return;
  const iso = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const dirs = (o.directions || []).filter(d => d && d.text);
  const dl = dirs.filter(d => iso(d.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const acts = [];
  if (m) {
    if (iso(o.nextDate) || o.kind === 'order' || o.kind === 'judgment') acts.push([iso(o.nextDate) ? 'Record next date ' + dmy(o.nextDate) : 'Record this hearing', () => sheetRecord(m, {
      fromOrder: true, heardOn: iso(o.orderDate) && o.orderDate <= todayIso() ? o.orderDate : '', happened: (typeof HAPPENED !== 'undefined' && HAPPENED.includes(o.happened)) ? o.happened : 'Adjourned',
      next: iso(o.nextDate) && o.nextDate > todayIso() ? o.nextDate : '', purpose: o.purpose || m.purpose || '', item: String(o.item || ''), note: o.summary || '',
      deadline: dl ? dl.dueDate : '', deadlineFor: dl ? dl.text : '' })]);
    const f = {}; applyOrderToFields('interim', { orderDate: iso(o.orderDate) ? dmy(o.orderDate) : '', interimRelief: o.interimRelief, operatesTill: o.operatesTill, courtNo: o.courtNo, summary: o.summary }, f);
    if (m.forum === 'HC') {
      if (o.interimRelief) acts.push(['Interim order extension application', () => sheetDraft(m, { key: 'interim', f: { ...f } })]);
      const fs = {}; applyOrderToFields('slip', { orderDate: iso(o.orderDate) ? dmy(o.orderDate) : '', interimRelief: o.interimRelief, courtNo: o.courtNo, summary: o.summary }, fs);
      acts.push(['Mentioning slip', () => sheetDraft(m, { key: 'slip', f: fs })]);
      const fl = {}; applyOrderToFields('listing', { orderDate: iso(o.orderDate) ? dmy(o.orderDate) : '', summary: o.summary }, fl);
      acts.push(['Listing / early hearing application', () => sheetDraft(m, { key: 'listing', f: fl })]);
    } else {
      acts.push(['Adjournment application', () => sheetDraft(m, { key: 'adjournment' })]);
      if (dirs.length) acts.push(['Application for time', () => sheetDraft(m, { key: 'time', f: { what: dirs[0].text } })]);
    }
  }
  V.actions = acts.map(a => a[1]);
  V.readText = [o.title, o.summary, ...dirs.map(d => '• ' + d.text + (d.by ? ' (' + d.by + ')' : '') + (iso(d.dueDate) ? ' by ' + dmy(d.dueDate) : '')), ...(o.watch || []).map(w => '⚠ ' + w)].filter(Boolean).join('\n');
  panel.innerHTML = `<div class="v-read-head"><b>${esc(o.title || 'What this paper says')}</b><button class="v-btn" data-v="rclose" aria-label="Close">${I.x}</button></div>
    ${m && o.sameMatter === false ? '<p class="v-warn">This paper may belong to another matter. Please check.</p>' : ''}
    <p>${esc(o.summary || '')}</p>
    ${iso(o.orderDate) || iso(o.nextDate) ? `<p class="v-facts">${iso(o.orderDate) ? 'Dated <b>' + dmy(o.orderDate) + '</b>' : ''}${iso(o.nextDate) ? ' · Next date <b>' + dmy(o.nextDate) + '</b>' + (o.purpose ? ' for ' + esc(o.purpose) : '') : ''}${o.interimRelief ? '<br>Interim: ' + esc(o.interimRelief) + (o.operatesTill ? ' (' + esc(o.operatesTill) + ')' : '') : ''}</p>` : ''}
    ${dirs.length ? '<p class="v-sub">To be done</p><ul>' + dirs.map(d => `<li>${esc(d.text)}${d.by ? ' <small>(' + esc(d.by) + ')</small>' : ''}${iso(d.dueDate) ? ' <b>by ' + dmy(d.dueDate) + '</b>' : ''}</li>`).join('') + '</ul>' : ''}
    ${(o.watch || []).filter(Boolean).length ? '<p class="v-sub">Watch out</p><ul class="v-watch">' + o.watch.filter(Boolean).map(w => `<li>${esc(w)}</li>`).join('') + '</ul>' : ''}
    ${acts.length ? '<p class="v-sub">What would you like to do?</p><div class="v-acts">' + acts.map((a, i) => `<button class="v-act" data-v="go" data-i="${i}">${esc(a[0])}</button>`).join('') + '</div>' : '<p class="hint">Open this paper from a matter\'s folder to get next steps for that matter.</p>'}
    <button class="v-btn" data-v="copy" style="margin-top:8px">Copy summary</button>
    <p class="hint">Read by Claude with your API key. Please check against the paper.</p>`;
}
