/* Screenshot / photo reader for Today and Matters.
   Reads, on the phone itself (free text reader in lib/ocr, English and Hindi, nothing sent anywhere):
   · eCourts case status (district courts) · High Court case status · a district cause list · an order sheet / order
   · the High Court listing e-mail (handed to the listing reader in hclist.js).
   What it finds is shown for checking; nothing changes until "Apply". Dates, court no. and item no. are set on the matter;
   case details fill only empty boxes, and anything different from what SM Chambers already has waits for his say
   (the same "differences from the papers" card as details.js). A case not in SM Chambers is offered as a new matter. */
'use strict';

/* ---------- reading (pure, also used by the test script) ---------- */
const SR_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  'जनवरी': 1, 'फरवरी': 2, 'मार्च': 3, 'अप्रैल': 4, 'मई': 5, 'जून': 6, 'जुलाई': 7, 'अगस्त': 8, 'सितम्बर': 9, 'सितंबर': 9, 'अक्टूबर': 10, 'नवम्बर': 11, 'नवंबर': 11, 'दिसम्बर': 12, 'दिसंबर': 12 };
const srDigits = s => String(s || '').replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
const srIso = (d, m, y) => { d = +d; m = +m; y = +y; if (y < 100) y += 2000; if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1980 && y <= 2100)) return ''; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
const SR_DATE_RE = /\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*((?:19|20)?\d{2})\b|\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:of\s+)?([A-Za-z]{3,9}|[ऀ-ॿ]{2,9})[,.]?\s+((?:19|20)\d{2})\b|\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2})\b/g;
/* every date in a piece of text, in order, as yyyy-mm-dd */
function srDates(s) {
  const out = []; s = srDigits(s);
  for (const x of s.matchAll(SR_DATE_RE)) {
    let iso = '';
    if (x[1]) iso = srIso(x[1], x[2], x[3]);
    else if (x[4]) { const mo = SR_MON[x[5].toLowerCase().slice(0, /[a-z]/i.test(x[5]) ? (x[5].toLowerCase().startsWith('sept') ? 4 : 3) : 20)] || SR_MON[x[5]]; if (mo) iso = srIso(x[4], mo, x[6]); }
    else if (x[7]) { const mo = SR_MON[x[7].toLowerCase().slice(0, 3)]; if (mo) iso = srIso(x[8], mo, x[9]); }
    if (iso) out.push({ iso, at: x.index, end: x.index + x[0].length });
  }
  return out;
}
const srFirstDate = s => (srDates(s)[0] || {}).iso || '';
const srClean = s => String(s || '').replace(/[|_]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s:;,.\-–]+|[\s:;,.\-–]+$/g, '').trim();
/* the value after a label on the same line (or the next line when the label stands alone) */
function srField(lines, re, stop) {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re); if (!m) continue;
    let v = lines[i].slice(m.index + m[0].length);
    if (stop) v = v.split(stop)[0];
    v = srClean(v);
    if (!v && lines[i + 1] && !/:\s*$/.test(lines[i + 1])) v = srClean(stop ? lines[i + 1].split(stop)[0] : lines[i + 1]);
    if (v) return v;
  }
  return '';
}
/* the parties block of eCourts / High Court status: "1) Ram Kumar Advocate - X  2) ..." → "Ram Kumar & Anr." */
function srParties(lines, re, stopRe) {
  let i = lines.findIndex(l => re.test(l)); if (i < 0) return '';
  const got = [];
  let first = lines[i].replace(re, '');
  for (let j = i; j < Math.min(lines.length, i + 8); j++) {
    const l = j === i ? first : lines[j];
    if (j > i && (stopRe.test(l) || /^\s*(acts?|under|fir|history|case|police|interim|orders?|category|subordinate|ia\b|connected|transfer|cnr|next|last|listing|court|stage|status|filing|registration|district|state\s*:|petitioner|respondent)/i.test(l))) break;
    for (const bit of l.split(/\b\d\)\s*/)) {
      const n = srClean(bit.replace(/\bAdvocate\s*[-:–].*$/i, '').replace(/\b(?:counsel|adv\.)\s*[-:–].*$/i, ''));
      if (n && /[A-Za-zऀ-ॿ]{3}/.test(n) && !/^(and\s+advocate|advocate|name)$/i.test(n)) got.push(n);
    }
  }
  if (!got.length) return '';
  const t = s => s.replace(/\bS\/O\b|\bD\/O\b|\bW\/O\b.*$/i, '').replace(/\s{2,}/g, ' ').trim();
  let n0 = t(got[0]).replace(/\s+AND\s+ANOTHER\.?$/i, ' & Anr.').replace(/\s+AND\s+(?:OTHERS|ORS)\.?$/i, ' & Ors.');
  if (/&\s*(Anr|Ors)\.$/.test(n0)) return n0;
  return n0 + (got.length === 2 ? ' & Anr.' : got.length > 2 ? ' & Ors.' : '');
}
/* "APPLICATION U/S 482 No. - 2787 of 2024", "CRLR 123/2024", "Crl. Case No. 1431/2008", "1234/2024" */
function srCaseNo(s) {
  s = srDigits(s);
  const m = s.match(/\b(\d{1,6})\s*(?:\/|of|-)\s*((?:19|20)\d{2})\b/i);
  return m ? (+m[1]) + '/' + m[2] : '';
}
const SR_CNR = /\b([A-Z]{4}\s?\d{2}\s?\d{4,6}\s?\d{4})\b/;
function srCnr(text) {
  const t = text.replace(/[Oo](?=\d)/g, '0');
  const m = t.toUpperCase().match(/\bCNR\s*(?:NUMBER|NO\.?)?\s*[:\-]?\s*([A-Z0-9 ]{14,20})/) || t.toUpperCase().match(SR_CNR);
  if (!m) return '';
  const v = m[1].replace(/\s+/g, '').replace(/O/g, '0').slice(0, 16);
  return /^[A-Z]{4}\d{12}$/.test(v) ? v : '';
}
/* the app's matter type from the case-type words */
function srType(s) {
  s = String(s || '');
  if (/anticipatory|\bA\.?B\.?A\b|438|482\s*bnss/i.test(s) && /bail/i.test(s)) return 'ABA';
  if (/\b482\b|\b528\b/.test(s) && /appl|u\/s|section|crl|bnss|cr\.?p\.?c/i.test(s)) return '482/528';
  if (/bail/i.test(s)) return 'Bail';
  if (/revision|\bCRLR\b|\bREV\b/i.test(s)) return 'Revision';
  if (/appeal|\bCRLA\b|\bFAFO\b|\bSPLA\b/i.test(s)) return 'Appeal';
  if (/writ|\bW\.?P\b|\bCRLP\b|\bWRIT/i.test(s)) return 'Writ';
  if (/\b138\b|N\.?\s?I\.?\s*Act|negotiable/i.test(s)) return '138 NI';
  if (/domestic violence|\bD\.?V\.?\s*Act/i.test(s)) return 'DV';
  if (/\b125\b|\b144\b.*bnss|maintenance/i.test(s)) return '125';
  if ((/complaint/i.test(s) && !/consumer/i.test(s)) || /परिवाद/.test(s)) return 'Criminal Complaint';
  if (/निगरानी/.test(s)) return 'Revision';
  if (/जमानत/.test(s)) return 'Bail';
  if (/execution/i.test(s)) return 'Execution';
  if (/arbitra/i.test(s)) return 'Arbitration';
  if (/\bsuit\b|\bO\.?S\.?\b|original\s+suit|regular\s+suit/i.test(s)) return 'Civil Suit';
  if (/consumer/i.test(s)) return 'Consumer';
  if (/\bRERA\b/i.test(s)) return 'RERA';
  return '';
}
function srForum(text, cnr) {
  if (/^UPHC/.test(cnr || '') || /high court|allahabad|lucknow bench/i.test(text)) return 'HC';
  if (/family court|principal judge,? family/i.test(text)) return 'Family';
  if (/consumer|\bC\.?D\.?R\.?C\b|district commission/i.test(text)) return 'Consumer';
  if (/tribunal|\bAFT\b|\bDRT\b|\bRERA\b/i.test(text)) return 'Tribunal';
  if (/tehsil|tahsil|\bSDM\b|sub[- ]divisional|board of revenue|\bA\.?D\.?M\b|collector|naib/i.test(text)) return 'Revenue';
  return 'District';
}
const SR_PURPOSE = ['Evidence', 'Arguments', 'Final arguments', 'Appearance', 'Charge', 'Framing of charge', 'Hearing', 'Admission', 'Orders', 'Order', 'Judgment', 'Judgement', 'Summons', 'Service', 'Bail hearing', 'Statement u/s 313', 'Statement of accused', 'Cross-examination', 'Defence evidence', 'Prosecution evidence', 'Plaintiff evidence', 'Written statement', 'Issues', 'Objection', 'Reply', 'Rejoinder', 'Counter affidavit', 'Misc', 'Disposal', 'Compliance', 'Fresh', 'Report', 'Mediation', 'Conciliation', 'Discharge', 'Cognizance', 'Pairvi'];
const SR_HI_PURPOSE = { 'साक्ष्य': 'Evidence', 'गवाही': 'Evidence', 'बहस': 'Arguments', 'आदेश': 'Orders', 'सुनवाई': 'Hearing', 'आरोप': 'Charge', 'हाजिरी': 'Appearance', 'उपस्थिति': 'Appearance', 'निर्णय': 'Judgment', 'जमानत': 'Bail hearing', 'तलबी': 'Summons', 'आपत्ति': 'Objection', 'जवाब': 'Reply', 'बयान': 'Statement of accused', 'तामील': 'Service', 'निस्तारण': 'Disposal' };
const srPurposeIn = s => { const l = String(s || '').toLowerCase(); let best = ''; for (const p of SR_PURPOSE) { const i = l.indexOf(p.toLowerCase()); if (i >= 0 && p.length > best.length) best = p; } return best; };

