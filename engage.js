/* SM Chambers — Client Engagement Form.
   Made from the matter's Fees page before work starts: Plan 55K (Standard), Plan 75K (Strategic) or any other plan
   (own fee, scope starting from the Standard plan and edited to the actual work). English or Hindi (Mangal).
   A Word file on the letterhead, saved in the matter's fees folder, printed and signed by the client and the advocate.
   The chosen plan sets the matter's professional fee and date fee. Forms are cancelled, never deleted. */
'use strict';

const EF_PLANS = {
  '55K': { fee: 55000, date: 1000 },
  '75K': { fee: 75000, date: 1500 },
};

/* ---------- Hindi amount in words ---------- */
const HI_0_99 = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस ' +
  'बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस ' +
  'चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ ' +
  'साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी ' +
  'अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे').split(' ');
function inWordsHi(n) {
  n = Math.round(+n || 0); if (!n) return 'शून्य';
  const parts = [], cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1000); n %= 1000; const h = Math.floor(n / 100); n %= 100;
  if (cr) parts.push(inWordsHi(cr) + ' करोड़'); if (lk) parts.push(HI_0_99[lk] + ' लाख'); if (th) parts.push(HI_0_99[th] + ' हज़ार'); if (h) parts.push(HI_0_99[h] + ' सौ'); if (n) parts.push(HI_0_99[n]);
  return parts.join(' ');
}
const efNum = v => { const s = String(v ?? '').replace(/[,₹\s]/g, '').replace(/\/-$/, ''); return /^\d+$/.test(s) ? +s : null; };
const efAmt = (n, hi) => '₹' + Number(n).toLocaleString('en-IN') + '/- (' + (hi ? 'रुपये ' + inWordsHi(n) + ' मात्र' : 'Rupees ' + inWords(n) + ' only') + ')';
const efBlank = '₹ ____________';
/* an outstation entry: a number prints with words; text prints as typed; blank prints a line to fill by hand */
const efOut = (v, hi) => { const n = efNum(v); return n ? efAmt(n, hi) : String(v || '').trim() || efBlank; };

