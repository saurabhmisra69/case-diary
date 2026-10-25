/* Case Diary — bills and receipts on the advocate's letterhead (A4, Word).
   Bills are numbered SM/BILL/<financial year>/<nn>; receipts SM/RCPT/<financial year>/<nn>.
   A receipt is made for a payment and is linked to one of the matter's bills. Signature: his own PNG
   from OneDrive › Letterhead & Signature, chosen once. */
'use strict';

const BANK = { name: 'SAURABH MISRA', bank: 'State Bank of India', branch: 'High Court (Lucknow)', type: 'Savings', acct: '31749622512', ifsc: 'SBIN0006219', micr: '226002018', upi: '9415181917@upi' };
const SIG_KEY = 'cd.sigItem';
const BILL_TERMS = [
  ['exp', 'Out-of-pocket expenses (court fee, stamps, affidavit, oath commissioner / notary, typing, photocopy, certified copies) are not included in this bill and shall be charged separately at actuals.'],
  ['work', 'Preparation fee: 50% at engagement, balance 50% before filing. Filing shall be taken up only after full payment of the preparation fee.'],
  ['date', 'Date / appearance fee for each hearing shall be charged separately.'],
  ['scope', 'This fee is for the work / stage mentioned above only. Appeal, revision, review, execution, contempt, or any fresh application or proceeding shall be charged separately.'],
  ['out', 'Appearance outside Lucknow: appearance fee {OUT} per day, travel {TRAVEL} and stay {STAY}, payable in advance in addition to the fee.'],
  ['only', 'Payment shall be made only in favour of Saurabh Misra. No payment to any junior, clerk or other person is valid unless a receipt is issued by the undersigned.'],
  ['refund', 'Fee once paid is not refundable after the work has been commenced.'],
  ['result', 'The fee is for professional services and does not depend on the outcome of the case. No assurance as to the result is given or implied.'],
  ['coop', 'The client shall provide documents, information and instructions in time. Any delay caused by their non-supply shall not be attributable to the counsel.'],
  ['due', 'Payable within 7 days of the date of this bill.'],
  ['abey', 'Further work may be kept in abeyance until the dues are cleared.'],
  ['gst', 'GST, where applicable, is payable by the client under reverse charge.'],
  ['jur', 'Subject to Lucknow jurisdiction.'],
];
const defaultTerms = () => (S.data?.meta?.billTerms) || ['exp', 'work', 'date'];
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
const rw = n => rupees(n) + '/- (Rupees ' + inWords(n) + ' only)';
const billPaid = (m, b) => (m.payments || []).filter(p => p.billId === b.id).reduce((s, p) => s + num(p.amount) + num(p.tds), 0);

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

