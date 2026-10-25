/* Case Diary — Step 2
   Matter page, linking a matter to its OneDrive case folder (by permanent item ID),
   browsing and opening files, adding photos/files, and creating new matter folders
   with the agreed names. Nothing is ever deleted or moved from here. */
'use strict';

const CASE_ROOT = 'Case Folder Onedrive';
const STD_SUBFOLDERS = ['1 Pleadings', '2 Orders', '3 Documents', '4 Correspondence', '5 Fees & Receipts'];
const F = { stack: [], items: null, loading: false, err: '', uploads: [] }; // folder browser on the matter page

Object.assign(I, {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  cam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
});

/* ---------- OneDrive folder helpers ---------- */
const SEL = '$select=id,name,folder,file,size,lastModifiedDateTime,webUrl,parentReference';
async function listChildren(id) {
  let url = (id ? '/me/drive/items/' + id : '/me/drive/root') + '/children?' + SEL + '&$top=200';
  const out = [];
  while (url) {
    const r = await g(url); if (!r.ok) throw new Error(r.status === 404 ? 'Folder not found in OneDrive' : 'OneDrive ' + r.status);
    const j = await r.json(); out.push(...j.value); url = j['@odata.nextLink'] || '';
  }
  return out.sort((a, b) => (!!b.folder - !!a.folder) || a.name.localeCompare(b.name, 'en', { numeric: true }));
}
async function getItem(idOrPath) {
  const r = await g((idOrPath.startsWith('/') ? idOrPath : '/me/drive/items/' + idOrPath) + '?' + SEL);
  if (!r.ok) throw new Error(r.status === 404 ? 'not found' : 'OneDrive ' + r.status);
  return r.json();
}
let caseRootCache = null;
async function caseRoot() {
  if (caseRootCache) return caseRootCache;
  try { caseRootCache = await getItem(drivePath(CASE_ROOT)); } catch (e) { caseRootCache = await getItem('/me/drive/root'); }
  return caseRootCache;
}
const itemPath = it => (decodeURIComponent((it.parentReference?.path || '').replace(/^\/drive\/root:?/, '')) + '/' + it.name).replace(/^\/+/, '');
const cleanName = s => String(s || '').replace(/[\\/]/g, '-').replace(/[:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
async function makeFolder(parentId, name) {
  const r = await g('/me/drive/items/' + parentId + '/children', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }) });
  if (r.status === 409) { const kids = await listChildren(parentId); const ex = kids.find(k => k.folder && k.name.toLowerCase() === name.toLowerCase()); if (ex) return ex; }
  if (!r.ok) throw new Error('Could not create folder (' + r.status + ')');
  return r.json();
}
async function uploadFile(parentId, file, name, onProgress) {
  name = cleanName(name || file.name) || 'File';
  const target = '/me/drive/items/' + parentId + ':/' + encodeURIComponent(name);
  if (file.size <= 4 * 1024 * 1024) {
    const r = await g(target + ':/content?@microsoft.graph.conflictBehavior=rename', { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    if (!r.ok) throw new Error('Upload failed (' + r.status + ')');
    onProgress && onProgress(1); return r.json();
  }
  const s = await g(target + ':/createUploadSession', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }) });
  if (!s.ok) throw new Error('Upload failed (' + s.status + ')');
  const { uploadUrl } = await s.json();
  const CH = 320 * 1024 * 16; let pos = 0, last;
  while (pos < file.size) {
    const end = Math.min(pos + CH, file.size);
    last = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${pos}-${end - 1}/${file.size}` }, body: file.slice(pos, end) });
    if (!last.ok && last.status !== 202) throw new Error('Upload failed (' + last.status + ')');
    pos = end; onProgress && onProgress(pos / file.size);
  }
  return last.json();
}

/* ---------- naming: quick-identification rule (approved 20.10.2026) ----------
   Who it is against or about · type · case no. · (diary no.)  e.g. "Baghel 482 – 2787-2024 (2024-001)" */
const TYPE_SHORT = { '138 NI': 'NI', 'Complaint': 'Complaint', 'Writ': 'Writ', 'Revision': 'Revision', 'Appeal': 'Appeal', 'Suit': 'Suit', 'Bail': 'Bail', 'ABA': 'ABA', 'DV': 'DV', '125': '125', 'Execution': 'Execution', 'Arbitration': 'Award', 'Mutation': 'Mutation', 'Opinion': 'Opinion', 'Notice': 'Notice', 'Deed': 'Deed' };
const NOISE = /^(m\/s|shri|smt\.?|sri|dr\.?|mr\.?|mrs\.?|ms\.?|the|km\.?)$/i;
function keyWord(party) {
  const w = String(party || '').replace(/&.*$/, '').replace(/\(.*?\)/g, '').split(/[\s,.]+/).filter(x => x && !NOISE.test(x));
  if (!w.length || /^(state|union)$/i.test(w[0])) return '';
  const firm = /^(pvt|private|ltd|limited|enterprises|construction|industries|restaurant|firm|company|co|corporation|bank|society|trust|associates|traders)$/i;
  if (w.some(x => firm.test(x))) return w.filter(x => !firm.test(x))[0] || w[0];
  return w[w.length - 1];
}
function oppositeParty(m) {
  const t = String(m.title || ''); const p = t.split(/\s+(?:v\.?|vs\.?|versus)\s+/i);
  if (p.length < 2) return '';
  const sd = m.side || ''; const weAreFirst = !/^(op|opposite|respondent|accused|defendant)/i.test(sd) && /complainant|petitioner|applicant|plaintiff|appellant|revisionist|claimant|lessor/i.test(sd);
  return keyWord(weAreFirst ? p[1] : p[0]) || keyWord(weAreFirst ? p[0] : p[1]);
}
function proposedFolderName(m) {
  const who = oppositeParty(m) || keyWord(m.clients) || 'Matter';
  const type = TYPE_SHORT[m.type] || m.type || '';
  const no = m.caseNo ? cleanName(m.caseNo).replace(/\s+/g, ' ') : '';
  const diaryNo = '(' + (+m.year ? m.year : 'OLD') + '-' + String(m.n).padStart(3, '0') + ')';
  return cleanName([who + (type ? ' ' + type : ''), no].filter(Boolean).join(' – ') + ' ' + diaryNo);
}
const followsScheme = name => /\(\d{4}-\d{3}\)$/.test(name || '') || /^\d{4}-\d{3} /.test(name || '');

/* "0 Matter details.txt" inside each matter folder: the full title and particulars, kept up to date. */
function detailsText(m) {
  const L = [['Full title', m.title], ['Matter ref.', mref(m)], ['Client(s)', m.clients], ['Court', m.court], ['Type', m.type], ['Case no.', m.caseNo], ['Crime / FIR no.', m.crimeNo], ['Police station', m.ps], ['Sections', m.sections], ['Appearing for', m.side], ['Status', m.status], ['Next date', m.nextDate ? dmy(m.nextDate) + (m.purpose ? ', ' + m.purpose : '') : ''], ['Notes', m.notes]];
  return L.filter(x => x[1]).map(x => x[0] + ': ' + x[1]).join('\r\n') + '\r\n\r\n(Kept up to date by SM Chambers.)\r\n';
}
let detailsBusy = false;
async function syncDetails() {
  if (detailsBusy || !S.account || !navigator.onLine) return;
  detailsBusy = true;
  for (const m of live().filter(x => x.folderId && x.ownStructure !== false).slice(0, 200)) {
    const txt = detailsText(m), sig = txt.length + ':' + [...txt].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
    if (m.detailsSig === sig) continue;
    try {
      const r = await g('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('0 Matter details.txt') + ':/content', { method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: '\ufeff' + txt });
      if (r.ok) change(() => { m.detailsSig = sig; });
      else if (r.status === 404) change(() => { m.detailsSig = sig; });
    } catch (e) { break; }
  }
  detailsBusy = false;
}
setInterval(syncDetails, 60000);
setTimeout(syncDetails, 15000);

/* ---------- Matter page ---------- */
function openMatter(id) {
  const m = find(id); if (!m) return;
  if (S.tab !== 'matter') S.prevTab = S.tab;
  S.tab = 'matter'; S.mid = id; F.stack = []; F.items = null; F.err = ''; F.common = null;
  closeSheet(); render(); scrollTo(0, 0);
  if (m.folderId) { loadFolder(); refreshFolderName(m); }
}
async function findCommon(m, it) {   // a "Common papers" folder beside this matter's folder (shared by co-accused / family matters)
  F.common = null;
  try {
    const pid = it.parentReference && it.parentReference.id; if (!pid) return;
    const sib = (await listChildren(pid)).find(x => x.folder && x.id !== m.folderId && /common\s*papers|सामान्य/i.test(x.name));
    if (sib && S.mid === m.id) { F.common = { id: sib.id, name: sib.name }; renderFiles(); }
  } catch (e) {}
}
async function refreshFolderName(m) {
  try { const it = await getItem(m.folderId); findCommon(m, it); if (it.name !== m.folderName || itemPath(it) !== m.folderPath) change(() => { Object.assign(m, { folderName: it.name, folderPath: itemPath(it), folderUrl: it.webUrl }); }); } catch (e) {}
}
function curFolder() { const m = find(S.mid); return F.stack.length ? F.stack[F.stack.length - 1] : { id: m.folderId, name: m.folderName }; }
async function loadFolder() {
  F.loading = true; F.err = ''; F.items = null; renderFiles();
  try { F.items = await listChildren(curFolder().id); }
  catch (e) { F.err = navigator.onLine ? e.message : 'Offline — files show when the internet is back.'; }
  F.loading = false; renderFiles();
}
function renderFiles() { const el = $('#files'); if (el) el.innerHTML = filesInner(find(S.mid)); }

function viewMatter(m) {
  const f = forumOf(m);
  const row = (k, v) => v ? `<span>${k}</span><b>${esc(v)}</b>` : '';
  const hist = [...(m.hearings || [])].reverse();
  const due = feeDue(m);
  return `<header class="phead" style="background:${f.c}">
    <div class="top-row"><button class="backbtn" data-act="back" aria-label="Back">${I.back}</button><button id="syncbtn" class="sync" data-act="sync" style="background:rgba(255,255,255,.18)"></button></div>
    <div><small style="font-weight:800;opacity:.85;font-family:var(--mono);letter-spacing:.02em">${esc(mref(m))}</small><h1 style="margin-top:4px">${esc(m.title || m.clients)}</h1>
    <p class="m-meta" style="color:rgba(255,255,255,.85);margin:6px 0 0">${esc(metaLine(m))}</p></div>
    <div class="next-strip">${m.nextDate ? `<span>Next date</span><b>${DOWL[parseIso(m.nextDate).getDay()].slice(0, 3)}, ${dmy(m.nextDate)}</b>${m.purpose ? `<span>for ${esc(m.purpose)}</span>` : ''}` : `<b>${m.status === 'Pending' ? 'No next date' : esc(m.status)}</b>`}</div>
  </header>
  <main class="matter-main"><div class="mp-col">
    ${typeof stageStrip === 'function' && !isRetainer(m) && stageOf(m) !== 'decided' ? `<section class="card" style="padding:10px 14px">${stageStrip(m)}</section>` : ''}
    <div class="acts mp-acts" style="grid-template-columns:1.3fr 1fr 1fr 1fr"><button class="act primary" data-act="record" data-id="${m.id}">Next date</button><button class="act blue" data-act="edit" data-id="${m.id}">Edit</button><button class="act blue" data-act="draft" data-id="${m.id}">Draft</button><button class="act wa" data-act="wa" data-id="${m.id}" ${waOf(m) ? '' : 'disabled title="Add client mobile first"'}>${I.wa}Client</button></div>
    <div class="acts mp-acts" style="grid-template-columns:1fr 1fr 1fr;margin-top:-4px"><button class="act blue" data-act="readorder" data-id="${m.id}">Read order photo</button><button class="act blue" data-act="claudedraft" data-id="${m.id}">Draft with Claude</button><button class="act blue" data-act="research" data-id="${m.id}">Research</button></div>
    <div class="acts mp-acts" style="grid-template-columns:1fr 1fr;margin-top:-4px"><button class="act blue" data-act="cover" data-id="${m.id}" style="min-height:42px">Print file cover</button><button class="act blue" data-act="letters" data-id="${m.id}" style="min-height:42px">Letters &amp; notices${(m.letters || []).length ? ' (' + m.letters.length + ')' : ''}</button></div>
    ${pendingOutcome(m) ? `<section class="card ask-card"><b>What happened on ${dmy(m.nextDate)}?</b><div class="chips" style="margin-top:8px">${HAPPENED.map(h => `<button class="chip" data-act="outcome" data-id="${m.id}" data-v="${h}">${h}</button>`).join('')}</div></section>` : ''}
    ${typeof limitCard === 'function' ? limitCard(m) : ''}
    ${dupsOf(m).length ? `<section class="card dup-card"><b><span class="dupstar">★</span> Entered more than once</b><p class="hint" style="margin:4px 0 8px">The same case also appears as:</p>${dupsOf(m).map(x => `<button class="linkbtn" data-act="open" data-id="${x.id}" style="display:block;text-align:left;margin:4px 0">${esc(mref(x))} · ${esc(x.title || x.clients)}${x.court ? ' · ' + esc(x.court) : ''}</button>`).join('')}<p class="hint" style="margin:8px 0 0">Keep one: open the other and use Edit › Remove this matter.</p></section>` : ''}
    <section class="card" style="padding:12px 16px"><div class="stbox" style="margin:0"><div class="field" style="margin:0 0 10px"><label for="fo_${m.id}">Category</label><select class="in" id="fo_${m.id}" data-st="forum" data-id="${m.id}">${Object.entries(FORUMS).map(([k, x]) => `<option value="${k}" ${k === (m.forum || 'District') ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div><div class="field" style="margin:0"><label for="st_${m.id}">Status</label><select class="in" id="st_${m.id}" data-st="status" data-id="${m.id}">${statusList(m).map(s => `<option ${s === (m.status || statusList(m)[0]) ? 'selected' : ''}>${s}</option>`).join('')}${statusList(m).includes(m.status) || !m.status ? '' : `<option selected>${esc(m.status)}</option>`}</select></div>
      ${typeof allotBox === 'function' ? allotBox(m) : ''}
      ${m.forum === 'Advisory' && isRetainer(m) ? retainerBox(m) : ''}${m.forum === 'Advisory' && !isRetainer(m) && typeof stageStrip !== 'function' ? `<button class="act primary" data-act="tocase" data-id="${m.id}" style="width:100%;margin-top:10px;min-height:44px">Convert to case</button>` : ''}${m.prelit ? `<p class="hint" style="margin:8px 0 0">Pre-litigation: ${esc(m.prelit.status || '')}${m.prelit.till ? ' (till ' + dmy(m.prelit.till) + ')' : ''}</p>` : ''}
      ${m.status === 'Decided' ? `<div class="field" style="margin:10px 0 0"><label for="oc_${m.id}">Result</label><select class="in ${m.outcome ? '' : 'needs'}" id="oc_${m.id}" data-st="outcome" data-id="${m.id}"><option value="">Choose…</option>${OUTCOMES.map(s => `<option ${s === m.outcome ? 'selected' : ''}>${s}</option>`).join('')}</select></div>` : ''}</div></section>
    <section class="card mp-files" id="files">${filesInner(m)}</section>
    </div><div class="mp-col">
    <section class="card mp-details"><div class="h2" style="margin-bottom:12px"><h2>Details</h2></div>

      <div class="kv"><span>Allotted to</span><b>${esc(typeof allotName === 'function' ? allotName(m) : 'Self')}</b><span>Matter ref.</span><b style="font-family:var(--mono);font-size:13px">${esc(matterRef(m))}${m.clientCode ? '' : ` <button class="linkbtn" data-act="setcode" data-id="${m.id}">Set client code</button>`}</b>${row('Client(s)', m.clients)}${row('Also known as', aliasesOf(m.clients).join(', '))}${row('Type', m.type)}${row('Case no.', m.caseNo)}${m.cnr ? `<span>CNR</span><b style="font-family:var(--mono);letter-spacing:.02em">${esc(m.cnr)} <button class="linkbtn" data-act="copycnr" data-v="${esc(m.cnr)}">Copy</button></b>` : ''}${row('Filing no.', m.filingNo)}${row('Crime / FIR', m.crimeNo)}${row('Police station', m.ps)}${row('Sections', m.sections)}${row('Nature', m.nature)}${row('Appearing for', m.side)}${row('Last date', dmy(m.lastDate))}${row('Item', m.item)}${m.phone ? `<span>Client mobile</span><b><a href="tel:${esc(m.phone)}">${esc(m.phone)}</a></b>` : ''}${m.whatsapp || m.phone ? `<span>WhatsApp</span><b>${waOf(m) ? `<a href="https://wa.me/${waOf(m)}" target="_blank" rel="noopener">${esc(m.whatsapp || m.phone)}</a>` : esc(m.whatsapp)}</b>` : ''}${m.email ? `<span>Email</span><b><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></b>` : ''}${m.altPhone || m.altName ? `<span>Alternate${m.altName ? ' (' + esc(m.altName) + ')' : ''}</span><b>${m.altPhone ? `<a href="tel:${esc(m.altPhone)}">${esc(m.altPhone)}</a>` : '—'}</b>` : ''}${row('Notes', m.notes)}</div>
      ${m.deadline ? `<div class="mini ${m.deadlineDone ? '' : 'red'}"><span>${m.deadlineDone ? 'Deadline done' : 'Deadline'}</span><b>${esc(m.deadlineFor || 'Due')} · ${dmy(m.deadline)}</b>${m.deadlineDone ? '' : `<button data-act="deadlinedone" data-id="${m.id}">Mark done</button>`}</div>` : ''}
      ${m.feeAgreed || m.feeReceived ? `<div class="mini ${due ? 'saff' : 'green'}"><span>Fees</span><b>${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)} received</b>${due ? `<span>${rupees(due)} pending</span>` : '<span>Paid</span>'}</div>` : ''}
      ${expensesBlock(m)}
      <button class="act blue" data-act="share" data-id="${m.id}" style="width:100%;margin-top:12px;min-height:44px">Share with client — WhatsApp · Email · SMS</button>
      <div class="two" style="margin-top:8px"><button class="ghost" data-act="fees" data-id="${m.id}">Fees &amp; payments</button><button class="ghost" data-act="addexp" data-id="${m.id}">Add expense</button></div>
    </section>
    ${typeof taskCard === 'function' ? taskCard(m) : ''}
    ${typeof authorityCard === 'function' ? authorityCard(m) : ''}
    ${(m.readings || []).length ? `<section class="card mp-hist"><div class="h2" style="margin-bottom:6px"><h2>Papers read by Claude</h2><span class="sub">${m.readings.length}</span></div>
      <div class="hist">${m.readings.map(x => `<div><b>${dmy(x.date)}</b><span><b style="font-family:inherit">${esc(x.paper || '')}</b><br>${esc(x.summary || '')}${x.nextDate ? '<br>Next date ' + dmy(x.nextDate) : ''}${(x.todo || []).length ? '<br><span style="color:var(--saffron-ink)">To do: ' + x.todo.map(esc).join('; ') + '</span>' : ''}${(x.watch || []).length ? '<br><span style="color:#8E2A2A">Watch: ' + x.watch.map(esc).join('; ') + '</span>' : ''}</span></div>`).join('')}</div></section>` : ''}
    <section class="card mp-hist"><div class="h2" style="margin-bottom:6px"><h2>Hearing history</h2><span class="sub">${hist.length}</span></div>
      ${hist.length ? `<div class="hist">${hist.map(h => `<button class="hrow" data-act="hedit" data-id="${m.id}" data-i="${(m.hearings || []).indexOf(h)}"><b>${dmy(h.date)}</b><span><b style="font-family:inherit;${h.happened === 'Listed' && !h.next ? 'color:var(--red)' : ''}">${esc(h.happened === 'Listed' && !h.next ? 'Listed · what happened?' : h.happened)}</b>${h.next ? ' → ' + dmy(h.next) : ''}${h.purpose ? ' · ' + esc(h.purpose) : ''}${h.item ? ' · item ' + esc(h.item) : ''}${h.note ? '<br><span style="color:var(--muted)">' + esc(h.note) + '</span>' : ''}${h.edited ? '<br><small style="color:var(--muted)">edited ' + dmy(h.edited) + '</small>' : ''}</span></button>`).join('')}</div>` : '<p style="color:var(--muted);font-size:14px;margin:0">No hearings recorded yet. Use <b>Next date</b> after each hearing.</p>'}
    ${(m.changes || []).length ? `<details style="margin-top:12px"><summary style="font-weight:700;cursor:pointer">Record of changes (${m.changes.length})</summary><div class="hist" style="margin-top:8px">${m.changes.slice().reverse().map(c => `<div><b>${dmy(c.at.slice(0, 10))}<br><small>${esc(c.at.slice(11))}</small></b><span>${esc(c.t)}</span></div>`).join('')}</div></details>` : ''}
    </section>
  </div></main>`;
}

function fileIcon(it) {
  if (it.folder) return [I.folder, 'var(--saffron-soft)'];
  const ext = (it.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return ['PDF', 'var(--red-soft)'];
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return ['W', 'var(--hc-soft)'];
  if (['xls', 'xlsx', 'csv'].includes(ext)) return ['X', 'var(--dc-soft)'];
  if (['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext)) return ['IMG', 'var(--tr-soft)'];
  if (['mp3', 'm4a', 'ogg', 'opus', 'wav', 'mp4'].includes(ext)) return ['▶', 'var(--rv-soft)'];
  return [ext.slice(0, 3).toUpperCase() || '·', 'var(--chip)'];
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
function filesInner(m) {
  if (!m) return '';
  if (!m.folderId) {
    return `<div class="h2"><h2>Case folder</h2></div>
      <p style="color:var(--muted);font-size:14px;margin:8px 0 14px;line-height:1.5">Not linked yet. Link this matter to its folder in <b>${esc(CASE_ROOT)}</b>, or create a new folder for it.</p>
      <div class="two"><button class="act blue" data-act="linkfolder">${I.link}Link existing folder</button><button class="act primary" data-act="newfolder">${I.folder}Create new folder</button></div>`;
  }
  const cur = curFolder();
  const crumbs = [{ name: m.folderName, i: -1 }, ...F.stack.map((s, i) => ({ name: s.name, i }))];
  const upl = F.uploads.length ? `<div class="uploads">${F.uploads.map(u => `<div><span>${esc(u.name)}</span><b>${u.err ? '⚠ ' + esc(u.err) : u.done ? 'Saved' : Math.round(u.p * 100) + '%'}</b></div>`).join('')}</div>` : '';
  let body;
  if (F.loading) body = '<p class="empty">Reading folder…</p>';
  else if (F.err) body = `<p class="empty">${esc(F.err)}<br><button class="linkbtn" data-act="reloadfiles">Try again</button>${/not found/i.test(F.err) ? ' · <button class="linkbtn" data-act="linkfolder">Link again</button>' : ''}</p>`;
  else if (!F.items) body = '';
  else if (!F.items.length) body = '<p class="empty">This folder is empty.</p>';
  else body = `<div class="flist">${F.items.map(it => { const [ic, bg] = fileIcon(it); return `<button class="frow" data-act="${it.folder ? 'subdir' : 'openfile'}" data-fid="${it.id}"><span class="ficon" style="background:${bg}">${ic}</span><span class="fname">${esc(it.name)}<small>${it.folder ? (it.folder.childCount ?? '') + ' items' : kb(it.size || 0)} · ${new Date(it.lastModifiedDateTime).toLocaleDateString('en-GB').replace(/\//g, '.')}</small></span></button>`; }).join('')}</div>`;
  const missingStd = m.ownFolder && !F.stack.length && F.items ? STD_SUBFOLDERS.filter(n => !F.items.some(it => it.folder && it.name === n)) : [];
  return `<div class="h2"><h2>Case folder</h2><span style="display:flex;gap:6px">${isPhone() ? '' : `<button class="linkbtn" data-act="copypath" title="Copy this folder\'s path on your computer">PC path</button>`}<button class="linkbtn" data-act="openweb">${I.ext} OneDrive</button></span></div>
    ${F.common && !(F.stack[0] && F.stack[0].id === F.common.id) ? `<button class="act blue" data-act="common" style="width:100%;margin:8px 0 0;min-height:40px">${I.folder}${esc(F.common.name)} (shared)</button>` : ''}
    <div class="crumbs">${crumbs.map((c, k) => `<button data-act="crumb" data-i="${c.i}" ${k === crumbs.length - 1 ? 'class="on"' : ''}>${esc(c.name)}</button>`).join('<span>›</span>')}</div>
    <div class="fbar">
      <label class="act primary">${I.cam}Photo<input type="file" accept="image/*" capture="environment" data-act="upload" hidden></label>
      <label class="act blue">${I.up}Add files<input type="file" multiple data-act="upload" hidden></label>
    </div>
    <p class="hint">Saved into: <b>${esc(cur.name)}</b></p>
    ${upl}${body}
    ${missingStd.length ? `<div class="std"><span class="lbl">Standard subfolders (create only when needed)</span><div class="chips">${missingStd.map(n => `<button class="chip" data-act="mkstd" data-n="${esc(n)}" style="min-height:36px;font-size:13px">+ ${esc(n)}</button>`).join('')}</div></div>` : ''}
    <div class="fmeta"><span>${esc(m.folderPath || '')}</span><button class="linkbtn" data-act="linkfolder">Change link</button></div>`;
}

async function handleUpload(input) {
  const files = [...(input.files || [])]; input.value = '';
  if (!files.length) return;
  const dest = curFolder();
  for (const file of files) {
    let name = file.name;
    if (/^(image|IMG|photo)[_-]?\d*\.(jpe?g|png|heic)$/i.test(name) || /^\d{8,}/.test(name)) {
      const d = new Date(); name = `${dmy(iso(d))} Photo ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.` + (name.split('.').pop() || 'jpg');
    }
    const u = { name, p: 0, done: false, err: '' }; F.uploads.push(u); renderFiles();
    try { await uploadFile(dest.id, file, name, p => { u.p = p; renderFiles(); }); u.done = true; }
    catch (e) { u.err = navigator.onLine ? e.message : 'offline'; }
    renderFiles();
  }
  setTimeout(() => { F.uploads = F.uploads.filter(u => u.err); renderFiles(); }, 4000);
  if (curFolder().id === dest.id) loadFolder();
  toast(files.length > 1 ? files.length + ' files saved to ' + dest.name : 'Saved to ' + dest.name);
}

/* ---------- folder picker (link existing) ---------- */
const P = { stack: [], items: null, q: '', results: null, busy: false, err: '' };
async function openPicker() {
  const m = find(S.mid);
  P.stack = []; P.items = null; P.q = ''; P.results = null; P.err = '';
  drawPicker();
  try {
    const root = await caseRoot(); P.stack = [{ id: root.id, name: root.name || 'OneDrive' }];
    P.items = (await listChildren(root.id)).filter(i => i.folder);
  } catch (e) { P.err = e.message; }
  P.suggest = await suggestWithSearch(m, P.items || []);
  drawPicker();
}
function suggestFolders(m, items) {
  const words = String(m.clients + ' ' + m.title).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !['state', 'others', 'union', 'india', 'versus', 'pradesh'].includes(w));
  return items.map(i => ({ i, s: words.filter(w => i.name.toLowerCase().includes(w)).length })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 5).map(x => x.i);
}
async function suggestWithSearch(m, rootKids) {
  const out = suggestFolders(m, rootKids);
  const w = String(m.clients || m.title || '').split(/[^A-Za-z]+/).filter(x => x.length > 2).slice(0, 2).join(' ');
  if (w) {
    try {
      const r = await g("/me/drive/root/search(q='" + encodeURIComponent(w.replace(/'/g, "''")) + "')?" + SEL + '&$top=25');
      if (r.ok) { const j = await r.json(); for (const it of (j.value || [])) if (it.folder && !out.some(o => o.id === it.id) && /case folder onedrive/i.test(it.parentReference?.path || 'case folder onedrive')) out.push(it); }
    } catch (e) {}
  }
  return out.slice(0, 6);
}
function drawPicker() {
  const m = find(S.mid), cur = P.stack[P.stack.length - 1];
  const list = P.results || P.items;
  const rows = it => `<div class="prow"><button class="frow" data-pk="into" data-fid="${it.id}" data-name="${esc(it.name)}"><span class="ficon" style="background:var(--saffron-soft)">${I.folder}</span><span class="fname">${esc(it.name)}${P.results ? `<small>${esc(itemPath(it))}</small>` : `<small>${it.folder?.childCount ?? ''} items</small>`}</span></button><button class="pick" data-pk="link" data-fid="${it.id}">Link</button></div>`;
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(mref(m))} · link case folder</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <label class="search" style="border:2px solid var(--line)">${I.search}<input type="search" data-pk="q" placeholder="Search all OneDrive folders" value="${esc(P.q)}" enterkeyhint="search"></label>
    ${P.stack.length > 1 && !P.results ? `<div class="crumbs">${P.stack.map((c, k) => `<button data-pk="crumb" data-i="${k}" ${k === P.stack.length - 1 ? 'class="on"' : ''}>${esc(c.name)}</button>`).join('<span>›</span>')}</div>` : ''}
    ${P.stack.length > 1 && !P.results ? `<button class="save" data-pk="linkcur" style="background:var(--hc);box-shadow:none">Link “${esc(cur.name)}”</button>` : ''}
    ${P.err ? `<p class="empty">${esc(P.err)}</p>` : ''}
    ${P.busy || (!list && !P.err) ? '<p class="empty">Reading folders…</p>' : ''}
    ${!P.results && P.stack.length === 1 && P.suggest?.length ? `<div class="grp"><span class="lbl">Suggested</span><div class="flist">${P.suggest.map(rows).join('')}</div></div>` : ''}
    ${list && !P.busy ? `<div class="grp"><span class="lbl">${P.results ? 'Search results' : esc(cur?.name || '')}</span><div class="flist">${list.length ? list.map(rows).join('') : '<p class="empty">No folders.</p>'}</div></div>` : ''}`);
  const root = $('#sheet-root');
  root.onclick = async e => {
    const el = e.target.closest('[data-pk]'); if (!el) return;
    const k = el.dataset.pk;
    if (k === 'into') { P.results = null; P.q = ''; P.stack.push({ id: el.dataset.fid, name: el.dataset.name }); P.items = null; drawPicker(); try { P.items = (await listChildren(el.dataset.fid)).filter(i => i.folder); } catch (er) { P.err = er.message; } drawPicker(); }
    else if (k === 'crumb') { P.stack = P.stack.slice(0, +el.dataset.i + 1); P.items = null; drawPicker(); P.items = (await listChildren(P.stack[P.stack.length - 1].id)).filter(i => i.folder); drawPicker(); }
    else if (k === 'link') linkFolder(el.dataset.fid);
    else if (k === 'linkcur') linkFolder(P.stack[P.stack.length - 1].id);
  };
  root.onkeydown = async e => {
    if (e.target.dataset?.pk !== 'q' || e.key !== 'Enter') return;
    P.q = e.target.value.trim(); if (!P.q) { P.results = null; return drawPicker(); }
    P.busy = true; drawPicker();
    try {
      const r = await g("/me/drive/root/search(q='" + encodeURIComponent(P.q.replace(/'/g, "''")) + "')?" + SEL + '&$top=50');
      const j = await r.json(); P.results = (j.value || []).filter(i => i.folder);
    } catch (er) { P.err = er.message; }
    P.busy = false; drawPicker();
  };
}
async function linkFolder(fid) {
  const m = find(S.mid);
  try {
    const it = await getItem(fid);
    change(() => { Object.assign(m, { folderId: it.id, folderName: it.name, folderPath: itemPath(it), folderUrl: it.webUrl, ownFolder: false, noAutoLink: true }); touch(m); });
    const root = $('#sheet-root'); root.onclick = root.onkeydown = null;
    closeSheet(); toast('Linked to ' + it.name); F.stack = []; loadFolder();
  } catch (e) { toast('Could not link: ' + e.message); }
}

/* ---------- create a new matter folder ---------- */
async function openNewFolder() {
  const m = find(S.mid);
  const N = { parent: null, name: proposedFolderName(m), clientName: cleanName(m.clients), opts: null, busy: false };
  const draw = () => openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(mref(m))} · new case folder</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="grp"><span class="lbl">1 · Client folder</span>
      ${!N.opts ? '<p class="empty">Looking for the client folder…</p>' : `<div class="flist">${N.opts.map(o => `<button class="frow ${N.parent && N.parent.key === o.key ? 'sel' : ''}" data-nf="parent" data-key="${o.key}"><span class="ficon" style="background:${o.isNew ? 'var(--dc-soft)' : 'var(--saffron-soft)'}">${o.isNew ? '+' : I.folder}</span><span class="fname">${esc(o.label)}<small>${esc(o.sub)}</small></span></button>`).join('')}</div>`}
    </div>
    <div class="field"><label for="nf_name">2 · MATTER FOLDER NAME</label><input class="in" id="nf_name" value="${esc(N.name)}"><span class="hint">Year-number · type · court · case no. Edit if needed.</span></div>
    <button class="save" data-nf="create" ${N.parent && !N.busy ? '' : 'disabled'}>${N.busy ? 'Creating…' : 'Create folder and link'}</button>`);
  draw();
  try {
    const root = await caseRoot(); const kids = (await listChildren(root.id)).filter(i => i.folder);
    const sug = await suggestWithSearch(m, kids);
    N.opts = [
      ...sug.map(i => ({ key: i.id, id: i.id, label: i.name, sub: 'Existing client folder' })),
      { key: 'new', isNew: true, label: N.clientName || 'New client folder', sub: 'Create a new client folder in ' + root.name, rootId: root.id },
      { key: 'root', id: root.id, label: root.name, sub: 'Put the matter folder directly here' },
    ];
    N.parent = N.opts[0];
  } catch (e) { N.opts = []; toast(e.message); }
  draw();
  const rootEl = $('#sheet-root');
  rootEl.oninput = e => { if (e.target.id === 'nf_name') N.name = e.target.value; };
  rootEl.onclick = async e => {
    const el = e.target.closest('[data-nf]'); if (!el) return;
    if (el.dataset.nf === 'parent') { N.parent = N.opts.find(o => o.key === el.dataset.key); draw(); }
    if (el.dataset.nf === 'create') {
      const name = cleanName(N.name); if (!name) return toast('Enter a folder name');
      N.busy = true; draw();
      try {
        let parentId = N.parent.id;
        if (N.parent.isNew) parentId = (await makeFolder(N.parent.rootId, N.clientName || 'New Client')).id;
        const it = await makeFolder(parentId, name);
        const full = await getItem(it.id);
        change(() => { Object.assign(m, { folderId: full.id, folderName: full.name, folderPath: itemPath(full), folderUrl: full.webUrl, ownFolder: true }); touch(m); });
        rootEl.onclick = rootEl.oninput = null; closeSheet(); toast('Folder created: ' + full.name); F.stack = []; loadFolder();
      } catch (er) { N.busy = false; draw(); toast(er.message); }
    }
  };
}

/* offer to rename the folder once the case number is entered (plan §8) */
async function afterEdit(m, before) {
  if (!m.folderId || !followsScheme(m.folderName)) return;
  const want = proposedFolderName(m);
  if (want === m.folderName || (before.caseNo === m.caseNo && before.type === m.type && before.court === m.court)) return;
  if (!confirm('Rename the case folder?\n\nFrom: ' + m.folderName + '\nTo:   ' + want)) return;
  try {
    const r = await g('/me/drive/items/' + m.folderId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: want }) });
    if (!r.ok) throw new Error(r.status === 409 ? 'a folder with that name already exists' : 'OneDrive ' + r.status);
    const it = await r.json();
    change(() => { Object.assign(m, { folderName: it.name, folderPath: itemPath(it), folderUrl: it.webUrl }); touch(m); });
    toast('Folder renamed'); if (S.tab === 'matter') loadFolder();
  } catch (e) { toast('Not renamed: ' + e.message); }
}

/* ---------- open a file the way the device opens it ----------
   Word, Excel and PowerPoint files open in the Office app itself (Word on the computer, Word on the phone),
   straight from OneDrive, so changes save back. Everything else (PDF, photos, audio) opens with the device's
   own viewer. If the Office app is not installed, OneDrive in the browser opens instead. */
const PC_ROOT = 'E:\\OneDrive';
const isPhone = () => /Android|iPhone|iPad/i.test(navigator.userAgent);
const OFFICE = { doc: 'ms-word', docx: 'ms-word', rtf: 'ms-word', xls: 'ms-excel', xlsx: 'ms-excel', csv: 'ms-excel', ppt: 'ms-powerpoint', pptx: 'ms-powerpoint' };
async function openNative(it) {
  const ext = (it.name.split('.').pop() || '').toLowerCase();
  if (typeof VIEWABLE !== 'undefined' && VIEWABLE[ext]) return viewFile(it);   // PDFs, photos, audio, video: inside the app
  const scheme = OFFICE[ext];
  if (scheme && it.parentReference?.driveId) {
    const url = 'https://d.docs.live.net/' + it.parentReference.driveId + '/' + itemPath(it).split('/').map(encodeURIComponent).join('/');
    let left = false; const mark = () => { left = true; };
    document.addEventListener('visibilitychange', mark, { once: true }); window.addEventListener('blur', mark, { once: true });
    toast('Opening in ' + { 'ms-word': 'Word', 'ms-excel': 'Excel', 'ms-powerpoint': 'PowerPoint' }[scheme] + '…', 2500);
    location.href = scheme + ':ofe|u|' + url;
    setTimeout(() => { if (!left) window.open(it.webUrl, '_blank'); }, 2500);
    return;
  }
  // open the window first (still inside the tap), then point it at the file, so the phone does not block it
  const w = window.open('', '_blank');
  try {
    const r = await g('/me/drive/items/' + it.id + '?select=id,@microsoft.graph.downloadUrl');
    const dl = r.ok ? (await r.json())['@microsoft.graph.downloadUrl'] : '';
    if (!dl) throw new Error('no link');
    if (w) w.location.href = dl; else location.href = dl;
  } catch (e) { if (w) w.location.href = it.webUrl; else window.open(it.webUrl, '_blank'); }
}

/* ---------- events for this module ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="common"]'); if (!el || !F.common) return;
  F.stack = [{ id: F.common.id, name: F.common.name }]; loadFolder();
});
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, m = find(S.mid);
  if (a === 'back') { S.tab = S.prevTab || 'home'; render(); scrollTo(0, 0); }
  else if (a === 'linkfolder') openPicker();
  else if (a === 'newfolder') openNewFolder();
  else if (a === 'reloadfiles') loadFolder();
  else if (a === 'subdir') { const it = F.items.find(i => i.id === el.dataset.fid); F.stack.push({ id: it.id, name: it.name }); loadFolder(); }
  else if (a === 'crumb') { F.stack = F.stack.slice(0, +el.dataset.i + 1); loadFolder(); }
  else if (a === 'openfile') { const it = F.items.find(i => i.id === el.dataset.fid); if (it) openNative(it); }
  else if (a === 'copypath') { const c = curFolder(); try { const it = c.id === m.folderId ? { name: m.folderName, parentReference: null, _p: m.folderPath } : await getItem(c.id); const p = PC_ROOT + '\\' + (it._p || itemPath(it)).replace(/\//g, '\\'); await navigator.clipboard.writeText(p); toast('Copied: ' + p + ' — paste it in the File Explorer address bar', 6000); } catch (er) { toast('Could not copy the path'); } }
  else if (a === 'openweb') { const c = curFolder(); try { const it = c.id === m.folderId && m.folderUrl ? { webUrl: m.folderUrl } : await getItem(c.id); window.open(it.webUrl, '_blank'); } catch (er) { toast(er.message); } }
  else if (a === 'mkstd') { try { await makeFolder(m.folderId, el.dataset.n); toast('Created ' + el.dataset.n); loadFolder(); } catch (er) { toast(er.message); } }
});
document.addEventListener('change', e => { if (e.target.dataset?.act === 'upload') handleUpload(e.target); });

/* Link matters that were loaded with a folder location (linkPath) to the folder's permanent OneDrive ID. */
let linking = false;
async function resolveLinks() {
  if (linking || !S.account || !navigator.onLine) return;
  const todo = live().filter(m => m.linkPath && (!m.folderId || m.relink));
  if (!todo.length) return;
  linking = true;
  for (const m of todo) {
    try {
      const it = await getItem(drivePath(m.linkPath));
      change(() => { Object.assign(m, { folderId: it.id, folderName: it.name, folderPath: itemPath(it), folderUrl: it.webUrl, ownFolder: true }); delete m.linkPath; delete m.relink; delete m.linkMissing; touch(m); });
    } catch (e) { /* folder may not exist yet (still being renamed); try again later */ }
  }
  linking = false;
  if (S.tab === 'matter' && find(S.mid)?.folderId && !F.items) loadFolder();
}
setInterval(resolveLinks, 20000);
setTimeout(resolveLinks, 5000);

/* ---------- Automatic linking by diary number: a folder ending "(2024-001)" belongs to matter 2024/1 ---------- */
const tagOf = m => '(' + (+m.year ? m.year : 'OLD') + '-' + String(m.n).padStart(3, '0') + ')';
const autoTried = new Set();
async function moveDetailsFile(fromId, toId) {
  try {
    const r = await g('/me/drive/items/' + fromId + ':/' + encodeURIComponent('0 Matter details.txt'));
    if (!r.ok) return;
    const it = await r.json();
    await g('/me/drive/items/' + it.id + '?@microsoft.graph.conflictBehavior=replace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentReference: { id: toId } }) });
  } catch (e) {}
}
async function autoLink() {
  if (!S.account || !navigator.onLine || linking) return;
  for (const m of live()) {
    const tag = tagOf(m);
    if (m.noAutoLink || (m.folderName || '').endsWith(tag) || autoTried.has(m.id)) continue;
    autoTried.add(m.id);
    try {
      const q = tag.slice(1, -1);
      const r = await g("/me/drive/root/search(q='" + encodeURIComponent(q) + "')?" + SEL + '&$top=25');
      if (!r.ok) continue;
      const hit = ((await r.json()).value || []).find(i => i.folder && i.name.endsWith(tag));
      if (!hit) continue;
      const full = await getItem(hit.id);
      const oldId = m.folderId;
      change(() => { Object.assign(m, { folderId: full.id, folderName: full.name, folderPath: itemPath(full), folderUrl: full.webUrl, ownFolder: true }); delete m.linkPath; delete m.relink; m.detailsSig = ''; touch(m); });
      if (oldId && oldId !== full.id) moveDetailsFile(oldId, full.id);
    } catch (e) {}
  }
}

/* ---------- Inbox: Claude leaves small instruction files in OneDrive › Case Diary › Inbox; the app applies them,
   so nobody overwrites the diary file while the app is open. File format:
   { "changes": [ { "no": "2025/1", "set": { "caseNo": "123/2025" }, "hearing": { "date": "...", "happened": "...", "next": "...", "purpose": "...", "note": "..." } } ] } */
let inboxBusy = false;
async function processInbox() {
  if (inboxBusy || !S.account || !navigator.onLine) return;
  inboxBusy = true;
  try {
    const r = await g(drivePath(DIARY_DIR + '/Inbox') + ':/children?$select=id,name,file&$top=50');
    if (r.ok) {
      const files = ((await r.json()).value || []).filter(f => f.file && /\.json$/i.test(f.name));
      let done = null;
      for (const f of files) {
        try {
          const body = await (await g('/me/drive/items/' + f.id + '/content')).json();
          change(() => {
            for (const c of (body.changes || [])) {
              if (c.add) { if (!S.data.matters.some(x => x.no === c.add.no && !x.deleted)) S.data.matters.push(Object.assign({ id: uid(), hearings: [], created: todayIso(), u: Date.now() }, c.add)); continue; }
              let m = c.no ? live().find(x => x.no === c.no) : findByMatch(c.match);
              if (!m && c.match && c.addIfMissing && !matchHits(c.match).length) { const ys = String(c.addIfMissing.caseNo || '').match(/(?:19|20)\d{2}/g) || []; const y = +(ys.find(v => +v <= new Date().getFullYear()) || new Date().getFullYear()); m = Object.assign({ id: uid(), year: y, n: nextNumber(y), hearings: [], created: todayIso(), status: 'Pending', u: Date.now() }, c.addIfMissing); m.no = m.year + '/' + m.n; S.data.matters.push(m); }
              if (!m) continue;
              if (c.lastDate && (!m.lastDate || c.lastDate > m.lastDate)) m.lastDate = c.lastDate;
              if (c.fill) for (const [k, v] of Object.entries(c.fill)) if (!m[k]) m[k] = v;
              if (c.unhearing) m.hearings = (m.hearings || []).filter(h => !(h.date === c.unhearing.date && h.happened === c.unhearing.happened && /eCourts/.test(h.note || '')));
              if (c.lastDate) logPast(m, c.lastDate, 'from ' + (c.from || 'update'));
              if (c.set && 'nextDate' in c.set && c.set.nextDate !== m.nextDate) logListing(m, m.nextDate, c.set.nextDate, c.from || 'updated automatically');
              if (c.set) logDiff(m, { ...m }, c.set, c.from || 'automatic update');
              if (c.set) Object.assign(m, c.set);
              if (c.hearing && /^listed$/i.test(c.hearing.happened || '') && !c.hearing.next) {   // only a listing (cause list / eCourts): add it to the history; next date, item and "fixed for" stay as set
                const h = c.hearing; m.hearings = m.hearings || [];
                if (!m.hearings.some(x => x.date === h.date)) { m.hearings.push(h); m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || '')); }
                if (h.date <= todayIso() && (!m.lastDate || h.date > m.lastDate)) m.lastDate = h.date;
              } else if (c.hearing) {
                const h = c.hearing; m.hearings = m.hearings || []; const ph = m.hearings.find(x => x.date === h.date && x.happened === 'Listed'); if (ph) Object.assign(ph, h); else m.hearings.push(h); m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
                m.lastDate = h.date || m.lastDate;
                if (/dispos|decided/i.test(h.happened || '')) { m.status = h.status || 'Decided'; if (h.outcome) m.outcome = h.outcome; m.nextDate = ''; m.purpose = ''; }
                else { m.nextDate = h.next || ''; m.purpose = h.purpose || ''; m.status = /reserved/i.test(h.happened || '') ? 'Reserved' : 'Pending'; }
                m.item = h.item || ''; m.calPending = true;
              }
              if (c.history) {   // past hearings read from saved orders: added to history only, next date untouched
                m.hearings = m.hearings || [];
                for (const h of c.history) if (h.date && !m.hearings.some(x => x.date === h.date)) m.hearings.push(h);
                m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
                const last = m.hearings[m.hearings.length - 1];
                if (last && (!m.lastDate || last.date > m.lastDate)) m.lastDate = last.date;
              }
              if (c.reading) {   // a paper Claude read on the PC
                m.readings = (m.readings || []).filter(x => x.paper !== c.reading.paper || x.date !== c.reading.date);
                m.readings.unshift(Object.assign({ date: todayIso() }, c.reading)); m.readings = m.readings.slice(0, 20);
              }
              if (c.relink) { m.folderName = ''; autoTried.delete(m.id); }
              touch(m);
            }
          });
          for (const c of (body.changes || [])) if (c.reading && c.reading.request) {   // the PC has read it: file the request away
            try {
              const rq = await getItem(drivePath(DIARY_DIR + '/To read/' + c.reading.request));
              let rd; try { rd = await getItem(drivePath(DIARY_DIR + '/To read/Done')); } catch (e) { rd = await makeFolder(rq.parentReference.id, 'Done'); }
              await g('/me/drive/items/' + rq.id + '?@microsoft.graph.conflictBehavior=replace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentReference: { id: rd.id } }) });
            } catch (e) {}
          }
          if (!done) { const d = await g(drivePath(DIARY_DIR + '/Inbox/Done')); done = d.ok ? await d.json() : await makeFolder((await getItem(drivePath(DIARY_DIR + '/Inbox'))).id, 'Done'); }
          await g('/me/drive/items/' + f.id + '?@microsoft.graph.conflictBehavior=rename', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentReference: { id: done.id } }) });
          toast('Updated from Claude');
        } catch (e) { console.warn('inbox', e); }
      }
    }
  } catch (e) {}
  inboxBusy = false;
  autoLink();
}
setInterval(processInbox, 30000);
setTimeout(processInbox, 4000);

