/* SM Chambers — after a matter is decided (or otherwise closed).
   1. Next date and purpose vanish: a closed matter keeps no next date, purpose or item no. (the old date stays in its history).
   2. Further action: Yes (which — appeal, revision, review, execution … — by when, a note, done or not) or No.
      Shown in the bold facts on every card and the matter page; "Further action" filter on the Matters page. */
'use strict';
const FURTHER_OPTS = ['Appeal', 'Revision', 'Review / recall application', 'Restoration application', 'Writ petition', 'SLP – Supreme Court', 'Execution', 'Certified copy / compliance', 'Fresh suit / complaint', 'Other'];
const furtherOf = m => m && m.further && m.further.need ? m.further : null;
const furtherPending = m => !!(m && !isOpen(m) && furtherOf(m) && m.further.need === 'yes' && !m.further.done);

/* 1. closed matters lose the next date, purpose and item no. — runs when the app opens or syncs */
function clearClosedDates() {
  const hit = live().filter(m => !isOpen(m) && (m.nextDate || m.purpose || m.item || m.unlisted));
  if (!hit.length) return 0;
  change(() => { for (const m of hit) {
    if (m.nextDate || m.purpose) logChange(m, 'Matter ' + (m.status || 'closed') + ': next date ' + (m.nextDate ? dmy(m.nextDate) : '—') + (m.purpose ? ' (' + m.purpose + ')' : '') + ' removed');
    m.nextDate = ''; m.purpose = ''; m.item = ''; m.unlisted = false; touch(m);
  } });
  return hit.length;
}

/* the facts rows for a closed matter, in place of Next date / Purpose */
function closedRows(m, full) {
  const f = furtherOf(m), res = m.status === 'Decided' ? (m.outcome ? 'Decided – ' + m.outcome : 'Decided') : (m.status || 'Closed');
  const fx = !f ? `<i class="fx-none" style="color:var(--red-ink)">not entered</i>`
    : f.need === 'no' ? 'No'
    : `<span class="fx-fa${f.done ? ' done' : ''}">Yes – ${esc(f.what || 'to decide')}${f.by ? ' · by ' + dmy(f.by) : ''}${f.done ? ' · done' : ''}</span>${f.note ? `<small class="fx-fa-note">${esc(f.note)}</small>` : ''}`;
  const dd = m.decidedOn || m.closedOn, lbl = m.status === 'Decided' ? 'Date of decision' : 'Date closed';
  return `<dt>Result</dt><dd>${esc(res)}</dd>
      <dt>${lbl}</dt><dd>${dd ? `<b class="fx-dod">${DOWL[parseIso(dd).getDay()].slice(0, 3)}, ${dmy(dd)}</b>` : '<i class="fx-none" style="color:var(--red-ink)">not entered</i>'} <button class="fx-edit" data-act="dodset" data-id="${m.id}">${dd ? 'Correct' : 'Enter'}</button></dd>
      <dt>Further action</dt><dd>${fx} ${m.forum === 'Advisory' && !full ? '' : `<button class="fx-edit" data-act="further" data-id="${m.id}">${f ? 'Change' : 'Enter'}</button>`}</dd>`;
}

function sheetFurther(m) {
  const f = m.further || {};
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · ${esc(m.status || 'Closed')}${m.outcome ? ' – ' + esc(m.outcome) : ''}</small><h1>Further action?</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint" style="margin:0 0 10px">${esc(m.title || m.clients || '')}</p>
    <div class="two"><button type="button" class="act ${f.need === 'yes' ? 'primary' : 'blue'}" data-fa="yes" style="min-height:52px;font-size:16px">Yes</button><button type="button" class="act ${f.need === 'no' ? 'primary' : 'blue'}" data-fa="no" style="min-height:52px;font-size:16px">No</button></div>
    <div id="fa_box" class="grp" style="gap:12px;${f.need === 'yes' ? '' : 'display:none'}">
      <div class="field"><label for="fa_what">Which action</label><select class="in" id="fa_what"><option value="">Choose…</option>${FURTHER_OPTS.map(o => `<option ${o === f.what ? 'selected' : ''}>${o}</option>`).join('')}${f.what && !FURTHER_OPTS.includes(f.what) ? `<option selected>${esc(f.what)}</option>` : ''}</select></div>
      <div class="field"><label for="fa_by">By (last date) <small>(optional)</small></label><input class="in" id="fa_by" type="date" value="${esc(f.by || '')}"></div>
      <div class="field"><label for="fa_note">Note <small>(optional${f.what === 'Other' ? '' : ''})</small></label><input class="in" id="fa_note" value="${esc(f.note || '')}" placeholder="e.g. client to decide after reading the judgment"></div>
      <div class="toggles"><label><span>Done</span><input type="checkbox" id="fa_done" ${f.done ? 'checked' : ''}></label></div>
    </div>
    <button class="save" id="fa_save" style="margin-top:14px">Save</button>`);
  let need = f.need || '';
  const pick = v => { need = v; document.querySelectorAll('[data-fa]').forEach(b => { b.classList.toggle('primary', b.dataset.fa === v); b.classList.toggle('blue', b.dataset.fa !== v); }); $('#fa_box').style.display = v === 'yes' ? '' : 'none'; };
  document.querySelectorAll('[data-fa]').forEach(b => b.onclick = () => pick(b.dataset.fa));
  $('#fa_save').onclick = () => {
    if (!need) return toast('Choose Yes or No');
    const v = need === 'no' ? { need: 'no' } : { need: 'yes', what: $('#fa_what').value, by: $('#fa_by').value, note: $('#fa_note').value.trim(), done: $('#fa_done').checked ? (f.done || todayIso()) : '' };
    if (need === 'yes' && !v.what) return toast('Choose which action');
    if (need === 'yes' && v.what === 'Other' && !v.note) return toast('Write in the note what the other action is');
    change(() => { m.further = v; logChange(m, 'Further action: ' + (need === 'no' ? 'No' : 'Yes – ' + v.what + (v.by ? ' by ' + dmy(v.by) : '') + (v.done ? ' (done)' : ''))); touch(m); });
    closeSheet(); toast('Further action: ' + (need === 'no' ? 'No' : v.what)); if (typeof render === 'function') render();
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="further"]'); if (!el) return;
  e.stopPropagation(); const m = find(el.dataset.id); if (m) sheetFurther(m);
}, true);

/* date of decision: set on the day the status was changed; correct it to the actual date of the order */
function sheetDecisionDate(m) {
  const dd = m.decidedOn || m.closedOn || todayIso(), lbl = m.status === 'Decided' ? 'Date of decision' : 'Date closed';
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · ${esc(m.status || 'Closed')}${m.outcome ? ' – ' + esc(m.outcome) : ''}</small><h1>${lbl}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="field"><label for="dod_d">Date of the order / judgment</label><input class="in" id="dod_d" type="date" value="${dd}" max="${todayIso()}"></div>
    <button class="save" id="dod_save" style="margin-top:14px">Save</button>`);
  $('#dod_save').onclick = () => {
    const d = $('#dod_d').value; if (!d) return toast('Choose the date');
    const had = m.decidedOn || m.closedOn;
    change(() => { m.decidedOn = d; m.closedOn = d; logChange(m, lbl + ': ' + (had && had !== d ? dmy(had) + ' → ' : '') + dmy(d)); touch(m); });
    closeSheet(); toast(lbl + ' ' + dmy(d)); if (typeof render === 'function') render();
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="dodset"]'); if (!el) return;
  e.stopPropagation(); const m = find(el.dataset.id); if (m) sheetDecisionDate(m);
}, true);
