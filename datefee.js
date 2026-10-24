/* SM Chambers — date fees: a fixed charge per date (appearance), besides the professional fee for preparing / drafting the case.
   Every listed date in the matter's history counts by itself, from the "charge from" date; a single date can be waived.
   Bills show two heads (professional fees; date fees with the dates listed); receipts split the payment under both heads. */
'use strict';

const NOT_A_DATE = ['Filed', 'Converted to case'];
const dateFeeRate = m => num(m && m.dateFee);
function dateFeeAllDates(m) {   // every listed date up to today, from the charge-from date
  if (!dateFeeRate(m)) return [];
  const from = m.dateFeeFrom || '', t = todayIso();
  return [...new Set((m.hearings || []).filter(h => h.date && !NOT_A_DATE.includes(h.happened) && h.date <= t && h.date >= from).map(h => h.date))].sort();
}
const dateFeeDates = m => { const w = new Set(m.dateFeeWaive || []); return dateFeeAllDates(m).filter(d => !w.has(d)); };
const dateFeeTotal = m => dateFeeDates(m).length * dateFeeRate(m);
const dateFeePaid = m => (m.payments || []).filter(p => !p.deleted).reduce((s, p) => s + num(p.dateFee), 0);
const billedDates = m => new Set((m.bills || []).filter(b => !b.state).flatMap(b => (b.items || []).flatMap(it => it.dates || [])));
const unbilledDates = m => { const B = billedDates(m); return dateFeeDates(m).filter(d => !B.has(d)); };
const dmyShort = d => dmy(d);
function dateFeeLine(m, dates) {
  const r = dateFeeRate(m);
  return { kind: 'date', dates: dates.slice(), amt: dates.length * r, d: 'Date fees — ' + dates.length + ' date' + (dates.length > 1 ? 's' : '') + ' (' + dates.map(dmyShort).join(', ') + ') @ ₹' + r.toLocaleString('en-IN') + ' per date' };
}
/* professional fees not yet put in a bill */
function profUnbilled(m) {
  const billedProf = (m.bills || []).filter(b => !b.state).reduce((s, b) => s + (b.items || []).filter(it => it.kind !== 'date').reduce((t, it) => t + num(it.amt), 0), 0);
  return Math.max(0, num(m.feeAgreed) - billedProf);
}
/* the opening lines of a new bill: the two heads */
function defaultBillItems(m) {
  const items = [], pu = profUnbilled(m), ud = unbilledDates(m);
  if (pu) items.push({ kind: 'prof', d: 'Professional fees (case preparation / drafting) for ' + (m.type ? m.type + ' ' : '') + (m.caseNo || 'the above matter'), amt: pu });
  if (ud.length) items.push(dateFeeLine(m, ud));
  if (!items.length) items.push({ kind: 'prof', d: 'Professional fees (case preparation / drafting) for ' + (m.type ? m.type + ' ' : '') + (m.caseNo || 'the above matter'), amt: feeDue(m) || '' });
  return items;
}
/* the dates a payment's date-fee part covers, oldest first (after what earlier payments covered) */
function datesCoveredBy(m, p) {
  const r = dateFeeRate(m), part = num(p.dateFee); if (!r || !part) return [];
  const before = (m.payments || []).filter(q => !q.deleted && q.id !== p.id && ((q.date || '') < (p.date || '') || ((q.date || '') === (p.date || '') && (m.payments || []).indexOf(q) < (m.payments || []).indexOf(p)))).reduce((s, q) => s + num(q.dateFee), 0);
  const ds = dateFeeDates(m), a = Math.floor(before / r), b = Math.ceil((before + part) / r);
  return ds.slice(a, b);
}
/* the fees sheet section */
function dateFeeSection(m) {
  const r = dateFeeRate(m), all = dateFeeAllDates(m), w = new Set(m.dateFeeWaive || []), tot = dateFeeTotal(m), paid = dateFeePaid(m);
  return `<div class="grp"><span class="lbl">Date fees (per date / appearance)</span>
    <div class="two"><div class="field" style="margin:0"><label for="df_rate">Fee per date (₹)</label><input class="in" id="df_rate" inputmode="numeric" value="${esc(m.dateFee || '')}" placeholder="e.g. 2000"></div>
    <div class="field" style="margin:0"><label for="df_from">Charge from</label><input class="in" id="df_from" type="date" value="${esc(m.dateFeeFrom || '')}"></div></div>
    <button class="ghost" data-df="save" style="margin-top:6px">Save date fee</button>
    ${r ? `<p class="hint" style="margin:6px 0">${all.length - [...w].filter(d => all.includes(d)).length} date${all.length === 1 ? '' : 's'} charged = <b>${rupees(tot)}</b> · received towards date fees ${rupees(paid)}${unbilledDates(m).length ? ' · ' + unbilledDates(m).length + ' not yet billed' : ''}. Every listed date counts by itself; tap Waive for a date you don't charge.</p>
      ${all.length ? `<div class="hist">${all.slice().reverse().map(d => `<div><b>${dmy(d)}</b><span${w.has(d) ? ' class="voided"' : ''}>${w.has(d) ? 'waived · ' : rupees(r) + ' · '}<button class="linkbtn" data-df="${w.has(d) ? 'charge' : 'waive'}" data-d="${d}">${w.has(d) ? 'Charge it' : 'Waive'}</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No listed date yet from the charge-from date.</p>'}` : '<p class="hint" style="margin:6px 0 0">Set the fee per date to charge each listed date automatically.</p>'}</div>`;
}
function dateFeeClick(m, b, redraw) {
  const a = b.dataset.df;
  if (a === 'save') {
    const rate = num($('#df_rate').value), from = $('#df_from').value || (rate && !m.dateFeeFrom ? todayIso() : m.dateFeeFrom || '');
    change(() => { logChange(m, 'Date fee: ' + (m.dateFee ? rupees(m.dateFee) : '—') + ' → ' + (rate ? rupees(rate) + ' per date from ' + dmy(from) : '—')); m.dateFee = rate || ''; m.dateFeeFrom = rate ? from : ''; touch(m); });
    toast(rate ? 'Date fee ' + rupees(rate) + ' per date from ' + dmy(from) : 'Date fee removed'); return redraw();
  }
  if (a === 'waive' || a === 'charge') {
    const d = b.dataset.d;
    change(() => { const s = new Set(m.dateFeeWaive || []); a === 'waive' ? s.add(d) : s.delete(d); m.dateFeeWaive = [...s]; logChange(m, 'Date fee for ' + dmy(d) + (a === 'waive' ? ' waived' : ' charged again')); touch(m); });
    return redraw();
  }
}
