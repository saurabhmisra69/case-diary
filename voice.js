/* Case Diary — speak the next date.
   Uses the phone's own speech recognition (free; no API key). Nothing is saved until the
   advocate checks the filled Next-date sheet and taps Save.
   Examples: "Ritz Pathak, 15 November, cross examination, item 12"
             "Baghel 45435 next date 2 December for evidence"
             "Shikhar adjourned to 18th November"            */
'use strict';

const MONTH_WORDS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  'जनवरी': 1, 'फरवरी': 2, 'मार्च': 3, 'अप्रैल': 4, 'मई': 5, 'जून': 6, 'जुलाई': 7, 'अगस्त': 8, 'सितंबर': 9, 'सितम्बर': 9, 'अक्टूबर': 10, 'नवंबर': 11, 'नवम्बर': 11, 'दिसंबर': 12, 'दिसम्बर': 12 };
const NUM_WORDS = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, fourth: 4, five: 5, fifth: 5, six: 6, sixth: 6, seven: 7, seventh: 7, eight: 8, eighth: 8, nine: 9, ninth: 9, ten: 10, tenth: 10,
  eleven: 11, eleventh: 11, twelve: 12, twelfth: 12, thirteen: 13, thirteenth: 13, fourteen: 14, fourteenth: 14, fifteen: 15, fifteenth: 15, sixteen: 16, sixteenth: 16, seventeen: 17, seventeenth: 17,
  eighteen: 18, eighteenth: 18, nineteen: 19, nineteenth: 19, twenty: 20, twentieth: 20, thirty: 30, thirtieth: 30 };
const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const PURPOSE_WORDS = [[/cross/i, 'Cross-examination'], [/evidence|gawahi|गवाही|साक्ष्य/i, 'Evidence'], [/argument|bahas|बहस/i, 'Arguments'], [/admission/i, 'Admission'], [/order|आदेश/i, 'Orders'],
  [/reply|objection|counter|जवाब|आपत्ति/i, 'Reply / Objection'], [/charge/i, 'Framing of charge'], [/313/, '313 statement'], [/judg(e)?ment|फैसला|निर्णय/i, 'Judgment'], [/hearing|सुनवाई/i, 'Hearing']];