/* one case: eCourts case status, High Court case status, or an order */
function srOne(text) {
  const lines = text.split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean), all = lines.join('\n');
  const r = { cnr: srCnr(all) };
  r.isOrder = /\border\s*sheet|\border\s*dated|\bheard\b|\bput\s*up\b|\blist\s*on\b|\bfixed\s*for\b|\bpresent\s*:|पेश\s*हो|नियत|वास्ते|आदेश/i.test(all) && !/case\s*status|case\s*details|registration\s*number/i.test(all);
  const ctype = srField(lines, /\bcase\s*type\s*[:\-]?/i, /\s{2,}|filing|registration/i);
  const reg = srField(lines, /\bregistration\s*(?:number|no\.?)\s*[:\-]?/i, /registration\s*date|date/i);
  const fil = srField(lines, /\bfiling\s*(?:number|no\.?)\s*[:\-]?/i, /filing\s*date|date/i);
  const hcNo = (all.match(/\b(?:APPLICATION|APPLN|CRIMINAL|CIVIL|WRIT|BAIL|CRL|CRLR|CRLA|CRLP|FIRST|SECOND|SPECIAL|MATTERS|MISC)[A-Z .()\/0-9-]{0,60}?\bNo\.?\s*[-–:]?\s*\d{1,6}\s*(?:of|\/)\s*(?:19|20)\d{2}\b/i) || [])[0] || '';
  const anyNo = (all.match(/(?<![A-Za-z])(?:case|crl\.?|criminal|complaint|suit|o\.?s\.?|misc\.?|s\.?t\.?|session|bail|appeal|revision|execution|petition|application|परिवाद|वाद|मुकदमा|मु\.|फौजदारी|प्रकीर्ण|सत्र|केस|अपील|निगरानी|जमानत)[A-Za-z\u0900-\u097F .]{0,30}?(?:no\.?|number|सं\.?|संख्या)\s*[:\-]?\s*\d{1,6}\s*(?:\/|of|-)\s*(?:19|20)?\d{2,4}\b/i) || [])[0] || '';
  r.caseNo = srCaseNo(reg) || srCaseNo(hcNo) || srCaseNo(anyNo) || '';
  r.filingNo = srCaseNo(fil) && srCaseNo(fil) !== r.caseNo ? srCaseNo(fil) : '';
  r.type = srType(ctype + ' ' + hcNo + ' ' + anyNo);
  r.caseText = srClean(hcNo) || (ctype ? srClean(ctype) + ' ' + r.caseNo : srClean(anyNo));
  // dates: next hearing / next listing / put up on …
  const nextLbl = /\b(?:next\s*(?:hearing\s*)?(?:date|listing\s*date|listing|hearing)|date\s*of\s*next\s*hearing|next\s*date\s*of\s*hearing|likely\s*(?:listing|date)|tentative\s*date|listed\s*on|to\s*be\s*listed\s*on)\s*[:\-]?/i;
  r.nextDate = srFirstDate(srField(lines, nextLbl));
  r.lastDate = srFirstDate(srField(lines, /\b(?:last\s*(?:listed|listing|hearing)\s*(?:date|on)?|previous\s*(?:hearing\s*)?date|business\s*on\s*date|last\s*date)\s*[:\-]?/i));
  r.firstDate = srFirstDate(srField(lines, /\bfirst\s*hearing\s*date\s*[:\-]?/i));
  r.decided = /\b(?:decision\s*date|nature\s*of\s*disposal|case\s*disposed|disposed\s*of)\b/i.test(all) && !r.nextDate;
  r.stage = srClean(srField(lines, /\b(?:case\s*stage|stage\s*of\s*case|stage|purpose\s*of\s*(?:hearing|listing)|purpose)\s*[:\-]?/i, /\s{2,}|next\s*hearing|court\s*number/i)).slice(0, 60);
  // court and court no.
  const cj = srField(lines, /\bcourt\s*(?:number\s*and\s*judge|no\.?\s*(?:and|&)\s*judge|name)\s*[:\-]?/i);
  const cn = cj.match(/^\s*(\d{1,3})\s*[-–:.]\s*(.+)$/);
  r.courtNo = cn ? cn[1] : (srField(lines, /\bcourt\s*(?:no\.?|number|room)\s*[:\-]?/i).match(/^\d{1,3}\b/) || [''])[0];
  r.court = srClean(cn ? cn[2] : cj).replace(/\bjudge\s*[:\-]?\s*$/i, '').slice(0, 90);
  r.item = (srField(lines, /\b(?:item|serial|sr\.?|s\.?\s?no\.?|list\s*serial)\s*(?:no\.?|number)?\s*[:\-]/i).match(/^\d{1,4}\b/) || [''])[0];
  // parties
  if (!r.isOrder) r.pet = srParties(lines, /^.*?\b(?:petitioner|appellant|applicant|complainant|plaintiff|revisionist)s?\s*(?:and|&)?\s*(?:advocate|counsel)?\s*(?:name)?\s*[:\-]?/i, /\b(?:respondent|opposite\s*part|accused|defendant)/i);
  if (!r.isOrder) r.opp = srParties(lines, /^.*?\b(?:respondent|opposite\s*part(?:y|ies)|accused|defendant)s?\s*(?:and|&)?\s*(?:advocate|counsel)?\s*(?:name)?\s*[:\-]?/i, /\b(?:acts?|under|fir|history|police|petitioner)/i);
  const vs = all.match(/^(.{3,120}?)\s+(?:vs\.?|v\.|v\/s|versus|बनाम)\s+(.{3,80})$/im);
  if (vs && !r.pet) r.pet = srClean(vs[1].replace(/^.*?\b\d{1,6}\s*(?:\/|of)\s*(?:19|20)\d{2}\b/i, '')); if (vs && !r.opp) r.opp = srClean(vs[2]);
  // FIR and sections
  r.ps = srClean(srField(lines, /\bpolice\s*station\s*[:\-]?|\bP\.?\s?S\.?\s*[:\-]|थाना\s*[:\-]?/i, /\s{2,}|fir\s*(?:number|no)|year|crime/i)).slice(0, 50);
  const fno = srField(lines, /\b(?:FIR|crime)\s*(?:number|no\.?|सं\.?)\s*[:\-]?|मु\.?\s*अ\.?\s*सं\.?\s*[:\-]?/i, /\s{2,}|year|police/i);
  const fy = (srField(lines, /\bFIR\s*year\s*[:\-]?|\byear\s*[:\-]/i).match(/(?:19|20)\d{2}/) || [''])[0];
  const fm = srDigits(fno).match(/^(\d{1,5})(?:\s*(?:\/|of|-)\s*((?:19|20)?\d{2,4}))?/);
  r.crimeNo = fm ? fm[1] + '/' + (fm[2] ? (fm[2].length === 2 ? '20' + fm[2] : fm[2]) : fy || '') : '';
  r.crimeNo = r.crimeNo.replace(/\/$/, '');
  const act = srField(lines, /\bunder\s*(?:act\(?s?\)?|section\(?s?\)?)\s*(?:under\s*section\(?s?\)?)?\s*[:\-]?|\bu\/s\.?|धारा/i);
  r.sections = srClean(act.replace(/^\s*act\(?s?\)?\s*/i, '')).slice(0, 80);
  if (/\bNo\.?\s*[-–:]?\s*\d+\s*(?:of|\/)\s*\d{4}/i.test(r.sections)) r.sections = '';
  if (!r.ps && !r.crimeNo && !/\d/.test(r.sections)) r.sections = '';
  // an order: "put up on / list on / fixed for … on DATE", Hindi "दिनांक … को पेश हो"
  const ord = /\b(?:put\s*up|list(?:ed)?|fix(?:ed)?|adjourned|posted|come\s*up|awaited|next\s*date)\b[^\n]{0,80}/i;
  if (r.isOrder) {
    const ds = srDates(all); r.orderDate = ds.length ? ds[0].iso : '';
    let nd = '';
    for (const x of all.matchAll(new RegExp(ord.source, 'gi'))) { const d = srFirstDate(x[0]); if (d) nd = d; }
    for (const x of all.matchAll(/(?:दिनांक|दि\.|तिथि|तारीख)[^\n]{0,40}?(?:को|पर)?[^\n]{0,30}(?:पेश|नियत|सूचीबद्ध|प्रस्तुत)/g)) { const d = srFirstDate(x[0]); if (d) nd = d; }
    if (!nd && ds.length > 1) nd = ds.map(x => x.iso).sort().pop();
    if (!r.nextDate && nd && nd !== r.orderDate) r.nextDate = nd;
    if (!r.stage) { const f = all.match(/\bfor\s+([a-z][a-z .\/-]{2,40}?)\s+(?:on|before|dated)\b/i); const h = all.match(/([\u0900-\u097F]+)\s+(?:हेतु|के\s+लिये|के\s+लिए)/) || all.match(/वास्ते\s+([\u0900-\u097F]+)/);
      r.stage = f ? srClean(f[1]).replace(/^./, c => c.toUpperCase()) : h ? (SR_HI_PURPOSE[h[1]] || h[1]) : srPurposeIn(all); }
  }
  if (!r.stage) r.stage = '';
  r.forum = srForum(all, r.cnr);
  r.status = (srField(lines, /\bcase\s*status\s*[:\-]?|\bstatus\s*[:\-]/i).match(/pending|disposed|decided|dismissed|allowed/i) || [''])[0];
  if (/disposed|decided|dismissed|allowed/i.test(r.status)) r.decided = true;
  r.district = srClean(srField(lines, /\bdistrict\s*[:\-]/i, /\s{2,}|state/i)).slice(0, 30);
  return r;
}
/* several cases: a district cause list (or any list with three or more case numbers) */
function srList(text) {
  const lines = srDigits(text).split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const hd = lines.slice(0, 8).join(' ');
  const date = srFirstDate((hd.match(/(?:cause\s*list|daily\s*list|list\s*of\s*business|board|वाद\s*सूची|दैनिक)[^\n]{0,60}/i) || [hd])[0]) || srFirstDate(hd);
  const court = srClean((hd.match(/(?:court\s*of\s*|in\s*the\s*court\s*of\s*|न्यायालय\s*)([^,\n]{4,70})/i) || [])[1] || '');
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], m = l.match(/^(?:(\d{1,3})[.)\s]\s*)?(.*?)\b(\d{1,6})\s*\/\s*((?:19|20)\d{2})\b(.*)$/);
    if (!m || /listed\s+on|cause\s*list\s*(?:for|dated)/i.test(l)) continue;
    let rest = m[5]; if (!/v(?:s|\/s)?\.?\s|versus|बनाम/i.test(rest) && lines[i + 1] && /v(?:s|\/s)?\.?\s|versus|बनाम/i.test(lines[i + 1]) && !/\d{1,6}\s*\/\s*(?:19|20)\d{2}/.test(lines[i + 1])) rest += ' ' + lines[i + 1];
    const pv = rest.split(/\s+(?:vs?\.?|v\/s|versus|बनाम)\s+/i);
    const purpose = srPurposeIn(rest);
    const strip = s => srClean(s.replace(new RegExp('\\b' + (purpose || '#none#').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b.*$', 'i'), ''));
    rows.push({ item: m[1] || '', prefix: srClean(m[2]), caseNo: (+m[3]) + '/' + m[4], type: srType(m[2]), pet: strip(pv[0] || ''), opp: pv[1] ? strip(pv[1]) : '', stage: purpose, nextDate: date });
  }
  const seen = new Set(); return { date, court, rows: rows.filter(r => !seen.has(r.caseNo + r.prefix) && seen.add(r.caseNo + r.prefix)) };
}
/* what kind of screenshot it is */
function srKind(text) {
  const t = srDigits(text);
  if (/listed\s+on\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\s+for\b/i.test(t) || (/case\s*serial/i.test(t) && /court\s*no/i.test(t))) return 'hclist';
  const nos = new Set((t.match(/\b\d{1,6}\s*\/\s*(?:19|20)\d{2}\b/g) || []).map(x => x.replace(/\s/g, '')));
  if (/cause\s*list|daily\s*list|वाद\s*सूची|list\s*of\s*business/i.test(t) && nos.size >= 2) return 'list';
  if (nos.size >= 4 && !/case\s*status|registration\s*number|cnr\s*number/i.test(t)) return 'list';
  return 'one';
}
if (typeof module !== 'undefined') module.exports = { srOne, srList, srKind, srDates, srType, srCnr };

/* ---------- on the phone ---------- */
if (typeof window !== 'undefined') {
  let srWorker = null;
  const loadOcr = () => new Promise((ok, no) => { if (window.Tesseract) return ok(); const s = document.createElement('script'); s.src = 'lib/ocr/tesseract.min.js'; s.onload = ok; s.onerror = () => no(new Error('Could not load the text reader')); document.head.appendChild(s); });
  async function worker(say) {
    if (srWorker) return srWorker;
    await loadOcr();
    const base = new URL('lib/ocr/', location.href).href, opt = { workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: true,
      logger: m => { if (m.status && say) say(m.status === 'recognizing text' ? 'Reading… ' + Math.round((m.progress || 0) * 100) + '%' : 'Getting the reader ready…'); } };
    try { srWorker = await Tesseract.createWorker(['eng', 'hin'], 1, opt); } catch (e) { srWorker = await Tesseract.createWorker('eng', 1, opt); }
    await srWorker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' });
    return srWorker;
  }
  async function prep(file) {
    const bmp = await createImageBitmap(file), sc = Math.min(1, 2600 / Math.max(bmp.width, bmp.height)) * (Math.max(bmp.width, bmp.height) < 1200 ? 1.6 : 1);
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
    const im = g.getImageData(0, 0, c.width, c.height), p = im.data; let sum = 0;
    for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = y; sum += y; }
    const inv = sum / (p.length / 4) < 110; let lo = 255, hi = 0;
    for (let i = 0; i < p.length; i += 4) { const v = inv ? 255 - p[i] : p[i]; p[i] = p[i + 1] = p[i + 2] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = 255 / Math.max(1, hi - lo); for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = (p[i] - lo) * k;
    g.putImageData(im, 0, 0); return c;
  }
  async function readText(file, say) { const c = await prep(file), w = await worker(say); const { data } = await w.recognize(c); return data.text || ''; }

  /* which matter: same CNR; else same case no./year (same forum and type if several); else same FIR; else a party's name */
  function srMatch(r) {
    const L = live();
    if (r.cnr) { const h = L.filter(m => String(m.cnr || '').toUpperCase() === r.cnr); if (h.length) return h; }
    if (r.caseNo) {
      let h = L.filter(m => caseKeyOf(m.caseNo) === r.caseNo || caseKeyOf(m.filingNo) === r.caseNo);
      if (h.length > 1) { const f = h.filter(m => m.forum === r.forum); if (f.length) h = f; }
      if (h.length > 1 && r.type) { const f = h.filter(m => m.type === r.type); if (f.length) h = f; }
      if (h.length) return h;
    }
    if (r.crimeNo) { const k = caseKeyOf(r.crimeNo) || r.crimeNo; const h = L.filter(m => m.crimeNo && (caseKeyOf(m.crimeNo) || m.crimeNo) === k && (!r.ps || !m.ps || dtSame(m.ps, r.ps) || new RegExp(r.ps.split(' ')[0], 'i').test(m.ps))); if (h.length) return h; }
    const w = (r.pet || '').split(/\s+/).find(x => x.length > 3 && !/^(state|smt|shri|union|the|and|anr|ors)\.?$/i.test(x));
    if (w && !r.caseNo) { const h = L.filter(m => isOpen(m) && new RegExp('\\b' + w.replace(/[^\w]/g, ''), 'i').test((m.title || '') + ' ' + (m.clients || '') + ' ' + (m.pet || ''))); if (h.length && h.length <= 3) return h; }
    return [];
  }
  const fromWhat = k => ({ one: 'screenshot', list: 'cause list screenshot' })[k] || 'screenshot';

  window.shotButton = where => `<button class="ghost" data-act="srshot" style="margin:0 0 10px;min-height:46px;width:100%">${I.cam || ''}Read a screenshot / order${where === 'home' ? '' : ''}</button>`;
  function pick() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.onchange = () => { if (inp.files.length) run([...inp.files]); }; inp.click(); }

  async function run(files) {
    openSheet(`<div class="s-head"><div><small>Screenshot</small><h1>Reading…</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" id="sr_say">Getting the reader ready… The first time takes a little longer.</p>`);
    const say = t => { const e = $('#sr_say'); if (e) e.textContent = t; };
    const texts = [];
    try { for (const [i, f] of files.entries()) texts.push(await readText(f, t => say((files.length > 1 ? 'Screenshot ' + (i + 1) + ' of ' + files.length + ' · ' : '') + t))); }
    catch (er) { console.error(er); say('Could not read it: ' + (er.message || er) + '. Check the internet the first time, then try again.'); return; }
    const kind = srKind(texts.join('\n'));
    if (kind === 'hclist' && typeof window.hcReadFiles === 'function') return window.hcReadFiles(files);
    if (kind === 'list') {
      const rows = []; let date = '', court = '';
      for (const t of texts) { const r = srList(t); date = date || r.date; court = court || r.court; rows.push(...r.rows); }
      if (!rows.length) return say('No case numbers found. Take the screenshot so the case numbers and the date at the top are on the screen.');
      rows.forEach(r => { r.nextDate = r.nextDate || date; r.forum = srForum(court + ' ' + texts.join(' '), ''); r.court = court; });
      return review(rows, 'list', date);
    }
    // one case: several screenshots of the same page are read together
    const r = srOne(texts.join('\n'));
    if (!r.caseNo && !r.cnr && !r.nextDate && !r.crimeNo && !r.pet) return say('Nothing usable found in this screenshot. Take it so the case number and the dates are clear, and try again.');
    review([r], r.isOrder ? 'order' : 'one', r.nextDate);
  }

  const DET = [['caseNo', 'Case no.'], ['type', 'Type'], ['cnr', 'CNR no.'], ['filingNo', 'Filing no.'], ['court', "Hon'ble Court"], ['pet', 'Petitioner / applicant side'], ['opp', 'Opposite side'], ['crimeNo', 'Crime / FIR no.'], ['ps', 'Police station'], ['sections', 'Under section(s)'], ['district', 'District']];
  function review(rows, kind, date) {
    rows.forEach(r => { r.hits = srMatch(r); r.pick = r.hits.length === 1 ? r.hits[0].id : ''; r.on = true; });
    const one = rows.length === 1 && kind !== 'list';
    const label = kind === 'list' ? 'Cause list' : kind === 'order' ? 'Order' : 'Case status';
    const opts = r => r.hits.length
      ? (r.hits.length > 1 ? '<option value="">— choose —</option>' : '') + r.hits.map(h => `<option value="${h.id}" ${h.id === r.pick ? 'selected' : ''}>${esc(mref(h))} · ${esc(h.title || h.clients || '')}</option>`).join('') + `<option value="" disabled>──────────</option><option value="@new" ${r.pick === '@new' ? 'selected' : ''}>+ Add as a new matter</option>`
      : `<option value="">+ Add as a new matter</option>${live().filter(x => isOpen(x)).sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))).map(h => `<option value="${h.id}" ${h.id === r.pick ? 'selected' : ''}>${esc(mref(h))} · ${esc(h.title || h.clients || '')}${h.caseNo ? ' · ' + esc(h.caseNo) : ''}</option>`).join('')}`;
    const inp = (i, k, lab, v, type = 'text', extra = '') => `<div class="field"><label>${lab}</label><input class="in" type="${type}" data-sr="${k}" data-i="${i}" value="${esc(v || '')}" ${extra}></div>`;
    const card = (r, i) => {
      const m = live().find(x => x.id === r.pick);
      const now = m ? `Now: ${m.nextDate ? dmy(m.nextDate) : 'no next date'}${m.purpose ? ' · ' + esc(m.purpose) : ''}${m.courtNo ? ' · court ' + esc(m.courtNo) : ''}${m.item ? ' · item ' + esc(m.item) : ''}` : '';
      const det = one ? DET.filter(([k]) => r[k]).map(([k, lab]) => {
        const cur = m ? (k === 'pet' || k === 'opp' ? (m[k] || '') : (m[k] || '')) : '';
        const note = m && cur && !dtSame(cur, r[k]) ? `<small style="color:var(--saffron-ink)">SM Chambers has: ${esc(String(cur).replace(/\n/g, '; '))} — you will be asked which to keep</small>` : m && !cur ? '<small style="color:var(--muted)">empty now — will be filled</small>' : '';
        return `<div class="field"><label>${lab}</label><input class="in" data-sr="${k}" data-i="${i}" value="${esc(r[k])}">${note}</div>`;
      }).join('') : '';
      return `<div class="card" style="box-shadow:none;border:2px solid var(--line);padding:12px;display:grid;gap:8px">
        ${one ? '' : `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="font-family:var(--mono)">${esc([r.prefix, r.caseNo].filter(Boolean).join(' ') || '—')}</b><label style="display:flex;gap:6px;align-items:center;font-weight:600"><input type="checkbox" data-sr="on" data-i="${i}" ${r.on ? 'checked' : ''}> Apply</label></div>
          ${r.pet ? `<span class="hint" style="margin:0">${esc(r.pet)}${r.opp ? ' v. ' + esc(r.opp) : ''}</span>` : ''}`}
        <div class="field"><label>Matter${r.hits.length ? '' : ' <small>(not found in SM Chambers)</small>'}</label><select class="in" data-sr="pick" data-i="${i}">${opts(r)}</select>${now ? `<small class="hint" style="margin:4px 0 0">${now}</small>` : ''}</div>
        ${r.decided ? `<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--saffron-ink)"><input type="checkbox" data-sr="decided" data-i="${i}" ${r.decided ? 'checked' : ''}> The screenshot shows this case as decided / disposed</label>` : ''}
        <div class="two">${inp(i, 'nextDate', 'Next date', r.nextDate, 'date')}${inp(i, 'stage', 'Fixed for', r.stage)}</div>
        <div class="two">${inp(i, 'courtNo', 'Court no.', r.courtNo, 'text', 'inputmode="numeric"')}${inp(i, 'item', 'Item / serial no.', r.item, 'text', 'inputmode="numeric"')}</div>
        ${one && (r.orderDate || r.lastDate) ? inp(i, 'lastDate', kind === 'order' ? 'Order dated (goes into hearing history)' : 'Last listed on (goes into hearing history)', r.orderDate || r.lastDate, 'date') : ''}
        ${det ? `<div class="h2" style="margin:6px 0 0"><h2 style="font-size:15px">Case details read</h2></div>${det}` : ''}
      </div>`;
    };
    const draw = () => openSheet(`<div class="s-head"><div><small>${label}${date ? ' · ' + dmy(date) : ''}</small><h1>${one ? 'Check and apply' : rows.length + ' case' + (rows.length > 1 ? 's' : '') + ' found'}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" style="margin:0 0 8px">Check against the screenshot and correct anything read wrongly. Dates are set on Apply; a case detail that differs from SM Chambers is not overwritten — it waits on the matter for you to choose.</p>
      <div class="grp" style="gap:10px">${rows.map(card).join('')}</div>
      <button class="save" data-sr="apply" style="margin-top:12px">Apply</button>`);
    draw();
    const root = $('#sheet-root');
    root.oninput = root.onchange = e => { const el = e.target.closest('[data-sr]'); if (!el || el.dataset.sr === 'apply') return; const r = rows[+el.dataset.i], k = el.dataset.sr;
      if (k === 'on' || k === 'decided') r[k] = el.checked; else if (k === 'pick') { r.pick = el.value; if (e.type === 'change') draw(); } else r[k] = el.value.trim(); };
    root.onclick = e => { if (!e.target.closest('[data-sr="apply"]')) return;
      const go = rows.filter(r => r.on);
      if (go.some(r => r.hits.length > 1 && !r.pick)) return toast('Choose the matter for each case, or untick it');
      const sets = go.filter(r => r.pick && r.pick !== '@new'), adds = go.filter(r => !r.pick || r.pick === '@new');
      let n = 0, waiting = 0; const how = fromWhat(kind === 'order' ? 'one' : kind) === 'screenshot' ? (kind === 'order' ? 'order' : 'case status screenshot') : 'cause list screenshot';
      if (sets.length) change(d => { for (const r of sets) { const m = live().find(x => x.id === r.pick); if (!m) continue;
        const before = { ...m }, set = {};
        if (r.lastDate && r.lastDate < todayIso()) logPast(m, r.lastDate, (kind === 'order' ? 'order' : 'listed') + (r.stage && !r.nextDate ? ' · ' + r.stage : '') + ' (' + how + ')');
        if (r.decided) { set.status = 'Decided'; set.nextDate = ''; set.closedOn = m.closedOn || todayIso(); }
        else if (r.nextDate) { set.nextDate = r.nextDate; set.unlisted = false; if (m.status !== 'Reserved' && isOpen(m) && m.status !== 'Pending' && !/part-heard|admitted/i.test(m.status || '')) set.status = 'Pending'; }
        if (r.stage) set.purpose = r.stage;
        if (r.courtNo) set.courtNo = r.courtNo;
        if (r.item) set.item = r.item;
        if (set.nextDate && set.nextDate !== m.nextDate) logListing(m, m.nextDate, set.nextDate, how);
        const changed = Object.keys(set).some(k => String(m[k] || '') !== String(set[k] || ''));
        logDiff(m, before, set, how); Object.assign(m, set);
        if (one) { const det = { from: how, matter: {} }; for (const [k] of DET) if (r[k]) det.matter[k] = r[k];
          if (det.matter.crimeNo || det.matter.ps) det.matter.nature = 'Criminal';
          applyDetails(m, det, d); waiting += (m.detailDiffs || []).length; }
        if (changed || one) { m.calPending = true; touch(m); n++; } } });
      closeSheet(); if (typeof render === 'function') render();
      if (sets.length) toast((n ? n + ' matter' + (n > 1 ? 's' : '') + ' updated' : 'Already up to date') + (waiting ? ' · ' + waiting + ' difference' + (waiting > 1 ? 's' : '') + ' wait for you on the matter' : ''), 5000);
      const t = todayIso();
      const next = () => { const r = adds.shift(); if (!r) return; window.__afterSave = adds.length ? next : null;
        sheetEdit(null, { forum: r.forum || 'District', status: r.decided ? 'Decided' : 'Pending', nature: r.crimeNo || r.ps || /Bail|ABA|482|Complaint|138/.test(r.type || '') ? 'Criminal' : (r.type ? (typeof guessNature === 'function' ? guessNature({ type: r.type }) : '') : '') || 'Criminal',
          court: r.court || '', courtNo: r.courtNo || '', type: r.type || '', caseNo: r.caseNo || '', cnr: r.cnr || '', filingNo: r.filingNo || '', crimeNo: r.crimeNo || '', ps: r.ps || '', sections: r.sections || '', district: r.district || '',
          pet: r.pet || '', opp: r.opp || '', title: [r.pet, r.opp].filter(Boolean).join(' v. '), nextDate: r.nextDate || '', purpose: r.stage || '', item: r.item || '',
          notes: 'Added from a ' + how + ' of ' + dmy(t) + '.' }); };
      if (adds.length) setTimeout(next, 300);
    };
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-act="srshot"]')) pick(); });
}
