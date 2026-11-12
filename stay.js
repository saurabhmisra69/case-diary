/* SM Chambers — trial-court matters stayed by the High Court.
   A stayed matter takes no further dates: it leaves "Trial courts – need a date", shows STAYED in place of the next date,
   is listed under the Stayed filter and the Today button, and the High Court matter shows where its stay is operating.
   When the linked High Court matter is decided, Today asks whether the stay is over. */
'use strict';

const stayHc = m => m && m.stay && m.stay.hcId ? find(m.stay.hcId) : null;
const stayHcLabel = m => { const h = stayHc(m); return h ? caseLineOf(h) : (m.stay && m.stay.hcNo) || 'High Court'; };
function caseLineOf(m) { return (m.caseNo ? (m.type ? m.type + ' ' : '') + m.caseNo : m.type) || mref(m); }
function stayDays(m) { if (!m.stay || !m.stay.date) return ''; const d = Math.round((parseIso(todayIso()) - parseIso(m.stay.date)) / 864e5); return d >= 0 ? d : ''; }
function stayText(m) { return 'STAYED by High Court' + (m.stay.date ? ' since ' + dmy(m.stay.date) : '') + ' – ' + stayHcLabel(m); }
/* trial matters whose stay was granted in this High Court matter */
const stayedUnder = h => live().filter(m => isStayed(m) && m.stay.hcId === h.id);
/* stays whose High Court matter has been decided and not yet looked at */
const stayCheck = () => live().filter(m => isStayed(m) && !m.stay.checked && stayHc(m) && !isOpen(stayHc(m)));

