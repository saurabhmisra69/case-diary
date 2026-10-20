/* Case Diary — Step 4: sorting the old folders.
   Reads decisions from OneDrive › Case Diary › Folder Sorting Sheet.xlsx and moves items
   25 at a time, only after the advocate taps Approve. Every move is logged to
   Folder Moves Log.xlsx. Nothing is ever deleted. */
'use strict';

const SORT_SHEET = DIARY_DIR + '/Folder Sorting Sheet.xlsx';
const MOVES_JSON = DIARY_DIR + '/folder-moves-log.json';
const MOVES_XLSX = DIARY_DIR + '/Folder Moves Log.xlsx';
const BATCH = 25;
const SO = { loaded: false, loading: false, err: '', plan: [], log: [], running: false, cur: null };

async function downloadPath(p) {
  const r = await g(drivePath(p) + ':/content');
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('OneDrive ' + r.status);
  return r.arrayBuffer();
}
async function loadSort() {
  SO.loading = true; SO.err = ''; render();
  try {
    if (!window.XLSX) throw new Error('Excel reader still loading; try again');
    const buf = await downloadPath(SORT_SHEET);
    if (!buf) throw new Error('Folder Sorting Sheet.xlsx not found in OneDrive › Case Diary');
    const wb = XLSX.read(buf, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sorting sheet'], { defval: '' });
    SO.plan = rows.filter(r => String(r['Decision']).trim().toLowerCase() === 'agree' && r['Target folder (for the diary)'])
      .map(r => ({ no: r['No.'], cur: String(r['Current place']), kind: r['Kind'], group: r['Group'], target: String(r['Target folder (for the diary)']), name: String(r['Final name (for the diary)'] || String(r['Current place']).split('\\').pop()) }));
    // folders inside "2026 Case Folder" first, so their parent is emptied before anything else
    SO.plan.sort((a, b) => (b.cur.includes('\\') - a.cur.includes('\\')) || (a.no - b.no));
    const lj = await downloadPath(MOVES_JSON);
    SO.log = lj ? JSON.parse(new TextDecoder().decode(lj)) : [];
    SO.loaded = true;
  } catch (e) { SO.err = e.message; }
  SO.loading = false; render();
}
const isDone = it => SO.log.some(l => l.item === it.cur && (l.result === 'Moved' || l.result === 'Already in place' || l.result.startsWith('Not found') || l.result.startsWith('Left as is') || l.result === 'Failed (400)'));
const pending = () => SO.plan.filter(it => !isDone(it));
const dest = it => (it.target === '(top level)' ? CASE_ROOT : CASE_ROOT + '\\' + it.target) + '\\' + it.name;

async function ensureFolderPath(rel) {
  const root = await caseRoot(); if (!rel || rel === '(top level)') return root.id;
  let parent = root.id;
  for (const part of rel.split('\\').filter(Boolean)) parent = (await makeFolder(parent, part)).id;
  return parent;
}
async function moveOne(it) {
  const srcPath = CASE_ROOT + '/' + it.cur.replace(/\\/g, '/');
  let src;
  try { src = await getItem(drivePath(srcPath)); }
  catch (e) {
    try { await getItem(drivePath(dest(it).replace(/\\/g, '/'))); return 'Already in place'; } catch (_) {}
    return 'Not found (left alone)';
  }
  const tid = await ensureFolderPath(it.target);
  for (const nm of [it.name, it.name + ' (2)']) {
    const r = await g('/me/drive/items/' + src.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentReference: { id: tid }, name: nm, '@microsoft.graph.conflictBehavior': 'fail' }) });
    if (r.ok) return nm === it.name ? 'Moved' : 'Moved';
    if (r.status !== 409) return 'Failed (' + r.status + ')';
  }
  return 'Failed (name already taken)';
}
async function saveLog() {
  await g(drivePath(MOVES_JSON) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(SO.log, null, 1) });
  if (!window.XLSX) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(SO.log.map(l => ({ 'Date and time': l.at, 'Item': l.item, 'From': l.from, 'To': l.to, 'Result': l.result }))), 'Moves');
  await g(drivePath(MOVES_XLSX) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) });
}
async function runBatch() {
  if (SO.running) return;
  const batch = pending().slice(0, BATCH); if (!batch.length) return;
  SO.running = true; SO.results = []; render();
  for (const it of batch) {
    SO.cur = it.cur; render();
    let res; try { res = await moveOne(it); } catch (e) { res = 'Failed (' + e.message + ')'; }
    const at = new Date().toLocaleString('en-GB');
    SO.log.push({ at, item: it.cur, from: CASE_ROOT + '\\' + it.cur, to: dest(it), result: res });
    SO.results.push({ it, res });
  }
  SO.cur = null;
  try { await saveLog(); } catch (e) { toast('Moves done, but the log could not be saved: ' + e.message); }
  SO.running = false; render();
  const ok = SO.results.filter(r => r.res === 'Moved').length;
  toast(ok + ' of ' + batch.length + ' moved. Log saved.');
}

