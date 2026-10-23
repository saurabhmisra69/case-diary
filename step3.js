/* Case Diary — Step 3
   Calendar, Clients, Fees (payments), Cause list in Word on the chambers letterhead,
   and the Limitation calculator. */
'use strict';

Object.assign(I, {
  cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  people: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
});
window.VIEWS = window.VIEWS || {};
const pageHead = (title, extra = '') => `<header class="phead"><div class="top-row"><h1>${title}</h1><button id="syncbtn" class="sync" data-act="sync"></button></div>${extra}</header>`;
const openDeadlines = () => live().filter(m => m.deadline && !m.deadlineDone);

/* ================= Calendar ================= */
S.calMonth = todayIso().slice(0, 7); S.calDay = todayIso();
VIEWS.calendar = function () {
  const [y, mo] = S.calMonth.split('-').map(Number);
  const first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const t = todayIso();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const ds = y + '-' + pad(mo) + '-' + pad(d);
    const ms = onDay(ds), past = ds < t ? doneOn(ds) : [];
    const dl = openDeadlines().filter(m => m.deadline === ds);
    const dots = [...ms.slice(0, 4).map(m => `<i style="background:${forumOf(m).c}"></i>`), ...past.slice(0, 3).map(() => '<i style="background:#C9C3B6"></i>'), ...(dl.length ? ['<i style="background:var(--red)"></i>'] : [])].slice(0, 5).join('');
    const sun = parseIso(ds).getDay() === 0;
    cells += `<button class="cd ${ds === S.calDay ? 'on' : ''} ${ds === t ? 'today' : ''} ${sun ? 'sun' : ''}" data-act="calday" data-day="${ds}"><b>${d}</b>${ms.length ? `<small>${ms.length}</small>` : ''}<span class="dots">${dots}</span></button>`;
  }
  const sel = S.calDay, list = onDay(sel), done = doneOn(sel).filter(m => !list.includes(m)), dl = openDeadlines().filter(m => m.deadline === sel);
  const legend = Object.values(FORUMS).map(f => `<span><i style="background:${f.c}"></i>${f.label.replace(/ \(.*\)/, '')}</span>`).join('') + '<span><i style="background:var(--red)"></i>Deadline</span>';
  return pageHead('Calendar', `<div class="calnav"><button data-act="calmove" data-d="-1" aria-label="Previous month">${I.left}</button><b>${MONL[mo - 1]} ${y}</b><button data-act="calmove" data-d="1" aria-label="Next month">${I.right}</button><button class="calToday" data-act="caltoday">Today</button></div>`) + `
  <main class="cal-main">
    <section class="card calcard"><div class="calgrid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span class="dh">${d}</span>`).join('')}${cells}</div><div class="legend">${legend}</div></section>
    <section class="list">
      <div class="h2"><h2>${DOWL[parseIso(sel).getDay()]}, ${dmy(sel)}</h2>${list.length ? `<button class="linkbtn" data-act="causelist" data-day="${sel}">Cause list ↓</button>` : ''}</div>
      ${dl.map(m => `<button class="card row" data-act="open" data-id="${m.id}"><div class="item sm" style="background:var(--red)"><small>DUE</small><b>${esc(m.no)}</b></div><span class="m-col"><span class="m-title">${esc(m.deadlineFor || 'Deadline')}</span><span class="m-meta">${esc(m.title)}</span></span><span></span></button>`).join('')}
      ${list.length ? groupByCourt(list).map(([court, ms]) => { const f = forumOf(ms[0]); return `<span class="court-tag" style="background:${f.soft};color:${f.ink}">${esc(court)}</span>` + ms.map(matterCard).join(''); }).join('') : (dl.length || done.length ? '' : '<div class="card empty">Nothing listed on this day.</div>')}
      ${done.map(m => { const h = (m.hearings || []).filter(x => x.date === sel).slice(-1)[0]; return `<button class="card row" data-act="open" data-id="${m.id}">${itemBox(m)}<span class="m-col"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc(h.happened)}${h.next ? ' · next ' + dmy(h.next) : ''}</span></span><span class="done-pill">Heard</span></button>`; }).join('')}
    </section>
  </main>`;
};

/* ================= Clients ================= */
const clientKey = s => String(s || '').toLowerCase().replace(/&\s*(anr|ors|others|another)\.?/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const clientName = s => String(s || '').replace(/\s*&\s*(Anr|Ors|Others|Another)\.?\s*$/i, '').trim();
function clientGroups() {
  const map = new Map();
  for (const m of live()) {
    const k = clientKey(m.clients) || '(no client name)';
    if (!map.has(k)) map.set(k, { key: k, name: clientName(m.clients) || '(no client name)', ms: [], phone: '' });
    const gr = map.get(k); gr.ms.push(m); if (m.phone && !gr.phone) gr.phone = m.phone;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
VIEWS.clients = function () {
  const q = (S.cq || '').toLowerCase();
  const gs = clientGroups().filter(gr => !q || gr.name.toLowerCase().includes(q) || gr.ms.some(m => matches(m, q)));
  return pageHead('Clients', `<label class="search">${I.search}<input type="search" placeholder="Search clients" data-act="cq" value="${esc(S.cq || '')}"></label>`) + `
  <main><div class="list">
    <div class="h2"><span class="sub">${gs.length} client${gs.length === 1 ? '' : 's'}</span></div>
    ${gs.length ? gs.map(gr => {
      const pend = gr.ms.filter(m => isOpen(m));
      const next = pend.map(m => m.nextDate).filter(d => d && d >= todayIso()).sort()[0];
      const due = gr.ms.reduce((s, m) => s + feeDue(m), 0);
      const init = gr.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      return `<button class="card row" data-act="client" data-k="${esc(gr.key)}"><span class="avatar">${esc(init || '?')}</span>
        <span class="m-col"><span class="m-title">${esc(gr.name)}</span><span class="m-meta">${pend.length} pending · ${gr.ms.length - pend.length} closed${next ? ' · next ' + dmy(next) : ''}</span></span>
        <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${due ? 'var(--saffron-ink)' : 'var(--muted)'}">${due ? rupees(due) : ''}</span></button>`;
    }).join('') : '<div class="card empty">No clients yet. They appear here as you add matters.</div>'}
  </div></main>`;
};
function sheetClient(k) {
  const gr = clientGroups().find(x => x.key === k); if (!gr) return;
  const due = gr.ms.reduce((s, m) => s + feeDue(m), 0), recd = gr.ms.reduce((s, m) => s + num(m.feeReceived), 0);
  const wa = phoneDigits(gr.phone);
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Client</small><h1>${esc(gr.name)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="kv"><span>Mobile</span><b>${esc(gr.phone || '—')}</b><span>Matters</span><b>${gr.ms.length}</b><span>Fees received</span><b>${rupees(recd)}</b><span>Fees pending</span><b style="color:${due ? 'var(--saffron-ink)' : 'inherit'}">${rupees(due)}</b></div>
    ${wa ? `<a class="act wa" style="min-height:48px" href="https://wa.me/${wa}" target="_blank" rel="noopener">${I.wa}WhatsApp ${esc(gr.name.split(' ')[0])}</a>` : ''}
    <div class="grp"><span class="lbl">Matters</span><div class="list">${gr.ms.sort((a, b) => (b.year - a.year) || (b.n - a.n)).map(m => `<button class="card row" data-act="open" data-id="${m.id}" style="box-shadow:none;border:2px solid var(--line)"><div class="item sm" style="background:${forumOf(m).c}"><small>NO.</small><b>${esc(m.no)}</b></div><span class="m-col"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc([m.court, metaLine(m)].filter(Boolean).join(' · '))}</span></span><span style="font-size:12px;font-weight:700;color:var(--muted)">${m.nextDate ? dmy(m.nextDate) : esc(shortSt(m.status))}</span></button>`).join('')}</div></div>`);
}

