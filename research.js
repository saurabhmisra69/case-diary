/* SM Chambers — research in Supreme Today (website, phone app or PC software).
   Supreme Today does not offer links that open a search directly, and a web page cannot start PC software,
   so each search is copied and Supreme Today is opened (or you switch to it): paste, and search.
   Judgments downloaded there can be shared back into SM Chambers › Judgment library. */
'use strict';

const ST_WEB = 'https://web.supremetoday.ai/';
const ST_KEY = 'cd.stmode';
const stMode = () => { try { return localStorage.getItem(ST_KEY) || ((typeof isPhone === 'function' ? isPhone() : /Android|iPhone/i.test(navigator.userAgent)) ? 'web' : 'pc'); } catch (e) { return 'web'; } };
const ST_MODES = { web: 'Website', app: 'Phone app', pc: 'PC software' };
async function stSearch(term) {
  try { await navigator.clipboard.writeText(term); } catch (e) {}
  const mode = stMode();
  if (mode === 'web') { window.open(ST_WEB, '_blank'); toast('Copied “' + term + '”. In Supreme Today, tap the search bar and paste.', 6000); }
  else if (mode === 'app') toast('Copied “' + term + '”. Open the Supreme Today app, tap search and paste.', 6000);
  else toast('Copied “' + term + '”. Switch to Supreme Today on your PC and press Ctrl+V in its search.', 6000);
}
const ACT_RX = /\b(IPC|BNS|BNSS|Cr\.?\s*P\.?\s*C\.?|CPC|C\.?P\.?C\.?|N\.?\s*I\.?\s*Act|BSA|Evidence Act|IT Act|Arms Act|NDPS(?: Act)?|POCSO(?: Act)?|SC\/ST(?: Act)?|Dowry Prohibition Act|D\.?V\.?\s*Act|HMA|Hindu Marriage Act|TPA|Transfer of Property Act|Specific Relief Act|Contract Act|RERA|Arbitration(?: and Conciliation)? Act|Gangsters? Act)\b/gi;
function sectionSearches(secStr) {
  const s = String(secStr || ''); if (!s.trim()) return [];
  const out = [], parts = s.split(/;|\band\b/i);
  for (const p of parts) { const acts = p.match(ACT_RX) || [], act = (acts[acts.length - 1] || '').replace(/\s+/g, ' ').trim(); const nums = p.match(/\b\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/g) || [];
    nums.forEach(n => out.push('Section ' + n + (act ? ' ' + act : ''))); }
  return [...new Set(out)].slice(0, 10);
}
const TOPICS = {
  'Bail': ['bail parity co-accused', 'bail long incarceration delay in trial'], 'ABA': ['anticipatory bail 482 BNSS conditions', 'anticipatory bail 438 CrPC'], '482': ['quashing of FIR inherent powers 528 BNSS', 'quashing civil dispute given criminal colour'],
  '138 NI': ['section 138 NI Act presumption section 139', 'cheque dishonour legally enforceable debt'], 'Revision': ['scope of revisional jurisdiction', 'discharge revision interference'], 'DV': ['domestic relationship shared household DV Act'],
  '125': ['maintenance wife able to earn section 125', 'maintenance interim disclosure affidavit'], 'Writ': ['writ alternative remedy maintainability'], 'Suit': ['injunction prima facie balance of convenience'], 'Arbitration': ['section 34 arbitration patent illegality'],
  'Appeal': ['appeal reappreciation of evidence'], 'Execution': ['execution of decree objections'], 'Complaint': ['summoning order application of mind', 'discharge sufficient ground for proceeding'],
};
function sheetResearch(m) {
  const pt = parties(m), notState = x => x && !/state of|union of india/i.test(x);
  const lib = typeof library === 'function' ? (m.authorities || []).map(id => library().find(x => x.id === id)).filter(Boolean) : [];
  const groups = [
    ['Parties', [pt.first, pt.second].filter(notState).map(x => x.replace(/\s*&\s*(anr|ors)\.?$/i, '').trim())],
    ['Case number', [[m.type, m.caseNo].filter(Boolean).join(' ')].filter(x => m.caseNo)],
    ['Sections (case law)', sectionSearches(m.sections)],
    ['Bare Acts', [...new Set((String(m.sections || '').match(ACT_RX) || []).map(a => a.replace(/\s+/g, ' ').trim()))]],
    ['Citations in this matter', lib.filter(x => x.citation).map(x => x.citation.split(';')[0].trim())],
    ['Topics', TOPICS[m.type] || []],
  ].filter(([, xs]) => xs.length);
  const mode = stMode();
  openSheet(`<div class="s-head"><div><small>${esc(m.no)} · Supreme Today</small><h1>Research</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><span class="lbl" style="margin:0">Open in</span><div class="seg">${Object.entries(ST_MODES).map(([k, l]) => `<button type="button" class="${mode === k ? 'on' : ''}" data-rs="mode" data-v="${k}">${l}</button>`).join('')}</div></div>
    <p class="hint">Tap a search: it is copied${mode === 'web' ? ' and Supreme Today opens' : ''}; paste it in Supreme Today's search. For a Bare Act, choose <b>All Options › Bare Acts</b> there.</p>
    <form id="rs_form" style="display:flex;gap:8px;margin:8px 0 12px"><input class="in" id="rs_q" placeholder="Your own search, e.g. bail parity 2024" style="flex:1"><button class="save" type="submit" style="margin:0;width:auto;padding:0 16px">Search</button></form>
    ${typeof sectionLinks === 'function' && sectionLinks(m).length ? `<div class="grp"><span class="lbl">On your Bare Acts shelf</span><div class="chips">${sectionLinks(m).map(x => `<button class="chip on" data-act="actsec" data-k="${x.k}" data-no="${esc(x.no)}">${esc(x.label)}</button>`).join('')}</div></div>` : ''}
    ${groups.map(([h, xs]) => `<div class="grp"><span class="lbl">${esc(h)}</span><div class="chips">${xs.map(x => `<button class="chip" data-rs="go" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`).join('') || '<p class="hint">Add parties, sections or case no. to the matter to get ready searches.</p>'}
    <div class="card" style="margin-top:12px;padding:12px 14px"><b>Found a useful judgment?</b><p class="hint" style="margin:4px 0 0">Download it in Supreme Today, then <b>Share › SM Chambers › Library, and use it in a matter</b>. It is read, made searchable and added to this matter's authorities — ready for the List of authorities and for Draft with Claude.</p></div>`);
  const root = $('#sheet-root');
  root.onclick = e => { const b = e.target.closest('[data-rs]'); if (!b) return;
    if (b.dataset.rs === 'mode') { try { localStorage.setItem(ST_KEY, b.dataset.v); } catch (er) {} return sheetResearch(m); }
    stSearch(b.dataset.v); };
  $('#rs_form').onsubmit = e => { e.preventDefault(); const q = $('#rs_q').value.trim(); if (q) stSearch(q); };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="research"],[data-act="stsearch"]'); if (!el) return;
  if (el.dataset.act === 'research') { const m = find(el.dataset.id); if (m) sheetResearch(m); } else stSearch(el.dataset.v);
});