/* status and result straight from the matter page */
document.addEventListener('change', e => {
  const el = e.target.closest('[data-st]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  if (el.dataset.st === 'status') {
    const v = el.value, was = m.status;
    change(() => {
      m.status = v; if (v !== 'Decided') m.outcome = '';
      const wasOpen = isOpen(m.forum === 'Advisory' ? { forum: 'Advisory', status: was } : { status: was }); m.status = v;
      if (!isOpen(m) && wasOpen) { m.closedOn = todayIso(); m.calPending = true; }
      if (isOpen(m)) m.closedOn = '';
      touch(m);
    });
    change(() => logChange(m, 'Status: ' + (was || '—') + ' → ' + v));
    toast('Status: ' + v + (v === 'Decided' ? '. Now choose the result.' : ''), 3000);
  } else if (el.dataset.st === 'allot') {
    if (el.value === '__new') { render(); return sheetNewJunior(m); }
    const was = allotName(m); change(() => { m.allot = el.value; logChange(m, 'Allotted to: ' + was + ' → ' + allotName(m)); touch(m); });
    toast('Allotted to ' + allotName(m));
  } else if (el.dataset.st === 'forum') {
    const v = el.value;
    if (v === 'Advisory' && m.forum !== 'Advisory' && m.caseNo && !confirm('This matter has a case number. Move it to Advisory / Pre-litigation anyway?')) { render(); return; }
    change(() => {
      m.forum = v;
      if (!statusList(m).includes(m.status)) m.status = v === 'Advisory' ? 'In progress' : 'Pending';
      m.calPending = true; touch(m);
    });
    change(() => logChange(m, 'Category → ' + FORUMS[v].label));
    toast('Category: ' + FORUMS[v].label + ' · status ' + m.status, 3500);
  } else { change(() => { m.outcome = el.value; logChange(m, 'Result → ' + (el.value || '—')); touch(m); }); toast('Result: ' + (el.value || 'not set')); }
  render();
});
document.addEventListener('change', e => { if (e.target.id === 'f_status') { const w = document.getElementById('f_outwrap'); if (w) w.style.display = e.target.value === 'Decided' ? '' : 'none'; } });
document.addEventListener('change', e => {
  if (e.target.id !== 'f_forum') return;
  const st = document.getElementById('f_status'); if (!st) return;
  const list = e.target.value === 'Advisory' ? ADV_STATUSES : STATUSES, cur = st.value;
  const pick = list.includes(cur) ? cur : (e.target.value === 'Advisory' ? 'In progress' : 'Pending');
  st.innerHTML = list.map(s => `<option ${s === pick ? 'selected' : ''}>${s}</option>`).join('');
  const w = document.getElementById('f_outwrap'); if (w) w.style.display = 'none';
});
/* one-time fixes the advocate asked for in chat, applied once and remembered in the diary */
const ONE_TIME_FIXES = [
  { id: '2026-10-21-sarin-lease-advisory', find: m => /sarin/i.test((m.title || '') + ' ' + (m.clients || '')) && /lease|deed|mathura/i.test((m.title || '') + ' ' + (m.type || '') + ' ' + (m.notes || '')) && !/1431/.test(m.caseNo || ''),
    apply: m => { m.forum = 'Advisory'; m.status = 'Advice given – completed'; m.nextDate = ''; m.purpose = ''; m.closedOn = m.closedOn || todayIso(); m.calPending = true; }, label: 'Sarin lease marked Advisory · Advice given' },
  { id: '2026-10-21-saket-shankar-notice', find: m => /saket/i.test((m.title || '') + ' ' + (m.clients || '')) && /shankar|eshwar|ishwar/i.test((m.title || '') + ' ' + (m.clients || '')) && !m.caseNo,
    apply: m => { m.forum = 'Advisory'; m.status = 'Closed – notice served its purpose'; m.nextDate = ''; m.purpose = ''; m.closedOn = m.closedOn || todayIso(); m.calPending = true; }, label: 'Saket Shankar: Pre-litigation · Closed – notice served its purpose' },
];
ONE_TIME_FIXES.push({ id: '2026-10-21-omaxe-retainer', create: true,
  find: m => /omaxe/i.test((m.title || '') + ' ' + (m.clients || '')) && /rwa|association|retainer|aoa|committee|owners/i.test((m.title || '') + ' ' + (m.clients || '') + ' ' + (m.type || '')),
  base: () => ({ id: uid(), year: 2026, n: nextNumber(2026), hearings: [], created: todayIso(), title: 'Omaxe Heights Apartment Owners Association – legal retainership', clients: 'Omaxe Heights Apartment Owners Association', side: 'Legal advisor', type: 'Retainership' }),
  apply: m => { m.forum = 'Advisory'; m.status = 'Retainer – active'; m.nextDate = ''; m.purpose = ''; m.closedOn = '';
    m.retainer = Object.assign({ from: '2026-10-13', to: '2027-10-12', every: 3, amount: '25000', billed: 1 }, m.retainer || {});
    if (!+m.feeAgreed) m.feeAgreed = 100000; m.calPending = true;
    if (!/Q1 bill/.test(m.notes || '')) m.notes = ((m.notes ? m.notes + '\n' : '') + 'Retainer ₹1,00,000/year in four quarterly instalments of ₹25,000. Q1 bill SM/OMAXE/BILL/2026-27/01 dated 21.10.2026 sent on the Association\'s letter; payment being sent.'); },
  label: 'Omaxe Heights retainership: Retainer – active, Q1 bill raised' });
