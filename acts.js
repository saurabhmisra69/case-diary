/* SM Chambers — Bare Acts shelf. Official PDFs from India Code (indiacode.nic.in) kept in
   OneDrive › SM Chambers data › Bare Acts; each Act is read once, split into sections, and kept for offline use.
   Search by section number or any word; open a section from any matter. */
'use strict';

const ACTS_DIR = DIARY_DIR + '/Bare Acts', ACT_CACHE = 'cd-acts';
const ACTS = [
  { k: 'BNS', n: 'Bharatiya Nyaya Sanhita, 2023', rx: /nyaya\s*sanhita|\bBNS\b/i },
  { k: 'BNSS', n: 'Bharatiya Nagarik Suraksha Sanhita, 2023', rx: /nagarik\s*suraksha|\bBNSS\b/i },
  { k: 'BSA', n: 'Bharatiya Sakshya Adhiniyam, 2023', rx: /sakshya|\bBSA\b/i },
  { k: 'IPC', n: 'Indian Penal Code, 1860', rx: /penal\s*code|\bIPC\b/i },
  { k: 'CrPC', n: 'Code of Criminal Procedure, 1973', rx: /criminal\s*procedure|cr\.?\s*p\.?\s*c/i },
  { k: 'IEA', n: 'Indian Evidence Act, 1872', rx: /evidence\s*act/i },
  { k: 'CPC', n: 'Code of Civil Procedure, 1908', rx: /civil\s*procedure|\bCPC\b/i },
  { k: 'NI', n: 'Negotiable Instruments Act, 1881', rx: /negotiable|N\.?\s*I\.?\s*Act/i },
  { k: 'LIM', n: 'Limitation Act, 1963', rx: /limitation\s*act/i },
  { k: 'DV', n: 'Protection of Women from Domestic Violence Act, 2005', rx: /domestic\s*violence|D\.?V\.?\s*Act/i },
  { k: 'HMA', n: 'Hindu Marriage Act, 1955', rx: /hindu\s*marriage|\bHMA\b/i },
  { k: 'HSA', n: 'Hindu Succession Act, 1956', rx: /hindu\s*succession/i },
  { k: 'ISA', n: 'Indian Succession Act, 1925', rx: /indian\s*succession/i },
  { k: 'TPA', n: 'Transfer of Property Act, 1882', rx: /transfer\s*of\s*property|\bTPA\b/i },
  { k: 'ICA', n: 'Indian Contract Act, 1872', rx: /contract\s*act/i },
  { k: 'SRA', n: 'Specific Relief Act, 1963', rx: /specific\s*relief/i },
  { k: 'ARB', n: 'Arbitration and Conciliation Act, 1996', rx: /arbitration/i },
  { k: 'RERA', n: 'Real Estate (Regulation and Development) Act, 2016', rx: /real\s*estate|\bRERA\b/i },
  { k: 'AFT', n: 'Armed Forces Tribunal Act, 2007', rx: /armed\s*forces\s*tribunal|\bAFT\b/i },
  { k: 'ITA25', n: 'Income-tax Act, 2025', rx: /income[-\s]*tax\s*act,?\s*2025/i },
];
const ACT_OF = s => { const t = String(s || ''); return ACTS.find(a => a.rx.test(t)); };
const indiaCodeUrl = a => 'https://www.indiacode.nic.in/simple-search?query=' + encodeURIComponent(a.n.replace(/,\s*\d{4}$/, ''));
const shelf = () => S.data?.meta?.acts || {};   // { k: { itemId, name, sections, added, u } }
const AX = {};   // sections loaded in memory: { k: [{ no, head, text }] }

