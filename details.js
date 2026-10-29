/* Details read from a matter's papers (by Claude on the computer, sent through Case Diary › Inbox as {"no", "details": {...}}).
   Blanks are filled at once; where SM Chambers already has something different, the difference waits on the matter
   (m.detailDiffs) until the advocate accepts or keeps each one. Nothing is overwritten without his say. */
'use strict';

const DT_MATTER = { pet: 'Petitioners / applicants', opp: 'Respondents / opposite side', caseNo: 'Case no.', type: 'Type', court: "Hon'ble Court", courtNo: 'Court no.',
  crimeNo: 'Crime / FIR no.', ps: 'Police station', district: 'District', sections: 'Under section(s)', nature: 'Nature', side: 'Appearing for', cnr: 'CNR no.', filingNo: 'Filing no.', title: 'Parties (title)' };
const DT_CLIENT = { rel: 'S/o, D/o, W/o', relName: "Father's / husband's name", age: 'Age', address: 'Address', phone: 'Mobile', email: 'Email' };
const dtSame = (a, b) => String(a || '').replace(/\s+/g, ' ').trim().toLowerCase() === String(b || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* called inside change() by the Inbox reader */
function applyDetails(m, det, d) {
  const diffs = [], src = det.from || 'papers';
  for (const [k, v0] of Object.entries(det.matter || {})) {
    if (!(k in DT_MATTER) || v0 == null || String(v0).trim() === '') continue;
    const v = String(v0).trim();
    if (!String(m[k] || '').trim()) { m[k] = v; logChange(m, DT_MATTER[k] + ': — → ' + v.replace(/\n/g, '; ') + ' (read from ' + src + ')'); }
    else if (!dtSame(m[k], v)) diffs.push({ where: 'matter', k, label: DT_MATTER[k], now: m[k], read: v });
  }
  d.meta = d.meta || {};
  for (const c of (det.clients || [])) {
    const name = String(c.name || '').trim(); if (!name) continue;
    const key = clientKey(name), info = Object.assign({}, (d.meta.clientInfo || {})[key]);
    if (!(d.meta.clientInfo || {})[key] && !live().some(x => clientKey(x.clients) === key)) d.meta.clientList = Object.assign({}, d.meta.clientList, { [key]: { name, added: todayIso() } });
    for (const [k, v0] of Object.entries(c)) {
      if (!(k in DT_CLIENT) || v0 == null || String(v0).trim() === '') continue;
      if ((k === 'rel' || k === 'relName' || k === 'age') && isFirm(name)) continue;
      const v = k === 'age' ? String(num(v0) || '') : String(v0).trim(); if (!v) continue;
      if (!String(info[k] || '').trim()) { info[k] = v; logChange(m, 'Client ' + name + ' · ' + DT_CLIENT[k] + ': ' + v.replace(/\n/g, ', ') + ' (read from ' + src + ')'); }
      else if (!dtSame(info[k], v)) diffs.push({ where: 'client', name, k, label: name + ' · ' + DT_CLIENT[k], now: info[k], read: v });
    }
    d.meta.clientInfo = Object.assign({}, d.meta.clientInfo, { [key]: info });
  }
  if (det.notes) m.readNotes = String(det.notes).trim();
  m.detailDiffs = diffs.length ? diffs.map(x => ({ ...x, from: src, on: todayIso() })) : undefined;
  if (!diffs.length) delete m.detailDiffs;
}

/* the differences waiting, for Today and the matter page */
const dtWaiting = () => live().filter(m => (m.detailDiffs || []).length);
function detailsToday() {
  const ms = dtWaiting(); if (!ms.length) return '';
  const n = ms.reduce((s, m) => s + m.detailDiffs.length, 0);
  return `<button class="card row" data-act="dtcheck" style="border:2px solid var(--saffron-ink);box-shadow:none;margin-bottom:10px"><span class="m-col"><span class="m-title">Details read from papers · ${n} to check</span><span class="m-meta">${ms.map(m => esc(mref(m))).join(' · ')} — different from what SM Chambers has</span></span><b style="color:var(--saffron-ink)">Check ›</b></button>`;
}
function sheetDetailDiffs(id) {
  const ms = id ? [find(id)].filter(Boolean) : dtWaiting(); if (!ms.length) return closeSheet();
  const show = v => esc(String(v || '—')).replace(/\n/g, '<br>');
  openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">Read from the papers</small><h1>Check the differences</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint" style="margin:0 0 8px">Blank details were filled in already. These differ from what SM Chambers has — choose which to keep.</p>
    ${ms.map(m => `<div class="grp"><span class="lbl">${esc(mref(m))} · ${esc(m.title || m.clients || '')}</span>${m.detailDiffs.map((x, i) => `<div class="card" style="box-shadow:none;border:2px solid var(--line);padding:12px;display:grid;gap:6px">
        <b>${esc(x.label)}</b><div class="kv" style="margin:0"><span>Now</span><b>${show(x.now)}</b><span>Papers</span><b style="color:var(--saffron-ink)">${show(x.read)}</b></div>
        <div class="two"><button class="act primary" data-dt="take" data-id="${m.id}" data-i="${i}" style="min-height:40px">Use papers</button><button class="ghost" data-dt="keep" data-id="${m.id}" data-i="${i}" style="margin:0;min-height:40px">Keep now</button></div></div>`).join('')}</div>`).join('')}
    <div class="two" style="margin-top:10px"><button class="save" data-dt="takeall" style="margin:0">Use papers for all</button><button class="ghost" data-dt="keepall" style="margin:0">Keep all as now</button></div>`);
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-dt]'); if (!b) return;
    const all = b.dataset.dt.endsWith('all'), take = b.dataset.dt.startsWith('take');
    change(d => {
      const list = all ? ms.flatMap(m => (m.detailDiffs || []).map(x => [m, x])) : (() => { const m = find(b.dataset.id); return [[m, m.detailDiffs[+b.dataset.i]]]; })();
      for (const [m, x] of list) {
        if (take) {
          if (x.where === 'matter') { logChange(m, x.label + ': ' + String(x.now).replace(/\n/g, '; ') + ' → ' + String(x.read).replace(/\n/g, '; ') + ' (from ' + x.from + ')'); m[x.k] = x.read; }
          else { const key = clientKey(x.name); d.meta.clientInfo = Object.assign({}, d.meta.clientInfo, { [key]: Object.assign({}, (d.meta.clientInfo || {})[key], { [x.k]: x.read }) }); logChange(m, x.label + ': ' + x.now + ' → ' + x.read + ' (from ' + x.from + ')'); }
        }
        m.detailDiffs = m.detailDiffs.filter(y => y !== x); if (!m.detailDiffs.length) delete m.detailDiffs;
        touch(m);
      }
    });
    if (typeof render === 'function') render();
    dtWaiting().some(m => !id || m.id === id) ? sheetDetailDiffs(id) : (closeSheet(), toast('Done'));
  };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act="dtcheck"]'); if (b) sheetDetailDiffs(b.dataset.id); });