ONE_TIME_FIXES.push({ id: '2026-10-23-omaxe-letter-code',
  find: m => /omaxe/i.test((m.title || '') + ' ' + (m.clients || '')) && (m.type === 'Retainership' || /retainer/i.test(m.status || '')),
  apply: m => { m.clientCode = 'OMAXE-RWA'; S.data.meta = S.data.meta || {}; S.data.meta['seq:L:OMAXE-RWA:2026'] = Math.max(+S.data.meta['seq:L:OMAXE-RWA:2026'] || 0, 4); logChange(m, 'Client code set: OMAXE-RWA; letters continue from 05 (01–04 issued earlier as SM/OMAXE/RWA/2026/01–04)'); },
  label: 'Omaxe retainership: client code OMAXE-RWA, next letter no. 05' });
ONE_TIME_FIXES.push({ id: '2026-10-21-motinagar-advisory',
  find: m => /moti\s*nagar/i.test((m.title || '') + ' ' + (m.clients || '') + ' ' + (m.notes || '')) && /mutation|naam|नामान्तरण/i.test((m.title || '') + ' ' + (m.type || '') + ' ' + (m.notes || '')),
  apply: m => { m.forum = 'Advisory'; m.status = 'Advice given – completed'; if (!m.type) m.type = 'Mutation'; m.nextDate = ''; m.purpose = ''; m.closedOn = m.closedOn || todayIso(); m.calPending = true; },
  label: 'Moti Nagar mutation: Advisory · Advice given – completed' });
