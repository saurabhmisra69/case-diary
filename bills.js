/* Case Diary — bills and receipts on the advocate's letterhead (A4, Word).
   Bills are numbered SM/BILL/<financial year>/<nn>; receipts SM/RCPT/<financial year>/<nn>.
   A receipt is made for a payment and is linked to one of the matter's bills. Signature: his own PNG
   from OneDrive › Letterhead & Signature, chosen once. */
'use strict';

const BANK = { name: 'SAURABH MISRA', bank: 'State Bank of India', branch: 'High Court (Lucknow)', type: 'Savings', acct: '31749622512', ifsc: 'SBIN0006219', micr: '226002018', upi: '9415181917@upi' };
const SIG_KEY = 'cd.sigItem';
function fyOf(iso) { const d = parseIso(iso || todayIso()), y = d.getFullYear(), s = d.getMonth() >= 3 ? y : y - 1; return s + '-' + String((s + 1) % 100).padStart(2, '0'); }
function nextSeq(kind, iso) {
  const k = 'seq:' + kind + ':' + fyOf(iso);
  S.data.meta = S.data.meta || {};
  const used = live().flatMap(m => (kind === 'BILL' ? m.bills : m.receipts) || []).map(b => String(b.no || '')).filter(no => no.includes('/' + fyOf(iso) + '/')).map(no => +(no.split('/').pop()) || 0);
  return Math.max(+S.data.meta[k] || 0, ...used, 0) + 1;
}
function bumpSeq(kind, iso, n) { change(d => { d.meta = d.meta || {}; const k = 'seq:' + kind + ':' + fyOf(iso); d.meta[k] = Math.max(+d.meta[k] || 0, n); }); }
const numNo = (kind, iso, n) => 'SM/' + kind + '/' + fyOf(iso) + '/' + String(n).padStart(2, '0');

/* Indian number words: 1,25,000 -> One Lakh Twenty-Five Thousand */
function inWords(n) {
  n = Math.round(+n || 0); if (!n) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? '-' + a[x % 10] : '');
  const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1000); n %= 1000;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
  return parts.join(' ');
}
const billPaid = (m, b) => (m.payments || []).filter(p => p.billId === b.id).reduce((s, p) => s + num(p.amount), 0);

/* ---------- signature ---------- */
async function getSignature() {
  let id = ''; try { id = localStorage.getItem(SIG_KEY) || ''; } catch (e) {}
  if (!id && S.data?.meta?.sigItem) id = S.data.meta.sigItem;
  if (!id) return null;
  const r = await g('/me/drive/items/' + id + '/content'); if (!r.ok) return null;
  const blob = await r.blob(), bm = await createImageBitmap(blob);
  const w = 150, h = Math.round(bm.height * w / bm.width);
  return { data: await blob.arrayBuffer(), w, h: Math.min(h, 90) };
}
async function chooseSignature() {
  openSheet(`<div class="s-head"><div><small>Signature</small><h1>Choose your signature</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint">Reading OneDrive › Letterhead & Signature…</p>`);
  let items = [];
  try { const dir = await getItem(drivePath('Letterhead & Signature')); items = (await listChildren(dir.id)).filter(it => it.file && /\.(png|jpe?g)$/i.test(it.name)); }
  catch (e) { openSheet(`<div class="s-head"><div><small>Signature</small><h1>Folder not found</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint">Put your signature (PNG) in OneDrive › Letterhead & Signature, then try again.</p>`); return null; }
  return new Promise(res => {
    openSheet(`<div class="s-head"><div><small>Signature</small><h1>Choose your signature</h1></div><button class="x" data-sg="none" aria-label="Close">${I.x}</button></div>
      <div class="flist">${items.map(it => `<button class="frow" data-sg="pick" data-id="${it.id}"><span class="ficon" style="background:var(--tr-soft)">IMG</span><span class="fname">${esc(it.name)}<small>${kb(it.size || 0)}</small></span></button>`).join('') || '<p class="empty">No PNG or JPG in that folder.</p>'}</div>`);
    $('#sheet-root').onclick = e => {
      const b = e.target.closest('[data-sg]'); if (!b) return;
      $('#sheet-root').onclick = null;
      if (b.dataset.sg === 'pick') { try { localStorage.setItem(SIG_KEY, b.dataset.id); } catch (er) {} change(d => { d.meta = d.meta || {}; d.meta.sigItem = b.dataset.id; }); toast('Signature saved'); res(b.dataset.id); }
      else { closeSheet(); res(null); }
    };
  });
}

