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

/* ---------- naming (as approved in the plan) ---------- */
function courtShort(m) {
  const c = (m.court || '').trim();
  if (m.forum === 'HC') return /allahabad/i.test(c) && !/lucknow/i.test(c) ? 'HC Allahabad' : 'HC Lucknow';
  return cleanName(c.split(/[·,]/)[0]) || forumOf(m).label;
}
function caseRef(m) {
  if (m.caseNo) return cleanName((/^(writ|wp)$/i.test(m.type) && !/^wp/i.test(m.caseNo) ? 'WP ' : '') + m.caseNo);
  const t = String(m.title || ''); const i = t.search(/\s+(v\.?|vs\.?|versus)\s+/i);
  if (i > 0) return 'vs ' + cleanName(t.slice(i).replace(/^\s+(v\.?|vs\.?|versus)\s+/i, ''));
  return '';
}
function proposedFolderName(m) {
  return cleanName([m.year + '-' + String(m.n).padStart(3, '0') + ' ' + (m.type || 'Matter'), courtShort(m), caseRef(m)].filter(Boolean).join(' – '));
}
const followsScheme = name => /^\d{4}-\d{3} /.test(name || '');

/* ---------- Matter page ---------- */
function openMatter(id) {
  const m = find(id); if (!m) return;
  if (S.tab !== 'matter') S.prevTab = S.tab;
  S.tab = 'matter'; S.mid = id; F.stack = []; F.items = null; F.err = '';
  closeSheet(); render(); scrollTo(0, 0);
  if (m.folderId) loadFolder();
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
    <div><small style="font-weight:800;opacity:.85">${esc(m.no)} · ${esc(m.court || f.label)} · ${esc(m.status)}</small><h1 style="margin-top:4px">${esc(m.title || m.clients)}</h1>
    <p class="m-meta" style="color:rgba(255,255,255,.85);margin:6px 0 0">${esc(metaLine(m))}</p></div>
    <div class="next-strip">${m.nextDate ? `<span>Next date</span><b>${DOWL[parseIso(m.nextDate).getDay()].slice(0, 3)}, ${dmy(m.nextDate)}</b>${m.purpose ? `<span>for ${esc(m.purpose)}</span>` : ''}` : `<b>${m.status === 'Pending' ? 'No next date' : esc(m.status)}</b>`}</div>
  </header>
  <main class="matter-main"><div class="mp-col">
    <div class="acts mp-acts" style="grid-template-columns:1.4fr 1fr 1fr"><button class="act primary" data-act="record" data-id="${m.id}">Next date</button><button class="act blue" data-act="edit" data-id="${m.id}">Edit</button><button class="act wa" data-act="wa" data-id="${m.id}" ${phoneDigits(m.phone) ? '' : 'disabled title="Add client mobile first"'}>${I.wa}Client</button></div>
    <section class="card mp-files" id="files">${filesInner(m)}</section>
    </div><div class="mp-col">
    <section class="card mp-details"><div class="h2" style="margin-bottom:12px"><h2>Details</h2></div>
      <div class="kv">${row('Client(s)', m.clients)}${row('Type', m.type)}${row('Case no.', m.caseNo)}${row('Crime / FIR', m.crimeNo)}${row('Police station', m.ps)}${row('Sections', m.sections)}${row('Nature', m.nature)}${row('Appearing for', m.side)}${row('Last date', dmy(m.lastDate))}${row('Item', m.item)}${row('Client mobile', m.phone)}${row('Notes', m.notes)}</div>
      ${m.deadline ? `<div class="mini ${m.deadlineDone ? '' : 'red'}"><span>${m.deadlineDone ? 'Deadline done' : 'Deadline'}</span><b>${esc(m.deadlineFor || 'Due')} · ${dmy(m.deadline)}</b>${m.deadlineDone ? '' : `<button data-act="deadlinedone" data-id="${m.id}">Mark done</button>`}</div>` : ''}
      ${m.feeAgreed || m.feeReceived ? `<div class="mini ${due ? 'saff' : 'green'}"><span>Fees</span><b>${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)} received</b>${due ? `<span>${rupees(due)} pending</span>` : '<span>Paid</span>'}</div>` : ''}
    </section>
    <section class="card mp-hist"><div class="h2" style="margin-bottom:6px"><h2>Hearing history</h2><span class="sub">${hist.length}</span></div>
      ${hist.length ? `<div class="hist">${hist.map(h => `<div><b>${dmy(h.date)}</b><span><b style="font-family:inherit">${esc(h.happened)}</b>${h.next ? ' → ' + dmy(h.next) : ''}${h.purpose ? ' · ' + esc(h.purpose) : ''}${h.note ? '<br><span style="color:var(--muted)">' + esc(h.note) + '</span>' : ''}</span></div>`).join('')}</div>` : '<p style="color:var(--muted);font-size:14px;margin:0">No hearings recorded yet. Use <b>Next date</b> after each hearing.</p>'}
    </section>
  </div></main>`;
}

function fileIcon(it) {
  if (it.folder) return ['📁', 'var(--saffron-soft)'];
  const ext = (it.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return ['PDF', '#FDE6EC'];
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return ['W', '#E7ECFF'];
  if (['xls', 'xlsx', 'csv'].includes(ext)) return ['X', '#DDF5E6'];
  if (['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext)) return ['IMG', '#F8E4FB'];
  if (['mp3', 'm4a', 'ogg', 'opus', 'wav', 'mp4'].includes(ext)) return ['▶', '#E8ECF1'];
  return [ext.slice(0, 3).toUpperCase() || '·', '#F1F3F9'];
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
  return `<div class="h2"><h2>Case folder</h2><button class="linkbtn" data-act="openweb">${I.ext} OneDrive</button></div>
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
      const d = new Date(); name = `Photo ${iso(d)} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.` + (name.split('.').pop() || 'jpg');
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
  const rows = it => `<div class="prow"><button class="frow" data-pk="into" data-fid="${it.id}" data-name="${esc(it.name)}"><span class="ficon" style="background:var(--saffron-soft)">📁</span><span class="fname">${esc(it.name)}${P.results ? `<small>${esc(itemPath(it))}</small>` : `<small>${it.folder?.childCount ?? ''} items</small>`}</span></button><button class="pick" data-pk="link" data-fid="${it.id}">Link</button></div>`;
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(m.no)} · link case folder</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
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
    change(() => { Object.assign(m, { folderId: it.id, folderName: it.name, folderPath: itemPath(it), folderUrl: it.webUrl, ownFolder: false }); touch(m); });
    const root = $('#sheet-root'); root.onclick = root.onkeydown = null;
    closeSheet(); toast('Linked to ' + it.name); F.stack = []; loadFolder();
  } catch (e) { toast('Could not link: ' + e.message); }
}

