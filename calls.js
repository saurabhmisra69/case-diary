/* SM Chambers — talking to clients on the phone.
   1. Call: a button on matter cards, the matter page, the client page and Today. On the phone it opens the dialler with the
      client's number; on the computer it opens Phone Link (the call goes through the mobile). Mobile and alternate number
      can be added right there if missing.
   2. After the call: a short note of what was discussed (typed or spoken, English / हिंदी), saved as a call record with
      date and time on the matter (or on the client generally). A call-back can be planned in the same step.
   3. Planned calls: date, time and what about; shown on Today ("Calls to make") with a Call button.
   Stored in meta.calls and meta.callPlan (joined entry by entry across devices). The conversation itself is not recorded. */
'use strict';

const CL_I = {
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>'
};
const CL_PENDING = 'sm-call-pending';
const clCalls = () => (S.data?.meta?.calls || []).filter(c => !c.deleted);
const clPlans = () => (S.data?.meta?.callPlan || []).filter(p => !p.deleted);
const clNow = () => { const d = new Date(); return todayIso() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const clTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };
const clAt = at => { const [d, t] = String(at || '').split(' '); return dmy(d) + (t ? ', ' + clTime(t) : ''); };
const clIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const clKeyOf = m => clientKey(m.clients) || '';
function clName(k) { const g = clientGroups().find(x => x.key === k); return g ? g.name : k; }
function clMattersOf(k) { return live().filter(m => clientKey(m.clients) === k).sort((a, b) => (isOpen(b) - isOpen(a)) || ((b.u || 0) - (a.u || 0))); }

/* the numbers to ring: the matter's own, else the client's record */
function callNums(k, m) {
  const ci = typeof clientInfo === 'function' && k ? clientInfo(clName(k)) : {};
  const src = { phone: (m && m.phone) || ci.phone, altName: (m && m.altName) || ci.altName, altPhone: (m && m.altPhone) || ci.altPhone, whatsapp: (m && m.whatsapp) || ci.whatsapp };
  const out = [];
  if (src.phone) out.push({ who: clName(k).split(/\s*&\s*/)[0] || 'Client', num: src.phone, main: true });
  if (src.altPhone && src.altPhone !== src.phone) out.push({ who: src.altName || 'Alternate contact', num: src.altPhone });
  return { list: out, wa: phoneDigits(src.whatsapp) || phoneDigits(src.phone) };
}
const telOf = n => { const d = String(n || '').replace(/[^\d+]/g, ''); return d.length === 10 ? '+91' + d : d; };
const callBtn = (m, style) => `<button class="act call" data-act="call" data-id="${m.id}" style="${style || ''}">${CL_I.phone}Call</button>`;

function clChange(fn) { change(d => { d.meta = d.meta || {}; d.meta.calls = d.meta.calls || []; d.meta.callPlan = d.meta.callPlan || []; fn(d.meta, d); }); }

