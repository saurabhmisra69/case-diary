/* Case Diary — drafting from the matter page.
   Wording follows Saurabh Misra's own formats (Formats & Templates). English or Hindi (Mangal).
   The draft is a Word file saved into the matter's "1 Pleadings" folder, ready to edit. */
'use strict';

const ADV = { name: 'SAURABH MISRA', enrol: 'UP-8083/2007', aor: 'B/S-0533', addr: '30, Amir Nagar, Near Aishbagh Railway Station, Lucknow-226004', phone: '9415181917, 9554931312', email: 'saurabhmisra69@gmail.com' };
const HI_ADV = 'सौरभ मिश्र';

function parties(m) {
  const p = String(m.title || '').split(/\s+(?:v\.?|vs\.?|versus)\s+/i);
  return p.length > 1 ? { first: p[0].trim(), second: p.slice(1).join(' v. ').trim() } : { first: m.clients || m.title || '', second: '' };
}
function courtLine(m, hi) {
  const c = (m.court || '').replace(/\s*·.*$/, '').trim();
  if (m.forum === 'HC') return hi ? 'माननीय उच्च न्यायालय इलाहाबाद, लखनऊ खण्डपीठ, लखनऊ' : "In The Hon'ble High Court of Judicature At Allahabad, LUCKNOW BENCH, LUCKNOW";
  return hi ? 'माननीय न्यायालय ' + c : "IN THE HON'BLE COURT OF " + c.toUpperCase();
}
function ourRole(m, hi) {
  const s = (m.side || '').replace(/\(.*?\)/g, '').trim();
  if (!hi) { if (/^(op|opposite)/i.test(s)) return 'Opposite Party'; return s ? s.replace(/\b\w/g, c => c.toUpperCase()) : 'Applicant'; }
  const map = [[/accused/i, 'अभियुक्त'], [/complainant/i, 'परिवादी'], [/petitioner/i, 'याची'], [/applicant/i, 'प्रार्थी'], [/plaintiff/i, 'वादी'], [/defendant/i, 'प्रतिवादी'], [/respondent|op|opposite/i, 'विपक्षी'], [/revisionist/i, 'निगरानीकर्ता'], [/appellant/i, 'अपीलार्थी']];
  for (const [r, h] of map) if (r.test(s)) return h;
  return 'प्रार्थी';
}