/* ---------- wording ---------- */
const EF_TEXT = {
  en: {
    title: 'CLIENT ENGAGEMENT FORM', ref: 'Ref. No.', date: 'Date',
    h1: 'Client and matter', rows: ['Name of client', 'Address', 'Phone / e-mail', 'Matter / case', 'Hon\'ble Court / forum', 'Opposite party'],
    h2: 'Plan chosen',
    p55: 'STANDARD LITIGATION', p75: 'STRATEGIC LITIGATION', pOther: 'OTHER PLAN', code: 'Plan',
    perCase: 'per case', perDate: 'per date / appearance', t55: 'Essential preparation • Regular case', t75: 'Deep preparation • Priority case', tOther: 'Work as in the Standard plan (Clause 3)',
    h3: 'What the plan covers', std: 'Standard Litigation (Plan 55K)', strat: 'Strategic Litigation (Plan 75K)', other: 'Other plan — work as in the Standard plan (Plan 55K)',
    notIncl: 'Not included: ',
    stdList: ['Drafting on the facts as stated by the client.', 'Legal research limited to the relevant statutory provisions.', 'Evidence prepared during trial, based on the facts stated by the client.'],
    stdNot: 'fact-to-evidence analysis; rulings and citations; written Legal Opinion; written note on expected objections; review of strategy.',
    stratList: ['Facts built on strategy. Every fact linked to the evidence on record, in writing, before filing.', 'Rulings and citations from a licensed legal research database.', 'Written, reasoned Legal Opinion Note.',
      'Objections of the other side identified. Written replies prepared in advance and kept on the case file.', 'Examination-in-chief and evidence prepared before filing, built on strategy and fact-to-evidence analysis. Reviewed before trial.',
      'Strategy-led drafting. Sequence of proceedings planned. Strategy reviewed after every significant order or development.', 'Update after every hearing. Call before every major decision.'],
    otherNote: 'Only the work listed above is included in this plan.',
    framework: 'Work and sequence of stages depend on the nature of the case and the applicable procedure.',
    h4: 'Appearance before the Hon\'ble Court (all plans)',
    appear: 'Every date will be attended by an advocate of the chamber. Final arguments and key hearings (admission, interim relief and evidence) will be argued by Advocate Saurabh Misra personally.',
    h5: 'Payment terms (all plans)',
    pay: ['Preparation fee: 50% at engagement. Balance 50% before filing.', 'The matter will be filed only after full payment of the preparation fee.', 'Date / appearance fee is payable for each date, in advance.',
      'Payment shall be made only in favour of Saurabh Misra. No payment to any junior, clerk or other person is valid unless a receipt is issued by the undersigned.'],
    h6: 'Outstation appearance (outside Lucknow)',
    outRows: ['Appearance fee (per day)', 'Travel', 'Stay'], outNote: 'Outstation charges are payable in advance, in addition to the plan fee.',
    h7: 'Not included in any plan',
    excl: ['Out-of-pocket expenses: court fee, stamps, affidavit, oath commissioner / notary, typing, photocopy and certified copies. These are charged separately at actuals.', 'Commissioner / expert fees.',
      'Appeal, revision, review, execution, contempt, or any fresh application or proceeding. These are charged separately.'],
    hc: 'Our commitments to you',
    commit: ['Everything you tell us or give us will be kept confidential and used only for your case. It will not be disclosed except as your case or the law requires.',
      'We will not act for the opposite party in this matter or in any connected matter.',
      'No compromise, withdrawal, concession or statement will be made on your behalf without your express instructions.',
      'Every payment will be acknowledged by a numbered receipt. Nothing outside this form will be charged without telling you in writing first.',
      'You will receive a copy of every petition or application filed, and of every order passed, in your matter.',
      'After every date you will be told the next date and what it is fixed for.',
      'You may raise any concern about your matter directly with Advocate Saurabh Misra.',
      'All work listed under your chosen plan will be done.'],
    decCommit: 'I have also read the counsel\'s commitments in Clause 8.',
    h8: 'General terms',
    gen: ['Fees are uniform for all clients and are not negotiated. Only the scope of work can be changed.', 'The fee is for professional services and does not depend on the outcome of the case. No assurance as to the result is given or implied.',
      'Fee once paid is not refundable after the work has commenced.', 'The client shall provide documents, information and instructions in time. Any delay caused by their non-supply shall not be attributable to the counsel.',
      'Further work may be kept in abeyance until the dues are cleared.',
      'A vakalatnama will be executed for appearance before the Hon\'ble Court. As between the client and the counsel, the contents of the vakalatnama are part and parcel of this engagement form.',
      'Subject to Lucknow jurisdiction.'],
    h9: 'Client\'s declaration',
    dec1: 'I have read and understood the plans, the fee and the terms above. I have chosen the plan ticked in Clause 2 of my own free will.',
    decStd: 'I opt for essential preparation. I accept that in-depth evidence analysis, researched rulings and advance preparation are not part of this plan.',
    decOther: 'I accept that only the work listed in Clause 3 is included in this plan.',
    dec2: 'I agree to pay the fee as per the payment terms above.',
    sClient: 'Signature of Client', sName: 'Name', sDate: 'Date', adv: 'SAURABH MISRA', advT: 'Advocate',
    cancelled: 'CANCELLED',
  },
  hi: {
    title: 'मुवक्किल अनुबंध प्रपत्र', ref: 'संदर्भ सं.', date: 'दिनांक',
    h1: 'मुवक्किल एवं मामले का विवरण', rows: ['मुवक्किल का नाम', 'पता', 'मोबाइल / ई-मेल', 'मामला / वाद', 'माननीय न्यायालय / मंच', 'विपक्षी पक्ष'],
    h2: 'चुनी गई योजना',
    p55: 'सामान्य मुकदमेबाज़ी', p75: 'रणनीतिक मुकदमेबाज़ी', pOther: 'अन्य योजना', code: 'प्लान',
    perCase: 'प्रति मामला', perDate: 'प्रति तारीख / उपस्थिति', t55: 'आवश्यक तैयारी • नियमित मामला', t75: 'गहन तैयारी • प्राथमिकता मामला', tOther: 'सामान्य योजना के समान कार्य (खंड 3)',
    h3: 'योजना में सम्मिलित कार्य', std: 'सामान्य मुकदमेबाज़ी (प्लान 55K)', strat: 'रणनीतिक मुकदमेबाज़ी (प्लान 75K)', other: 'अन्य योजना — सामान्य योजना (प्लान 55K) के समान कार्य',
    notIncl: 'सम्मिलित नहीं: ',
    stdList: ['मुवक्किल द्वारा बताए गए तथ्यों के आधार पर प्रारूपण।', 'कानूनी शोध संबंधित वैधानिक प्रावधानों तक सीमित।', 'साक्ष्य की तैयारी विचारण के दौरान, मुवक्किल द्वारा बताए गए तथ्यों के आधार पर।'],
    stdNot: 'तथ्य-से-साक्ष्य विश्लेषण; नज़ीरें एवं उद्धरण; लिखित विधिक राय; संभावित आपत्तियों का लिखित नोट; रणनीति की समीक्षा।',
    stratList: ['रणनीति पर आधारित तथ्य। प्रत्येक तथ्य अभिलेख पर उपलब्ध साक्ष्य से जोड़ा जाता है — लिखित रूप में, दाखिले से पहले।', 'लाइसेंस प्राप्त विधिक शोध डेटाबेस से नज़ीरें एवं उद्धरण।', 'लिखित एवं तर्कसंगत विधिक राय-पत्र।',
      'विपक्ष की संभावित आपत्तियों की पहचान। उनके लिखित उत्तर पहले से तैयार कर केस फ़ाइल में रखे जाते हैं।', 'मुख्य परीक्षा एवं साक्ष्य की तैयारी दाखिले से पहले, रणनीति एवं तथ्य-से-साक्ष्य विश्लेषण के आधार पर। विचारण से पहले समीक्षा।',
      'रणनीति-आधारित प्रारूपण। कार्यवाही के क्रम की योजना। प्रत्येक महत्वपूर्ण आदेश या घटनाक्रम के बाद रणनीति की समीक्षा।', 'प्रत्येक सुनवाई के बाद सूचना। हर बड़े निर्णय से पहले फ़ोन।'],
    otherNote: 'इस योजना में केवल ऊपर लिखा गया कार्य ही सम्मिलित है।',
    framework: 'चरणों का कार्य एवं क्रम मामले की प्रकृति एवं लागू प्रक्रिया पर निर्भर करता है।',
    h4: 'माननीय न्यायालय के समक्ष उपस्थिति (सभी योजनाएँ)',
    appear: 'प्रत्येक तारीख पर चैंबर के एक अधिवक्ता उपस्थित रहेंगे। अंतिम बहस एवं महत्वपूर्ण सुनवाइयों (अंगीकरण, अंतरिम राहत एवं साक्ष्य) में बहस अधिवक्ता सौरभ मिश्रा स्वयं करेंगे।',
    h5: 'भुगतान की शर्तें (सभी योजनाएँ)',
    pay: ['तैयारी शुल्क: 50% नियुक्ति पर। शेष 50% दाखिले से पहले।', 'तैयारी शुल्क का पूर्ण भुगतान होने के बाद ही मामला दाखिल किया जाएगा।', 'तारीख / उपस्थिति शुल्क प्रत्येक तारीख के लिए अग्रिम देय है।',
      'भुगतान केवल सौरभ मिश्रा के पक्ष में किया जाएगा। किसी जूनियर, मुंशी या अन्य व्यक्ति को किया गया भुगतान तब तक मान्य नहीं है, जब तक अधोहस्ताक्षरी द्वारा रसीद जारी न की जाए।'],
    h6: 'बाहरी उपस्थिति (लखनऊ से बाहर)',
    outRows: ['उपस्थिति शुल्क (प्रति दिन)', 'यात्रा', 'ठहरना'], outNote: 'बाहरी उपस्थिति का व्यय योजना शुल्क के अतिरिक्त, अग्रिम देय है।',
    h7: 'किसी भी योजना में सम्मिलित नहीं',
    excl: ['अपनी जेब से होने वाले व्यय: न्यायालय शुल्क, स्टाम्प, शपथपत्र, ओथ कमिश्नर / नोटरी, टाइपिंग, फोटोकॉपी एवं प्रमाणित प्रतियाँ। ये वास्तविक व्यय के अनुसार अलग से लिए जाएँगे।', 'कमिश्नर / विशेषज्ञ शुल्क।',
      'अपील, निगरानी, पुनर्विलोकन, निष्पादन, अवमानना, अथवा कोई नया प्रार्थना पत्र या कार्यवाही। इनका शुल्क अलग से लिया जाएगा।'],
    hc: 'आपके प्रति हमारी प्रतिबद्धताएँ',
    commit: ['आप द्वारा बताई गई या दी गई प्रत्येक जानकारी एवं दस्तावेज़ गोपनीय रखे जाएँगे और केवल आपके मामले में उपयोग किए जाएँगे। आपके मामले या कानून की आवश्यकता के अतिरिक्त इन्हें किसी को नहीं बताया जाएगा।',
      'इस मामले अथवा इससे जुड़े किसी मामले में हम विपक्षी पक्ष की ओर से पैरवी नहीं करेंगे।',
      'आपके स्पष्ट निर्देश के बिना आपकी ओर से कोई समझौता, वापसी, स्वीकारोक्ति या कथन नहीं किया जाएगा।',
      'प्रत्येक भुगतान की क्रमांकित रसीद दी जाएगी। इस प्रपत्र के बाहर की कोई राशि आपको पहले लिखित में बताए बिना नहीं ली जाएगी।',
      'आपके मामले में दाखिल प्रत्येक याचिका या प्रार्थना पत्र तथा पारित प्रत्येक आदेश की प्रति आपको दी जाएगी।',
      'प्रत्येक तारीख के बाद आपको अगली तारीख और वह किस कार्य हेतु नियत है, बताया जाएगा।',
      'अपने मामले से संबंधित कोई भी बात आप सीधे अधिवक्ता सौरभ मिश्रा से कह सकते हैं।',
      'आपकी चुनी गई योजना में लिखा गया सम्पूर्ण कार्य किया जाएगा।'],
    decCommit: 'मैंने खंड 8 में अधिवक्ता की प्रतिबद्धताएँ भी पढ़ ली हैं।',
    h8: 'सामान्य शर्तें',
    gen: ['शुल्क सभी मुवक्किलों के लिए समान है और इस पर मोल-भाव नहीं होता। शुल्क कम करना हो तो केवल काम कम किया जा सकता है।', 'शुल्क व्यावसायिक सेवा का है और मामले के परिणाम पर निर्भर नहीं है। परिणाम के विषय में कोई आश्वासन न दिया गया है, न निहित है।',
      'कार्य प्रारंभ होने के बाद दिया गया शुल्क वापस नहीं होगा।', 'मुवक्किल दस्तावेज़, जानकारी एवं निर्देश समय पर देंगे। इनके न मिलने से हुई देरी के लिए अधिवक्ता उत्तरदायी नहीं होंगे।',
      'बकाया चुकता होने तक आगे का कार्य रोका जा सकता है।',
      'माननीय न्यायालय के समक्ष उपस्थिति हेतु वकालतनामा निष्पादित किया जाएगा। मुवक्किल एवं अधिवक्ता के बीच वकालतनामे की विषय-वस्तु इस अनुबंध प्रपत्र का अभिन्न अंग है।',
      'लखनऊ क्षेत्राधिकार के अधीन।'],
    h9: 'मुवक्किल की घोषणा',
    dec1: 'मैंने ऊपर लिखी योजनाएँ, शुल्क एवं शर्तें पढ़ और समझ ली हैं। मैंने खंड 2 में चिह्नित योजना अपनी स्वतंत्र इच्छा से चुनी है।',
    decStd: 'मैं आवश्यक तैयारी चुनता / चुनती हूँ। मैं स्वीकार करता / करती हूँ कि गहन साक्ष्य विश्लेषण, शोधित नज़ीरें एवं अग्रिम तैयारी इस योजना का भाग नहीं हैं।',
    decOther: 'मैं स्वीकार करता / करती हूँ कि इस योजना में केवल खंड 3 में लिखा गया कार्य ही सम्मिलित है।',
    dec2: 'मैं ऊपर दी गई भुगतान की शर्तों के अनुसार शुल्क देने के लिए सहमत हूँ।',
    sClient: 'मुवक्किल के हस्ताक्षर', sName: 'नाम', sDate: 'दिनांक', adv: 'सौरभ मिश्रा', advT: 'अधिवक्ता',
    cancelled: 'निरस्त',
  },
};