function sheetStay(m) {
  if (!m) return;
  const st = m.stay && m.stay.on ? m.stay : null;
  const hcs = live().filter(x => x.forum === 'HC' && x.id !== m.id).sort((a, b) => (isOpen(b) - isOpen(a)) || (b.year - a.year) || (b.n - a.n));
  const same = x => (x.clients || '') === (m.clients || '') || (x.clientCode && x.clientCode === m.clientCode);
  const pre = st ? st.hcId : (hcs.find(x => isOpen(x) && same(x)) || {}).id || '';
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · ${esc(caseLineOf(m))}</small><h1>${st ? 'Stay by High Court' : 'Stayed by High Court'}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${st ? `<div class="picked" style="background:var(--tr-soft)"><b>${esc(stayText(m))}</b><span>${stayDays(m) !== '' ? stayDays(m) + ' days' : ''}${st.note ? ' · ' + esc(st.note) : ''}</span></div>` :
    '<p class="hint" style="margin:0 0 10px">The matter stops asking for a next date and shows STAYED until you mark the stay over.</p>'}
    <div class="field"><label for="sy_date">STAY ORDER DATE</label><input class="in" type="date" id="sy_date" value="${esc(st ? st.date : '')}"></div>
    <div class="field"><label for="sy_hc">HIGH COURT CASE IN WHICH THE STAY WAS GRANTED</label><select class="in" id="sy_hc"><option value="">Not in SM Chambers — type the number below</option>${hcs.map(x => `<option value="${x.id}" ${x.id === pre ? 'selected' : ''}>${esc(mref(x))} · ${esc(caseLineOf(x))} · ${esc((x.title || x.clients || '').slice(0, 40))}${isOpen(x) ? '' : ' (decided)'}</option>`).join('')}</select></div>
    <div class="field"><label for="sy_no">HIGH COURT CASE NO. (if not in SM Chambers)</label><input class="in" id="sy_no" value="${esc(st ? st.hcNo || '' : '')}" placeholder="e.g. 482 No. 3759/2026"></div>
    <div class="field"><label for="sy_note">NOTE</label><input class="in" id="sy_note" value="${esc(st ? st.note || '' : '')}" placeholder="e.g. further proceedings stayed"></div>
    <button class="save" id="sy_save" style="width:100%">${st ? 'Save changes' : 'Mark as stayed'}</button>
    ${st ? `<div class="grp" style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line)"><span class="lbl">Stay over?</span>
      <div class="field"><label for="sy_end">STAY VACATED / ENDED ON</label><input class="in" type="date" id="sy_end" value="${todayIso()}"></div>
      <button class="act blue" id="sy_over" style="width:100%;min-height:46px">Stay vacated / over — get the trial court date</button></div>` : ''}`);
  $('#sy_save').onclick = () => {
    const date = $('#sy_date').value, hcId = $('#sy_hc').value, hcNo = $('#sy_no').value.trim(), note = $('#sy_note').value.trim();
    if (!hcId && !hcNo) return toast('Choose the High Court case, or type its number');
    change(() => {
      const was = m.nextDate;
      m.stay = { on: true, date, hcId, hcNo: hcId ? '' : hcNo, note, since: (m.stay && m.stay.on && m.stay.since) || todayIso() };
      if (!st) {
        logChange(m, 'Stayed by High Court' + (date ? ' on ' + dmy(date) : '') + ' in ' + stayHcLabel(m) + (was ? ' (next date ' + dmy(was) + ' removed)' : ''));
        m.nextDate = ''; m.item = ''; m.unlisted = false; if (m.eventId) m.calPending = true;
      } else logChange(m, 'Stay details changed');
      touch(m);
    });
    closeSheet(); toast(st ? 'Saved' : 'Marked as stayed by the High Court'); render();
  };
  if (st) $('#sy_over').onclick = () => {
    const end = $('#sy_end').value || todayIso();
    change(() => {
      m.stayHist = m.stayHist || []; m.stayHist.push({ ...m.stay, on: false, ended: end });
      logChange(m, 'Stay over (' + dmy(end) + ') — ' + stayHcLabel(m));
      m.stay = null; m.unlisted = true; m.unlistedSince = todayIso(); m.status = 'Pending'; touch(m);
    });
    closeSheet(); toast('Stay over — the matter is back in Trial courts – need a date', 4000); render();
  };
}

/* Today: the linked High Court matter has been decided */
function stayToday() {
  const xs = stayCheck(); if (!xs.length) return '';
  return `<section class="card" style="border-left:4px solid var(--tr);padding:12px 14px"><b>Stay may have ended</b>
    ${xs.map(m => `<div style="margin-top:8px"><p class="hint" style="margin:0 0 6px">${esc(caseLineOf(stayHc(m)))} (High Court) is decided — the stay in <b>${esc(m.title || m.clients)}</b> (${esc(caseLineOf(m))}) may be over.</p>
      <div class="two"><button class="act blue" data-act="stayset" data-id="${m.id}" style="min-height:40px">Stay over — get date</button><button class="ghost" data-act="staykeep" data-id="${m.id}" style="margin:0">Stay continues</button></div></div>`).join('')}</section>`;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'stayset') sheetStay(find(el.dataset.id));
  else if (a === 'staykeep') { const m = find(el.dataset.id); if (m && m.stay) { change(() => { m.stay.checked = todayIso(); logChange(m, 'Stay continues (checked after the High Court matter was decided)'); touch(m); }); render(); } }
});

/* ---------- High Court matters: the trial court case below, and whether it is stayed ---------- */
function lowerOf(h) {
  const L = h.lower || {};
  let t = L.id ? find(L.id) : null;
  if (!t) t = live().find(m => m.stay && m.stay.on && m.stay.hcId === h.id) || null;
  const court = t ? (typeof courtFull === 'function' ? courtFull(t) : t.court) : L.court || '';
  const caseNo = t ? caseLineOf(t) : L.caseNo || '';
  let stayed = '', date = '';
  if (t) { if (isStayed(t) && t.stay.hcId === h.id) { stayed = 'yes'; date = t.stay.date || ''; } else if (L.id === t.id && L.stayed === 'no') stayed = 'no'; else if (L.id === t.id) stayed = L.stayed === 'yes' ? 'no' : (L.stayed || ''); }
  else { stayed = L.stayed || ''; date = L.date || ''; }
  return { t, court, caseNo, stayed, date, any: !!(t || L.court || L.caseNo) };
}
function lowerRows(h, full) {
  if (h.forum !== 'HC') return '';
  const lo = lowerOf(h), dash = full ? '<i class="fx-none">not entered</i>' : '<i class="fx-dash">—</i>';
  const edit = full ? ` <button class="fx-edit" data-act="lowerset" data-id="${h.id}">${lo.any ? 'Edit' : '+ Add'}</button>` : '';
  const caseHtml = lo.any ? (lo.t ? `<button class="linkbtn fx-lower" data-act="open" data-id="${lo.t.id}">${esc([lo.caseNo, lo.court].filter(Boolean).join(' · '))}</button>` : esc([lo.caseNo, lo.court].filter(Boolean).join(' · '))) : dash;
  const stayHtml = lo.stayed === 'yes' ? `<span class="fx-stay">Yes — stayed${lo.date ? ' since ' + dmy(lo.date) : ''}</span>` : lo.stayed === 'no' ? '<b>No — not stayed</b>' : lo.any ? dash : '';
  return `<dt>Trial court case</dt><dd>${caseHtml}${edit}</dd>${lo.any ? `<dt>Trial court stayed?</dt><dd>${stayHtml}</dd>` : ''}`;
}
function sheetLower(h) {
  if (!h) return;
  const L = h.lower || {}, lo = lowerOf(h);
  const digits = s => String(s || '').replace(/\D+/g, ' ').trim();
  const trials = live().filter(m => m.forum !== 'HC' && m.forum !== 'Advisory');
  const score = m => (h.crimeNo && m.crimeNo && digits(m.crimeNo) === digits(h.crimeNo) ? 4 : 0) + ((m.clients || '') === (h.clients || '') || (h.clientCode && m.clientCode === h.clientCode) ? 2 : 0) + (isOpen(m) ? 1 : 0);
  trials.sort((a, b) => score(b) - score(a) || (b.year - a.year));
  const pick = lo.t ? lo.t.id : '';   // never guessed: he chooses (likely ones are starred and listed first)
  const st = lo.stayed || '';
  openSheet(`<div class="s-head"><div><small>${esc(mref(h))} · ${esc(caseLineOf(h))}</small><h1>Trial court case</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="field"><label for="lw_id">THE TRIAL COURT CASE IN SM CHAMBERS</label><select class="in" id="lw_id"><option value="">Not in SM Chambers — type it below</option>${trials.map(m => `<option value="${m.id}" ${m.id === pick ? 'selected' : ''}>${esc(mref(m))} · ${esc(caseLineOf(m))} · ${esc((m.title || m.clients || '').slice(0, 40))}${score(m) >= 2 ? ' ★' : ''}</option>`).join('')}</select><small class="hint">★ same client or same FIR no.</small></div>
    <div id="lw_typed" style="${pick ? 'display:none' : ''}">
      <div class="field"><label for="lw_court">TRIAL COURT</label><input class="in" id="lw_court" value="${esc(L.court || '')}" placeholder="e.g. ACJM-V, Lucknow"></div>
      <div class="field"><label for="lw_no">CASE NO.</label><input class="in" id="lw_no" value="${esc(L.caseNo || '')}" placeholder="e.g. Complaint Case 4318/2021"></div></div>
    <div class="grp"><span class="lbl">Trial court proceedings stayed by the Hon'ble High Court?</span><div class="chips">${[['', 'Not known yet'], ['yes', 'Yes, stayed'], ['no', 'No']].map(([v, l]) => `<button class="chip ${st === v ? 'on' : ''}" data-lw="${v}">${l}</button>`).join('')}</div></div>
    <div class="field" id="lw_dwrap" style="${st === 'yes' ? '' : 'display:none'}"><label for="lw_date">STAY ORDER DATE</label><input class="in" type="date" id="lw_date" value="${esc(lo.date || L.date || '')}"></div>
    <button class="save" id="lw_save" style="width:100%">Save</button>`);
  let stv = st;
  const root = $('#sheet-root');
  root.onclick = e => { const b = e.target.closest('[data-lw]'); if (!b) return; stv = b.dataset.lw; root.querySelectorAll('[data-lw]').forEach(x => x.classList.toggle('on', x === b)); $('#lw_dwrap').style.display = stv === 'yes' ? '' : 'none'; };
  $('#lw_id').onchange = e => { $('#lw_typed').style.display = e.target.value ? 'none' : ''; };
  $('#lw_save').onclick = () => {
    const id = $('#lw_id').value, court = $('#lw_court').value.trim(), caseNo = $('#lw_no').value.trim(), date = $('#lw_date').value;
    if (!id && !court && !caseNo) return toast('Choose the trial court case, or type its court and number');
    const t = id ? find(id) : null;
    change(() => {
      h.lower = { id, court: id ? '' : court, caseNo: id ? '' : caseNo, stayed: stv, date: stv === 'yes' ? date : '' };
      logChange(h, 'Trial court case: ' + (t ? caseLineOf(t) : [caseNo, court].filter(Boolean).join(', ')) + (stv === 'yes' ? ' · stayed' + (date ? ' since ' + dmy(date) : '') : stv === 'no' ? ' · not stayed' : ''));
      touch(h);
      if (t) {   // keep the trial court matter in step
        const stayedHere = isStayed(t) && t.stay.hcId === h.id;
        if (stv === 'yes' && !stayedHere) {
          logChange(t, 'Stayed by High Court' + (date ? ' on ' + dmy(date) : '') + ' in ' + caseLineOf(h) + (t.nextDate ? ' (next date ' + dmy(t.nextDate) + ' removed)' : ''));
          t.stay = { on: true, date, hcId: h.id, hcNo: '', note: '', since: todayIso() }; if (t.eventId) t.calPending = true; t.nextDate = ''; t.item = ''; t.unlisted = false; touch(t);
        } else if (stv === 'yes' && stayedHere && date && t.stay.date !== date) { t.stay.date = date; touch(t); }
        else if (stv !== 'yes' && stayedHere) {
          t.stayHist = t.stayHist || []; t.stayHist.push({ ...t.stay, on: false, ended: todayIso() });
          logChange(t, 'Stay over (' + dmy(todayIso()) + ') — ' + caseLineOf(h)); t.stay = null; t.unlisted = true; t.unlistedSince = todayIso(); touch(t);
        }
      }
    });
    root.onclick = null; closeSheet(); toast('Saved'); render();
  };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="lowerset"]'); if (el) sheetLower(find(el.dataset.id)); });
