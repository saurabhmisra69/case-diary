/* Case Diary — paper size (A4 or Legal) for every Word document.
   Each kind of document has a default (Legal, bills and receipts A4) which can be changed and saved;
   a switch next to each Make button changes it for that one document.
   Layouts keep the same text width on both sizes: only the side margins move. */
'use strict';

const PAPER_SIZES = { A4: { w: 11906, h: 16838, label: 'A4' }, Legal: { w: 12240, h: 20160, label: 'Legal' } };
const PAPER_DEF = { draft: 'Legal', letter: 'Legal', bill: 'A4', receipt: 'A4', engage: 'A4', cover: 'Legal', causelist: 'Legal' };
const PAPER_KIND = { draft: 'Drafts & applications', letter: 'Letters & notices', bill: 'Bills', receipt: 'Receipts', engage: 'Engagement forms', cover: 'File cover', causelist: 'Cause list' };
const PAPER_NOW = {};   // this document only
const paperDefault = kind => ((S.data && S.data.meta && S.data.meta.paper) || {})[kind] || PAPER_DEF[kind] || 'Legal';
const paperOf = kind => PAPER_NOW[kind] || paperDefault(kind);
function takePaper(kind) { const p = paperOf(kind); delete PAPER_NOW[kind]; return p; }

/* page properties for a layout designed on `design` paper, printed on `paper` */
function pageFor(paper, design, margin) {
  const P = PAPER_SIZES[paper] || PAPER_SIZES.Legal, Dz = PAPER_SIZES[design] || PAPER_SIZES.Legal, d = Math.round((P.w - Dz.w) / 2);
  const mg = Object.assign({}, margin); mg.left = Math.max(720, (margin.left || 0) + d); mg.right = Math.max(720, (margin.right || 0) + d);
  return { size: { width: P.w, height: P.h }, margin: mg };
}

function paperSwitch(kind) {
  const cur = paperOf(kind), def = paperDefault(kind);
  return `<div class="paperpick" data-pk="${kind}"><span class="lbl" style="margin:0">Paper</span>
    <div class="seg">${['A4', 'Legal'].map(p => `<button type="button" class="${cur === p ? 'on' : ''}" data-paper="${kind}" data-v="${p}">${p}</button>`).join('')}</div>
    <span class="pp-note">${cur === def ? 'your default' : `<button type="button" class="linkbtn" data-paperdef="${kind}">Make ${cur} the default</button>`}</span></div>`;
}
function redrawSwitch(kind) { document.querySelectorAll(`.paperpick[data-pk="${kind}"]`).forEach(el => { el.outerHTML = paperSwitch(kind); }); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-paper],[data-paperdef]'); if (!b) return;
  e.preventDefault();
  if (b.dataset.paper) { PAPER_NOW[b.dataset.paper] = b.dataset.v; redrawSwitch(b.dataset.paper); return; }
  const kind = b.dataset.paperdef, p = paperOf(kind);
  change(d => { d.meta = d.meta || {}; d.meta.paper = Object.assign({}, d.meta.paper, { [kind]: p }); });
  delete PAPER_NOW[kind]; redrawSwitch(kind); toast(PAPER_KIND[kind] + ': ' + p + ' is now the default');
});

/* all defaults in one place (More › Paper size) */
function sheetPaper() {
  openSheet(`<div class="s-head"><div><small>Settings</small><h1>Paper size</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">The size each kind of document is made on. You can still switch A4 / Legal for one document next to its Make button.</p>
    <div class="grp" style="gap:10px">${Object.keys(PAPER_DEF).map(k => `<div class="two" style="align-items:center"><b>${PAPER_KIND[k]}</b><div class="seg">${['A4', 'Legal'].map(p => `<button type="button" class="${paperDefault(k) === p ? 'on' : ''}" data-pdef="${k}" data-v="${p}">${p}</button>`).join('')}</div></div>`).join('')}</div>`);
  $('#sheet-root').onclick = e => { const b = e.target.closest('[data-pdef]'); if (!b) return;
    change(d => { d.meta = d.meta || {}; d.meta.paper = Object.assign({}, d.meta.paper, { [b.dataset.pdef]: b.dataset.v }); }); sheetPaper(); };
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="paper"]')) sheetPaper(); });
