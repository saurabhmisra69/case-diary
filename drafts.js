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
    en: 'Listing application (High Court)', hi: null, forum: 'HC', affidavit: true, affFor: 'listing application', fields: [['facts', 'Facts (when filed, last listed, why urgent)']],
    en_body: (m, f) => [
      ['APPLICATION FOR LISTING', 'cb'], ['OF ' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).toUpperCase(), 'c'],
      ["To,\nThe Hon'ble the Chief Justice and\nHis other companion Judges of the aforesaid Court.", 'p'],
      ['The ' + ourRole(m).toLowerCase() + ' most humbly and respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat ' + (f.facts || 'the above noted case was filed on __________ and was last listed on __________.') , 'p'],
      ['2.\tThat since then the above noted case has not been listed.', 'p'],
      ['3.\tThat therefore it is expedient in the interest of Justice that the above noted case be listed for hearing.', 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to direct the listing of the above noted case for hearing in the interest of justice.", 'p'], ['(Supported by affidavit)', 'c']],
  },
  interim: {
    en: 'Interim order extension (High Court)', hi: null, forum: 'HC', affidavit: true, affFor: 'application for extension of interim order', fields: [['orderDate', 'Interim order dated (DD.MM.YYYY)'], ['gist', 'What the interim order gives (e.g. no coercive action / stay of proceedings)'], ['lapse', 'Why it needs extension (e.g. case not listed since; order operates till next listing)']],
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
    en: 'Early hearing application (High Court)', hi: null, forum: 'HC', affidavit: true, affFor: 'application for early hearing', fields: [['facts', 'Facts (when filed, last listed, why early hearing is needed)']],
    en_body: (m, f) => [
      ['APPLICATION FOR EARLY HEARING', 'cb'], ['OF ' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).toUpperCase(), 'c'],
      ["To,\nThe Hon'ble the Chief Justice and\nHis other companion Judges of the aforesaid Court.", 'p'],
      ['The ' + ourRole(m).toLowerCase() + ' most humbly and respectfully begs to submit herein as below:-', 'p'],
      ['1.\tThat ' + (f.facts || 'the above noted case was filed on __________ and was last listed on __________.'), 'p'],
      ['2.\tThat the matter involves the liberty / valuable rights of the ' + ourRole(m).toLowerCase() + ' and any further delay shall cause irreparable loss to the ' + ourRole(m).toLowerCase() + '.', 'p'],
      ['3.\tThat therefore it is expedient in the interest of Justice that the above noted case be heard at an early date.', 'p'],
      ['P R A Y E R', 'cb'],
      ["WHEREFORE, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to fix an early date of hearing in the above noted case in the interest of justice.", 'p'], ['(Supported by affidavit)', 'c']],
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
  const rows0 = (hi ? T.hi_body : T.en_body)(m, f).filter(([t]) => !/^\(supported by affidavit\)$|^\(शपथ पत्र द्वारा समर्थित\)$/i.test(t));
  if (!T.own && /^(full|short|yes)$/.test(f.withAff || '')) rows0.push([hi ? '(शपथ पत्र द्वारा समर्थित)' : '(Supported by affidavit)', 'c']);
  const body = rows0.flatMap(([t, s]) => s === 'cb' ? P(t, { align: C, bold: true, u: true, after: 120 }) : s === 'c' ? P(t, { align: C, bold: true, after: 160 }) : P(t, T.own ? { align: D.AlignmentType.LEFT, indent: { left: 2160, hanging: 2160 } } : { indent: /^\d/.test(t) ? { left: 720, hanging: 720 } : undefined }));
  const today = dmy(todayIso());
  const sig = [
    new D.Paragraph({ spacing: { before: 360 }, tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: (hi ? 'लखनऊ' : 'Lucknow') + '\t(' + (hi ? HI_ADV : ADV.name) + ')', size: SZ, font: FONT, bold: true })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: (hi ? 'दिनांक: ' : 'Dated: ') + today + '\t' + (hi ? 'अधिवक्ता' : 'Advocate'), size: SZ, font: FONT })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t' + (hi ? role + ' के अधिवक्ता' : 'Counsel for the ' + role), size: SZ, font: FONT })] }),
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t' + (hi ? 'पंजीकरण सं. ' : 'Enrolment No. ') + ADV.enrol, size: 22, font: FONT })] }),
  ];
  // affidavit in support: added on its own pages whenever the application needs one
  const aff = [];
  const bodyRows = (hi ? T.hi_body : T.en_body)(m, f);
  if (!T.own && /^(full|short|yes)$/.test(f.withAff || '')) {
    const full = f.withAff === 'full';
    const nParas = bodyRows.filter(([t]) => /^\d+\./.test(t)).length || 1;
    const dep = { name: f.depName || '______________________', rel: f.depRel || 'son of ______________________', age: f.depAge || '____', addr: f.depAddr || '________________________________________', is: f.depIs || 'applicant' };
    const isSelf = !/pairokar|पैरोकार/i.test(dep.is);
    const L = D.AlignmentType.LEFT;
    aff.push(new D.Paragraph({ pageBreakBefore: true, alignment: C, spacing: { after: 60 }, children: [new D.TextRun({ text: courtLine(m, hi), bold: true, size: SZ, font: FONT })] }));
    aff.push(...P(hi ? 'शपथ पत्र' : 'A F F I D A V I T', { align: C, bold: true, u: true, after: 60 }));
    aff.push(...P(hi ? '(' + T.hi + ' के समर्थन में)' : '(In support of the accompanying ' + (T.affFor || 'application') + ')', { align: C, after: 120 }));
    if (m.forum === 'HC') aff.push(...P(hi ? 'में' : 'IN RE:', { align: C, after: 60 }));
    aff.push(...P(caseRef, { align: C, bold: true, after: 60 }));
    aff.push(...P(pt.first, { align: L, after: 40 }));
    if (pt.second) { aff.push(...P(hi ? 'बनाम' : 'Versus', { align: C, after: 40 }), ...P(pt.second, { align: L, after: 200 })); }
    const paras = hi ? [
      'मैं, ' + dep.name + ', आयु लगभग ' + dep.age + ' वर्ष, ' + dep.rel + ', निवासी ' + dep.addr + ', शपथकर्ता, शपथपूर्वक निम्नवत कथन करता हूँ:-',
      '1.\tयह कि शपथकर्ता उपरोक्त वाद में ' + (isSelf ? role + ' स्वयं' : role + ' का पैरोकार') + ' है तथा वाद के तथ्यों एवं परिस्थितियों से भली-भाँति परिचित है।',
      '2.\tयह कि शपथकर्ता ने संलग्न प्रार्थना पत्र को पढ़ एवं समझ लिया है।',
      '3.\tयह कि संलग्न प्रार्थना पत्र के प्रस्तर 1 से ' + nParas + ' में वर्णित तथ्य शपथकर्ता के निजी ज्ञान एवं अभिलेखों के आधार पर सत्य एवं सही हैं।',
    ] : [
      'I, ' + dep.name + ', aged about ' + dep.age + ' years, ' + dep.rel + ', resident of ' + dep.addr + ', the deponent, do hereby solemnly affirm and state on oath as under:-',
      '1.\tThat the deponent is ' + (isSelf ? 'the ' + role.toLowerCase() + (/^(daughter|wife|d\/o|w\/o)/i.test(dep.rel) ? ' herself' : ' himself') : 'the pairokar of the ' + role.toLowerCase()) + ' in the above noted case and as such is fully conversant with the facts and circumstances of the case deposed to hereinafter.',
      '2.\tThat the deponent has read and understood the contents of the accompanying application.',
      '3.\tThat the contents of paragraphs 1 to ' + nParas + ' of the accompanying application are true to the personal knowledge of the deponent and based on the record of the case.',
    ];
    let nAff = 3;
    if (full) {
      const appParas = bodyRows.filter(([t]) => /^\d+\./.test(t)).map(([t]) => t.replace(/^\d+\.\s*/, ''));
      const lines = [paras[0], paras[1].replace(/^1\./, '1.')];
      appParas.forEach((t, i) => lines.push((i + 2) + '.\t' + t));
      nAff = appParas.length + 1;
      lines.forEach(t => aff.push(...P(t)));
    } else paras.forEach(t => aff.push(...P(t)));
    aff.push(new D.Paragraph({ spacing: { before: 240, after: 240 }, tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t' + (hi ? 'शपथकर्ता' : 'Deponent'), bold: true, size: SZ, font: FONT })] }));
    aff.push(...P(hi ? 'सत्यापन' : 'V E R I F I C A T I O N', { align: C, bold: true, u: true, after: 120 }));
    aff.push(...P(hi ? 'मैं, उपरोक्त नामित शपथकर्ता, सत्यापित करता हूँ कि इस शपथ पत्र के प्रस्तर 1 से ' + nAff + ' की बातें मेरे निजी ज्ञान से सत्य एवं सही हैं, इसका कोई भाग असत्य नहीं है और न ही कोई तथ्य छिपाया गया है। ईश्वर मेरी सहायता करे।'
      : 'I, the deponent above named, do hereby verify that the contents of paragraphs 1 to ' + nAff + ' of this affidavit are true to my personal knowledge' + (full ? ' and based on the record of the case, which I believe to be true' : '') + '; no part of it is false and nothing material has been concealed. So help me God.'));
    aff.push(...P(hi ? 'हस्ताक्षरित एवं सत्यापित दिनांक ____________ को लखनऊ में।' : 'Signed and verified this ____ day of ______________, ' + new Date().getFullYear() + ' at Lucknow.'));
    aff.push(new D.Paragraph({ spacing: { before: 240, after: 240 }, tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t' + (hi ? 'शपथकर्ता' : 'Deponent'), bold: true, size: SZ, font: FONT })] }));
    aff.push(...P(hi ? 'मैं शपथकर्ता को पहचानता हूँ जिसने मेरे समक्ष हस्ताक्षर किए हैं।' : 'I identify the deponent who has signed before me.'));
    aff.push(new D.Paragraph({ spacing: { before: 240 }, tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t(' + (hi ? HI_ADV : ADV.name) + ')', bold: true, size: SZ, font: FONT })] }));
    aff.push(new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 8640 }], children: [new D.TextRun({ text: '\t' + (hi ? 'अधिवक्ता' : 'Advocate'), size: SZ, font: FONT })] }));
  }
  // documents attached as annexures follow the application, each from a new page
  const annex = [];
  (f._annex || []).forEach((ax, i) => {
    annex.push(new D.Paragraph({ pageBreakBefore: true, alignment: C, spacing: { after: 120 }, children: [new D.TextRun({ text: (hi ? 'संलग्नक संख्या ' : 'ANNEXURE NO. ') + (i + 1), bold: true, underline: {}, size: SZ, font: FONT })] }));
    if (ax.title) annex.push(...P(ax.title, { align: C, after: 200 }));
    const HM = paperOf('draft') === 'A4' ? 840 : 1000;   // tallest picture that fits the page
    ax.images.forEach((im, k) => { const sc = Math.min(1, HM / im.h); annex.push(new D.Paragraph({ alignment: C, pageBreakBefore: k > 0, children: [new D.ImageRun({ data: im.data, transformation: { width: Math.round(im.w * sc), height: Math.round(im.h * sc) } })] })); });
  });
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: FONT, size: SZ } } } },
    sections: [{ properties: { page: pageFor(paperOf('draft'), 'Legal', { top: 1440, bottom: 1440, left: 2160, right: 1440 }) }, children: [...head, ...body, ...sig, ...aff, ...annex] }] });
  const blob = await D.Packer.toBlob(doc);
  const name = cleanName(today + ' ' + (hi ? T.hi : T.en)) + '.docx';
  let url = '';
  if (m.folderId) {
    try {
      let parent = m.folderId;
      try { const r = await g('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('1 Pleadings')); if (r.ok) parent = (await r.json()).id; } catch (e) {}
      const it = await uploadFile(parent, new File([blob], name), name);
      url = it.webUrl || ''; var itemId = it.id, parentId = parent;
    } catch (e) {}
  }
  return { blob, name, url, itemId: typeof itemId !== 'undefined' ? itemId : '', parentId: typeof parentId !== 'undefined' ? parentId : '' };
}

/* ---------- import / export around a draft ----------
   Import: fill the form from an order (read by Claude), attach papers as annexures, or fill your own Word format.
   Export: Word in the folder, a PDF copy beside it, Share, Download. */
const FIELD_HINT = 'Placeholders for your own format: {{COURT}} {{CASE}} {{CASE_NO}} {{TYPE}} {{FIRST_PARTY}} {{SECOND_PARTY}} {{CLIENT}} {{SIDE}} {{CRIME_NO}} {{SECTIONS}} {{PS}} {{NEXT_DATE}} {{LAST_DATE}} {{ITEM}} {{DATE}} {{ADVOCATE}} {{ENROLMENT}} {{MOBILE}}';
function formatValues(m) {
  const pt = parties(m);
  return { COURT: courtLine(m, false), CASE: ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).trim(), CASE_NO: m.caseNo || '', TYPE: m.type || '',
    FIRST_PARTY: pt.first, SECOND_PARTY: pt.second, CLIENT: m.clients || '', SIDE: ourRole(m), CRIME_NO: m.crimeNo || '', SECTIONS: m.sections || '', PS: m.ps || '',
    NEXT_DATE: m.nextDate ? dmy(m.nextDate) : '', LAST_DATE: m.lastDate ? dmy(m.lastDate) : '', ITEM: m.item || '', DATE: dmy(todayIso()),
    ADVOCATE: ADV.name, ENROLMENT: ADV.enrol, MOBILE: ADV.phone.split(',')[0] };
}
let jszipLoading = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszipLoading) jszipLoading = new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = 'lib/jszip.min.js'; sc.onload = () => ok(window.JSZip); sc.onerror = () => { jszipLoading = null; bad(new Error('Could not load')); }; document.head.appendChild(sc); });
  return jszipLoading;
}
async function fillOwnFormat(m, fmt) {
  const JSZip = await loadJSZip(), zip = await JSZip.loadAsync(fmt.buf), vals = formatValues(m);
  const xmlEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let found = 0;
  for (const p of Object.keys(zip.files).filter(p => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p))) {
    let x = await zip.file(p).async('string');
    // Word often splits {{NAME}} across several runs; join the pieces first
    x = x.replace(/\{(?:<[^>]+>)*\{((?:[^{}<]|<[^>]+>)*?)\}(?:<[^>]+>)*\}/g, (all, inner) => '{{' + inner.replace(/<[^>]+>/g, '') + '}}');
    x = x.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (all, k) => { if (k in vals) { found++; return xmlEsc(vals[k]); } return all; });
    zip.file(p, x);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const name = cleanName(dmy(todayIso()) + ' ' + fmt.name.replace(/\.docx$/i, '')) + '.docx';
  let url = '', itemId = '', parentId = '';
  if (m.folderId) {
    try {
      parentId = m.folderId;
      try { const r = await g('/me/drive/items/' + m.folderId + ':/' + encodeURIComponent('1 Pleadings')); if (r.ok) parentId = (await r.json()).id; } catch (e) {}
      const it = await uploadFile(parentId, new File([blob], name), name); url = it.webUrl || ''; itemId = it.id;
    } catch (e) {}
  }
  return { blob, name, url, itemId, parentId, found };
}

