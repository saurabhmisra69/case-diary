/* SM Chambers — how a matter moves: Consultation → Fee received → Preparation → Filed → In court → Decided.
   One matter, one reference (SM/2026-0xx) from the first meeting to the judgment.
   A client can be entered first, before any matter; "Start consultation" then opens his first matter. */
'use strict';

const STAGES = [['consult', 'Consultation'], ['fee', 'Fee received'], ['prep', 'Preparation'], ['filed', 'Filed'], ['court', 'In court'], ['decided', 'Decided']];
const STAGE_NAME = Object.fromEntries(STAGES);
const STAGE_I = Object.fromEntries(STAGES.map(([k], i) => [k, i]));

/* the stage of a matter: what was set by hand, else worked out from what the matter already has */
function stageOf(m) {
  if (!m) return 'consult';
  if (!isOpen(m)) return 'decided';
  let s = STAGE_I[m.stage] != null && m.stage !== 'decided' ? m.stage : '';
  if (!s) s = m.forum === 'Advisory' ? 'consult' : m.status === 'Not filed' ? 'prep' : 'court';
  if (s === 'filed' && (m.nextDate || (m.hearings || []).some(h => h.happened && !['Listed', 'Filed', 'Converted to case'].includes(h.happened)))) s = 'court';   // listed after filing
  return s;
}
const stageCount = k => live().filter(m => !isRetainer(m) && stageOf(m) === k).length;