function wordsToDigits(t) {
  // "twenty five" -> 25, "fifteenth" -> 15
  return t.replace(/\b(twenty|thirty)[\s-]+(one|first|two|second|three|third|four|fourth|five|fifth|six|sixth|seven|seventh|eight|eighth|nine|ninth)\b/gi, (a, b, c) => String(NUM_WORDS[b.toLowerCase()] + NUM_WORDS[c.toLowerCase()]))
    .replace(/\b[a-z]+\b/gi, w => NUM_WORDS[w.toLowerCase()] != null && !/^(one|first|second)$/i.test(w) ? String(NUM_WORDS[w.toLowerCase()]) : w);
}
function futureIso(d, mo, y) {
  const t = todayIso(); let yy = y ? (+y < 100 ? 2000 + +y : +y) : +t.slice(0, 4);
  let iso = isoOf(d, mo, yy);
  if (iso && !y && iso <= t) iso = isoOf(d, mo, yy + 1);
  return iso;
}
function parseSpokenDate(raw) {
  const t = wordsToDigits(raw.toLowerCase()).replace(/(\d)(st|nd|rd|th)\b/g, '$1');
  let m;
  // 15 november (2026) / november 15
  const mon = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join('|');
  if ((m = new RegExp('(\\d{1,2})\\s*(?:of\\s+)?(' + mon + ')\\.?(?:\\s*,?\\s*(\\d{4}))?', 'i').exec(t))) return { iso: futureIso(m[1], MONTH_WORDS[m[2].toLowerCase()], m[3]), at: m.index, len: m[0].length };
  if ((m = new RegExp('(' + mon + ')\\.?\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?', 'i').exec(t))) return { iso: futureIso(m[2], MONTH_WORDS[m[1].toLowerCase()], m[3]), at: m.index, len: m[0].length };
  // 15/11, 15-11-26, 15.11.2026
  if ((m = /\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{2,4}))?\b/.exec(t))) return { iso: futureIso(m[1], m[2], m[3]), at: m.index, len: m[0].length };
  // next monday / coming friday
  if ((m = /\b(?:next|coming|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(t))) {
    const want = WEEKDAYS[m[1].toLowerCase()]; let d = addDays(todayIso(), 1);
    while (parseIso(d).getDay() !== want) d = addDays(d, 1);
    return { iso: d, at: m.index, len: m[0].length };
  }
  // after two weeks / in 1 month / one week
  if ((m = /\b(?:after|in)?\s*(\d{1,2})\s*(week|weeks|month|months|day|days)\b/i.exec(t))) {
    const n = +m[1], u = m[2].toLowerCase(); const base = todayIso();
    return { iso: skipSunday(u.startsWith('month') ? addMonths(base, n) : addDays(base, u.startsWith('week') ? n * 7 : n)), at: m.index, len: m[0].length };
  }
  if (/\btomorrow\b|\bkal\b|कल/.test(t)) return { iso: addDays(todayIso(), 1), at: 0, len: 0 };
  return null;
}
function parseSpoken(raw) {
  const out = { text: raw, next: '', purpose: '', item: '', happened: '', rest: raw };
  const d = parseSpokenDate(raw); if (d && d.iso) out.next = d.iso;
  for (const [re, p] of PURPOSE_WORDS) if (re.test(raw)) { out.purpose = p; break; }
  const fm = /\bfor\s+([a-z0-9 \-]{3,40})$/i.exec(raw.trim()); if (fm && !out.purpose) out.purpose = fm[1].trim().replace(/^\w/, c => c.toUpperCase());
  const im = /\b(?:item|serial|सीरियल|क्रम)\s*(?:no\.?|number)?\s*(\d{1,4})\b/i.exec(wordsToDigits(raw)); if (im) out.item = im[1];
  if (/reserved|सुरक्षित/i.test(raw)) out.happened = 'Reserved';
  else if (/dispos|decided|निस्तारित/i.test(raw)) out.happened = 'Disposed';
  else if (/not taken up|no sitting|not reached|हड़ताल|strike|holiday/i.test(raw)) out.happened = 'Not taken up';
  else if (/evidence recorded/i.test(raw)) out.happened = 'Evidence recorded';
  return out;
}

