/* SM Chambers — share with a client (or a junior): matter update, document, fee reminder or contact card,
   by WhatsApp, Email, SMS, or all three one after another. Nothing is sent without the advocate tapping Send in that app. */
'use strict';

const emailOf = m => String(m.email || '').trim();
const smsNo = p => { const d = phoneDigits(p); return d ? '+' + d : ''; };
const SIGN = '\n\nSaurabh Misra, Advocate\n' + ADV.phone.split(',')[0].trim();
function updateText(m) {
  const lastH = (m.hearings || []).filter(h => h.date <= todayIso() && h.happened && h.happened !== 'Listed').slice(-1)[0];
  return `Namaste.\nUpdate in your matter: ${m.title || m.clients}${m.caseNo ? '\n' + (m.type ? m.type + ' ' : '') + 'No. ' + m.caseNo : ''}${m.court ? "\nHon'ble Court: " + m.court : ''}` +
    (lastH ? `\n\nOn ${dmy(lastH.date)}: ${lastH.happened}${lastH.note ? ' — ' + lastH.note : ''}.` : '') +
    (m.nextDate ? `\nNext date: ${dmy(m.nextDate)} (${DOWL[parseIso(m.nextDate).getDay()]})${m.purpose ? ' for ' + m.purpose : ''}${m.item ? ', item ' + m.item : ''}.` : m.status && !isOpen(m) ? `\nStatus: ${m.status}${m.outcome ? ' (' + m.outcome + ')' : ''}.` : '\nThe next date is awaited; I will inform you.') + SIGN;
}
function feeText(m, due) {
  const b = (m.bills || []).filter(x => !x.state && billPaid(m, x) < num(x.total)).slice(-1)[0];
  return `Namaste.\nA gentle reminder: ${rupees(due)} is pending towards professional fees in your matter: ${m.title}${m.caseNo ? ' (' + m.caseNo + ')' : ''}.${b ? '\nBill No. ' + b.no + ' dated ' + dmy(b.date) + '.' : ''}\n\nPayment may be made to:\nSaurabh Misra\nA/c ${BANK.acct}, ${BANK.bank}, ${BANK.branch}\nIFSC ${BANK.ifsc}\nUPI ${BANK.upi}\n\nKindly ignore if already paid.` + SIGN;
}
function cardText(gr) {
  const m0 = gr.ms[0];
  return `Client: ${gr.name}${gr.phone ? '\nMobile: ' + gr.phone : ''}${m0.whatsapp ? '\nWhatsApp: ' + m0.whatsapp : ''}${emailOf(m0) ? '\nEmail: ' + emailOf(m0) : ''}${m0.altPhone ? '\nAlternate: ' + (m0.altName ? m0.altName + ' ' : '') + m0.altPhone : ''}\n\nMatters:\n` +
    gr.ms.filter(isOpen).map(m => `• ${m.title}${m.caseNo ? ' — ' + (m.type ? m.type + ' ' : '') + m.caseNo : ''}${m.court ? ', ' + m.court : ''}${m.nextDate ? ', next ' + dmy(m.nextDate) : ''}`).join('\n');
}
function groupOf(m) { const k = clientKey(m.clients) || '(no client name)'; return clientGroups().find(x => x.key === k) || { key: k, name: m.clients, ms: [m], phone: m.phone }; }
async function viewLink(itemId) {
  const r = await g('/me/drive/items/' + itemId + '/createLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'view', scope: 'anonymous' }) });
  if (!r.ok) throw new Error('OneDrive ' + r.status); return (await r.json()).link.webUrl;
}
const CH = { wa: 'WhatsApp', email: 'Email', sms: 'SMS' };
function channelUrl(ch, to, subject, text) {
  if (ch === 'wa') return 'https://wa.me/' + (to.wa || '') + '?text=' + encodeURIComponent(text);
  if (ch === 'sms') return 'sms:' + (to.sms || '') + '?body=' + encodeURIComponent(text);
  return 'mailto:' + encodeURIComponent(to.email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
}

/* the sheet: what → to whom → how */
async function sheetShare(m, what) {
  const gr = groupOf(m), st = { what: what || 'update', mid: m.id, doc: null, docs: null, to: 'client', other: { wa: '', email: '' }, ch: (() => { try { return JSON.parse(localStorage.getItem('cd.sharech') || '["wa"]'); } catch (e) { return ['wa']; } })() };
  const cur = () => find(st.mid) || m;
  const draw = () => {
    const mm = cur(), due = feeDue(mm), J = typeof juniors === 'function' ? juniors() : [];
    const to = st.to === 'client' ? { wa: waOf(mm), sms: smsNo(mm.whatsapp || mm.phone), email: emailOf(mm) || gr.ms.map(emailOf).find(Boolean) || '' }
      : st.to.startsWith('j:') ? (j => ({ wa: phoneDigits(j && j.phone), sms: smsNo(j && j.phone), email: '' }))(J.find(x => x.id === st.to.slice(2))) : { wa: phoneDigits(st.other.wa), sms: smsNo(st.other.wa), email: st.other.email };
    st.toNow = to;
    openSheet(`<div class="s-head"><div><small>${esc(gr.name)}</small><h1>Share</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <span class="lbl">What</span><div class="chips">${[['update', 'Matter update'], ['doc', 'Document'], ['fee', 'Fee reminder'], ['card', 'Contact card']].map(([k, l]) => `<button class="chip ${st.what === k ? 'on' : ''}" data-sc="what" data-v="${k}">${l}</button>`).join('')}</div>
      ${st.what !== 'card' && gr.ms.length > 1 ? `<div class="field" style="margin-top:10px"><label for="sc_m">MATTER</label><select class="in" id="sc_m">${gr.ms.map(x => `<option value="${x.id}" ${x.id === st.mid ? 'selected' : ''}>${esc(mref(x))} · ${esc((x.title || '').slice(0, 50))}</option>`).join('')}</select></div>` : ''}
      ${st.what === 'doc' ? docPicker(mm) : ''}
      ${st.what === 'fee' && !due ? '<p class="hint" style="color:var(--dc-ink)">No fee is pending in this matter.</p>' : ''}
      <span class="lbl" style="margin-top:12px;display:block">To</span><div class="chips"><button class="chip ${st.to === 'client' ? 'on' : ''}" data-sc="to" data-v="client">Client</button>${J.map(j => `<button class="chip ${st.to === 'j:' + j.id ? 'on' : ''}" data-sc="to" data-v="j:${j.id}">${esc(j.name)}</button>`).join('')}<button class="chip ${st.to === 'other' ? 'on' : ''}" data-sc="to" data-v="other">Someone else</button></div>
      ${st.to === 'other' ? `<div class="two" style="margin-top:8px"><div class="field"><label for="sc_ow">MOBILE / WHATSAPP</label><input class="in" id="sc_ow" inputmode="tel" value="${esc(st.other.wa)}"></div><div class="field"><label for="sc_oe">EMAIL</label><input class="in" id="sc_oe" type="email" value="${esc(st.other.email)}"></div></div>` : ''}
      <p class="hint" style="margin:6px 0 0">${to.wa ? 'WhatsApp/SMS: +' + esc(to.wa) : '<span style="color:var(--red)">No mobile number</span>'} · ${to.email ? 'Email: ' + esc(to.email) : '<span style="color:var(--red)">No email</span>'}${st.to === 'client' && !to.email ? ` <button class="linkbtn" data-act="edit" data-id="${mm.id}">Add email</button>` : ''}</p>
      <span class="lbl" style="margin-top:12px;display:block">How</span><div class="chips">${Object.entries(CH).map(([k, l]) => `<button class="chip ${st.ch.includes(k) ? 'on' : ''}" data-sc="ch" data-v="${k}">${l}</button>`).join('')}<button class="chip ${st.ch.length === 3 ? 'on' : ''}" data-sc="all">All three</button></div>
      <div class="field" style="margin-top:12px"><label for="sc_txt">MESSAGE (YOU CAN CHANGE IT)</label><textarea class="in" id="sc_txt" rows="9">${esc(st.text || '')}</textarea></div>
      <button class="save" data-sc="send">${st.ch.length > 1 ? 'Send — ' + st.ch.map(c => CH[c]).join(', then ') : 'Send by ' + CH[st.ch[0]]}</button>
      ${st.what === 'doc' && navigator.canShare ? '<button class="ghost" data-sc="file" style="width:100%;margin-top:8px">Send the file itself instead</button>' : ''}`);
  };
  const build = async () => {
    const mm = cur();
    if (st.what === 'update') st.text = updateText(mm);
    else if (st.what === 'fee') st.text = feeText(mm, feeDue(mm));
    else if (st.what === 'card') st.text = cardText(gr);
    else if (st.what === 'doc') {
      if (!st.doc) st.text = 'Pick the document above.';
      else { if (!st.doc.link) { st.text = 'Making a link…'; draw(); try { st.doc.link = await viewLink(st.doc.id); } catch (e) { st.doc.link = ''; toast('Could not make a link: ' + e.message); } }
        st.text = `Namaste.\nPlease find the ${st.doc.label || st.doc.name} in your matter: ${mm.title}${mm.caseNo ? ' (' + mm.caseNo + ')' : ''}.\n${st.doc.link || '(link could not be made — use "Send the file itself")'}` + SIGN; }
    }
    st.subject = (st.what === 'fee' ? 'Fee reminder — ' : st.what === 'doc' ? (st.doc ? st.doc.label || st.doc.name : 'Document') + ' — ' : st.what === 'card' ? 'Client details — ' : 'Matter update — ') + (st.what === 'card' ? gr.name : mm.title);
    draw();
  };
  const loadDocs = async () => {
    const mm = cur(), list = [];
    (mm.bills || []).filter(b => b.fileId).forEach(b => list.push({ id: b.fileId, name: 'Bill ' + b.no, label: 'Bill No. ' + b.no + (b.state ? ' (CANCELLED)' : '') }));
    (mm.letters || []).filter(l => l.fileId).forEach(l => list.push({ id: l.fileId, name: (l.kind || 'Letter') + ' ' + l.no, label: (l.kind || 'Letter') + ' Ref. ' + l.no }));
    if (mm.folderId) { try { const kids = await listChildren(mm.folderId); for (const k of kids) { if (k.file) list.push({ id: k.id, name: k.name }); else if (k.folder && /^[1-5]\s/.test(k.name)) { (await listChildren(k.id)).filter(x => x.file).forEach(x => list.push({ id: x.id, name: k.name + ' › ' + x.name, label: x.name.replace(/\.[^.]+$/, '') })); } } } catch (e) {} }
    st.docs = list; draw();
  };
  const docPicker = mm => !mm.folderId && !(mm.bills || []).length ? '<p class="hint" style="color:var(--red)">This matter has no folder linked, so there is no document to send.</p>'
    : st.docs === null ? '<p class="hint">Reading the matter folder…</p>' : `<div class="field" style="margin-top:10px"><label for="sc_doc">DOCUMENT</label><select class="in" id="sc_doc"><option value="">Choose…</option>${st.docs.map(d => `<option value="${d.id}" ${st.doc && st.doc.id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>`;
  const root = $('#sheet-root');
  root.onchange = async e => {
    if (e.target.id === 'sc_m') { st.mid = e.target.value; st.doc = null; st.docs = null; if (st.what === 'doc') loadDocs(); return build(); }
    if (e.target.id === 'sc_doc') { st.doc = (st.docs || []).find(d => d.id === e.target.value) || null; return build(); }
  };
  root.oninput = e => { if (e.target.id === 'sc_txt') st.text = e.target.value; if (e.target.id === 'sc_ow') st.other.wa = e.target.value; if (e.target.id === 'sc_oe') st.other.email = e.target.value; };
  root.onclick = async e => {
    const b = e.target.closest('[data-sc]'); if (!b) return;
    const a = b.dataset.sc;
    if (a === 'what') { st.what = b.dataset.v; if (st.what === 'doc' && st.docs === null) loadDocs(); return build(); }
    if (a === 'to') { st.to = b.dataset.v; if (st.what === 'card' && st.to === 'client') toast('A contact card is usually sent to a junior'); return draw(); }
    if (a === 'ch') { const i = st.ch.indexOf(b.dataset.v); if (i < 0) st.ch.push(b.dataset.v); else if (st.ch.length > 1) st.ch.splice(i, 1); st.ch.sort((x, y) => 'wa sms email'.indexOf(x) - 'wa sms email'.indexOf(y)); return draw(); }
    if (a === 'all') { st.ch = ['wa', 'sms', 'email']; return draw(); }
    if (a === 'file') { const r = await g('/me/drive/items/' + st.doc.id + '/content'); const f = new File([await r.blob()], st.doc.name.split(' › ').pop()); try { await navigator.share({ files: [f], text: st.text }); } catch (er) {} return; }
    if (a === 'send') {
      st.text = $('#sc_txt').value; const to = st.toNow, miss = st.ch.filter(c => (c === 'email' ? !to.email : !to.wa));
      if (miss.length === st.ch.length) return toast('No ' + (miss.includes('email') ? 'email / ' : '') + 'mobile number for this person');
      try { localStorage.setItem('cd.sharech', JSON.stringify(st.ch)); } catch (er) {}
      const chans = st.ch.filter(c => !miss.includes(c)), mm = cur();
      change(() => { logChange(mm, 'Shared ' + ({ update: 'matter update', doc: 'document', fee: 'fee reminder', card: 'contact card' })[st.what] + (st.doc ? ' (' + st.doc.name + ')' : '') + ' by ' + chans.map(c => CH[c]).join(', ')); if (st.what === 'fee') mm.lastReminder = todayIso(); touch(mm); });
      if (chans.length === 1) { window.open(channelUrl(chans[0], to, st.subject, st.text), '_blank'); return; }
      // several channels: browsers allow one app per tap, so each gets its own button
      openSheet(`<div class="s-head"><div><small>${esc(gr.name)}</small><h1>Send ${chans.length} ways</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
        <p class="hint">Tap each in turn. Come back to this app after sending each one.</p>
        <div class="grp" style="gap:10px">${chans.map((c, i) => `<a class="act ${c === 'wa' ? 'wa' : i ? 'blue' : 'primary'}" style="min-height:52px" href="${esc(channelUrl(c, to, st.subject, st.text))}" target="_blank" rel="noopener" data-sent="${c}">${i + 1}. Send by ${CH[c]}${miss.includes(c) ? ' (no number)' : ''}</a>`).join('')}${miss.map(c => `<p class="hint" style="color:var(--red)">${CH[c]}: no ${c === 'email' ? 'email' : 'number'} saved</p>`).join('')}</div>`);
      $('#sheet-root').onclick = ev => { const x = ev.target.closest('[data-sent]'); if (x) setTimeout(() => { x.textContent = '✓ ' + x.textContent.replace(/^✓ /, ''); x.style.opacity = '.6'; }, 300); };
    }
  };
  if (st.what === 'doc') loadDocs();
  await build();
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="share"],[data-act="shareclient"]'); if (!el) return;
  if (el.dataset.act === 'share') { const m = find(el.dataset.id); if (m) sheetShare(m, el.dataset.w); }
  else { const gr = clientGroups().find(x => x.key === el.dataset.k); if (gr && !gr.ms.length) return toast('Start a consultation first — sharing works from his matters'); if (gr) sheetShare(gr.ms.slice().sort((a, b) => (b.u || 0) - (a.u || 0))[0], el.dataset.w); }
});
