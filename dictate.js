/* SM Chambers — Speak & Apply.
   Speak in English, Hindi or a mix. What you say is first written into a box (you can correct it by typing).
   "Apply" finds the matter (case no., crime / FIR no. or party name) and fills: what happened, next date (or Unlisted),
   fixed for, item no., fee paid (date fee / professional fee) and the note. Nothing is saved until you press Save.
   Speech uses the phone's / browser's own recogniser (free, no API key). */
'use strict';

/* ---------- numbers: Devanagari digits, Hindi and English number words ---------- */
const HI_NUM = { 'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'छे': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'पन्द्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25, 'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाईस': 28, 'अठ्ठाईस': 28, 'उनतीस': 29, 'तीस': 30, 'इकतीस': 31,
  'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, das: 10, bees: 20, pachas: 50 };
const HI_MULT = { 'सौ': 100, hundred: 100, sau: 100, 'हज़ार': 1000, 'हजार': 1000, thousand: 1000, hazar: 1000, hajar: 1000, 'लाख': 100000, lakh: 100000, lac: 100000 };
function dcNumbers(text) {
  let t = String(text).replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
  t = t.replace(/(\d),(\d{3})\b/g, '$1$2').replace(/([,;!?।])/g, ' $1 ').replace(/\.(\s|$)/g, ' . ');
  const w = t.split(/\s+/).filter(Boolean), out = [];
  const val = x => /^\d+$/.test(x) ? +x : HI_NUM[x.toLowerCase()];
  const mul = x => HI_MULT[x.toLowerCase()];
  const isNum = (x, nxt) => {
    const l = x.toLowerCase();
    if (/^(do|das|ek|char|teen|panch|bees|pachas)$/.test(l)) return mul(nxt || '') != null;   // ordinary words unless "do sau", "ek hazar"
    return /^\d+$/.test(x) || HI_NUM[l] != null || mul(x) != null;
  };
  let run = null;
  const flush = () => { if (run) { out.push(run.n === 1 && run.raw ? run.raw : String(run.total + run.cur)); run = null; } };
  for (let i = 0; i < w.length; i++) {
    const x = w[i];
    if (!isNum(x, w[i + 1])) { flush(); out.push(x); continue; }
    const m = mul(x), v = m == null ? val(x) : null;
    if (run) {   // does this word continue the number? "दो हजार पांच सौ", "twenty five", "2 हजार 500"
      const ok = m != null || mul(run.last) != null || (run.lastV >= 20 && run.lastV % 10 === 0 && v < 10);
      if (!ok) flush();
    }
    run = run || { total: 0, cur: 0, n: 0, raw: x };
    run.n++; if (run.n > 1) run.raw = '';
    if (m != null) { if (m >= 1000) { run.total += (run.cur || 1) * m; run.cur = 0; } else run.cur = (run.cur || 1) * m; }
    else run.cur += v;
    run.last = x; run.lastV = v;
  }
  flush();
  return out.join(' ');
}

/* ---------- reading what was said ---------- */
const HI_WEEK = { 'रविवार': 0, 'इतवार': 0, 'सोमवार': 1, 'मंगलवार': 2, 'बुधवार': 3, 'गुरुवार': 4, 'बृहस्पतिवार': 4, 'वीरवार': 4, 'शुक्रवार': 5, 'शनिवार': 6 };
const NEXT_KEY = /(next\s*date|next\s*hearing|adjourned\s*to|fixed\s*(?:for|on)|listed\s*on|अगली\s*(?:तारीख|तारीख़|डेट|तिथि|सुनवाई|पेशी)|अगली|agli\s*(?:tarikh|tareekh|date)|तारीख\s*(?:लगी|पड़ी|मिली|दी)|तारीख़\s*(?:लगी|पड़ी|मिली|दी))/i;
const CASE_RE = /(case|केस|crime|क्राइम|f\.?\s?i\.?\s?r|एफ\s?आई\s?आर|एफआईआर|अपराध|मुकदमा|मुक़दमा|मुकदमे|वाद|writ|रिट|bail|जमानत|ज़मानत|complaint|परिवाद|revision|रिवीजन|appeal|अपील|petition|याचिका)\s*(?:no\.?|number|नंबर|नम्बर|संख्या|सं\.?|क्रमांक)?\s*[:\-]?\s*(\d{1,6})(?:\s*(?:\/|of|सन्?|साल|ऑफ|बटा|by|का|की)\s*(\d{2,4}))?/gi;
const AMT_RE = /(?:rs\.?|₹|rupees?|rupaye|rupay|rupaiye|rupiya|रुपए|रुपये|रूपए|रूपये|रुपया|रु\.?)\s*(\d+)|(\d+)\s*(?:\/-|rs\b\.?|₹|rupees?|rupaye|rupay|rupaiye|rupiya|रुपए|रुपये|रूपए|रूपये|रुपया|रु\b\.?|का|की)/i;

function dcDateIn(seg) {
  const t = dcNumbers(seg).toLowerCase();
  let m;
  // Hindi weekday, परसों, कल
  for (const [w, n] of Object.entries(HI_WEEK)) if (t.includes(w)) { let d = addDays(todayIso(), 1); while (parseIso(d).getDay() !== n) d = addDays(d, 1); return d; }
  if (/परसों|parson/.test(t)) return addDays(todayIso(), 2);
  // "2 हफ्ते बाद", "1 महीने बाद", "10 दिन बाद"
  if ((m = /(\d{1,2})\s*(हफ्ते|हफ़्ते|हफ्ता|सप्ताह|महीने|महीना|माह|दिन|week|weeks|month|months|day|days)\s*(?:के\s*)?(?:बाद|later)/.exec(t))) {
    const n = +m[1], u = m[2]; const b = todayIso();
    return skipSunday(/महीन|माह|month/.test(u) ? addMonths(b, n) : addDays(b, /हफ|सप्ताह|week/.test(u) ? n * 7 : n));
  }
  // English / Hindi month names, numeric dates, weekdays, "after 2 weeks" (existing reader)
  const p = parseSpokenDate(t);
  if (p && p.iso) return p.iso;
  // "15 तारीख" / "15 tarikh": that day this month, or next month if it has passed
  if ((m = /\b(\d{1,2})\s*(?:तारीख़?|tarikh|tareekh|tarik)\b/.exec(t)) || (m = /(\d{1,2})\s*(?:तारीख़?)/.exec(t))) {
    const d = +m[1], now = parseIso(todayIso()); let y = now.getFullYear(), mo = now.getMonth() + 1;
    let iso = isoOf(d, mo, y); if (!iso || iso <= todayIso()) { mo++; if (mo > 12) { mo = 1; y++; } iso = isoOf(d, mo, y); }
    return iso || '';
  }
  return '';
}
function dcParse(raw) {
  const out = { refs: [], next: '', unlisted: false, happened: '', purpose: '', item: '', fee: 0, feeKind: '', note: raw.trim() };
  const t = dcNumbers(raw);
  let m; CASE_RE.lastIndex = 0;
  while ((m = CASE_RE.exec(t))) out.refs.push({ kind: /crime|क्राइम|f\.?\s?i|एफ|अपराध/i.test(m[1]) ? 'crime' : 'case', n: m[2], y: m[3] || '' });
  // take case numbers and amounts out before looking for dates
  let rest = t.replace(CASE_RE, ' ');
  const am = AMT_RE.exec(rest) || /(?:fee|fees|फीस|फ़ीस)\D{0,18}?(\d{2,6})|(\d{2,6})\s*(?:की|का)?\s*(?:date\s*|डेट\s*|तारीख़?\s*(?:की\s*)?)?(?:fee|fees|फीस|फ़ीस)/i.exec(rest);
  const feeWords = /fee|fees|फीस|फ़ीस|paid|pay|दिए|दिये|दी\b|दिया|जमा|मिले|मिला|received|प्राप्त/i;
  if (am && feeWords.test(rest)) {
    out.fee = +(am[1] || am[2]) || 0;
    out.feeKind = /date\s*fee|date\s*fees|डेट\s*फ़?ीस|तारीख़?\s*(?:की\s*)?फ़?ीस|पेशी|appearance/i.test(rest) ? 'date' : 'prof';
    rest = rest.replace(am[0], ' ');
  }
  // next date: look after the "next date" words first, then anywhere
  const k = NEXT_KEY.exec(rest);
  out.next = (k && dcDateIn(rest.slice(k.index))) || dcDateIn(rest);
  if (out.next && out.next <= todayIso()) out.next = '';
  if (/unlisted|अनलिस्टेड|तारीख\s*(?:पता\s*)?नहीं|date\s*(?:not\s*known|unknown|not\s*given)|तारीख\s*नहीं\s*(?:मिली|लगी|दी)/i.test(t)) { out.unlisted = !out.next; }
  // what happened
  if (/reserved|सुरक्षित|judgment\s*reserved|फैसला\s*सुरक्षित/i.test(t)) out.happened = 'Reserved';
  else if (/dispos|decided|निस्तारित|निस्तारण|खारिज|dismissed|allowed|स्वीकार\s*(?:हो|कर)|withdrawn|वापस\s*ले/i.test(t)) out.happened = 'Disposed';
  else if (/not\s*taken\s*up|no\s*sitting|not\s*reached|नहीं\s*लगा|नहीं\s*पहुं?चा|हड़ताल|हडताल|strike|holiday|अवकाश|छुट्टी|जज\s*साहब\s*(?:नहीं|छुट्टी)|leave/i.test(t)) out.happened = 'Not taken up';
  else if (/evidence\s*recorded|बयान\s*(?:हुए|हुआ|दर्ज)|गवाही\s*(?:हुई|हो\s*गई)|statement\s*recorded/i.test(t)) out.happened = 'Evidence recorded';
  else if (/argued|heard|बहस\s*(?:की|हुई|किया)|arguments?\s*(?:heard|advanced)|सुना/i.test(t) && !out.next) out.happened = 'Heard';
  else if (out.next || out.unlisted || /adjourn|स्थगित|टल\s*गया|टल\s*गई|आगे\s*बढ़/i.test(t)) out.happened = 'Adjourned';
  // fixed for: words after the next date, else anywhere
  const seg = k ? rest.slice(k.index) : rest;
  const PUR = [[/conclud|निष्कर्ष|बहस\s*पूरी|पूरी\s*बहस|finish\s*arguments/i, 'Concluding arguments'], ...PURPOSE_WORDS];
  for (const [re, p] of PUR) if (re.test(seg)) { out.purpose = p; break; }
  if (!out.purpose) for (const [re, p] of PUR) if (re.test(rest)) { out.purpose = p; break; }
  const im = /(?:item|serial|आइटम|सीरियल|क्रम|सीरियल\s*नंबर)\s*(?:no\.?|number|नंबर|संख्या)?\s*(\d{1,4})/i.exec(t); if (im) out.item = im[1];
  return out;
}
/* which matter: case / crime numbers first, then party names */
function dcFindMatter(raw, p) {
  const digits = s => String(s || '').replace(/\D+/g, ' ').trim().split(/\s+/);
  const all = live();
  const scored = all.map(m => {
    let s = 0;
    const cn = digits(m.caseNo), fr = digits(m.crimeNo);
    for (const r of p.refs) {
      const pool = r.kind === 'crime' ? [fr, cn] : [cn, fr];
      pool.forEach((d, i) => { if (d.includes(r.n)) { s += i ? 6 : 12; if (r.y && d.some(x => x === r.y || x.slice(-2) === String(r.y).slice(-2))) s += 4; } });
    }
    return { m, s: s + (s && isOpen(m) ? 1 : 0) };
  }).filter(x => x.s > 0);
  let res = scored;
  if (!res.length && typeof guessMatters === 'function') res = guessMatters(dcNumbers(raw));
  return res.sort((a, b) => b.s - a.s);
}

/* ---------- speech ---------- */
const DC = { rec: null, on: false };
function dcStop() { DC.on = false; try { DC.rec && DC.rec.stop(); } catch (e) {} DC.rec = null; }
function dcStart(lang, onText, onState) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Speech is not available here. Use Chrome on your phone or PC.'); return; }
  dcStop(); DC.on = true;
  const go = () => {
    const r = new SR(); DC.rec = r; r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = e => { let fin = '', mid = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) fin += x[0].transcript; else mid += x[0].transcript; } onText(fin, mid); };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { DC.on = false; toast('Microphone permission is off for SM Chambers'); onState(false); } };
    r.onend = () => { if (DC.on && !document.getElementById('dc_text')) DC.on = false; if (DC.on) { try { go(); } catch (e) { DC.on = false; onState(false); } } else onState(false); };   // phones stop after a pause: carry on until Stop
    try { r.start(); onState(true); } catch (e) { DC.on = false; onState(false); }
  };
  go();
}