/* which matter did he mean? score words and numbers against open matters */
function guessMatters(raw) {
  const t = wordsToDigits(raw.toLowerCase());
  const stop = /^(next|date|for|the|and|of|to|on|item|in|matter|case|no|number|adjourned|fixed|court|hearing|evidence|cross|examination|arguments|orders?|reply|objection|november|december|january|february|march|april|may|june|july|august|september|october|tomorrow|after|weeks?|months?|days?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|state|up|vs?|versus|ji|sahab|wala|vala)$/;
  const words = t.split(/[^a-z0-9ऀ-ॿ]+/).filter(w => w.length > 2 && !stop.test(w));
  const nums = (t.match(/\d{3,6}/g) || []);
  const scored = live().filter(isOpen).map(m => {
    const hay = ((m.title || '') + ' ' + (m.clients || '') + ' ' + (m.court || '') + ' ' + (m.type || '')).toLowerCase();
    const caseNos = ((m.caseNo || '') + ' ' + (m.crimeNo || '')).match(/\d{3,6}/g) || [];
    let s = 0;
    for (const w of words) { if (new RegExp('\\b' + w).test(hay)) s += 2; else if (w.length > 4 && hay.includes(w.slice(0, 4))) s += 1; }
    for (const n of nums) if (caseNos.includes(n)) s += 5;
    return { m, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s || (a.m.nextDate || '9').localeCompare(b.m.nextDate || '9'));
  return scored;
}

function listen(lang) {
  return new Promise((ok, bad) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return bad(new Error('Speech is not available in this browser. Use Chrome on your phone.'));
    const r = new SR(); r.lang = lang || 'en-IN'; r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = e => ok([...e.results[0]].map(a => a.transcript));
    r.onerror = e => bad(new Error(e.error === 'not-allowed' ? 'Microphone permission is off for this app' : 'Could not hear clearly. Please try again.'));
    r.onend = () => setTimeout(() => bad(new Error('Nothing heard')), 50);
    r.start();
  });
}

function voiceSheet(state) {
  openSheet(`<div class="s-head"><div><small>Speak the next date</small><h1>${state.listening ? 'Listening…' : 'Say it like this'}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint" style="margin:0 0 12px">"<b>Ritz Pathak, 15 November, cross examination, item 12</b>"<br>"<b>Baghel 45435, next date 2 December for evidence</b>"<br>"<b>Shikhar adjourned to next Monday</b>"</p>
    ${state.heard ? `<div class="picked"><b>Heard: “${esc(state.heard)}”</b><span>${state.msg ? esc(state.msg) : ''}</span></div>` : ''}
    ${state.choices && state.choices.length ? `<span class="lbl" style="margin-top:12px;display:block">Which matter?</span><div class="list">${state.choices.map(x => `<button class="card row" data-vo="pick" data-id="${x.m.id}" style="box-shadow:none;border:1px solid var(--line)"><div class="item sm" style="background:${forumOf(x.m).c}"><small>NO.</small><b>${esc(x.m.no)}</b></div><span class="m-col"><span class="m-title">${esc(x.m.title || x.m.clients)}</span><span class="m-meta">${esc([x.m.court, x.m.caseNo].filter(Boolean).join(' · '))}</span></span><span></span></button>`).join('')}</div>` : ''}
    <div class="two" style="margin-top:12px"><button class="save" data-vo="again" ${state.listening ? 'disabled' : ''}>${I.mic} ${state.heard ? 'Speak again' : 'Start'}</button><button class="ghost" data-vo="hindi">${state.lang === 'hi-IN' ? 'English' : 'हिन्दी'}</button></div>`);
}

async function voiceNextDate(forMatter) {
  const st = { listening: false, heard: '', msg: '', choices: [], lang: 'en-IN', parsed: null };
  const root = $('#sheet-root');
  const go = (m, p) => {
    root.onclick = null;
    const pre = {};
    if (p.next) pre.next = p.next;
    if (p.purpose) pre.purpose = p.purpose;
    if (p.item) pre.item = p.item;
    if (p.happened) pre.happened = p.happened;
    pre.note = '';
    sheetRecord(m, pre);
    toast(p.next ? 'Check and tap Save · ' + dmy(p.next) : 'Date not caught. Pick it below.', 3500);
  };
  const run = async () => {
    st.listening = true; st.msg = ''; st.choices = []; voiceSheet(st);
    let alts;
    try { alts = await listen(st.lang); } catch (e) { st.listening = false; st.msg = e.message; voiceSheet(st); return; }
    st.listening = false; st.heard = alts[0];
    // the alternative that yields a date wins
    let p = null; for (const a of alts) { const q = parseSpoken(a); if (q.next) { p = q; st.heard = a; break; } }
    p = p || parseSpoken(alts[0]); st.parsed = p;
    if (forMatter) return go(forMatter, p);
    const g = guessMatters(alts.join(' '));
    if (g.length === 1 || (g.length > 1 && g[0].s >= g[1].s + 3)) return go(g[0].m, p);
    st.choices = g.slice(0, 6);
    st.msg = (p.next ? 'Date: ' + dmy(p.next) + (p.purpose ? ' · ' + p.purpose : '') + '. ' : 'No date caught. ') + (g.length ? 'Tap the matter.' : 'No matter matched. Say a party name or case number.');
    voiceSheet(st);
  };
  voiceSheet(st);
  root.onclick = e => {
    const el = e.target.closest('[data-vo]'); if (!el) return;
    const a = el.dataset.vo;
    if (a === 'again') run();
    else if (a === 'hindi') { st.lang = st.lang === 'hi-IN' ? 'en-IN' : 'hi-IN'; voiceSheet(st); }
    else if (a === 'pick') { const m = find(el.dataset.id); if (m) go(m, st.parsed || {}); }
  };
  run();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="voice"]'); if (!el) return;
  voiceNextDate(el.dataset.id ? find(el.dataset.id) : null);
});