ONE_TIME_FIXES.push({ id: '2026-10-21-baghel-writ-308-decided',
  find: m => /baghel/i.test((m.title || '') + ' ' + (m.clients || '')) && (/9845|7303/.test(m.caseNo || '') || (/308/.test((m.crimeNo || '') + ' ' + (m.title || '') + ' ' + (m.notes || '')) && /writ|crlp|226/i.test((m.type || '') + ' ' + (m.caseNo || '') + ' ' + (m.title || '')))),
  apply: m => { m.status = 'Decided'; m.outcome = m.outcome || 'In our favour'; m.nextDate = ''; m.purpose = ''; m.item = ''; m.closedOn = m.closedOn || todayIso(); m.calPending = true;
    m.hearings = m.hearings || []; if (!m.hearings.some(h => /withdrawn/i.test(h.note || h.happened || ''))) m.hearings.push({ date: todayIso(), happened: 'Decided', note: 'Writ petition dismissed as withdrawn by the petitioner (Baghel). Folder kept with Anuj Gupta\'s matters: papers may be needed in his other cases.' });
    m.keepFolder = true; },
  label: 'Baghel writ (FIR 308): Decided · In our favour. Folder left in place.' });
/* rule: a matter with no year (for numbering) takes the year written in its case no., e.g. 2787/2024 → 2024.
   Runs whenever the app opens or syncs, for pending and decided matters alike; the year can still be edited by hand. */
