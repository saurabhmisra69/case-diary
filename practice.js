/* SM Chambers — practice tools: limitation alerts on decided matters, tasks for juniors,
   own judgment library (OneDrive › Case Diary › Judgments), and own templates made from past drafts. */
'use strict';

/* ================= Limitation alerts ================= */
const isCrim = m => /crim/i.test(m.nature || '') || /^(Complaint|FIR|482|Bail|ABA|Revision|138 NI|125|DV)$/.test(m.type || '');
function suggestRemedies(m) {
  const t = m.type || '', ks = [];
  if (t === 'Arbitration') ks.push('arb34');
  if (m.forum === 'Tribunal' || t === 'AFT' || t === 'RERA') ks.push(t === 'RERA' ? 'rera' : 'aft');
  if (m.forum === 'Consumer' || t === 'Consumer') ks.push('cpaS', 'cpaN');
  if (t === 'DV') ks.push('dv');
  if (isCrim(m)) { if (m.forum !== 'HC') ks.push('crrev', 'crapS', 'crapH', 'acq'); }
  else if (m.forum === 'HC') ks.push('review');
  else if (!ks.length || m.forum === 'Family' || m.forum === 'District' || m.forum === 'Revenue') ks.push('capD', 'capH', 'crev', 'review', 'o9r13', 'exec');
  return [...new Set(ks)].filter(k => REMEDIES.some(r => r.k === k));
}
const openLimits = m => (m.limits || []).filter(l => !l.done && !l.dropped);
function syncDeadline(m) {   // the earliest pending limit becomes the matter's deadline, so Today, filters and the calendar show it
  const L = openLimits(m).sort((a, b) => a.last.localeCompare(b.last))[0];
  if (L) { m.deadline = L.last; m.deadlineFor = L.label; m.deadlineDone = false; m.calPending = true; }
  else if ((m.limits || []).length && m.deadlineFor && (m.limits || []).some(l => l.label === m.deadlineFor)) { m.deadlineDone = true; }
}
const limitAsk = m => m.status === 'Decided' && !(m.limits || []).length && !m.limitSkip && m.forum !== 'Advisory';
function limitCard(m) {
  const L = (m.limits || []).filter(l => !l.dropped);
  if (!L.length && !limitAsk(m)) return '';
  if (!L.length) return `<section class="card ask-card"><b>Decided — work out the limitation?</b><p class="hint" style="margin:4px 0 8px">${m.outcome === 'In our favour' ? "Find the other side's last date to appeal or revise, so you can watch for it (or file a caveat)." : 'Find the last date to appeal, revise or seek review, and put it on Today and in your calendar.'}</p><div class="two"><button class="act primary" data-act="limitset" data-id="${m.id}">Work it out</button><button class="ghost" data-act="limitskip" data-id="${m.id}">Not needed</button></div></section>`;
  return `<section class="card"><div class="h2" style="margin-bottom:6px"><h2>Limitation</h2><button class="linkbtn" data-act="limitset" data-id="${m.id}">+ Add</button></div><div class="hist">${L.sort((a, b) => a.last.localeCompare(b.last)).map(l => { const left = diffDays(todayIso(), l.last);
    return `<div><b style="${l.done ? '' : left < 0 ? 'color:var(--red)' : left <= 7 ? 'color:var(--saffron-ink)' : ''}">${dmy(l.last)}</b><span${l.done ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(l.label)}</b>${l.theirs ? ' <small>(other side)</small>' : ''}<br><small>From ${dmy(l.from)}${l.excl ? ' + ' + l.excl + ' days copy time' : ''} · ${esc(l.basis)}</small><br>${l.done ? '<small>Done ' + dmy(l.done) + '</small>' : `<small style="color:${left < 0 ? 'var(--red)' : 'inherit'}">${left < 0 ? Math.abs(left) + ' days over — condonation needed' : left === 0 ? 'Last day today' : left + ' days left'}</small> · <button class="linkbtn" data-act="limitdone" data-id="${m.id}" data-l="${l.id}">Mark filed / done</button> · <button class="linkbtn" data-act="limitdrop" data-id="${m.id}" data-l="${l.id}" style="color:var(--red)">Not pursuing</button>`}</span></div>`; }).join('')}</div></section>`;
}
function sheetLimitSet(m) {
  const sug = suggestRemedies(m), lastH = (m.hearings || []).filter(h => h.date <= todayIso()).map(h => h.date).sort().pop() || m.closedOn || todayIso();
  const st = { pick: new Set(sug.slice(0, 1)), from: lastH, ccA: '', ccR: '' };
  const draw = () => {
    openSheet(`<div class="s-head"><div><small>${esc(m.no)} · limitation</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><label for="lm_from">DATE OF ORDER / JUDGMENT</label><input class="in" type="date" id="lm_from" value="${st.from}"></div>
      <div class="two"><div class="field"><label for="lm_a">CERTIFIED COPY APPLIED</label><input class="in" type="date" id="lm_a" value="${st.ccA}"></div><div class="field"><label for="lm_r">COPY READY</label><input class="in" type="date" id="lm_r" value="${st.ccR}"></div></div>
      <span class="lbl">Remedies${m.outcome === 'In our favour' ? ' (the other side\'s)' : ''}</span>
      <div class="terms">${REMEDIES.filter(r => sug.includes(r.k)).concat(REMEDIES.filter(r => !sug.includes(r.k) && st.pick.has(r.k))).map(r => { const res = limCalc({ rem: r.k, date: st.from, ccA: st.ccA, ccR: st.ccR });
        return `<label class="term"><input type="checkbox" data-lr="${r.k}" ${st.pick.has(r.k) ? 'checked' : ''}><span><b>${esc(r.n)}</b>${res ? ' — last date <b>' + dmy(res.last) + '</b>' + (res.sun ? ' (Sunday)' : '') : ''}<br><small>${esc(r.b)}</small></span></label>`; }).join('')}</div>
      <div class="field"><label for="lm_more">ANOTHER REMEDY</label><select class="in" id="lm_more"><option value="">Add from the full list…</option>${REMEDIES.filter(r => !sug.includes(r.k) && !st.pick.has(r.k)).map(r => `<option value="${r.k}">${esc(r.n)}</option>`).join('')}</select></div>
      <p class="hint">Day of the order excluded (s. 12(1)); copy time added (s. 12(2), Limitation Act, 1963). Please confirm each period against the bare Act.</p>
      <button class="save" data-lm="save">Save and remind me</button>`);
  };
  draw();
  const root = $('#sheet-root'), keep = () => { st.from = $('#lm_from').value || st.from; st.ccA = $('#lm_a').value; st.ccR = $('#lm_r').value; };
  root.onchange = e => {
    if (!$('#lm_from')) { root.onchange = null; return; }
    if (e.target.dataset.lr) { e.target.checked ? st.pick.add(e.target.dataset.lr) : st.pick.delete(e.target.dataset.lr); return; }
    keep(); if (e.target.id === 'lm_more' && e.target.value) { st.pick.add(e.target.value); sug.push(e.target.value); } draw();
  };
  root.onclick = e => {
    if (!e.target.closest('[data-lm="save"]')) return; keep(); root.onchange = null;
    if (!st.pick.size) return toast('Tick at least one remedy');
    const theirs = m.outcome === 'In our favour';
    change(() => {
      m.limits = m.limits || [];
      for (const k of st.pick) { const res = limCalc({ rem: k, date: st.from, ccA: st.ccA, ccR: st.ccR }); if (!res) continue;
        m.limits.push({ id: uid(), k, label: res.r.n.replace(/\s*\(.*\)$/, ''), basis: res.r.b, from: st.from, excl: res.excl, last: res.last, theirs, done: '' });
        logChange(m, 'Limitation: ' + res.r.n + ' — last date ' + dmy(res.last)); }
      syncDeadline(m); touch(m);
    });
    closeSheet(); toast('Saved. It will show on Today and in your calendar.', 4000); render();
  };
}
function todayLimits() {
  const out = [];
  for (const m of live()) for (const l of openLimits(m)) { const left = diffDays(todayIso(), l.last); if (left <= 15) out.push({ m, l, left }); }
  return out.sort((a, b) => a.left - b.left);
}
function limitsToday() {
  const L = todayLimits(); if (!L.length) return '';
  return `<section class="list"><div class="h2"><h2>Limitation running</h2></div>${L.map(({ m, l, left }) => `<button class="card row" data-act="open" data-id="${m.id}"><div class="item sm" style="background:${left < 0 ? 'var(--red)' : left <= 7 ? '#B36B00' : 'var(--hc)'}"><small>${left < 0 ? 'OVER' : 'LEFT'}</small><b>${Math.abs(left)}d</b></div><span class="m-col"><span class="m-title">${esc(m.title || m.clients)}</span><span class="m-meta">${esc(l.label)}${l.theirs ? ' (other side)' : ''} · last date ${dmy(l.last)}</span></span></button>`).join('')}</section>`;
}