/* ---------- reading an Act into sections ---------- */
async function pdfFullText(buf) {
  const lib = await loadPdfLib(), pdf = await lib.getDocument({ data: buf }).promise; let out = '';
  for (let n = 1; n <= pdf.numPages; n++) { const tc = await (await pdf.getPage(n)).getTextContent(); out += tc.items.map(i => i.str + (i.hasEOL ? '\n' : '')).join('') + '\n'; }
  pdf.destroy(); return out;
}
function splitSections(text) {
  const t = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  // a section starts on a new line: "420. Cheating and dishonestly inducing delivery of property.—Whoever ..."
  const rx = /(?:^|\n)\s*(\d{1,4}[A-Z]{0,3})\.\s+([A-Z][^\n]{1,220}?)\s*\.?\s*[—–]\s*/g;
  const hits = []; let m;
  while ((m = rx.exec(t))) hits.push({ no: m[1], head: m[2].replace(/\.$/, '').trim(), at: m.index, body: rx.lastIndex });
  const seen = new Set(), out = [];
  hits.forEach((h, i) => { if (seen.has(h.no)) return; seen.add(h.no); const end = i + 1 < hits.length ? hits[i + 1].at : t.length;
    out.push({ no: h.no, head: h.head, text: t.slice(h.body, end).replace(/\n(?!\s*\(\w+\))/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000) }); });
  return out;
}
async function actCacheGet(k) { try { const c = await caches.open(ACT_CACHE), r = await c.match('act-' + k); return r ? await r.json() : null; } catch (e) { return null; } }
async function actCachePut(k, secs) { try { const c = await caches.open(ACT_CACHE); await c.put('act-' + k, new Response(JSON.stringify(secs), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {} }
async function loadAct(k) {
  if (AX[k]) return AX[k];
  let secs = await actCacheGet(k);
  if (!secs) { const r = await g(drivePath(ACTS_DIR + '/_text/' + k + '.json') + ':/content'); if (r.ok) { secs = await r.json(); await actCachePut(k, secs); } }
  if (!secs) throw new Error('This Act is not on the shelf yet');
  AX[k] = secs; return secs;
}
async function actsFolder() { const r = await g(drivePath(ACTS_DIR)); if (r.ok) return r.json(); const root = await (await g(drivePath(DIARY_DIR))).json(); return makeFolder(root.id, 'Bare Acts'); }
async function addActFile(a, it, buf, show) {
  show && show('Reading ' + a.n + '… (a big Act takes a minute)');
  const isPdf = String.fromCharCode(...new Uint8Array(buf.slice(0, 4))) === '%PDF';
  const text = isPdf ? await pdfFullText(buf) : await fileText(it);
  const secs = splitSections(text);
  if (secs.length < 5) throw new Error('Could not find the sections in ' + it.name + ' — is it the India Code PDF of the Act?');
  await g(drivePath(ACTS_DIR + '/_text/' + a.k + '.json') + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(secs) });
  await actCachePut(a.k, secs); AX[a.k] = secs;
  change(d => { d.meta = d.meta || {}; d.meta.acts = Object.assign({}, d.meta.acts, { [a.k]: { itemId: it.id, name: it.name, sections: secs.length, added: todayIso(), u: Date.now() } }); });
  return secs.length;
}
/* files put in the Bare Acts folder by hand (or from the PC) are picked up */
async function scanActs(show) {
  const dir = await actsFolder(), files = (await listChildren(dir.id)).filter(it => it.file && /\.(pdf|docx)$/i.test(it.name)); let n = 0;
  for (const it of files) { const a = ACT_OF(it.name); if (!a || (shelf()[a.k] && shelf()[a.k].itemId === it.id)) continue;
    try { const r = await g('/me/drive/items/' + it.id + '/content'); await addActFile(a, it, await (await r.blob()).arrayBuffer(), show); n++; } catch (e) { toast(e.message, 5000); } }
  return n;
}

/* ---------- screens ---------- */
async function sheetActs() {
  openSheet(`<div class="s-head"><div><small>Official text from India Code</small><h1>Bare Acts</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint" id="ac_msg">Checking OneDrive › SM Chambers data › Bare Acts…</p>`);
  try { const n = await scanActs(t => { const el = $('#ac_msg'); if (el) el.textContent = t; }); if (n) toast(n + ' Act' + (n > 1 ? 's' : '') + ' added to the shelf'); } catch (e) {}
  const sh = shelf(), have = ACTS.filter(a => sh[a.k]).length;
  openSheet(`<div class="s-head"><div><small>${have} of ${ACTS.length} on your shelf</small><h1>Bare Acts</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${have ? `<form id="ac_all" style="display:flex;gap:8px;margin-bottom:10px"><input class="in" id="ac_q" placeholder="Search all Acts: a word or phrase" style="flex:1"><button class="save" type="submit" style="margin:0;width:auto;padding:0 16px">Search</button></form>` : ''}
    <div class="hist">${ACTS.map(a => sh[a.k] ? `<button class="hrow" data-ac="open" data-k="${a.k}"><b style="color:var(--dc-ink)">✓ ${a.k}</b><span><b style="font-family:inherit">${esc(a.n)}</b><br><small>${sh[a.k].sections} sections · added ${dmy(sh[a.k].added)}</small></span></button>`
      : `<div><b style="color:var(--muted)">${a.k}</b><span><b style="font-family:inherit">${esc(a.n)}</b><br><a class="linkbtn" href="${indiaCodeUrl(a)}" target="_blank" rel="noopener">Get it from India Code ↗</a> · <label class="linkbtn">Add the PDF<input type="file" accept=".pdf" data-ac="up" data-k="${a.k}" hidden></label></span></div>`).join('')}</div>
    <p class="hint">On India Code, open the Act and download its PDF. Then add it here, or share it to SM Chambers › Bare Acts. It is read once, then works offline.</p>`);
  const root = $('#sheet-root');
  root.onclick = e => { const b = e.target.closest('[data-ac="open"]'); if (b) sheetAct(b.dataset.k); };
  root.onchange = async e => { const el = e.target; if (el.dataset?.ac !== 'up' || !el.files[0]) return; const a = ACTS.find(x => x.k === el.dataset.k), f = el.files[0];
    try { const dir = await actsFolder(); toast('Uploading ' + f.name + '…'); const it = await uploadFile(dir.id, f, a.n + '.pdf'); const n = await addActFile(a, { ...it, name: it.name || f.name }, await f.arrayBuffer(), t => toast(t, 8000)); toast(a.k + ': ' + n + ' sections ready'); sheetActs(); } catch (er) { toast(er.message, 6000); } };
  const fa = $('#ac_all'); if (fa) fa.onsubmit = async e => { e.preventDefault(); const q = $('#ac_q').value.trim(); if (q) actSearchAll(q); };
}
const hl = (s, q) => esc(s).replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
async function sheetAct(k, q, openNo) {
  const a = ACTS.find(x => x.k === k); let secs;
  try { secs = await loadAct(k); } catch (e) { toast(e.message); return sheetActs(); }
  const st = { q: q || '' };
  const list = () => { const qq = st.q.trim(); if (!qq) return secs.slice(0, 60);
    const num = qq.replace(/^(?:s(?:ec(?:tion)?)?\.?\s*)/i, '').toUpperCase(); const exact = secs.filter(s => s.no.toUpperCase() === num);
    return exact.length ? exact : secs.filter(s => (s.head + ' ' + s.text).toLowerCase().includes(qq.toLowerCase())).slice(0, 60); };
  const draw = () => {
    const L = list(), qq = st.q.trim();
    openSheet(`<div class="s-head"><div><small>${secs.length} sections</small><h1>${esc(a.n)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><input class="in" id="as_q" type="search" value="${esc(st.q)}" placeholder="Section number (e.g. 318) or words"></div>
      <div class="hist">${L.map(s => `<button class="hrow" data-as="sec" data-no="${esc(s.no)}"><b>S. ${esc(s.no)}</b><span><b style="font-family:inherit">${qq ? hl(s.head, qq) : esc(s.head)}</b>${qq && !(s.no.toUpperCase() === qq.toUpperCase()) ? '<br><small>' + (() => { const i = s.text.toLowerCase().indexOf(qq.toLowerCase()); return i < 0 ? '' : hl('…' + s.text.slice(Math.max(0, i - 60), i + 100) + '…', qq); })() + '</small>' : ''}</span></button>`).join('') || '<p class="empty">Nothing found.</p>'}</div>
      ${!qq && secs.length > 60 ? '<p class="hint">Showing the first 60 — type a section number or a word.</p>' : ''}
      <button class="linkbtn" data-as="back" style="margin-top:10px">‹ All Bare Acts</button>`);
    const inp = $('#as_q'); inp.oninput = () => { st.q = inp.value; clearTimeout(draw.t); draw.t = setTimeout(() => { const pos = inp.selectionStart; draw(); const i2 = $('#as_q'); i2.focus(); i2.setSelectionRange(pos, pos); }, 250); };
  };
  const showSec = no => {
    const s = secs.find(x => x.no === no); if (!s) return draw();
    const i = secs.indexOf(s), prev = secs[i - 1], next = secs[i + 1];
    openSheet(`<div class="s-head"><div><small>${esc(a.n)}</small><h1>Section ${esc(s.no)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p style="font-weight:700;margin:0 0 8px">${esc(s.head)}</p><div class="act-text">${esc(s.text).replace(/ (\(\d+\)|\([a-z]\)|Explanation|Illustration)/g, '<br>$1')}</div>
      <div class="three" style="margin-top:12px"><button class="act blue" data-as="copy">Copy</button>${prev ? `<button class="act blue" data-as="sec" data-no="${esc(prev.no)}">‹ S. ${esc(prev.no)}</button>` : '<span></span>'}${next ? `<button class="act blue" data-as="sec" data-no="${esc(next.no)}">S. ${esc(next.no)} ›</button>` : '<span></span>'}</div>
      <p class="hint">From the India Code PDF on your shelf (${esc((shelf()[k] || {}).name || '')}). Check amendments before quoting.</p>
      <button class="linkbtn" data-as="list">‹ ${st.q ? 'Search results' : 'All sections'}</button>`);
    $('#sheet-root').onclick = async e => { const b = e.target.closest('[data-as]'); if (!b) return;
      if (b.dataset.as === 'copy') { const c = 'Section ' + s.no + ', ' + a.n + ' — ' + s.head + '.\n' + s.text; try { await navigator.clipboard.writeText(c); toast('Section copied'); } catch (er) { toast('Could not copy'); } }
      else if (b.dataset.as === 'sec') showSec(b.dataset.no); else { draw(); bind(); } };
  };
  const bind = () => { $('#sheet-root').onclick = e => { const b = e.target.closest('[data-as]'); if (!b) return; if (b.dataset.as === 'back') return sheetActs(); if (b.dataset.as === 'sec') showSec(b.dataset.no); }; };
  if (openNo && secs.some(x => x.no === openNo)) return showSec(openNo);
  draw(); bind();
}
async function actSearchAll(q) {
  const out = [];
  for (const a of ACTS.filter(x => shelf()[x.k])) { try { (await loadAct(a.k)).forEach(s => { if ((s.head + ' ' + s.text).toLowerCase().includes(q.toLowerCase())) out.push({ a, s }); }); } catch (e) {} }
  openSheet(`<div class="s-head"><div><small>${out.length} section${out.length === 1 ? '' : 's'} found</small><h1>“${esc(q)}”</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="hist">${out.slice(0, 80).map(({ a, s }) => `<button class="hrow" data-sa="${a.k}" data-no="${esc(s.no)}"><b>${a.k}<br>S. ${esc(s.no)}</b><span><b style="font-family:inherit">${hl(s.head, q)}</b></span></button>`).join('') || '<p class="empty">Nothing found.</p>'}</div>
    <button class="linkbtn" data-sa="back" style="margin-top:10px">‹ All Bare Acts</button>`);
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-sa]'); if (!b) return; if (b.dataset.sa === 'back') sheetActs(); else sheetAct(b.dataset.sa, '', b.dataset.no); };
}
/* "Section 420 IPC" on a matter → that section, if the Act is on the shelf */
function sectionLinks(m) {
  const sh = shelf(), out = [];
  (typeof sectionSearches === 'function' ? sectionSearches(m.sections) : []).forEach(x => { const mm = x.match(/^Section (\S+)\s+(.+)$/); if (!mm) return; const a = ACT_OF(mm[2]); if (a && sh[a.k]) out.push({ label: 'S. ' + mm[1].replace(/\(.*$/, '') + ' ' + a.k, k: a.k, no: mm[1].replace(/\(.*$/, '') }); });
  return out;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="acts"],[data-act="actsec"]'); if (!el) return;
  if (el.dataset.act === 'acts') sheetActs(); else sheetAct(el.dataset.k, '', el.dataset.no);
});