/* Standard plan's scope as editable lines, the starting point for "any other plan" */
const efStdScope = hi => { const T = EF_TEXT[hi ? 'hi' : 'en']; return [...T.stdList, T.notIncl + T.stdNot].join('\n'); };

/* ---------- the Word document (pure: needs only the docx library D and the form record e) ---------- */
function efChildren(D, e, head) {
  const hi = e.lang === 'hi', T = EF_TEXT[hi ? 'hi' : 'en'], F = hi ? 'Mangal' : 'Times New Roman', SZ = hi ? 21 : 22, W = 9026;
  const run = (text, o = {}) => new D.TextRun({ text, font: F, size: o.size || SZ, bold: o.bold, italics: o.italics, color: o.color });
  const para = (runs, o = {}) => new D.Paragraph({ children: Array.isArray(runs) ? runs : [run(runs, o)], alignment: o.align || D.AlignmentType.LEFT, keepNext: o.keepNext,
    spacing: { before: o.before || 0, after: o.after ?? 80, line: hi ? 288 : 264 }, indent: o.indent, tabStops: o.tabs });
  const heading = (n, t) => para([run(n + '. ' + (hi ? t : t.toUpperCase()), { bold: true, size: SZ + 1 })], { before: 150, after: 70, keepNext: true });
  const item = (runs) => para(Array.isArray(runs) ? [run('•  '), ...runs] : [run('•  '), run(runs)], { indent: { left: 400, hanging: 260 }, after: 45 });
  const thin = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' }, borders = { top: thin, bottom: thin, left: thin, right: thin };
  const cell = (children, w, shade) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: shade ? { fill: 'EEEEEE', type: D.ShadingType.CLEAR, color: 'auto' } : undefined, children: Array.isArray(children) ? children : [para(children, { after: 0 })] });
  const table = (widths, rows) => new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: widths, rows: rows.map(r => new D.TableRow({ cantSplit: true, children: r })) });
  const val = s => String(s || '').trim();
  const lines = s => val(s).split('\n').map(x => x.trim()).filter(Boolean);
  const blankLine = '____________________________________';

  const kids = [...head];
  kids.push(para([run(T.title, { bold: true, size: 30 })], { align: D.AlignmentType.CENTER, before: 60, after: 60 }));
  kids.push(para([run(T.ref + ': ' + (e.ref || 'SM/________'), { bold: true }), run('\t' + T.date + ': ' + (e.date ? dmy(e.date) : '____________'), { bold: true })], { tabs: [{ type: D.TabStopType.RIGHT, position: W }], after: 120 }));
  if (e.state === 'Cancelled') kids.push(para([run(T.cancelled + ' — ' + dmy(e.stateOn) + (e.reason ? ' — ' + e.reason : ''), { bold: true, size: 26, color: 'B00000' })], { align: D.AlignmentType.CENTER, after: 120 }));

  // 1. client and matter
  kids.push(heading(1, T.h1));
  const det = [e.client, e.address, e.phone, e.matter, e.court, e.opp];
  kids.push(table([2600, 6426], T.rows.map((r, i) => [cell([para([run(r, { bold: true })], { after: 0 })], 2600, true), cell(lines(det[i]).length ? lines(det[i]).map(l => para(l, { after: 0 })) : [para(blankLine, { after: 0 })], 6426)])));

  // 2. plan chosen
  kids.push(heading(2, T.h2));
  const box = on => on ? '☑  ' : '☐  ';
  const planCell = (key, name, fee, rate, tag) => {
    const on = e.plan === key, w = 3008;
    const feeTxt = fee ? efAmt(fee, hi) : efBlank, rateTxt = rate ? efAmt(rate, hi) : efBlank;
    return cell([para([run(box(on), { size: 26 }), run(name, { bold: true })], { after: 30 }), para([run(key === 'OTHER' ? ' ' : T.code + ' ' + key, { bold: true, size: SZ - 2 })], { after: 50 }),
      para([run(feeTxt, { bold: on }), run(' ' + T.perCase)], { after: 30 }), para([run('+ ' + rateTxt, { bold: on }), run(' ' + T.perDate)], { after: 30 }), para([run(tag, { italics: true, size: SZ - 2 })], { after: 0 })], w, on);
  };
  const oFee = e.plan === 'OTHER' ? num(e.fee) : 0, oRate = e.plan === 'OTHER' ? num(e.dateFee) : 0;
  kids.push(table([3009, 3009, 3008], [[planCell('55K', T.p55, 55000, 1000, T.t55), planCell('75K', T.p75, 75000, 1500, T.t75), planCell('OTHER', T.pOther, oFee, oRate, T.tOther)]]));

  // 3. what the plan covers
  kids.push(heading(3, T.h3));
  if (e.plan === 'OTHER') {
    kids.push(para([run(T.other, { bold: true })], { after: 50, keepNext: true }));
    lines(e.scope).forEach(l => kids.push(item(l)));
    kids.push(para([run(T.otherNote, { italics: true })], { before: 40 }));
  } else {
    kids.push(para([run(T.std, { bold: true })], { after: 50, keepNext: true }));
    T.stdList.forEach(l => kids.push(item(l)));
    kids.push(item([run(T.notIncl, { bold: true }), run(T.stdNot)]));
    kids.push(para([run(T.strat, { bold: true })], { before: 80, after: 50, keepNext: true }));
    T.stratList.forEach(l => kids.push(item(l)));
  }
  kids.push(para([run(T.framework, { italics: true })], { before: 50 }));

  // 4–9
  kids.push(heading(4, T.h4)); kids.push(para(T.appear));
  kids.push(heading(5, T.h5)); T.pay.forEach(l => kids.push(item(l)));
  kids.push(heading(6, T.h6));
  if (e.outApplies === false) kids.push(para(hi ? 'इस मामले में लागू नहीं।' : 'Not applicable in this matter.'));
  else {
    kids.push(table([3400, 5626], T.outRows.map((r, i) => [cell([para([run(r, { bold: true })], { after: 0 })], 3400, true), cell(efOut([e.outFee, e.travel, e.stay][i], hi), 5626)])));
    kids.push(para([run(T.outNote, { italics: true })], { before: 60 }));
  }
  kids.push(heading(7, T.h7)); T.excl.forEach(l => kids.push(item(l)));
  const other = e.plan === 'OTHER';   // Other plan: no commitments clause, signed by the client only
  if (!other) { kids.push(heading(8, T.hc)); T.commit.forEach(l => kids.push(item(l))); }
  kids.push(heading(other ? 8 : 9, T.h8)); T.gen.forEach(l => kids.push(item(l)));
  kids.push(heading(other ? 9 : 10, T.h9));
  kids.push(para(T.dec1));
  if (!other) kids.push(para(T.decCommit));
  if (e.plan === '55K') kids.push(para(T.decStd));
  if (e.plan === 'OTHER') kids.push(para(T.decOther));
  kids.push(para(T.dec2));

  const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, nb = { top: none, bottom: none, left: none, right: none };
  const sCell = (rows, al) => new D.TableCell({ width: { size: 4513, type: D.WidthType.DXA }, borders: nb, children: rows.map((r, i) => para([run(r[0], { bold: r[1] })], { align: al, after: 40, before: i === 0 ? 560 : 0 })) });
  kids.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [4513, 4513], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows: [new D.TableRow({ cantSplit: true, children: [
    sCell([['______________________________'], [T.sClient, true], [T.sName + ': ' + (val(e.client).split('\n')[0] || '____________________')], [T.sDate + ': ____________________']], D.AlignmentType.LEFT),
    other ? sCell([[' ']], D.AlignmentType.RIGHT) : sCell([['______________________________'], [T.adv, true], [T.advT], [T.sDate + ': ____________________']], D.AlignmentType.RIGHT)] })] }));
  return kids;
}

