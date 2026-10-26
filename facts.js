/* SM Chambers — the case facts shown in bold on every matter card and at the top of the matter page:
   parties, Hon'ble Court & no., nature, U/S, police station, previous dates (drop-down), next date, purpose.
   Also: sorting matters marked "Other" into Criminal / Civil / Matrimonial / Consumer (reviewed before saving). */
'use strict';

const NATURES = ['Criminal', 'Civil', 'Matrimonial', 'Consumer', 'Other'];

/* "X, Y – vs – A, B" */
function partiesOf(m) {
  if (m.pet || m.opp) return { a: m.pet || '', b: m.opp || '' };
  const t = (m.title || m.clients || '').trim();
  const p = t.split(/\s+(?:vs\.?|v\/s\.?|v\.|versus)\s+/i);
  return p.length >= 2 ? { a: p[0].trim(), b: p.slice(1).join(' vs ').trim() } : { a: t, b: '' };
}
function partiesHtml(m) {
  const p = partiesOf(m);
  return p.b ? `${esc(p.a)} <span class="fx-vs">– vs –</span> ${esc(p.b)}` : esc(p.a);
}
function courtFull(m) {
  const c = (m.court || '').trim(), n = (m.courtNo || '').trim();
  if (!n) return c;
  if (new RegExp('court\\s*(no\\.?)?\\s*' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c)) return c;
  return (c ? c + ', ' : '') + 'Court No. ' + n;
}
/* every listed date before today, newest first, with what happened */
function previousDates(m) {
  const t = todayIso(), by = new Map();
  for (const h of (m.hearings || [])) if (h.date && h.date < t) by.set(h.date, h);
  if (m.lastDate && m.lastDate < t && !by.has(m.lastDate)) by.set(m.lastDate, { date: m.lastDate });
  return [...by.values()].sort((a, b) => b.date.localeCompare(a.date));
}
function factsBlock(m, full) {
  const blank = full ? '<i class="fx-none">not entered</i>' : '<i class="fx-dash">—</i>';
  const v = x => x ? esc(x) : blank;
  const prev = previousDates(m);
  const nd = m.nextDate ? `${DOWL[parseIso(m.nextDate).getDay()].slice(0, 3)}, ${dmy(m.nextDate)}` : '';
  const prevHtml = prev.length
    ? `<details class="fx-prev"><summary>${prev.length} date${prev.length === 1 ? '' : 's'} · last ${dmy(prev[0].date)}</summary><ol>${prev.map(h => `<li><b>${dmy(h.date)}</b>${h.happened ? `<span>${esc(h.happened)}${h.purpose ? ' · ' + esc(h.purpose) : ''}</span>` : ''}</li>`).join('')}</ol></details>`
    : blank;
  return `<div class="facts${full ? ' fx-full' : ''}">
    <div class="fx-parties">${partiesHtml(m) || blank}</div>
    <dl>
      <dt>Hon'ble Court &amp; no.</dt><dd>${v(courtFull(m))}</dd>
      <dt>Nature</dt><dd>${m.nature && m.nature !== 'Other' ? `<span class="fx-nat fx-${m.nature.toLowerCase()}">${esc(m.nature)}</span>` : v(m.nature === 'Other' ? 'Other' : '')}</dd>
      <dt>U/S</dt><dd>${v(m.sections)}</dd>
      <dt>Police station</dt><dd>${v(m.ps)}</dd>
      <dt>Previous dates</dt><dd>${prevHtml}</dd>
      <dt>Next date</dt><dd class="fx-next">${nd ? esc(nd) : blank}</dd>
      <dt>Purpose</dt><dd>${v(m.purpose)}</dd>
    </dl>
  </div>`;
}

