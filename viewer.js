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
  V.kind = VIEWABLE[ext]; V.name = it.name; V.scale = 1; V.item = it; V.text = null;
  document.body.style.overflow = 'hidden';
  history.pushState({ viewer: 1 }, '');
  const root = document.createElement('div'); root.id = 'viewer';
  root.innerHTML = `<div class="v-bar">
      <button class="v-btn" data-v="close" aria-label="Close">${I.x}</button>
      <b class="v-name">${esc(it.name)}</b>
      ${V.kind === 'pdf' ? `<button class="v-btn" data-v="out" aria-label="Zoom out">−</button><button class="v-btn" data-v="in" aria-label="Zoom in">+</button>` : ''}
      ${V.kind === 'pdf' || V.kind === 'img' ? `<button class="v-btn v-read" data-v="readmenu">Read</button>` : ''}
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
  else if (a === 'readmenu') readMenu();
  else if (a === 'rfree') readFree();
  else if (a === 'rapp') sendToClaudeApp();
  else if (a === 'rpc') queueForPc();
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
  showReading(o, m, 'Read by Claude with your API key. Please check against the paper.');
}
function showReading(o, m, note) {
  const panel = document.getElementById('v_read'); if (!panel) return;
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
    <p class="hint">${esc(note)}</p>`;
}

/* ---------- the Read menu: free first ---------- */
function readPanel(html) {
  let p = document.getElementById('v_read');
  if (!p) { p = document.createElement('div'); p.id = 'v_read'; p.className = 'v-read-panel'; document.getElementById('viewer').appendChild(p); }
  p.innerHTML = html; return p;
}
function readMenu() {
  if (!V.blob) { toast('Still opening…'); return; }
  const m = S.tab === 'matter' ? find(S.mid) : null;
  readPanel(`<div class="v-read-head"><b>Read this paper</b><button class="v-btn" data-v="rclose" aria-label="Close">${I.x}</button></div>
    <div class="v-acts" style="margin-top:8px">
      <button class="v-act" data-v="rfree">Quick read on this phone<small>Free · typed orders (High Court website PDFs, typed orders)</small></button>
      <button class="v-act alt" data-v="rapp">Send to the Claude app<small>Free with your Claude plan · reads anything, even handwriting</small></button>
      ${m ? `<button class="v-act alt" data-v="rpc">Claude reads it on my PC<small>Free · matter updated when your computer is on</small></button>` : ''}
      ${aiKey() ? `<button class="v-act alt" data-v="read">Instant full read<small>Paid, about ₹1–3 · handwriting too</small></button>` : ''}
    </div>`);
}