async function makeEngageDoc(m, e) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const kids = efChildren(D, e, letterhead(D));
  const footer = new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ font: 'Times New Roman', size: 16, color: '808080', children: ['Page ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES] })] })] });
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: e.lang === 'hi' ? 'Mangal' : 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageFor(e.paper || 'A4', 'A4', { top: 900, bottom: 1080, left: 1440, right: 1440 }) }, footers: { default: footer }, children: kids }] });
  const blob = await D.Packer.toBlob(doc);
  const name = cleanName('Engagement Form ' + (e.plan === 'OTHER' ? 'Other plan' : 'Plan ' + e.plan) + (e.lang === 'hi' ? ' Hindi' : '') + ' ' + dmy(e.date) + (e.state === 'Cancelled' ? ' CANCELLED' : '')) + '.docx';
  let itemId = '', where = '';
  if (m.folderId) { try { const dir = await feeFolder(m, true); itemId = (await uploadFile(dir.id, new File([blob], name), name)).id; where = dir.name; } catch (er) {} }
  return { blob, name, itemId, where };
}

/* ---------- the matter's plan sets its fees ---------- */
function efApplyFees(m, e) {
  const fee = e.plan === 'OTHER' ? num(e.fee) : EF_PLANS[e.plan].fee, rate = e.plan === 'OTHER' ? num(e.dateFee) : EF_PLANS[e.plan].date;
  const label = 'Professional fee — ' + (e.plan === 'OTHER' ? 'other plan' : 'Plan ' + e.plan) + ' (engagement form)';
  m.agreedParts = m.agreedParts || [];
  const mine = m.agreedParts.find(p => p.ef), others = m.agreedParts.filter(p => !p.ef);
  let note = '';
  if (fee) {
    if (mine) Object.assign(mine, { amount: fee, for: label, date: e.date });
    else if (!others.length) m.agreedParts.push({ id: uid(), date: e.date, amount: fee, for: label, ef: true });
    else note = 'Fees agreed already has entries; professional fee not changed';
  }
  if (rate && (!num(m.dateFee) || m.dateFeeByEF)) { m.dateFee = rate; m.dateFeeByEF = true; }
  else if (rate && num(m.dateFee) !== rate) note = (note ? note + '; ' : '') + 'date fee already set at ' + rupees(m.dateFee) + ', not changed';
  feesTotal(m);
  return note;
}
const efLive = m => (m.engage || []).filter(x => x.state !== 'Cancelled');

