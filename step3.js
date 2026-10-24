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
      ${dl.map(m => `<button class="card row" data-act="open" data-id="${m.id}"><div class="item sm" style="background:var(--red)"><small>DUE</small><b>${esc(mrefBox(m))}</b></div><span class="m-col"><span class="m-title">${esc(m.deadlineFor || 'Deadline')}</span><span class="m-meta">${esc(m.title)}</span></span><span></span></button>`).join('')}
      ${list.length ? groupByCourt(list).map(([court, ms]) => { const f = forumOf(ms[0]); return `<span class="court-tag" style="background:${f.soft};color:${f.ink}">${esc(court)}</span>` + ms.map(matterCard).join(''); }).join('') : (dl.length || done.length ? '' : '<div class="card empty">Nothing listed on this day.</div>')}
      ${done.map(m => { const h = (m.hearings || []).filter(x => x.date === sel).slice(-1)[0]; return `<button class="card row" data-act="open" data-id="${m.id}">${itemBox(m)}<span class="m-col"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc(h.happened)}${h.next ? ' · next ' + dmy(h.next) : ''}</span></span><span class="done-pill">Heard</span></button>`; }).join('')}
    </section>
  </main>`;
};

/* ================= Clients ================= */
const baseKey = s => String(s || '').toLowerCase().replace(/&\s*(anr|ors|others|another)\.?/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/* "Also known as": other names of the same client, e.g. Anuj Gupta = Anuj Kumar Gupta. Kept in meta.aka { main name key: [other names] };
   every name in the list counts as the same client everywhere (client lists, client codes, conflict check, search). */
let _akaRef = null, _akaIdx = {};
function akaIndex() { const A = S.data?.meta?.aka || {}; if (A === _akaRef) return _akaIdx; const idx = {};
  for (const [k, list] of Object.entries(A)) for (const a of (list || [])) { const b = baseKey(a); if (b && b !== k) idx[b] = k; }
  _akaRef = A; _akaIdx = idx; return idx; }
const clientKey = s => { const b = baseKey(s); return akaIndex()[b] || b; };
const aliasesOf = name => { const k = clientKey(name); return k ? ((S.data?.meta?.aka || {})[k] || []) : []; };
function setAliases(d, name, list) {   // call inside change(); d = data
  const k = clientKey(name); if (!k) return;
  d.meta = d.meta || {}; const A = Object.assign({}, d.meta.aka);
  const clean = [...new Set(list.map(x => String(x).trim()).filter(x => x && baseKey(x) !== k))];
  for (const a of clean) { const b = baseKey(a); if (A[b]) { clean.push(...A[b].filter(x => baseKey(x) !== k)); delete A[b]; } }   // an alias that had its own list joins this one
  const fin = [...new Map(clean.map(x => [baseKey(x), x])).values()];
  if (fin.length) A[k] = fin; else delete A[k];
  d.meta.aka = A;
  // matters now joined to this client take its client code (when the client has exactly one)
  const grp = (d.matters || []).filter(m => !m.deleted && clientKey(m.clients) === k), codes = [...new Set(grp.map(m => m.clientCode).filter(Boolean))];
  if (codes.length === 1) grp.forEach(m => { if (!m.clientCode) { m.clientCode = codes[0]; logChange(m, 'Client code ' + codes[0] + ' (client also known as ' + clientName(m.clients) + ')'); touch(m); } });
}
function sheetAliases(name, back) {
  const main = clientName(name), list = aliasesOf(name);
  openSheet(`<div class="s-head"><div><small>Client</small><h1>${esc(main)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="aka_form" class="grp" style="gap:12px"><div class="field"><label for="aka_in">ALSO KNOWN AS</label><textarea class="in" id="aka_in" rows="3" placeholder="One name per line, e.g. Anuj Kumar Gupta">${esc(list.join('\n'))}</textarea></div>
    <p class="hint" style="margin:0">Matters under any of these names are treated as the same client — same client code, same client list, and the conflict check knows them.</p>
    <button class="save" type="submit">Save</button>${back ? '<button type="button" class="linkbtn" data-aka="back">‹ Back</button>' : ''}</form>`);
  $('#aka_form').onsubmit = e => { e.preventDefault(); const v = $('#aka_in').value.split(/\n|;/);
    change(d => setAliases(d, name, v)); toast('Saved: ' + (aliasesOf(name).join(', ') || 'no other names')); back ? back() : closeSheet(); };
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-aka]')) back(); };
}
const clientName = s => String(s || '').replace(/\s*&\s*(Anr|Ors|Others|Another)\.?\s*$/i, '').replace(/\s+/g, ' ').trim();
function clientGroups() {
  const map = new Map();
  for (const m of live()) {
    const k = clientKey(m.clients) || '(no client name)';
    if (!map.has(k)) map.set(k, { key: k, name: clientName(m.clients) || '(no client name)', ms: [], phone: '' });
    const gr = map.get(k); gr.ms.push(m); if (m.phone && !gr.phone) gr.phone = m.phone;
    if (baseKey(m.clients) === k && !gr.main) { gr.main = true; gr.name = clientName(m.clients); }
  }
  for (const [k, c] of Object.entries(S.data?.meta?.clientList || {})) { const kk = clientKey(c.name) || k; if (!map.has(kk)) map.set(kk, { key: kk, name: c.name, ms: [], phone: '', newClient: true }); }
  for (const gr of map.values()) { gr.aka = aliasesOf(gr.name); if (!gr.phone && typeof clientInfo === 'function') gr.phone = (S.data?.meta?.clientInfo || {})[gr.key]?.phone || ''; }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
const sortName = n => String(n || '').replace(/^\s*((dr|smt|shri|sri|sh|mr|mrs|ms|m\/s|messrs|km|kumari|late|the)\.?\s+)+/i, '');   // Dr. Kanav Jain sorts under K
VIEWS.clients = function () {
  const q = (S.cq || '').toLowerCase();
  const gs = clientGroups().map(gr => Object.assign(gr, { live: !gr.ms.length || gr.ms.some(m => isOpen(m)) })).sort((a, b) => (b.live - a.live) || ((a.key === '(no client name)') - (b.key === '(no client name)')) || sortName(a.name).localeCompare(sortName(b.name), 'en', { sensitivity: 'base' })).filter(gr => !q || gr.name.toLowerCase().includes(q) || gr.aka.some(a => a.toLowerCase().includes(q)) || gr.ms.some(m => matches(m, q)));
  return pageHead('Clients', `<button class="act primary" data-act="newclient" style="min-height:42px;margin:0 0 8px;width:100%">+ New client</button><label class="search">${I.search}<input type="search" placeholder="Search clients" data-act="cq" value="${esc(S.cq || '')}"></label>`) + `
  <main><div class="list">
    <div class="h2"><span class="sub">${gs.length} client${gs.length === 1 ? '' : 's'}</span></div>
    ${gs.length ? gs.map((gr, i) => {
      const head = i === 0 && gr.live ? `<div class="h2"><h2>Pending matters</h2><span class="sub">${gs.filter(g => g.live).length}</span></div>` : (!gr.live && (i === 0 || gs[i - 1].live)) ? `<div class="h2" style="margin-top:14px"><h2>Decided / closed matters only</h2><span class="sub">${gs.filter(g => !g.live).length}</span></div>` : '';
      const pend = gr.ms.filter(m => isOpen(m));
      const next = pend.map(m => m.nextDate).filter(d => d && d >= todayIso()).sort()[0];
      const due = gr.ms.reduce((s, m) => s + feeDue(m), 0);
      const init = gr.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      return head + `<button class="card row" data-act="client" data-k="${esc(gr.key)}"><span class="avatar">${esc(init || '?')}</span>
        <span class="m-col"><span class="m-title">${esc(gr.name)}</span>${gr.aka.length ? `<span class="m-meta">also ${esc(gr.aka.join(', '))}</span>` : ''}<span class="m-meta">${!gr.ms.length ? 'New client · no matter yet · ' : ''}${pend.length} pending · ${gr.ms.length - pend.length} closed${next ? ' · next ' + dmy(next) : ''}</span></span>
        <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${due ? 'var(--saffron-ink)' : 'var(--muted)'}">${due ? rupees(due) : ''}</span></button>`;
    }).join('') : '<div class="card empty">No clients yet. They appear here as you add matters.</div>'}
  </div></main>`;
};
/* Client profile: kept once per client in meta.clientInfo { client key: {...} }; mobile, WhatsApp and email are also copied to the client's matters,
   which is where bills, reminders and sharing read them. */
const CI_FIELDS = [['phone', 'Mobile', 'tel', '10-digit mobile'], ['whatsapp', 'WhatsApp no.', 'tel', 'blank = same as mobile'], ['email', 'Email', 'email', 'for bills, receipts and updates'],
  ['altName', 'Alternate contact – name', 'text', 'e.g. son, pairokar'], ['altPhone', 'Alternate mobile', 'tel', '10-digit mobile'], ['pan', 'PAN / GSTIN', 'text', 'for bills and TDS']];
const CI_TO_MATTER = ['phone', 'whatsapp', 'email', 'altName', 'altPhone'];
function clientInfo(name) {
  const k = clientKey(name), saved = (S.data?.meta?.clientInfo || {})[k] || {}, ms = live().filter(m => clientKey(m.clients) === k).sort((a, b) => (b.u || 0) - (a.u || 0));
  const out = { ...saved }; for (const f of CI_TO_MATTER) if (!out[f]) { const m = ms.find(x => x[f]); if (m) out[f] = m[f]; }
  return out;
}
function sheetClient(k) {
  const gr = clientGroups().find(x => x.key === k); if (!gr) return;
  const due = gr.ms.reduce((s, m) => s + feeDue(m), 0), recd = gr.ms.reduce((s, m) => s + num(m.feeReceived), 0);
  const ci = clientInfo(gr.name), wa = phoneDigits(ci.whatsapp || ci.phone || gr.phone);
  const r = (l, v) => v ? `<span>${l}</span><b>${v}</b>` : '';
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Client${gr.ms.find(m => m.clientCode) ? ' · ' + esc(gr.ms.find(m => m.clientCode).clientCode) : ''}</small><h1>${esc(gr.name)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="kv">${r('Also known as', esc(gr.aka.join(', ')))}${r('Mobile', ci.phone ? `<a href="tel:${esc(ci.phone)}">${esc(ci.phone)}</a>` : '')}${r('WhatsApp', ci.whatsapp ? esc(ci.whatsapp) : '')}${r('Email', ci.email ? `<a href="mailto:${esc(ci.email)}">${esc(ci.email)}</a>` : '')}${r('Alternate' + (ci.altName ? ' (' + esc(ci.altName) + ')' : ''), ci.altPhone ? `<a href="tel:${esc(ci.altPhone)}">${esc(ci.altPhone)}</a>` : '')}${r('Address', esc(ci.address || '').replace(/\n/g, '<br>'))}${r('PAN / GSTIN', esc(ci.pan || ''))}${r('Notes', esc(ci.notes || ''))}<span>Matters</span><b>${gr.ms.length}</b><span>Fees received</span><b>${rupees(recd)}</b><span>Fees pending</span><b style="color:${due ? 'var(--saffron-ink)' : 'inherit'}">${rupees(due)}</b></div>
    <div class="two" style="margin-top:8px"><button class="ghost" data-act="ciedit" data-k="${esc(gr.key)}" style="margin:0">Edit client details</button><button class="act primary" data-act="consult" data-k="${esc(gr.key)}" style="min-height:44px">${gr.ms.length ? '+ New consultation' : 'Start consultation'}</button></div>
    <div class="two" style="margin-top:10px">${wa ? `<a class="act wa" style="min-height:48px" href="https://wa.me/${wa}" target="_blank" rel="noopener">${I.wa}WhatsApp ${esc(gr.name.split(' ')[0])}</a>` : '<span></span>'}<button class="act blue" data-act="shareclient" data-k="${esc(gr.key)}" style="min-height:48px">Share…</button></div>
    <div class="chips" style="margin-top:8px"><button class="chip" data-act="shareclient" data-k="${esc(gr.key)}" data-w="update">Matter update</button><button class="chip" data-act="shareclient" data-k="${esc(gr.key)}" data-w="doc">Document</button>${due ? `<button class="chip" data-act="shareclient" data-k="${esc(gr.key)}" data-w="fee">Fee reminder</button>` : ''}<button class="chip" data-act="shareclient" data-k="${esc(gr.key)}" data-w="card">Contact card</button></div>
    <div class="grp"><span class="lbl">Matters</span><div class="list">${gr.ms.sort((a, b) => (b.year - a.year) || (b.n - a.n)).map(m => `<button class="card row" data-act="open" data-id="${m.id}" style="box-shadow:none;border:2px solid var(--line)"><div class="item sm" style="background:${forumOf(m).c}"><small>REF.</small><b>${esc(mrefBox(m))}</b></div><span class="m-col"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc([m.court, metaLine(m)].filter(Boolean).join(' · '))}</span></span><span style="font-size:12px;font-weight:700;color:var(--muted)">${m.nextDate ? dmy(m.nextDate) : esc(shortSt(m.status))}</span></button>`).join('')}</div></div>`);
}
function sheetClientEdit(k) {
  const gr = clientGroups().find(x => x.key === k); if (!gr) return;
  const ci = clientInfo(gr.name);
  const f = (id, label, type, ph) => `<div class="field"><label for="ce_${id}">${label}</label><input class="in" id="ce_${id}" name="${id}" type="${type}" value="${esc(ci[id] || '')}" placeholder="${esc(ph)}"></div>`;
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Client · ${gr.ms.length} matter${gr.ms.length > 1 ? 's' : ''}</small><h1>Edit client details</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="ce_form" class="grp" style="gap:12px" autocomplete="off">
      <div class="field"><label for="ce_name">Client name</label><input class="in" id="ce_name" name="name" value="${esc(gr.name)}" required></div>
      <div class="field"><label for="ce_aka">Also known as <small>(one name per line)</small></label><textarea class="in" id="ce_aka" name="aka" rows="2" placeholder="e.g. Anuj Kumar Gupta">${esc(gr.aka.join('\n'))}</textarea></div>
      <div class="two">${f('phone', ...CI_FIELDS[0].slice(1))}${f('whatsapp', ...CI_FIELDS[1].slice(1))}</div>
      ${f('email', ...CI_FIELDS[2].slice(1))}
      <div class="two">${f('altName', ...CI_FIELDS[3].slice(1))}${f('altPhone', ...CI_FIELDS[4].slice(1))}</div>
      <div class="field"><label for="ce_address">Address <small>(printed on bills)</small></label><textarea class="in" id="ce_address" name="address" rows="3">${esc(ci.address || '')}</textarea></div>
      ${f('pan', ...CI_FIELDS[5].slice(1))}
      <div class="field"><label for="ce_notes">Notes about the client</label><textarea class="in" id="ce_notes" name="notes" rows="2" placeholder="e.g. refers clients; prefers calls after 7 pm">${esc(ci.notes || '')}</textarea></div>
      <div class="toggles"><label><span>Put this mobile, WhatsApp and email on all ${gr.ms.length} of the client's matters <small>(off = only where blank)</small></span><input type="checkbox" id="ce_all" checked></label></div>
      <button class="save" type="submit">Save</button><button type="button" class="linkbtn" data-ce="back">‹ Back</button></form>`);
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-ce]')) sheetClient(k); };
  $('#ce_form').onsubmit = e => { e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries()); for (const x in fd) fd[x] = String(fd[x]).trim();
    const all = $('#ce_all').checked, newName = fd.name.replace(/\s+/g, ' '), aka = fd.aka.split(/\n|;/).map(x => x.trim()).filter(Boolean);
    let newKey = k;
    change(d => {
      d.meta = d.meta || {};
      // rename: matters written with the old main name take the new one; other name forms stay and become "also known as"
      if (newName && newName !== gr.name) {
        const oldBase = baseKey(gr.name);
        gr.ms.forEach(m => { if (baseKey(m.clients) === oldBase) { const nv = String(m.clients).replace(/\s+/g, ' ').replace(gr.name, newName); logChange(m, 'Client: ' + m.clients + ' → ' + nv); m.clients = nv; touch(m); } else if (!aka.some(a => baseKey(a) === baseKey(m.clients))) aka.push(clientName(m.clients)); });
        newKey = baseKey(newName);
        for (const store of ['aka', 'clientInfo', 'clientList']) if (d.meta[store] && d.meta[store][k] && newKey !== k) { d.meta[store] = Object.assign({}, d.meta[store], { [newKey]: d.meta[store][k] }); delete d.meta[store][k]; }
        if (baseKey(gr.name) !== newKey) aka.push(gr.name);
      }
      if (d.meta.clientList && d.meta.clientList[newKey]) d.meta.clientList[newKey] = Object.assign({}, d.meta.clientList[newKey], { name: newName });
      setAliases(d, newName, aka.filter(a => baseKey(a) !== baseKey(newName)));
      const info = {}; for (const [id] of CI_FIELDS) if (fd[id]) info[id] = fd[id]; if (fd.address) info.address = fd.address; if (fd.notes) info.notes = fd.notes;
      d.meta.clientInfo = Object.assign({}, d.meta.clientInfo, { [newKey]: info });
      live().filter(m => clientKey(m.clients) === newKey).forEach(m => { let ch = false;
        for (const id of CI_TO_MATTER) { const v = fd[id] || ''; if ((all ? v && m[id] !== v : v && !m[id])) { logChange(m, (FIELD_NAMES[id] || id) + ': ' + (m[id] || '—') + ' → ' + v); m[id] = v; ch = true; } }
        if (ch) touch(m); });
    });
    toast('Client details saved'); sheetClient(newKey); };
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act="ciedit"]'); if (b) sheetClientEdit(b.dataset.k); });

/* ================= Fees ================= */
VIEWS.fees = function () {
  const ms = live().filter(m => num(m.feeAgreed) || num(m.feeReceived));
  const agreed = ms.reduce((s, m) => s + num(m.feeAgreed), 0), recd = ms.reduce((s, m) => s + num(m.feeReceived), 0), due = ms.reduce((s, m) => s + feeDue(m), 0);
  const pays = [];
  for (const m of live()) for (const p of (m.payments || [])) pays.push({ m, p });
  pays.sort((a, b) => (b.p.date || '').localeCompare(a.p.date || ''));
  const t = todayIso(), month = t.slice(0, 7);
  const thisMonth = pays.filter(x => (x.p.date || '').startsWith(month)).reduce((s, x) => s + gross(x.p), 0);
  const sorted = [...ms].sort((a, b) => feeDue(b) - feeDue(a));
  return pageHead('Fees') + `<main>
    <section class="tiles">
      <div class="tile" style="background:var(--saffron-soft)"><span style="color:var(--saffron-ink)">Pending</span><b style="color:var(--saffron-ink)">${rupees(due)}</b><span>${(n => n + ' matter' + (n === 1 ? '' : 's'))(sorted.filter(m => feeDue(m)).length)}</span></div>
      <div class="tile" style="background:var(--dc-soft)"><span style="color:var(--dc-ink)">Received this month</span><b style="color:var(--dc-ink)">${rupees(thisMonth)}</b><span>${MONL[new Date().getMonth()]}</span></div>
      <div class="tile wide" style="background:var(--hc-soft)"><span style="color:var(--hc)">All matters with fees</span><b style="color:var(--hc);font-size:20px">${rupees(recd)} of ${rupees(agreed)} received</b><span>${ms.length} matter${ms.length === 1 ? '' : 's'}</span></div>
    </section>
    <section class="acts" style="grid-template-columns:1fr 1fr 1fr;margin:0 0 4px"><button class="act blue" data-act="dues">Dues by age</button><button class="act blue" data-act="careg">CA register</button><button class="act blue" data-act="juniors">Juniors</button></section>
    <section class="list"><div class="h2"><h2>By matter</h2></div>
      ${sorted.length ? sorted.map(m => `<div class="card feerow"><button class="m-col" data-act="open" data-id="${m.id}" style="border:0;background:none;text-align:left;padding:0"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc(mref(m))} · ${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)}</span></button><span class="feedue ${feeDue(m) ? '' : 'paid'}">${feeDue(m) ? rupees(feeDue(m)) : 'Paid'}</span><button class="act primary" data-act="pay" data-id="${m.id}" style="min-height:40px">+ Payment</button></div>`).join('') : '<div class="card empty">No fees entered yet. Add the agreed fee in a matter (Edit), then record payments here.</div>'}
    </section>
    ${pays.length ? `<section class="card"><div class="h2"><h2>Recent payments</h2></div><div class="hist" style="margin-top:8px">${pays.slice(0, 25).map(({ m, p }) => `<div><b>${dmy(p.date)}</b><span><b style="font-family:inherit">${rupees(gross(p))}</b>${num(p.tds) ? ' <small>(incl. TDS ' + rupees(p.tds) + ')</small>' : ''} · ${esc(p.mode || '')} · ${esc(m.title)}${p.note ? '<br><span style="color:var(--muted)">' + esc(p.note) + '</span>' : ''}</span></div>`).join('')}</div></section>` : ''}
  </main>`;
};
function sheetPay(m) { sheetFees(m, 'pay'); }

/* ---------- fees on a matter: agreed in parts, received in parts; every entry can be edited or removed ---------- */
const PAY_MODES = ['Cash', 'UPI', 'Bank transfer', 'Cheque'];
const gross = p => num(p.amount) + num(p.tds);   // TDS deducted by the client counts as fee received
/* payments from 1.4.2026 fall under the Income-tax Act, 2025 (s. 393(1), certificate Form 131); earlier ones under the 1961 Act (s. 194J, Form 16A) */
const tdsSec = iso => (iso || todayIso()) >= '2026-04-01' ? 'u/s 393(1) of the Income-tax Act, 2025' : 'u/s 194J of the Income-tax Act, 1961';
const tdsCert = iso => (iso || todayIso()) >= '2026-04-01' ? 'Form 131' : 'Form 16A';
function feesTidy(m) {   // old matters: turn the two totals into entries once
  if (!m.agreedParts) m.agreedParts = num(m.feeAgreed) ? [{ id: uid(), date: m.created || '', amount: num(m.feeAgreed), for: 'Fees agreed' }] : [];
  m.payments = (m.payments || []).filter(p => !p.deleted);
  const paid = m.payments.reduce((s, p) => s + gross(p), 0);
  if (num(m.feeReceived) > paid) m.payments.unshift({ id: uid(), date: '', amount: num(m.feeReceived) - paid, mode: '', note: 'Received earlier (details not entered)' });
}
function feesTotal(m) {
  m.feeAgreed = String((m.agreedParts || []).reduce((s, p) => s + num(p.amount), 0));
  m.feeReceived = String((m.payments || []).reduce((s, p) => s + gross(p), 0));
}
function sheetFees(m, focus) {
  if (!m.agreedParts || num(m.feeReceived) !== (m.payments || []).reduce((s, p) => s + gross(p), 0)) change(() => { feesTidy(m); feesTotal(m); touch(m); });
  const st = { edit: null, kind: focus === 'agreed' ? 'agreed' : 'pay', mode: 'UPI' };
  const draw = () => {
    const due = feeDue(m), ed = st.edit;
    const ag = m.agreedParts || [], pays = (m.payments || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    const formAgreed = st.kind === 'agreed', v = ed || {};
    openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(mref(m))} · fees</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="kv"><span>Agreed</span><b>${rupees(m.feeAgreed)}</b><span>Received</span><b>${rupees(m.feeReceived)}</b><span>Balance</span><b style="color:${due ? 'var(--red)' : 'var(--dc-ink)'}">${rupees(due)}</b></div>
      <div class="three" style="margin-top:12px"><button type="button" class="act blue" data-act="mkbill" data-id="${m.id}">Generate bill</button><button type="button" class="act blue" data-act="mkrcpt" data-id="${m.id}">Generate receipt</button><span></span></div>
      <p class="hint" style="margin:8px 0 0">Matter ref. <b style="font-family:var(--mono)">${esc(matterRef(m))}</b>${m.clientCode ? '' : ` · <button class="linkbtn" data-act="setcode" data-id="${m.id}">Set client code</button>`}</p>
      ${(m.bills || []).length ? `<div class="grp" style="margin-top:10px"><span class="lbl">Bills</span><div class="hist">${m.bills.slice().sort((x, y) => (y.date || '').localeCompare(x.date || '')).map(b => { const pd = billPaid(m, b), cx = b.state === 'Cancelled'; return `<div><b>${dmy(b.date)}</b><span${cx ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(b.no)}</b> · ${rupees(b.total)} · ${cx ? `<b class="voidtag">CANCELLED</b> ${dmy(b.stateOn)}${b.reason ? ' · ' + esc(b.reason) : ''}${b.by ? ' · replaced by ' + esc(b.by) : ''}` : `<span style="color:${pd >= num(b.total) ? 'var(--dc-ink)' : 'var(--red)'}">${pd >= num(b.total) ? 'paid' : pd ? 'part-paid ' + rupees(pd) : 'unpaid'}</span>${b.replaces ? ' · in place of ' + esc(b.replaces) : ''} <button class="linkbtn" data-act="openbill" data-id="${m.id}" data-b="${b.id}">Open / edit</button> <button class="linkbtn" data-act="voidbill" data-id="${m.id}" data-v="${b.id}" style="color:var(--red)">Cancel</button>`}</span></div>`; }).join('')}</div></div>` : ''}
      ${(m.receipts || []).length ? `<div class="grp" style="margin-top:10px"><span class="lbl">Receipts</span><div class="hist">${m.receipts.slice().sort((x, y) => (y.date || '').localeCompare(x.date || '')).map(r => { const cx = r.state === 'Cancelled', p = (m.payments || []).find(q => q.id === r.payId), bl = (m.bills || []).find(q => q.id === r.billId); return `<div><b>${dmy(r.date)}</b><span${cx ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(r.no)}</b> · ${rupees(r.amount || (p && p.amount) || 0)}${bl ? ' · bill ' + esc(bl.no) : ''}${r.replaces ? ' · in place of ' + esc(r.replaces) : ''} ${cx ? `<b class="voidtag">CANCELLED</b> ${dmy(r.stateOn)}${r.reason ? ' · ' + esc(r.reason) : ''}${r.by ? ' · replaced by ' + esc(r.by) : ''}` : `<button class="linkbtn" data-act="voidrcpt" data-id="${m.id}" data-v="${r.id}" style="color:var(--red)">Cancel</button>`}</span></div>`; }).join('')}</div></div>` : ''}
      <div class="grp" style="margin-top:12px"><span class="lbl">Fees agreed</span>
        ${ag.length ? `<div class="hist">${ag.map(p => `<div><b>${p.date ? dmy(p.date) : '—'}</b><span><b style="font-family:inherit">${rupees(p.amount)}</b>${p.for ? ' · ' + esc(p.for) : ''} <button class="linkbtn" data-fe="edita" data-id="${p.id}">Edit</button> <button class="linkbtn" data-fe="dela" data-id="${p.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">Nothing agreed yet.</p>'}
        ${formAgreed ? '' : '<button class="ghost" data-fe="newa" style="width:100%;margin-top:8px">+ Add to fees agreed</button>'}</div>
      <div class="grp"><span class="lbl">Fees received</span>
        ${pays.length ? `<div class="hist">${pays.map(p => `<div><b>${p.date ? dmy(p.date) : '—'}</b><span><b style="font-family:inherit">${rupees(gross(p))}</b>${num(p.tds) ? ` <small>(${rupees(p.amount)} received + ${rupees(p.tds)} TDS · <button class="linkbtn" data-fe="f16a" data-id="${p.id}" style="color:${p.f16a ? 'var(--dc-ink)' : 'var(--red)'}">${p.f16a ? tdsCert(p.date) + ' ✓' : tdsCert(p.date) + ' awaited'}</button>)</small>` : ''}${p.mode ? ' · ' + esc(p.mode) : ''}${p.note ? '<br><span style="color:var(--muted)">' + esc(p.note) + '</span>' : ''} ${p.receiptNo ? '<br><small>Receipt ' + esc(p.receiptNo) + '</small>' : ''} <button class="linkbtn" data-act="mkrcpt" data-id="${m.id}" data-p="${p.id}">Receipt</button> <button class="linkbtn" data-fe="editp" data-id="${p.id}">Edit</button> <button class="linkbtn" data-fe="delp" data-id="${p.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No payment recorded yet.</p>'}
        ${formAgreed ? '<button class="ghost" data-fe="newp" style="width:100%;margin-top:8px">+ Add payment received</button>' : ''}</div>
      <form id="feeform" class="grp fee-form" style="gap:12px">
        <span class="lbl">${ed ? 'Edit ' : 'Add '}${formAgreed ? 'fees agreed' : 'payment received'}</span>
        <div class="two"><div class="field"><label for="fe_amt">AMOUNT (₹)</label><input class="in" id="fe_amt" name="amount" inputmode="numeric" required value="${esc(v.amount ?? (formAgreed ? '' : (due || '')))}"></div>
          <div class="field"><label for="fe_date">DATE</label><input class="in" id="fe_date" name="date" type="date" value="${esc(v.date ?? todayIso())}"></div></div>
        ${formAgreed ? `<div class="field"><label for="fe_for">FOR</label><input class="in" id="fe_for" name="for" list="fe_fors" value="${esc(v.for || '')}" placeholder="e.g. Filing and hearing, Bail, per appearance"><datalist id="fe_fors">${['Filing and hearing', 'Drafting', 'Appearance', 'Bail', 'Final arguments', 'Additional work', 'Opinion'].map(x => `<option>${x}</option>`).join('')}</datalist></div>`
        : `<div class="field"><label>MODE</label><div class="chips">${PAY_MODES.map(x => `<button type="button" class="chip ${(st.mode) === x ? 'on' : ''}" data-fe="mode" data-v="${x}">${x}</button>`).join('')}</div></div>
           <div class="field"><label for="fe_tds">TDS DEDUCTED BY CLIENT (₹, IF ANY)</label><div style="display:flex;gap:8px"><input class="in" id="fe_tds" name="tds" inputmode="numeric" value="${esc(v.tds || '')}" placeholder="blank if no TDS" style="flex:1"><button type="button" class="ghost" data-fe="tds10" style="margin:0;white-space:nowrap">TDS 10%</button></div>
             <p class="hint" style="margin:4px 0 0">Amount above = what reached you. TDS is added to fees received, and the receipt shows both.</p></div>
           <div class="field"><label for="fe_note">NOTE</label><input class="in" id="fe_note" name="note" value="${esc(v.note || '')}" placeholder="e.g. UTR / cheque no., part payment for filing"></div>
           ${!ed && waOf(m) ? '<div class="toggles"><label><span>Send receipt on WhatsApp</span><input type="checkbox" name="wa" checked></label></div>' : ''}`}
        <button class="save" type="submit">${ed ? 'Save changes' : formAgreed ? 'Add to fees agreed' : 'Save payment'}</button>
        ${ed ? '<button type="button" class="ghost" data-fe="cancel">Cancel editing</button>' : ''}
      </form>`);
    $('#feeform').onsubmit = submit;
  };
  const keep = () => { const v = {}; ['fe_amt', 'fe_date', 'fe_for', 'fe_note', 'fe_tds'].forEach(id => { const el = $('#' + id); if (el) v[id] = el.value; }); return v; };
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
        if (ed) { const was = rupees(ed.amount) + ' ' + (ed.date ? dmy(ed.date) : ''); Object.assign(ed, { amount: amt, tds: num(fd.tds) || 0, date: fd.date || '', mode: st.mode, note: (fd.note || '').trim() }); logChange(m, 'Payment edited: ' + was + ' → ' + rupees(amt) + ' ' + (fd.date ? dmy(fd.date) : '')); }
        else { const ob = (m.bills || []).filter(b => !b.state && billPaid(m, b) < num(b.total)).sort((x, y) => (x.date || '').localeCompare(y.date || ''))[0];
          m.payments.push({ id: uid(), date: fd.date || todayIso(), amount: amt, tds: num(fd.tds) || 0, mode: st.mode, note: (fd.note || '').trim(), billId: ob ? ob.id : '' }); logChange(m, 'Payment received ' + rupees(amt) + (st.mode ? ' by ' + st.mode : '') + (num(fd.tds) ? ' + TDS ' + rupees(fd.tds) : '')); }
      }
      feesTotal(m); touch(m);
    });
    toast(ed ? 'Saved' : st.kind === 'agreed' ? 'Added to fees agreed' : 'Payment of ' + rupees(amt) + ' recorded');
    if (!ed && st.kind === 'pay' && fd.wa && waOf(m)) {
      const bal = feeDue(m);
      const txt = `Namaste.\nReceived with thanks ${rupees(amt + num(fd.tds))}${num(fd.tds) ? ' (' + rupees(amt) + ' + TDS ' + rupees(fd.tds) + ')' : ''} on ${dmy(fd.date || todayIso())}${st.mode ? ' by ' + st.mode : ''} towards professional fees in your matter: ${m.title}${m.caseNo ? ' (' + m.caseNo + ')' : ''}.${num(m.feeAgreed) ? `\nTotal received: ${rupees(m.feeReceived)} of ${rupees(m.feeAgreed)}.${bal ? ' Balance: ' + rupees(bal) + '.' : ' Fees fully paid.'}` : ''}\n\nSaurabh Misra, Advocate`;
      window.open('https://wa.me/' + waOf(m) + '?text=' + encodeURIComponent(txt), '_blank');
    }
    st.edit = null; draw();
  }
  draw();
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-fe]'); if (!b) return;
    const a = b.dataset.fe, id = b.dataset.id;
    if (a === 'mode') { const v = keep(); st.mode = b.dataset.v; draw(); restore(v); return; }
    if (a === 'tds10') { const net = num($('#fe_amt').value); if (!net) return toast('Enter the amount received first'); $('#fe_tds').value = Math.round(net / 9); toast('TDS ' + rupees(Math.round(net / 9)) + ' · gross fee ' + rupees(net + Math.round(net / 9))); return; }
    if (a === 'f16a') { const p = m.payments.find(x => x.id === id); if (p) { change(() => { p.f16a = !p.f16a; logChange(m, tdsCert(p.date) + ' (TDS certificate) ' + (p.f16a ? 'received' : 'marked awaited') + ' for TDS ' + rupees(p.tds)); touch(m); }); draw(); } return; }
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
  const C = { day, busy: false, done: null }; delete PAPER_NOW.causelist;
  const draw = () => {
    const ms = onDay(C.day);
    openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Word document on your letterhead</small><h1>Cause list</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><label for="cl_day">DATE</label><input class="in" id="cl_day" type="date" value="${C.day}"></div>
      <div class="picked" style="background:var(--hc-soft);color:var(--hc)"><b>${DOWL[parseIso(C.day).getDay()]}, ${dmy(C.day)}</b><span>${ms.length} matter${ms.length === 1 ? '' : 's'} in ${groupByCourt(ms).length} court${groupByCourt(ms).length === 1 ? '' : 's'}</span></div>
      ${ms.length ? `<div class="hist">${groupByCourt(ms).map(([c, xs]) => `<div><b style="font-family:inherit;font-size:12px">${esc(c)}</b><span>${xs.map(m => (m.item ? 'Item ' + esc(m.item) + ' · ' : '') + esc(m.title)).join('<br>')}</span></div>`).join('')}</div>` : '<p class="empty">No matter is listed on this date.</p>'}
      ${C.done ? `<div class="two"><button class="act primary" data-cl="open">Open in Word</button><button class="act blue" data-cl="dl">Download</button></div><p class="hint">Saved in OneDrive › SM Chambers data › Cause Lists › ${esc(C.done.name)}</p>` : `${paperSwitch('causelist')}<button class="save" data-cl="make" ${ms.length && !C.busy ? '' : 'disabled'}>${C.busy ? 'Preparing…' : 'Make Word file'}</button>`}`);
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
      properties: { titlePage: true, page: pageFor(paperOf('causelist'), 'Legal', { top: 1080, bottom: 1440, left: 1440, right: 1440, header: 500, footer: 500 }) },
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
        <div class="field" style="margin-top:12px"><label for="l_m">SAVE AS DEADLINE IN A MATTER</label><select class="in" id="l_m" data-lim="mid"><option value="">Choose matter…</option>${open.map(m => `<option value="${m.id}" ${m.id === s.mid ? 'selected' : ''}>${esc(mref(m) + ' · ' + m.title.slice(0, 60))}</option>`).join('')}</select></div>
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
    toast('Deadline saved in ' + mref(m));
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
  const draw = () => openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(mref(m))} · add expense</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
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

document.addEventListener('click', e => { const b = e.target.closest('[data-act="aka"]'); if (!b) return;
  const gr = clientGroups().find(x => x.key === b.dataset.k); if (gr) sheetAliases(gr.ms[0].clients, () => sheetClient(clientKey(gr.ms[0].clients))); });