/* ---------- the sheet ---------- */
function sheetDictate(forMatter) {
  const LS = 'cd.dclang';
  let lang = 'hi-IN'; try { lang = localStorage.getItem(LS) || 'hi-IN'; } catch (e) {}
  const F = { text: '', mid: '', m: forMatter || null, choices: [], happened: 'Adjourned', next: '', unlisted: false, purpose: '', item: '', fee: '', feeKind: 'date', mode: 'Cash', note: '', wa: false, cal: true, applied: false, live: false };
  const root = $('#sheet-root');
  const keep = () => {   // read the boxes before redrawing
    const g = id => $('#' + id);
    if (g('dc_text')) F.text = g('dc_text').value;
    if (!g('dc_next')) return;
    F.next = g('dc_next').value; F.unlisted = g('dc_unl').checked; F.purpose = g('dc_for').value; F.item = g('dc_item').value;
    F.fee = g('dc_fee').value; F.feeKind = g('dc_fk').value; F.mode = g('dc_mode').value; F.note = g('dc_note').value;
    F.wa = g('dc_wa') ? g('dc_wa').checked : false; F.cal = g('dc_cal').checked;
  };
  const mBox = () => {
    const m = F.m;
    if (m) return `<div class="dc-m"><div><small>${esc(mref(m))}</small><b>${esc(m.title || m.clients)}</b><span>${esc([caseLine(m), courtFull(m)].filter(Boolean).join(' · '))}</span><span>Now: ${m.nextDate ? 'next date ' + dmy(m.nextDate) + (m.purpose ? ' for ' + esc(m.purpose) : '') : isUnlisted(m) ? 'Unlisted' : 'no next date'}</span></div><button class="linkbtn" data-dc="change">Change</button></div>`;
    return `<div class="dc-m dc-none"><b>Matter not chosen yet</b><span>Say the case no., crime / FIR no. or party name, then press Apply.</span></div>`;
  };
  const draw = () => {
    const m = F.m;
    openSheet(`<div class="s-head"><div><small>Speak in English, हिंदी or both</small><h1>Speak &amp; Apply</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      ${mBox()}
      ${F.choices.length ? `<span class="lbl" style="display:block;margin:10px 0 6px">Which matter?</span><div class="list">${F.choices.slice(0, 6).map(x => `<button class="card row" data-dc="pick" data-id="${x.m.id}" style="box-shadow:none;border:1px solid var(--line)"><div class="item sm" style="background:${forumOf(x.m).c}"><small>REF.</small><b>${esc(mrefBox(x.m))}</b></div><span class="m-col"><span class="m-title">${esc(x.m.title || x.m.clients)}</span><span class="m-meta">${esc([caseLine(x.m), x.m.crimeNo ? 'FIR ' + x.m.crimeNo : ''].filter(Boolean).join(' · '))}</span></span></button>`).join('')}</div>` : ''}
      <div class="field" style="margin-top:12px"><label for="dc_text">WHAT YOU SAID (you can also type or correct it)</label>
        <textarea class="in" id="dc_text" rows="5" placeholder="e.g. Case number 8027 of 2026, maine kaafi der bahas ki, court ne kaha agli date par conclude karein, agli tareekh 15 November, client ne 500 rupaye date fee di">${esc(F.text)}</textarea>
        ${F.mid ? `<small class="dc-mid">… ${esc(F.mid)}</small>` : ''}</div>
      <div class="dc-bar">
        <button class="act ${F.live ? 'dc-rec' : 'primary'}" data-dc="mic">${I.mic} ${F.live ? 'Stop' : F.text ? 'Speak more' : 'Speak'}</button>
        <button class="act blue" data-dc="lang">${lang === 'hi-IN' ? 'हिंदी + English' : 'English only'}</button>
        <button class="act blue" data-dc="clear" ${F.text ? '' : 'disabled'}>Clear</button>
      </div>
      <button class="save" data-dc="apply" style="margin-top:10px">Apply</button>
      <div class="dc-fields${F.applied ? ' dc-done' : ''}">
        <span class="lbl" style="display:block;margin:14px 0 6px">${F.applied ? 'Filled from what you said — check, then Save' : 'Details (filled when you press Apply)'}</span>
        <div class="grp"><span class="lbl">What happened</span><div class="chips">${[...HAPPENED, 'Only note / fee'].map(h => `<button class="chip ${F.happened === h ? 'on' : ''}" data-dc="hap" data-v="${h}">${h}</button>`).join('')}</div></div>
        <div class="two"><div class="field"><label for="dc_next">NEXT DATE</label><input class="in" type="date" id="dc_next" value="${esc(F.next)}"></div>
          <div class="field"><label for="dc_item">ITEM NO.</label><input class="in" id="dc_item" value="${esc(F.item)}"></div></div>
        <label class="dc-chk"><input type="checkbox" id="dc_unl" ${F.unlisted ? 'checked' : ''}> Next date not known – mark <b>Unlisted</b></label>
        <div class="field"><label for="dc_for">FIXED FOR</label><input class="in" id="dc_for" list="dc_ff" value="${esc(F.purpose)}"><datalist id="dc_ff">${['Concluding arguments', ...FIXED_FOR].map(x => `<option value="${x}">`).join('')}</datalist></div>
        <div class="grp"><span class="lbl">Fee paid today</span>
          <div class="dc-fee"><input class="in" id="dc_fee" inputmode="numeric" placeholder="₹ amount" value="${esc(F.fee)}">
          <select class="in" id="dc_fk"><option value="date" ${F.feeKind === 'date' ? 'selected' : ''}>Date fee</option><option value="prof" ${F.feeKind === 'prof' ? 'selected' : ''}>Professional fee</option></select>
          <select class="in" id="dc_mode">${['Cash', 'UPI', 'Bank transfer', 'Cheque'].map(x => `<option ${F.mode === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <div class="field"><label for="dc_note">NOTE – WHAT HAPPENED IN THE HON'BLE COURT</label><textarea class="in" id="dc_note" rows="4">${esc(F.note)}</textarea></div>
        <div class="toggles">
          ${m && waOf(m) ? `<label><span>Tell client on WhatsApp</span><input type="checkbox" id="dc_wa" ${F.wa ? 'checked' : ''}></label>` : ''}
          <label><span>Remind me the evening before (Outlook)</span><input type="checkbox" id="dc_cal" ${F.cal ? 'checked' : ''}></label>
        </div>
        <button class="save" data-dc="save" style="width:100%" ${m ? "" : "disabled"}>Save${m ? '' : ' (choose the matter first)'}</button>
      </div>`);
  };
  const apply = () => {
    keep();
    const raw = F.text.trim(); if (!raw) return toast('Speak or type first');
    const p = dcParse(raw);
    if (!forMatter || p.refs.length) {
      const g = dcFindMatter(raw, p);
      if (g.length && (g.length === 1 || g[0].s >= (g[1] ? g[1].s : 0) + 3)) { F.m = g[0].m; F.choices = []; }
      else if (g.length) { F.choices = g; if (!F.m || !g.some(x => x.m === F.m)) F.m = null; }
      else if (!F.m) F.choices = [];
    }
    if (p.happened) F.happened = p.happened;
    F.next = p.next || ''; F.unlisted = !!p.unlisted && !p.next;
    if (p.purpose) F.purpose = p.purpose; if (p.item) F.item = p.item;
    if (p.fee) { F.fee = String(p.fee); F.feeKind = p.feeKind; }
    F.note = p.note; F.applied = true;
    if (F.m && waOf(F.m)) F.wa = true;
    draw();
    const bits = [F.m ? 'matter ' + mref(F.m) : F.choices.length ? 'choose the matter' : 'matter not found', F.next ? 'next ' + dmy(F.next) : F.unlisted ? 'Unlisted' : '', p.fee ? rupees(p.fee) + (p.feeKind === 'date' ? ' date fee' : ' fee') : ''].filter(Boolean);
    toast('Filled: ' + bits.join(' · '), 3500);
  };
  const save = () => {
    keep();
    const m = F.m ? find(F.m.id) : null; if (!m) return toast('Choose the matter first');
    const t = todayIso(), closing = F.happened === 'Disposed', onlyNote = F.happened === 'Only note / fee', fee = num(F.fee);
    if (!onlyNote && !closing && F.happened !== 'Reserved' && !F.next && !F.unlisted) return toast('Enter the next date, or tick Unlisted');
    if (F.next && F.next <= t && !onlyNote) return toast('The next date must be after today');
    const heardOn = m.nextDate && m.nextDate <= t ? m.nextDate : t;
    change(() => {
      if (!onlyNote) {
        m.hearings = m.hearings || [];
        const entry = { date: heardOn, happened: F.happened, next: closing ? '' : F.next, purpose: closing ? '' : F.purpose, note: F.note, item: m.item || '', court: m.court || '', spoken: true };
        const ph = m.hearings.find(h => h.date === heardOn && h.happened === 'Listed');
        if (ph) Object.assign(ph, entry); else m.hearings.push(entry);
        m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
        m.lastDate = heardOn;
        if (closing) { m.status = 'Decided'; m.nextDate = ''; m.purpose = ''; m.item = ''; m.closedOn = m.closedOn || t; }
        else { m.nextDate = F.next; m.purpose = F.purpose; m.item = F.item || ''; m.status = F.happened === 'Reserved' ? 'Reserved' : 'Pending'; m.unlisted = !F.next && !!F.unlisted; if (m.unlisted) m.unlistedSince = t; }
        if (F.cal || closing || m.eventId) m.calPending = true;
      } else if (F.note.trim()) logChange(m, 'Note: ' + F.note.trim());
      if (fee > 0) {
        m.payments = m.payments || [];
        if (typeof feesTidy === 'function') feesTidy(m);
        const df = F.feeKind === 'date' ? fee : 0;
        m.payments.push({ id: uid(), date: t, amount: fee, tds: 0, mode: F.mode, note: F.feeKind === 'date' ? 'Date fee' + (heardOn ? ' (' + dmy(heardOn) + ')' : '') : 'Professional fee', billId: '', dateFee: df });
        logChange(m, 'Payment received ' + rupees(fee) + ' by ' + F.mode + (F.feeKind === 'date' ? ' towards date fees' : ' towards professional fees') + ' (spoken)');
        if (typeof feesTotal === 'function') feesTotal(m); else m.feeReceived = String(num(m.feeReceived) + fee);
      }
      touch(m);
    });
    dcStop(); root.onclick = root.oninput = null; closeSheet();
    toast(onlyNote ? (fee ? 'Saved · ' + rupees(fee) + ' received' : 'Note saved') : closing ? 'Recorded · matter marked Decided' : 'Saved · ' + (F.next ? 'next date ' + dmy(F.next) : F.unlisted ? 'Unlisted' : F.happened) + (fee ? ' · ' + rupees(fee) + ' received' : ''), 3500);
    if (F.wa && waOf(m) && !onlyNote && typeof sendWa === 'function') sendWa(m, { happened: F.happened, next: F.next, purpose: F.purpose, note: '' });
    if (typeof render === 'function') render();
    if (typeof openMatter === 'function' && forMatter) openMatter(m.id);
  };
  draw();
  root.onclick = e => {
    const el = e.target.closest('[data-dc]'); if (!el) return;
    const a = el.dataset.dc;
    if (a === 'mic') {
      keep();
      if (F.live) { dcStop(); F.live = false; F.mid = ''; draw(); return; }
      dcStart(lang, (fin, mid) => {
        const box = $('#dc_text'); if (!box) { dcStop(); return; }
        if (fin) { box.value = (box.value.trim() ? box.value.trim() + ' ' : '') + fin.trim(); F.text = box.value; }
        F.mid = mid; const s = $('.dc-mid'); if (s) s.textContent = mid ? '… ' + mid : ''; else if (mid) { const n = document.createElement('small'); n.className = 'dc-mid'; n.textContent = '… ' + mid; box.after(n); }
      }, on => { if (F.live !== on) { keep(); F.live = on; if (!on) F.mid = ''; draw(); } });
    }
    else if (a === 'lang') { keep(); lang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN'; try { localStorage.setItem(LS, lang); } catch (e) {} if (F.live) { dcStop(); F.live = false; } draw(); toast(lang === 'hi-IN' ? 'Hindi + English: speak freely in both' : 'English only'); }
    else if (a === 'clear') { keep(); F.text = ''; F.mid = ''; draw(); }
    else if (a === 'apply') { if (F.live) { dcStop(); F.live = false; } apply(); }
    else if (a === 'hap') { keep(); F.happened = el.dataset.v; draw(); }
    else if (a === 'pick') { keep(); F.m = find(el.dataset.id); F.choices = []; draw(); }
    else if (a === 'change') { keep(); const g = F.text ? dcFindMatter(F.text, dcParse(F.text)) : []; F.choices = g; F.m = null; if (!g.length) toast('Say or type the case no., crime no. or party name, then press Apply'); draw(); }
    else if (a === 'save') save();
  };
  root.oninput = e => { if (e.target.id === 'dc_text') F.text = e.target.value; };
  setTimeout(() => { const b = $('[data-dc="mic"]'); if (b && !F.text) b.click(); }, 250);   // start listening straight away
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="dictate"]'); if (!el) return;
  sheetDictate(el.dataset.id ? find(el.dataset.id) : null);
});