/* ---------- form sheet ---------- */
function sheetEngage(m, rec) {
  if (!m.clientCode) return askCode(m, () => sheetEngage(m, rec));
  const prev = rec || efLive(m).slice(-1)[0];
  const ci = typeof clientInfo === 'function' ? clientInfo(m.clients) : {};
  const oppGuess = ((m.title || '').split(/\s+(?:v\.?|vs\.?|versus)\s+/i)[1] || '').trim();
  const st = { plan: prev ? prev.plan : '75K', lang: prev ? prev.lang : 'en', apply: true,
    out: prev ? (prev.outApplies != null ? !!prev.outApplies : !!(prev.outFee || prev.travel || prev.stay)) : false,   // outstation appearance applies in this case?
    scope: prev && prev.plan === 'OTHER' ? prev.scope : '', fee: prev ? prev.fee || '' : '', dateFee: prev ? prev.dateFee || '' : '' };
  if (prev && prev.paper) PAPER_NOW.engage = prev.paper; else delete PAPER_NOW.engage;
  const v0 = {
    ef_client: prev ? prev.client : withDesc(m.clients, st.lang === 'hi'), ef_addr: prev ? prev.address : (ci.address || ''), ef_phone: prev ? prev.phone : [ci.phone || m.phone, ci.email || m.email].filter(Boolean).join(' / '),
    ef_matter: prev ? prev.matter : (m.stage === 'consult' && / – consultation$/.test(m.title || '') ? '' : m.stage === 'consult' ? (m.notes || '') : [m.title, [m.type, m.caseNo].filter(Boolean).join(' ')].filter(Boolean).join(' — ')), ef_court: prev ? prev.court : (m.court || ''), ef_opp: prev ? prev.opp : oppGuess,
    ef_date: todayIso(), ef_out: prev ? prev.outFee || '' : '', ef_travel: prev ? prev.travel || '' : '', ef_stay: prev ? prev.stay || '' : '' };
  const keep = () => { const v = {}; document.querySelectorAll('#efform [id^="ef_"]').forEach(el => { v[el.id] = el.value; }); st.apply = $('#ef_apply')?.checked ?? st.apply; if (st.plan === 'OTHER') { st.scope = v.ef_scope ?? st.scope; st.fee = v.ef_fee ?? st.fee; st.dateFee = v.ef_dfee ?? st.dateFee; } return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = $('#' + id); if (el && val !== undefined) el.value = val; });
  const chip = (k, label, cur, attr) => `<button type="button" class="chip ${cur === k ? 'on' : ''}" data-${attr}="${k}">${label}</button>`;
  const draw = () => {
    if (st.plan === 'OTHER' && !st.scope) st.scope = efStdScope(st.lang === 'hi');
    const f = (id, label, ph, ta) => `<div class="field"><label for="${id}">${label}</label>${ta ? `<textarea class="in" id="${id}" rows="${ta}" placeholder="${esc(ph || '')}"></textarea>` : `<input class="in" id="${id}" placeholder="${esc(ph || '')}">`}</div>`;
    openSheet(`<div class="s-head"><div><small style="color:var(--saffron-ink)">${esc(matterRef(m))} · engagement form</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <form id="efform" class="grp" style="gap:12px">
        <div class="efsec"><span class="lbl">1 · Plan</span>
          <div class="efplans">${[['55K', 'Standard', '₹55,000', '+ ₹1,000 / date'], ['75K', 'Strategic', '₹75,000', '+ ₹1,500 / date'], ['OTHER', 'Any other plan', 'Your fee', 'Standard work']].map(([k, n, f1, f2]) =>
            `<button type="button" class="efplan ${st.plan === k ? 'on' : ''}" data-efp="${k}"><small>${k === 'OTHER' ? 'Other' : 'Plan ' + k}</small><b>${n}</b><span>${f1}</span><em>${f2}</em></button>`).join('')}</div>
          ${st.plan === 'OTHER' ? `<div class="two"><div class="field"><label for="ef_fee">FEE PER CASE (₹)</label><input class="in" id="ef_fee" inputmode="numeric" placeholder="e.g. 25000"></div><div class="field"><label for="ef_dfee">DATE FEE PER DATE (₹)</label><input class="in" id="ef_dfee" inputmode="numeric" placeholder="e.g. 1000"></div></div>
            <div class="field"><label>WORK INCLUDED <small>(same as the Standard plan · fixed)</small></label><ul class="hint" style="margin:4px 0 0;padding-left:18px">${efStdScope(st.lang === 'hi').split('\n').map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>
            <p class="hint" style="margin:0">The form for this plan leaves out Clause 8 (Our commitments) and is signed by the client only.</p>` : ''}
          <div class="field"><label>LANGUAGE OF THE FORM</label><div class="seg efseg">${[['en', 'English'], ['hi', 'हिंदी']].map(([k, n]) => `<button type="button" class="${st.lang === k ? 'on' : ''}" data-efl="${k}">${n}</button>`).join('')}</div></div></div>
        <div class="efsec"><span class="lbl">2 · Client and matter</span>
          ${f('ef_client', 'CLIENT NAME')}${f('ef_addr', 'ADDRESS', '', 2)}${f('ef_phone', 'PHONE / E-MAIL')}
          ${f('ef_matter', 'MATTER / CASE', 'e.g. Bail application – FIR 286/2026, P.S. Vibhuti Khand', 2)}${f('ef_court', 'HON\'BLE COURT / FORUM', 'e.g. High Court, Lucknow Bench')}${f('ef_opp', 'OPPOSITE PARTY')}</div>
        <div class="efsec"><span class="lbl">3 · Outstation (outside Lucknow)</span>
          <div class="toggles"><label><span>Outstation appearance applies in this case</span><input type="checkbox" id="efo_yes" data-efx="out" ${st.out ? 'checked' : ''}></label></div>
          ${st.out ? `<p class="hint" style="margin:0">Type an amount (e.g. 5000) or words (e.g. At actuals). Leave blank to fill by hand on the printout.</p>
          ${f('ef_out', 'APPEARANCE FEE PER DAY (₹)', 'e.g. 5000')}${f('ef_travel', 'TRAVEL', 'e.g. At actuals, AC 2-tier')}${f('ef_stay', 'STAY', 'e.g. At actuals')}` : '<p class="hint" style="margin:0">Not applicable — the form will say so, and bills will leave out the outstation term.</p>'}</div>
        <div class="efsec"><span class="lbl">4 · Print</span>
          <div class="field"><label for="ef_date">DATE ON THE FORM</label><input class="in" type="date" id="ef_date"></div>
          ${paperSwitch('engage')}
          <div class="toggles"><label><span>Set this plan's fee and date fee on the matter</span><input type="checkbox" id="ef_apply" ${st.apply ? 'checked' : ''}></label></div></div>
        <button class="save" type="submit">${rec ? 'Save and remake form' : 'Make engagement form'}</button>
        <button type="button" class="linkbtn" data-efx="back">‹ Back to Fees &amp; payments</button>
      </form>`);
    restore(Object.assign({}, v0, { ef_scope: st.scope, ef_fee: st.fee, ef_dfee: st.dateFee }));
    $('#efform').onsubmit = submit;
  };
  async function submit(ev) {
    ev.preventDefault();
    const v = keep();
    if (st.plan === 'OTHER' && !num(v.ef_fee)) return toast('Enter the fee for the other plan');
    const e = rec || { id: uid() };
    Object.assign(e, { plan: st.plan, lang: st.lang, paper: paperOf('engage'), date: v.ef_date || todayIso(), ref: matterRef(m),
      client: v.ef_client.trim(), address: v.ef_addr.trim(), phone: v.ef_phone.trim(), matter: v.ef_matter.trim(), court: v.ef_court.trim(), opp: v.ef_opp.trim(),
      outApplies: st.out, outFee: st.out ? (v.ef_out ?? v0.ef_out ?? '').trim() : '', travel: st.out ? (v.ef_travel ?? v0.ef_travel ?? '').trim() : '', stay: st.out ? (v.ef_stay ?? v0.ef_stay ?? '').trim() : '',
      fee: st.plan === 'OTHER' ? num(v.ef_fee) : EF_PLANS[st.plan].fee, dateFee: st.plan === 'OTHER' ? num(v.ef_dfee) : EF_PLANS[st.plan].date, scope: st.plan === 'OTHER' ? efStdScope(st.lang === 'hi') : '' });   // Other plan: the Standard plan's work, fixed
    if (!e.state) e.state = 'Made';
    let note = '';
    change(() => { freezeRef(m); m.engage = m.engage || []; if (!rec) m.engage.push(e);
      if (m.stage === 'consult' && / – consultation$/.test(m.title || '') && e.matter) m.title = (typeof clientName === 'function' ? clientName(m.clients) : m.clients) + ' – ' + e.matter.split('\n')[0];
      if (st.apply) note = efApplyFees(m, e);
      logChange(m, 'Engagement form ' + (rec ? 'remade' : 'made') + ': ' + (e.plan === 'OTHER' ? 'other plan ' + rupees(e.fee) : 'Plan ' + e.plan) + (e.lang === 'hi' ? ' (Hindi)' : '')); touch(m); });
    if (note) toast(note, 5000);
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Making engagement form…</h1></div></div>`);
    try { const r = await makeEngageDoc(m, e); if (r.itemId) change(() => { e.fileId = r.itemId; e.fileName = r.name; touch(m); }); docReady(m, r, 'Engagement form'); }
    catch (er) { toast(er.message); sheetFees(m); }
  }
  draw();
  $('#sheet-root').onclick = ev => {
    const b = ev.target.closest('[data-efp],[data-efl],[data-efx]'); if (!b) return;
    const v = keep();
    if (b.dataset.efx === 'back') return sheetFees(m);
    if (b.dataset.efx === 'std') { st.scope = efStdScope(st.lang === 'hi'); }
    if (b.dataset.efx === 'out') { st.out = b.checked; }
    if (b.dataset.efp) { const was = st.plan; st.plan = b.dataset.efp; if (st.plan === 'OTHER' && was !== 'OTHER' && !st.scope) st.scope = efStdScope(st.lang === 'hi'); }
    if (b.dataset.efl) { const was = st.lang; st.lang = b.dataset.efl; if (was !== st.lang && v.ef_client === withDesc(m.clients, was === 'hi')) v.ef_client = withDesc(m.clients, st.lang === 'hi'); if (st.plan === 'OTHER' && was !== st.lang && st.scope === efStdScope(was === 'hi')) st.scope = efStdScope(st.lang === 'hi'); }
    Object.assign(v0, v); draw();
  };
}

/* ---------- signed / cancel ---------- */
const efBack = m => window.__efFromMore ? sheetEngagePick() : sheetFees(m);
async function efUploadSigned(m, e, file, on) {
  if (!m.folderId) throw new Error('Link the matter folder first, then add the signed copy');
  const dir = await feeFolder(m, true), ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0].toLowerCase();
  const fileName = cleanName('Engagement Form SIGNED ' + dmy(on)) + ext, fileId = (await uploadFile(dir.id, file, fileName)).id;
  change(() => { const was = e.state === 'Signed'; e.state = 'Signed'; e.signedOn = on; e.signedFileId = fileId; e.signedFileName = fileName;
    logChange(m, (was ? 'Engagement form signed copy updated' : 'Engagement form signed (' + dmy(on) + ')') + ' · copy saved'); touch(m); });
}
async function efShareAgain(m, e) {
  let blob = null, name = e.fileName || 'Engagement Form.docx';
  try { if (e.fileId) { const r = await g('/me/drive/items/' + e.fileId + '/content?format=pdf'); if (r.ok) { blob = await r.blob(); name = name.replace(/\.docx$/i, '.pdf'); } } } catch (er) {}
  if (!blob) { const r = await makeEngageDoc(m, e); blob = r.blob; name = r.name; if (r.itemId) change(() => { e.fileId = r.itemId; e.fileName = r.name; touch(m); }); }
  const type = /\.pdf$/i.test(name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const files = [new File([blob], name, { type })];
  if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: name }); return; } catch (er) { return; } }
  const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = name; document.body.appendChild(x); x.click(); x.remove(); toast('Saved to Downloads');
}
function sheetEngageMark(m, id, what) {
  const e = (m.engage || []).find(x => x.id === id); if (!e) return;
  if (what === 'signed') {
    const st = { file: null };
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · engagement form</small><h1>${e.state === 'Signed' ? 'Signed copy' : 'Mark as signed'}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <form id="efs" class="grp" style="gap:12px"><div class="field"><label for="efs_on">SIGNED ON</label><input class="in" type="date" id="efs_on" value="${esc(e.signedOn || todayIso())}"></div>
      <div class="field"><label>PHOTO / SCAN OF THE SIGNED COPY</label>
        <label class="ghost" style="display:block;text-align:center;cursor:pointer">${e.signedFileId ? 'Replace photo / scan' : '+ Add photo / scan'}<input type="file" id="efs_file" accept="image/*,.pdf,application/pdf" hidden></label>
        <p class="hint" id="efs_pick" style="margin:6px 0 0">${e.signedFileId ? 'Saved: ' + esc(e.signedFileName || 'signed copy') : 'Saved in the fees folder' + (FEE_DIR_NAME[m.id] ? ' (' + esc(FEE_DIR_NAME[m.id]) + ')' : '') + '. Keep the paper original in the client file.'}</p></div>
      <button class="save" type="submit">${e.state === 'Signed' ? 'Save' : 'Mark signed'}</button><button type="button" class="linkbtn" data-efm="back">‹ Back</button></form>`);
    $('#efs_file').onchange = ev => { st.file = ev.target.files[0] || null; $('#efs_pick').textContent = st.file ? 'Ready to save: ' + st.file.name : ''; };
    $('#sheet-root').onclick = ev => { if (ev.target.closest('[data-efm="back"]')) efBack(m); };
    $('#efs').onsubmit = async ev => {
      ev.preventDefault();
      const on = $('#efs_on').value || todayIso();
      let saved = false;
      if (st.file) {
        openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Saving signed copy…</h1></div></div>`);
        try { await efUploadSigned(m, e, st.file, on); saved = true; } catch (er) { toast('Could not save the signed copy: ' + er.message, 5000); }
      }
      if (!saved) change(() => { e.state = 'Signed'; e.signedOn = on; logChange(m, 'Engagement form signed (' + dmy(on) + ')'); touch(m); });
      const fileId = saved;
      toast(fileId ? 'Signed copy saved' : 'Marked signed'); efBack(m);
    };
    return;
  }
  openSheet(`<div class="s-head"><div><small style="color:var(--red)">${esc(mref(m))} · engagement form</small><h1>Cancel form</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">The form stays on record, marked CANCELLED. Nothing is deleted.</p>
    <form id="efc" class="grp" style="gap:12px"><div class="field"><label for="efc_on">DATE</label><input class="in" type="date" id="efc_on" value="${todayIso()}"></div>
    <div class="field"><label>REASON</label><div class="chips">${['Client did not engage', 'Client changed plan', 'Wrong details'].map((r, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-efr="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <input class="in" id="efc_why" value="Client did not engage" style="margin-top:8px" required></div>
    <div id="efc_ne" class="grp" style="gap:10px">
      <div class="field"><label for="efc_cf">CONSULTATION FEE (₹)</label><input class="in" id="efc_cf" inputmode="numeric" placeholder="blank if none was charged"></div>
      <div class="field"><label>CONSULTATION FEE</label><div class="chips"><button type="button" class="chip on" data-efpd="paid">Paid</button><button type="button" class="chip" data-efpd="unpaid">Not paid</button></div></div>
      <div class="field" id="efc_modew"><label>MODE</label><div class="chips">${['Cash', 'UPI', 'Cheque', 'NEFT'].map((x, i) => `<button type="button" class="chip ${i === 1 ? 'on' : ''}" data-efmd="${x}">${x}</button>`).join('')}</div></div>
      <div class="toggles"><label><span>Close the matter (client did not engage)</span><input type="checkbox" id="efc_close" checked></label></div></div>
    <div class="toggles"><label><span>Make a copy marked CANCELLED in the fees folder</span><input type="checkbox" id="efc_doc" checked></label></div>
    <div class="toggles"><label><span>Then make a fresh form</span><input type="checkbox" id="efc_new"></label></div>
    <button class="save" type="submit" style="background:var(--red)">Cancel form</button><button type="button" class="linkbtn" data-efm="back">‹ Back</button></form>`);
  const st = { paid: true, mode: 'UPI' };
  const ne = () => { const show = /did not engage/i.test($('#efc_why').value); $('#efc_ne').style.display = show ? '' : 'none'; if (show) $('#efc_new').checked = false; };
  $('#efc_why').oninput = ne;
  $('#sheet-root').onclick = ev => {
    if (ev.target.closest('[data-efm="back"]')) return efBack(m);
    const r = ev.target.closest('[data-efr]'); if (r) { $('#efc_why').value = r.dataset.efr; document.querySelectorAll('[data-efr]').forEach(c => c.classList.toggle('on', c === r)); ne(); return; }
    const pd = ev.target.closest('[data-efpd]'); if (pd) { st.paid = pd.dataset.efpd === 'paid'; document.querySelectorAll('[data-efpd]').forEach(c => c.classList.toggle('on', c === pd)); $('#efc_modew').style.display = st.paid ? '' : 'none'; return; }
    const md = ev.target.closest('[data-efmd]'); if (md) { st.mode = md.dataset.efmd; document.querySelectorAll('[data-efmd]').forEach(c => c.classList.toggle('on', c === md)); }
  };
  $('#efc').onsubmit = async ev => {
    ev.preventDefault();
    const why = $('#efc_why').value.trim(), on = $('#efc_on').value || todayIso(), mk = $('#efc_doc').checked, again = $('#efc_new').checked;
    const noEngage = /did not engage/i.test(why), cf = noEngage ? num($('#efc_cf').value) : 0, close = noEngage && $('#efc_close').checked;
    change(() => {
      e.state = 'Cancelled'; e.stateOn = on; e.reason = why;
      if (noEngage) {
        // the plan's fee was only proposed: take it off the fees agreed
        m.agreedParts = (m.agreedParts || []).filter(p => !p.ef);
        if (m.dateFeeByEF) { m.dateFee = ''; delete m.dateFeeByEF; }
        if (cf) {
          m.agreedParts.push({ id: uid(), date: on, amount: cf, for: 'Consultation fee' });
          if (st.paid) { m.payments = m.payments || []; m.payments.push({ id: uid(), date: on, amount: cf, tds: 0, mode: st.mode, note: 'Consultation fee', billId: '', dateFee: 0 }); }
        }
        e.consult = { fee: cf, paid: cf ? st.paid : null, on };
        if (close) { m.status = 'Closed – client did not engage'; }
        feesTotal(m);
      }
      logChange(m, 'Engagement form cancelled: ' + why + (cf ? ' · consultation fee ' + rupees(cf) + (st.paid ? ' paid (' + st.mode + ')' : ' not paid') : '') + (close ? ' · matter closed' : ''));
      touch(m);
    });
    if (mk) { openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Making cancelled copy…</h1></div></div>`); try { await makeEngageDoc(m, e); } catch (er) { toast('Could not make the cancelled copy: ' + er.message); } }
    toast(noEngage ? 'Recorded: client did not engage' + (cf ? ' · consultation fee ' + (st.paid ? 'paid' : 'not paid') : '') : 'Engagement form cancelled', 4000);
    if (again) return sheetEngage(m); efBack(m);
  };
}

/* ---------- More › Engagement form: pick a matter, or a new client (client page → consultation → form) ---------- */
function sheetEngagePick() {
  window.__efFromMore = false;
  const ms = live().slice().sort((a, b) => (b.u || 0) - (a.u || 0));
  const waiting = ms.flatMap(m => (m.engage || []).filter(e => e.state === 'Made').map(e => [m, e])).sort((x, y) => (x[1].date || '').localeCompare(y[1].date || ''));
  const ini = m => esc(String((typeof clientName === 'function' ? clientName(m.clients) : m.clients) || m.title || '?').replace(/^(M\/s\.?|Smt\.?|Shri|Sri|Dr\.?|Mr\.?|Mrs\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const row = m => `<button class="frow" data-efpick="${m.id}"><span class="ficon" style="background:var(--hc-soft);color:var(--hc)">${ini(m)}</span><span class="fname">${esc(m.title || m.clients || '')}<small>${esc(mref(m))}${m.clients ? ' · ' + esc(typeof clientName === 'function' ? clientName(m.clients) : m.clients) : ''}${efLive(m).length ? ' · form ' + (efLive(m).some(e => e.state === 'Signed') ? 'signed' : 'made') : ''}</small></span></button>`;
  const draw = q => { const k = String(q || '').toLowerCase().trim(); const hit = (k ? ms.filter(m => [m.title, m.clients, mref(m), m.caseNo].join(' ').toLowerCase().includes(k)) : ms).slice(0, 30);
    $('#efpk_list').innerHTML = hit.map(row).join('') || '<p class="empty">No matter found.</p>'; };
  openSheet(`<div class="s-head"><div><small>More</small><h1>Engagement form</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${waiting.length ? `<div class="efsec" style="border-color:var(--saffron)"><span class="lbl" style="color:var(--saffron-ink)">Waiting for signature (${waiting.length})</span>
      ${waiting.map(([m, e]) => { const d = Math.max(0, Math.round((new Date(todayIso()) - new Date(e.date)) / 864e5)); return `<div class="efwait">
        <div><b>${esc((typeof clientName === 'function' ? clientName(m.clients) : m.clients) || m.title || '')}</b><small>${esc(mref(m))} · ${e.plan === 'OTHER' ? 'Other plan ' + rupees(e.fee) : 'Plan ' + e.plan}${e.lang === 'hi' ? ' · हिंदी' : ''} · made ${dmy(e.date)} · ${d ? d + ' day' + (d > 1 ? 's' : '') + ' pending' : 'today'}</small></div>
        <div class="efwbtn"><label class="act blue">Upload signed copy<input type="file" accept="image/*,.pdf,application/pdf" data-efup="${m.id}|${e.id}" hidden></label><button type="button" class="act" style="background:var(--chip)" data-efw="share" data-v="${m.id}|${e.id}">Share again</button><button type="button" class="act" style="background:var(--chip);color:var(--red)" data-efw="ne" data-v="${m.id}|${e.id}">Did not engage</button></div></div>`; }).join('')}</div>` : ''}
    <div class="grp" style="gap:8px">
      <button class="save" data-efnew="1" style="width:100%">1 · New client – not in the app yet</button>
      <p class="hint" style="margin:0 0 4px">Fill his details once; a consultation matter opens with its reference, then the form.</p>
      <button class="ghost" data-efcl="1" style="width:100%;border-color:var(--hc);color:var(--hc)">2 · Existing client – new matter</button>
      <p class="hint" style="margin:0 0 4px">Pick the client; a fresh consultation matter opens with his saved details. Matter / case is left blank for the new case.</p></div>
    <span class="lbl">3 · Existing matter <small style="text-transform:none;letter-spacing:0;font-weight:500">(form for a case already in the app)</small></span>
    <label class="search" style="border:2px solid var(--line)">${I.search}<input type="search" id="efpk_q" placeholder="Search name, matter, ref."></label>
    <div class="flist" id="efpk_list"></div>`);
  draw(''); $('#efpk_q').oninput = ev => draw(ev.target.value);
  const pair = v => { const [mi, ei] = String(v).split('|'), m = find(mi); return [m, m && (m.engage || []).find(x => x.id === ei)]; };
  $('#sheet-root').onchange = async ev => {
    const inp = ev.target.closest('[data-efup]'); if (!inp || !inp.files[0]) return;
    const [m, e] = pair(inp.dataset.efup); if (!m || !e) return;
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>Saving signed copy…</h1></div></div>`);
    try { await efUploadSigned(m, e, inp.files[0], todayIso()); toast('Signed copy saved · ' + mref(m), 4000); } catch (er) { toast('Could not save: ' + er.message, 5000); }
    sheetEngagePick();
  };
  $('#sheet-root').onclick = async ev => {
    const w = ev.target.closest('[data-efw]');
    if (w) { const [m, e] = pair(w.dataset.v); if (!m || !e) return;
      if (w.dataset.efw === 'ne') { window.__efFromMore = true; return sheetEngageMark(m, e.id, 'void'); }
      w.textContent = 'Preparing…'; try { await efShareAgain(m, e); } catch (er) { toast('Could not share: ' + er.message); } w.textContent = 'Share again'; return; }
    if (ev.target.closest('[data-efnew]')) { window.__efNext = Date.now(); return sheetNewClient(); }
    if (ev.target.closest('[data-efcl]')) return sheetEngageClient();
    const b = ev.target.closest('[data-efpick]'); if (b) { const m = find(b.dataset.efpick); if (m) sheetEngage(m); }
  };
}
/* 2 · existing client, new matter: pick the client, open a fresh consultation, then the form */
function sheetEngageClient() {
  const gs = clientGroups().filter(g => g.key !== '(no client name)').sort((a, b) => a.name.localeCompare(b.name));
  const ini = n => esc(String(n || '?').replace(/^(M\/s\.?|Smt\.?|Shri|Sri|Dr\.?|Mr\.?|Mrs\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const row = g => `<button class="frow" data-efcg="${esc(g.key)}"><span class="ficon" style="background:var(--hc-soft);color:var(--hc)">${ini(g.name)}</span><span class="fname">${esc(g.name)}<small>${g.ms.length} matter${g.ms.length === 1 ? '' : 's'}${g.phone ? ' · ' + esc(g.phone) : ''}</small></span></button>`;
  openSheet(`<div class="s-head"><div><small>Engagement form</small><h1>Existing client – new matter</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <label class="search" style="border:2px solid var(--line)">${I.search}<input type="search" id="efcl_q" placeholder="Search client"></label>
    <div class="flist" id="efcl_list"></div><button class="linkbtn" data-efcb="1">‹ Back</button>`);
  const draw = q => { const k = String(q || '').toLowerCase().trim(); const hit = k ? gs.filter(g => (g.name + ' ' + (g.phone || '')).toLowerCase().includes(k)) : gs;
    $('#efcl_list').innerHTML = hit.slice(0, 60).map(row).join('') || '<p class="empty">No client found. Use “New client” instead.</p>'; };
  draw(''); $('#efcl_q').oninput = ev => draw(ev.target.value);
  $('#sheet-root').onclick = ev => {
    if (ev.target.closest('[data-efcb]')) return sheetEngagePick();
    const b = ev.target.closest('[data-efcg]'); if (!b) return;
    const g = gs.find(x => x.key === b.dataset.efcg); if (!g) return;
    if (!confirm('Open a new consultation matter for ' + g.name + ' and make his engagement form?')) return;
    window.__efNext = Date.now(); startConsultation(g.name, '');
  };
}
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="efmore"]')) sheetEngagePick(); });

/* ---------- the list shown on the Fees page, and the reminder at "Fee received" ---------- */
function engageSection(m) {
  const list = (m.engage || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!list.length) return '';
  return `<div class="grp" style="margin-top:10px"><span class="lbl">Engagement forms</span><div class="hist">${list.map(e => { const cx = e.state === 'Cancelled';
    return `<div><b>${dmy(e.date)}</b><span${cx ? ' class="voided"' : ''}><b style="font-family:inherit">${e.plan === 'OTHER' ? 'Other plan ' + rupees(e.fee) : 'Plan ' + e.plan}</b>${e.lang === 'hi' ? ' · हिंदी' : ''} · ${cx ? `<b class="voidtag">CANCELLED</b> ${dmy(e.stateOn)}${e.reason ? ' · ' + esc(e.reason) : ''}${e.consult && e.consult.fee ? ' · consultation fee ' + rupees(e.consult.fee) + (e.consult.paid ? ' paid' : ' <b style="color:var(--red)">not paid</b>') : ''}` : e.state === 'Signed' ? `<span style="color:var(--dc-ink)">signed ${dmy(e.signedOn)}</span>` : '<span style="color:var(--red)">not yet signed</span>'}
      ${cx ? '' : `<button class="linkbtn" data-act="efopen" data-id="${m.id}" data-e="${e.id}">Open / edit</button>${e.state !== 'Signed' ? ` <button class="linkbtn" data-act="efsign" data-id="${m.id}" data-e="${e.id}">Mark signed</button>` : e.signedFileId ? ` <button class="linkbtn" data-act="efview" data-id="${m.id}" data-e="${e.id}">View signed copy</button>` : ` <button class="linkbtn" data-act="efsign" data-id="${m.id}" data-e="${e.id}">Add signed copy</button>`} <button class="linkbtn" data-act="efvoid" data-id="${m.id}" data-e="${e.id}" style="color:var(--red)">Cancel</button>`}</span></div>`; }).join('')}</div></div>`;
}
function engageReminder(m) {
  const live = efLive(m), signed = live.some(e => e.state === 'Signed');
  if (signed) return '';
  return `<div class="card" style="background:var(--saffron-soft);box-shadow:none;padding:12px 14px;margin-top:10px"><b style="color:var(--saffron-ink)">${live.length ? 'Engagement form not yet marked signed' : 'No engagement form yet'}</b><br>
    <span style="font-size:14px">Get the client's signature on the plan and fee before work starts.</span><br>
    <button class="linkbtn" data-act="${live.length ? 'efsign' : 'engage'}" data-id="${m.id}"${live.length ? ` data-e="${live[live.length - 1].id}"` : ''} style="margin-top:4px">${live.length ? 'Mark it signed' : 'Make the engagement form'}</button></div>`;
}
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act="engage"],[data-act="efopen"],[data-act="efsign"],[data-act="efvoid"],[data-act="efview"]'); if (!el) return;
  const m = find(el.dataset.id); if (!m) return;
  const a = el.dataset.act, e = (m.engage || []).find(x => x.id === el.dataset.e);
  if (a === 'engage') sheetEngage(m);
  else if (a === 'efopen' && e) sheetEngage(m, e);
  else if (a === 'efsign' && e) sheetEngageMark(m, e.id, 'signed');
  else if (a === 'efvoid' && e) sheetEngageMark(m, e.id, 'void');
  else if (a === 'efview' && e && e.signedFileId) getItem(e.signedFileId).then(openNative).catch(() => toast('Signed copy not found in OneDrive'));
});

/* does outstation appearance apply in this matter? (latest engagement form; old forms: if any amount was written) */
const efOutApplies = m => { const e = efLive(m).slice(-1)[0]; if (!e) return null; return e.outApplies != null ? !!e.outApplies : !!(e.outFee || e.travel || e.stay); };
/* bill term "out": the outstation amounts come from the matter's latest engagement form, else blanks to fill by hand */
function efFillOut(m, t) {
  if (!/\{OUT\}|\{TRAVEL\}|\{STAY\}/.test(t)) return t;
  const e = efLive(m).slice(-1)[0] || {};
  const f = v => { const n = efNum(v); return n ? '₹' + n.toLocaleString('en-IN') + '/-' : String(v || '').trim() || '₹ ________'; };
  return t.replace('{OUT}', f(e.outFee)).replace('{TRAVEL}', f(e.travel)).replace('{STAY}', f(e.stay));
}

/* ---------- More › Fee plans: the take-home poster (A4, black and white), English and Hindi ---------- */
const FEE_PLAN_PDF = { en: ['posters/Fee_Plans_English_A4.pdf', 'Fee Plans – Saurabh Misra & Associates (English).pdf'], hi: ['posters/Fee_Plans_Hindi_A4.pdf', 'Fee Plans – Saurabh Misra & Associates (Hindi).pdf'],
  cen: ['posters/Consultation_English_A4.pdf', 'Consultation – Saurabh Misra & Associates (English).pdf'], chi: ['posters/Consultation_Hindi_A4.pdf', 'Consultation – Saurabh Misra & Associates (Hindi).pdf'] };
async function feePlanBlob(k) { const r = await fetch(FEE_PLAN_PDF[k][0]); if (!r.ok) throw new Error('file not found'); return r.blob(); }
function sheetFeePlans() {
  const row = (k, label, info) => `<div class="efwait"><div><b>${label}</b><small>${info || 'A4 landscape · black and white · 2 pages'}</small></div>
    <div class="efwbtn"><button type="button" class="act blue" data-fp="share" data-k="${k}">Share (WhatsApp)</button><button type="button" class="act" style="background:var(--chip)" data-fp="open" data-k="${k}">Open / print</button><button type="button" class="act" style="background:var(--chip)" data-fp="dl" data-k="${k}">Download</button></div></div>`;
  openSheet(`<div class="s-head"><div><small>More</small><h1>Fee plans &amp; consultation</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint" style="margin:0">Take-home copies of your wall posters, sized for home printers. Share only with clients who have consulted you.</p>
    <div class="efsec"><span class="lbl">Litigation fee plans</span>${row('en', 'English')}${row('hi', 'हिंदी')}</div>
    <div class="efsec"><span class="lbl">Consultation – oral ₹5,500 · written ₹11,000</span>${row('cen', 'English', 'A4 portrait · black and white · 1 page')}${row('chi', 'हिंदी', 'A4 portrait · black and white · 1 page')}</div>`);
  $('#sheet-root').onclick = async ev => {
    const b = ev.target.closest('[data-fp]'); if (!b) return;
    const k = b.dataset.k, name = FEE_PLAN_PDF[k][1], t = b.textContent; b.textContent = 'Preparing…';
    try {
      if (b.dataset.fp === 'open') { window.open(FEE_PLAN_PDF[k][0], '_blank'); }
      else {
        const blob = await feePlanBlob(k), files = [new File([blob], name, { type: 'application/pdf' })];
        if (b.dataset.fp === 'share' && navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: name }); } catch (er) {} }
        else { const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = name; document.body.appendChild(x); x.click(); x.remove(); toast('Saved to Downloads'); }
      }
    } catch (er) { toast('Could not open the fee plan: ' + er.message); }
    b.textContent = t;
  };
}
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="feeplans"]')) sheetFeePlans(); });

/* ---------- More › Vakalatnama: the advocate's own blank vakalatnama (Word) ---------- */
const VAK_FILE = ['forms/Vakalatnama_General.docx', 'Vakalatnama_General.docx'];
async function vakBlob() { const r = await fetch(VAK_FILE[0]); if (!r.ok) throw new Error('file not found'); return r.blob(); }
function sheetVakalat() {
  openSheet(`<div class="s-head"><div><small>More</small><h1>Vakalatnama</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint" style="margin:0">Your blank vakalatnama (Sri Saurabh Misra, Enroll No. UP-8083/2007, AOR No. B/S-0533/2012), corrected wording. Its contents are part and parcel of the engagement form (Clause 9).</p>
    <div class="efsec"><div class="efwait"><div><b>Vakalatnama (General)</b><small>Word (.docx) · 1 page</small></div>
      <div class="efwbtn"><button type="button" class="act blue" data-vk="word">Open in Word</button><button type="button" class="act" style="background:var(--chip)" data-vk="share">Share</button><button type="button" class="act" style="background:var(--chip)" data-vk="dl">Download</button></div></div></div>
    <p class="hint">Open in Word saves a fresh blank copy (named with today's date) in OneDrive › SM Chambers data › Forms, ready to fill in and print.</p>`);
  $('#sheet-root').onclick = async ev => {
    const b = ev.target.closest('[data-vk]'); if (!b) return;
    const t = b.textContent; b.textContent = 'Preparing…';
    try {
      const blob = await vakBlob(), file = new File([blob], VAK_FILE[1], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      if (b.dataset.vk === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Vakalatnama' }); } catch (er) {} }
      else if (b.dataset.vk === 'word') {
        let dir; try { dir = await getItem(drivePath(DIARY_DIR + '/Forms')); } catch (er) { dir = await makeFolder((await getItem(drivePath(DIARY_DIR))).id, 'Forms'); }
        const nm = 'Vakalatnama ' + dmy(todayIso()) + '.docx';   // a fresh blank each time; the master stays clean
        const it = await uploadFile(dir.id, new File([blob], nm, { type: file.type }), nm);
        await openNative(it.id && it.parentReference ? it : await getItem(it.id || drivePath(DIARY_DIR + '/Forms/' + nm)));
      }
      else { const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = VAK_FILE[1]; document.body.appendChild(x); x.click(); x.remove(); toast('Saved to Downloads'); }
    } catch (er) { toast('Could not open the vakalatnama: ' + er.message, 5000); }
    b.textContent = t;
  };
}
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="vakalat"]')) sheetVakalat(); });
