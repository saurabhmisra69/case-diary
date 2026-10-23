/* Case Diary — reference numbers and cancellation.
   Matter ref:  SM/<year>-<nnn>/<CLIENT-CODE>   e.g. SM/2026-013/OMAXE-RWA  (fixed for the life of the matter)
   Letters:     <matter ref>/<letter year>/<nn>  e.g. SM/2026-013/OMAXE-RWA/2026/05  (one series per client code per year)
   Bills and receipts keep the single chamber series (SM/BILL/<FY>/<nn>, SM/RCPT/<FY>/<nn>) and print the matter ref.
   Nothing is deleted: a bill or receipt is marked Cancelled, a letter Withdrawn / Superseded; numbers are never reused. */
'use strict';

const codeClean = s => String(s || '').toUpperCase().replace(/[\/\\]+/g, '-').replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 16);
function suggestCode(m) {
  if (typeof suggestCodeNew === 'function') return suggestCodeNew(m);
  const same = live().find(x => x.id !== m.id && x.clientCode && (x.clients || '').trim().toLowerCase() === (m.clients || '').trim().toLowerCase());
  if (same) return same.clientCode;
  const w = String(m.clients || m.title || '').replace(/\b(smt|shri|sri|mr|mrs|ms|dr|m\/s|the|and|anr|ors|others|&)\b\.?/gi, ' ').trim().split(/\s+/).filter(x => x.length > 1);
  return codeClean(w.slice(-1)[0] || w[0] || 'CLIENT');
}
const refBase = m => typeof mrefBase === 'function' ? mrefBase(m) : (m.ref || ('SM/' + (+m.year ? m.year : 'OLD') + '-' + String(m.n).padStart(3, '0')));
const matterRef = m => refBase(m) + (m.clientCode ? '/' + m.clientCode : '');
function freezeRef(m) { if (!m.ref) m.ref = refBase(m); }   // once a document carries it, it never changes
const allCodes = () => [...new Set(live().map(x => x.clientCode).filter(Boolean))].sort();

/* letter serial: one series per client code per calendar year */
function nextLetterNo(code, year) {
  const k = 'seq:L:' + code + ':' + year;
  const used = live().filter(x => x.clientCode === code).flatMap(x => x.letters || []).map(l => String(l.no || '')).filter(no => no.includes('/' + code + '/' + year + '/')).map(no => +(no.split('/').pop()) || 0);
  return Math.max(+(S.data.meta || {})[k] || 0, ...used, 0) + 1;
}
function bumpLetterNo(code, year, n) { change(d => { d.meta = d.meta || {}; const k = 'seq:L:' + code + ':' + year; d.meta[k] = Math.max(+d.meta[k] || 0, n); }); }