/* ================= Juniors and tasks ================= */
const juniors = () => (S.data?.meta?.juniors || []).filter(j => !j.deleted);
const jName = id => (juniors().find(j => j.id === id) || {}).name || '';
/* who handles the matter: Self (default) or a junior */
const allotName = m => (m.allot && m.allot !== 'self' && jName(m.allot)) || 'Self';
function allotBox(m) {
  const J = juniors(), cur = m.allot && J.some(j => j.id === m.allot) ? m.allot : 'self';
  return `<div class="field" style="margin:10px 0 0"><label for="al_${m.id}">Allotted to</label><select class="in" id="al_${m.id}" data-st="allot" data-id="${m.id}"><option value="self" ${cur === 'self' ? 'selected' : ''}>Self</option>${J.map(j => `<option value="${j.id}" ${cur === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}<option value="__new">+ Add another junior…</option></select></div>`;
}
function sheetNewJunior(m) {
  openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>Add a junior</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="nj_form" class="grp" style="gap:12px"><div class="field"><label for="nj_n">NAME</label><input class="in" id="nj_n" required placeholder="e.g. Rahul Verma"></div>
    <div class="field"><label for="nj_p">MOBILE / WHATSAPP (OPTIONAL)</label><input class="in" id="nj_p" inputmode="tel" placeholder="10 digits"></div>
    <button class="save" type="submit">Add and allot this matter</button></form>`);
  $('#nj_form').onsubmit = e => { e.preventDefault(); let n = $('#nj_n').value.trim().replace(/\s+/g, ' '); if (!n) return; if (!/adv/i.test(n)) n += ', Advocate';
    const j = { id: uid(), name: n, phone: $('#nj_p').value.trim(), u: Date.now() };
    change(d => { d.meta = d.meta || {}; d.meta.juniors = [...(d.meta.juniors || []), j]; });
    change(() => { m.allot = j.id; logChange(m, 'Allotted to: ' + n); touch(m); });
    closeSheet(); toast('Allotted to ' + n); render(); };
}
function juniorNamesFromExpenses() { const s = new Set(); for (const m of live()) (m.expenses || []).forEach(x => { if (/junior/i.test(x.type || '') && (x.to || '').trim()) s.add(x.to.trim()); }); return [...s]; }
const openTasks = m => (m.tasks || []).filter(t => !t.done && !t.deleted);
function taskCard(m) {
  const T = (m.tasks || []).filter(t => !t.deleted).sort((a, b) => (!!a.done - !!b.done) || (a.due || '9').localeCompare(b.due || '9'));
  return `<section class="card"><div class="h2" style="margin-bottom:6px"><h2>Tasks</h2><button class="linkbtn" data-act="taskadd" data-id="${m.id}">+ Give a task</button></div>
    ${T.length ? `<div class="hist">${T.slice(0, 8).map(t => `<div><b style="${!t.done && t.due && t.due < todayIso() ? 'color:var(--red)' : ''}">${t.due ? dmy(t.due) : '—'}</b><span${t.done ? ' class="voided"' : ''}><b style="font-family:inherit">${esc(t.text)}</b><br><small>${esc(t.whoName || jName(t.who) || 'Me')}${t.sent ? ' · sent ' + dmy(t.sent) : ''}${t.done ? ' · done ' + dmy(t.done) : ''}</small>${t.done ? '' : `<br><button class="linkbtn" data-act="taskdone" data-id="${m.id}" data-t="${t.id}">Done</button> · <button class="linkbtn" data-act="tasksend" data-id="${m.id}" data-t="${t.id}">WhatsApp</button> · <button class="linkbtn" data-act="taskdel" data-id="${m.id}" data-t="${t.id}" style="color:var(--red)">Remove</button>`}</span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No task on this matter.</p>'}</section>`;
}
function taskText(m, t) {
  return `Task from Saurabh Misra, Advocate:\n*${t.text}*${t.due ? '\nBy: ' + dmy(t.due) + ' (' + DOWL[parseIso(t.due).getDay()] + ')' : ''}\n\nMatter: ${m.title}${m.caseNo ? '\n' + (m.type ? m.type + ' ' : '') + m.caseNo : ''}${m.court ? "\nHon'ble Court: " + m.court : ''}${m.nextDate ? '\nNext date: ' + dmy(m.nextDate) + (m.purpose ? ' (' + m.purpose + ')' : '') : ''}\n\nPlease confirm when done.`;
}
function sendTask(m, t) {
  const j = juniors().find(x => x.id === t.who), ph = String((j && j.phone) || '').replace(/\D/g, '');
  const to = ph ? (ph.length === 10 ? '91' + ph : ph) : '';
  window.open('https://wa.me/' + to + '?text=' + encodeURIComponent(taskText(m, t)), '_blank');
  change(() => { t.sent = todayIso(); touch(m); });
}
function sheetTask(m) {
  const J = juniors(), fromExp = juniorNamesFromExpenses().filter(n => !J.some(j => j.name.toLowerCase() === n.toLowerCase()));
  openSheet(`<div class="s-head"><div><small>${esc(m.no)} · task</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="tk_form" class="grp" style="gap:12px">
      <div class="field"><label for="tk_text">TASK</label><input class="in" id="tk_text" required list="tk_list" placeholder="e.g. File inspection application, Court 7"><datalist id="tk_list">${['File inspection application', 'Obtain certified copy of order', 'Mention the matter', 'File vakalatnama', 'Collect documents from client', 'Get affidavit sworn', 'Take next date', 'Check listing / cause list', 'File written statement', 'Deposit court fee'].map(x => `<option value="${x}">`).join('')}</datalist></div>
      <div class="two"><div class="field"><label for="tk_due">BY</label><input class="in" type="date" id="tk_due" value="${m.nextDate && m.nextDate > todayIso() ? addDays(m.nextDate, -1) : addDays(todayIso(), 1)}"></div>
      <div class="field"><label for="tk_who">GIVE TO</label><select class="in" id="tk_who"><option value="">Me</option>${J.map(j => `<option value="${j.id}" ${m.allot === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}${fromExp.map(n => `<option value="new:${esc(n)}">${esc(n)} (from expenses)</option>`).join('')}<option value="new:">+ New junior…</option></select></div></div>
      <div class="two" id="tk_newj" style="display:none"><div class="field"><label for="tk_jn">JUNIOR'S NAME</label><input class="in" id="tk_jn"></div><div class="field"><label for="tk_jp">WHATSAPP NO.</label><input class="in" id="tk_jp" inputmode="tel" placeholder="10 digits"></div></div>
      <div class="toggles"><label><span>Send on WhatsApp now</span><input type="checkbox" id="tk_wa" checked></label></div>
      <button class="save" type="submit">Save task</button></form>`);
  $('#tk_who').onchange = e => { const v = e.target.value; $('#tk_newj').style.display = v.startsWith('new:') ? '' : 'none'; if (v.startsWith('new:')) $('#tk_jn').value = v.slice(4); };
  $('#tk_form').onsubmit = e => {
    e.preventDefault();
    let who = $('#tk_who').value, whoName = '';
    if (who.startsWith('new:')) { const name = $('#tk_jn').value.trim(); if (!name) return toast("Enter the junior's name"); const j = { id: uid(), name, phone: $('#tk_jp').value.trim(), u: Date.now() };
      change(d => { d.meta = d.meta || {}; d.meta.juniors = [...(d.meta.juniors || []), j]; }); who = j.id; }
    whoName = jName(who);
    const t = { id: uid(), text: $('#tk_text').value.trim(), due: $('#tk_due').value, who, whoName, created: todayIso(), done: '' };
    change(() => { m.tasks = m.tasks || []; m.tasks.push(t); logChange(m, 'Task' + (whoName ? ' for ' + whoName : '') + ': ' + t.text + (t.due ? ' by ' + dmy(t.due) : '')); touch(m); });
    if ($('#tk_wa').checked && who) sendTask(m, t);
    closeSheet(); toast('Task saved'); render();
  };
}
function sheetJuniorsTasks() {
  const J = juniors(), rows = [];
  for (const m of live()) for (const t of openTasks(m)) rows.push({ m, t });
  rows.sort((a, b) => (a.t.due || '9').localeCompare(b.t.due || '9'));
  const by = {}; rows.forEach(r => { const k = r.t.who || ''; (by[k] = by[k] || []).push(r); });
  openSheet(`<div class="s-head"><div><small>${rows.length} open task${rows.length === 1 ? '' : 's'}</small><h1>Juniors &amp; tasks</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${Object.keys(by).length ? Object.entries(by).map(([k, xs]) => `<div class="grp"><span class="lbl">${esc(jName(k) || (k ? 'Junior' : 'Me'))} · ${xs.length}</span><div class="hist">${xs.map(({ m, t }) => `<div><b style="${t.due && t.due < todayIso() ? 'color:var(--red)' : ''}">${t.due ? dmy(t.due) : '—'}</b><span><b style="font-family:inherit">${esc(t.text)}</b><br><small>${esc(m.title)}</small><br><button class="linkbtn" data-act="taskdone" data-id="${m.id}" data-t="${t.id}">Done</button> · <button class="linkbtn" data-act="open" data-id="${m.id}">Open matter</button></span></div>`).join('')}</div></div>`).join('') : '<p class="empty">No open task. Give one from any matter page (Tasks › Give a task).</p>'}
    <div class="grp" style="margin-top:14px"><span class="lbl">Your juniors</span>${J.length ? `<div class="hist">${J.map(j => `<div><b>${esc(j.name)}</b><span>${live().filter(x => x.allot === j.id && isOpen(x)).length} open matter(s) allotted · ${esc(j.phone || 'no number')} · <button class="linkbtn" data-jt="edit" data-j="${j.id}">Edit</button> · <button class="linkbtn" data-jt="del" data-j="${j.id}" style="color:var(--red)">Remove</button></span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">None yet.</p>'}
      <form id="jt_form" class="two" style="margin-top:10px;align-items:end"><div class="field" style="margin:0"><label for="jt_n">NAME</label><input class="in" id="jt_n" list="jt_l"><datalist id="jt_l">${juniorNamesFromExpenses().map(n => `<option value="${esc(n)}">`).join('')}</datalist></div><div class="field" style="margin:0"><label for="jt_p">WHATSAPP</label><input class="in" id="jt_p" inputmode="tel"></div><button class="save" type="submit" style="grid-column:1/-1;margin-top:8px">Add / update junior</button><input type="hidden" id="jt_id"></form></div>`);
  $('#jt_form').onsubmit = e => { e.preventDefault(); const name = $('#jt_n').value.trim(); if (!name) return; const id = $('#jt_id').value;
    change(d => { d.meta = d.meta || {}; const L = d.meta.juniors = d.meta.juniors || []; const j = id ? L.find(x => x.id === id) : null; if (j) Object.assign(j, { name, phone: $('#jt_p').value.trim(), u: Date.now() }); else L.push({ id: uid(), name, phone: $('#jt_p').value.trim(), u: Date.now() }); });
    sheetJuniorsTasks(); };
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-jt]'); if (!b) return; const j = juniors().find(x => x.id === b.dataset.j); if (!j) return;
    if (b.dataset.jt === 'edit') { $('#jt_n').value = j.name; $('#jt_p').value = j.phone || ''; $('#jt_id').value = j.id; $('#jt_n').focus(); }
    else if (confirm('Remove ' + j.name + ' from your juniors? Their old tasks stay.')) { change(() => { j.deleted = true; j.u = Date.now(); }); sheetJuniorsTasks(); } };
}
function tasksToday() {
  const rows = []; for (const m of live()) for (const t of openTasks(m)) if (t.due && t.due <= addDays(todayIso(), 1)) rows.push({ m, t });
  if (!rows.length) return '';
  rows.sort((a, b) => a.t.due.localeCompare(b.t.due));
  return `<section class="list"><div class="h2"><h2>Tasks due</h2><button class="linkbtn" data-act="jtasks">All tasks</button></div>${rows.map(({ m, t }) => `<button class="card row" data-act="open" data-id="${m.id}"><div class="item sm" style="background:${t.due < todayIso() ? 'var(--red)' : 'var(--dc)'}"><small>${t.due < todayIso() ? 'LATE' : t.due === todayIso() ? 'TODAY' : 'TMRW'}</small><b>${dmy(t.due).slice(0, 5)}</b></div><span class="m-col"><span class="m-title">${esc(t.text)}</span><span class="m-meta">${esc(t.whoName || jName(t.who) || 'Me')} · ${esc(m.title)}</span></span></button>`).join('')}</section>`;
}

/* ================= Judgment library ================= */
const LIB_DIR = DIARY_DIR + '/Judgments', LIB = { items: null, text: null, q: '', tag: '' };
const library = () => (S.data?.meta?.library || []).filter(x => !x.deleted);
async function libFolder() {
  const r = await g(drivePath(LIB_DIR)); if (r.ok) return r.json();
  const root = await (await g(drivePath(DIARY_DIR))).json(); return makeFolder(root.id, 'Judgments');
}
async function libTextIndex() {
  if (LIB.text) return LIB.text;
  try { const r = await g(drivePath(LIB_DIR + '/_search-index.json') + ':/content'); LIB.text = r.ok ? await r.json() : {}; } catch (e) { LIB.text = {}; }
  return LIB.text;
}
async function saveTextIndex() { try { await g(drivePath(LIB_DIR + '/_search-index.json') + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(LIB.text || {}) }); } catch (e) {} }
const CITE_RX = [/\(\d{4}\)\s*\d+\s*SCC\s*\d+/g, /\d{4}\s*SCC\s*OnLine\s*[A-Za-z]+\s*\d+/gi, /AIR\s*\d{4}\s*[A-Z][A-Za-z]*\s*\d+/g, /\(\d{4}\)\s*\d+\s*S\.?C\.?R\.?\s*\d+/g, /\d{4}\s*\(\d+\)\s*[A-Z][A-Za-z.]*\s*\d+/g, /\d{4}\s*:\s*[A-Z]+\s*:\s*\d+(?:\s*-\s*[A-Z]+)?/g, /\d{4}\s*INSC\s*\d+/g];
function guessMeta(text, name) {
  const t = text.replace(/\s+/g, ' ');
  const cites = [...new Set(CITE_RX.flatMap(rx => t.slice(0, 6000).match(rx) || []).map(s => s.trim()))].slice(0, 3);
  const court = /supreme court of india/i.test(t.slice(0, 3000)) ? 'Supreme Court' : /allahabad|lucknow bench/i.test(t.slice(0, 3000)) ? 'Allahabad High Court' : (t.slice(0, 3000).match(/high court of (?:judicature (?:at|for) )?([A-Z][a-z]+(?: [A-Z][a-z]+)?)/) || [])[1] ? (t.slice(0, 3000).match(/high court of (?:judicature (?:at|for) )?([A-Z][a-z]+(?: [A-Z][a-z]+)?)/) || [])[1] + ' High Court' : '';
  const vm = t.slice(0, 4000).match(/([A-Z][A-Za-z.&' ]{2,60}?)\s+(?:\.{0,3}\s*(?:Appellant|Petitioner|Applicant)s?\(?s?\)?\s*)?(?:v\.|vs\.?|versus)\s+([A-Z][A-Za-z.&' ]{2,60}?)(?=\s+(?:\.{0,3}\s*(?:Respondent|Opposite)|on\s|dated|with|\(|$))/i);
  const hm = t.slice(0, 4000).match(/(?:Applicant|Petitioner|Appellant|Revisionist)s?\s*:-\s*(.+?)\s+(?:Opposite Party|Respondent)s?\s*:-\s*(.+?)(?=\s+(?:Counsel|Court No|Hon'?ble|Order Date|Case|$))/i);   // Allahabad HC order heading
  const clean = s => s.replace(/\s*\((?:made-up)\)/i, '').replace(/\s+and\s+\d+\s+others?/i, ' & Ors.').replace(/\s+/g, ' ').trim();
  const title = hm ? clean(hm[1]) + ' v. ' + clean(hm[2]) : vm ? (vm[1].trim() + ' v. ' + vm[2].trim()).replace(/\s+/g, ' ') : name.replace(/\.[^.]+$/, '');
  const dm = t.slice(0, 8000).match(/(?:decided on|date of (?:judgment|decision|order)|order date|judgment date|dated)\s*[:\-]*\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
  const secs = [...new Set((t.slice(0, 8000).match(/\b(?:section|sec\.?|s\.)\s*\d+[A-Z]?(?:\(\d+\))?\s*(?:of\s*(?:the\s*)?)?(?:IPC|BNS|BNSS|Cr\.?\s*P\.?\s*C\.?|CPC|N\.?I\.?\s*Act|Evidence Act|BSA)/gi) || []).map(s => s.replace(/\s+/g, ' ').replace(/^sec(tion)?\.?\s*|^s\.\s*/i, 'S. ')))].slice(0, 6);
  return { title, citation: cites.join('; '), court, date: dm ? dm[3] + '-' + dm[2].padStart(2, '0') + '-' + dm[1].padStart(2, '0') : '', sections: secs.join(', ') };
}
async function indexFile(it) {
  let text = ''; try { text = await fileText(it); } catch (e) {}
  if (!text && /\.pdf$/i.test(it.name)) text = '';
  const gm = guessMeta(text || '', it.name);
  const rec = { id: uid(), itemId: it.id, name: it.name, ...gm, tags: '', note: '', added: todayIso(), u: Date.now() };
  (await libTextIndex())[it.id] = (text || '').replace(/\s+/g, ' ').slice(0, 60000);
  change(d => { d.meta = d.meta || {}; d.meta.library = [...(d.meta.library || []), rec]; });
  return rec;
}
async function libScan(show) {
  const dir = await libFolder(), files = (await listChildren(dir.id)).filter(it => it.file && /\.(pdf|docx)$/i.test(it.name));
  const known = new Set(library().map(x => x.itemId)), fresh = files.filter(f => !known.has(f.id));
  for (let i = 0; i < fresh.length; i++) { show && show(`Reading ${i + 1} of ${fresh.length}: ${fresh[i].name}`); await indexFile(fresh[i]); }
  if (fresh.length) await saveTextIndex();
  return fresh.length;
}
function libMatches() {
  const q = LIB.q.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean), T = LIB.text || {};
  return library().filter(x => (!LIB.tag || (x.tags || '').toLowerCase().split(/\s*,\s*/).includes(LIB.tag)) && words.every(w => [x.title, x.citation, x.court, x.sections, x.tags, x.note, x.name].join(' ').toLowerCase().includes(w) || (T[x.itemId] || '').toLowerCase().includes(w)))
    .sort((a, b) => (b.date || b.added || '').localeCompare(a.date || a.added || ''));
}
function snippet(x) {
  const w = LIB.q.trim().split(/\s+/).filter(Boolean)[0]; const T = (LIB.text || {})[x.itemId] || ''; if (!w || !T) return '';
  const i = T.toLowerCase().indexOf(w.toLowerCase()); if (i < 0) return '';
  return '…' + T.slice(Math.max(0, i - 80), i + 120) + '…';
}
async function sheetLibrary(forMatter) {
  const m = forMatter ? find(forMatter) : null;
  openSheet(`<div class="s-head"><div><small>OneDrive › Case Diary › Judgments</small><h1>Judgment library</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint" id="lb_msg">Opening…</p>`);
  try { await libTextIndex(); const n = await libScan(t => { const el = $('#lb_msg'); if (el) el.textContent = t; }); if (n) toast(n + ' new judgment' + (n > 1 ? 's' : '') + ' added to the library', 3500); }
  catch (e) { toast('Could not read the Judgments folder: ' + e.message); }
  const tags = [...new Set(library().flatMap(x => (x.tags || '').toLowerCase().split(/\s*,\s*/).filter(Boolean)))].sort();
  const draw = () => {
    const L = libMatches();
    openSheet(`<div class="s-head"><div><small>${library().length} judgment${library().length === 1 ? '' : 's'}${m ? ' · for ' + esc(m.no) : ''}</small><h1>Judgment library</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><input class="in" id="lb_q" type="search" value="${esc(LIB.q)}" placeholder="Search words, section, party, citation…"></div>
      ${tags.length ? `<div class="chips" style="margin-bottom:8px"><button class="chip ${LIB.tag ? '' : 'on'}" data-lb="tag" data-v="">All</button>${tags.map(t => `<button class="chip ${LIB.tag === t ? 'on' : ''}" data-lb="tag" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div class="two" style="margin-bottom:10px"><label class="act blue">+ Add judgment<input type="file" accept=".pdf,.docx" data-lb="up" hidden multiple></label><button class="act blue" data-act="stsearch" data-v="${esc(LIB.q || '')}">Search Supreme Today</button></div>
      <div class="hist">${L.map(x => `<div><b style="font-size:11px">${esc(x.court || '')}${x.date ? '<br>' + dmy(x.date) : ''}</b><span><b style="font-family:inherit">${esc(x.title)}</b>${x.citation ? '<br><span style="font-family:var(--mono);font-size:12px">' + esc(x.citation) + '</span>' : ''}${x.sections ? '<br><small>' + esc(x.sections) + '</small>' : ''}${x.tags ? '<br><small style="color:var(--hc)">#' + esc(x.tags.split(/\s*,\s*/).join(' #')) + '</small>' : ''}${snippet(x) ? '<br><small style="color:var(--muted)">' + esc(snippet(x)) + '</small>' : ''}
        <br><button class="linkbtn" data-lb="open" data-x="${x.id}">Open</button> · <button class="linkbtn" data-lb="edit" data-x="${x.id}">Edit / tag</button> · <button class="linkbtn" data-lb="cite" data-x="${x.id}">Copy citation</button> · <button class="linkbtn" data-act="stsearch" data-v="${esc((x.citation || '').split(';')[0].trim() || x.title)}">Supreme Today</button>${m ? ` · <button class="linkbtn" data-lb="use" data-x="${x.id}">${(m.authorities || []).includes(x.id) ? '✓ In this matter' : 'Use in this matter'}</button>` : ''}</span></div>`).join('') || `<p class="empty">${library().length ? 'Nothing matches.' : 'Put judgment PDFs in OneDrive › Case Diary › Judgments, or add them here. Each one is read once and becomes searchable.'}</p>`}</div>`);
    const q = $('#lb_q'); q.oninput = () => { LIB.q = q.value; clearTimeout(draw.t); draw.t = setTimeout(() => { const pos = q.selectionStart; draw(); const q2 = $('#lb_q'); q2.focus(); q2.setSelectionRange(pos, pos); }, 250); };
  };
  draw();
  const root = $('#sheet-root');
  root.onchange = async e => {
    if (e.target.dataset?.lb !== 'up' || !e.target.files.length) return;
    const dir = await libFolder(); let n = 0;
    for (const f of e.target.files) { toast('Uploading ' + f.name + '…'); try { const it = await uploadFile(dir.id, f, f.name); await indexFile({ ...it, name: it.name || f.name }); n++; } catch (er) { toast('Could not add ' + f.name + ': ' + er.message); } }
    await saveTextIndex(); toast(n + ' added'); draw();
  };
  root.onclick = async e => {
    const b = e.target.closest('[data-lb]'); if (!b) return;
    const a = b.dataset.lb, x = library().find(y => y.id === b.dataset.x);
    if (a === 'tag') { LIB.tag = b.dataset.v; return draw(); }
    if (a === 'open') { try { openNative(await getItem(x.itemId)); } catch (er) { toast('Could not open: ' + er.message); } return; }
    if (a === 'cite') { const c = x.title + (x.citation ? ', ' + x.citation : '') + (x.court ? ' (' + x.court + (x.date ? ', decided on ' + dmy(x.date) : '') + ')' : ''); try { await navigator.clipboard.writeText(c); toast('Copied: ' + c, 4000); } catch (er) { toast(c, 6000); } return; }
    if (a === 'use') { change(() => { m.authorities = m.authorities || []; const i = m.authorities.indexOf(x.id); if (i < 0) { m.authorities.push(x.id); logChange(m, 'Authority added: ' + x.title); } else m.authorities.splice(i, 1); touch(m); }); return draw(); }
    if (a === 'edit') return libEdit(x, () => sheetLibrary(forMatter));
  };
}
function libEdit(x, back) {
  openSheet(`<div class="s-head"><div><small>${esc(x.name)}</small><h1>Judgment details</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">Filled in from the judgment itself — please check against your copy.</p>
    <form id="le_form" class="grp" style="gap:12px">${[['title', 'Parties (title)'], ['citation', 'Citation(s)'], ['court', 'Court'], ['date', 'Date of judgment', 'date'], ['sections', 'Sections / Acts'], ['tags', 'Tags (comma separated), e.g. bail, 138 NI, quashing'], ['note', 'Your note (ratio / why useful)']].map(([k, l, ty]) => `<div class="field"><label for="le_${k}">${l.toUpperCase()}</label>${k === 'note' ? `<textarea class="in" id="le_${k}">${esc(x[k] || '')}</textarea>` : `<input class="in" id="le_${k}" ${ty ? 'type="' + ty + '"' : ''} value="${esc(x[k] || '')}">`}</div>`).join('')}
    <button class="save" type="submit">Save</button><button type="button" class="linkbtn" data-le="back">‹ Back to library</button><button type="button" class="ghost" data-le="del" style="color:var(--red)">Remove from library (file stays in OneDrive)</button></form>`);
  $('#le_form').onsubmit = e => { e.preventDefault(); change(() => { ['title', 'citation', 'court', 'date', 'sections', 'tags', 'note'].forEach(k => { x[k] = $('#le_' + k).value.trim(); }); x.tags = x.tags.split(/\s*,\s*/).filter(Boolean).join(', '); x.u = Date.now(); }); toast('Saved'); back(); };
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-le]'); if (!b) return; if (b.dataset.le === 'back') return back(); if (confirm('Remove from the library? The file stays in OneDrive.')) { change(() => { x.deleted = true; x.u = Date.now(); }); back(); } };
}
function authorityCard(m) {
  const A = (m.authorities || []).map(id => library().find(x => x.id === id)).filter(Boolean);
  return `<section class="card"><div class="h2" style="margin-bottom:6px"><h2>Authorities</h2><button class="linkbtn" data-act="library" data-id="${m.id}">+ From my library</button></div>
    ${A.length ? `<div class="hist">${A.map((x, i) => `<div><b>${i + 1}.</b><span><b style="font-family:inherit">${esc(x.title)}</b>${x.citation ? '<br><span style="font-family:var(--mono);font-size:12px">' + esc(x.citation) + '</span>' : ''}${x.note ? '<br><small>' + esc(x.note) + '</small>' : ''}</span></div>`).join('')}</div><button class="ghost" data-act="authlist" data-id="${m.id}" style="width:100%;margin-top:8px">Make "List of authorities" (Word)</button>` : '<p class="hint" style="margin:0">Pick judgments from your own library to rely on in this matter.</p>'}</section>`;
}
async function makeAuthorityList(m) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const A = (m.authorities || []).map(id => library().find(x => x.id === id)).filter(Boolean), F = 'Times New Roman', C = D.AlignmentType.CENTER;
  const P = (t, o = {}) => new D.Paragraph({ alignment: o.align || D.AlignmentType.LEFT, spacing: { after: o.after ?? 160, line: 360 }, children: [new D.TextRun({ text: t, bold: o.bold, size: o.size || 26, font: F, underline: o.u ? {} : undefined })] });
  const pt = parties(m);
  const kids = [P(courtLine(m, false), { align: C, bold: true }), P(((m.type ? m.type + ' ' : '') + (m.caseNo ? 'No. ' + m.caseNo : '')).trim(), { align: C, bold: true }),
    P(pt.first, { align: C }), P('Versus', { align: C }), P(pt.second || '', { align: C, after: 300 }), P('LIST OF AUTHORITIES', { align: C, bold: true, u: true, after: 300 }),
    ...A.map((x, i) => P((i + 1) + '.  ' + x.title + (x.citation ? ', ' + x.citation : '') + (x.court && !x.citation ? ' (' + x.court + (x.date ? ', ' + dmy(x.date) : '') + ')' : ''))),
    P('', { after: 600 }), P('Lucknow', { after: 0 }), P('Dated: ' + dmy(todayIso()), { after: 0 }),
    new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: '(' + ADV.name + ')', bold: true, size: 26, font: F })] }), new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: 'Advocate', size: 26, font: F })] })];
  const doc = new D.Document({ creator: 'Saurabh Misra', sections: [{ properties: { page: pageFor(paperOf('draft'), 'Legal', { top: 1440, bottom: 1440, left: 2160, right: 1440 }) }, children: kids }] });
  const blob = await D.Packer.toBlob(doc), name = cleanName(dmy(todayIso()) + ' List of authorities') + '.docx';
  let itemId = '';
  if (m.folderId) { try { let parent = m.folderId; try { const r = await g('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('1 Pleadings')); if (r.ok) parent = (await r.json()).id; } catch (e) {} itemId = (await uploadFile(parent, new File([blob], name), name)).id; } catch (e) {} }
  return { blob, name, itemId, where: '1 Pleadings' };
}

/* ================= Own templates from past drafts ================= */
const TPL_DIR = DIARY_DIR + '/Templates';
async function tplFolder() { const r = await g(drivePath(TPL_DIR)); if (r.ok) return r.json(); const root = await (await g(drivePath(DIARY_DIR))).json(); return makeFolder(root.id, 'Templates'); }
async function listTemplates() { try { const r = await g(drivePath(TPL_DIR) + ':/children'); if (!r.ok) return []; return ((await r.json()).value || []).filter(it => it.file && /\.docx$/i.test(it.name)); } catch (e) { return []; } }
/* the source matter's own details are found in the draft and turned into {{MARKERS}} */
function templateValues(m) {
  const v = formatValues(m), out = [];
  const add = (key, val) => { val = String(val || '').trim(); if (val.length >= 4) out.push([key, val]); };
  add('CASE_NO', v.CASE_NO); add('CRIME_NO', v.CRIME_NO); add('PS', v.PS); add('SECTIONS', v.SECTIONS); add('FIRST_PARTY', v.FIRST_PARTY); add('SECOND_PARTY', v.SECOND_PARTY); add('CLIENT', v.CLIENT);
  add('NEXT_DATE', v.NEXT_DATE); add('LAST_DATE', v.LAST_DATE);
  return out.sort((a, b) => b[1].length - a[1].length);
}
async function makeTemplate(m, doc, title) {
  const JSZip = await loadJSZip(), zip = await JSZip.loadAsync(await doc.blob.arrayBuffer()), vals = templateValues(m), hits = {};
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), xd = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  for (const p of Object.keys(zip.files).filter(p => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p))) {
    let x = await zip.file(p).async('string');
    x = x.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, para => {
      const ts = [...para.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]; if (!ts.length) return para;
      const full = ts.map(t => xd(t[1])).join(''); let rep = full;
      for (const [k, v] of vals) rep = rep.replace(new RegExp(rxEsc(v), 'gi'), () => { hits[k] = (hits[k] || 0) + 1; return '{{' + k + '}}'; });
      if (rep === full) return para;
      let first = true;   // the paragraph keeps the formatting of its first run
      return para.replace(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>/g, () => { if (first) { first = false; return '<w:t xml:space="preserve">' + xe(rep) + '</w:t>'; } return '<w:t></w:t>'; });
    });
    zip.file(p, x);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const name = cleanName(title || doc.name.replace(/\.docx$/i, '')) + '.docx', dir = await tplFolder();
  await uploadFile(dir.id, new File([blob], name), name);
  return { name, hits, blob };
}
function sheetTemplates() {
  openSheet(`<div class="s-head"><div><small>OneDrive › Case Diary › Templates</small><h1>My templates</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint" id="tp_msg">Reading…</p>`);
  listTemplates().then(T => {
    const ms = live().sort((a, b) => (b.u || 0) - (a.u || 0));
    openSheet(`<div class="s-head"><div><small>OneDrive › Case Diary › Templates</small><h1>My templates</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="hist">${T.map(it => `<div><b>DOCX</b><span><b style="font-family:inherit">${esc(it.name.replace(/\.docx$/i, ''))}</b><br><button class="linkbtn" data-tp="open" data-i="${it.id}">Open</button></span></div>`).join('') || '<p class="empty">No template yet.</p>'}</div>
      <div class="grp" style="margin-top:14px"><span class="lbl">Make a template from a past draft</span>
        <p class="hint" style="margin:0 0 8px">Pick the matter the old draft was made for, then the draft. Its case no., parties, client, crime no., P.S., sections and dates become blanks that fill themselves next time (Draft › Use my own format).</p>
        <div class="field"><label for="tp_m">THE OLD DRAFT WAS FOR</label><select class="in" id="tp_m">${ms.map(m => `<option value="${m.id}">${esc(m.no)} · ${esc((m.title || m.clients).slice(0, 60))}</option>`).join('')}</select></div>
        <div class="field"><label for="tp_n">TEMPLATE NAME</label><input class="in" id="tp_n" placeholder="e.g. Bail application – Sessions"></div>
        <button class="save" data-tp="make">Pick the draft (.docx)</button></div>`);
    $('#sheet-root').onclick = async e => {
      const b = e.target.closest('[data-tp]'); if (!b) return;
      if (b.dataset.tp === 'open') { try { openNative(await getItem(b.dataset.i)); } catch (er) { toast(er.message); } return; }
      const m = find($('#tp_m').value), title = $('#tp_n').value.trim(); if (!m) return;
      const doc = await pickDoc(m, 'Pick the old draft (.docx)', ['docx']); if (!doc) return sheetTemplates();
      openSheet(`<div class="s-head"><div><small>${esc(doc.name)}</small><h1>Making template…</h1></div></div>`);
      try { const r = await makeTemplate(m, doc, title);
        const n = Object.values(r.hits).reduce((s, x) => s + x, 0);
        openSheet(`<div class="s-head"><div><small>Saved in Templates</small><h1>${esc(r.name.replace(/\.docx$/, ''))}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
          <p class="hint">${n ? n + ' places turned into blanks:' : 'None of this matter\'s details were found in the draft, so it was saved as it is. You can type {{CASE_NO}} etc. into it in Word.'}</p>
          ${n ? `<div class="kv">${Object.entries(r.hits).map(([k, c]) => `<span>{{${k}}}</span><b>${c} place${c > 1 ? 's' : ''}</b>`).join('')}</div>` : ''}
          <p class="hint">Open it once in Word to check. Paragraphs with a blank keep the style of their first word.</p><button class="linkbtn" data-tp2="back">‹ My templates</button>`);
        $('#sheet-root').onclick = e2 => { if (e2.target.closest('[data-tp2]')) sheetTemplates(); };
      } catch (er) { toast('Could not make the template: ' + er.message); sheetTemplates(); }
    };
  });
}
async function pickTemplate() {
  const T = await listTemplates(); if (!T.length) { toast('No template yet: More › My templates'); return null; }
  return new Promise(res => {
    openSheet(`<div class="s-head"><div><small>OneDrive › Case Diary › Templates</small><h1>Pick a template</h1></div><button class="x" data-pt="x" aria-label="Close">${I.x}</button></div><div class="flist">${T.map(it => `<button class="frow" data-pt="p" data-i="${it.id}"><span class="ficon" style="background:var(--hc-soft)">DOC</span><span class="fname">${esc(it.name.replace(/\.docx$/i, ''))}<small>template</small></span></button>`).join('')}</div>`);
    $('#sheet-root').onclick = async e => { const b = e.target.closest('[data-pt]'); if (!b) return; $('#sheet-root').onclick = null; if (b.dataset.pt === 'x') return res(null);
      const it = T.find(x => x.id === b.dataset.i), r = await g('/me/drive/items/' + it.id + '/content'); res(r.ok ? { name: it.name, blob: await r.blob() } : null); };
  });
}

/* ================= events ================= */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act^="limit"],[data-act^="task"],[data-act="jtasks"],[data-act="library"],[data-act="authlist"],[data-act="templates"]'); if (!el) return;
  const a = el.dataset.act, m = el.dataset.id ? find(el.dataset.id) : null;
  if (a === 'limitset') return sheetLimitSet(m);
  if (a === 'limitskip') { change(() => { m.limitSkip = true; touch(m); }); return render(); }
  if (a === 'limitdone' || a === 'limitdrop') { const l = (m.limits || []).find(x => x.id === el.dataset.l); if (!l) return;
    change(() => { if (a === 'limitdone') l.done = todayIso(); else l.dropped = todayIso(); logChange(m, 'Limitation ' + l.label + ': ' + (a === 'limitdone' ? 'filed / done' : 'not pursuing')); syncDeadline(m); touch(m); }); return render(); }
  if (a === 'taskadd') return sheetTask(m);
  if (a === 'jtasks') return sheetJuniorsTasks();
  if (a === 'taskdone' || a === 'taskdel' || a === 'tasksend') { const t = (m.tasks || []).find(x => x.id === el.dataset.t); if (!t) return;
    if (a === 'tasksend') return sendTask(m, t);
    change(() => { if (a === 'taskdone') t.done = todayIso(); else t.deleted = true; logChange(m, 'Task ' + (a === 'taskdone' ? 'done' : 'removed') + ': ' + t.text); touch(m); });
    if ($('#sheet-root').innerHTML && /Juniors &amp; tasks/.test($('#sheet-root').innerHTML)) sheetJuniorsTasks(); else render(); return; }
  if (a === 'library') return sheetLibrary(m && m.id);
  if (a === 'templates') return sheetTemplates();
  if (a === 'authlist') { openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>Making list of authorities…</h1></div></div>`);
    try { const r = await makeAuthorityList(m); docReady(m, r, 'List of authorities', () => { closeSheet(); render(); }, 'Back to the matter'); } catch (er) { toast(er.message); closeSheet(); } }
});