/* ---------- sorting "Other" matters ---------- */
function guessNature(m) {
  const hay = [m.type, m.title, m.court, m.sections, m.caseNo, m.notes, m.purpose].filter(Boolean).join(' ');
  if (m.forum === 'Consumer' || m.type === 'Consumer' || /consumer|\bCDRC\b|\bNCDRC\b|District Commission/i.test(hay)) return 'Consumer';
  if (['125', 'DV'].includes(m.type) || /hindu marriage|\bHMA\b|divorce|matrimon|domestic violence|\bDV\b|\bD\.V\.|maintenance|family court|restitution|custody|guardian|\b(125|144)\s*(cr\.?p\.?c|bnss)|(u\/s|section|sec\.?)\s*(125|144)\b|\b498\s*-?\s*a\b|dowry/i.test(hay)) return 'Matrimonial';
  if (m.crimeNo || m.ps || ['Complaint', 'FIR', '482', 'Bail', 'ABA', '138 NI'].includes(m.type) ||
    /\bIPC\b|\bBNS\b|\bBNSS\b|cr\.?p\.?c|\bNI Act\b|\b138\b|bail|\b482\b|\b528\b|\bFIR\b|criminal|crl|complaint case|\bA?CJM\b|sessions|magistrate|police|charge ?sheet|discharge|\bPFA\b|quash/i.test(hay)) return 'Criminal';
  if (['Suit', 'WS', 'Execution', 'Arbitration', 'RERA', 'Mutation', 'Deed', 'Appeal', 'Writ'].includes(m.type) ||
    /\bsuit\b|civil|\bCPC\b|\bO\.?S\.?\b|writ|\bWP\b|\bRERA\b|arbitra|execution|lease|mutation|deed|property|partition|injunction|recovery|tenan|rent|revenue|tehsil|\bSDM\b|\bADM\b|tribunal|\bAFT\b|pension|service/i.test(hay)) return 'Civil';
  return '';
}
function sheetSortNature() {
  const rows = live().filter(m => !m.nature || m.nature === 'Other').map(m => ({ m, g: guessNature(m) }));
  rows.sort((a, b) => (a.g ? 0 : 1) - (b.g ? 0 : 1) || (a.g || '').localeCompare(b.g || '') || (b.m.year - a.m.year));
  const sel = (r, i) => `<select class="in" data-ns="${i}" style="min-height:36px;padding:4px 8px">${NATURES.map(x => `<option ${x === (r.g || 'Other') ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  openSheet(`<div class="s-head"><div><small>Matters marked "Other"</small><h1>Civil / Criminal / Matrimonial / Consumer</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">${rows.length} matter${rows.length === 1 ? '' : 's'} not yet sorted. A suggestion is filled in from the case type, title, court and sections; change any that are wrong. Nothing is saved until you press <b>Save all</b>. Leave a matter on "Other" to keep it as it is.</p>
    ${rows.length ? `<div class="list" id="ns_list">${rows.map((r, i) => `<div class="card" style="padding:10px 12px;display:grid;grid-template-columns:1fr 150px;gap:10px;align-items:center;box-shadow:none;border:1px solid var(--line)">
      <div style="min-width:0"><b style="display:block;font-size:14px">${esc(r.m.title || r.m.clients)}</b><small style="color:var(--muted)">${esc(mref(r.m))}${r.m.court ? ' · ' + esc(r.m.court) : ''}${r.m.type ? ' · ' + esc(r.m.type) : ''}</small></div>${sel(r, i)}</div>`).join('')}</div>
    <button class="act primary" id="ns_save" style="width:100%;min-height:48px;margin-top:12px">Save all</button>` : '<div class="card empty">Every matter is already sorted.</div>'}`);
  const b = $('#ns_save'); if (!b) return;
  b.onclick = () => {
    let n = 0;
    change(() => { document.querySelectorAll('[data-ns]').forEach(s => { const r = rows[+s.dataset.ns], v = s.value; if (v !== 'Other' && v !== r.m.nature) { const m = find(r.m.id); logChange(m, 'Nature: ' + (m.nature || '—') + ' → ' + v); m.nature = v; touch(m); n++; } }); });
    closeSheet(); toast(n ? n + ' matter' + (n === 1 ? '' : 's') + ' sorted' : 'Nothing changed'); if (typeof render === 'function') render();
  };
}