/* ---------- create a new matter folder ---------- */
async function openNewFolder() {
  const m = find(S.mid);
  const N = { parent: null, name: proposedFolderName(m), clientName: cleanName(m.clients), opts: null, busy: false };
  const draw = () => openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(m.no)} · new case folder</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="grp"><span class="lbl">1 · Client folder</span>
      ${!N.opts ? '<p class="empty">Looking for the client folder…</p>' : `<div class="flist">${N.opts.map(o => `<button class="frow ${N.parent && N.parent.key === o.key ? 'sel' : ''}" data-nf="parent" data-key="${o.key}"><span class="ficon" style="background:${o.isNew ? 'var(--dc-soft)' : 'var(--saffron-soft)'}">${o.isNew ? '+' : '📁'}</span><span class="fname">${esc(o.label)}<small>${esc(o.sub)}</small></span></button>`).join('')}</div>`}
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

/* ---------- events for this module ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, m = find(S.mid);
  if (a === 'back') { S.tab = S.prevTab || 'home'; render(); scrollTo(0, 0); }
  else if (a === 'linkfolder') openPicker();
  else if (a === 'newfolder') openNewFolder();
  else if (a === 'reloadfiles') loadFolder();
  else if (a === 'subdir') { const it = F.items.find(i => i.id === el.dataset.fid); F.stack.push({ id: it.id, name: it.name }); loadFolder(); }
  else if (a === 'crumb') { F.stack = F.stack.slice(0, +el.dataset.i + 1); loadFolder(); }
  else if (a === 'openfile') { const it = F.items.find(i => i.id === el.dataset.fid); if (it) window.open(it.webUrl, '_blank'); }
  else if (a === 'openweb') { const c = curFolder(); try { const it = c.id === m.folderId && m.folderUrl ? { webUrl: m.folderUrl } : await getItem(c.id); window.open(it.webUrl, '_blank'); } catch (er) { toast(er.message); } }
  else if (a === 'mkstd') { try { await makeFolder(m.folderId, el.dataset.n); toast('Created ' + el.dataset.n); loadFolder(); } catch (er) { toast(er.message); } }
});
document.addEventListener('change', e => { if (e.target.dataset?.act === 'upload') handleUpload(e.target); });