/* pick a paper: from the matter's folder (any sub-folder, or up to the case root) or from this device */
function pickDoc(m, title, exts) {
  return new Promise(resolve => {
    const st = { stack: m.folderId ? [{ id: m.folderId, name: m.folderName || 'Case folder' }] : [], items: null, err: '' };
    const ok = it => it.folder || exts.includes((it.name.split('.').pop() || '').toLowerCase());
    const draw = () => {
      const cur = st.stack[st.stack.length - 1];
      openSheet(`<div class="s-head"><div><small>${esc(mref(m))}</small><h1>${esc(title)}</h1></div><button class="x" data-pd="cancel" aria-label="Close">${I.x}</button></div>
        <label class="act blue" style="margin-bottom:10px">From this ${isPhone() ? 'phone' : 'computer'}<input type="file" accept="${exts.map(e => '.' + e).join(',')}" data-pd="local" hidden></label>
        ${cur ? `<div class="crumbs">${st.stack.length > 1 ? '<button data-pd="up">‹ Back</button><span>›</span>' : '<button data-pd="root">‹ Case folders</button><span>›</span>'}<button class="on">${esc(cur.name)}</button></div>` : ''}
        <div class="flist" style="max-height:52vh;overflow:auto">${st.err ? `<p class="empty">${esc(st.err)}</p>` : !st.items ? '<p class="empty">Reading folder…</p>' : st.items.filter(ok).map(it => { const [ic, bg] = fileIcon(it); return `<button class="frow" data-pd="${it.folder ? 'into' : 'pick'}" data-id="${it.id}"><span class="ficon" style="background:${bg}">${ic}</span><span class="fname">${esc(it.name)}<small>${it.folder ? 'folder' : kb(it.size || 0)}</small></span></button>`; }).join('') || '<p class="empty">Nothing suitable here.</p>'}</div>`);
    };
    const load = async () => { st.items = null; st.err = ''; draw(); try { const cur = st.stack[st.stack.length - 1]; st.items = await listChildren(cur ? cur.id : (await caseRoot()).id); } catch (e) { st.err = e.message; } draw(); };
    const root = $('#sheet-root');
    const done = v => { root.onclick = root.onchange = null; resolve(v); };
    root.onclick = async e => {
      const el = e.target.closest('[data-pd]'); if (!el) return;
      const a = el.dataset.pd;
      if (a === 'cancel') done(null);
      else if (a === 'up') { st.stack.pop(); load(); }
      else if (a === 'root') { const r = await caseRoot(); st.stack = [{ id: r.id, name: 'Case folders' }]; load(); }
      else if (a === 'into') { const it = st.items.find(x => x.id === el.dataset.id); st.stack.push({ id: it.id, name: it.name }); load(); }
      else if (a === 'pick') {
        const it = st.items.find(x => x.id === el.dataset.id); el.querySelector('small').textContent = 'Opening…';
        try { const r = await g('/me/drive/items/' + it.id + '/content'); if (!r.ok) throw new Error('OneDrive ' + r.status); done({ name: it.name, blob: await r.blob() }); } catch (er) { toast(er.message); }
      }
    };
    root.onchange = e => { if (e.target.dataset?.pd === 'local' && e.target.files[0]) { const f = e.target.files[0]; done({ name: f.name, blob: f }); } };
    if (st.stack.length) load(); else caseRoot().then(r => { st.stack = [{ id: r.id, name: 'Case folders' }]; load(); });
  });
}

