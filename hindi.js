/* SM Chambers — Hindi screens (optional, per device). Translates the app's own labels on the main screens;
   matter details, names, drop-down values and every document made by the app stay as they are. */
'use strict';

const LANG_KEY = 'cd.lang';
const lang = () => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } };
const HI = {
  // tabs and headings
  'Today': 'आज', 'Calendar': 'कैलेंडर', 'Matters': 'मुकदमे', 'Clients': 'मुवक्किल', 'More': 'और', 'Fees': 'फीस', 'Limitation': 'परिसीमा',
  'Your day at a glance': 'आज का सार', 'Today in court': 'आज न्यायालय में', 'Cause list ↓': 'वाद सूची ↓', 'Deadlines': 'अंतिम तिथियाँ', 'Deadline': 'अंतिम तिथि',
  'Fees pending': 'बकाया फीस', 'Need a date': 'तिथि चाहिए', 'Date passed or blank': 'तिथि बीत गई या खाली', 'Pending matters': 'लंबित मुकदमे', 'Including reserved': 'सुरक्षित सहित',
  'Calculate last date': 'अंतिम तिथि निकालें', 'Appeal, revision, review, s.34, NI Act and more': 'अपील, निगरानी, पुनर्विलोकन, धारा 34, एनआई एक्ट आदि',
  'Limitation running': 'परिसीमा चल रही है', 'Tasks due': 'देय कार्य', 'All tasks': 'सभी कार्य', 'Retainers': 'रिटेनर',
  'Protect your chambers data': 'अपने चैंबर का डेटा सुरक्षित करें', 'Set a 4-digit PIN so nobody else can open client files, fees and bank details on this phone.': '4 अंकों का PIN लगाएँ, ताकि इस फ़ोन पर कोई और मुवक्किलों की फ़ाइलें, फीस और बैंक विवरण न खोल सके।',
  'Set PIN': 'PIN लगाएँ', 'Not now': 'अभी नहीं', 'Download backup': 'बैकअप डाउनलोड करें', 'Download the whole diary (Excel + data file) and keep it on a pen drive.': 'पूरी डायरी (Excel + डेटा फ़ाइल) डाउनलोड करके पेन ड्राइव में रखें।',
  'Monthly backup not taken yet': 'मासिक बैकअप अभी नहीं लिया गया',
  // filters
  'Pending': 'लंबित', 'Fees due': 'फीस बाकी', 'High Court': 'उच्च न्यायालय', 'District': 'जिला', 'Tribunals': 'अधिकरण', 'Consumer': 'उपभोक्ता', 'Revenue': 'राजस्व',
  'Advisory / Pre-litigation': 'परामर्श / मुकदमे से पूर्व', 'Decided / closed': 'निर्णीत / बंद', 'All': 'सभी', 'Categories': 'श्रेणियाँ', 'District courts': 'जिला न्यायालय',
  'Tribunal': 'अधिकरण', 'Consumer commission': 'उपभोक्ता आयोग', 'Family Court': 'परिवार न्यायालय', 'Revenue court': 'राजस्व न्यायालय', 'Duplicates': 'दोहराए गए',
  // matter page
  'Next date': 'अगली तिथि', 'No next date': 'अगली तिथि नहीं', 'Edit': 'संपादित करें', 'Draft': 'ड्राफ्ट', 'Client': 'मुवक्किल', 'Read order photo': 'आदेश की फ़ोटो पढ़ें', 'Send to Claude': 'Claude को भेजें',
  'Print file cover': 'फ़ाइल कवर छापें', 'Letters & notices': 'पत्र व नोटिस', 'Category': 'श्रेणी', 'Status': 'स्थिति', 'Result': 'परिणाम', 'Case folder': 'केस फ़ोल्डर',
  'Link existing folder': 'मौजूदा फ़ोल्डर जोड़ें', 'Create new folder': 'नया फ़ोल्डर बनाएँ', 'Photo': 'फ़ोटो', 'Add files': 'फ़ाइलें जोड़ें', 'Change link': 'लिंक बदलें', 'This folder is empty.': 'यह फ़ोल्डर खाली है।',
  'Details': 'विवरण', 'Matter ref.': 'मुकदमा संदर्भ', 'Set client code': 'मुवक्किल कोड लगाएँ', 'Client(s)': 'मुवक्किल', 'Type': 'प्रकार', 'Case no.': 'वाद संख्या', 'CNR': 'CNR', 'Filing no.': 'दाखिला संख्या',
  'Crime / FIR': 'अपराध / FIR', 'Police station': 'थाना', 'Sections': 'धाराएँ', 'Nature': 'प्रकृति', 'Appearing for': 'की ओर से', 'Last date': 'पिछली तिथि', 'Item': 'क्रमांक', 'Notes': 'टिप्पणी',
  'Client mobile': 'मुवक्किल का मोबाइल', 'WhatsApp': 'WhatsApp', 'Mark done': 'पूर्ण करें', 'Fees & payments': 'फीस व भुगतान', 'Add expense': 'खर्च जोड़ें',
  'Tasks': 'कार्य', '+ Give a task': '+ कार्य दें', 'No task on this matter.': 'इस मुकदमे में कोई कार्य नहीं।', 'Authorities': 'नज़ीरें', '+ From my library': '+ मेरी लाइब्रेरी से',
  'Pick judgments from your own library to rely on in this matter.': 'इस मुकदमे के लिए अपनी लाइब्रेरी से निर्णय चुनें।', 'Hearing history': 'सुनवाई का इतिहास', 'Record of changes': 'बदलावों का रिकॉर्ड',
  'Adjourned': 'स्थगित', 'Evidence recorded': 'साक्ष्य दर्ज', 'Heard': 'सुना गया', 'Reserved': 'सुरक्षित', 'Disposed': 'निस्तारित', 'Not taken up': 'सुनवाई नहीं हुई',
  'Convert to case': 'मुकदमे में बदलें', '+ Add': '+ जोड़ें', 'Mark filed / done': 'दाखिल / पूर्ण करें', 'Not pursuing': 'नहीं करना', 'Work it out': 'निकालें', 'Not needed': 'आवश्यक नहीं',
  'Done': 'पूर्ण', 'Remove': 'हटाएँ', 'Open': 'खोलें', 'Copy': 'कॉपी',
  // next date sheet
  'Speak the date': 'तिथि बोलें', 'Pick': 'चुनें', 'date': 'तिथि', 'Fixed for': 'किस हेतु नियत', 'Hearing': 'सुनवाई', 'Admission': 'अंगीकरण', 'Evidence': 'साक्ष्य', 'Cross-examination': 'जिरह',
  'Arguments': 'बहस', 'Orders': 'आदेश', 'Reply / Objection': 'जवाब / आपत्ति', 'Framing of charge': 'आरोप विरचन', '313 statement': '313 बयान', 'Judgment': 'निर्णय',
  'NOTE (TYPE OR SPEAK)': 'टिप्पणी (लिखें या बोलें)', 'Tell client on WhatsApp': 'मुवक्किल को WhatsApp पर बताएँ', 'Remind me the evening before (Outlook)': 'एक शाम पहले याद दिलाएँ (Outlook)', 'Save': 'सहेजें',
  // edit form
  'Year (for numbering)': 'वर्ष (क्रमांक हेतु)', 'Forum': 'फ़ोरम', 'Client name(s)': 'मुवक्किल का नाम', 'Parties (title)': 'पक्षकार (शीर्षक)', 'Court': 'न्यायालय', 'CNR no.': 'CNR संख्या',
  'Client code (letters)': 'मुवक्किल कोड (पत्र)', 'Crime / FIR no.': 'अपराध / FIR संख्या', 'Under section(s)': 'धारा', 'Decided — result': 'निर्णीत — परिणाम', 'Item no.': 'क्रमांक',
  'Deadline for': 'किस हेतु अंतिम तिथि', 'WhatsApp no. (if different)': 'WhatsApp नंबर (यदि अलग हो)', 'Alternate contact – name': 'वैकल्पिक संपर्क – नाम', 'Alternate mobile': 'वैकल्पिक मोबाइल',
  'Save changes': 'बदलाव सहेजें', 'Remove from diary': 'डायरी से हटाएँ', 'Add matter': 'मुकदमा जोड़ें', 'Add a matter': 'मुकदमा जोड़ें', 'New matter': 'नया मुकदमा',
  'Fees agreed (₹)': 'तय फीस (₹)', 'Fees received (₹)': 'प्राप्त फीस (₹)',
  // more menu
  'Practice dashboard': 'प्रैक्टिस डैशबोर्ड', 'matters, results, income': 'मुकदमे, परिणाम, आय', 'Signed in as': 'साइन इन', 'Saved in': 'सहेजा गया', 'Version': 'संस्करण', 'dues and payments': 'बकाया और भुगतान', 'Cause list in Word': 'Word में वाद सूची', 'on your letterhead': 'आपके लेटरहेड पर',
  'App lock': 'ऐप लॉक', 'set a PIN': 'PIN लगाएँ', 'Download full backup': 'पूरा बैकअप डाउनलोड करें', 'Excel + data file, for a pen drive': 'Excel + डेटा फ़ाइल, पेन ड्राइव हेतु',
  'Juniors & tasks': 'जूनियर व कार्य', 'open tasks, your juniors': 'खुले कार्य, आपके जूनियर', 'Judgment library': 'निर्णय लाइब्रेरी', 'your own judgments, searchable': 'आपके अपने निर्णय, खोज योग्य',
  'My templates': 'मेरे टेम्पलेट', 'made from your past drafts': 'आपके पुराने ड्राफ्ट से बने', 'Conflict check': 'हित-विरोध जाँच', 'before taking a new matter': 'नया मुकदमा लेने से पहले',
  'Paper size': 'कागज़ का आकार', 'A4 or Legal for each kind of document': 'हर दस्तावेज़ के लिए A4 या Legal', 'Limitation calculator': 'परिसीमा गणक', 'last date to file': 'दाखिल करने की अंतिम तिथि',
  'Apply diary update from Claude': 'Claude से आया डायरी अपडेट लगाएँ', 'pick the diary-update file you downloaded': 'डाउनलोड की गई डायरी-अपडेट फ़ाइल चुनें', 'Order reading': 'आदेश पढ़ना', 'add your API key': 'अपनी API key जोड़ें',
  'Sort old folders': 'पुराने फ़ोल्डर व्यवस्थित करें', 'moves from the Folder Sorting Sheet': 'फ़ोल्डर सॉर्टिंग शीट से', 'Sync now': 'अभी सिंक करें', 'Open Case Diary folder in OneDrive': 'OneDrive में Case Diary फ़ोल्डर खोलें',
  'diary file, Excel copy, backups': 'डायरी फ़ाइल, Excel प्रति, बैकअप', 'Open Excel copy': 'Excel प्रति खोलें', 'refreshed after every save': 'हर बार सहेजने पर ताज़ा', 'Install on this device': 'इस डिवाइस पर इंस्टॉल करें',
  'home-screen app': 'होम-स्क्रीन ऐप', 'Sign out': 'साइन आउट', 'Language': 'भाषा',
  // fees tab
  'Received this month': 'इस माह प्राप्त', 'All matters with fees': 'फीस वाले सभी मुकदमे', 'By matter': 'मुकदमेवार', 'Recent payments': 'हाल के भुगतान', '+ Payment': '+ भुगतान',
  'Dues by age': 'बकाया अवधिवार', 'CA register': 'CA रजिस्टर', 'Juniors': 'जूनियर', 'Paid': 'चुकता',
  // sync and lock
  'Not synced · tap to retry': 'सिंक नहीं हुआ · फिर से छुएँ', 'Enter your PIN': 'अपना PIN डालें', 'Forgot PIN?': 'PIN भूल गए?', 'Wrong PIN': 'गलत PIN',
  // weekdays and months (calendar)
  'Nothing listed for this day.': 'इस दिन कुछ सूचीबद्ध नहीं।', 'None this week': 'इस सप्ताह कोई नहीं', 'Not linked yet. Link this matter to its folder in': 'अभी जुड़ा नहीं। इस मुकदमे को इसके फ़ोल्डर से जोड़ें:',
  ', or create a new folder for it.': ', या इसके लिए नया फ़ोल्डर बनाएँ।', 'Saved into:': 'यहाँ सहेजा:', 'No hearings recorded yet. Use': 'अभी कोई सुनवाई दर्ज नहीं। हर सुनवाई के बाद', 'after each hearing.': 'का प्रयोग करें।',
  'PC path': 'PC पथ', 'Synced': 'सिंक हुआ', 'Fees agreed': 'तय फीस', 'Fees received': 'प्राप्त फीस', 'Generate bill': 'बिल बनाएँ', 'Generate receipt': 'रसीद बनाएँ', 'Bills': 'बिल', 'Receipts': 'रसीदें',
  'Agreed': 'तय', 'Received': 'प्राप्त', 'Balance': 'शेष',
  'Draft with Claude': 'Claude से ड्राफ्ट', 'Research': 'शोध', 'Share with client — WhatsApp · Email · SMS': 'मुवक्किल को भेजें — WhatsApp · Email · SMS', 'Share…': 'भेजें…', 'Matter update': 'मुकदमे की जानकारी', 'Document': 'दस्तावेज़', 'Fee reminder': 'फीस अनुस्मारक', 'Contact card': 'संपर्क कार्ड', 'Email': 'ईमेल',
  'Sun': 'रवि', 'Mon': 'सोम', 'Tue': 'मंगल', 'Wed': 'बुध', 'Thu': 'गुरु', 'Fri': 'शुक्र', 'Sat': 'शनि',
};
const HI_PH = { 'Case no., FIR, party, client': 'वाद संख्या, FIR, पक्षकार, मुवक्किल', 'Search matters': 'मुकदमे खोजें', 'Search clients': 'मुवक्किल खोजें', 'Or type, e.g. Cross of PW2': 'या लिखें, जैसे PW2 की जिरह' };
const DAYS_HI = { Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार' };
const MON_HI = { January: 'जनवरी', February: 'फ़रवरी', March: 'मार्च', April: 'अप्रैल', May: 'मई', June: 'जून', July: 'जुलाई', August: 'अगस्त', September: 'सितंबर', October: 'अक्टूबर', November: 'नवंबर', December: 'दिसंबर' };
const MON3 = Object.fromEntries(Object.entries(MON_HI).map(([k, v]) => [k.slice(0, 3), v]));
const plural = (n, one, many) => n + ' ' + (n == 1 ? one : many);
const HI_RULES = [
  [/^Good (morning|afternoon|evening), (.+)$/, (m, t, n) => ({ morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' })[t] + ', ' + n],
  [/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (\d{1,2}) (\w+)$/, (m, d, n, mo) => DAYS_HI[d] + ', ' + n + ' ' + (MON_HI[mo] || mo)],
  [/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), ([\d.]+)$/, (m, d, x) => DAYS_HI[d] + ', ' + x],
  [/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/, (m, mo, y) => MON_HI[mo] + ' ' + y],
  [/^(\d+) (case|cases)$/, (m, n) => n + ' मुकदमा'],
  [/^(\d+) (matter|matters)$/, (m, n) => n + ' मुकदमे'],
  [/^(\d+) (client|clients)$/, (m, n) => n + ' मुवक्किल'],
  [/^(\d+) pending · (\d+) closed(.*)$/, (m, a, b, rest) => a + ' लंबित · ' + b + ' बंद' + rest.replace(' · next ', ' · अगली ')],
  [/^for (.+)$/, (m, x) => (HI[x] || x) + ' हेतु'],
  [/^For: (.+)$/, (m, x) => 'हेतु: ' + (HI[x] || x)],
  [/^What happened on (.+)\?$/, (m, d) => d + ' को क्या हुआ?'],
  [/^(.+) pending$/, (m, x) => /₹/.test(x) ? x + ' बाकी' : null],
  [/^(₹[\d,]+) of (₹[\d,]+) received$/, (m, a, b) => b + ' में से ' + a + ' प्राप्त'],
  [/^(\d+) days left$/, (m, n) => n + ' दिन शेष'],
  [/^\. (₹[\d,]+) in fees is pending\.$/, (m, a) => '। ' + a + ' फीस बाकी है।'],
  [/^Court over\? Enter next dates for all (\d+)$/, (m, n) => 'न्यायालय समाप्त? सभी ' + n + ' की अगली तिथि भरें'],
  [/^today or overdue$/, () => 'आज या बीती हुई'],
  [/^No matters listed today\.(.*)$/, (m, rest) => 'आज कोई मुकदमा सूचीबद्ध नहीं।' + rest.replace(/ (₹[\d,]+) in fees is pending\./, ' $1 फीस बाकी है।')],
  [/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), ([\d.]+)$/, (m, d, x) => HI[d] + ', ' + x],
  [/^Synced (.+)$/, (m, t) => 'सिंक हुआ ' + t],
  [/^(\d+) change(s)? waiting to sync$/, (m, n) => n + ' बदलाव सिंक होना बाकी'],
  [/^\+1 week$/, () => '+1 सप्ताह'], [/^\+2 weeks$/, () => '+2 सप्ताह'], [/^\+1 month$/, () => '+1 माह'],
  [/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, (m, d, mo) => d + ' ' + MON3[mo]],
  [/^(.+) · (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, (m, x, d, mo) => (HI[x] || x) + ' · ' + d + ' ' + MON3[mo]],
  [/^Edit (\d{4}\/\d+)$/, (m, n) => n + ' संपादित करें'],
];
const SKIP = 'option,script,style,textarea,input,select,[contenteditable],.m-title,.notr,#lock .lock-title';
function hiText(t) {
  const k = t.trim(); if (!k) return null;
  if (HI[k]) return t.replace(k, HI[k]);
  for (const [rx, fn] of HI_RULES) { const mm = k.match(rx); if (mm) { const v = fn(...mm); if (v) return t.replace(k, v); } }
  return null;
}
function translateTree(root) {
  if (lang() !== 'hi' || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const todo = [];
  while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest(SKIP)) continue; const v = hiText(n.nodeValue); if (v !== null && v !== n.nodeValue) todo.push([n, v]); }
  todo.forEach(([node, v]) => { node.nodeValue = v; });
  (root.querySelectorAll ? root.querySelectorAll('[placeholder]') : []).forEach(el => { const h = HI_PH[el.placeholder]; if (h) el.placeholder = h; });
}
let hiObs = null;
function startHindi() {
  if (hiObs) hiObs.disconnect();
  if (lang() !== 'hi') return;
  document.documentElement.lang = 'hi';
  translateTree(document.body);
  hiObs = new MutationObserver(ms => { hiObs.disconnect(); for (const m of ms) m.addedNodes.forEach(nd => { if (nd.nodeType === 1) translateTree(nd); else if (nd.nodeType === 3 && nd.parentElement && !nd.parentElement.closest(SKIP)) { const v = hiText(nd.nodeValue); if (v) nd.nodeValue = v; } }); hiObs.observe(document.body, { childList: true, subtree: true }); });
  hiObs.observe(document.body, { childList: true, subtree: true });
}
function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} if (l === 'en') { if (hiObs) hiObs.disconnect(); hiObs = null; document.documentElement.lang = 'en'; render(); } else { render(); startHindi(); } }
function langSwitch() { const l = lang(); return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><b>Language / भाषा</b><div class="seg"><button type="button" class="${l === 'en' ? 'on' : ''}" data-lang="en">English</button><button type="button" class="${l === 'hi' ? 'on' : ''}" data-lang="hi">हिन्दी</button></div></div>`; }
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startHindi); else setTimeout(startHindi, 0);
