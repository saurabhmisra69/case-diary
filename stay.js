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