/* ---------- 1. the call sheet ---------- */
function sheetCall(o) {
  const m = o.mid ? find(o.mid) : null, k = o.k || (m ? clKeyOf(m) : ''); if (!k && !m) return;
  const nm = clName(k) || (m && m.clients) || 'Client', nums = callNums(k, m), plan = o.plan ? clPlans().find(p => p.id === o.plan) : null;
  const recent = clCalls().filter(c => c.k === k).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const pc = !(typeof isPhone === 'function' ? isPhone() : /Android|iPhone|iPad/i.test(navigator.userAgent));
  openSheet(`<div class="s-head"><div><small style="color:var(--wa)">Call client${m ? ' · ' + esc(mref(m)) : ''}</small><h1>${esc(nm)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${plan ? `<p class="hint" style="margin:0 0 8px">Planned for ${esc(dmy(plan.date))}${plan.time ? ', ' + clTime(plan.time) : ''}${plan.about ? ' — <b>' + esc(plan.about) + '</b>' : ''}</p>` : ''}
    ${nums.list.length ? `<div class="grp" style="gap:8px">${nums.list.map(x => `<a class="act call cl-big" href="tel:${esc(telOf(x.num))}" data-clnum="${esc(x.num)}" data-clwho="${esc(x.who)}">${CL_I.phone}<span>Call ${esc(x.who)}<small>${esc(x.num)}</small></span></a>`).join('')}
      ${nums.wa ? `<a class="act wa" style="min-height:44px" href="https://wa.me/${nums.wa}" target="_blank" rel="noopener" data-clwa="1">${I.wa}WhatsApp call <small style="font-weight:600;opacity:.8">&nbsp;(tap the phone icon there)</small></a>` : ''}</div>
      <p class="hint" style="margin:8px 0 0">${pc ? 'On the computer the call goes through <b>Phone Link</b> on your mobile — talk on the computer or the phone.' : 'The phone’s dialler opens with the number. Come back to SM Chambers after the call to note what was discussed.'}</p>
      <button type="button" class="linkbtn" data-cl="nums" style="margin-top:4px">Change / add numbers</button>`
    : `<p class="hint" style="margin:0 0 8px">No mobile number saved for ${esc(nm)}. Add it once — it is kept on the client and all ${esc(nm.split(' ')[0])}’s matters.</p>${clNumForm({})}`}
    <div class="two" style="margin-top:12px"><button class="act blue" data-cl="note" style="min-height:44px">Note a call</button><button class="act blue" data-cl="plan" style="min-height:44px">${plan ? 'Move this call' : 'Plan a call'}</button></div>
    ${plan ? `<button class="ghost" data-cl="plandone" style="width:100%;margin-top:8px">Mark this planned call done</button>` : ''}
    ${recent.length ? `<div class="grp"><span class="lbl">Last calls</span><div class="hist">${recent.map(clRow).join('')}</div></div>` : ''}`);
  const root = $('#sheet-root');
  root.onclick = e => {
    const a = e.target.closest('[data-clnum]');
    if (a) { clSetPending({ k, mid: m ? m.id : '', who: a.dataset.clwho, num: a.dataset.clnum, plan: plan ? plan.id : '', t: Date.now() }); setTimeout(() => sheetAfterCall(clGetPending()), 700); return; }
    if (e.target.closest('[data-clwa]')) { clSetPending({ k, mid: m ? m.id : '', who: 'WhatsApp', num: nums.wa, plan: plan ? plan.id : '', t: Date.now() }); setTimeout(() => sheetAfterCall(clGetPending()), 700); return; }
    const b = e.target.closest('[data-cl]'); if (!b) return;
    const w = b.dataset.cl;
    if (w === 'note') sheetAfterCall({ k, mid: m ? m.id : '', who: nums.list[0] ? nums.list[0].who : nm, num: nums.list[0] ? nums.list[0].num : '', plan: plan ? plan.id : '', manual: true });
    else if (w === 'plan') sheetPlanCall({ k, mid: m ? m.id : '', plan: plan ? plan.id : '' });
    else if (w === 'plandone') { clChange(mt => { const p = mt.callPlan.find(x => x.id === plan.id); if (p) { p.done = todayIso(); p.u = Date.now(); } }); closeSheet(); toast('Planned call marked done'); }
    else if (w === 'nums') { const box = $('#cl_numbox'); if (box) box.remove(); else b.insertAdjacentHTML('afterend', clNumForm(typeof clientInfo === 'function' ? clientInfo(nm) : {})); }
    else if (w === 'savenums') clSaveNums(k, m, () => sheetCall(o));
  };
}
const clNumForm = ci => `<div id="cl_numbox" class="grp" style="gap:10px;margin-top:6px">
    <div class="field"><label for="cl_phone">Client mobile</label><input class="in" id="cl_phone" type="tel" inputmode="tel" value="${esc(ci.phone || '')}" placeholder="10-digit mobile"></div>
    <div class="two"><div class="field"><label for="cl_altName">Alternate contact – name</label><input class="in" id="cl_altName" value="${esc(ci.altName || '')}" placeholder="e.g. son, pairokar"></div>
    <div class="field"><label for="cl_altPhone">Alternate mobile</label><input class="in" id="cl_altPhone" type="tel" inputmode="tel" value="${esc(ci.altPhone || '')}" placeholder="10-digit mobile"></div></div>
    <button class="save" type="button" data-cl="savenums">Save numbers</button></div>`;