/* ================= Fees ================= */
VIEWS.fees = function () {
  const ms = live().filter(m => num(m.feeAgreed) || num(m.feeReceived));
  const agreed = ms.reduce((s, m) => s + num(m.feeAgreed), 0), recd = ms.reduce((s, m) => s + num(m.feeReceived), 0), due = ms.reduce((s, m) => s + feeDue(m), 0);
  const pays = [];
  for (const m of live()) for (const p of (m.payments || [])) pays.push({ m, p });
  pays.sort((a, b) => b.p.date.localeCompare(a.p.date));
  const t = todayIso(), month = t.slice(0, 7);
  const thisMonth = pays.filter(x => x.p.date.startsWith(month)).reduce((s, x) => s + num(x.p.amount), 0);
  const sorted = [...ms].sort((a, b) => feeDue(b) - feeDue(a));
  return pageHead('Fees') + `<main>
    <section class="tiles">
      <div class="tile" style="background:var(--saffron-soft)"><span style="color:var(--saffron-ink)">Pending</span><b style="color:var(--saffron-ink)">${rupees(due)}</b><span>${(n => n + ' matter' + (n === 1 ? '' : 's'))(sorted.filter(m => feeDue(m)).length)}</span></div>
      <div class="tile" style="background:var(--dc-soft)"><span style="color:var(--dc-ink)">Received this month</span><b style="color:var(--dc-ink)">${rupees(thisMonth)}</b><span>${MONL[new Date().getMonth()]}</span></div>
      <div class="tile wide" style="background:var(--hc-soft)"><span style="color:var(--hc)">All matters with fees</span><b style="color:var(--hc);font-size:20px">${rupees(recd)} of ${rupees(agreed)} received</b><span>${ms.length} matter${ms.length === 1 ? '' : 's'}</span></div>
    </section>
    <section class="list"><div class="h2"><h2>By matter</h2></div>
      ${sorted.length ? sorted.map(m => `<div class="card feerow"><button class="m-col" data-act="open" data-id="${m.id}" style="border:0;background:none;text-align:left;padding:0"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc(m.no)} · ${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)}</span></button><span class="feedue ${feeDue(m) ? '' : 'paid'}">${feeDue(m) ? rupees(feeDue(m)) : 'Paid'}</span><button class="act primary" data-act="pay" data-id="${m.id}" style="min-height:40px">+ Payment</button></div>`).join('') : '<div class="card empty">No fees entered yet. Add the agreed fee in a matter (Edit), then record payments here.</div>'}
    </section>
    ${pays.length ? `<section class="card"><div class="h2"><h2>Recent payments</h2></div><div class="hist" style="margin-top:8px">${pays.slice(0, 25).map(({ m, p }) => `<div><b>${dmy(p.date)}</b><span><b style="font-family:inherit">${rupees(p.amount)}</b> · ${esc(p.mode || '')} · ${esc(m.title)}${p.note ? '<br><span style="color:var(--muted)">' + esc(p.note) + '</span>' : ''}</span></div>`).join('')}</div></section>` : ''}
  </main>`;
};
function sheetPay(m) { sheetFees(m, 'pay'); }