VIEWS.sort = function () {
  if (!SO.loaded && !SO.loading && !SO.err) setTimeout(loadSort, 0);
  const head = pageHead('Sort old folders');
  if (SO.loading || (!SO.loaded && !SO.err)) return head + '<main><div class="card empty">Reading Folder Sorting Sheet…</div></main>';
  if (SO.err) return head + `<main><div class="card empty">${esc(SO.err)}<br><button class="linkbtn" data-act="sortreload">Try again</button></div></main>`;
  const pend = pending(), done = SO.plan.length - pend.length, next = pend.slice(0, BATCH);
  const problems = SO.log.filter((l, i) => /^(Failed|Not found)/.test(l.result) && !SO.log.some((k, j) => k.item === l.item && (j > i || k.result === 'Moved' || k.result.startsWith('Left as is'))));
  const where = it => it.target === '(top level)' ? (it.name !== it.cur.split('\\').pop() ? 'rename → ' + it.name : 'top level') : it.target + (it.name !== it.cur.split('\\').pop() ? ' · as ' + it.name : '');
  return head + `<main class="lim-main">
    <section class="card grp" style="gap:10px">
      <div class="kv"><span>Planned moves</span><b>${SO.plan.length}</b><span>Done</span><b style="color:var(--dc-ink)">${done}</b><span>Remaining</span><b>${pend.length}</b>${problems.length ? `<span>Not moved</span><b style="color:var(--red)">${problems.length}</b>` : ''}</div>
      <div style="height:10px;border-radius:99px;background:var(--chip);overflow:hidden"><div style="height:100%;width:${SO.plan.length ? Math.round(done / SO.plan.length * 100) : 0}%;background:var(--dc)"></div></div>
      <p class="hint" style="margin:0">From OneDrive › Case Diary › Folder Sorting Sheet.xlsx. Only rows marked <b>Agree</b> are moved. Nothing is deleted. Every move is written to Folder Moves Log.xlsx.</p>
      <button class="linkbtn" data-act="sortreload" style="align-self:flex-start">Read the sheet again</button>
      ${SO.results && SO.results.length ? `<div class="grp"><span class="lbl">Last batch</span><div class="hist">${SO.results.map(r => `<div><b style="color:${r.res === 'Moved' || r.res === 'Already in place' ? 'var(--dc-ink)' : 'var(--red)'};font-family:inherit">${esc(r.res)}</b><span>${esc(r.it.cur)}</span></div>`).join('')}</div></div>` : ''}
    </section>
    <section class="card grp" style="gap:10px">
      ${next.length ? `<span class="lbl">Next ${next.length} moves</span>
        <div class="hist">${next.map(it => `<div><b style="font-family:inherit;font-size:12px;color:${SO.cur === it.cur ? 'var(--saffron-ink)' : 'var(--muted)'}">${SO.cur === it.cur ? 'Moving…' : esc(it.group)}</b><span><b style="font-family:inherit">${esc(it.cur)}</b><br><span style="color:var(--muted)">→ ${esc(where(it))}</span></span></div>`).join('')}</div>
        <button class="save" data-act="sortrun" ${SO.running ? 'disabled' : ''}>${SO.running ? 'Moving… please keep this open' : 'Approve and move these ' + next.length}</button>`
      : `<p class="empty" style="color:var(--dc-ink);font-weight:700">All planned moves are done.</p>`}
      ${problems.length ? `<span class="lbl">Not moved (left where they were)</span><div class="hist">${problems.map(l => `<div><b style="font-family:inherit;color:var(--red)">${esc(l.result)}</b><span>${esc(l.item)}</span></div>`).join('')}</div>` : ''}
    </section>
  </main>`;
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'sortreload') { SO.loaded = false; SO.err = ''; SO.results = []; loadSort(); }
  if (el.dataset.act === 'sortrun') runBatch();
});
