/* Case Diary — making the phone quicker.
   1. "Court over?" walks through every matter of the day, one Next-date sheet after another.
   2. Shortcuts on the home-screen icon (long-press): results, find, read order.
   3. Share into Case Diary: from WhatsApp, Gallery or Files, share an order or paper to Case Diary,
      pick the matter, and it is filed in the matter folder (or read, if order reading is on).
   4. "Send to Claude": opens the phone's share sheet with the matter's particulars, for the Claude app. */
'use strict';

/* 1 ─ enter results for the whole day */
function enterResults(day) {
  const queue = onDay(day).length ? groupByCourt(onDay(day)).flatMap(([, ms]) => ms) : [];
  if (!queue.length) { toast('No matters listed for this day'); return; }
  let i = 0;
  const next = () => {
    if (i >= queue.length) { toast('All ' + queue.length + ' matters done'); render(); return; }
    const m = queue[i++];
    sheetRecord(m, { step: i + ' of ' + queue.length, after: next });
  };
  next();
}

/* 2 ─ pick a matter (used by shortcuts and by sharing) */
function pickMatter(title, onPick) {
  let q = '';
  const list = () => live().filter(m => matches(m, q))
    .sort((a, b) => ((b.status === 'Pending') - (a.status === 'Pending')) || (a.nextDate || '9999').localeCompare(b.nextDate || '9999'))
    .slice(0, 40);
  const rows = () => list().map(m => { const f = forumOf(m); return `<button class="frow" data-pm="${m.id}"><span class="ficon" style="background:${f.soft};color:${f.ink};font-size:11px;font-weight:700">${esc(m.no)}</span><span class="fname">${esc(m.title || m.clients)}<small>${esc([m.court, m.caseNo, m.nextDate ? 'next ' + dmy(m.nextDate) : ''].filter(Boolean).join(' · '))}</small></span></button>`; }).join('') || '<p class="empty">No matter found.</p>';
  openSheet(`<div class="s-head"><div><small>Case Diary</small><h1>${esc(title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <label class="search" style="border:1px solid var(--line)">${I.search}<input type="search" id="pm_q" placeholder="Name, case no., court" autocomplete="off"></label>
    <div class="flist" id="pm_list" style="max-height:55vh;overflow:auto">${rows()}</div>`);
  const root = $('#sheet-root');
  setTimeout(() => $('#pm_q')?.focus(), 50);
  root.oninput = e => { if (e.target.id === 'pm_q') { q = e.target.value; $('#pm_list').innerHTML = rows(); } };
  root.onclick = e => {
    const el = e.target.closest('[data-pm]'); if (!el) return;
    const m = find(el.dataset.pm); root.onclick = root.oninput = null; closeSheet(); if (m) onPick(m);
  };
}

/* 3 ─ papers shared into the app */
async function sharedFiles() {
  try {
    const c = await caches.open('cd-share'), keys = await c.keys(), out = [];
    for (const k of keys) { const r = await c.match(k); const b = await r.blob(); out.push(new File([b], decodeURIComponent(r.headers.get('x-name') || 'Shared file'), { type: b.type })); }
    await Promise.all(keys.map(k => c.delete(k)));
    return out;
  } catch (e) { return []; }
}
async function subFolder(m, name) {
  const kids = await listChildren(m.folderId);
  return kids.find(k => k.folder && k.name.toLowerCase() === name.toLowerCase()) || await makeFolder(m.folderId, name);
}
async function fileShared(m, files, sub) {
  if (!m.folderId) { toast('This matter has no folder linked yet'); return; }
  toast('Saving ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…', 6000);
  try {
    const dest = await subFolder(m, sub);
    const names = new Set((await listChildren(dest.id)).map(k => k.name.toLowerCase()));
    let n = 0;
    for (const f of files) {
      const ext = (f.name.match(/\.([a-z0-9]{2,5})$/i) || [, f.type === 'application/pdf' ? 'pdf' : 'jpg'])[1].toLowerCase();
      const base = dmy(todayIso()) + (sub.startsWith('2') ? ' Order' : ' ' + (f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Paper'));
      let nm = base + '.' + ext; for (let i = 2; names.has(nm.toLowerCase()); i++) nm = base + ' (' + i + ').' + ext;
      names.add(nm.toLowerCase()); await uploadFile(dest.id, f, nm); n++;
    }
    toast(n + ' saved in ' + (m.folderName || 'the folder') + ' › ' + dest.name, 4000);
  } catch (e) { toast('Could not save: ' + e.message, 5000); }
}
function sheetShared(files) {
  const one = files[0], isOrderLike = files.length === 1 && /^image\/|pdf/.test(one.type);
  pickMatter('Which matter is this for?', m => {
    openSheet(`<div class="s-head"><div><small>${esc(m.no)} · ${files.length} file${files.length > 1 ? 's' : ''} shared</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="menu" style="gap:10px">
        ${isOrderLike ? `<button data-sh="read">Read the order <small>${aiKey() ? 'fills the next date; files it in 2 Orders' : 'needs your key in More › Order reading'}</small></button>` : ''}
        <button data-sh="2 Orders">Save in 2 Orders <small>named with today's date</small></button>
        <button data-sh="3 Documents">Save in 3 Documents</button>
        <button data-sh="4 Correspondence">Save in 4 Correspondence</button>
      </div>`);
    const root = $('#sheet-root');
    root.onclick = e => {
      const el = e.target.closest('[data-sh]'); if (!el) return;
      root.onclick = null; closeSheet();
      if (el.dataset.sh === 'read') readOrder(m, one); else fileShared(m, files, el.dataset.sh);
    };
  });
}

/* 4 ─ send a matter to the Claude app */
function matterText(m) {
  const L = [m.title || m.clients, [m.type, m.caseNo].filter(Boolean).join(' '), m.court, m.side ? 'Appearing for ' + m.side : '',
    m.nextDate ? 'Next date ' + dmy(m.nextDate) + (m.purpose ? ' for ' + m.purpose : '') : 'No next date', 'Diary no. ' + m.no, m.folderPath ? 'Folder: ' + m.folderPath : ''];
  return L.filter(Boolean).join('\n') + '\n\nClaude, please: ';
}
async function askClaude(m) {
  const text = matterText(m);
  if (navigator.share) { try { await navigator.share({ title: m.title || m.clients, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Copied. Open the Claude app and paste.', 4000); } catch (e) { toast('Could not share from this device'); }
}

/* wiring */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'results') enterResults(el.dataset.day || todayIso());
  if (el.dataset.act === 'askclaude') { const m = find(el.dataset.id); if (m) askClaude(m); }
});
window.addEventListener('load', () => setTimeout(async () => {
  const p = new URLSearchParams(location.search), go = p.get('go'), share = p.get('share');
  if (go || share) history.replaceState(null, '', location.pathname);
  for (let t = 0; t < 40 && !(S.account && S.data && live().length); t++) await new Promise(r => setTimeout(r, 250));
  if (!S.account) return;
  if (go === 'results') enterResults(todayIso());
  if (go === 'search') { S.tab = 'matters'; S.filter = 'all'; render(); setTimeout(() => $('[data-act="q"]')?.focus(), 80); }
  if (go === 'order') pickMatter('Read an order for which matter?', m => readOrder(m));
  if (share) { const files = await sharedFiles(); if (files.length) sheetShared(files); else toast('Nothing was received. Please share again.'); }
}, 600));
