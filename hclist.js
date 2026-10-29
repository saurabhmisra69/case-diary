/* High Court listing screenshot → matters.
   The Lucknow Bench sends "The case listed on DD/MM/YYYY for SAURABH MISRA (...) are :" with a table
   Sr. | Court No. | Case Serial | Case No. | Petitioner | Respondent. A screenshot of it is read on the phone itself
   (free text reader, files in lib/ocr, nothing sent anywhere), shown for checking, and applied only on "Apply". */

/* ---------- reading the table out of the words (pure, also used by the test script) ---------- */
function hcParseWords(words, W) {
  words = words.filter(w => w.t && w.t.trim()).map(w => ({ ...w, t: w.t.trim(), cy: (w.y0 + w.y1) / 2 }));
  const all = words.slice().sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0).map(w => w.t).join(' ');
  const dm = all.match(/listed\s+on\s+(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/i) || all.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  const date = dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` : '';
  W = W || Math.max(...words.map(w => w.x1), 1);
  const isNum = t => /^\d{1,5}$/.test(t);
  // rows: a small "Sr." number at the far left, with court no. and serial on the same line
  const sr = words.filter(w => /^\d{1,3}$/.test(w.t) && w.x0 < W * 0.2).sort((a, b) => a.cy - b.cy);
  const anchors = [];
  for (const s of sr) {
    const same = words.filter(w => w !== s && isNum(w.t) && Math.abs(w.cy - s.cy) < (s.y1 - s.y0) * 0.8 && w.x0 > s.x1 && w.x0 < W * 0.45).sort((a, b) => a.x0 - b.x0);
    if (same.length >= 2) anchors.push({ s, court: same[0], serial: same[1] });
  }
  const end = (words.find(w => /^national$/i.test(w.t) && anchors.length && w.y0 > anchors[anchors.length - 1].s.y1) || {}).y0 || Infinity;
  const rows = [];
  anchors.forEach((a, i) => {
    const prev = anchors[i - 1], next = anchors[i + 1];
    const half = next ? (next.s.cy - a.s.cy) / 2 : prev ? (a.s.cy - prev.s.cy) / 2 : 400;
    const top = prev ? (prev.s.cy + a.s.cy) / 2 : a.s.cy - half, bot = next ? (next.s.cy + a.s.cy) / 2 : Math.min(a.s.cy + half, end);
    const inRow = words.filter(w => w.cy > top && w.cy < bot && w.x0 > a.serial.x1 + 4).sort((p, q) => p.x0 - q.x0);
    // columns to the right of the serial: case no., petitioner, respondent — split where the left edges jump
    const xs = [...new Set(inRow.map(w => Math.round(w.x0)))].sort((p, q) => p - q), cols = [];
    for (const x of xs) { const c = cols[cols.length - 1]; if (c && x - c[c.length - 1] < W * 0.06) c.push(x); else cols.push([x]); }
    const colOf = w => cols.findIndex(c => c.includes(Math.round(w.x0)));
    const text = (k, upTo) => { const ws = inRow.filter(w => { const c = colOf(w); return upTo ? c >= k : c === k; }).sort((p, q) => p.cy - q.cy);
      const lines = []; for (const w of ws) { const l = lines[lines.length - 1]; if (l && Math.abs(l[0].cy - w.cy) < (w.y1 - w.y0) * 0.6) l.push(w); else lines.push([w]); }
      return lines.map(l => l.sort((p, q) => p.x0 - q.x0).map(w => w.t).join(' ')).join(' ').replace(/\s+/g, ' ').trim(); };
    const raw = text(0).replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '/');
    const cm = raw.match(/([A-Z][A-Z0-9().]*?)-?\s*(\d{1,6})\s*\/?\s*((?:19|20)\d{2})/i);
    rows.push({ court: a.court.t, item: a.serial.t, prefix: cm ? cm[1].replace(/-$/, '').toUpperCase() : '', num: cm ? String(+cm[2]) : '', year: cm ? cm[3] : '',
      caseText: cm ? `${cm[1].replace(/-$/, '').toUpperCase()}-${+cm[2]}/${cm[3]}` : raw, pet: hcTidy(text(1)), res: hcTidy(text(2, true)) });
  });
  if (!rows.length) {   // no table shape found: fall back to case numbers anywhere in the text
    const flat = all.replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '/');
    for (const cm of flat.matchAll(/\b([A-Z][A-Z0-9().]*)-(\d{1,6})\s*\/?\s*((?:19|20)\d{2})\b/g)) rows.push({ court: '', item: '', prefix: cm[1].toUpperCase(), num: String(+cm[2]), year: cm[3], caseText: `${cm[1].toUpperCase()}-${+cm[2]}/${cm[3]}`, pet: '', res: '' });
  }
  return { date, rows };
}
const hcTidy = s => String(s || '').replace(/\s+/g, ' ').replace(/\bAND ANOTHER\b/i, '& Anr.').replace(/\bAND (OTHERS|ORS\.?)\b/i, '& Ors.').trim();
/* High Court case prefix → the app's matter type */
function hcType(prefix) {
  const p = String(prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^A?482|^A528|^APPLN?482/.test(p)) return '482/528';
  if (/^ABAIL|^ABA|^CRMABA/.test(p)) return 'ABA';
  if (/BAIL/.test(p)) return 'Bail';
  if (/^WRIT|^WP|^CRLP|^MISC(BENCH|SINGLE)|^WRITC|^WRITA/.test(p)) return 'Writ';
  if (/^CRLR|^REV|^CIVR/.test(p)) return 'Revision';
  if (/^CRLA|^FAFO|^FA|^SA|^SPLA|^APPEAL|^GOVA/.test(p)) return 'Appeal';
  return '';
}
if (typeof module !== 'undefined') module.exports = { hcParseWords, hcType };

/* ---------- on the phone ---------- */
if (typeof window !== 'undefined') {
  let hcWorker = null;
  const loadOcr = () => new Promise((ok, no) => { if (window.Tesseract) return ok(); const s = document.createElement('script'); s.src = 'lib/ocr/tesseract.min.js'; s.onload = ok; s.onerror = () => no(new Error('Could not load the text reader')); document.head.appendChild(s); });
  async function ocrWorker(say) {
    if (hcWorker) return hcWorker;
    await loadOcr();
    const base = new URL('lib/ocr/', location.href).href;
    hcWorker = await Tesseract.createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: true,
      logger: m => { if (m.status && say) say(m.status === 'recognizing text' ? 'Reading… ' + Math.round((m.progress || 0) * 100) + '%' : 'Getting the reader ready…'); } });
    await hcWorker.setParameters({ tessedit_pageseg_mode: '11' });
    return hcWorker;
  }
  /* grey, and turned light-on-dark → dark-on-light (Gmail dark mode), so the reader sees black text on white */
  async function prepImage(file) {
    const bmp = await createImageBitmap(file), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), p = im.data; let sum = 0;
    for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = y; sum += y; }
    let lo = 255, hi = 0; const inv = sum / (p.length / 4) < 110;
    for (let i = 0; i < p.length; i += 4) { const v = inv ? 255 - p[i] : p[i]; p[i] = p[i + 1] = p[i + 2] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = 255 / Math.max(1, hi - lo); for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = (p[i] - lo) * k;
    g.putImageData(im, 0, 0); return { canvas: c, W: c.width };
  }
  async function readShot(file, say) {
    const { canvas, W } = await prepImage(file), w = await ocrWorker(say);
    const { data } = await w.recognize(canvas, {}, { blocks: true });
    const words = []; for (const b of data.blocks || []) for (const pa of b.paragraphs) for (const l of pa.lines) for (const wd of l.words) words.push({ t: wd.text, ...wd.bbox });
    return hcParseWords(words, W);
  }
  /* which matter a row belongs to: same number/year in the High Court; if several, the one of the same type */
  function hcMatch(r) {
    if (!r.num || !r.year) return [];
    const k = r.num + '/' + r.year, ty = hcType(r.prefix);
    let hits = live().filter(m => (caseKeyOf(m.caseNo) === k) && (!m.forum || m.forum === 'HC'));
    if (hits.length > 1 && ty) { const t = hits.filter(m => m.type === ty); if (t.length) hits = t; }
    if (hits.length > 1 && r.pet) { const w = r.pet.split(' ')[0]; const t = hits.filter(m => new RegExp('\\b' + w.replace(/[^\w]/g, ''), 'i').test((m.title || '') + ' ' + (m.clients || ''))); if (t.length) hits = t; }
    return hits;
  }
  const HC_COURT = n => 'High Court, Lucknow Bench' + (n ? ' (Court No. ' + n + ')' : '');

  window.hcListButton = () => `<button class="ghost" data-act="hcshot" style="margin:0 0 10px;min-height:46px;width:100%">${I.cam || ''}Read High Court listing screenshot</button>`;

  function pickShot() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => { if (inp.files.length) runShots([...inp.files]); };
    inp.click();
  }
  async function runShots(files) {
    openSheet(`<div class="s-head"><div><small style="color:var(--hc)">High Court listing</small><h1>Reading the screenshot…</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" id="hc_say">Getting the reader ready… The first time takes a little longer.</p>`);
    const say = t => { const e = $('#hc_say'); if (e) e.textContent = t; };
    const found = [];
    try {
      for (const [i, f] of files.entries()) { say((files.length > 1 ? 'Screenshot ' + (i + 1) + ' of ' + files.length + ' · ' : '') + 'Reading…'); const r = await readShot(f, t => say((files.length > 1 ? 'Screenshot ' + (i + 1) + ' · ' : '') + t)); r.rows.forEach(x => found.push({ ...x, date: r.date })); }
    } catch (er) { console.error(er); say('Could not read it: ' + (er.message || er) + '. Check the internet the first time, then try again.'); return; }
    if (!found.length) { say('No cases found in this screenshot. Take it so the whole table, with the "listed on" date line, is on the screen, and try again.'); return; }
    sheetHcReview(found);
  }

  function sheetHcReview(rows) {
    rows.forEach(r => { r.hits = hcMatch(r); r.pick = r.hits.length === 1 ? r.hits[0].id : ''; r.on = true; });
    const t = todayIso();
    const rowHtml = (r, i) => {
      const m = r.hits.find(x => x.id === r.pick), same = m && m.nextDate === r.date && String(m.item || '') === String(r.item);
      return `<div class="card" style="box-shadow:none;border:2px solid var(--line);padding:12px;display:grid;gap:8px" data-hcr="${i}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="font-family:var(--mono)">${esc(r.caseText || '—')}</b>
          <label style="display:flex;gap:6px;align-items:center;font-weight:600"><input type="checkbox" data-hc="on" data-i="${i}" ${r.on ? 'checked' : ''}> Apply</label></div>
        ${r.pet ? `<span class="hint" style="margin:0">${esc(r.pet)}${r.res ? ' v. ' + esc(r.res) : ''}</span>` : ''}
        <div class="two"><div class="field"><label>Date listed</label><input class="in" type="date" data-hc="date" data-i="${i}" value="${esc(r.date)}"></div>
          <div class="two"><div class="field"><label>Court no.</label><input class="in" inputmode="numeric" data-hc="court" data-i="${i}" value="${esc(r.court)}"></div><div class="field"><label>Serial</label><input class="in" inputmode="numeric" data-hc="item" data-i="${i}" value="${esc(r.item)}"></div></div></div>
        ${r.hits.length ? `<div class="field"><label>Matter</label><select class="in" data-hc="pick" data-i="${i}">${r.hits.length > 1 ? '<option value="">— choose —</option>' : ''}${r.hits.map(h => `<option value="${h.id}" ${h.id === r.pick ? 'selected' : ''}>${esc(mref(h))} · ${esc(h.title || h.clients || '')}</option>`).join('')}</select></div>
          <span class="hint" style="margin:0;${same ? '' : 'color:var(--saffron-ink)'}">${m ? (same ? 'Already in the diary for this date and serial.' : 'Diary now: ' + (m.nextDate ? dmy(m.nextDate) : 'no next date') + (m.item ? ' · item ' + esc(m.item) : '') + ' → will become ' + (r.date ? dmy(r.date) : '—') + ' · item ' + esc(r.item || '—')) : ''}</span>`
        : `<span class="hint" style="margin:0;color:var(--saffron-ink)">Not in SM Chambers yet — Apply opens a new matter, filled in, for you to check and save.</span>`}
      </div>`; };
    const draw = () => openSheet(`<div class="s-head"><div><small style="color:var(--hc)">High Court listing${rows[0].date ? ' · ' + dmy(rows[0].date) : ''}</small><h1>${rows.length} case${rows.length > 1 ? 's' : ''} found</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" style="margin:0 0 8px">Check each one against the screenshot. Correct anything read wrongly, then Apply.</p>
      <div class="grp" style="gap:10px">${rows.map(rowHtml).join('')}</div>
      <button class="save" data-hc="apply" style="margin-top:12px">Apply</button>`);
    draw();
    const root = $('#sheet-root');
    root.oninput = root.onchange = e => { const el = e.target.closest('[data-hc]'); if (!el || el.dataset.hc === 'apply') return; const r = rows[+el.dataset.i], k = el.dataset.hc;
      if (k === 'on') r.on = el.checked; else if (k === 'pick') { r.pick = el.value; if (e.type === 'change') draw(); } else r[k] = el.value.trim(); };
    root.onclick = e => { if (!e.target.closest('[data-hc="apply"]')) return;
      const go = rows.filter(r => r.on);
      if (go.some(r => r.hits.length && !r.pick)) return toast('Choose the matter for each case, or untick it');
      if (go.some(r => !r.date)) return toast('Enter the date listed for each case');
      let n = 0;
      const sets = go.filter(r => r.pick);
      if (sets.length) change(() => { for (const r of sets) { const m = live().find(x => x.id === r.pick); if (!m) continue;
        const set = { nextDate: r.date, item: r.item || '', court: HC_COURT(r.court), unlisted: false };
        if (m.status !== 'Reserved' && isOpen(m)) set.status = 'Pending';
        if (m.nextDate !== r.date || String(m.item || '') !== String(r.item) || m.court !== set.court) {
          if (set.nextDate !== m.nextDate) logListing(m, m.nextDate, set.nextDate, 'High Court listing screenshot');
          logDiff(m, { ...m }, set, 'High Court listing screenshot');
          Object.assign(m, set); if (!m.purpose) m.purpose = 'Hearing'; m.calPending = true; touch(m); n++; } } });
      const adds = go.filter(r => !r.hits.length);
      closeSheet(); if (typeof render === 'function') render();
      toast(n ? n + ' matter' + (n > 1 ? 's' : '') + ' updated' : sets.length ? 'Already up to date' : 'Nothing updated');
      const next = () => { const r = adds.shift(); if (!r) return; const ty = hcType(r.prefix);
        window.__afterSave = adds.length ? next : null;
        sheetEdit(null, { forum: 'HC', status: 'Pending', court: HC_COURT(r.court), type: ty, caseNo: ty ? r.num + '/' + r.year : r.caseText, nextDate: r.date, item: r.item, purpose: 'Hearing',
          title: [r.pet, r.res.replace(/^STATE OF U\.?\s?P\.?\b.*?(&\s*(Anr|Ors)\.)?$/i, (_, a) => 'State of U.P.' + (a ? ' ' + a : ''))].filter(Boolean).join(' v. '), notes: 'Added from the High Court listing screenshot of ' + dmy(t) + '.' }); };
      if (adds.length) setTimeout(next, 300);
    };
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-act="hcshot"]')) pickShot(); });
}