const yearOfCaseNo = s => { const k = typeof caseKeyOf === 'function' ? caseKeyOf(s) : ''; const y = k ? +k.split('/')[1] : 0; return y >= 1950 && y <= new Date().getFullYear() + 1 ? y : 0; };
function fillYearsFromCaseNo() {
  const todo = live().filter(m => !+m.year && yearOfCaseNo(m.caseNo)).sort((a, b) => (+a.n || 0) - (+b.n || 0));
  if (!todo.length) return 0;
  change(() => { for (const m of todo) { const y = yearOfCaseNo(m.caseNo), was = mref(m);
    const n = nextNumber(y); m.year = y; m.n = n; m.no = y + '/' + n; logChange(m, 'Year (for numbering) taken from case no. ' + m.caseNo + ': ' + was + ' → ' + mrefBase(m)); touch(m); } });
  return todo.length;
}
function runOneTimeFixes() {
  if (!S.data || !S.account) return;
  const done = S.data.fixes || [];
  { const n = fillYearsFromCaseNo(); if (n) toast(n + ' matter' + (n > 1 ? 's' : '') + ' got the year from the case no. (new matter ref.)', 5000); }
  if (!done.includes('2026-10-22-history-backfill')) {
    let n = 0;
    change(d => {
      for (const m of live()) {
        const before = (m.hearings || []).length;
        if (m.lastDate) logPast(m, m.lastDate, 'last date (added to history)');
        if (m.nextDate && m.nextDate < todayIso()) logPast(m, m.nextDate, 'listed; outcome not yet recorded');
        if ((m.hearings || []).length !== before) { n++; touch(m); }
      }
      d.fixes = [...(d.fixes || []), '2026-10-22-history-backfill'];
    });
    if (n) toast('Hearing history filled in for ' + n + ' matter' + (n > 1 ? 's' : ''), 4000);
  }
  if (!done.includes('2026-10-24-juniors')) {
    change(d => { d.meta = d.meta || {}; const L = d.meta.juniors = d.meta.juniors || [];
      ['Jai Prakash Awasthi, Advocate', 'Izhar Ahmad, Advocate'].forEach(n => { const key = n.replace(/,?\s*advocate$/i, '').toLowerCase(); if (!L.some(j => !j.deleted && j.name.replace(/,?\s*advocate$/i, '').toLowerCase() === key)) L.push({ id: uid(), name: n, phone: '', u: Date.now() }); });
      d.fixes = [...(d.fixes || []), '2026-10-24-juniors']; });
  }
  if (!done.includes('2026-10-24-jp-awasthi')) {
    change(d => { const j = (d.meta?.juniors || []).find(x => !x.deleted && /^jai prakash awasthi\b/i.test(x.name) && !/\(jp\)/i.test(x.name));
      if (j) { j.name = 'Jai Prakash Awasthi (JP), Advocate'; j.u = Date.now(); for (const m of d.matters || []) (m.tasks || []).forEach(t => { if (t.who === j.id) t.whoName = j.name; }); }
      d.fixes = [...(d.fixes || []), '2026-10-24-jp-awasthi']; });
  }
  if (!done.includes('2026-10-24-izhar-chand')) {
    change(d => { const j = (d.meta?.juniors || []).find(x => !x.deleted && /^izhar ahmad\b/i.test(x.name) && !/chand/i.test(x.name));
      if (j) { j.name = 'Izhar Ahmad (Chand), Advocate'; j.u = Date.now(); for (const m of d.matters || []) (m.tasks || []).forEach(t => { if (t.who === j.id) t.whoName = j.name; }); }
      d.fixes = [...(d.fixes || []), '2026-10-24-izhar-chand']; });
  }
  for (const fx of ONE_TIME_FIXES) {
    if (done.includes(fx.id)) continue;
    let hits = live().filter(fx.find);
    if (!hits.length && fx.create) { const m = fx.base(); m.no = m.year + '/' + m.n; change(d => d.matters.push(m)); hits = [m]; }
    if (hits.length !== 1) continue;   // not sure which matter: leave it for the advocate
    change(d => { fx.apply(hits[0]); touch(hits[0]); d.fixes = [...(d.fixes || []), fx.id]; });
    toast(fx.label, 4000);
  }
}