/* ---------- Word documents ---------- */
function letterhead(D) {
  const C = D.AlignmentType.CENTER, F = 'Times New Roman';
  const p = (t, sz, b, after = 0, extra = {}) => new D.Paragraph({ alignment: C, spacing: { after }, ...extra, children: [new D.TextRun({ text: t, size: sz, bold: b, font: F })] });
  return [p('SAURABH MISRA & ASSOCIATES', 34, true), p('CHAMBERS OF SAURABH MISRA, ADVOCATE', 18, true), p('Advocates & Legal Consultants', 18, false),
    p(ADV.addr, 18, false), p('Phone: ' + ADV.phone + ' ; Email: ' + ADV.email, 18, false, 160, { border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: '000000', space: 4 } } })];
}
async function sigBlock(D, withSig) {
  const R = D.AlignmentType.RIGHT, F = 'Times New Roman', out = [];
  if (withSig) { try { const s = await getSignature(); if (s) out.push(new D.Paragraph({ alignment: R, spacing: { before: 240 }, children: [new D.ImageRun({ data: s.data, transformation: { width: s.w, height: s.h } })] })); } catch (e) {} }
  if (!out.length) out.push(new D.Paragraph({ alignment: R, spacing: { before: 720 }, children: [new D.TextRun({ text: '', font: F })] }));
  out.push(new D.Paragraph({ alignment: R, children: [new D.TextRun({ text: 'SAURABH MISRA, ADVOCATE', bold: true, size: 22, font: F })] }));
  out.push(new D.Paragraph({ alignment: R, children: [new D.TextRun({ text: 'Enrolment No. ' + ADV.enrol, size: 18, font: F })] }));
  return out;
}
function tbl(D, rows, widths, opts = {}) {
  const thin = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' }, borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
  const total = widths.reduce((s, w) => s + w, 0);
  return new D.Table({ width: { size: total, type: D.WidthType.DXA }, columnWidths: widths, borders, rows: rows.map((r, ri) => new D.TableRow({ children: r.map((c, i) => new D.TableCell({ width: { size: widths[i], type: D.WidthType.DXA },
    shading: (opts.head && ri === 0) || (opts.keyCol && i === 0) ? { fill: 'EEEEEE', type: D.ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(c ?? '').split('\n').map(line => new D.Paragraph({ alignment: opts.right && opts.right.includes(i) ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({ text: line, size: 21, font: 'Times New Roman', bold: (opts.head && ri === 0) || (opts.boldLast && ri === rows.length - 1) })] })) })) })) });
}
const PB = (D, t, o = {}) => new D.Paragraph({ alignment: o.align || D.AlignmentType.JUSTIFIED, spacing: { before: o.before || 0, after: o.after ?? 120, line: 300 }, children: [new D.TextRun({ text: t, size: o.size || 22, bold: o.bold, font: 'Times New Roman' })] });
function caseRefOf(m) { return [m.title, [m.caseNo, m.type].filter(Boolean).join(', '), m.court].filter(Boolean).join('\n'); }
async function saveDoc(m, D, children, name) {
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } }, children }] });
  const blob = await D.Packer.toBlob(doc);
  let itemId = '';
  if (m.folderId) {
    try { let dir; try { dir = await getItem('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('5 Bills & Receipts')); } catch (e) { dir = await makeFolder(m.folderId, '5 Bills & Receipts'); }
      itemId = (await uploadFile(dir.id, new File([blob], name), name)).id; } catch (e) {}
  }
  return { blob, name, itemId };
}
async function makeBillDoc(m, b, withSig) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const rows = [['S. No.', 'Particulars', 'Amount (₹)'], ...b.items.map((it, i) => [String(i + 1) + '.', it.d, num(it.amt).toLocaleString('en-IN') + '/-']), ['', 'Total amount payable', num(b.total).toLocaleString('en-IN') + '/-']];
  const kids = [...letterhead(D),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9026 }], spacing: { after: 200 }, children: [new D.TextRun({ text: 'Bill No.: ' + b.no, bold: true, size: 22, font: 'Times New Roman' }), new D.TextRun({ text: '\tDate: ' + dmy(b.date), bold: true, size: 22, font: 'Times New Roman' })] }),
    PB(D, 'BILL / PAYMENT DEMAND NOTE', { align: D.AlignmentType.CENTER, bold: true, size: 26, after: 200 }),
    PB(D, 'To,', { after: 0 }), ...String(b.to || m.clients || '').split('\n').map(l => PB(D, l, { after: 0, bold: true })), PB(D, '', { after: 120 }),
    tbl(D, [['Matter', caseRefOf(m)]], [2200, 6826], { keyCol: true }), PB(D, '', { after: 120 }),
    tbl(D, rows, [900, 6126, 2000], { head: true, right: [2], boldLast: true }),
    PB(D, '(Rupees ' + inWords(b.total) + ' only)', { before: 80, bold: true }),
    ...(b.note ? [PB(D, b.note)] : []),
    PB(D, 'PAYMENT DETAILS', { bold: true, before: 160, after: 60 }),
    PB(D, 'All payments shall be made only in favour of "Saurabh Misra" by NEFT, RTGS, UPI or cheque.', { after: 80 }),
    tbl(D, [['Account Name', BANK.name], ['Bank', BANK.bank], ['Branch', BANK.branch], ['Account No.', BANK.acct], ['IFS Code', BANK.ifsc], ['MICR Code', BANK.micr], ['UPI ID', BANK.upi]], [2600, 6426], { keyCol: true }),
    PB(D, 'A receipt shall be issued on payment.', { before: 120 }),
    ...(await sigBlock(D, withSig))];
  return saveDoc(m, D, kids, cleanName('Bill ' + b.no.replace(/\//g, '-') + ' ' + dmy(b.date)) + '.docx');
}
async function makeReceiptDoc(m, rc, p, b, withSig) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const paidOnBill = b ? billPaid(m, b) : 0;
  const words = `Received with thanks from ${rc.from || m.clients || '__________'} a sum of ₹${num(p.amount).toLocaleString('en-IN')}/- (Rupees ${inWords(p.amount)} only) by ${p.mode || '__________'}${p.note ? ' (' + p.note + ')' : ''} on ${dmy(p.date || rc.date)} towards professional fees${b ? ' against Bill No. ' + b.no + ' dated ' + dmy(b.date) : ''} in the matter mentioned below.`;
  const summary = b ? [['Bill amount', rupees(b.total)], ['Received against this bill (including this payment)', rupees(paidOnBill)], ['Balance on this bill', rupees(Math.max(0, num(b.total) - paidOnBill))]]
    : [['Total fees agreed', rupees(m.feeAgreed)], ['Total received', rupees(m.feeReceived)], ['Balance', rupees(feeDue(m))]];
  const kids = [...letterhead(D),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9026 }], spacing: { after: 200 }, children: [new D.TextRun({ text: 'Receipt No.: ' + rc.no, bold: true, size: 22, font: 'Times New Roman' }), new D.TextRun({ text: '\tDate: ' + dmy(rc.date), bold: true, size: 22, font: 'Times New Roman' })] }),
    PB(D, 'RECEIPT', { align: D.AlignmentType.CENTER, bold: true, size: 28, after: 240 }),
    PB(D, words, { after: 200 }),
    tbl(D, [['Matter', caseRefOf(m)], ...(b ? [['Bill', b.no + ' dated ' + dmy(b.date)]] : []), ['Amount received', rupees(p.amount) + ' (' + (p.mode || '') + ')']], [2600, 6426], { keyCol: true }),
    PB(D, '', { after: 120 }), tbl(D, summary, [5200, 3826], { keyCol: true, right: [1] }),
    ...(await sigBlock(D, withSig))];
  return saveDoc(m, D, kids, cleanName('Receipt ' + rc.no.replace(/\//g, '-') + ' ' + dmy(rc.date)) + '.docx');
}

/* ---------- after a document is made: open / PDF / share / download ---------- */
function docReady(m, r, title) {
  openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>${esc(title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">${esc(r.name)}${r.itemId ? ' · saved in the case folder › 5 Bills & Receipts' : ''}</p>
    <div class="three"><button class="act primary" data-dk="open">Open in Word</button><button class="act blue" data-dk="pdf">PDF</button><button class="act blue" data-dk="share">Share</button></div>
    <button class="ghost" data-dk="dl" style="width:100%;margin-top:8px">Download</button>
    <button class="linkbtn" data-dk="back" style="margin-top:10px">‹ Back to Fees & payments</button>`);
  const dl = (blob, n) => { const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = n; document.body.appendChild(x); x.click(); x.remove(); };
  $('#sheet-root').onclick = async e => {
    const b = e.target.closest('[data-dk]'); if (!b) return;
    const a = b.dataset.dk;
    if (a === 'back') return sheetFees(m);
    if (a === 'open') { if (r.itemId) { try { openNative(await getItem(r.itemId)); } catch (er) { dl(r.blob, r.name); } } else dl(r.blob, r.name); }
    else if (a === 'dl') { dl(r.blob, r.name); toast('Saved to Downloads'); }
    else if (a === 'pdf') {
      if (!r.itemId) return toast('PDF needs the matter folder linked; use Download');
      b.textContent = 'Making…';
      try { const p = await g('/me/drive/items/' + r.itemId + '/content?format=pdf'); if (!p.ok) throw new Error('OneDrive ' + p.status); const pb = await p.blob(); const pn = r.name.replace(/\.docx$/, '.pdf'); r.pdf = pb; r.pdfName = pn; dl(pb, pn); } catch (er) { toast('Could not make the PDF: ' + er.message); }
      b.textContent = 'PDF';
    }
    else if (a === 'share') {
      const files = [new File([r.blob], r.name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })]; if (r.pdf) files.push(new File([r.pdf], r.pdfName, { type: 'application/pdf' }));
      if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: r.name }); } catch (er) {} } else dl(r.blob, r.name);
    }
  };
}

/* ---------- bill sheet ---------- */
function sheetBill(m, bill) {
  const isNew = !bill, d0 = todayIso();
  const st = { items: bill ? bill.items.map(x => ({ ...x })) : [{ d: 'Professional fee for ' + (m.type ? m.type + ' ' : '') + (m.caseNo || 'the above matter'), amt: feeDue(m) || '' }], sig: true };
  const draw = () => {
    const tot = st.items.reduce((s, x) => s + num(x.amt), 0);
    openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(m.no)} · ${isNew ? 'new bill' : 'bill ' + esc(bill.no)}</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <form id="billform" class="grp" style="gap:12px">
        <div class="two"><div class="field"><label for="b_no">BILL NO.</label><input class="in" id="b_no" name="no" value="${esc(bill ? bill.no : numNo('BILL', d0, nextSeq('BILL', d0)))}"></div><div class="field"><label for="b_date">DATE</label><input class="in" type="date" id="b_date" name="date" value="${esc(bill ? bill.date : d0)}"></div></div>
        <div class="field"><label for="b_to">TO (NAME AND ADDRESS)</label><textarea class="in" id="b_to" name="to" rows="3">${esc(bill ? bill.to : (m.clients || ''))}</textarea></div>
        <span class="lbl">Particulars</span>
        ${st.items.map((it, i) => `<div class="two" style="grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) auto;align-items:end"><div class="field" style="margin:0"><input class="in" data-bi="d" data-i="${i}" value="${esc(it.d)}" placeholder="e.g. Drafting and filing of ${esc(m.type || 'application')}"></div><div class="field" style="margin:0"><input class="in" data-bi="amt" data-i="${i}" inputmode="numeric" value="${esc(it.amt)}" placeholder="₹"></div>${st.items.length > 1 ? `<button type="button" class="linkbtn" data-bx="rm" data-i="${i}" style="color:var(--red)">✕</button>` : '<span></span>'}</div>`).join('')}
        <button type="button" class="ghost" data-bx="add">+ Add a line</button>
        <div class="picked"><b>Total ${rupees(tot)}</b><span>Rupees ${esc(inWords(tot))} only</span></div>
        <div class="field"><label for="b_note">NOTE (OPTIONAL)</label><input class="in" id="b_note" name="note" value="${esc(bill ? bill.note || '' : '')}" placeholder="e.g. First of four quarterly instalments"></div>
        <div class="toggles"><label><span>Add my signature</span><input type="checkbox" id="b_sig" ${st.sig ? 'checked' : ''}></label></div>
        <button class="save" type="submit">${isNew ? 'Make bill' : 'Save and remake bill'}</button>
      </form>`);
    $('#billform').onsubmit = submit;
  };
  const keep = () => { const v = {}; ['b_no', 'b_date', 'b_to', 'b_note'].forEach(id => { const el = $('#' + id); if (el) v[id] = el.value; }); st.sig = $('#b_sig')?.checked; return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = $('#' + id); if (el) el.value = val; });
  async function submit(e) {
    e.preventDefault();
    const v = keep(), items = st.items.filter(x => (x.d || '').trim() || num(x.amt));
    const total = items.reduce((s, x) => s + num(x.amt), 0); if (!total) return toast('Enter the amount');
    if (st.sig && !(localStorage.getItem(SIG_KEY) || S.data?.meta?.sigItem)) { const ok = await chooseSignature(); if (!ok) { st.sig = false; } }
    const rec = bill || { id: uid() };
    Object.assign(rec, { no: v.b_no.trim(), date: v.b_date || todayIso(), to: v.b_to.trim(), note: v.b_note.trim(), items: items.map(x => ({ d: x.d.trim(), amt: num(x.amt) })), total });
    change(() => { m.bills = m.bills || []; if (isNew) m.bills.push(rec); logChange(m, (isNew ? 'Bill made: ' : 'Bill remade: ') + rec.no + ' · ' + rupees(total)); touch(m); });
    const n = +(rec.no.split('/').pop()) || 0; if (isNew && n) bumpSeq('BILL', rec.date, n);
    openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>Making bill…</h1></div></div>`);
    try { const r = await makeBillDoc(m, rec, st.sig); docReady(m, r, 'Bill ' + rec.no); } catch (er) { toast(er.message); sheetFees(m); }
  }
  draw();
  $('#sheet-root').oninput = e => { const el = e.target.closest('[data-bi]'); if (el) st.items[+el.dataset.i][el.dataset.bi] = el.value; };
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-bx]'); if (!b) return;
    const v = keep();
    if (b.dataset.bx === 'add') st.items.push({ d: '', amt: '' }); else st.items.splice(+b.dataset.i, 1);
    draw(); restore(v);
  };
}

/* ---------- receipt sheet ---------- */
function sheetReceipt(m, payId) {
  const pays = (m.payments || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  if (!pays.length) { toast('Record the payment first, then make its receipt'); return sheetFees(m, 'pay'); }
  const bills = (m.bills || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const st = { pay: payId || pays[0].id, bill: '', sig: true };
  const pp = pays.find(x => x.id === st.pay); st.bill = pp && pp.billId ? pp.billId : (bills.find(b => billPaid(m, b) < num(b.total)) || bills[0] || {}).id || '';
  const d0 = todayIso();
  openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(m.no)} · receipt</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="rcform" class="grp" style="gap:12px">
      <div class="field"><label for="r_pay">PAYMENT</label><select class="in" id="r_pay">${pays.map(p => `<option value="${p.id}" ${p.id === st.pay ? 'selected' : ''}>${rupees(p.amount)} · ${p.date ? dmy(p.date) : 'no date'}${p.mode ? ' · ' + esc(p.mode) : ''}${p.receiptNo ? ' · receipt ' + esc(p.receiptNo) : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="r_bill">AGAINST BILL</label><select class="in" id="r_bill"><option value="">— No bill —</option>${bills.map(b => { const paid = billPaid(m, b); return `<option value="${b.id}" ${b.id === st.bill ? 'selected' : ''}>${esc(b.no)} · ${dmy(b.date)} · ${rupees(b.total)} · ${paid >= num(b.total) ? 'paid' : paid ? 'part-paid ' + rupees(paid) : 'unpaid'}</option>`; }).join('')}</select>
        ${bills.length ? '' : `<p class="hint" style="margin:6px 0 0">No bills yet on this matter. <button type="button" class="linkbtn" data-rx="bill">Make a bill</button></p>`}</div>
      <div class="two"><div class="field"><label for="r_no">RECEIPT NO.</label><input class="in" id="r_no" value="${esc(pp && pp.receiptNo ? pp.receiptNo : numNo('RCPT', d0, nextSeq('RCPT', d0)))}"></div><div class="field"><label for="r_date">DATE</label><input class="in" type="date" id="r_date" value="${esc(d0)}"></div></div>
      <div class="field"><label for="r_from">RECEIVED FROM</label><input class="in" id="r_from" value="${esc(m.clients || '')}"></div>
      <div class="toggles"><label><span>Add my signature</span><input type="checkbox" id="r_sig" checked></label></div>
      <button class="save" type="submit">Make receipt</button>
      <button type="button" class="linkbtn" data-rx="sig">Change signature image</button>
    </form>`);
  $('#sheet-root').onclick = async e => { const b = e.target.closest('[data-rx]'); if (!b) return; if (b.dataset.rx === 'bill') sheetBill(m); else { await chooseSignature(); sheetReceipt(m, $('#r_pay')?.value || st.pay); } };
  $('#rcform').onsubmit = async e => {
    e.preventDefault();
    const pay = (m.payments || []).find(x => x.id === $('#r_pay').value), billId = $('#r_bill').value, bill = (m.bills || []).find(x => x.id === billId) || null;
    const rc = { id: uid(), no: $('#r_no').value.trim(), date: $('#r_date').value || todayIso(), from: $('#r_from').value.trim(), payId: pay.id, billId };
    let sig = $('#r_sig').checked;
    if (sig && !(localStorage.getItem(SIG_KEY) || S.data?.meta?.sigItem)) { const ok = await chooseSignature(); if (!ok) sig = false; }
    change(() => { pay.billId = billId || ''; pay.receiptNo = rc.no; m.receipts = m.receipts || []; m.receipts.push(rc); logChange(m, 'Receipt ' + rc.no + ' for ' + rupees(pay.amount) + (bill ? ' against bill ' + bill.no : '')); touch(m); });
    const n = +(rc.no.split('/').pop()) || 0; if (n) bumpSeq('RCPT', rc.date, n);
    openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>Making receipt…</h1></div></div>`);
    try { const r = await makeReceiptDoc(m, rc, pay, bill, sig); docReady(m, r, 'Receipt ' + rc.no); } catch (er) { toast(er.message); sheetFees(m); }
  };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="mkbill"],[data-act="mkrcpt"],[data-act="openbill"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  if (el.dataset.act === 'mkbill') sheetBill(m);
  else if (el.dataset.act === 'mkrcpt') sheetReceipt(m, el.dataset.p);
  else { const b = (m.bills || []).find(x => x.id === el.dataset.b); if (b) sheetBill(m, b); }
});