function stageStrip(m) {
  if (isRetainer(m)) return '';
  const cur = stageOf(m), ci = STAGE_I[cur];
  const next = cur === 'consult' ? 'fee' : cur === 'fee' ? 'prep' : cur === 'prep' ? 'filed' : cur === 'filed' ? 'court' : '';
  return `<div class="stagebar" aria-label="Stage of this matter">${STAGES.map(([k, l], i) => `<span class="stg ${i < ci ? 'done' : i === ci ? 'on' : ''}">${i < ci ? '✓ ' : ''}${esc(l)}</span>`).join('<span class="stg-sep">›</span>')}</div>
    ${next ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0 10px"><button class="act primary" data-act="stage" data-id="${m.id}" data-to="${next}" style="min-height:40px">Next: ${esc(STAGE_NAME[next])} ›</button>${ci > 0 && cur !== 'court' ? `<button class="linkbtn" data-act="stageback" data-id="${m.id}">Move back</button>` : ''}</div>` : ''}`;
}

function setStage(m, to, note) {
  const from = stageOf(m);
  change(() => { m.stage = to; logChange(m, 'Stage: ' + STAGE_NAME[from] + ' → ' + STAGE_NAME[to] + (note ? ' (' + note + ')' : '')); touch(m); });
}

function sheetStage(m, to) {
  const back = () => openMatter(m.id);
  const head = (t, sub) => `<div class="s-head"><div><small>${esc(mref(m))} · ${esc(m.title || m.clients || '')}</small><h1>${t}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>${sub ? `<p class="hint" style="margin-top:0">${sub}</p>` : ''}`;
  const recd = num(m.feeReceived), agreed = num(m.feeAgreed), due = feeDue(m);
  const feeLine = `<div class="kv"><span>Fees agreed</span><b>${agreed ? rupees(agreed) : '—'}</b><span>Received</span><b>${rupees(recd)}</b><span>Balance</span><b style="color:${due ? 'var(--saffron-ink)' : 'inherit'}">${rupees(due)}</b></div>`;
  if (to === 'fee') {
    openSheet(head('Fee received?', 'Record the payment so the receipt, TDS and the CA register are right — then move on.') + feeLine + `
      <div class="grp" style="gap:8px;margin-top:12px"><button class="save" data-sg="pay">+ Record the payment</button>
      ${recd ? `<button class="ghost" data-sg="go">Fee is received — move to “Fee received”</button>` : `<button class="ghost" data-sg="go">Move on without recording a payment</button>`}
      <button class="linkbtn" data-sg="back">‹ Back</button></div>`);
  } else if (to === 'prep') {
    openSheet(head('Start preparing the case', 'Drafts, Draft with Claude, Research and the matter folder are on the matter page.') + feeLine + `
      <div class="grp" style="gap:8px;margin-top:12px"><button class="save" data-sg="go">Move to “Preparation”</button><button class="linkbtn" data-sg="back">‹ Back</button></div>`);
  } else if (to === 'filed') {
    const fopt = Object.entries(FORUMS).filter(([k]) => k !== 'Advisory').map(([k, f]) => `<option value="${k}" ${k === (m.forum !== 'Advisory' ? m.forum : 'HC') ? 'selected' : ''}>${f.label}</option>`).join('');
    const courts = [...new Set(live().map(x => x.court).filter(Boolean))];
    const unpaid = !recd || due > 0;
    openSheet(head('Filed in court', 'The same matter continues — its reference stays ' + esc(mref(m)) + '.') + `
      ${unpaid ? `<div class="card" style="background:var(--saffron-soft);box-shadow:none;padding:12px 14px;margin-bottom:10px"><b style="color:var(--saffron-ink)">${recd ? 'Fee not fully received' : 'No fee received yet'}</b><br><span style="font-size:14px">${recd ? rupees(due) + ' is still due.' : 'Nothing is recorded as received' + (agreed ? ' of ' + rupees(agreed) : '') + '.'} You file only after the fee is received.</span><br><button class="linkbtn" data-sg="pay" style="margin-top:4px">Record the payment first</button></div>` : ''}
      <form id="sg_form" class="grp" style="gap:12px">
        <div class="field"><label for="sg_title">Parties (title) as filed</label><input class="in" id="sg_title" value="${esc(/ – consultation$| – /.test(m.title || '') && m.forum === 'Advisory' ? '' : m.title || '')}" placeholder="e.g. ${esc(clientName(m.clients) || 'Client')} v. State of U.P."></div>
        <div class="field"><label for="sg_side">Appearing for</label><input class="in" id="sg_side" value="${esc(m.side || '')}" placeholder="e.g. Applicant, Petitioner, Complainant"></div>
        <div class="two"><div class="field"><label for="sg_on">Filed on</label><input class="in" type="date" id="sg_on" value="${todayIso()}" required></div><div class="field"><label for="sg_forum">Forum</label><select class="in" id="sg_forum">${fopt}</select></div></div>
        <div class="field"><label for="sg_court">Hon'ble Court</label><input class="in" id="sg_court" list="sg_courts" value="${esc(m.forum !== 'Advisory' ? m.court || '' : '')}" placeholder="e.g. High Court, Lucknow Bench"><datalist id="sg_courts">${courts.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="two"><div class="field"><label for="sg_type">Type</label><select class="in" id="sg_type"><option value=""></option>${TYPES.map(t => `<option ${t === m.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div><div class="field"><label for="sg_fno">Filing no.</label><input class="in" id="sg_fno" value="${esc(m.filingNo || '')}"></div></div>
        <div class="two"><div class="field"><label for="sg_cno">Case no. <small>(if given)</small></label><input class="in" id="sg_cno" value="${esc(m.caseNo || '')}" placeholder="e.g. 8027/2026"></div><div class="field"><label for="sg_cnr">CNR <small>(if given)</small></label><input class="in" id="sg_cnr" value="${esc(m.cnr || '')}" style="text-transform:uppercase;font-family:var(--mono)"></div></div>
        <button class="save" type="submit">${unpaid ? 'File anyway' : 'Mark as filed'}</button><button type="button" class="linkbtn" data-sg="back">‹ Back</button></form>`);
    $('#sg_form').onsubmit = e => { e.preventDefault();
      if (unpaid && !confirm((recd ? rupees(due) + ' of the fee is still due.' : 'No fee is recorded as received.') + ' Mark it filed anyway?')) return;
      const v = id => $('#' + id).value.trim();
      const fromStage = stageOf(m);
      change(() => {
        const was = m.forum;
        const set = { title: v('sg_title') || m.title, side: v('sg_side') || m.side, forum: v('sg_forum'), court: v('sg_court') || m.court, type: v('sg_type') || m.type, filingNo: v('sg_fno'), caseNo: v('sg_cno') || m.caseNo, cnr: v('sg_cnr').toUpperCase() || m.cnr, filedOn: v('sg_on') };
        if (was === 'Advisory' || !OPEN_STATUSES.includes(m.status) || m.status === 'Not filed') set.status = 'Pending';
        logDiff(m, { ...m }, set, 'Filed');
        if (was === 'Advisory') { m.prelit = { status: m.status, till: set.filedOn, from: m.created || '' };
          m.hearings = m.hearings || []; m.hearings.push({ date: set.filedOn, happened: 'Filed', note: 'Consultation stage closed; filed' + (set.type ? ' as ' + set.type : '') + (set.court ? ' before ' + set.court : '') + (set.filingNo ? ', filing no. ' + set.filingNo : '') + '.' }); }
        Object.assign(m, set); m.stage = 'filed'; m.calPending = true; m.closedOn = '';
        logChange(m, 'Stage: ' + STAGE_NAME[fromStage] + ' → Filed on ' + dmy(set.filedOn) + (unpaid ? ' (fee ' + (recd ? rupees(due) + ' due' : 'not received') + ')' : ''));
        touch(m);
      });
      toast('Filed on ' + dmy(v('sg_on')) + ' — give the first date when it is listed'); back(); };
  } else if (to === 'court') {
    openSheet(head('Listed in court', 'Usually this happens by itself when you record the first date. Record the date now, or just move the stage.') + `
      <div class="grp" style="gap:8px;margin-top:12px"><button class="save" data-sg="date">Record the first date</button><button class="ghost" data-sg="go">Move to “In court”</button><button class="linkbtn" data-sg="back">‹ Back</button></div>`);
  }
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-sg]'); if (!b) return;
    if (b.dataset.sg === 'back') return back();
    if (b.dataset.sg === 'pay') return sheetPay(m);
    if (b.dataset.sg === 'date') return sheetRecord(m);
    if (b.dataset.sg === 'go') { setStage(m, to); toast(STAGE_NAME[to]); return back(); } };
}

/* Today: work in hand, before it reaches court */
function pipelineToday() {
  const rows = [['consult', 'Consultations', 'var(--adv, #6B5B95)'], ['fee', 'Fee received — to prepare', 'var(--dc-ink)'], ['prep', 'Being prepared — to file', 'var(--saffron-ink)'], ['filed', 'Filed — first date awaited', 'var(--hc)']]
    .map(([k, l, c]) => [k, l, c, stageCount(k)]).filter(r => r[3]);
  if (!rows.length) return '';
  return `<section class="list"><div class="h2"><h2>Work in hand</h2><span class="sub">before court</span></div>
    <div class="card" style="padding:4px 0">${rows.map(([k, l, c, n]) => `<button class="frow" data-act="filter" data-f="st_${k}" style="width:100%"><span class="fname"><b style="color:${c}">${esc(l)}</b></span><b style="font-family:var(--mono)">${n}</b></button>`).join('')}</div></section>`;
}

/* Clients: a new client before any matter */
function sheetNewClient() {
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">Clients</small><h1>New client</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="nc_form" class="grp" style="gap:12px" autocomplete="off">
      <div class="field"><label for="nc_name">Client name</label><input class="in" id="nc_name" required placeholder="e.g. Anuj Gupta, or M/s Maa Gayatri Enterprises"></div>
      <p class="hint" id="nc_same" style="margin:0;color:var(--saffron-ink)"></p>
      <div class="field"><label for="nc_aka">Also known as <small>(one per line)</small></label><textarea class="in" id="nc_aka" rows="2"></textarea></div>
      <div class="two"><div class="field"><label for="nc_phone">Mobile</label><input class="in" id="nc_phone" type="tel"></div><div class="field"><label for="nc_whatsapp">WhatsApp no.</label><input class="in" id="nc_whatsapp" type="tel" placeholder="blank = same as mobile"></div></div>
      <div class="field"><label for="nc_email">Email</label><input class="in" id="nc_email" type="email"></div>
      <div class="two"><div class="field"><label for="nc_altName">Alternate contact – name</label><input class="in" id="nc_altName"></div><div class="field"><label for="nc_altPhone">Alternate mobile</label><input class="in" id="nc_altPhone" type="tel"></div></div>
      <div class="field"><label for="nc_address">Address</label><textarea class="in" id="nc_address" rows="2"></textarea></div>
      <div class="field"><label for="nc_pan">PAN / GSTIN</label><input class="in" id="nc_pan"></div>
      <div class="field"><label for="nc_notes">Referred by / notes</label><textarea class="in" id="nc_notes" rows="2"></textarea></div>
      <div class="field"><label for="nc_about">What he has come for <small>(for the consultation)</small></label><input class="in" id="nc_about" placeholder="e.g. FIR lodged against him; wants anticipatory bail"></div>
      <button class="save" type="submit">Save and start consultation</button><button type="button" class="ghost" data-nc="only">Save client only</button></form>`);
  const nm = $('#nc_name');
  nm.oninput = () => { const k = clientKey(nm.value), g = k && clientGroups().find(x => x.key === k); $('#nc_same').textContent = g ? 'Already a client: ' + g.name + ' (' + g.ms.length + ' matter' + (g.ms.length === 1 ? '' : 's') + '). Saving adds these details to him.' : ''; };
  const save = startConsult => {
    const name = nm.value.trim().replace(/\s+/g, ' '); if (!name) return toast('Enter the client’s name');
    const v = id => ($('#nc_' + id).value || '').trim();
    change(d => {
      d.meta = d.meta || {};
      const k = clientKey(name);
      if (!live().some(m => clientKey(m.clients) === k)) d.meta.clientList = Object.assign({}, d.meta.clientList, { [k]: { name, added: todayIso() } });
      const aka = v('aka').split(/\n|;/).map(x => x.trim()).filter(Boolean); if (aka.length) setAliases(d, name, [...aliasesOf(name), ...aka]);
      const old = (d.meta.clientInfo || {})[clientKey(name)] || {}, info = { ...old };
      for (const f of ['phone', 'whatsapp', 'email', 'altName', 'altPhone', 'address', 'pan', 'notes']) if (v(f)) info[f] = v(f);
      d.meta.clientInfo = Object.assign({}, d.meta.clientInfo, { [clientKey(name)]: info });
    });
    if (!startConsult) { toast('Client saved: ' + name); return sheetClient(clientKey(name)); }
    startConsultation(name, v('about'));
  };
  $('#nc_form').onsubmit = e => { e.preventDefault(); save(true); };
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-nc="only"]')) save(false); };
}
/* the client's first (or next) matter, starting as a consultation */
function startConsultation(name, about) {
  const y = new Date().getFullYear(), ci = typeof clientInfo === 'function' ? clientInfo(name) : {};
  const rec = touch({ id: uid(), year: y, n: nextNumber(y), hearings: [], created: todayIso(), forum: 'Advisory', status: 'Instructions received', nature: 'Other', stage: 'consult',
    clients: name, title: about ? clientName(name) + ' – ' + about : clientName(name) + ' – consultation', notes: about || '' });
  for (const k of CI_TO_MATTER) if (ci[k]) rec[k] = ci[k];
  const cc = typeof codeOfClient === 'function' ? codeOfClient(name) : ''; if (cc) rec.clientCode = cc;
  rec.no = rec.year + '/' + rec.n;
  change(d => { d.matters.push(rec); logChange(rec, 'Stage: Consultation (client came ' + dmy(todayIso()) + ')'); });
  toast('Consultation opened: ' + mref(rec)); openMatter(rec.id);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="stage"],[data-act="stageback"],[data-act="newclient"],[data-act="consult"]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'newclient') return sheetNewClient();
  if (a === 'consult') { const g = clientGroups().find(x => x.key === b.dataset.k); return startConsultation(g ? g.name : b.dataset.k, ''); }
  const m = find(b.dataset.id); if (!m) return;
  if (a === 'stage') return sheetStage(m, b.dataset.to);
  const cur = STAGE_I[stageOf(m)]; if (cur > 0 && confirm('Move ' + mref(m) + ' back to “' + STAGES[cur - 1][1] + '”?')) { setStage(m, STAGES[cur - 1][0], 'moved back'); openMatter(m.id); }
});