/* ---------- the matter's fees folder (the sub-folder whose name starts with 5) ---------- */
const FEE_DIR_NAME = {};
async function feeFolder(m, create) {
  if (!m.folderId) return null;
  const kids = await listChildren(m.folderId);
  let dir = kids.find(k => k.folder && /^5(\s|[._-])/.test(k.name)) || kids.find(k => k.folder && /fee|bill/i.test(k.name));
  if (!dir && create) dir = await makeFolder(m.folderId, '5 Fees');
  if (dir) FEE_DIR_NAME[m.id] = dir.name;
  return dir || null;
}
async function fileText(it) {
  const r = await g('/me/drive/items/' + it.id + '/content'); if (!r.ok) return '';
  const buf = await (await r.blob()).arrayBuffer();
  if (/\.pdf$/i.test(it.name)) {
    const lib = await loadPdfLib(), pdf = await lib.getDocument({ data: buf }).promise; let t = '';
    for (let n = 1; n <= Math.min(pdf.numPages, 4); n++) t += (await (await pdf.getPage(n)).getTextContent()).items.map(i => i.str).join(' ') + ' ';
    pdf.destroy(); return t;
  }
  if (/\.docx$/i.test(it.name)) { const z = await (await loadJSZip()).loadAsync(buf); const x = await z.file('word/document.xml')?.async('string'); return (x || '').replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ''); }
  return '';
}
function billFromText(t, name) {
  const s = t.replace(/\s+/g, ' ');
  const no = (s.match(/Bill\s*No\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-.]{2,})/i) || [])[1] || (name.match(/Bill\s+([A-Z0-9-]+)/i) || [])[1] || '';
  const dm = s.match(/(?:Bill\s*Date|Date)\s*[:\-]?\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/i);
  const date = dm ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) + '-' + dm[2].padStart(2, '0') + '-' + dm[1].padStart(2, '0') : '';
  const am = s.match(/Total\s*(?:amount)?\s*(?:payable)?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+)/i) || s.match(/(?:Rs\.?|₹)\s*([\d,]{3,})\s*\/?-?/i);
  return { no: no.replace(/[.,;]+$/, ''), date, total: am ? +am[1].replace(/,/g, '') : 0 };
}
/* bills kept in the fees folder that the diary does not know yet are read and added (once) */
async function syncFolderBills(m) {
  const dir = await feeFolder(m, false); if (!dir) return 0;
  const files = (await listChildren(dir.id)).filter(it => it.file && /bill|demand|invoice/i.test(it.name) && !/receipt/i.test(it.name) && /\.(pdf|docx)$/i.test(it.name));
  const known = new Set((m.bills || []).map(b => b.fileId).filter(Boolean)), knownNo = new Set((m.bills || []).map(b => b.no));
  let added = 0;
  for (const it of files) {
    if (known.has(it.id)) continue;
    let info = { no: '', date: '', total: 0 };
    try { info = billFromText(await fileText(it), it.name); } catch (e) {}
    if (info.no && knownNo.has(info.no)) { change(() => { const b = m.bills.find(x => x.no === info.no); if (b && !b.fileId) b.fileId = it.id; touch(m); }); continue; }
    change(() => { m.bills = m.bills || []; m.bills.push({ id: uid(), no: info.no || it.name.replace(/\.[^.]+$/, ''), date: info.date || (it.lastModifiedDateTime || '').slice(0, 10), to: m.clients || '', items: [{ d: 'As per bill ' + it.name, amt: info.total }], total: info.total, fileId: it.id, fileName: it.name, fromFolder: true }); touch(m); });
    added++;
  }
  return added;
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
async function saveDoc(m, D, children, name, paper) {
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageFor(paper || 'A4', 'A4', { top: 1080, bottom: 1080, left: 1440, right: 1440 }) }, children }] });
  const blob = await D.Packer.toBlob(doc);
  let itemId = '';
  if (m.folderId) {
    try { const dir = await feeFolder(m, true); itemId = (await uploadFile(dir.id, new File([blob], name), name)).id; } catch (e) {}
  }
  return { blob, name, itemId };
}
async function makeBillDoc(m, b, withSig) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const rows = [['S. No.', 'Particulars', 'Amount (₹)'], ...b.items.map((it, i) => [String(i + 1) + '.', it.d, num(it.amt).toLocaleString('en-IN') + '/-']), ['', 'Total amount payable\n(Rupees ' + inWords(b.total) + ' only)', num(b.total).toLocaleString('en-IN') + '/-']];
  const kids = [...letterhead(D),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9026 }], spacing: { after: 200 }, children: [new D.TextRun({ text: 'Bill No.: ' + b.no, bold: true, size: 22, font: 'Times New Roman' }), new D.TextRun({ text: '\tDate: ' + dmy(b.date), bold: true, size: 22, font: 'Times New Roman' })] }),
    ...(b.state === 'Cancelled' ? [voidLine(D, 'CANCELLED', b)] : []),
    PB(D, 'BILL / PAYMENT DEMAND NOTE', { align: D.AlignmentType.CENTER, bold: true, size: 26, after: 200 }),
    PB(D, 'To,', { after: 0 }), ...String(b.to || m.clients || '').split('\n').map(l => PB(D, l, { after: 0, bold: true })), PB(D, '', { after: 120 }),
    tbl(D, [['Matter Ref.', matterRef(m)], ['Matter', caseRefOf(m)]], [2200, 6826], { keyCol: true }), PB(D, '', { after: 120 }),
    tbl(D, rows, [900, 6126, 2000], { head: true, right: [2], boldLast: true }),
    PB(D, 'Amount payable: ₹' + num(b.total).toLocaleString('en-IN') + '/- (Rupees ' + inWords(b.total) + ' only)', { before: 80, bold: true }),
    ...(b.note ? [PB(D, b.note)] : []),
    ...(() => { const ts = [...(b.terms || []).map(k => (BILL_TERMS.find(x => x[0] === k) || [])[1]).filter(Boolean).map(t => t.replace('within 7 days', 'within ' + (b.dueDays || 7) + ' days')).map(t => typeof efFillOut === 'function' ? efFillOut(m, t) : t), ...String(b.extraTerms || '').split('\n').map(s => s.trim()).filter(Boolean)];
      return ts.length ? [PB(D, 'Terms:', { bold: true, size: 18, before: 120, after: 40 }), ...ts.map((t, i) => PB(D, (i + 1) + '. ' + t, { size: 18, after: 30 }))] : []; })(),
    PB(D, 'PAYMENT DETAILS', { bold: true, before: 160, after: 60 }),
    PB(D, 'All payments shall be made only in favour of "Saurabh Misra" by NEFT, RTGS, UPI or cheque.', { after: 80 }),
    tbl(D, [['Account Name', BANK.name], ['Bank', BANK.bank], ['Branch', BANK.branch], ['Account No.', BANK.acct], ['IFS Code', BANK.ifsc], ['MICR Code', BANK.micr], ['UPI ID', BANK.upi]], [2600, 6426], { keyCol: true }),
    PB(D, 'A receipt shall be issued on payment.', { before: 120 }),
    ...(await sigBlock(D, withSig))];
  return saveDoc(m, D, kids, cleanName('Bill ' + b.no.replace(/\//g, '-') + ' ' + dmy(b.date) + (b.state === 'Cancelled' ? ' CANCELLED' : '')) + '.docx', b.paper || paperOf('bill'));
}
async function makeReceiptDoc(m, rc, p, b, withSig) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const paidOnBill = b ? billPaid(m, b) : 0;
  const G = num(p.amount) + num(p.tds);
  const words = `Received with thanks from ${rc.from || m.clients || '__________'} a sum of ₹${G.toLocaleString('en-IN')}/- (Rupees ${inWords(G)} only)${num(p.tds) ? `, being ₹${num(p.amount).toLocaleString('en-IN')}/- by ${p.mode || '__________'} and ₹${num(p.tds).toLocaleString('en-IN')}/- by way of tax deducted at source (TDS) ${tdsSec(p.date || rc.date)}` : ` by ${p.mode || '__________'}`}${p.note ? ' (' + p.note + ')' : ''} on ${dmy(p.date || rc.date)} towards ${num(p.dateFee) ? (num(p.dateFee) < G ? 'professional fees and date fees' : 'date fees') : 'professional fees'}${b ? ' against Bill No. ' + b.no + ' dated ' + dmy(b.date) : ''} in the matter mentioned below.`;
  const summary = b ? [['Bill amount', rw(b.total)], ['Received against this bill (including this payment)', rw(paidOnBill)], ['Balance on this bill', rw(Math.max(0, num(b.total) - paidOnBill))]]
    : [...(typeof dateFeeRate === 'function' && dateFeeRate(m) ? [['Professional fees agreed', rw(m.feeAgreed)], ['Date fees charged (' + dateFeeDates(m).length + ' dates)', rw(dateFeeTotal(m))]] : [['Total fees agreed', rw(m.feeAgreed)]]), ['Total received', rw(m.feeReceived)], ['Balance', rw(feeDue(m))]];
  const kids = [...letterhead(D),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9026 }], spacing: { after: 200 }, children: [new D.TextRun({ text: 'Receipt No.: ' + rc.no, bold: true, size: 22, font: 'Times New Roman' }), new D.TextRun({ text: '\tDate: ' + dmy(rc.date), bold: true, size: 22, font: 'Times New Roman' })] }),
    ...(rc.state === 'Cancelled' ? [voidLine(D, 'CANCELLED', rc)] : []),
    PB(D, 'RECEIPT', { align: D.AlignmentType.CENTER, bold: true, size: 28, after: 240 }),
    PB(D, words, { after: 200 }),
    tbl(D, [['Matter Ref.', matterRef(m)], ['Matter', caseRefOf(m)], ...(b ? [['Bill No.', b.no + ' dated ' + dmy(b.date)]] : []), ...(rc.replaces ? [['In place of', 'Cancelled Receipt No. ' + rc.replaces]] : []), ...(num(p.tds) ? [['Received by ' + (p.mode || 'payment'), rw(p.amount)], ['TDS deducted', rw(p.tds)], ['Total credited', rw(G)]] : [['Amount received', rw(p.amount) + (p.mode ? ' by ' + p.mode : '')]])], [2600, 6426], { keyCol: true }),
    ...(num(p.dateFee) ? (() => { const ds = typeof datesCoveredBy === 'function' ? datesCoveredBy(m, p) : []; return [PB(D, '', { after: 120 }), tbl(D, [['Towards professional fees (case preparation / drafting)', rw(G - num(p.dateFee))], ['Towards date fees' + (ds.length ? ' (' + ds.map(dmy).join(', ') + ')' : ''), rw(num(p.dateFee))]], [5200, 3826], { keyCol: true })]; })() : []),
    PB(D, '', { after: 120 }), tbl(D, summary, [3600, 5426], { keyCol: true }),
    ...(await sigBlock(D, withSig))];
  return saveDoc(m, D, kids, cleanName('Receipt ' + rc.no.replace(/\//g, '-') + ' ' + dmy(rc.date) + (rc.state === 'Cancelled' ? ' CANCELLED' : '')) + '.docx', rc.paper || paperOf('receipt'));
}

/* ---------- after a document is made: open / PDF / share / download ---------- */
function docReady(m, r, title, back, backLabel) {
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>${esc(title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">${esc(r.name)}${r.itemId ? ' · saved in the case folder › ' + (r.where || FEE_DIR_NAME[m.id] || '5 Fees') : ''}</p>
    <div class="three"><button class="act primary" data-dk="open">Open in Word</button><button class="act blue" data-dk="pdf">PDF</button><button class="act blue" data-dk="share">Share</button></div>
    <button class="ghost" data-dk="dl" style="width:100%;margin-top:8px">Download</button>
    <button class="linkbtn" data-dk="back" style="margin-top:10px">‹ ${back ? (backLabel || 'Back to Letters &amp; notices') : 'Back to Fees &amp; payments'}</button>`);
  const dl = (blob, n) => { const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = n; document.body.appendChild(x); x.click(); x.remove(); };
  $('#sheet-root').onclick = async e => {
    const b = e.target.closest('[data-dk]'); if (!b) return;
    const a = b.dataset.dk;
    if (a === 'back') return back ? back() : sheetFees(m);
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
function sheetBill(m, bill, replaces) {
  if (!m.clientCode) return askCode(m, () => sheetBill(m, bill, replaces));
  if (bill && bill.paper) PAPER_NOW.bill = bill.paper; else delete PAPER_NOW.bill;
  const isNew = !bill, d0 = todayIso(), src = bill || replaces;
  const st = { items: src ? src.items.map(x => ({ ...x })) : (typeof defaultBillItems === 'function' ? defaultBillItems(m) : [{ d: 'Professional fee for ' + (m.type ? m.type + ' ' : '') + (m.caseNo || 'the above matter'), amt: feeDue(m) || '' }]), sig: true,
    terms: src && src.terms ? src.terms.slice() : defaultTerms(), extra: src ? src.extraTerms || '' : (S.data?.meta?.billTermsExtra || ''), dueDays: (src && src.dueDays) || (S.data?.meta?.billDueDays) || 7 };
  if (bill && bill.state === 'Cancelled') { toast('This bill is cancelled; make a fresh bill instead'); return sheetBill(m, null, bill); }
  const draw = () => {
    const tot = st.items.reduce((s, x) => s + num(x.amt), 0);
    openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(matterRef(m))} · ${isNew ? (replaces ? 'new bill in place of ' + esc(replaces.no) : 'new bill') : 'bill ' + esc(bill.no)}</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <form id="billform" class="grp" style="gap:12px">
        <div class="two"><div class="field"><label for="b_no">BILL NO.</label><input class="in" id="b_no" name="no" value="${esc(bill ? bill.no : numNo('BILL', d0, nextSeq('BILL', d0)))}"></div><div class="field"><label for="b_date">DATE</label><input class="in" type="date" id="b_date" name="date" value="${esc(bill ? bill.date : d0)}"></div></div>
        <div class="field"><label for="b_to">TO (NAME AND ADDRESS)</label><textarea class="in" id="b_to" name="to" rows="3">${esc(src ? src.to : [m.clients || '', typeof clientInfo === 'function' ? clientInfo(m.clients).address || '' : ''].filter(Boolean).join('\n'))}</textarea></div>
        <span class="lbl">Particulars</span>
        ${st.items.map((it, i) => `<div class="two" style="grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) auto;align-items:end"><div class="field" style="margin:0"><input class="in" data-bi="d" data-i="${i}" value="${esc(it.d)}" placeholder="e.g. Drafting and filing of ${esc(m.type || 'application')}"></div><div class="field" style="margin:0"><input class="in" data-bi="amt" data-i="${i}" inputmode="numeric" value="${esc(it.amt)}" placeholder="₹"></div>${st.items.length > 1 ? `<button type="button" class="linkbtn" data-bx="rm" data-i="${i}" style="color:var(--red)">✕</button>` : '<span></span>'}</div>`).join('')}
        <button type="button" class="ghost" data-bx="add">+ Add a line</button>
        ${(() => { if (typeof unbilledDates !== 'function') return ''; const inBill = new Set(st.items.flatMap(x => x.dates || [])), left = unbilledDates(m).filter(d => !inBill.has(d)); return left.length ? `<button type="button" class="ghost" data-bx="dates">+ Date fees not yet billed (${left.length} date${left.length > 1 ? 's' : ''}, ${rupees(left.length * dateFeeRate(m))})</button>` : ''; })()}
        <div class="picked"><b>Total ${rupees(tot)}</b><span>Rupees ${esc(inWords(tot))} only</span></div>
        <span class="lbl">Terms (printed under the total)</span>
        <div class="terms">${BILL_TERMS.map(([k, t]) => `<label class="term"><input type="checkbox" data-bt="${k}" ${st.terms.includes(k) ? 'checked' : ''}><span>${esc(k === 'due' ? t.replace('7', st.dueDays) : typeof efFillOut === 'function' ? efFillOut(m, t) : t)}${k === 'due' ? ` <input class="in" data-bd="1" inputmode="numeric" value="${st.dueDays}" style="width:56px;min-height:32px;padding:2px 6px;display:inline-block"> days` : ''}</span></label>`).join('')}</div>
        <div class="field"><label for="b_extra">YOUR OWN TERMS (ONE PER LINE)</label><textarea class="in" id="b_extra" rows="2">${esc(st.extra)}</textarea></div>
        <button type="button" class="linkbtn" data-bx="deft">Save these terms as my default for new bills</button>
        <div class="field"><label for="b_note">NOTE (OPTIONAL)</label><input class="in" id="b_note" name="note" value="${esc(bill ? bill.note || '' : replaces ? 'Issued in place of cancelled Bill No. ' + replaces.no + ' dated ' + dmy(replaces.date) + '.' : '')}" placeholder="e.g. First of four quarterly instalments"></div>
        ${paperSwitch('bill')}
        <div class="toggles"><label><span>Add my signature</span><input type="checkbox" id="b_sig" ${st.sig ? 'checked' : ''}></label></div>
        <button class="save" type="submit">${isNew ? 'Make bill' : 'Save and remake bill'}</button>
      </form>`);
    $('#billform').onsubmit = submit;
  };
  const keep = () => { const v = {}; ['b_no', 'b_date', 'b_to', 'b_note'].forEach(id => { const el = $('#' + id); if (el) v[id] = el.value; }); st.sig = $('#b_sig')?.checked;
    st.terms = [...document.querySelectorAll('[data-bt]')].filter(x => x.checked).map(x => x.dataset.bt); st.extra = $('#b_extra')?.value || ''; st.dueDays = +($('[data-bd]')?.value) || st.dueDays; return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = $('#' + id); if (el) el.value = val; });
  async function submit(e) {
    e.preventDefault();
    const v = keep(), items = st.items.filter(x => (x.d || '').trim() || num(x.amt));
    const total = items.reduce((s, x) => s + num(x.amt), 0); if (!total) return toast('Enter the amount');
    if (st.sig && !(localStorage.getItem(SIG_KEY) || S.data?.meta?.sigItem)) { const ok = await chooseSignature(); if (!ok) { st.sig = false; } }
    const rec = bill || { id: uid() };
    if (isNew && replaces) rec.replaces = replaces.no;
    Object.assign(rec, { paper: paperOf('bill'), no: v.b_no.trim(), date: v.b_date || todayIso(), to: v.b_to.trim(), note: v.b_note.trim(), items: items.map(x => ({ d: x.d.trim(), amt: num(x.amt), ...(x.kind ? { kind: x.kind } : {}), ...(x.dates ? { dates: x.dates } : {}) })), total, terms: st.terms.slice(), extraTerms: st.extra.trim(), dueDays: st.dueDays });
    change(() => { freezeRef(m); m.bills = m.bills || []; if (isNew) m.bills.push(rec); if (isNew && replaces) replaces.by = rec.no; logChange(m, (isNew ? 'Bill made: ' : 'Bill remade: ') + rec.no + ' · ' + rupees(total)); touch(m); });
    const n = +(rec.no.split('/').pop()) || 0; if (isNew && n) bumpSeq('BILL', rec.date, n);
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Making bill…</h1></div></div>`);
    try { const r = await makeBillDoc(m, rec, st.sig); docReady(m, r, 'Bill ' + rec.no); } catch (er) { toast(er.message); sheetFees(m); }
  }
  draw();
  $('#sheet-root').oninput = e => { const el = e.target.closest('[data-bi]'); if (el) st.items[+el.dataset.i][el.dataset.bi] = el.value; };
  $('#sheet-root').onclick = e => {
    const b = e.target.closest('[data-bx]'); if (!b) return;
    const v = keep();
    if (b.dataset.bx === 'deft') { change(d => { d.meta = d.meta || {}; d.meta.billTerms = st.terms.slice(); d.meta.billTermsExtra = st.extra.trim(); d.meta.billDueDays = st.dueDays; }); toast('Saved as your default terms'); return; }
    if (b.dataset.bx === 'dates') { const inBill = new Set(st.items.flatMap(x => x.dates || [])), left = unbilledDates(m).filter(d => !inBill.has(d)); if (left.length) st.items.push(dateFeeLine(m, left)); }
    else if (b.dataset.bx === 'add') st.items.push({ d: '', amt: '' }); else st.items.splice(+b.dataset.i, 1);
    draw(); restore(v);
  };
}

/* ---------- receipt sheet ---------- */
async function sheetReceipt(m, payId, replaces) {
  if (!m.clientCode) return askCode(m, () => sheetReceipt(m, payId, replaces));
  delete PAPER_NOW.receipt;
  if (m.folderId && !sheetReceipt.busy) {
    sheetReceipt.busy = true;
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · receipt</small><h1>Reading bills in the fees folder…</h1></div></div>`);
    try { const n = await syncFolderBills(m); if (n) toast(n + ' bill' + (n > 1 ? 's' : '') + ' found in the fees folder', 3000); } catch (e) {}
    sheetReceipt.busy = false;
  }
  const pays = (m.payments || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  if (!pays.length) { toast('Record the payment first, then make its receipt'); return sheetFees(m, 'pay'); }
  const pp0 = (m.payments || []).find(x => x.id === (payId || pays[0].id));
  const bills = (m.bills || []).filter(x => x.state !== 'Cancelled').filter(x => billPaid(m, x) < num(x.total) || !num(x.total) || (pp0 && pp0.billId === x.id)).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const st = { pay: payId || pays[0].id, bill: '', sig: true };
  const pp = pays.find(x => x.id === st.pay); st.bill = pp && pp.billId ? pp.billId : (bills.find(b => billPaid(m, b) < num(b.total)) || bills[0] || {}).id || '';
  const d0 = todayIso();
  openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(matterRef(m))} · ${replaces ? 'receipt in place of ' + esc(replaces.no) : 'receipt'}</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="rcform" class="grp" style="gap:12px">
      <div class="field"><label for="r_pay">PAYMENT</label><select class="in" id="r_pay">${pays.map(p => `<option value="${p.id}" ${p.id === st.pay ? 'selected' : ''}>${rupees(num(p.amount) + num(p.tds))}${num(p.tds) ? ' (incl. TDS)' : ''} · ${p.date ? dmy(p.date) : 'no date'}${p.mode ? ' · ' + esc(p.mode) : ''}${p.receiptNo ? ' · receipt ' + esc(p.receiptNo) : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="r_bill">AGAINST BILL</label><select class="in" id="r_bill"><option value="">— No bill —</option>${bills.map(b => { const paid = billPaid(m, b); return `<option value="${b.id}" ${b.id === st.bill ? 'selected' : ''}>${esc(b.no)} · ${b.date ? dmy(b.date) : ''} · ${num(b.total) ? rupees(b.total) : 'amount ?'} · ${paid ? 'part-paid ' + rupees(paid) : 'unpaid'}${b.fromFolder ? ' · ' + esc(FEE_DIR_NAME[m.id] || 'fees folder') : ''}</option>`; }).join('')}</select>
        <p class="hint" style="margin:6px 0 0">${bills.length ? 'Unpaid bills of this matter, including those kept in its fees folder (' + esc(FEE_DIR_NAME[m.id] || '5 …') + ').' : 'No unpaid bill on this matter or in its fees folder.'} <button type="button" class="linkbtn" data-rx="bill">Make a bill</button></p></div>
      <div class="two"><div class="field"><label for="r_no">RECEIPT NO.</label><input class="in" id="r_no" value="${esc(pp && pp.receiptNo ? pp.receiptNo : numNo('RCPT', d0, nextSeq('RCPT', d0)))}"></div><div class="field"><label for="r_date">DATE</label><input class="in" type="date" id="r_date" value="${esc(d0)}"></div></div>
      <div class="field"><label for="r_from">RECEIVED FROM</label><input class="in" id="r_from" value="${esc(replaces ? replaces.from || m.clients || '' : m.clients || '')}"></div>
      ${paperSwitch('receipt')}
      <div class="toggles"><label><span>Add my signature</span><input type="checkbox" id="r_sig" checked></label></div>
      <button class="save" type="submit">Make receipt</button>
      <button type="button" class="linkbtn" data-rx="sig">Change signature image</button>
    </form>`);
  $('#sheet-root').onclick = async e => { const b = e.target.closest('[data-rx]'); if (!b) return; if (b.dataset.rx === 'bill') sheetBill(m); else { await chooseSignature(); sheetReceipt(m, $('#r_pay')?.value || st.pay); } };
  $('#rcform').onsubmit = async e => {
    e.preventDefault();
    const pay = (m.payments || []).find(x => x.id === $('#r_pay').value), billId = $('#r_bill').value, bill = (m.bills || []).find(x => x.id === billId) || null;
    const rc = { id: uid(), no: $('#r_no').value.trim(), date: $('#r_date').value || todayIso(), from: $('#r_from').value.trim(), payId: pay.id, billId, paper: paperOf('receipt'), amount: num(pay.amount) + num(pay.tds), tds: num(pay.tds), mode: pay.mode || '', ...(replaces ? { replaces: replaces.no } : {}) };
    if ((m.receipts || []).some(x => x.no === rc.no && x.state !== 'Cancelled' && x.payId !== pay.id) || live().some(x => x.id !== m.id && (x.receipts || []).some(y => y.no === rc.no))) return toast('Receipt no. ' + rc.no + ' is already used');
    let sig = $('#r_sig').checked;
    if (sig && !(localStorage.getItem(SIG_KEY) || S.data?.meta?.sigItem)) { const ok = await chooseSignature(); if (!ok) sig = false; }
    change(() => { freezeRef(m); if (replaces) replaces.by = rc.no; pay.billId = billId || ''; pay.receiptNo = rc.no; m.receipts = m.receipts || []; const old = m.receipts.find(x => x.no === rc.no && x.payId === pay.id && x.state !== 'Cancelled'); if (old) { Object.assign(old, rc, { id: old.id }); rc.id = old.id; } else m.receipts.push(rc); logChange(m, 'Receipt ' + rc.no + ' for ' + rupees(pay.amount) + (bill ? ' against bill ' + bill.no : '')); touch(m); });
    const n = +(rc.no.split('/').pop()) || 0; if (n) bumpSeq('RCPT', rc.date, n);
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Making receipt…</h1></div></div>`);
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