/* Each template returns paragraphs: [text, style] where style: 'c' centre bold, 'cb' centre bold underline, 'p' numbered/plain, 'r' right, 'sig' signature block */
const TEMPLATES = {
  adjournment: {
    en: 'Adjournment application', hi: 'स्थगन प्रार्थना पत्र', fields: [],
    en_body: (m, f) => [
      ['A P P L I C A T I O N', 'cb'], ['SEEKING ADJOURNMENT OF ABOVE NOTED CASE FOR TODAY', 'c'],
      ['The applicant named above most respectfully begs to submit herein as below:-', 'p'],
      ["1.\tThat the above noted case is listed before this Hon'ble Court for " + (m.purpose || 'hearing') + ' today.', 'p'],
      ['2.\tThat the undersigned Counsel for the ' + ourRole(m).toLowerCase() + " is unable to attend this Hon'ble Court for hearing of the matter due to " + (f.reason || 'exigencies of work') + ' and therefore it is expedient in the interest of Justice that the hearing of the case may be adjourned for today and some other date may be fixed.', 'p'],
      ['P R A Y E R', 'cb'],
      ["Wherefore, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to adjourn the hearing of the above noted case for today and some other date may be fixed in the interest of Justice.", 'p']],
    hi_body: (m, f) => [
      ['प्रार्थना पत्र', 'cb'], ['वाद की आज की सुनवाई स्थगित किये जाने हेतु', 'c'],
      ['प्रार्थी निम्नलिखित निवेदन करता है:-', 'p'],
      ['1.\tयह कि उपरोक्त वाद आज माननीय न्यायालय के समक्ष ' + (f.purposeHi || 'सुनवाई') + ' हेतु नियत है।', 'p'],
      ['2.\tयह कि ' + ourRole(m, true) + ' के अधिवक्ता ' + (f.reason || 'व्यस्तता') + ' के कारण आज माननीय न्यायालय में उपस्थित होने में असमर्थ हैं। अतः न्यायहित में आज की सुनवाई स्थगित कर अन्य तिथि नियत किया जाना आवश्यक है।', 'p'],
      ['प्रार्थना', 'cb'],
      ['अतः माननीय न्यायालय से विनम्र प्रार्थना है कि उपरोक्त वाद की आज की सुनवाई स्थगित कर न्यायहित में अन्य तिथि नियत करने की कृपा करें।', 'p']],
  },
  exemption: {
    en: 'Exemption application', hi: 'हाजिरी माफी प्रार्थना पत्र', fields: [['who', 'Applicant (name)'], ['reason', 'Reason (e.g. illness, out of station)']],
    en_body: (m, f) => [
      ['APPLICATION SEEKING EXEMPTION FROM PERSONAL APPEARANCE OF APPLICANT NAMELY ' + (f.who || m.clients || '').toUpperCase(), 'cb'],
      ['The applicant named above, most respectfully and humbly begs to submit as below:-', 'p'],
      ["1.\tThat the above noted case is fixed for today before this Hon'ble Court and the applicant is being represented by counsel.", 'p'],
      ['2.\tThat due to ' + (f.reason || '________________') + " the applicant is not in a position to appear before this Hon'ble Court personally and therefore it is expedient in the interest of Justice that the personal appearance of the applicant named above be exempted for today.", 'p'],
      ['P R A Y E R', 'cb'],
      ["Wherefore, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to allow this application and exempt the personal appearance of the applicant named above for today in the interest of Justice.", 'p']],
    hi_body: (m, f) => [
      ['प्रार्थना पत्र', 'cb'], ['प्रार्थी ' + (f.who || m.clients || '') + ' की व्यक्तिगत उपस्थिति से छूट हेतु', 'c'],
      ['प्रार्थी निम्नलिखित निवेदन करता है:-', 'p'],
      ['1.\tयह कि उपरोक्त वाद आज माननीय न्यायालय के समक्ष नियत है तथा प्रार्थी की ओर से अधिवक्ता उपस्थित हैं।', 'p'],
      ['2.\tयह कि ' + (f.reason || '________________') + ' के कारण प्रार्थी आज माननीय न्यायालय में व्यक्तिगत रूप से उपस्थित होने में असमर्थ है। अतः न्यायहित में प्रार्थी की आज की व्यक्तिगत उपस्थिति से छूट दिया जाना आवश्यक है।', 'p'],
      ['प्रार्थना', 'cb'],
      ['अतः माननीय न्यायालय से विनम्र प्रार्थना है कि यह प्रार्थना पत्र स्वीकार कर प्रार्थी की आज की व्यक्तिगत उपस्थिति से न्यायहित में छूट प्रदान करने की कृपा करें।', 'p']],
  },
  vakalat: {
    en: 'Vakalatnama on record', hi: 'वकालतनामा पत्रावली पर लिये जाने हेतु', fields: [['who', 'On behalf of (name)']],
    en_body: (m, f) => [
      ['A P P L I C A T I O N', 'cb'], ['ON BEHALF OF ' + (f.who || m.clients || '').toUpperCase(), 'c'], ['FOR TAKING VAKALATNAMA ON RECORD', 'cb'],
      ['The applicant named above most respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat in the above noted case the undersigned counsel is filing Vakalatnama on behalf of ' + (f.who || m.clients || '') + '.', 'p'],
      ['2.\tThat therefore it is expedient in the interest of Justice that the Vakalatnama be taken on record and the name may be shown in the cause list as counsel for the ' + ourRole(m).toLowerCase() + '.', 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to take the Vakalatnama filed on behalf of " + (f.who || m.clients || '') + ' on record and the name may also be shown in the cause list as counsel for the ' + ourRole(m).toLowerCase() + ' in the interest of justice.', 'p']],
    hi_body: (m, f) => [
      ['प्रार्थना पत्र', 'cb'], ['वकालतनामा पत्रावली पर लिये जाने हेतु', 'c'],
      ['प्रार्थी निम्नलिखित निवेदन करता है:-', 'p'],
      ['1.\tयह कि उपरोक्त वाद में अधोहस्ताक्षरी अधिवक्ता ' + (f.who || m.clients || '') + ' की ओर से वकालतनामा प्रस्तुत कर रहे हैं।', 'p'],
      ['2.\tयह कि न्यायहित में वकालतनामा पत्रावली पर लिया जाना तथा वाद सूची में ' + ourRole(m, true) + ' के अधिवक्ता के रूप में नाम दर्शाया जाना आवश्यक है।', 'p'],
      ['प्रार्थना', 'cb'],
      ['अतः माननीय न्यायालय से विनम्र प्रार्थना है कि ' + (f.who || m.clients || '') + ' की ओर से प्रस्तुत वकालतनामा पत्रावली पर लेने तथा वाद सूची में ' + ourRole(m, true) + ' के अधिवक्ता के रूप में नाम दर्शाये जाने की न्यायहित में कृपा करें।', 'p']],
  },
  listing: {
    en: 'Listing application (High Court)', hi: null, forum: 'HC', fields: [['facts', 'Facts (when filed, last listed, why urgent)']],
    en_body: (m, f) => [
      ['APPLICATION FOR LISTING', 'cb'], ['OF ' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).toUpperCase(), 'c'],
      ["To,\nThe Hon'ble the Chief Justice and\nHis other companion Judges of the aforesaid Court.", 'p'],
      ['The ' + ourRole(m).toLowerCase() + ' most humbly and respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat ' + (f.facts || 'the above noted case was filed on __________ and was last listed on __________.') , 'p'],
      ['2.\tThat since then the above noted case has not been listed.', 'p'],
      ['3.\tThat therefore it is expedient in the interest of Justice that the above noted case be listed for hearing.', 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to direct the listing of the above noted case for hearing in the interest of justice.", 'p']],
  },
  interim: {
    en: 'Interim order extension (High Court)', hi: null, forum: 'HC', fields: [['orderDate', 'Interim order dated (DD.MM.YYYY)'], ['gist', 'What the interim order gives (e.g. no coercive action / stay of proceedings)'], ['lapse', 'Why it needs extension (e.g. case not listed since; order operates till next listing)']],
    en_body: (m, f) => [
      ['APPLICATION FOR EXTENSION OF INTERIM ORDER', 'cb'], ['DATED ' + (f.orderDate || '__________'), 'c'],
      ["To,\nThe Hon'ble the Chief Justice and\nHis other companion Judges of the aforesaid Court.", 'p'],
      ['The ' + ourRole(m).toLowerCase() + ' most humbly and respectfully begs to submit herein as below:-', 'p'],
      ["1.\tThat the above noted " + (m.type ? m.type + ' ' : '') + "case has been filed by the " + ourRole(m).toLowerCase() + " before this Hon'ble Court and is pending.", 'p'],
      ["2.\tThat this Hon'ble Court vide order dated " + (f.orderDate || '__________') + ' was pleased to grant interim protection to the ' + ourRole(m).toLowerCase() + ', namely ' + (f.gist || '____________________') + ', till the next date of listing.', 'p'],
      ['3.\tThat ' + (f.lapse || 'the above noted case has not been listed thereafter and the interim order is operating only till the next date of listing') + ', for no fault on the part of the ' + ourRole(m).toLowerCase() + '.', 'p'],
      ['4.\tThat the ' + ourRole(m).toLowerCase() + ' has not misused the interim protection granted by this Hon\'ble Court and has complied with the conditions, if any, imposed therein.', 'p'],
      ['5.\tThat the ' + ourRole(m).toLowerCase() + ' has a good prima facie case, the balance of convenience lies in favour of the ' + ourRole(m).toLowerCase() + ', and the ' + ourRole(m).toLowerCase() + ' shall suffer irreparable loss and injury if the interim order is not extended.', 'p'],
      ["6.\tThat it is therefore expedient in the interest of Justice that the interim order dated " + (f.orderDate || '__________') + " be extended till the next date of listing or until further orders of this Hon'ble Court.", 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to extend the interim order dated " + (f.orderDate || '__________') + " passed in the above noted case till the next date of listing or until further orders of this Hon'ble Court, in the interest of justice.", 'p'],
      ['(Supported by affidavit)', 'c']],
  },
  slip: {
    en: 'Mentioning slip (High Court)', hi: null, forum: 'HC', own: true, fields: [['courtNo', 'Court No.'], ['forWhat', 'Mentioned for (e.g. urgent listing / extension of interim order / listing today)'], ['why', 'Reason for urgency']],
    en_body: (m, f) => {
      const pt = parties(m);
      return [
        ["In The Hon'ble High Court of Judicature At Allahabad, LUCKNOW BENCH, LUCKNOW", 'c'],
        ['M E N T I O N I N G   S L I P', 'cb'],
        ['Court No.:\t' + (f.courtNo || '______') + '\t\tDate:\t' + dmy(todayIso()), 'p'],
        ['Case No.:\t' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '__________')), 'p'],
        ['Parties:\t' + pt.first + (pt.second ? ' v. ' + pt.second : ''), 'p'],
        ...(m.crimeNo ? [['Crime No.:\t' + m.crimeNo + (m.sections ? ', u/s ' + m.sections : '') + (m.ps ? ', P.S. ' + m.ps : ''), 'p']] : []),
        ['Counsel:\t' + ADV.name + ', Advocate (' + ADV.aor + ') · Mobile ' + ADV.phone.split(',')[0] + ' · for the ' + ourRole(m), 'p'],
        ['Last listed / next date:\t' + (m.lastDate ? dmy(m.lastDate) : '______') + ' / ' + (m.nextDate ? dmy(m.nextDate) : '______'), 'p'],
        ['Mentioned for:\t' + (f.forWhat || 'urgent listing'), 'p'],
        ['Urgency:\t' + (f.why || '____________________________________________'), 'p'],
        ["Prayer:\tIt is most respectfully prayed that the above noted case may kindly be " + (/extension/i.test(f.forWhat || '') ? 'taken up for extension of the interim order' : 'listed for hearing') + " at the earliest, in the interest of justice.", 'p']];
    },
  },
  early: {
    en: 'Early hearing application (High Court)', hi: null, forum: 'HC', fields: [['facts', 'Facts (when filed, last listed, why early hearing is needed)']],
    en_body: (m, f) => [
      ['APPLICATION FOR EARLY HEARING', 'cb'], ['OF ' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).toUpperCase(), 'c'],
      ["To,\nThe Hon'ble the Chief Justice and\nHis other companion Judges of the aforesaid Court.", 'p'],
      ['The ' + ourRole(m).toLowerCase() + ' most humbly and respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat ' + (f.facts || 'the above noted case was filed on __________ and was last listed on __________.'), 'p'],
      ['2.\tThat the matter involves the liberty / valuable rights of the ' + ourRole(m).toLowerCase() + ' and any further delay shall cause irreparable loss to the ' + ourRole(m).toLowerCase() + '.', 'p'],
      ['3.\tThat therefore it is expedient in the interest of Justice that the above noted case be heard at an early date.', 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to fix an early date of hearing in the above noted case in the interest of justice.", 'p']],
  },
  time: {
    en: 'Time to file reply / objection', hi: 'जवाब/आपत्ति हेतु समय', forum: 'District', fields: [['what', 'Time for (e.g. reply to application dated __)']],
    en_body: (m, f) => [
      ['A P P L I C A T I O N', 'cb'], ['SEEKING TIME', 'c'],
      ['The ' + ourRole(m).toLowerCase() + ' most respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat the above noted case is fixed for today for ' + (f.what || 'filing of reply / objection') + '.', 'p'],
      ['2.\tThat the ' + ourRole(m).toLowerCase() + ' requires some more time to collect the relevant documents and to prepare the ' + (f.what ? 'same' : 'reply / objection') + ', and therefore it is expedient in the interest of Justice that some time be granted.', 'p'],
      ['P R A Y E R', 'cb'],
      ["Wherefore, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to grant some time to the " + ourRole(m).toLowerCase() + ' for ' + (f.what || 'filing reply / objection') + ' in the interest of Justice.', 'p']],
    hi_body: (m, f) => [
      ['प्रार्थना पत्र', 'cb'], ['समय दिये जाने हेतु', 'c'],
      ['प्रार्थी निम्नलिखित निवेदन करता है:-', 'p'],
      ['1.\tयह कि उपरोक्त वाद आज ' + (f.what || 'जवाब/आपत्ति प्रस्तुत करने') + ' हेतु नियत है।', 'p'],
      ['2.\tयह कि ' + ourRole(m, true) + ' को आवश्यक अभिलेख एकत्र करने एवं ' + (f.what ? 'उसे' : 'जवाब/आपत्ति') + ' तैयार करने हेतु कुछ और समय की आवश्यकता है। अतः न्यायहित में समय दिया जाना आवश्यक है।', 'p'],
      ['प्रार्थना', 'cb'],
      ['अतः माननीय न्यायालय से विनम्र प्रार्थना है कि ' + ourRole(m, true) + ' को ' + (f.what || 'जवाब/आपत्ति प्रस्तुत करने') + ' हेतु न्यायहित में समय प्रदान करने की कृपा करें।', 'p']],
  },
};

async function makeDraft(m, key, lang, f) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const T = TEMPLATES[key], hi = lang === 'hi';
  const FONT = hi ? 'Mangal' : 'Times New Roman', SZ = 28;
  const P = (text, o = {}) => String(text).split('\n').map((line, i, arr) => new D.Paragraph({
    alignment: o.align || D.AlignmentType.JUSTIFIED, spacing: { after: i === arr.length - 1 ? (o.after ?? 160) : 0, line: 360 }, indent: o.indent,
    children: [new D.TextRun({ text: line, bold: o.bold, underline: o.u ? {} : undefined, size: o.size || SZ, font: FONT })] }));
  const C = D.AlignmentType.CENTER, R = D.AlignmentType.RIGHT;
  const pt = parties(m), role = ourRole(m, hi);
  const caseRef = (m.type ? m.type + ' ' : '') + (m.caseNo || (hi ? 'संख्या ________' : 'No. ________'));
  const head = [
    ...P(courtLine(m, hi), { align: C, bold: true, after: 60 }),
    ...P('-------------------------', { align: C, after: 60 }),
    ...(m.forum === 'HC' ? P(hi ? 'प्रकीर्ण प्रार्थना पत्र संख्या ________ सन ' + new Date().getFullYear() : 'Miscellaneous Application No. ________ of ' + new Date().getFullYear(), { align: C, after: 60 }) : []),
    ...(m.forum === 'HC' ? P(hi ? 'में' : 'IN RE:', { align: C, after: 60 }) : []),
    ...P(caseRef, { align: C, bold: true, after: 60 }),
    ...(m.crimeNo ? P((hi ? 'अपराध संख्या ' : 'Crime No. ') + m.crimeNo + (m.sections ? (hi ? ' धारा ' : ', u/s ') + m.sections : '') + (m.ps ? (hi ? ', थाना ' : ', P.S. ') + m.ps : ''), { align: C, after: 120 }) : []),
    ...P(pt.first + (pt.second ? '' : '') , { align: D.AlignmentType.LEFT, after: 40 }),
    ...(pt.second ? [...P(hi ? 'बनाम' : 'Versus', { align: C, after: 40 }), ...P(pt.second, { align: D.AlignmentType.LEFT, after: 200 })] : []),
  ];
  if (T.own) head.length = 0;
  const body = (hi ? T.hi_body : T.en_body)(m, f).flatMap(([t, s]) => s === 'cb' ? P(t, { align: C, bold: true, u: true, after: 120 }) : s === 'c' ? P(t, { align: C, bold: true, after: 160 }) : P(t, T.own ? { align: D.AlignmentType.LEFT, indent: { left: 2160, hanging: 2160 } } : { indent: /^\d/.test(t) ? { left: 720, hanging: 720 } : undefined }));
  const today = dmy(todayIso());
  const sig = [
    new D.Paragraph({ spacing: { before: 360 }, tabStops: [{ type: D.TabStopType.RIGHT, position: 9000 }], children: [new D.TextRun({ text: (hi ? 'लखनऊ' : 'Lucknow') + '\t(' + (hi ? HI_ADV : ADV.name) + ')', size: SZ, font: FONT, bold: true })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9000 }], children: [new D.TextRun({ text: (hi ? 'दिनांक: ' : 'Dated: ') + today + '\t' + (hi ? 'अधिवक्ता' : 'Advocate'), size: SZ, font: FONT })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9000 }], children: [new D.TextRun({ text: '\t' + (hi ? role + ' के अधिवक्ता' : 'Counsel for the ' + role), size: SZ, font: FONT })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9000 }], children: [new D.TextRun({ text: '\t' + (hi ? 'पंजीकरण सं. ' : 'Enrolment No. ') + ADV.enrol, size: 22, font: FONT })] }),
  ];
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: FONT, size: SZ } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 } } }, children: [...head, ...body, ...sig] }] });
  const blob = await D.Packer.toBlob(doc);
  const name = cleanName(today + ' ' + (hi ? T.hi : T.en)) + '.docx';
  let url = '';
  if (m.folderId) {
    try {
      let parent = m.folderId;
      try { const r = await g('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('1 Pleadings')); if (r.ok) parent = (await r.json()).id; } catch (e) {}
      const it = await uploadFile(parent, new File([blob], name), name);
      url = it.webUrl || '';
    } catch (e) {}
  }
  return { blob, name, url };
}

function sheetDraft(m) {
  const S2 = { key: 'adjournment', lang: m.forum === 'HC' ? 'en' : 'en', f: {}, busy: false, done: null };
  const draw = () => {
    const T = TEMPLATES[S2.key];
    if (!T.hi && S2.lang === 'hi') S2.lang = 'en';
    openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(m.no)} · draft</small><h1>${esc(m.title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="grp"><span class="lbl">Document</span><div class="chips">${Object.entries(TEMPLATES).filter(([, t]) => !t.forum || (t.forum === 'HC' ? m.forum === 'HC' : m.forum !== 'HC')).map(([k, t]) => `<button class="chip ${S2.key === k ? 'on' : ''}" data-dr="key" data-v="${k}">${t.en}</button>`).join('')}</div></div>
      ${T.hi ? `<div class="grp"><span class="lbl">Language</span><div class="chips"><button class="chip ${S2.lang === 'en' ? 'on' : ''}" data-dr="lang" data-v="en">English</button><button class="chip ${S2.lang === 'hi' ? 'on' : ''}" data-dr="lang" data-v="hi">हिन्दी</button></div></div>` : ''}
      ${(S2.key === 'adjournment' ? [['reason', S2.lang === 'hi' ? 'Reason (in Hindi, optional)' : 'Reason (optional; default "exigencies of work")']] : T.fields).map(([k, l]) => `<div class="field"><label for="dr_${k}">${esc(l.toUpperCase())}</label>${k === 'facts' || k === 'why' || k === 'lapse' || k === 'gist' ? `<textarea class="in" id="dr_${k}" data-df="${k}">${esc(S2.f[k] || '')}</textarea>` : `<input class="in" id="dr_${k}" data-df="${k}" value="${esc(S2.f[k] || (k === 'who' ? m.clients || '' : ''))}">`}</div>`).join('')}
      <p class="hint">Court, case no., parties, crime no. and your signature block are filled in from the diary. ${m.folderId ? 'Saved into the matter folder › 1 Pleadings.' : 'This matter has no folder yet, so use Download.'}</p>
      ${S2.done ? `<div class="two"><button class="act primary" data-dr="open">Open in Word</button><button class="act blue" data-dr="dl">Download</button></div><p class="hint">${esc(S2.done.name)}</p>` : `<button class="save" data-dr="make" ${S2.busy ? 'disabled' : ''}>${S2.busy ? 'Preparing…' : 'Make Word file'}</button>`}`);
  };
  draw();
  const root = $('#sheet-root');
  root.oninput = e => { const k = e.target.dataset?.df; if (k) S2.f[k] = e.target.value; };
  root.onclick = async e => {
    const el = e.target.closest('[data-dr]'); if (!el) return;
    const k = el.dataset.dr;
    if (k === 'key' || k === 'lang') { S2[k] = el.dataset.v; S2.done = null; draw(); }
    else if (k === 'make') { S2.busy = true; draw(); try { S2.done = await makeDraft(m, S2.key, S2.lang, S2.f); toast(S2.done.url ? 'Draft saved in 1 Pleadings' : 'Draft ready'); if (S2.done.url) setTimeout(() => S.tab === 'matter' && loadFolder(), 800); } catch (er) { toast(er.message); } S2.busy = false; draw(); }
    else if (k === 'open') { if (S2.done.url) window.open(S2.done.url, '_blank'); else toast('Not saved to OneDrive. Use Download.'); }
    else if (k === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(S2.done.blob); a.download = S2.done.name; a.click(); }
  };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="draft"]'); if (el) sheetDraft(find(el.dataset.id)); });
