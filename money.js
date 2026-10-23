/* SM Chambers — money reports: year-end register for the CA, dues by age, junior-wise statement. */
'use strict';

const dlBlob = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
const inFy = (iso, fy) => !!iso && fyOf(iso) === fy;
function allFys() {
  const s = new Set([fyOf(todayIso())]);
  for (const m of live()) { (m.payments || []).forEach(p => p.date && s.add(fyOf(p.date))); (m.bills || []).forEach(b => b.date && s.add(fyOf(b.date))); (m.expenses || []).forEach(x => x.date && s.add(fyOf(x.date))); }
  return [...s].sort().reverse();
}
const clientOf = m => String(m.clients || m.title || '').split('\n')[0].trim();

/* ================= Year-end register for the CA ================= */
function caData(fy) {
  const ms = live().sort(byNo), P = [], B = [], R = [], E = [], X = [];
  for (const m of ms) {
    (m.payments || []).filter(p => inFy(p.date, fy)).forEach(p => P.push({ m, p }));
    (m.bills || []).filter(b => inFy(b.date, fy)).forEach(b => B.push({ m, b }));
    (m.receipts || []).filter(r => inFy(r.date, fy)).forEach(r => R.push({ m, r }));
    (typeof expList === 'function' ? expList(m) : []).filter(x => inFy(x.date, fy)).forEach(x => E.push({ m, x }));
    (m.letters || []).filter(l => l.state && inFy(l.stateOn || l.date, fy)).forEach(l => X.push({ kind: 'Letter', no: l.no, date: l.date, on: l.stateOn, state: l.state, reason: l.reason, m }));
  }
  B.filter(x => x.b.state).forEach(({ m, b }) => X.push({ kind: 'Bill', no: b.no, date: b.date, on: b.stateOn, state: b.state, reason: b.reason, by: b.by, m }));
  R.filter(x => x.r.state).forEach(({ m, r }) => X.push({ kind: 'Receipt', no: r.no, date: r.date, on: r.stateOn, state: r.state, reason: r.reason, by: r.by, m }));
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const tot = { gross: sum(P, x => gross(x.p)), net: sum(P, x => num(x.p.amount)), tds: sum(P, x => num(x.p.tds)),
    billed: sum(B.filter(x => !x.b.state), x => num(x.b.total)), expMine: sum(E.filter(x => x.x.bearer !== 'client'), x => num(x.x.amount)), expClient: sum(E.filter(x => x.x.bearer === 'client'), x => num(x.x.amount)),
    f16aMissing: P.filter(x => num(x.p.tds) && !x.p.f16a).length };
  return { P, B, R, E, X, tot };
}
const fyRange = fy => { const y = +fy.slice(0, 4); return '01.04.' + y + ' to 31.03.' + (y + 1); };
async function caRegister(fy) {
  if (!window.XLSX) return toast('Excel library still loading, try again in a moment');
  const { P, B, R, E, X: V, tot } = caData(fy), XL = window.XLSX, wb = XL.utils.book_new();
  const add = (name, rows, widths) => { const ws = XL.utils.json_to_sheet(rows.length ? rows : [{ '': 'Nothing in this year' }]); if (widths) ws['!cols'] = widths.map(w => ({ wch: w })); XL.utils.book_append_sheet(wb, ws, name); };
  const summary = [
    ['SAURABH MISRA & ASSOCIATES – CHAMBERS'], ['Professional fees register — Financial Year ' + fy + ' (' + fyRange(fy) + ')'], ['Saurabh Misra, Advocate (fees received in his own name)'], [],
    ['Gross professional fees received', tot.gross], ['   of which received in bank / cash', tot.net], ['   of which TDS deducted by clients (claim in ITR; tally with Form 168 / AIS — earlier Form 26AS)', tot.tds],
    ['TDS entries where the TDS certificate (Form 131 / earlier 16A) is still awaited', tot.f16aMissing], [],
    ['Bills raised (excluding cancelled)', tot.billed], ['Expenses borne from fees (juniors, filing, clerk…)', tot.expMine], ['Expenses incurred on behalf of clients (to recover)', tot.expClient], [],
    ['Bills: ' + B.length + ' (' + B.filter(x => x.b.state).length + ' cancelled) · Receipts: ' + R.length + ' (' + R.filter(x => x.r.state).length + ' cancelled) · Payments: ' + P.length], ['Prepared ' + dmy(todayIso()) + ' from SM Chambers. Cancelled numbers are listed in the sheet "Cancelled"; no number was reused.']];
  const ws0 = XL.utils.aoa_to_sheet(summary); ws0['!cols'] = [{ wch: 64 }, { wch: 16 }]; XL.utils.book_append_sheet(wb, ws0, 'Summary');
  add('Fees received', P.sort((a, b) => (a.p.date || '').localeCompare(b.p.date || '')).map(({ m, p }) => ({ 'Date': dmy(p.date), 'Client': clientOf(m), 'Matter Ref.': matterRef(m), 'Matter': m.title, 'Mode': p.mode, 'Received': num(p.amount), 'TDS': num(p.tds), 'Gross fee': gross(p), 'TDS certificate': num(p.tds) ? tdsCert(p.date) + ' ' + (p.f16a ? 'received' : 'awaited') : '', 'Receipt No.': p.receiptNo || '', 'Bill No.': ((m.bills || []).find(b => b.id === p.billId) || {}).no || '', 'Note': p.note })), [11, 28, 24, 36, 12, 11, 9, 11, 10, 20, 20, 24]);
  add('Bills', B.sort((a, b) => String(a.b.no).localeCompare(String(b.b.no))).map(({ m, b }) => ({ 'Bill No.': b.no, 'Date': dmy(b.date), 'Client': (b.to || clientOf(m)).split('\n')[0], 'Matter Ref.': matterRef(m), 'Amount': num(b.total), 'Received against it': b.state ? 0 : billPaid(m, b), 'Status': b.state || (billPaid(m, b) >= num(b.total) ? 'Paid' : billPaid(m, b) ? 'Part-paid' : 'Unpaid'), 'Replaces': b.replaces || '', 'Replaced by': b.by || '' })), [20, 11, 30, 24, 11, 12, 11, 20, 20]);
  add('Receipts', R.sort((a, b) => String(a.r.no).localeCompare(String(b.r.no))).map(({ m, r }) => ({ 'Receipt No.': r.no, 'Date': dmy(r.date), 'From': r.from || clientOf(m), 'Matter Ref.': matterRef(m), 'Amount': num(r.amount), 'TDS': num(r.tds), 'Bill No.': ((m.bills || []).find(b => b.id === r.billId) || {}).no || '', 'Status': r.state || 'Valid', 'Replaces': r.replaces || '' })), [20, 11, 30, 24, 11, 9, 20, 10, 20]);
  const tdsBy = {}; P.filter(x => num(x.p.tds)).forEach(({ m, p }) => { const k = clientOf(m); tdsBy[k] = tdsBy[k] || { n: 0, g: 0, t: 0, miss: 0 }; tdsBy[k].n++; tdsBy[k].g += gross(p); tdsBy[k].t += num(p.tds); if (!p.f16a) tdsBy[k].miss++; });
  add('TDS by client', Object.entries(tdsBy).map(([k, v]) => ({ 'Client (deductor)': k, 'Payments': v.n, 'Gross fee': v.g, 'TDS': v.t, 'TDS certificate awaited': v.miss })), [36, 10, 12, 10, 16]);
  add('Expenses', E.sort((a, b) => (a.x.date || '').localeCompare(b.x.date || '')).map(({ m, x }) => ({ 'Date': dmy(x.date), 'Matter Ref.': matterRef(m), 'Matter': m.title, 'Type': x.type, 'Paid to': x.to, 'Amount': num(x.amount), 'Borne by': x.bearer === 'client' ? 'Client (to recover)' : 'From my fee', 'Note': x.note })), [11, 24, 36, 26, 18, 11, 18, 24]);
  add('Cancelled', V.sort((a, b) => String(a.no).localeCompare(String(b.no))).map(v => ({ 'Document': v.kind, 'No.': v.no, 'Dated': dmy(v.date), 'Marked': v.state, 'On': dmy(v.on), 'Reason': v.reason || '', 'Replaced by': v.by || '', 'Matter Ref.': matterRef(v.m) })), [10, 30, 11, 11, 11, 30, 22, 24]);
  const buf = XL.write(wb, { bookType: 'xlsx', type: 'array' }), name = 'Fees register FY ' + fy + '.xlsx';
  dlBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
  try { await g(drivePath(DIARY_DIR + '/CA Register/' + name) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: buf }); toast('Saved to Downloads and OneDrive › Case Diary › CA Register', 5000); }
  catch (e) { toast('Saved to Downloads', 4000); }
}
function sheetCA(fy) {
  const fys = allFys(); fy = fy || fys[0];
  const { P, B, R, tot } = caData(fy);
  openSheet(`<div class="s-head"><div><small>For your CA / income tax</small><h1>Year-end register</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="field"><label for="ca_fy">FINANCIAL YEAR</label><select class="in" id="ca_fy">${fys.map(f => `<option ${f === fy ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
    <div class="kv"><span>Gross fees</span><b>${rupees(tot.gross)}</b><span>Received</span><b>${rupees(tot.net)}</b><span>TDS</span><b>${rupees(tot.tds)}${tot.f16aMissing ? ` <small style="color:var(--red)">(${tot.f16aMissing} TDS certificate${tot.f16aMissing > 1 ? 's' : ''} awaited)</small>` : ''}</b><span>Bills raised</span><b>${rupees(tot.billed)}</b><span>Expenses from fees</span><b>${rupees(tot.expMine)}</b><span>Counts</span><b>${B.length} bills · ${R.length} receipts · ${P.length} payments</b></div>
    <button class="save" data-ca="xl" style="margin-top:14px">Download Excel for ${esc(fy)}</button>
    <p class="hint">Sheets: Summary, Fees received, Bills, Receipts, TDS by client, Expenses, Cancelled. A copy is also kept in OneDrive › Case Diary › CA Register.</p>`);
  $('#ca_fy').onchange = e => sheetCA(e.target.value);
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-ca="xl"]')) caRegister(fy).catch(er => toast('Could not make the register: ' + er.message)); };
}

/* ================= Dues by age ================= */
const daysSince = iso => iso ? Math.floor((parseIso(todayIso()) - parseIso(iso)) / 864e5) : 0;
function duesList() {
  const out = [];
  for (const m of live()) {
    const billed = (m.bills || []).filter(b => !b.state).reduce((t, b) => t + num(b.total), 0);
    const due = typeof isRetainer === 'function' && isRetainer(m) ? Math.max(0, billed - num(m.feeReceived)) : feeDue(m); if (due <= 0) continue;   // a retainer is due only as billed
    const open = (m.bills || []).filter(b => !b.state && billPaid(m, b) < num(b.total)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const since = open[0]?.date || ((m.agreedParts || []).map(p => p.date).filter(Boolean).sort()[0]) || m.created || '';
    out.push({ m, due, since, age: daysSince(since), bill: open[open.length - 1] || null, bills: open });
  }
  return out.sort((a, b) => b.age - a.age || b.due - a.due);
}
const BUCKETS = [['0–30 days', 0, 30], ['31–60 days', 31, 60], ['61–90 days', 61, 90], ['Over 90 days', 91, 1e9]];
function sheetDues() {
  const L = duesList();
  openSheet(`<div class="s-head"><div><small>${L.length} matter${L.length === 1 ? '' : 's'} · ${rupees(L.reduce((s, x) => s + x.due, 0))} pending</small><h1>Dues by age</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">Age is counted from the oldest unpaid bill, or from when the fee was agreed.</p>
    ${BUCKETS.map(([lab, lo, hi]) => { const xs = L.filter(x => x.age >= lo && x.age <= hi); if (!xs.length) return '';
      return `<div class="grp"><span class="lbl" style="${lo > 60 ? 'color:var(--red)' : ''}">${lab} · ${rupees(xs.reduce((s, x) => s + x.due, 0))}</span><div class="hist">${xs.map(x => `<div><b>${x.age} d</b><span><b style="font-family:inherit">${esc(x.m.title || x.m.clients)}</b><br>${rupees(x.due)} due${x.bill ? ' · bill ' + esc(x.bill.no) + ' of ' + dmy(x.bill.date) : ''}${x.m.lastReminder ? '<br><small>Reminded ' + dmy(x.m.lastReminder) + '</small>' : ''}<br>
        <button class="linkbtn" data-du="wa" data-id="${x.m.id}" ${waOf(x.m) ? '' : 'disabled'}>${waOf(x.m) ? 'Remind on WhatsApp' : 'No WhatsApp no.'}</button> · <button class="linkbtn" data-act="open" data-id="${x.m.id}">Open</button> · <button class="linkbtn" data-act="fees" data-id="${x.m.id}">Fees</button></span></div>`).join('')}</div></div>`; }).join('') || '<p class="empty">No fees pending. 🎉</p>'}`);
  $('#sheet-root').onclick = async e => {
    const b = e.target.closest('[data-du="wa"]'); if (!b) return;
    const x = L.find(y => y.m.id === b.dataset.id); if (!x) return;
    b.textContent = 'Preparing…';
    let link = '';
    if (x.bill && x.bill.fileId) { try { const r = await g('/me/drive/items/' + x.bill.fileId + '/createLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'view', scope: 'anonymous' }) }); if (r.ok) link = (await r.json()).link.webUrl; } catch (er) {} }
    const txt = `Namaste.\nThis is a gentle reminder that ${rupees(x.due)} is pending towards professional fees in your matter: ${x.m.title}${x.m.caseNo ? ' (' + x.m.caseNo + ')' : ''}.` +
      (x.bill ? `\nBill No. ${x.bill.no} dated ${dmy(x.bill.date)}.` + (link ? '\nBill: ' + link : '') : '') +
      `\n\nPayment may be made to:\nSaurabh Misra\nA/c ${BANK.acct}, ${BANK.bank}, ${BANK.branch}\nIFSC ${BANK.ifsc}\nUPI ${BANK.upi}\n\nKindly ignore if already paid.\nSaurabh Misra, Advocate`;
    window.open('https://wa.me/' + waOf(x.m) + '?text=' + encodeURIComponent(txt), '_blank');
    change(() => { x.m.lastReminder = todayIso(); logChange(x.m, 'Fee reminder sent on WhatsApp: ' + rupees(x.due)); touch(x.m); });
    b.textContent = 'Reminded';
  };
}

/* ================= Junior-wise statement ================= */
const isJuniorExp = x => /junior/i.test(x.type || '') && !!(x.to || '').trim();
const jkey = s => String(s || '').trim().replace(/\s+/g, ' ').replace(/^(adv\.?|advocate|sri|shri|mr\.?)\s+/i, '').toLowerCase();
function juniorData() {
  const by = {};
  for (const m of live()) for (const x of (typeof expList === 'function' ? expList(m) : [])) {
    if (!isJuniorExp(x)) continue;
    const k = jkey(x.to); by[k] = by[k] || { name: x.to.trim(), rows: [], total: 0 }; by[k].rows.push({ m, x }); by[k].total += num(x.amount);
  }
  return Object.values(by).sort((a, b) => b.total - a.total);
}
function sheetJuniors(pick) {
  const J = juniorData(), j = pick ? J.find(x => jkey(x.name) === pick) : null;
  if (j) {
    const months = {}; j.rows.forEach(({ x }) => { const k = (x.date || '').slice(0, 7); months[k] = (months[k] || 0) + num(x.amount); });
    openSheet(`<div class="s-head"><div><small>Junior-wise statement</small><h1>${esc(j.name)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="kv"><span>Total paid</span><b>${rupees(j.total)}</b><span>Entries</span><b>${j.rows.length}</b></div>
      <div class="grp" style="margin-top:10px"><span class="lbl">By month</span><div class="hist">${Object.keys(months).sort().reverse().map(k => `<div><b>${k ? MONL[+k.slice(5) - 1].slice(0, 3) + ' ' + k.slice(0, 4) : '—'}</b><span><b style="font-family:inherit">${rupees(months[k])}</b></span></div>`).join('')}</div></div>
      <div class="grp"><span class="lbl">By matter</span><div class="hist">${j.rows.sort((a, b) => (b.x.date || '').localeCompare(a.x.date || '')).map(({ m, x }) => `<div><b>${dmy(x.date)}</b><span><b style="font-family:inherit">${rupees(x.amount)}</b> · ${esc(m.title || m.clients)}${x.type !== 'Paid to junior' ? '<br><small>' + esc(x.type) + '</small>' : ''}${x.note ? '<br><small>' + esc(x.note) + '</small>' : ''}</span></div>`).join('')}</div></div>
      <button class="save" data-jn="xl">Download Excel</button><button class="linkbtn" data-jn="back" style="margin-top:10px">‹ All juniors</button>`);
  } else {
    openSheet(`<div class="s-head"><div><small>From your expense entries</small><h1>Junior-wise statement</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      ${J.length ? `<div class="hist">${J.map(x => `<button class="hrow" data-jn="one" data-k="${esc(jkey(x.name))}"><b>${rupees(x.total)}</b><span><b style="font-family:inherit">${esc(x.name)}</b><br><small>${x.rows.length} entr${x.rows.length === 1 ? 'y' : 'ies'} · ${new Set(x.rows.map(r => r.m.id)).size} matter(s)</small></span></button>`).join('')}</div><button class="save" data-jn="xl" style="margin-top:12px">Download Excel (all juniors)</button>`
      : '<p class="empty">No payment to a junior is recorded yet. On a matter, use <b>Add expense › Paid to junior</b> (or Lump sum with Junior fee) and write the junior\'s name in "Paid to".</p>'}`);
  }
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-jn]'); if (!b) return;
    const a = b.dataset.jn;
    if (a === 'one') return sheetJuniors(b.dataset.k);
    if (a === 'back') return sheetJuniors();
    if (!window.XLSX) return toast('Excel library still loading');
    const wb = XLSX.utils.book_new(), list = j ? [j] : J;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.map(x => ({ 'Junior': x.name, 'Entries': x.rows.length, 'Total paid': x.total }))), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.flatMap(x => x.rows.map(({ m, x: e2 }) => ({ 'Junior': x.name, 'Date': dmy(e2.date), 'Matter Ref.': matterRef(m), 'Matter': m.title, 'Type': e2.type, 'Amount': num(e2.amount), 'Note': e2.note })))), 'Entries');
    dlBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), 'Junior statement ' + (j ? j.name + ' ' : '') + todayIso() + '.xlsx'); toast('Saved to Downloads');
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="careg"],[data-act="dues"],[data-act="juniors"]'); if (!el) return;
  ({ careg: () => sheetCA(), dues: sheetDues, juniors: () => sheetJuniors() })[el.dataset.act]();
});