/* ---------- fees on a matter: agreed in parts, received in parts; every entry can be edited or removed ---------- */
const PAY_MODES = ['Cash', 'UPI', 'Bank transfer', 'Cheque'];
function feesTidy(m) {   // old matters: turn the two totals into entries once
  if (!m.agreedParts) m.agreedParts = num(m.feeAgreed) ? [{ id: uid(), date: m.created || '', amount: num(m.feeAgreed), for: 'Fees agreed' }] : [];
  m.payments = (m.payments || []).filter(p => !p.deleted);
  const paid = m.payments.reduce((s, p) => s + num(p.amount), 0);
  if (num(m.feeReceived) > paid) m.payments.unshift({ id: uid(), date: '', amount: num(m.feeReceived) - paid, mode: '', note: 'Received earlier (details not entered)' });
}
function feesTotal(m) {
  m.feeAgreed = String((m.agreedParts || []).reduce((s, p) => s + num(p.amount), 0));
  m.feeReceived = String((m.payments || []).reduce((s, p) => s + num(p.amount), 0));
}
function sheetFees(m, focus) {
  if (!m.agreedParts || num(m.feeReceived) !== (m.payments || []).reduce((s, p) => s + num(p.amount), 0)) change(() => { feesTidy(m); feesTotal(m); touch(m); });
  const st = { edit: null, kind: focus === 'agreed' ? 'agreed' : 'pay', mode: 'UPI' };
  const draw = () => {
    const due = feeDue(m), ed = st.edit;
    const ag = m.agreedParts || [], pays = (m.payments || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    const formAgreed = st.kind === 'agreed', v = ed || {};
    openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(m.no)} · fees</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="kv"><span>Agreed</span><b>${rupees(m.feeAgreed)}</b><span>Received</span><b>${rupees(m.feeReceived)}</b><span>Balance</span><b style="color:${due ? 'var(--red)' : 'var(--dc-ink)'}">${rupees(due)}</b></div>
      <div class="three" style="margin-top:12px"><button type="button" class="act blue" data-act="mkbill" data-id="${m.id}">Generate bill</button><button type="button" class="act blue" data-act="mkrcpt" data-id="${m.id}">Generate receipt</button><span></span></div>
      <p class="hint" style="margin:8px 0 0">Matter ref. <b style="font-family:var(--mono)">${esc(matterRef(m))}</b>${m.clientCode ? '' : ` · <button class="linkbtn" data-act="setcode" data-id="${m.id}">Set client code</button>`}</p>
      ${(m.bills || []).length ? `<div class="grp" style="margin-top:10px"><span class="lbl">Bills</span><div class="hist">${m.bills.slice().sort((x, y) => (y.date || '').localeCompare(x.date || '')).map(b => { const pd = billPaid(m, b), cx = b.state === 'Cancelled'; return `<div><b>${dmy(b.date)}</b><span${cx ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(b.no)}</b> · ${rupees(b.total)} · ${cx ? `<b class="voidtag">CANCELLED</b> ${dmy(b.stateOn)}${b.reason ? ' · ' + esc(b.reason) : ''}${b.by ? ' · replaced by ' + esc(b.by) : ''}` : `<span style="color:${pd >= num(b.total) ? 'var(--dc-ink)' : 'var(--red)'}">${pd >= num(b.total) ? 'paid' : pd ? 'part-paid ' + rupees(pd) : 'unpaid'}</span>${b.replaces ? ' · in place of ' + esc(b.replaces) : ''} <button class="linkbtn" data-act="openbill" data-id="${m.id}" data-b="${b.id}">Open / edit</button> <button class="linkbtn" data-act="voidbill" data-id="${m.id}" data-v="${b.id}" style="color:var(--red)">Cancel</button>`}</span></div>`; }).join('')}</div></div>` : ''}
      ${(m.receipts || []).length ? `<div class="grp" style="margin-top:10px"><span class="lbl">Receipts</span><div class="hist">${m.receipts.slice().sort((x, y) => (y.date || '').localeCompare(x.date || '')).map(r => { const cx = r.state === 'Cancelled', p = (m.payments || []).find(q => q.id === r.payId), bl = (m.bills || []).find(q => q.id === r.billId); return `<div><b>${dmy(r.date)}</b><span${cx ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(r.no)}</b> · ${rupees(r.amount || (p && p.amount) || 0)}${bl ? ' · bill ' + esc(bl.no) : ''}${r.replaces ? ' · in place of ' + esc(r.replaces) : ''} ${cx ? `<b class="voidtag">CANCELLED</b> ${dmy(r.stateOn)}${r.reason ? ' · ' + esc(r.reason) : ''}${r.by ? ' · replaced by ' + esc(r.by) : ''}` : `<button class="linkbtn" data-act="voidrcpt" data-id="${m.id}" data-v="${r.id}" style="color:var(--red)">Cancel</button>`}</span></div>`; }).join('')}</div></div>` : ''}
      <div class="grp" style="margin-top:12px"><span class="lbl">Fees agreed</span>
        ${ag.length ? `<div class="hist">${ag.map(p => `<div><b>${p.date ? dmy(p.date) : '—'}</b><span><b style="font-family:inherit">${rupees(p.amount)}</b>${p.for ? ' · ' + esc(p.for) : ''} <button class="linkbtn" data-fe="edita" data-id="${p.id}">Edit</button> <button class="linkbtn" data-fe="dela" data-id="${p.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">Nothing agreed yet.</p>'}
        ${formAgreed ? '' : '<button class="ghost" data-fe="newa" style="width:100%;margin-top:8px">+ Add to fees agreed</button>'}</div>
      <div class="grp"><span class="lbl">Fees received</span>
        ${pays.length ? `<div class="hist">${pays.map(p => `<div><b>${p.date ? dmy(p.date) : '—'}</b><span><b style="font-family:inherit">${rupees(p.amount)}</b>${p.mode ? ' · ' + esc(p.mode) : ''}${p.note ? '<br><span style="color:var(--muted)">' + esc(p.note) + '</span>' : ''} ${p.receiptNo ? '<br><small>Receipt ' + esc(p.receiptNo) + '</small>' : ''} <button class="linkbtn" data-act="mkrcpt" data-id="${m.id}" data-p="${p.id}">Receipt</button> <button class="linkbtn" data-fe="editp" data-id="${p.id}">Edit</button> <button class="linkbtn" data-fe="delp" data-id="${p.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No payment recorded yet.</p>'}
        ${formAgreed ? '<button class="ghost" data-fe="newp" style="width:100%;margin-top:8px">+ Add payment received</button>' : ''}</div>
      <form id="feeform" class="grp fee-form" style="gap:12px">
        <span class="lbl">${ed ? 'Edit ' : 'Add '}${formAgreed ? 'fees agreed' : 'payment received'}</span>
        <div class="two"><div class="field"><label for="fe_amt">AMOUNT (₹)</label><input class="in" id="fe_amt" name="amount" inputmode="numeric" required value="${esc(v.amount ?? (formAgreed ? '' : (due || '')))}"></div>
          <div class="field"><label for="fe_date">DATE</label><input class="in" id="fe_date" name="date" type="date" value="${esc(v.date ?? todayIso())}"></div></div>
        ${formAgreed ? `<div class="field"><label for="fe_for">FOR</label><input class="in" id="fe_for" name="for" list="fe_fors" value="${esc(v.for || '')}" placeholder="e.g. Filing and hearing, Bail, per appearance"><datalist id="fe_fors">${['Filing and hearing', 'Drafting', 'Appearance', 'Bail', 'Final arguments', 'Additional work', 'Opinion'].map(x => `<option>${x}</option>`).join('')}</datalist></div>`
        : `<div class="field"><label>MODE</label><div class="chips">${PAY_MODES.map(x => `<button type="button" class="chip ${(st.mode) === x ? 'on' : ''}" data-fe="mode" data-v="${x}">${x}</button>`).join('')}</div></div>
           <div class="field"><label for="fe_note">NOTE</label><input class="in" id="fe_note" name="note" value="${esc(v.note || '')}" placeholder="e.g. UTR / cheque no., part payment for filing"></div>
           ${!ed && waOf(m) ? '<div class="toggles"><label><span>Send receipt on WhatsApp</span><input type="checkbox" name="wa" checked></label></div>' : ''}`}
        <button class="save" type="submit">${ed ? 'Save changes' : formAgreed ? 'Add to fees agreed' : 'Save payment'}</button>
        ${ed ? '<button type="button" class="ghost" data-fe="cancel">Cancel editing</button>' : ''}
      </form>`);
    $('#feeform').onsubmit = submit;
  };
  const keep = () => { const v = {}; ['fe_amt', 'fe_date', 'fe_for', 'fe_note'].forEach(id => { const el = $('#' + id); if (el) v[id] = el.value; }); return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = $('#' + id); if (el) el.value = val; });
  function submit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries()), amt = num(fd.amount);
    if (!amt) return toast('Enter the amount');
    const ed = st.edit;
    change(() => {
      if (st.kind === 'agreed') {
        if (ed) { const was = rupees(ed.amount); Object.assign(ed, { amount: amt, date: fd.date || '', for: (fd.for || '').trim() }); logChange(m, 'Fees agreed entry edited: ' + was + ' → ' + rupees(amt)); }
        else { m.agreedParts.push({ id: uid(), date: fd.date || todayIso(), amount: amt, for: (fd.for || '').trim() }); logChange(m, 'Fees agreed + ' + rupees(amt) + (fd.for ? ' (' + fd.for.trim() + ')' : '')); }
      } else {
        if (ed) { const was = rupees(ed.amount) + ' ' + (ed.date ? dmy(ed.date) : ''); Object.assign(ed, { amount: amt, date: fd.date || '', mode: st.mode, note: (fd.note || '').trim() }); logChange(m, 'Payment edited: ' + was + ' → ' + rupees(amt) + ' ' + (fd.date ? dmy(fd.date) : '')); }
        else { m.payments.push({ id: uid(), date: fd.date || todayIso(), amount: amt, mode: st.mode, note: (fd.note || '').trim() }); logChange(m, 'Payment received ' + rupees(amt) + (st.mode ? ' by ' + st.mode : '')); }
      }
      feesTotal(m); touch(m);
    });
    toast(ed ? 'Saved' : st.kind === 'agreed' ? 'Added to fees agreed' : 'Payment of ' + rupees(amt) + ' recorded');
    if (!ed && st.kind === 'pay' && fd.wa && waOf(m)) {
      const bal = feeDue(m);
      const txt = `Namaste.\nReceived with thanks ${rupees(amt)} on ${dmy(fd.date || todayIso())}${st.mode ? ' by ' + st.mode : ''} towards professional fees in your matter: ${m.title}${m.caseNo ? ' (' + m.caseNo + ')' : ''}.${num(m.feeAgreed) ? `\nTotal received: ${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)}.${bal ? ' Balance: ' + rupees(bal) + '.' : ' Fees fully paid.'}` : ''}\n\nSaurabh Misra, Advocate`;
      window.open('https://wa.me/' + waOf(m) + '?text=' + encodeURIComponent(txt), '_blank');
    }
    st.edit = null; draw();
  }
  draw();
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-fe]'); if (!b) return;
    const a = b.dataset.fe, id = b.dataset.id;
    if (a === 'mode') { const v = keep(); st.mode = b.dataset.v; draw(); restore(v); return; }
    if (a === 'newa' || a === 'newp') { st.kind = a === 'newa' ? 'agreed' : 'pay'; st.edit = null; draw(); setTimeout(() => $('#fe_amt')?.focus(), 60); return; }
    if (a === 'cancel') { st.edit = null; draw(); return; }
    if (a === 'edita' || a === 'editp') {
      st.kind = a === 'edita' ? 'agreed' : 'pay';
      st.edit = (st.kind === 'agreed' ? m.agreedParts : m.payments).find(p => p.id === id) || null;
      if (st.edit && st.kind === 'pay') st.mode = st.edit.mode || 'UPI';
      draw(); setTimeout(() => $('#feeform')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); return;
    }
    if (a === 'dela' || a === 'delp') {
      const list = a === 'dela' ? m.agreedParts : m.payments, p = list.find(x => x.id === id); if (!p) return;
      if (!confirm('Remove ' + rupees(p.amount) + (p.date ? ' of ' + dmy(p.date) : '') + '?')) return;
      change(() => { list.splice(list.indexOf(p), 1); logChange(m, (a === 'dela' ? 'Fees agreed entry' : 'Payment') + ' removed: ' + rupees(p.amount)); feesTotal(m); touch(m); });
      st.edit = null; draw(); toast('Removed');
    }
  };
}

/* ================= Cause list in Word (chambers letterhead) ================= */
function nextWorkingDay() { let d = addDays(todayIso(), 1); while (parseIso(d).getDay() === 0) d = addDays(d, 1); return d; }
function sheetCauseList(day) {
  if (!day) day = new Date().getHours() >= 14 ? nextWorkingDay() : todayIso();
  const C = { day, busy: false, done: null };
  const draw = () => {
    const ms = onDay(C.day);
    openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Word document on your letterhead</small><h1>Cause list</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><label for="cl_day">DATE</label><input class="in" id="cl_day" type="date" value="${C.day}"></div>
      <div class="picked" style="background:var(--hc-soft);color:var(--hc)"><b>${DOWL[parseIso(C.day).getDay()]}, ${dmy(C.day)}</b><span>${ms.length} matter${ms.length === 1 ? '' : 's'} in ${groupByCourt(ms).length} court${groupByCourt(ms).length === 1 ? '' : 's'}</span></div>
      ${ms.length ? `<div class="hist">${groupByCourt(ms).map(([c, xs]) => `<div><b style="font-family:inherit;font-size:12px">${esc(c)}</b><span>${xs.map(m => (m.item ? 'Item ' + esc(m.item) + ' · ' : '') + esc(m.title)).join('<br>')}</span></div>`).join('')}</div>` : '<p class="empty">No matter is listed on this date.</p>'}
      ${C.done ? `<div class="two"><button class="act primary" data-cl="open">Open in Word</button><button class="act blue" data-cl="dl">Download</button></div><p class="hint">Saved in OneDrive › Case Diary › Cause Lists › ${esc(C.done.name)}</p>` : `<button class="save" data-cl="make" ${ms.length && !C.busy ? '' : 'disabled'}>${C.busy ? 'Preparing…' : 'Make Word file'}</button>`}`);
  };
  draw();
  const root = $('#sheet-root');
  root.onchange = e => { if (e.target.id === 'cl_day' && e.target.value) { C.day = e.target.value; C.done = null; draw(); } };
  root.onclick = async e => {
    const el = e.target.closest('[data-cl]'); if (!el) return;
    if (el.dataset.cl === 'make') {
      C.busy = true; draw();
      try { C.done = await makeCauseList(C.day); } catch (er) { toast('Could not make the file: ' + er.message); }
      C.busy = false; draw();
    } else if (el.dataset.cl === 'open') { if (C.done.url) window.open(C.done.url, '_blank'); else toast('Saved on this device only (offline). Use Download.'); }
    else if (el.dataset.cl === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(C.done.blob); a.download = C.done.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  };
}
async function makeCauseList(day) {
  if (!window.docx) throw new Error('Word library still loading, try again');
  const D = window.docx;
  const FONT = 'Calibri', ms = onDay(day), groups = groupByCourt(ms);
  const P = (text, o = {}) => new D.Paragraph({ alignment: o.align || D.AlignmentType.LEFT, spacing: { after: o.after ?? 0, before: o.before ?? 0 }, border: o.border, keepNext: o.keepNext,
    children: [new D.TextRun({ text, bold: o.bold, size: o.size || 22, font: FONT, color: o.color || '000000', characterSpacing: o.spacing, allCaps: o.caps })] });
  const CENTER = D.AlignmentType.CENTER;
  const letterhead = [
    P('SAURABH MISRA & ASSOCIATES', { bold: true, size: 32, align: CENTER }),
    P('CHAMBERS OF SAURABH MISRA, ADVOCATE', { bold: true, size: 22, align: CENTER, spacing: 60 }),
    P('Advocates & Legal Consultants', { bold: true, size: 22, align: CENTER }),
    P('30 Amir Nagar, Near Aishbagh Railway Station, Lucknow-226004', { size: 20, align: CENTER }),
    P('Phone: 9554931312 ; Email:-saurabhmisra69@gmail.com', { size: 20, align: CENTER, after: 80, border: { bottom: { style: D.BorderStyle.SINGLE, size: 24, color: '000000', space: 6 } } }),
  ];
  const W = [500, 650, 1700, 3410, 1600, 1500]; // twips, total 9360 (legal size with 1-inch margins)
  const bd = { style: D.BorderStyle.SINGLE, size: 4, color: '7F7F7F' };
  const borders = { top: bd, bottom: bd, left: bd, right: bd };
  const cell = (text, w, o = {}) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders, shading: o.fill ? { fill: o.fill, type: D.ShadingType.CLEAR, color: 'auto' } : undefined, columnSpan: o.span,
    margins: { top: 60, bottom: 60, left: 90, right: 90 }, verticalAlign: D.VerticalAlign.CENTER,
    children: String(text).split('\n').map((line, i) => new D.Paragraph({ alignment: o.align, children: [new D.TextRun({ text: line, bold: o.bold || (o.firstBold && i === 0), size: o.size || 20, font: FONT, color: o.color || '000000' })] })) });
  const head = new D.TableRow({ tableHeader: true, children: ['No.', 'Item', 'Case no.', 'Parties', 'Fixed for', 'Next date'].map((h, i) => cell(h, W[i], { bold: true, fill: 'D9D9D9', align: i < 2 ? CENTER : undefined })) });
  const rows = [head]; let n = 0;
  for (const [court, xs] of groups) {
    rows.push(new D.TableRow({ cantSplit: true, children: [cell(court, 9360, { span: 6, bold: true, fill: 'F2F2F2' })] }));
    for (const m of xs) {
      n++;
      const caseTxt = [m.caseNo ? (m.type ? m.type + ' ' : '') + m.caseNo : (m.type || ''), m.crimeNo ? 'FIR ' + m.crimeNo + (m.ps ? ', PS ' + m.ps : '') : '', m.sections ? 'u/s ' + m.sections : ''].filter(Boolean).join('\n');
      const parties = (m.title || m.clients) + (m.side ? '\n(for ' + m.side + ')' : '');
      rows.push(new D.TableRow({ cantSplit: true, children: [cell(n + '.', W[0], { align: CENTER }), cell(m.item || '', W[1], { align: CENTER }), cell(caseTxt, W[2]), cell(parties, W[3], { firstBold: true }), cell(m.purpose || '', W[4]), cell('', W[5])] }));
    }
  }
  const smallGrey = (t2, align) => new D.Paragraph({ alignment: align, children: [new D.TextRun({ text: t2, size: 16, font: FONT, color: '7F7F7F' })] });
  const doc = new D.Document({
    creator: 'Saurabh Misra', title: 'Cause List ' + dmy(day),
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      properties: { titlePage: true, page: { size: { width: 12240, height: 20160 }, margin: { top: 1080, bottom: 1440, left: 1440, right: 1440, header: 500, footer: 500 } } },
      headers: {
        first: new D.Header({ children: [new D.Paragraph({ children: [] })] }),
        default: new D.Header({ children: [new D.Paragraph({ alignment: CENTER, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } }, children: [new D.TextRun({ text: 'SAURABH MISRA, ADVOCATE', bold: true, size: 20, font: FONT }), new D.TextRun({ text: '\tCause List ' + dmy(day), size: 16, font: FONT, color: '7F7F7F' })], tabStops: [{ type: D.TabStopType.RIGHT, position: 9360 }] })] }),
      },
      footers: {
        first: new D.Footer({ children: [new D.Paragraph({ children: [] })] }),
        default: new D.Footer({ children: [new D.Paragraph({ alignment: CENTER, children: [new D.TextRun({ children: ['Page ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: '7F7F7F' })] })] }),
      },
      children: [
        ...letterhead,
        P('CAUSE LIST', { bold: true, size: 28, align: CENTER, before: 200, after: 40 }),
        P(DOWL[parseIso(day).getDay()] + ', ' + dmy(day), { bold: true, size: 22, align: CENTER, after: 60 }),
        smallGrey(n + ' matter' + (n === 1 ? '' : 's') + ' in ' + groups.length + ' court' + (groups.length === 1 ? '' : 's') + '. Prepared on ' + dmy(todayIso()) + '.', CENTER),
        new D.Paragraph({ spacing: { after: 160 }, children: [] }),
        new D.Table({ width: { size: 9360, type: D.WidthType.DXA }, columnWidths: W, rows }),
      ],
    }],
  });
  const blob = await D.Packer.toBlob(doc);
  const name = 'Cause List ' + dmy(day) + ' (' + DOWL[parseIso(day).getDay()] + ').docx';
  let url = '';
  try {
    const r = await g(drivePath(DIARY_DIR + '/Cause Lists/' + name) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, body: blob });
    if (r.ok) url = (await r.json()).webUrl;
  } catch (e) {}
  toast(url ? 'Cause list saved to OneDrive' : 'Cause list ready (not saved to OneDrive — offline?)');
  return { blob, name, url };
}

/* ================= Limitation calculator ================= */
/* Periods are counted excluding the day of the order. Time to obtain a certified copy is added.
   The advocate should confirm each period against the bare Act before relying on it. */
const REMEDIES = [
  { k: 'crrev', n: 'Criminal revision (s.438 BNSS / s.397 CrPC)', v: 90, u: 'd', b: 'Article 131, Limitation Act, 1963' },
  { k: 'crapS', n: 'Criminal appeal against conviction, to Sessions Court', v: 30, u: 'd', b: 'Article 115(b)(ii), Limitation Act, 1963' },
  { k: 'crapH', n: 'Criminal appeal against conviction, to High Court', v: 60, u: 'd', b: 'Article 115(b)(i), Limitation Act, 1963' },
  { k: 'acq', n: 'Appeal against acquittal by State, to High Court', v: 90, u: 'd', b: 'Article 114(a), Limitation Act, 1963' },
  { k: 'capH', n: 'Civil appeal (CPC), to High Court', v: 90, u: 'd', b: 'Article 116(a), Limitation Act, 1963' },
  { k: 'capD', n: 'Civil appeal (CPC), to District Court', v: 30, u: 'd', b: 'Article 116(b), Limitation Act, 1963' },
  { k: 'crev', n: 'Civil revision (s.115 CPC)', v: 90, u: 'd', b: 'Article 131, Limitation Act, 1963' },
  { k: 'review', n: 'Review of judgment (civil)', v: 30, u: 'd', b: 'Article 124, Limitation Act, 1963' },
  { k: 'o9r9', n: 'Restoration of suit dismissed in default (Order IX Rule 9 CPC)', v: 30, u: 'd', b: 'Article 122, Limitation Act, 1963' },
  { k: 'o9r13', n: 'Setting aside ex parte decree (Order IX Rule 13 CPC)', v: 30, u: 'd', b: 'Article 123, Limitation Act, 1963' },
  { k: 'arb34', n: 'Application to set aside arbitral award (s.34)', v: 3, u: 'm', b: 'Section 34(3), Arbitration and Conciliation Act, 1996 (further 30 days only on sufficient cause)' },
  { k: 'ni_notice', n: 'Demand notice after cheque dishonour (from bank return memo)', v: 30, u: 'd', b: 'Section 138 proviso (b), Negotiable Instruments Act, 1881', from: 'Date information of dishonour received' },
  { k: 'ni_complaint', n: 'Cheque dishonour complaint (from service of notice)', v: 0, u: 'ni', b: 'Section 138 proviso (c) and Section 142(1)(b), Negotiable Instruments Act, 1881: 15 days to pay, then one month to file', from: 'Date notice was served' },
  { k: 'dv', n: 'Appeal under Protection of Women from Domestic Violence Act', v: 30, u: 'd', b: 'Section 29, Protection of Women from Domestic Violence Act, 2005', from: 'Date order was served' },
  { k: 'aft', n: 'Original Application before Armed Forces Tribunal', v: 6, u: 'm', b: 'Section 22(1), Armed Forces Tribunal Act, 2007', from: 'Date of final order' },
  { k: 'rera', n: 'Appeal to RERA Appellate Tribunal', v: 60, u: 'd', b: 'Section 44(2), Real Estate (Regulation and Development) Act, 2016', from: 'Date copy of order received' },
  { k: 'cpaS', n: 'Consumer appeal to State Commission', v: 45, u: 'd', b: 'Section 41, Consumer Protection Act, 2019' },
  { k: 'cpaN', n: 'Consumer appeal to National Commission', v: 30, u: 'd', b: 'Section 51, Consumer Protection Act, 2019' },
  { k: 'exec', n: 'Execution of decree', v: 12, u: 'y', b: 'Article 136, Limitation Act, 1963' },
  { k: 'suit', n: 'Suit, residuary', v: 3, u: 'y', b: 'Article 113, Limitation Act, 1963' },
];
const diffDays = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 864e5);
S.lim = { rem: 'crrev', date: '', ccA: '', ccR: '', mid: '' };
function limCalc(s) {
  const r = REMEDIES.find(x => x.k === s.rem); if (!r || !s.date) return null;
  let last;
  if (r.u === 'd') last = addDays(s.date, r.v);
  else if (r.u === 'm') last = addMonths(s.date, r.v);
  else if (r.u === 'y') last = addMonths(s.date, r.v * 12);
  else last = addMonths(addDays(s.date, 15), 1);
  let excl = 0;
  if (s.ccA && s.ccR && s.ccR >= s.ccA && !r.k.startsWith('ni_')) { excl = diffDays(s.ccA, s.ccR); last = addDays(last, excl); }
  return { r, last, excl, left: diffDays(todayIso(), last), sun: parseIso(last).getDay() === 0 };
}
VIEWS.limit = function () {
  const s = S.lim, res = limCalc(s), r = REMEDIES.find(x => x.k === s.rem);
  const open = live().filter(m => isOpen(m)).sort((a, b) => a.title.localeCompare(b.title));
  return pageHead('Limitation') + `<main class="lim-main">
    <section class="card grp" style="gap:14px">
      <div class="field"><label for="l_rem">REMEDY</label><select class="in" id="l_rem" data-lim="rem">${REMEDIES.map(x => `<option value="${x.k}" ${x.k === s.rem ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div>
      <div class="field"><label for="l_date">${esc((r.from || 'Date of order / judgment').toUpperCase())}</label><input class="in" type="date" id="l_date" data-lim="date" value="${s.date}"></div>
      ${r.k.startsWith('ni_') ? '' : `<div class="two"><div class="field"><label for="l_a">CERTIFIED COPY APPLIED</label><input class="in" type="date" id="l_a" data-lim="ccA" value="${s.ccA}"></div><div class="field"><label for="l_r">CERTIFIED COPY READY</label><input class="in" type="date" id="l_r" data-lim="ccR" value="${s.ccR}"></div></div>`}
      <p class="hint" style="margin:0">Day of the order is excluded (Section 12(1), Limitation Act, 1963). Time taken for the certified copy is added (Section 12(2)). Condonation of delay is not counted.</p>
    </section>
    <section class="card lim-res">
      ${res ? `<span class="lbl">Last date to file</span>
        <b class="big ${res.left < 0 ? 'late' : res.left <= 7 ? 'soon' : ''}">${DOWL[parseIso(res.last).getDay()]}, ${dmy(res.last)}</b>
        <span class="left">${res.left < 0 ? Math.abs(res.left) + ' days ago — time has run out; condonation needed' : res.left === 0 ? 'Today is the last day' : res.left + ' days left'}</span>
        <div class="kv" style="margin-top:12px"><span>Period</span><b>${r.u === 'ni' ? '15 days + 1 month' : r.v + ' ' + ({ d: 'days', m: 'months', y: 'years' })[r.u]}</b>${res.excl ? `<span>Copy time added</span><b>${res.excl} days</b>` : ''}<span>Basis</span><b>${esc(r.b)}</b></div>
        ${res.sun ? '<p class="hint" style="color:var(--saffron-ink)">This falls on a Sunday. If the court is closed, filing on the day it reopens is in time (Section 4, Limitation Act, 1963). Better to file before.</p>' : ''}
        <p class="hint">Please confirm the period against the bare Act before filing.</p>
        <div class="field" style="margin-top:12px"><label for="l_m">SAVE AS DEADLINE IN A MATTER</label><select class="in" id="l_m" data-lim="mid"><option value="">Choose matter…</option>${open.map(m => `<option value="${m.id}" ${m.id === s.mid ? 'selected' : ''}>${esc(m.no + ' · ' + m.title.slice(0, 60))}</option>`).join('')}</select></div>
        <button class="save" data-act="limsave" ${s.mid ? '' : 'disabled'} style="margin-top:10px">Save deadline · ${dmy(res.last)}</button>`
      : '<p class="empty">Choose the remedy and enter the date to see the last date.</p>'}
    </section>
  </main>`;
};

/* ================= events ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'calday') { S.calDay = el.dataset.day; render(); }
  else if (a === 'calmove') { const [y, m] = S.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.d, 1); S.calMonth = d.getFullYear() + '-' + pad(d.getMonth() + 1); render(); }
  else if (a === 'caltoday') { S.calMonth = todayIso().slice(0, 7); S.calDay = todayIso(); render(); }
  else if (a === 'client') sheetClient(el.dataset.k);
  else if (a === 'pay') sheetPay(find(el.dataset.id));
  else if (a === 'fees') sheetFees(find(el.dataset.id));
  else if (a === 'causelist') sheetCauseList(el.dataset.day && el.dataset.day !== todayIso() ? el.dataset.day : undefined);
  else if (a === 'limsave') {
    const res = limCalc(S.lim), m = find(S.lim.mid); if (!res || !m) return;
    if (m.deadline && !m.deadlineDone && m.deadline !== res.last && !confirm('This matter already has a deadline on ' + dmy(m.deadline) + '. Replace it?')) return;
    change(() => { m.deadline = res.last; m.deadlineFor = res.r.n.replace(/\s*\(.*\)$/, ''); m.deadlineDone = false; touch(m); });
    toast('Deadline saved in ' + m.no);
  }
});
document.addEventListener('change', e => {
  const k = e.target.dataset?.lim; if (!k) return;
  S.lim[k] = e.target.value; render();
});
document.addEventListener('input', e => {
  if (e.target.dataset?.act !== 'cq') return;
  S.cq = e.target.value; const pos = e.target.selectionStart; render();
  const i = document.querySelector('[data-act="cq"]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (_) {} }
});

/* ---------- expenses on a matter: junior, filing, clerk/typing ----------
   each one is marked "from my fee" (reduces what he keeps) or "recover from client" (client owes it) */
const EXP_TYPES = ['Lump sum', 'Paid to junior', 'Filing / court fee / stamps', 'Clerk, typing & photocopy', 'Other'];
const LUMP_PARTS = ['Filing', 'Photocopy', 'Affidavit', 'Stamp', 'Junior fee', 'Typing', 'Notary'];
const expList = m => (m.expenses || []).filter(x => !x.deleted);
const expFromFee = m => expList(m).filter(x => x.bearer !== 'client').reduce((s, x) => s + num(x.amount), 0);
const expToRecover = m => expList(m).filter(x => x.bearer === 'client' && !x.recovered).reduce((s, x) => s + num(x.amount), 0);
function expensesBlock(m) {
  const xs = expList(m); if (!xs.length) return '';
  const fromFee = expFromFee(m), rec = expToRecover(m), kept = num(m.feeReceived) - fromFee;
  return `<div class="mini" style="margin-top:10px;display:block">
    <div class="kv" style="margin:0 0 6px"><span>Expenses from my fee</span><b>${rupees(fromFee)}</b><span>Net kept so far</span><b>${rupees(kept)}</b>${rec ? `<span>To recover from client</span><b style="color:var(--red)">${rupees(rec)}</b>` : ''}</div>
    <details><summary style="font-weight:700;cursor:pointer">${xs.length} expense${xs.length > 1 ? 's' : ''}</summary>
    <div class="hist" style="margin-top:8px">${xs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(x => `<div><b>${dmy(x.date)}</b><span><b style="font-family:inherit">${rupees(x.amount)}</b> · ${esc(x.type)}${x.to ? ' · ' + esc(x.to) : ''}${x.note ? '<br><span style="color:var(--muted)">' + esc(x.note) + '</span>' : ''}<br><small>${x.bearer === 'client' ? (x.recovered ? 'recovered from client' : 'to recover from client') : 'from my fee'}</small>
      ${x.bearer === 'client' && !x.recovered ? ` <button class="linkbtn" data-act="exprec" data-id="${m.id}" data-x="${x.id}">Mark recovered</button>` : ''} <button class="linkbtn" data-act="expdel" data-id="${m.id}" data-x="${x.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div></details></div>`;
}
function sheetExpense(m) {
  const juniors = [...new Set(live().flatMap(x => expList(x).map(e => e.to)).filter(Boolean))].sort();
  const st = { type: EXP_TYPES[0], bearer: '', parts: ['Filing', 'Photocopy', 'Affidavit', 'Stamp', 'Junior fee'] };
  const draw = () => openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(m.no)} · add expense</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="expform" class="grp" style="gap:14px">
      <div class="field"><label>TYPE</label><div class="chips">${EXP_TYPES.map(t => `<button type="button" class="chip ${st.type === t ? 'on' : ''}" data-ex="type" data-v="${t}">${t}</button>`).join('')}</div></div>
      <div class="two"><div class="field"><label for="e_amt">AMOUNT (₹)</label><input class="in" id="e_amt" name="amount" inputmode="numeric" required></div><div class="field"><label for="e_date">DATE</label><input class="in" id="e_date" name="date" type="date" value="${todayIso()}"></div></div>
      ${st.type === 'Lump sum' ? `<div class="field"><label>COVERS</label><div class="chips">${LUMP_PARTS.map(p => `<button type="button" class="chip ${st.parts.includes(p) ? 'on' : ''}" data-ex="part" data-v="${p}">${p}</button>`).join('')}</div></div>` : ''}
      ${st.type === 'Paid to junior' || (st.type === 'Lump sum' && st.parts.includes('Junior fee')) ? `<div class="field"><label for="e_to">JUNIOR${st.type === 'Lump sum' ? ' (optional)' : ''}</label><input class="in" id="e_to" name="to" list="e_juniors" placeholder="name"><datalist id="e_juniors">${juniors.map(j => `<option>${esc(j)}</option>`).join('')}</datalist></div>` : ''}
      <div class="field"><label for="e_note">NOTE</label><input class="in" id="e_note" name="note" placeholder="${st.type === 'Lump sum' ? 'e.g. filing of revision on 22.10' : st.type === 'Paid to junior' ? 'e.g. appearance on 22.10' : st.type.startsWith('Filing') ? 'e.g. court fee, affidavit, notary' : 'e.g. certified copy'}"></div>
      <div class="field"><label>WHO BEARS IT</label><div class="chips"><button type="button" class="chip ${st.bearer === 'fee' ? 'on' : ''}" data-ex="bearer" data-v="fee">From my fee</button><button type="button" class="chip ${st.bearer === 'client' ? 'on' : ''}" data-ex="bearer" data-v="client">Recover from client</button></div></div>
      <button class="save" type="submit">Save expense</button>
    </form>`);
  draw();
  const keep = () => { const v = {}; ['e_amt', 'e_date', 'e_to', 'e_note'].forEach(id => { const el = $('#' + id); if (el) v[id] = el.value; }); return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = $('#' + id); if (el) el.value = val; });
  $('#sheet-root').onclick = e => { const el = e.target.closest('[data-ex]'); if (!el) return; const v = keep(); if (el.dataset.ex === 'part') { const p = el.dataset.v; st.parts = st.parts.includes(p) ? st.parts.filter(x => x !== p) : [...st.parts, p]; } else st[el.dataset.ex] = el.dataset.v; draw(); restore(v); bind(); };
  const bind = () => { $('#expform').onsubmit = e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries()), amt = num(fd.amount);
    if (!amt) return toast('Enter the amount');
    if (!st.bearer) return toast('Choose: from my fee, or recover from client');
    change(() => { m.expenses = m.expenses || []; m.expenses.push({ id: uid(), date: fd.date || todayIso(), type: st.type === 'Lump sum' ? 'Lump sum' + (st.parts.length ? ' (' + st.parts.join(', ') + ')' : '') : st.type, amount: amt, to: (fd.to || '').trim(), note: (fd.note || '').trim(), bearer: st.bearer }); touch(m); });
    $('#sheet-root').onclick = null; closeSheet(); toast('Expense of ' + rupees(amt) + ' saved');
  }; };
  bind();
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="addexp"],[data-act="exprec"],[data-act="expdel"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  if (el.dataset.act === 'addexp') return sheetExpense(m);
  const x = (m.expenses || []).find(y => y.id === el.dataset.x); if (!x) return;
  if (el.dataset.act === 'exprec') { change(() => { x.recovered = todayIso(); touch(m); }); toast('Marked recovered'); }
  else if (confirm('Remove this expense of ' + rupees(x.amount) + '?')) { change(() => { x.deleted = true; touch(m); }); toast('Removed'); }
});