function clSaveNums(k, m, done) {
  const v = { phone: $('#cl_phone').value.trim(), altName: $('#cl_altName').value.trim(), altPhone: $('#cl_altPhone').value.trim() };
  for (const f of ['phone', 'altPhone']) if (v[f] && String(v[f]).replace(/\D/g, '').length < 10) return toast('Enter a 10-digit mobile number');
  if (!v.phone && !v.altPhone) return toast('Enter at least one mobile number');
  change(d => {
    d.meta = d.meta || {};
    if (k) { const old = (d.meta.clientInfo || {})[k] || {}; d.meta.clientInfo = Object.assign({}, d.meta.clientInfo, { [k]: Object.assign({}, old, v) }); }
    for (const x of d.matters) if (!x.deleted && ((k && clientKey(x.clients) === k) || (m && x.id === m.id))) {
      let ch = false; for (const f of ['phone', 'altName', 'altPhone']) if (v[f] && x[f] !== v[f]) { x[f] = v[f]; ch = true; }
      if (ch) { logChange(x, 'Client numbers updated'); touch(x); }
    }
  });
  toast('Numbers saved'); done && done();
}

/* the call in progress survives the app being closed or reloaded by the phone */
function clSetPending(p) { try { localStorage.setItem(CL_PENDING, JSON.stringify(p)); } catch (e) {} }
function clGetPending() { try { const p = JSON.parse(localStorage.getItem(CL_PENDING) || 'null'); return p && Date.now() - p.t < 20 * 60e3 ? p : null; } catch (e) { return null; } }
function clClearPending() { try { localStorage.removeItem(CL_PENDING); } catch (e) {} }