/* free reader: the text layer of a typed PDF, read with rules on the phone itself */
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function isoOf(d, mo, y) { y = +y; if (y < 100) y += 2000; d = +d; mo = +mo; if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y > 1990 && y < 2100)) return ''; return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function findDates(t) {
  const out = [];
  const re = /(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})|(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[.,]?\s+(\d{4})/gi;
  let x; while ((x = re.exec(t))) { const iso = x[1] ? isoOf(x[1], x[2], x[3]) : isoOf(x[4], MONTHS[x[5].toLowerCase().slice(0, 3)], x[6]); if (iso) out.push({ iso, at: x.index, end: re.lastIndex }); }
  return out;
}
const toHindiDigits = s => s.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
async function paperText() {
  if (V.text !== null) return V.text;
  if (V.kind !== 'pdf') return (V.text = '');
  const lib = await loadPdfLib(), pdf = V.pdf || await lib.getDocument({ data: await V.blob.arrayBuffer() }).promise;
  let t = '';
  for (let n = 1; n <= Math.min(pdf.numPages, 30); n++) { const c = await (await pdf.getPage(n)).getTextContent(); t += c.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('') + '\n'; }
  return (V.text = toHindiDigits(t.replace(/[ \t]+/g, ' ')));
}
function sentences(t) { const P = '\u0001'; t = t.replace(/\b(No|Nos|Sri|Shri|Smt|Mr|Mrs|Dr|Ms|vs|v|J|JJ|Ltd|Pvt|Co|u\/s|U\/S|Sec|Cr|Crl|Misc|Govt|[A-Z])\./g, '$1' + P); return t.replace(/\n+/g, ' ').split(/(?<=[.।])\s+(?=[A-Z0-9(ऀ-ॿ"'])/).map(s => s.replace(/\u0001/g, '.').trim()).filter(s => s.length > 12); }
function ruleRead(t, m) {
  const ss = sentences(t), low = t.toLowerCase(), o = { kind: 'order', title: '', summary: '', orderDate: '', nextDate: '', purpose: '', item: '', courtNo: '', interimRelief: '', operatesTill: '', directions: [], watch: [], sameMatter: true, happened: '' };
  const dates = findDates(t), today = todayIso();
  // order date: "Dated:" / "Date :" / "Order Date" / दिनांक near the top, else the first date in the paper
  const dm = /(?:dated|date of order|order date|date)\s*[:\-–]?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i.exec(t) || /दिनांक\s*[:\-]?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/.exec(t);
  if (dm) { const p = dm[1].split(/[.\/-]/); o.orderDate = isoOf(p[0], p[1], p[2]); }
  if (!o.orderDate) { const past = dates.filter(d => d.iso <= today); if (past.length) o.orderDate = past[past.length - 1].iso > past[0].iso && /order/i.test(t.slice(0, 400)) ? past[0].iso : past[past.length - 1].iso; }
  // next date: a future date after "list", "put up", "fixed", "posted", "on", पेश, नियत
  const cues = /(list(?:ed)?|put up|fix(?:ed)?|post(?:ed)?|adjourn(?:ed)?|next date|come up|पेश|नियत|तिथि|हेतु)/i;
  const fut = dates.filter(d => d.iso > (o.orderDate || '0'));
  const withCue = fut.filter(d => cues.test(t.slice(Math.max(0, d.at - 90), d.end + 40)));
  const nd = (withCue.length ? withCue : fut).slice(-1)[0];
  if (nd) { o.nextDate = nd.iso; const after = t.slice(nd.end, nd.end + 80).replace(/\s+/g, ' '); const pm = /^\s*(?:for|हेतु)\s+([^.।\n]{3,60})/i.exec(after) || /(?:for|हेतु)\s+([^.।\n]{3,60})$/i.exec(t.slice(Math.max(0, nd.at - 80), nd.at)); if (pm) o.purpose = pm[1].trim(); }
  if (/\b(dismissed|allowed|disposed of|stands disposed|rejected|is quashed|are quashed)\b/i.test(low.slice(-1500)) && !o.nextDate) o.happened = 'Disposed';
  else if (/reserved/i.test(low.slice(-800))) o.happened = 'Reserved';
  else if (o.nextDate) o.happened = 'Adjourned';
  // interim relief
  let ir = ss.find(s => /no coercive|coercive action|shall remain stayed|shall be stayed|stay(?:ed)? (?:the )?(?:further )?proceedings|shall not be arrested|not be taken into custody|interim (?:order|protection|relief)|अग्रिम कार्यवाही स्थगित|उत्पीड़नात्मक/i.test(s));
  if (ir) { const clean = ir.replace(/\s+/g, ' ').replace(/[.।]\s*$/, ''); const k = clean.search(/no coercive|coercive action|further proceedings|proceedings of|shall not be arrested|not be taken into custody|shall remain stayed|अग्रिम|उत्पीड़नात्मक/i); const cut = k > 0 ? clean.lastIndexOf(',', k) : -1; o.interimRelief = (cut >= 0 ? clean.slice(cut + 1) : clean).trim().slice(0, 300); ir = clean; const tm = /(till|until)\s+(the\s+)?(next date[^.,;]*|next listing[^.,;]*|further orders?[^.,;]*|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i.exec(ir); if (tm) o.operatesTill = tm[0]; }
  if (/(interim order|protection).{0,60}(not extended|vacated|stands vacated|lapse)/i.test(t)) o.watch.push('The interim order appears not extended / vacated. Check the operative part.');
  if (o.operatesTill && /next (date|listing)/i.test(o.operatesTill)) o.watch.push('Interim protection lasts only till the next listing. If the case is not listed, apply for extension or mention it.');
  if (/last (opportunity|chance)|अंतिम अवसर/i.test(t)) o.watch.push('Last opportunity given.');
  if (/cost(s)? of rs|costs? of ₹|हर्जा/i.test(t)) o.watch.push('Costs have been imposed. Check the amount and who pays.');
  if (/(non[- ]?bailable|nbw|warrant)/i.test(t)) o.watch.push('A warrant is mentioned.');
  // directions: "... within N weeks/days"
  const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, fifteen: 15, thirty: 30 };
  let lastDue = '';
  const due = (n, unit, from) => !n || !from ? '' : /month/i.test(unit) ? addMonths(from, n) : addDays(from, /week/i.test(unit) ? n * 7 : n);
  const num = w => /^\d+$/.test(w) ? +w : W[(w || '').toLowerCase()] || 0;
  for (const s of ss) {
    for (const y of s.matchAll(/(\w+)\s*(?:\(\d+\)\s*)?(weeks?|days?|months?)'?s?'?\s+time\s+(?:to|for)\s+(?:file\s+|filing\s+)?(counter affidavit|rejoinder affidavit|reply|objections?|written statement|supplementary affidavit|compliance)/gi)) {
      lastDue = due(num(y[1]), y[2], o.orderDate);
      if (!o.directions.some(d => d.text.toLowerCase() === y[3].toLowerCase())) o.directions.push({ text: y[3].replace(/^\w/, c => c.toUpperCase()), by: '', dueDate: lastDue });
    }
    const x = /(counter affidavit|rejoinder affidavit|supplementary affidavit|reply|objection|written statement|compliance|deposit[^,.]*|steps|amendment|affidavit)[^.]{0,80}?within\s+(?:a\s+period\s+of\s+)?(\w+)\s*(?:\(\d+\))?\s*(weeks?|days?|months?)/i.exec(s);
    if (x) {
      const after = /thereafter/i.test(s.slice(x.index, x.index + x[0].length + 20)) && lastDue;
      const d = due(num(x[2]), x[3], after ? lastDue : o.orderDate);
      if (!o.directions.some(dd => dd.text.toLowerCase() === x[1].toLowerCase())) o.directions.push({ text: x[1].replace(/^\w/, c => c.toUpperCase()), by: '', dueDate: d });
      lastDue = d || lastDue;
    }
  }
  const im = /\bitem\s*(?:no\.?)?\s*[:\-]?\s*(\d{1,4})\b/i.exec(t); if (im) o.item = im[1];
  const cm = /court\s*(?:no\.?|number)\s*[:\-]?\s*(\d{1,3})\b/i.exec(t); if (cm) o.courtNo = cm[1];
  // which matter
  if (m && m.caseNo) { const num = (m.caseNo.match(/\d+/) || [''])[0]; if (num && num.length >= 3 && !t.includes(num)) o.sameMatter = false; }
  // summary: the operative sentences
  const key = ss.filter(s => /(list|put up|issue notice|notice|counter|rejoinder|stay|coercive|dismiss|allow|dispos|adjourn|exempt|summon|bail|quash|direct|पेश|नियत|आदेश)/i.test(s));
  o.summary = (key.length ? key.slice(-4) : ss.slice(-3)).join(' ').replace(/\s+/g, ' ').slice(0, 700);
  o.title = (/judgment/i.test(t.slice(0, 600)) ? 'Judgment' : 'Order') + (o.orderDate ? ' dated ' + dmy(o.orderDate) : '');
  return o;
}
async function readFree() {
  const m = S.tab === 'matter' ? find(S.mid) : null;
  readPanel('<p class="v-msg" style="margin:8px 0">Reading on this phone…</p>');
  let t = '';
  try { t = await paperText(); } catch (e) {}
  if ((t.replace(/\s/g, '').length) < 120) {
    readPanel(`<div class="v-read-head"><b>This paper is a scan or photo</b><button class="v-btn" data-v="rclose" aria-label="Close">${I.x}</button></div>
      <p>There is no typed text in it, so the free reader cannot read it. Use one of these:</p>
      <div class="v-acts"><button class="v-act alt" data-v="rapp">Send to the Claude app<small>Free with your plan</small></button>
      ${m ? `<button class="v-act alt" data-v="rpc">Claude reads it on my PC<small>Free · when your computer is on</small></button>` : ''}
      ${aiKey() ? `<button class="v-act alt" data-v="read">Instant full read<small>Paid, about ₹1–3</small></button>` : ''}</div>`);
    return;
  }
  showReading(ruleRead(t, m), m, 'Quick read on this phone, by rules, not by Claude. It picks up dates and standard wording; always check against the paper.');
}

/* hand the paper to the Claude app, free under the Claude plan */
function claudeAsk(m) {
  return `Please read the attached ${V.kind === 'pdf' ? 'PDF' : 'photo'} "${V.name}"${m ? ` in my matter ${m.title} (${(m.type || '') + ' ' + (m.caseNo || '')}, ${m.court || ''}; I act for the ${m.side || 'client'})` : ''}. Tell me: 1) what it says in plain words; 2) order date, next date and what it is fixed for; 3) any interim protection and till when; 4) anything to be done, by whom and by when; 5) anything urgent. Then list what I should do next and offer to draft it (interim extension application, mentioning slip, listing/adjournment application, as fits). Refer to the court as Hon'ble Court.`;
}
async function sendToClaudeApp() {
  const m = S.tab === 'matter' ? find(S.mid) : null, text = claudeAsk(m);
  try { await navigator.clipboard.writeText(text); } catch (e) {}
  const file = new File([V.blob], V.name, { type: V.blob.type || (V.kind === 'pdf' ? 'application/pdf' : 'image/jpeg') });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); toast('Choose Claude. If the question is missing there, paste it (already copied).', 6000); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = V.name; document.body.appendChild(a); a.click(); a.remove();
  window.open('https://claude.ai/new', '_blank');
  toast('Paper downloaded and the question copied. In Claude, attach the paper and paste.', 7000);
}

/* queue for Claude on the PC: a small request file in Case Diary/To read */
async function queueForPc() {
  const m = S.tab === 'matter' ? find(S.mid) : null; if (!m || !V.item) return;
  try {
    let dir; try { dir = await getItem(drivePath(DIARY_DIR + '/To read')); } catch (e) { dir = await makeFolder((await getItem(drivePath(DIARY_DIR))).id, 'To read'); }
    const req = { no: m.no, title: m.title, itemId: V.item.id, name: V.item.name, path: itemPath(V.item), asked: new Date().toISOString() };
    const nm = cleanName(m.no.replace('/', '-') + ' ' + V.item.name.replace(/\.[^.]+$/, '')) + '.json';
    await uploadFile(dir.id, new File([JSON.stringify(req, null, 1)], nm, { type: 'application/json' }), nm);
    readPanel(`<div class="v-read-head"><b>Sent to Claude on your PC</b><button class="v-btn" data-v="rclose" aria-label="Close">${I.x}</button></div>
      <p>Claude will read it when your computer is on (it checks at about 6:45 am, 1:45 pm and 7:45 pm, Monday to Saturday). The summary, next date and things to do will appear on this matter's page under "Papers read by Claude", and you also get an email.</p>`);
  } catch (e) { toast('Could not send: ' + e.message, 5000); }
}