/* ask for the client code once, when a matter first needs one */
function askCode(m, then) {
  if (typeof suggestCodeNew === 'function') {
    const same = live().find(x => x.id !== m.id && x.clientCode && clientKey(x.clients) === clientKey(m.clients));
    if (same && !m.clientCode) { change(() => { m.clientCode = same.clientCode; logChange(m, 'Client code: ' + same.clientCode + ' (same client)'); touch(m); }); return then ? then() : (closeSheet(), toast('Client code ' + same.clientCode), render()); }
    const code = m.clientCode || suggestCodeNew(m), pre = ccPre(code), ini = code.replace(/^C\d{3,4}-/, '');
    if (m.clientCode && !pre) return then ? then() : closeSheet();
    const locked = m.clientCode && ccLocked({ code: m.clientCode, ms: live().filter(x => x.clientCode === m.clientCode) });
    if (locked) { toast(m.clientCode + ' is fixed'); return then ? then() : closeSheet(); }
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · client code</small><h1>${esc(clientName(m.clients) || m.title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint">The number is given by the app; the initials are yours to change until the first letter goes out.</p>
      <form id="cc_form"><div style="display:flex;gap:6px;align-items:center"><span class="ccpre">${esc(pre)}</span><input class="in" id="cc_in" value="${esc(ini)}" maxlength="6" style="flex:1;font-family:var(--mono);text-transform:uppercase" autocapitalize="characters" spellcheck="false" required aria-label="Initials"></div>
      <button class="save" type="submit" style="margin-top:12px">Save</button><button type="button" class="linkbtn" data-act="codes" style="margin-top:8px">All client codes</button></form>`);
    $('#cc_form').onsubmit = e => { e.preventDefault(); const i2 = iniClean($('#cc_in').value); if (!i2) return toast('Enter the initials');
      const c = (pre || ccFmt(ccNext(), '')) + i2, grp = live().filter(x => clientKey(x.clients) === clientKey(m.clients));
      change(d => { d.meta = d.meta || {}; d.meta['seq:C'] = Math.max(+d.meta['seq:C'] || 0, ccNum(c)); grp.forEach(x => { if (x.clientCode !== c) { logChange(x, 'Client code: ' + (x.clientCode || '—') + ' → ' + c); x.clientCode = c; touch(x); } }); });
      then ? then() : (closeSheet(), render()); };
    return;
  }
  const sug = suggestCode(m);
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · client code</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">A short fixed code for this client, used in letter numbers: ${esc(refBase(m))}/<b>CODE</b>/${new Date().getFullYear()}/01. Use the same code for all of this client's matters, so they share one series.</p>
    <form id="cc_form"><div class="field"><label for="cc_in">CLIENT CODE</label><input class="in" id="cc_in" list="cc_list" value="${esc(m.clientCode || sug)}" style="text-transform:uppercase;font-family:var(--mono)" autocapitalize="characters" spellcheck="false" required><datalist id="cc_list">${allCodes().map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
    <button class="save" type="submit">Save code</button></form>`);
  $('#cc_form').onsubmit = e => { e.preventDefault(); const c = codeClean($('#cc_in').value); if (!c) return toast('Enter a code');
    change(() => { if (m.clientCode !== c) logChange(m, 'Client code set: ' + c); m.clientCode = c; touch(m); }); then ? then() : closeSheet(); };
}

/* ---------- letters and notices register ---------- */
const L_STATE = { 'Withdrawn': 'Withdrawn', 'Superseded': 'Superseded' };
function sheetLetters(m, form) {
  if (!m.clientCode) return askCode(m, () => sheetLetters(m, form));
  if (form) delete PAPER_NOW.letter;
  const ls = (m.letters || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || '') || String(y.no).localeCompare(String(x.no)));
  const d0 = todayIso(), y0 = d0.slice(0, 4), n0 = nextLetterNo(m.clientCode, y0);
  openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(matterRef(m))}</small><h1>Letters &amp; notices</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="kv"><span>Matter ref.</span><b style="font-family:var(--mono)">${esc(matterRef(m))}</b><span>Client code</span><b>${esc(m.clientCode)} <button class="linkbtn" data-lt="code">Change</button></b><span>Next letter no.</span><b style="font-family:var(--mono)">${esc(matterRef(m) + '/' + y0 + '/' + String(n0).padStart(2, '0'))}</b></div>
    ${form ? '' : '<button class="act primary" data-lt="new" style="width:100%;margin-top:12px;min-height:46px">+ New letter / notice</button>'}
    ${form ? `<form id="lt_form" class="grp" style="gap:12px;margin-top:12px">
      <div class="two"><div class="field"><label for="lt_date">DATE</label><input class="in" type="date" id="lt_date" value="${d0}"></div><div class="field"><label for="lt_kind">KIND</label><select class="in" id="lt_kind">${['Letter', 'Legal notice', 'Reply to notice', 'Opinion', 'Advice'].map(k => `<option>${k}</option>`).join('')}</select></div></div>
      <div class="field"><label for="lt_to">TO (NAME AND ADDRESS)</label><textarea class="in" id="lt_to" rows="3">${esc(m.clients || '')}</textarea></div>
      <div class="field"><label for="lt_sub">SUBJECT</label><input class="in" id="lt_sub" required placeholder="e.g. Opinion on renewal of maintenance contract"></div>
      <div class="field"><label for="lt_body">TEXT (OPTIONAL — FOR A LETTER ON YOUR LETTERHEAD)</label><textarea class="in" id="lt_body" rows="6" placeholder="Leave blank to only take the number and note it in the register"></textarea></div>
      ${paperSwitch('letter')}
      <div class="toggles"><label><span>Add my signature</span><input type="checkbox" id="lt_sig" checked></label></div>
      <button class="save" type="submit">Take number${' '}<span style="font-family:var(--mono)">${esc(String(n0).padStart(2, '0'))}</span></button>
      <button type="button" class="linkbtn" data-lt="back">Cancel</button></form>` : ''}
    <div class="grp" style="margin-top:12px"><span class="lbl">Register (${ls.length})</span>
      ${ls.length ? `<div class="hist">${ls.map(l => `<div><b>${dmy(l.date)}</b><span${l.state ? ' class="voided"' : ''}><b style="font-family:var(--mono);font-size:12px">${esc(l.no)}</b><br>${esc(l.kind || 'Letter')}: ${esc(l.subject || '')}${l.state ? `<br><b class="voidtag">${esc(l.state.toUpperCase())}</b> ${dmy(l.stateOn)}${l.reason ? ' · ' + esc(l.reason) : ''}${l.by ? ' · by ' + esc(l.by) : ''}` : ''}<br>${l.fileId ? `<button class="linkbtn" data-lt="open" data-l="${l.id}">Open</button> ` : ''}<button class="linkbtn" data-lt="copy" data-l="${l.id}">Copy no.</button>${l.state ? '' : ` <button class="linkbtn" data-lt="void" data-l="${l.id}" style="color:var(--red)">Withdraw / supersede</button>`}</span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">No letter issued in this matter yet.</p>'}</div>`);
  $('#sheet-root').onclick = async e => {
    const b = e.target.closest('[data-lt]'); if (!b) return;
    const a = b.dataset.lt, l = (m.letters || []).find(x => x.id === b.dataset.l);
    if (a === 'code') return askCode(m, () => sheetLetters(m));
    if (a === 'new') return sheetLetters(m, true);
    if (a === 'back') return sheetLetters(m);
    if (a === 'copy') { try { await navigator.clipboard.writeText(l.no); toast('Copied: ' + l.no); } catch (er) { toast(l.no, 5000); } return; }
    if (a === 'open') { try { openNative(await getItem(l.fileId)); } catch (er) { toast('Could not open the file'); } return; }
    if (a === 'void') return sheetVoid(m, 'letter', l.id);
  };
  if (form) $('#lt_form').onsubmit = async e => {
    e.preventDefault();
    const date = $('#lt_date').value || todayIso(), yr = date.slice(0, 4), n = nextLetterNo(m.clientCode, yr);
    const rec = { id: uid(), no: matterRef(m) + '/' + yr + '/' + String(n).padStart(2, '0'), date, kind: $('#lt_kind').value, to: $('#lt_to').value.trim(), subject: $('#lt_sub').value.trim(), body: $('#lt_body').value.trim(), paper: paperOf('letter') };
    let sig = $('#lt_sig').checked;
    change(() => { freezeRef(m); m.letters = m.letters || []; m.letters.push(rec); logChange(m, rec.kind + ' ' + rec.no + ': ' + rec.subject); touch(m); });
    bumpLetterNo(m.clientCode, yr, n);
    try { await navigator.clipboard.writeText(rec.no); } catch (er) {}
    if (!rec.body) { toast('Number taken and copied: ' + rec.no, 5000); return sheetLetters(m); }
    if (sig && !(localStorage.getItem(SIG_KEY) || S.data?.meta?.sigItem)) { const ok = await chooseSignature(); if (!ok) sig = false; }
    openSheet(`<div class="s-head"><div><small>${esc(rec.no)}</small><h1>Making letter…</h1></div></div>`);
    try { const r = await makeLetterDoc(m, rec, sig); if (r.itemId) change(() => { rec.fileId = r.itemId; touch(m); }); docReady(m, r, rec.kind + ' ' + rec.no, () => sheetLetters(m)); }
    catch (er) { toast(er.message); sheetLetters(m); }
  };
}

/* letter on the letterhead, legal size, saved in the matter folder (a sub-folder named letters / correspondence / notice if there is one) */
async function letterFolder(m) {
  if (!m.folderId) return null;
  const kids = await listChildren(m.folderId);
  return kids.find(k => k.folder && /letter|corres|notice|opinion/i.test(k.name)) || { id: m.folderId, name: m.folderName || 'case folder' };
}
async function makeLetterDoc(m, l, withSig, voided) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const kids = [...letterhead(D),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9360 }], spacing: { after: 240 }, children: [new D.TextRun({ text: 'Ref.: ' + l.no, bold: true, size: 22, font: 'Times New Roman' }), new D.TextRun({ text: '\tDate: ' + dmy(l.date), bold: true, size: 22, font: 'Times New Roman' })] }),
    ...(voided ? [voidLine(D, l.state.toUpperCase(), l)] : []),
    PB(D, 'To,', { after: 0 }), ...String(l.to || '').split('\n').map(x => PB(D, x, { after: 0, bold: true })), PB(D, '', { after: 120 }),
    PB(D, 'Subject: ' + l.subject, { bold: true, after: 200 }),
    ...String(l.body || '').split(/\n/).map(x => PB(D, x, { after: 120 })),
    ...(await sigBlock(D, withSig))];
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageFor(l.paper || paperOf('letter'), 'Legal', { top: 1080, bottom: 1080, left: 1440, right: 1440 }) }, children: kids }] });
  const blob = await D.Packer.toBlob(doc), name = cleanName((l.kind || 'Letter') + ' ' + l.no.replace(/\//g, '-') + ' ' + dmy(l.date) + (voided ? ' ' + l.state.toUpperCase() : '')) + '.docx';
  let itemId = '', where = '';
  try { const dir = await letterFolder(m); if (dir) { itemId = (await uploadFile(dir.id, new File([blob], name), name)).id; where = dir.name; } } catch (e) {}
  return { blob, name, itemId, where };
}
function voidLine(D, word, x) {
  return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 200 }, border: { top: { style: D.BorderStyle.SINGLE, size: 12, color: 'B00000', space: 4 }, bottom: { style: D.BorderStyle.SINGLE, size: 12, color: 'B00000', space: 4 } },
    children: [new D.TextRun({ text: word + ' on ' + dmy(x.stateOn) + (x.reason ? ' — ' + x.reason : '') + (x.by ? ' — replaced by ' + x.by : ''), bold: true, size: 26, color: 'B00000', font: 'Times New Roman' })] });
}