/* ---------- 2. after the call ---------- */
const CL_QUICK = ['No answer', 'Busy / cut the call', 'Switched off / not reachable', 'Will call back'];
function sheetAfterCall(p) {
  if (!p) return;
  const k = p.k, nm = clName(k), ms = k ? clMattersOf(k) : (p.mid ? [find(p.mid)].filter(Boolean) : []);
  const tmr = (() => { const d = parseIso(todayIso()); d.setDate(d.getDate() + 1); return clIso(d); })();
  openSheet(`<div class="s-head"><div><small style="color:var(--wa)">${p.manual ? 'Note a call' : 'After the call'} · ${esc(clNow().split(' ')[1] ? clAt(clNow()) : '')}</small><h1>${esc(nm || 'Client')}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="grp" style="gap:12px">
      ${p.manual ? `<div class="two"><div class="field"><label for="ac_d">Date</label><input class="in" id="ac_d" type="date" value="${todayIso()}" max="${todayIso()}"></div><div class="field"><label for="ac_t">Time</label><input class="in" id="ac_t" type="time" value="${clNow().split(' ')[1]}"></div></div>` : ''}
      <div class="field"><label for="ac_who">Spoke with</label><input class="in" id="ac_who" value="${esc(p.who === 'WhatsApp' ? (nm || '').split(/\s*&\s*/)[0] : p.who || '')}" placeholder="name"></div>
      ${ms.length ? `<div class="field"><label for="ac_mid">About which matter</label><select class="in" id="ac_mid">${ms.map(x => `<option value="${x.id}" ${x.id === p.mid ? 'selected' : ''}>${esc(caseLine(x))}${x.title ? ' — ' + esc(x.title) : ''}${isOpen(x) ? '' : ' (closed)'}</option>`).join('')}<option value="" ${!p.mid && ms.length > 1 ? 'selected' : ''}>General — no particular matter</option></select></div>` : ''}
      <div class="chips" style="margin:0">${CL_QUICK.map(q => `<button type="button" class="chip" data-acq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <div class="field"><label for="ac_note">What was discussed? <small>(type or speak — English / हिंदी)</small></label>
        <textarea class="in" id="ac_note" rows="5" placeholder="e.g. Told him the next date is 12.12.2026; asked for the certified copy of the order and Aadhaar"></textarea>
        <div class="two" style="margin-top:6px"><button type="button" class="act blue" id="ac_mic" style="min-height:42px">${I.mic}<span>Speak</span></button><select class="in" id="ac_lang" style="min-height:42px"><option value="hi-IN">हिंदी / mixed</option><option value="en-IN">English</option></select></div></div>
      <div class="toggles"><label><span>Call back / plan the next call</span><input type="checkbox" id="ac_cb"></label></div>
      <div id="ac_cbbox" class="grp" style="gap:10px;display:none">
        <div class="two"><div class="field"><label for="ac_cbd">Date</label><input class="in" id="ac_cbd" type="date" value="${tmr}" min="${todayIso()}"></div><div class="field"><label for="ac_cbt">Time</label><input class="in" id="ac_cbt" type="time" value="11:00"></div></div>
        <div class="field"><label for="ac_cba">About</label><input class="in" id="ac_cba" placeholder="e.g. confirm documents received"></div></div>
      <button class="save" id="ac_save">Save call record</button>
      <button type="button" class="linkbtn" id="ac_skip">Don’t save — no record needed</button>
    </div>`);
  const note = $('#ac_note');
  $('#sheet-root').onclick = e => { const q = e.target.closest('[data-acq]'); if (q) { note.value = note.value.trim() ? note.value.trim() + '. ' + q.dataset.acq : q.dataset.acq; if (/no answer|busy|switched|call back/i.test(q.dataset.acq)) { $('#ac_cb').checked = true; $('#ac_cbbox').style.display = ''; } } };
  $('#ac_cb').onchange = e => { $('#ac_cbbox').style.display = e.target.checked ? '' : 'none'; };
  clMic($('#ac_mic'), note, () => $('#ac_lang').value);
  $('#ac_skip').onclick = () => { clStopMic(); clClearPending(); closeSheet(); };
  $('#ac_save').onclick = () => {
    clStopMic();
    const txt = note.value.trim(); if (!txt) return toast('Write a line on what was discussed, or tap “No answer”');
    const at = p.manual ? ($('#ac_d').value || todayIso()) + ' ' + ($('#ac_t').value || '00:00') : clNow();
    const mid = $('#ac_mid') ? $('#ac_mid').value : (p.mid || '');
    const cb = $('#ac_cb').checked ? { date: $('#ac_cbd').value, time: $('#ac_cbt').value, about: $('#ac_cba').value.trim() } : null;
    if (cb && !cb.date) return toast('Choose the date to call back');
    clChange(mt => {
      mt.calls.push({ id: uid(), k, mid, at, who: $('#ac_who').value.trim(), num: p.num || '', note: txt, u: Date.now() });
      if (p.plan) { const pl = mt.callPlan.find(x => x.id === p.plan); if (pl) { pl.done = todayIso(); pl.u = Date.now(); } }
      else for (const pl of mt.callPlan) if (!pl.deleted && !pl.done && pl.k === k && pl.date <= todayIso()) { pl.done = todayIso(); pl.u = Date.now(); }   // a due call to the same client is now made
      if (cb) mt.callPlan.push({ id: uid(), k, mid, date: cb.date, time: cb.time, about: cb.about || 'Call back', u: Date.now() });
    });
    clClearPending(); closeSheet(); toast(cb ? 'Call saved · call back on ' + dmy(cb.date) + (cb.time ? ', ' + clTime(cb.time) : '') : 'Call saved', 3500);
  };
}

/* speaking the note: the browser's own recogniser, phrase by phrase, until Stop */
const CLM = { rec: null, on: false };
function clStopMic() { CLM.on = false; try { CLM.rec && CLM.rec.stop(); } catch (e) {} CLM.rec = null; }
function clMic(btn, box, lang) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.style.display = 'none'; return; }
  const show = on => { btn.querySelector('span').textContent = on ? 'Stop' : 'Speak'; btn.classList.toggle('primary', on); btn.classList.toggle('blue', !on); };
  btn.onclick = () => {
    if (CLM.on) { clStopMic(); show(false); return; }
    CLM.on = true; show(true);
    const go = () => {
      const base = box.value.trim(), r = new SR(); CLM.rec = r; r.lang = lang(); r.interimResults = true;
      r.continuous = !/Android/i.test(navigator.userAgent);
      r.onresult = e => { const segs = []; let mid = '';
        for (let i = 0; i < e.results.length; i++) { const x = e.results[i], t = x[0].transcript.trim(); if (!t) continue; if (!x.isFinal) { mid = t; continue; } if (typeof dcMerge === 'function') dcMerge(segs, t); else segs.push(t); }
        box.value = [base, segs.join(' '), mid].filter(Boolean).join(' '); };
      r.onerror = e => { if (/not-allowed/.test(e.error)) { CLM.on = false; show(false); toast('Microphone permission is off for SM Chambers'); } };
      r.onend = () => { if (CLM.on && document.body.contains(box)) { try { go(); } catch (e) { CLM.on = false; show(false); } } else { CLM.on = false; show(false); } };
      try { r.start(); } catch (e) { CLM.on = false; show(false); }
    };
    go();
  };
}

/* ---------- 3. planned calls ---------- */
function sheetPlanCall(o) {
  const pl = o.plan ? clPlans().find(p => p.id === o.plan) : null, k = pl ? pl.k : o.k, nm = clName(k);
  const ms = k ? clMattersOf(k) : [];
  const tmr = (() => { const d = parseIso(todayIso()); d.setDate(d.getDate() + 1); return clIso(d); })();
  openSheet(`<div class="s-head"><div><small style="color:var(--wa)">${pl ? 'Planned call' : 'Plan a call'}</small><h1>${esc(nm || 'Client')}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="grp" style="gap:12px">
      <div class="two"><div class="field"><label for="pc_d">Date</label><input class="in" id="pc_d" type="date" value="${pl ? pl.date : tmr}"></div><div class="field"><label for="pc_t">Time <small>(optional)</small></label><input class="in" id="pc_t" type="time" value="${pl ? pl.time || '' : '11:00'}"></div></div>
      <div class="field"><label for="pc_a">About</label><input class="in" id="pc_a" value="${esc(pl ? pl.about || '' : '')}" placeholder="e.g. tell the next date; ask for fees; documents"></div>
      ${ms.length ? `<div class="field"><label for="pc_m">Matter</label><select class="in" id="pc_m">${ms.map(x => `<option value="${x.id}" ${x.id === (pl ? pl.mid : o.mid) ? 'selected' : ''}>${esc(caseLine(x))}${x.title ? ' — ' + esc(x.title) : ''}</option>`).join('')}<option value="" ${(pl ? !pl.mid : !o.mid) ? 'selected' : ''}>General — no particular matter</option></select></div>` : ''}
      <button class="save" id="pc_save">${pl ? 'Save changes' : 'Plan the call'}</button>
      ${pl ? '<button type="button" class="linkbtn" id="pc_del" style="color:var(--red)">Delete this planned call</button>' : ''}
    </div>`);
  $('#pc_save').onclick = () => {
    const v = { date: $('#pc_d').value, time: $('#pc_t').value, about: $('#pc_a').value.trim(), mid: $('#pc_m') ? $('#pc_m').value : (o.mid || '') };
    if (!v.date) return toast('Choose the date');
    clChange(mt => { if (pl) { const x = mt.callPlan.find(y => y.id === pl.id); if (x) Object.assign(x, v, { done: '', u: Date.now() }); } else mt.callPlan.push(Object.assign({ id: uid(), k, u: Date.now() }, v)); });
    closeSheet(); toast('Call planned for ' + dmy(v.date) + (v.time ? ', ' + clTime(v.time) : ''));
  };
  if (pl) $('#pc_del').onclick = () => { clChange(mt => { const x = mt.callPlan.find(y => y.id === pl.id); if (x) { x.deleted = true; x.u = Date.now(); } }); closeSheet(); toast('Planned call deleted'); };
}
const clDue = () => clPlans().filter(p => !p.done && p.date <= todayIso()).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
const clUpcoming = () => clPlans().filter(p => !p.done && p.date > todayIso()).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
function clPlanRow(p) {
  const m = p.mid ? find(p.mid) : null, late = p.date < todayIso();
  return `<div class="cl-plan${late ? ' late' : ''}"><div class="cl-when"><b>${p.date === todayIso() ? (p.time ? clTime(p.time) : 'Today') : dmy(p.date).slice(0, 5)}</b><small>${late ? 'overdue' : p.date === todayIso() ? (p.time ? 'today' : '') : DOWL[parseIso(p.date).getDay()].slice(0, 3) + (p.time ? ' ' + clTime(p.time) : '')}</small></div>
    <div class="m-col" data-act="clplanedit" data-p="${p.id}" style="cursor:pointer"><span class="m-title">${esc(clName(p.k) || 'Client')}</span><span class="m-meta">${esc(p.about || 'Call')}${m ? ' · ' + esc(caseLine(m)) : ''}</span></div>
    <button class="act call" data-act="clplancall" data-p="${p.id}">${CL_I.phone}Call</button></div>`;
}
/* Today: the calls to make (today and overdue) */
function callsToday() {
  const xs = clDue(); if (!xs.length) return '';
  return `<section class="card cl-today"><div class="h2" style="margin:0 0 6px"><h2 style="color:var(--wa)">Calls to make</h2><span class="sub">${xs.length} · <button class="linkbtn" data-act="callsall">All planned calls</button></span></div>${xs.map(clPlanRow).join('')}</section>`;
}
function callTile() {
  const due = clDue().length, up = clUpcoming();
  return `<button class="tile" style="background:var(--chip)" data-act="callsall"><span style="color:var(--wa)">Calls to make</span><b style="color:var(--wa)">${due}</b><span>${due ? 'Today and overdue' : up[0] ? 'Next: ' + dmy(up[0].date).slice(0, 5) + ' · ' + esc(clName(up[0].k).split(' ')[0]) : 'None planned'}</span></button>`;
}
function sheetCallsAll() {
  const due = clDue(), up = clUpcoming(), done = clCalls().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
  openSheet(`<div class="s-head"><div><small style="color:var(--wa)">Phone calls</small><h1>Planned calls</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <button class="act primary" data-act="clnewplan" style="width:100%;min-height:44px">+ Plan a call</button>
    <div class="grp"><span class="lbl">Today and overdue (${due.length})</span>${due.length ? due.map(clPlanRow).join('') : '<p class="hint" style="margin:0">None.</p>'}</div>
    <div class="grp"><span class="lbl">Coming up (${up.length})</span>${up.length ? up.map(clPlanRow).join('') : '<p class="hint" style="margin:0">None.</p>'}</div>
    ${done.length ? `<div class="grp"><span class="lbl">Recent calls</span><div class="hist">${done.map(c => clRow(c, true)).join('')}</div></div>` : ''}`);
}
function sheetPickClient() {
  const gs = clientGroups().filter(g => g.key !== '(no client name)');
  openSheet(`<div class="s-head"><div><small style="color:var(--wa)">Plan a call</small><h1>Which client?</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <label class="search">${I.search}<input type="search" id="pk_q" placeholder="Search clients"></label><div id="pk_l" class="list" style="margin-top:8px"></div>`);
  const draw = q => { const s = (q || '').toLowerCase(); $('#pk_l').innerHTML = gs.filter(g => !s || g.name.toLowerCase().includes(s)).slice(0, 40).map(g => `<button class="frow" data-pk="${esc(g.key)}"><span class="fname">${esc(g.name)}<small>${g.ms.length} matter${g.ms.length === 1 ? '' : 's'}${g.phone ? ' · ' + esc(g.phone) : ''}</small></span></button>`).join(''); };
  draw(''); $('#pk_q').oninput = e => draw(e.target.value);
  $('#pk_l').onclick = e => { const b = e.target.closest('[data-pk]'); if (b) sheetPlanCall({ k: b.dataset.pk }); };
}

/* ---------- call records: on the matter page and the client page ---------- */
function clRow(c, withName) {
  const m = c.mid ? find(c.mid) : null;
  return `<div><b>${esc(clAt(c.at))}</b><span>${withName ? '<b>' + esc(clName(c.k)) + '</b> · ' : ''}${c.who ? 'with ' + esc(c.who) : ''}${m && withName ? ' · ' + esc(caseLine(m)) : ''}${!c.mid ? ' · <i>general</i>' : ''}<br>${esc(c.note)}</span></div>`;
}
function callsSection(m) {
  const k = clKeyOf(m), cs = clCalls().filter(c => c.mid === m.id || (!c.mid && c.k && c.k === k)).sort((a, b) => b.at.localeCompare(a.at));
  const ps = clPlans().filter(p => !p.done && (p.mid === m.id || (!p.mid && p.k && p.k === k))).sort((a, b) => a.date.localeCompare(b.date));
  return `<section class="card"><div class="h2" style="margin-bottom:6px"><h2>Phone calls</h2><span class="sub">${cs.length} · <button class="linkbtn" data-act="clnote" data-id="${m.id}">+ Note a call</button> · <button class="linkbtn" data-act="clplan" data-id="${m.id}">Plan a call</button></span></div>
    ${ps.map(clPlanRow).join('')}
    ${cs.length ? `<div class="hist">${cs.slice(0, 8).map(c => clRow(c)).join('')}</div>${cs.length > 8 ? `<p class="hint" style="margin:6px 0 0">${cs.length - 8} earlier call${cs.length - 8 > 1 ? 's' : ''} kept.</p>` : ''}` : ps.length ? '' : '<p class="hint" style="margin:0">No calls noted yet.</p>'}</section>`;
}
function clientCallsHtml(k) {
  const cs = clCalls().filter(c => c.k === k).sort((a, b) => b.at.localeCompare(a.at)), ps = clPlans().filter(p => !p.done && p.k === k);
  return `<div class="two" style="margin-top:10px"><button class="act call" data-act="clcallk" data-k="${esc(k)}" style="min-height:48px">${CL_I.phone}Call</button><button class="act blue" data-act="clplank" data-k="${esc(k)}" style="min-height:48px">Plan a call</button></div>
    ${ps.length || cs.length ? `<div class="grp"><span class="lbl">Phone calls</span>${ps.map(clPlanRow).join('')}${cs.length ? `<div class="hist">${cs.slice(0, 5).map(c => clRow(c)).join('')}</div>` : ''}</div>` : ''}`;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'call') { e.stopPropagation(); const m = find(el.dataset.id); if (m) sheetCall({ mid: m.id, k: clKeyOf(m) }); }
  else if (a === 'clcallk') sheetCall({ k: el.dataset.k });
  else if (a === 'clplank') sheetPlanCall({ k: el.dataset.k });
  else if (a === 'clnote') { const m = find(el.dataset.id); if (m) { const n = callNums(clKeyOf(m), m).list[0]; sheetAfterCall({ k: clKeyOf(m), mid: m.id, who: n ? n.who : '', num: n ? n.num : '', manual: true }); } }
  else if (a === 'clplan') { const m = find(el.dataset.id); if (m) sheetPlanCall({ k: clKeyOf(m), mid: m.id }); }
  else if (a === 'clplancall') { const p = clPlans().find(x => x.id === el.dataset.p); if (p) sheetCall({ k: p.k, mid: p.mid, plan: p.id }); }
  else if (a === 'clplanedit') { const p = clPlans().find(x => x.id === el.dataset.p); if (p) sheetPlanCall({ plan: p.id }); }
  else if (a === 'callsall') sheetCallsAll();
  else if (a === 'clnewplan') sheetPickClient();
}, true);

/* back from the phone call: the after-call note is waiting (also if the phone reloaded the app meanwhile) */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return; const p = clGetPending(); if (!p || !S.data) return;
  if (!document.getElementById('ac_note')) sheetAfterCall(p);
});
window.addEventListener('load', () => setTimeout(() => { const p = clGetPending(); if (p && S.data && !document.getElementById('ac_note') && !document.getElementById('welcome')) sheetAfterCall(p); else if (!p) clClearPending(); }, 2500));

/* the after-call note closed in any way (×, tap outside, Back) is not asked again */
(function () { const orig = closeSheet; closeSheet = function () { if (document.getElementById('ac_note')) { clStopMic(); clClearPending(); } return orig.apply(this, arguments); }; })();