/* an advisory / notice matter becomes a court case: same matter, same folder, notice stage kept in history */
function sheetToCase(m) {
  const fo = Object.entries(FORUMS).filter(([k]) => k !== 'Advisory');
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · convert to case</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="tc_form">
    <div class="field"><label for="tc_forum">FORUM</label><select class="in" id="tc_forum" name="forum">${fo.map(([k, x]) => `<option value="${k}" ${k === 'District' ? 'selected' : ''}>${x.label}</option>`).join('')}</select></div>
    <div class="field"><label for="tc_court">HON'BLE COURT</label><input class="in" id="tc_court" name="court" placeholder="e.g. CJM, Lucknow / High Court, Lucknow Bench"></div>
    <div class="two"><div class="field"><label for="tc_type">TYPE</label><input class="in" id="tc_type" name="type" list="tc_types" placeholder="e.g. Complaint, Suit, 138 NI"><datalist id="tc_types">${TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</datalist></div>
    <div class="field"><label for="tc_no">CASE NO.</label><input class="in" id="tc_no" name="caseNo" placeholder="blank if not yet filed"></div></div>
    <div class="two"><div class="field"><label for="tc_side">APPEARING FOR</label><input class="in" id="tc_side" name="side" value="${esc(m.side || '')}" placeholder="e.g. Complainant"></div>
    <div class="field"><label for="tc_next">NEXT DATE</label><input class="in" id="tc_next" name="nextDate" type="date"></div></div>
    <p class="hint">The notice stage (${esc(m.status || 'advisory')}) stays in this matter's history; the folder and fees stay as they are.</p>
    <button class="save" type="submit">Convert to case</button></form>`);
  $('#tc_form').onsubmit = e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    change(() => {
      m.prelit = { status: m.status, till: todayIso(), from: m.created || '' };
      m.hearings = m.hearings || [];
      m.hearings.push({ date: todayIso(), happened: 'Converted to case', note: 'Pre-litigation stage closed (' + (m.status || 'advisory') + '); now ' + (fd.type ? fd.type + ' ' : '') + (fd.caseNo || 'to be filed') + (fd.court ? ' before ' + fd.court : '') + '.' });
      m.forum = fd.forum; m.court = fd.court || ''; m.type = fd.type || m.type || ''; m.caseNo = fd.caseNo || ''; m.side = fd.side || m.side || '';
      m.status = fd.caseNo ? 'Pending' : 'Not filed'; m.closedOn = '';
      if (fd.nextDate) { m.nextDate = fd.nextDate; m.calPending = true; }
      touch(m);
    });
    closeSheet(); toast('Converted to a case · ' + (m.caseNo ? 'Pending' : 'Not filed'), 3500);
  };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="tocase"]'); if (el) { const m = find(el.dataset.id); if (m) sheetToCase(m); } });

/* retainership: term, bill amount, bills raised */
function retainerBox(m) {
  const r = m.retainer || {}, n = +r.billed || 0, every = +r.every || 3;
  const next = r.from ? addMonths(r.from, every * n) : '';
  return `<div class="retbox">
    <div class="two"><div class="field" style="margin:10px 0 0"><label for="rf_${m.id}">Term from</label><input class="in" type="date" id="rf_${m.id}" data-rt="from" data-id="${m.id}" value="${esc(r.from || '')}"></div>
    <div class="field" style="margin:10px 0 0"><label for="rt_${m.id}">Term to</label><input class="in" type="date" id="rt_${m.id}" data-rt="to" data-id="${m.id}" value="${esc(r.to || '')}"></div></div>
    <div class="two"><div class="field" style="margin:10px 0 0"><label for="re_${m.id}">Bill every</label><select class="in" id="re_${m.id}" data-rt="every" data-id="${m.id}">${[[1, 'Month'], [3, 'Quarter'], [6, 'Half-year'], [12, 'Year']].map(([v, l]) => `<option value="${v}" ${v === every ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field" style="margin:10px 0 0"><label for="ra_${m.id}">Each bill (₹)</label><input class="in" inputmode="numeric" id="ra_${m.id}" data-rt="amount" data-id="${m.id}" value="${esc(r.amount || '')}"></div></div>
    <p class="hint" style="margin:8px 0">${n} bill${n === 1 ? '' : 's'} raised${next && (!r.to || next <= r.to) ? ' · next bill ' + dmy(next) : ''}</p>
    ${r.from && num(r.amount) ? (() => { const fd = retainerFallenDue(m) || 0, rec = num(m.feeReceived), ni = nextInstalment(m); return `<div class="kv" style="margin:0 0 8px"><span>Fallen due so far</span><b>${rupees(fd)}</b><span>Received</span><b>${rupees(rec)}</b><span>Pending now</span><b style="color:${fd > rec ? 'var(--saffron-ink)' : 'var(--dc-ink)'}">${fd > rec ? rupees(fd - rec) : 'Nothing'}</b>${ni ? `<span>Next instalment</span><b>${rupees(num(r.amount))} on ${dmy(ni)}</b>` : ''}</div>`; })() : ''}
    <div class="two"><button class="act blue" data-act="billraised" data-id="${m.id}">Mark bill ${n + 1} raised</button>${n ? `<button class="act blue" data-act="billundo" data-id="${m.id}">Undo last</button>` : '<span></span>'}</div>
  </div>`;
}
document.addEventListener('change', e => {
  const el = e.target.closest('[data-rt]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  change(() => { m.retainer = Object.assign({}, m.retainer, { [el.dataset.rt]: el.dataset.rt === 'every' ? +el.value : el.value }); touch(m); });
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="billraised"],[data-act="billundo"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  const up = el.dataset.act === 'billraised';
  change(() => { const r = Object.assign({ every: 3 }, m.retainer); r.billed = Math.max(0, (+r.billed || 0) + (up ? 1 : -1)); m.retainer = r; touch(m); });
  toast(up ? 'Bill ' + m.retainer.billed + ' marked raised' : 'Undone');
});

/* find a matter by case number (number + year, punctuation ignored), crime number or party name */
function caseKey(s) { const d = String(s || '').match(/(\d+)\s*(?:\/|of|-)\s*(\d{2,4})/i); if (!d) return ''; let y = d[2]; if (y.length === 2) y = '20' + y; return (+d[1]) + '/' + y; }
function findByMatch(mt) { const h = matchHits(mt); return h.length === 1 ? h[0] : null; }
function matchHits(mt) {
  if (!mt) return [];
  const all = live();
  const party = mt.party ? new RegExp(mt.party, 'i') : null;
  let hits = [];
  if (mt.caseNo || mt.caseNos) { const ks = [mt.caseNo, ...(mt.caseNos || [])].filter(Boolean).map(caseKey).filter(Boolean); hits = all.filter(m => ks.includes(caseKey(m.caseNo))); }
  if (mt.forum) hits = hits.filter(m => !m.forum || m.forum === mt.forum);
  if (mt.cnr) { const c = all.filter(m => m.cnr === mt.cnr); if (c.length) hits = c; }
  if (hits.length > 1 && party) hits = hits.filter(m => party.test((m.title || '') + ' ' + (m.clients || '')));
  if (!hits.length && mt.crimeNo) { const k = caseKey(mt.crimeNo); hits = all.filter(m => k && caseKey(m.crimeNo) === k && (!party || party.test((m.title || '') + ' ' + (m.clients || '')))); }
  if (!hits.length && mt.party && mt.partyOnly) hits = all.filter(m => party.test((m.title || '') + ' ' + (m.clients || '') + ' ' + (m.court || '')) && isOpen(m));
  if (mt.kind) { const kr = new RegExp(mt.kind, 'i'); hits = hits.filter(m => kr.test((m.type || '') + ' ' + (m.title || '') + ' ' + (m.caseNo || ''))); }
  return hits;
}

/* a listed date has passed and nothing was recorded for it */
function pendingOutcome(m) {
  if (!m.nextDate || m.nextDate >= todayIso() || !isOpen(m) || m.forum === 'Advisory') return false;
  return !(m.hearings || []).some(h => h.date === m.nextDate && h.happened !== 'Listed');
}
/* edit one entry of Hearing history */
function sheetHearing(m, i) {
  const h = m.hearings[i]; if (!h) return;
  const st = { happened: h.happened || 'Listed' };
  const draw = () => openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · hearing history</small><h1>${dmy(h.date)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="hform" class="grp" style="gap:12px">
      <div class="field"><label for="h_date">DATE OF LISTING</label><input class="in" type="date" id="h_date" name="date" value="${esc(h.date || '')}"></div>
      <div class="field"><label>WHAT HAPPENED</label><div class="chips">${['Listed', ...HAPPENED].map(x => `<button type="button" class="chip ${st.happened === x ? 'on' : ''}" data-hh="${x}">${x}</button>`).join('')}</div></div>
      <div class="two"><div class="field"><label for="h_next">NEXT DATE GIVEN</label><input class="in" type="date" id="h_next" name="next" value="${esc(h.next || '')}"></div><div class="field"><label for="h_item">ITEM</label><input class="in" id="h_item" name="item" value="${esc(h.item || '')}"></div></div>
      <div class="field"><label for="h_purpose">FIXED FOR</label><input class="in" id="h_purpose" name="purpose" list="h_fixed" value="${esc(h.purpose || '')}"><datalist id="h_fixed">${FIXED_FOR.map(x => `<option>${x}</option>`).join('')}</datalist></div>
      <div class="field"><label for="h_note">NOTE</label><textarea class="in" id="h_note" name="note">${esc(h.note || '')}</textarea></div>
      <button class="save" type="submit">Save</button>
      <button type="button" class="ghost" data-hdel="1" style="color:var(--red)">Remove this entry</button>
    </form>`);
  draw();
  const root = $('#sheet-root');
  const keep = () => Object.fromEntries(new FormData($('#hform')).entries());
  const bind = () => { $('#hform').onsubmit = e => {
    e.preventDefault();
    const fd = keep();
    const latest = m.hearings.reduce((a, b) => (b.date || '') > (a.date || '') ? b : a, m.hearings[0]) === h;
    change(() => {
      const was = dmy(h.date) + ' ' + (h.happened || '') + (h.next ? ' → ' + dmy(h.next) : '');
      Object.assign(h, { date: fd.date || h.date, happened: st.happened, next: fd.next || '', item: fd.item || '', purpose: fd.purpose || '', note: fd.note || '', edited: todayIso() });
      m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
      logChange(m, 'History entry edited: ' + was + ' → ' + dmy(h.date) + ' ' + h.happened + (h.next ? ' → ' + dmy(h.next) : ''));
      if (latest && h.next && h.next !== m.nextDate && h.next >= todayIso()) { logChange(m, 'Next date: ' + (m.nextDate ? dmy(m.nextDate) : '—') + ' → ' + dmy(h.next) + ' (from history)'); m.nextDate = h.next; m.purpose = h.purpose || m.purpose; m.item = h.item || ''; m.calPending = true; }
      touch(m);
    });
    root.onclick = null; closeSheet(); toast('History updated');
  }; };
  bind();
  root.onclick = e => {
    const b = e.target.closest('[data-hh]');
    if (b) { const v = keep(); st.happened = b.dataset.hh; draw(); Object.entries({ h_date: v.date, h_next: v.next, h_item: v.item, h_purpose: v.purpose, h_note: v.note }).forEach(([id, val]) => { const el = $('#' + id); if (el && val != null) el.value = val; }); bind(); return; }
    if (e.target.closest('[data-hdel]') && confirm('Remove the entry of ' + dmy(h.date) + ' from history?')) {
      change(() => { logChange(m, 'History entry removed: ' + dmy(h.date) + ' ' + (h.happened || '')); m.hearings.splice(m.hearings.indexOf(h), 1); touch(m); });
      root.onclick = null; closeSheet(); toast('Removed');
    }
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="hedit"],[data-act="outcome"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  if (el.dataset.act === 'hedit') sheetHearing(m, +el.dataset.i);
  else sheetRecord(m, { happened: el.dataset.v, heardOn: m.nextDate });
});

document.addEventListener('click', e => { const el = e.target.closest('[data-act="copycnr"]'); if (!el) return; (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.v) : Promise.reject()).then(() => toast('CNR copied — paste it in the eCourts app'), () => toast(el.dataset.v)); });