/* turn a picked paper into page images for an annexure */
async function paperToImages(doc) {
  const ext = (doc.name.split('.').pop() || '').toLowerCase(), out = [], W = 560, HMAX = 1000;
  const fit = (w, h) => { let ww = W, hh = Math.round(h * W / w); if (hh > HMAX) { hh = HMAX; ww = Math.round(w * HMAX / h); } return { w: ww, h: hh }; };
  if (ext === 'pdf') {
    const lib = await loadPdfLib(), pdf = await lib.getDocument({ data: await doc.blob.arrayBuffer() }).promise;
    for (let n = 1; n <= Math.min(pdf.numPages, 40); n++) {
      const page = await pdf.getPage(n), vp = page.getViewport({ scale: 1.6 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
      out.push({ data: await b.arrayBuffer(), ...fit(c.width, c.height) });
    }
    pdf.destroy();
  } else {
    const b = await shrinkImage(doc.blob, 1700);
    const bm = await createImageBitmap(b);
    out.push({ data: await b.arrayBuffer(), ...fit(bm.width, bm.height) });
  }
  return out;
}

/* read an order with Claude and fill the draft's blanks */
async function readOrderForDraft(m, doc) {
  const prompt = `This is an Indian court order (English or Hindi, possibly handwritten) in the matter "${m.title}" (${m.type || ''} ${m.caseNo || ''}). Reply with ONLY JSON:
{"orderDate":"DD.MM.YYYY","courtNo":"court number if shown, else empty","interimRelief":"the interim protection granted, in a short clause such as 'no coercive action shall be taken against the applicant' or 'further proceedings of Case No. X shall remain stayed'; empty if none","operatesTill":"till when the interim order operates, e.g. 'till the next date of listing' or a date; empty if not stated","nextDate":"DD.MM.YYYY or empty","directions":"anything the party must do, with time limits, in one sentence; empty if none","summary":"what the order says in one or two plain English sentences"}
Never guess a date: leave it empty if unclear.`;
  const file = new File([doc.blob], doc.name || 'order.pdf', { type: doc.blob.type || '' });
  const o = await claudeAppRead({ m, file, prompt, title: 'Read the order for this draft', download: true });
  if (!o) throw new Error('Not filled — no reply pasted');
  return o;
}
function applyOrderToFields(key, o, f) {
  if (o.orderDate) f.orderDate = o.orderDate;
  if (o.interimRelief) f.gist = o.interimRelief;
  if (o.operatesTill) f.lapse = 'the interim order dated ' + (o.orderDate || '__________') + ' operates ' + o.operatesTill + ' and the case has not been taken up thereafter';
  if (o.courtNo) f.courtNo = o.courtNo;
  if (key === 'slip') { f.forWhat = f.forWhat || (o.interimRelief ? 'extension of interim order' : 'urgent listing'); f.why = 'Order dated ' + (o.orderDate || '______') + ': ' + (o.summary || ''); }
  if (key === 'listing' || key === 'early') f.facts = 'the above noted case was last taken up on ' + (o.orderDate || '__________') + ', when ' + (o.summary || '') ;
  if (key === 'time' && o.directions) f.what = o.directions;
}

function sheetDraft(m, preset) {
  delete PAPER_NOW.draft;
  const S2 = Object.assign({ key: 'adjournment', lang: 'en', f: {}, busy: '', done: null, annex: [], format: null }, preset || {});
  S2.f = Object.assign({ depName: m.clients || '' }, m.deponent || {}, S2.f);
  const T0 = () => TEMPLATES[S2.key];
  const draw = () => {
    const T = T0();
    if (!T.hi && S2.lang === 'hi') S2.lang = 'en';
    const fields = S2.key === 'adjournment' ? [['reason', S2.lang === 'hi' ? 'Reason (in Hindi, optional)' : 'Reason (optional; default "exigencies of work")']] : T.fields;
    openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${esc(mref(m))} · draft</small><h1>${esc(m.title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      ${S2.format ? `<div class="picked"><b>Your format: ${esc(S2.format.name)}</b><span><button class="linkbtn" data-dr="noformat">Use the app's drafts instead</button></span></div>` : `
      <div class="grp"><span class="lbl">Document</span><div class="chips">${Object.entries(TEMPLATES).filter(([, t]) => !t.forum || (t.forum === 'HC' ? m.forum === 'HC' : m.forum !== 'HC')).map(([k, t]) => `<button class="chip ${S2.key === k ? 'on' : ''}" data-dr="key" data-v="${k}">${t.en}</button>`).join('')}</div></div>
      ${T.hi ? `<div class="grp"><span class="lbl">Language</span><div class="chips"><button class="chip ${S2.lang === 'en' ? 'on' : ''}" data-dr="lang" data-v="en">English</button><button class="chip ${S2.lang === 'hi' ? 'on' : ''}" data-dr="lang" data-v="hi">हिन्दी</button></div></div>` : ''}`}
      <div class="grp"><span class="lbl">Import</span><div class="three">
        ${S2.format ? '' : `<button class="act blue" data-dr="fromorder">Fill from an order</button>`}
        ${S2.format ? '' : `<button class="act blue" data-dr="annex">Attach annexure</button>`}
        <button class="act blue" data-dr="format">${S2.format ? 'Change format' : 'Use my own format'}</button></div>
        <button class="ghost" data-dr="tpl" style="width:100%;margin-top:8px">From my templates</button>
        ${typeof sectionLinks === 'function' && sectionLinks(m).length ? `<p class="hint" style="margin:8px 0 4px">Bare Acts (your shelf):</p><div class="chips">${sectionLinks(m).map(x => `<button class="chip on" data-act="actsec" data-k="${x.k}" data-no="${esc(x.no)}">${esc(x.label)}</button>`).join('')}</div>` : ''}
        ${typeof sectionSearches === 'function' && (sectionSearches(m.sections).length || (TOPICS[m.type] || []).length) ? `<p class="hint" style="margin:8px 0 4px">Find authorities in Supreme Today (copied, then paste there):</p><div class="chips">${sectionSearches(m.sections).concat(TOPICS[m.type] || []).slice(0, 6).map(x => `<button class="chip" data-act="stsearch" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
        ${S2.annex.length ? `<div class="hist">${S2.annex.map((a, i) => `<div><b>Annexure ${i + 1}</b><span>${esc(a.title)} · ${a.images.length} page${a.images.length > 1 ? 's' : ''} <button class="linkbtn" data-dr="rmannex" data-i="${i}">Remove</button></span></div>`).join('')}</div>` : ''}
      </div>
      ${S2.format ? `<p class="hint">${esc(FIELD_HINT)}</p>` : fields.map(([k, l]) => `<div class="field"><label for="dr_${k}">${esc(l.toUpperCase())}</label>${['facts', 'why', 'lapse', 'gist'].includes(k) ? `<textarea class="in" id="dr_${k}" data-df="${k}">${esc(S2.f[k] || '')}</textarea>` : `<input class="in" id="dr_${k}" data-df="${k}" value="${esc(S2.f[k] || (k === 'who' ? m.clients || '' : ''))}">`}</div>`).join('')}
      ${!S2.format && !T.own && S2.key !== 'vakalat' ? `<div class="grp" id="dr_affq" style="margin-top:6px"><span class="lbl">Add a supporting affidavit?</span><div class="chips"><button class="chip ${S2.f.withAff === 'full' ? 'on' : ''}" data-dr="aff" data-v="full">Full affidavit</button><button class="chip ${S2.f.withAff === 'short' ? 'on' : ''}" data-dr="aff" data-v="short">Short affidavit</button><button class="chip ${S2.f.withAff === 'no' ? 'on' : ''}" data-dr="aff" data-v="no">No</button></div><p class="hint" style="margin:6px 0 0">Full: every paragraph of the application is sworn in the affidavit. Short: the deponent adopts the application's paragraphs.</p><div></div></div>` : ''}
      ${!S2.format && !T.own && /^(full|short|yes)$/.test(S2.f.withAff || '') ? `<div class="grp"><span class="lbl">Deponent</span><div class="chips"><button class="chip ${S2.f.depIs !== 'pairokar' ? 'on' : ''}" data-dr="dep" data-v="applicant">${esc(ourRole(m))} himself</button><button class="chip ${S2.f.depIs === 'pairokar' ? 'on' : ''}" data-dr="dep" data-v="pairokar">Pairokar</button></div></div>
      ${[['depName', 'Deponent name'], ['depRel', 'Son / daughter / wife of'], ['depAge', 'Age (years)'], ['depAddr', 'Address']].map(([k, l]) => `<div class="field"><label for="dr_${k}">${l.toUpperCase()}</label><input class="in" id="dr_${k}" data-df="${k}" value="${esc(S2.f[k] || '')}" placeholder="${k === 'depRel' ? 'son of …' : 'leave blank to fill by hand'}"></div>`).join('')}` : ''}
      <p class="hint">Court, case no., parties, crime no. and your signature are filled in from the matter. ${m.folderId ? 'Saved in the matter folder › 1 Pleadings.' : 'This matter has no folder yet, so use Download or Share.'}</p>
      ${S2.busy ? `<button class="save" disabled>${esc(S2.busy)}</button>` : S2.done ? `
        <span class="lbl">Export</span>
        <div class="three"><button class="act primary" data-dr="open">Open in Word</button><button class="act blue" data-dr="pdf">PDF copy</button><button class="act blue" data-dr="dl">Download</button></div>
        <span class="lbl" style="margin-top:14px;display:block">Send for printing</span>
        <div class="three"><button class="act wa" data-dr="sendwa">${I.wa}WhatsApp link</button><button class="act blue" data-dr="sendmail">Email link</button><button class="act blue" data-dr="sendfile">Send file</button></div>
        <p class="hint">Link: opens WhatsApp or email with a ready-to-print PDF and Word link; you choose your junior there. Send file: attaches the files themselves.</p><p class="hint">${esc(S2.done.name)}${S2.done.pdfName ? ' · ' + esc(S2.done.pdfName) : ''}</p>
        <button class="linkbtn" data-dr="again">Make another</button>`
      : `${S2.format ? '' : paperSwitch('draft')}<button class="save" data-dr="make">Make Word file</button>`}`);
  };
  draw();
  const root = $('#sheet-root');
  const bind = () => {
    root.oninput = e => { const k = e.target.dataset?.df; if (k) S2.f[k] = e.target.value; };
    root.onclick = onClick; root.onchange = null;
  };
  async function ensurePdf() {
    if (S2.done.pdfId) return;
    const r = await g('/me/drive/items/' + S2.done.itemId + '/content?format=pdf'); if (!r.ok) throw new Error('OneDrive ' + r.status);
    S2.done.pdf = await r.blob(); S2.done.pdfName = S2.done.name.replace(/\.docx$/i, '.pdf');
    const it = await uploadFile(S2.done.parentId, new File([S2.done.pdf], S2.done.pdfName, { type: 'application/pdf' }), S2.done.pdfName);
    S2.done.pdfId = it.id; setTimeout(() => S.tab === 'matter' && loadFolder(), 800);
  }
  async function onClick(e) {
    const el = e.target.closest('[data-dr]'); if (!el) return;
    const k = el.dataset.dr;
    if (k === 'key' || k === 'lang') { if (k === 'key') delete S2.f.withAff; S2[k] = el.dataset.v; S2.done = null; draw(); }
    else if (k === 'dep') { S2.f.depIs = el.dataset.v; draw(); }
    else if (k === 'aff') { S2.f.withAff = el.dataset.v; S2.done = null; draw(); }
    else if (k === 'again') { S2.done = null; delete S2.f.withAff; draw(); }
    else if (k === 'noformat') { S2.format = null; S2.done = null; draw(); }
    else if (k === 'rmannex') { S2.annex.splice(+el.dataset.i, 1); draw(); }
    else if (k === 'fromorder') {
      const doc = await pickDoc(m, 'Which order?', ['pdf', 'jpg', 'jpeg', 'png', 'webp']); bind();
      if (!doc) return draw();
      S2.busy = 'Waiting for Claude’s reply…'; draw();
      try { const o = await readOrderForDraft(m, doc); applyOrderToFields(S2.key, o, S2.f); toast('Filled from the order dated ' + (o.orderDate || '?') + '. Please check.', 4000); }
      catch (er) { toast(er.message, 5000); }
      S2.busy = ''; bind(); draw();
    }
    else if (k === 'annex') {
      const doc = await pickDoc(m, 'Attach which paper?', ['pdf', 'jpg', 'jpeg', 'png', 'webp']); bind();
      if (!doc) return draw();
      S2.busy = 'Adding ' + doc.name + '…'; draw();
      try { S2.annex.push({ title: doc.name.replace(/\.[^.]+$/, ''), images: await paperToImages(doc) }); S2.done = null; } catch (er) { toast('Could not attach: ' + er.message); }
      S2.busy = ''; draw();
    }
    else if (k === 'tpl') {
      const doc = await pickTemplate(); bind();
      if (doc) { S2.format = { name: doc.name, buf: await doc.blob.arrayBuffer() }; S2.done = null; }
      draw();
    }
    else if (k === 'format') {
      const doc = await pickDoc(m, 'Pick your Word format (.docx)', ['docx']); bind();
      if (doc) { S2.format = { name: doc.name, buf: await doc.blob.arrayBuffer() }; S2.done = null; }
      draw();
    }
    else if (k === 'make') {
      if (!S2.format && !T0().own && S2.key !== 'vakalat' && !S2.f.withAff) { toast('Add a supporting affidavit? Choose Full, Short or No.', 3500); const q = $('#dr_affq'); if (q) { q.scrollIntoView({ block: 'center', behavior: 'smooth' }); q.classList.add('ask'); } return; }
      S2.busy = 'Preparing…'; draw();
      try {
        if (S2.format) { S2.done = await fillOwnFormat(m, S2.format); toast(S2.done.found ? S2.done.found + ' blanks filled' : 'No {{…}} markers found in your format; saved as it is', 4000); }
        else {
          if (/^(full|short|yes)$/.test(S2.f.withAff || '')) { const dp = {}; ['depName', 'depRel', 'depAge', 'depAddr', 'depIs'].forEach(x => { if (S2.f[x]) dp[x] = S2.f[x]; }); if (JSON.stringify(dp) !== JSON.stringify(m.deponent || {})) change(() => { m.deponent = dp; touch(m); }); }
          S2.done = await makeDraft(m, S2.key, S2.lang, { ...S2.f, _annex: S2.annex }); toast(S2.done.url ? 'Draft saved in 1 Pleadings' : 'Draft ready'); }
        if (S2.done.url) setTimeout(() => S.tab === 'matter' && loadFolder(), 800);
      } catch (er) { toast(er.message); }
      S2.busy = ''; draw();
      const ex = $('#sheet-root [data-dr=open]'); if (ex) ex.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    else if (k === 'open') {
      if (S2.done.itemId) { try { openNative(await getItem(S2.done.itemId)); } catch (er) { window.open(S2.done.url, '_blank'); } }
      else toast('Not saved to OneDrive. Use Download or Share.');
    }
    else if (k === 'pdf') {
      if (!S2.done.itemId) { toast('A PDF copy needs the draft saved in the case folder'); return; }
      S2.busy = 'Making PDF…'; draw();
      try {
        await ensurePdf(); toast('PDF saved beside the Word file');
      } catch (er) { toast('Could not make the PDF: ' + er.message); }
      S2.busy = ''; draw();
    }
    else if (k === 'sendwa' || k === 'sendmail') {
      if (!S2.done.itemId) { toast('A link needs the draft saved in the case folder. Use Send file.'); return; }
      const w = k === 'sendwa' && !isPhone() ? window.open('', '_blank') : null;
      S2.busy = 'Preparing the link…'; draw();
      try {
        await ensurePdf();
        const link = async id => { const r = await g('/me/drive/items/' + id + '/createLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'view', scope: 'anonymous' }) }); if (!r.ok) throw new Error('OneDrive ' + r.status); return (await r.json()).link.webUrl; };
        const pdfUrl = await link(S2.done.pdfId), docUrl = await link(S2.done.itemId);
        const what = S2.done.name.replace(/^\d\d\.\d\d\.\d{4}\s*/, '').replace(/\.docx$/i, '');
        const lines = ['Please print and file: ' + what, m.title + ((m.type || m.caseNo) ? ' (' + ((m.type ? m.type + ' ' : '') + (m.caseNo || '')).trim() + ')' : ''), m.court ? m.court.replace(/\s*·.*$/, '') : '', m.nextDate ? 'Date: ' + dmy(m.nextDate) + (m.item ? ', item ' + m.item : '') : '', '', 'PDF (print this): ' + pdfUrl, 'Word (to edit): ' + docUrl].filter((x, i) => x || i === 4);
        const txt = lines.join('\n');
        const url = k === 'sendwa' ? 'https://wa.me/?text=' + encodeURIComponent(txt) : 'mailto:?subject=' + encodeURIComponent('For filing: ' + what + ' – ' + m.title) + '&body=' + encodeURIComponent(txt);
        window.__lastSend = url;
        if (w) w.location.href = url; else { const a = document.createElement('a'); a.href = url; if (k === 'sendwa') a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove(); }
      } catch (er) { if (w) w.close(); toast('Could not make the link: ' + er.message, 5000); }
      S2.busy = ''; draw();
    }
    else if (k === 'share' || k === 'sendfile') {
      const files = [new File([S2.done.blob], S2.done.name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })];
      if (S2.done.pdf) files.push(new File([S2.done.pdf], S2.done.pdfName, { type: 'application/pdf' }));
      if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: S2.done.name }); } catch (er) { if (er.name !== 'AbortError') toast('Could not share'); } }
      else { for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); } toast('Saved to Downloads. Attach it in WhatsApp Web or your email.', 5000); }
    }
    else if (k === 'dl') {
      for (const [b, n] of [[S2.done.blob, S2.done.name], ...(S2.done.pdf ? [[S2.done.pdf, S2.done.pdfName]] : [])]) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = n; document.body.appendChild(a); a.click(); a.remove(); }
      toast('Saved to Downloads');
    }
  }
  bind();
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="draft"]'); if (el) sheetDraft(find(el.dataset.id)); });

/* ---------- file cover: legal-size sheet to paste on the physical file ---------- */
async function makeCover(m) {
  const D = window.docx; if (!D) throw new Error('Word library still loading, try again');
  const FONT = 'Times New Roman', C = D.AlignmentType.CENTER, L = D.AlignmentType.LEFT;
  const run = (t, o = {}) => new D.TextRun({ text: String(t ?? ''), font: o.font || FONT, size: o.size || 22, bold: o.bold, color: o.color, allCaps: o.caps });
  const para = (kids, o = {}) => new D.Paragraph({ alignment: o.align || L, spacing: { before: o.before || 0, after: o.after ?? 40 }, border: o.border, children: Array.isArray(kids) ? kids : [kids] });
  const thin = { style: D.BorderStyle.SINGLE, size: 4, color: '7F7F7F' };
  const borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
  const cell = (t, o = {}) => new D.TableCell({ width: { size: o.w, type: D.WidthType.DXA }, shading: o.shade ? { fill: o.shade, type: D.ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 }, verticalAlign: D.VerticalAlign.CENTER,
    children: String(t ?? '').split('\n').map(line => para(run(line, { bold: o.bold, size: o.size || 21 }), { after: 0, align: o.align })) });
  const pt = parties(m), fo = (FORUMS[m.forum] || {}).label || '';
  const PROV = { '482': 'U/S 482 Cr.P.C.', '482/528': 'U/S 482 Cr.P.C. / 528 B.N.S.S.', '528 BNSS': 'U/S 528 B.N.S.S.', '138 NI': 'U/S 138 N.I. Act', '125': 'U/S 125 Cr.P.C.' };
  const prov = PROV[String(m.type || '').trim()] || m.type || '';
  const caseLine = [m.caseNo, prov].filter(Boolean).join('; ');
  const rows = [
    ['Matter ref.', mref(m)], ["Hon'ble Court", m.court || fo],
    ['Case', caseLine], ['CNR', m.cnr], ['Filing no.', m.filingNo],
    ['Crime / FIR', [m.crimeNo, m.sections ? 'u/s ' + m.sections : '', m.ps ? 'P.S. ' + m.ps : ''].filter(Boolean).join(', ')],
    ['Parties', pt.first + (pt.second ? '\nv.\n' + pt.second : '')], ['Appearing for', m.side], ['Allotted to', typeof allotName === 'function' && allotName(m) !== 'Self' ? allotName(m) : ''], ['Client(s)', typeof withDesc === 'function' ? withDesc(m.clients) : m.clients],
    ['Nature / Category', [m.nature, fo].filter(Boolean).join(' · ')],
  ].filter(r => r[1]);
  const contacts = [['Client mobile', m.phone], ['WhatsApp', m.whatsapp || (m.phone ? 'same as mobile' : '')], ['Alternate' + (m.altName ? ' (' + m.altName + ')' : ''), m.altPhone]].filter(r => r[1]);
  const W1 = 2700, W2 = 6660;
  const kv = list => new D.Table({ width: { size: W1 + W2, type: D.WidthType.DXA }, columnWidths: [W1, W2], borders,
    rows: list.map(([k, v]) => new D.TableRow({ children: [cell(k, { w: W1, bold: true, shade: 'EEF1F6' }), cell(v, { w: W2, size: 22 })] })) });
  const paper = paperOf('cover');
  const dateRows = Math.max(paper === 'A4' ? 8 : 14, (paper === 'A4' ? 30 : 38) - rows.length - contacts.length - (String(m.title || "").length > 70 ? 1 : 0));
  const DW = [1500, 5460, 1400, 1000];
  const dates = new D.Table({ width: { size: 9360, type: D.WidthType.DXA }, columnWidths: DW, borders,
    rows: [new D.TableRow({ tableHeader: true, children: ['Date', 'Proceedings', 'Next date', 'Item'].map((h, i) => cell(h, { w: DW[i], bold: true, shade: 'EEF1F6', align: C })) }),
      ...Array.from({ length: dateRows }, () => new D.TableRow({ height: { value: 400, rule: D.HeightRule.ATLEAST }, children: DW.map(w => cell('', { w })) }))] });
  const doc = new D.Document({ creator: 'Saurabh Misra', styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ properties: { page: pageFor(paper, 'Legal', { top: 720, bottom: 720, left: 1440, right: 1440 }) }, children: [
      para(run('SAURABH MISRA & ASSOCIATES', { bold: true, size: 32 }), { align: C, after: 0 }),
      para(run('CHAMBERS OF SAURABH MISRA, ADVOCATE', { size: 18, bold: true }), { align: C, after: 0 }),
      para(run(ADV.addr, { size: 18 }), { align: C, after: 0 }),
      para(run('Mobile ' + ADV.phone + '  ·  ' + ADV.email, { size: 18 }), { align: C, after: 120, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: '1B2A4A', space: 4 } } }),
      para(run('CASE FILE', { bold: true, size: 28 }), { align: C, before: 80, after: 120 }),
      kv(rows),
      ...(contacts.length ? [para(run('Contacts', { bold: true, size: 22 }), { before: 160, after: 60 }), kv(contacts)] : []),
      para(run('Dates', { bold: true, size: 22 }), { before: 160, after: 60 }),
      dates,
      para(run('Printed ' + dmy(todayIso()) + ' from SM Chambers – A Comprehensive Litigation Management Suite', { size: 14, color: '7F7F7F' }), { align: D.AlignmentType.RIGHT, before: 80 }),
    ] }] });
  const blob = await D.Packer.toBlob(doc);
  const name = cleanName('File cover ' + mref(m).replace(/\//g, '-') + ' ' + (m.title || m.clients || '').slice(0, 60) + ' (' + paper + ')') + '.docx';
  let itemId = '', parentId = '';
  if (m.folderId) { try { const it = await uploadFile(m.folderId, new File([blob], name), name); itemId = it.id; parentId = m.folderId; } catch (e) {} }
  return { blob, name, itemId, parentId, paper };
}
function sheetCover(m) {
  delete PAPER_NOW.cover;
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · file cover</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">Chamber header, case details, contacts and a ruled table for dates, on one page.</p>${paperSwitch('cover')}<button class="save" data-cv="make">Make file cover</button>`);
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-cv="make"]')) coverMake(m); };
}
async function coverMake(m) {
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · file cover</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div><p class="hint">Making the ${esc(paperOf('cover'))} cover…</p>`);
  let r; try { r = await makeCover(m); } catch (e) { closeSheet(); toast(e.message); return; }
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · file cover</small><h1>Ready to print</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">${esc(r.name)}${r.itemId ? ' · saved in the case folder' : ''}. ${r.paper === 'A4' ? 'A4 page (8.27 × 11.69 in)' : 'Legal-size page (8.5 × 14 in)'}: chamber header, case details, contacts and a ruled table for dates.</p>
    <div class="three"><button class="act primary" data-cv="open">Open in Word</button><button class="act blue" data-cv="pdf">PDF to print</button><button class="act blue" data-cv="share">Share</button></div>
    <button class="ghost" data-cv="dl" style="width:100%;margin-top:8px">Download</button>`);
  $('#sheet-root').onclick = async e => {
    const b = e.target.closest('[data-cv]'); if (!b) return;
    const a = b.dataset.cv;
    const dl = (blob, n) => { const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = n; document.body.appendChild(x); x.click(); x.remove(); };
    if (a === 'open') { if (r.itemId) { try { openNative(await getItem(r.itemId)); } catch (er) { dl(r.blob, r.name); } } else { dl(r.blob, r.name); toast('Downloaded; open it in Word to print'); } }
    else if (a === 'dl') { dl(r.blob, r.name); toast('Saved to Downloads'); }
    else if (a === 'pdf') {
      if (!r.itemId) return toast('PDF needs the matter folder linked; use Download and print from Word');
      b.textContent = 'Making PDF…';
      try { const p = await g('/me/drive/items/' + r.itemId + '/content?format=pdf'); if (!p.ok) throw new Error('OneDrive ' + p.status); const pb = await p.blob(); const u = URL.createObjectURL(pb); window.open(u, '_blank') || dl(pb, r.name.replace(/\.docx$/, '.pdf')); }
      catch (er) { toast('Could not make the PDF: ' + er.message); }
      b.textContent = 'PDF to print';
    }
    else if (a === 'share') { const f = new File([r.blob], r.name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: r.name }); } catch (er) {} } else { dl(r.blob, r.name); } }
  };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="cover"]'); if (el) { const m = find(el.dataset.id); if (m) sheetCover(m); } });
