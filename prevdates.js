/* SM Chambers — add many previous dates to a matter at once.
   Type or speak them (English, Hindi or both), e.g. "12.03.2024 adjourned, 15.04.2024 evidence, 20.05.2024 not taken up".
   "Read dates" makes one row per date (what happened, fixed for, note) to check; "Save all" adds them to Hearing history.
   Dates already in the history are left out, so nothing is entered twice. */
'use strict';

function pdYearFor(d, mo) {   // a date said without the year: the latest such date not after today
  const t = todayIso(), y = +t.slice(0, 4);
  const a = isoOf(d, mo, y); return a && a <= t ? a : isoOf(d, mo, y - 1);
}
function pdDates(t) {
  const mon = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp('(\\d{1,2})\\s*[\\/.\\-]\\s*(\\d{1,2})\\s*[\\/.\\-]\\s*(\\d{2,4})(?!\\d)|(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(' + mon + ')\\.?,?\\s*(?:(\\d{4})(?!\\d))?|(' + mon + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(?:(\\d{4})(?!\\d))?', 'gi');
  const out = []; let m, prev = '';
  // a date said without the year follows the year of the date before it ("7/4/22 … 12 May" -> 12.05.2022)
  const noYear = (d, mo) => { if (prev) { let y = +prev.slice(0, 4), a = isoOf(d, mo, y); if (a && a < prev) a = isoOf(d, mo, y + 1); if (a && a <= todayIso()) return a; } return pdYearFor(d, mo); };
  while ((m = re.exec(t))) {
    let iso = '';
    if (m[1]) { let y = +m[3]; if (y < 100) y += 2000; iso = isoOf(+m[1], +m[2], y); }
    else if (m[4]) { const mo = MONTH_WORDS[m[5].toLowerCase()]; iso = m[6] ? isoOf(+m[4], mo, +m[6]) : noYear(+m[4], mo); }
    else if (m[7]) { const mo = MONTH_WORDS[m[7].toLowerCase()]; iso = m[9] ? isoOf(+m[8], mo, +m[9]) : noYear(+m[8], mo); }
    if (iso) { out.push({ iso, at: m.index, end: m.index + m[0].length }); prev = iso; }
  }
  return out;
}
function pdHappened(s) {
  if (/^\s*(?:listed|लगा\s*था|लिस्टेड)\b/i.test(s) || /^\s*listed\s*$/i.test(s)) return 'Listed';
  if (/reserved|सुरक्षित/i.test(s)) return 'Reserved';
  if (/dispos|decided|निस्तारित|निस्तारण|खारिज|dismissed|allowed|withdrawn/i.test(s)) return 'Disposed';
  if (/not\s*taken\s*up|no\s*sitting|not\s*reached|नहीं\s*लगा|नहीं\s*पहुं?चा|हड़ताल|हडताल|strike|holiday|अवकाश|छुट्टी|on\s*leave|\bleave\b/i.test(s)) return 'Not taken up';
  if (/evidence\s*recorded|statement\s*recorded|बयान\s*(?:हुए|हुआ|दर्ज)|गवाही\s*(?:हुई|हो\s*गई)/i.test(s)) return 'Evidence recorded';
  if (/argued|heard|बहस\s*(?:की|हुई|किया)|सुना/i.test(s)) return 'Heard';
  return 'Adjourned';
}
function pdPurpose(s) {
  for (const [re, p] of [[/conclud|निष्कर्ष|बहस\s*पूरी/i, 'Concluding arguments'], ...PURPOSE_WORDS]) if (re.test(s)) return p;
  return '';
}
/* text -> rows, oldest first */
function pdParse(raw, m) {
  const t = typeof dcNumbers === 'function' ? dcNumbers(raw) : raw, ds = pdDates(t), today = todayIso();
  const have = new Set((m.hearings || []).map(h => h.date));
  const rows = ds.map((d, i) => {
    const desc = t.slice(d.end, i + 1 < ds.length ? ds[i + 1].at : t.length).replace(/^[\s,;:.\-–—)]+|[\s,;:(\-–—]+$/g, '').replace(/^(?:को|पर|on|dated)\s+/i, '').trim();
    return { date: d.iso, happened: pdHappened(desc), purpose: pdPurpose(desc), note: desc, future: d.iso > today };
  }).filter(r => r.date);
  const seen = new Set();
  const uniq = rows.filter(r => { if (seen.has(r.date)) return false; seen.add(r.date); return true; }).sort((a, b) => a.date.localeCompare(b.date));
  uniq.forEach((r, i) => { r.next = uniq[i + 1] ? uniq[i + 1].date : (m.nextDate && m.nextDate > r.date ? m.nextDate : ''); r.dup = have.has(r.date); r.on = !r.dup && !r.future; });
  return uniq;
}

function sheetPrevDates(m) {
  if (!m) return;
  const LS = 'cd.dclang';
  let lang = 'hi-IN'; try { lang = localStorage.getItem(LS) || 'hi-IN'; } catch (e) {}
  const P = { text: '', mid: '', live: false, rows: null };
  const root = $('#sheet-root');
  const keepRows = () => { (P.rows || []).forEach((r, i) => { const g = k => $('#pd_' + k + '_' + i); if (!g('date')) return; r.date = g('date').value; r.happened = g('hap').value; r.purpose = g('for').value; r.note = g('note').value; r.on = g('on').checked; }); };
  const keep = () => { const b = $('#pd_text'); if (b) P.text = b.value; keepRows(); };
  const draw = () => {
    const rows = P.rows || [], n = rows.filter(r => r.on).length;
    openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · ${esc(m.title || m.clients)}</small><h1>Add previous dates</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" style="margin:0 0 8px">Type or speak the dates with what happened, as many as you like — English, हिंदी or both. For example:<br><b>12.03.2024 adjourned, 15.04.2024 evidence, 20.05.2024 not taken up, 18 July 2024 cross of PW1</b></p>
      <textarea class="in" id="pd_text" rows="5" placeholder="12.03.2024 adjourned, 15.04.2024 evidence …">${esc(P.text)}</textarea>
      ${P.mid ? `<small class="dc-mid">… ${esc(P.mid)}</small>` : ''}
      <div class="dc-bar" style="margin-top:8px">
        <button class="act ${P.live ? 'dc-rec' : 'primary'}" data-pd="mic">${I.mic} ${P.live ? 'Stop' : P.text ? 'Speak more' : 'Speak'}</button>
        <button class="act blue" data-pd="lang">${lang === 'hi-IN' ? 'हिंदी + English' : 'English only'}</button>
        <button class="act blue" data-pd="clear" ${P.text ? '' : 'disabled'}>Clear</button>
      </div>
      <button class="save" data-pd="read" style="margin-top:10px;width:100%">Read dates</button>
      ${P.rows ? (rows.length ? `<span class="lbl" style="display:block;margin:14px 0 6px">${rows.length} date${rows.length === 1 ? '' : 's'} found — check each, then Save all</span>
        <div class="pd-rows">${rows.map((r, i) => `<div class="pd-row${r.on ? '' : ' pd-off'}">
          <label class="pd-top"><input type="checkbox" id="pd_on_${i}" ${r.on ? 'checked' : ''} ${r.future ? 'disabled' : ''}><input class="in" type="date" id="pd_date_${i}" value="${esc(r.date)}">
            <select class="in" id="pd_hap_${i}">${['Listed', ...HAPPENED].map(h => `<option ${h === r.happened ? 'selected' : ''}>${h}</option>`).join('')}</select></label>
          ${r.dup ? '<small class="pd-warn">Already in Hearing history — left out</small>' : r.future ? '<small class="pd-warn">This date is in the future — use Next date for it</small>' : ''}
          <input class="in" id="pd_for_${i}" list="pd_ff" placeholder="Fixed for (purpose)" value="${esc(r.purpose)}">
          <input class="in" id="pd_note_${i}" placeholder="Note" value="${esc(r.note)}">
        </div>`).join('')}</div><datalist id="pd_ff">${['Concluding arguments', ...FIXED_FOR].map(x => `<option value="${x}">`).join('')}</datalist>
        <button class="save" data-pd="save" style="margin-top:12px;width:100%" ${n ? '' : 'disabled'}>Save all (${n})</button>`
        : '<div class="card empty" style="margin-top:12px">No dates found. Write each date like 12.03.2024 or 12 March 2024.</div>') : ''}`);
  };
  const save = () => {
    keep();
    const add = (P.rows || []).filter(r => r.on && r.date && r.date <= todayIso());
    if (!add.length) return toast('Nothing ticked');
    let n = 0;
    change(() => {
      m.hearings = m.hearings || [];
      const have = new Set(m.hearings.map(h => h.date));
      for (const r of add.sort((a, b) => a.date.localeCompare(b.date))) {
        if (have.has(r.date)) continue; have.add(r.date);
        const nx = r.next && r.next > r.date ? r.next : '';
        m.hearings.push({ date: r.date, happened: r.happened, next: nx, purpose: r.purpose, note: r.note, item: '', court: m.court || '', added: todayIso() });
        n++;
      }
      m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
      const all = [...new Set([...m.hearings.map(h => h.date), m.nextDate].filter(Boolean))].sort();
      for (const h of m.hearings) if (h.added === todayIso() && !h.next) { const nx = all.find(d => d > h.date); if (nx) h.next = nx; }
      for (const h of m.hearings) if (h.added === todayIso() && h.next) { const nx = all.find(d => d > h.date); if (nx && nx < h.next) h.next = nx; }
      const last = m.hearings.filter(h => h.date <= todayIso()).map(h => h.date).sort().pop();
      if (last && (!m.lastDate || last > m.lastDate)) m.lastDate = last;
      logChange(m, n + ' previous date' + (n === 1 ? '' : 's') + ' added to Hearing history');
      touch(m);
    });
    dcStop(); root.onclick = root.oninput = null; closeSheet();
    toast(n + ' previous date' + (n === 1 ? '' : 's') + ' added');
    if (typeof openMatter === 'function') openMatter(m.id);
  };
  draw();
  root.onclick = e => {
    const el = e.target.closest('[data-pd]'); if (!el) return;
    const a = el.dataset.pd;
    if (a === 'mic') {
      keep();
      if (P.live) { dcStop(); P.live = false; P.mid = ''; draw(); return; }
      let base = null, bsid = 0;
      dcStart(lang, (fin, mid, sid) => {
        const box = $('#pd_text'); if (!box) { dcStop(); return; }
        if (sid !== bsid) { bsid = sid; base = box.value.trim(); }
        if (fin) { box.value = (base ? base + ', ' : '') + fin; P.text = box.value; }
        P.mid = mid; const s = $('.dc-mid'); if (s) s.textContent = mid ? '… ' + mid : '';
      }, on => { if (P.live !== on) { keep(); P.live = on; if (!on) P.mid = ''; draw(); } });
    }
    else if (a === 'lang') { keep(); lang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN'; try { localStorage.setItem(LS, lang); } catch (e) {} if (P.live) { dcStop(); P.live = false; } draw(); }
    else if (a === 'clear') { keep(); P.text = ''; P.rows = null; draw(); }
    else if (a === 'read') { if (P.live) { dcStop(); P.live = false; } keep(); if (!P.text.trim()) return toast('Type or speak the dates first'); P.rows = pdParse(P.text, m); draw(); }
    else if (a === 'save') save();
  };
  root.oninput = e => { if (e.target.id === 'pd_text') P.text = e.target.value; };
  root.onchange = e => { if (/^pd_on_/.test(e.target.id)) { keepRows(); draw(); } };
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="pdadd"]'); if (!el) return;
  sheetPrevDates(find(el.dataset.id));
});