/* ---------- cancel a bill or receipt, withdraw / supersede a letter ---------- */
function sheetVoid(m, kind, id) {
  const list = kind === 'bill' ? m.bills : kind === 'receipt' ? m.receipts : m.letters, x = (list || []).find(v => v.id === id); if (!x) return;
  const isL = kind === 'letter', back = () => isL ? sheetLetters(m) : sheetFees(m);
  const pay = kind === 'receipt' ? (m.payments || []).find(p => p.id === x.payId) : null;
  const paidOnBill = kind === 'bill' ? billPaid(m, x) : 0;
  openSheet(`<div class="s-head"><div><small style="color:var(--red)">${esc(x.no)}</small><h1>${isL ? 'Withdraw / supersede' : 'Cancel ' + kind}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">The number ${esc(x.no)} stays in the register, marked ${isL ? 'withdrawn or superseded' : 'CANCELLED'}, and is never used again. Nothing is deleted.</p>
    ${kind === 'bill' && paidOnBill ? `<p class="hint" style="color:var(--red)">${rupees(paidOnBill)} has been received against this bill. Those payments stay in Fees, but will no longer be linked to this bill.</p>` : ''}
    <form id="vd_form" class="grp" style="gap:12px">
      ${isL ? `<div class="field"><label>MARK AS</label><div class="chips"><button type="button" class="chip on" data-vd="Withdrawn">Withdrawn</button><button type="button" class="chip" data-vd="Superseded">Superseded</button></div></div>` : ''}
      <div class="field"><label for="vd_on">DATE</label><input class="in" type="date" id="vd_on" value="${todayIso()}"></div>
      <div class="field"><label for="vd_why">REASON</label><input class="in" id="vd_why" required list="vd_list" placeholder="${isL ? 'e.g. Replaced by revised letter' : 'e.g. Wrong amount, wrong name'}"><datalist id="vd_list">${(isL ? ['Replaced by revised letter', 'Issued by mistake', 'Client asked to withdraw'] : kind === 'bill' ? ['Wrong amount', 'Wrong name / address', 'Issued by mistake', 'Fee revised'] : ['Wrong amount', 'Wrong name', 'Wrong bill linked', 'Cheque dishonoured', 'Issued by mistake']).map(s => `<option value="${s}">`).join('')}</datalist></div>
      ${kind === 'receipt' && pay ? `<div class="toggles"><label><span>The payment of ${rupees(pay.amount)} was not actually received (e.g. cheque dishonoured) — remove it from Fees</span><input type="checkbox" id="vd_nopay"></label></div>` : ''}
      ${!isL ? `<div class="toggles"><label><span>Make a copy marked CANCELLED in the fees folder</span><input type="checkbox" id="vd_doc" checked></label></div>
        <div class="toggles"><label><span>Then make a fresh ${kind} in its place</span><input type="checkbox" id="vd_new" ${kind === 'bill' ? 'checked' : ''}></label></div>` : ''}
      <button class="save" type="submit" style="background:var(--red)">${isL ? 'Mark letter' : 'Cancel ' + kind + ' ' + esc(x.no)}</button>
      <button type="button" class="linkbtn" data-vd="back">Go back</button></form>`);
  let state = 'Withdrawn';
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-vd]'); if (!b) return; if (b.dataset.vd === 'back') return back();
    state = b.dataset.vd; document.querySelectorAll('[data-vd]').forEach(c => c.classList.toggle('on', c === b)); };
  $('#vd_form').onsubmit = async e => {
    e.preventDefault();
    const on = $('#vd_on').value || todayIso(), why = $('#vd_why').value.trim(), nopay = $('#vd_nopay')?.checked, mkDoc = $('#vd_doc')?.checked, mkNew = $('#vd_new')?.checked;
    change(() => {
      x.state = isL ? state : 'Cancelled'; x.stateOn = on; x.reason = why;
      if (kind === 'bill') (m.payments || []).forEach(p => { if (p.billId === x.id) p.billId = ''; });
      if (kind === 'receipt' && pay) { if (pay.receiptNo === x.no) pay.receiptNo = ''; pay.billId = '';
        if (nopay) { m.payments.splice(m.payments.indexOf(pay), 1); feesTotal(m); } }
      logChange(m, (isL ? x.kind || 'Letter' : kind === 'bill' ? 'Bill' : 'Receipt') + ' ' + x.no + ' ' + x.state.toLowerCase() + ': ' + why + (nopay ? ' (payment ' + rupees(pay.amount) + ' removed from Fees)' : ''));
      touch(m);
    });
    toast(x.no + ' marked ' + x.state.toLowerCase(), 4000);
    if (isL) {
      if (x.fileId && x.body) { try { const r = await makeLetterDoc(m, x, false, true); if (r.itemId) toast('Copy marked ' + x.state.toUpperCase() + ' saved', 4000); } catch (er) {} }
      return state === 'Superseded' ? sheetLetters(m, true) : sheetLetters(m);
    }
    if (mkDoc) {
      openSheet(`<div class="s-head"><div><small>${esc(x.no)}</small><h1>Making cancelled copy…</h1></div></div>`);
      try { if (kind === 'bill') await makeBillDoc(m, x, false); else if (pay || x.amount) await makeReceiptDoc(m, x, pay || { amount: x.amount, mode: x.mode, date: x.date }, (m.bills || []).find(b => b.id === x.billId) || null, false); } catch (er) { toast('Could not make the cancelled copy: ' + er.message); }
    }
    if (mkNew && kind === 'bill') return sheetBill(m, null, x);
    if (mkNew && kind === 'receipt' && pay && !nopay) return sheetReceipt(m, pay.id, x);
    sheetFees(m);
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="letters"],[data-act="voidbill"],[data-act="voidrcpt"],[data-act="setcode"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  const a = el.dataset.act;
  if (a === 'letters') sheetLetters(m);
  else if (a === 'setcode') askCode(m);
  else sheetVoid(m, a === 'voidbill' ? 'bill' : 'receipt', el.dataset.v);
});
