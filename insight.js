/* SM Chambers — practice dashboard: matters by category, court and status, results, income by month, dues. */
'use strict';

function barRows(rows, opts = {}) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return `<div class="bars">${rows.map(([label, v, color, sub]) => `<div class="bar-row"><span class="bar-l">${esc(label)}</span><span class="bar-t"><i style="width:${Math.max(2, Math.round(v / max * 100))}%;background:${color || 'var(--hc)'}"></i></span><b class="bar-v">${opts.money ? rupees(v) : v}${sub ? '<small>' + esc(sub) + '</small>' : ''}</b></div>`).join('')}</div>`;
}
function dashData() {
  const all = live(), open = all.filter(isOpen), t = todayIso();
  const byForum = Object.entries(FORUMS).map(([k, f]) => [f.label, open.filter(m => (m.forum || 'District') === k).length, f.c]).filter(r => r[1]);
  const courts = {}; open.forEach(m => { const c = (m.court || '').replace(/\s*·.*$/, '').trim() || (FORUMS[m.forum] || {}).label || '—'; courts[c] = (courts[c] || 0) + 1; });
  const byCourt = Object.entries(courts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => [c, n, 'var(--dc)']);
  const sts = {}; open.forEach(m => { const s = m.status || 'Pending'; sts[s] = (sts[s] || 0) + 1; });
  const bySt = Object.entries(sts).sort((a, b) => b[1] - a[1]).map(([s, n]) => [s, n, 'var(--tr)']);
  const decided = all.filter(m => m.status === 'Decided'), oc = {}; decided.forEach(m => { const o = m.outcome || 'Result not entered'; oc[o] = (oc[o] || 0) + 1; });
  const OC_C = { 'In our favour': '#2E7D4F', 'Partly in our favour': '#7BA05B', 'Against us': '#B3261E', 'Disposed of with directions': 'var(--hc)', 'Compromise / settled': '#8A6D3B', 'Remanded': '#6B5B95', 'Result not entered': '#999' };
  const byOc = Object.entries(oc).sort((a, b) => b[1] - a[1]).map(([o, n]) => [o, n, OC_C[o] || 'var(--hc)']);
  const known = decided.filter(m => m.outcome && !/directions|remanded|compromise/i.test(m.outcome)), won = known.filter(m => /in our favour/i.test(m.outcome)).length;
  const months = []; const d0 = parseIso(t); for (let i = 11; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
  const inc = Object.fromEntries(months.map(k => [k, 0])); all.forEach(m => (m.payments || []).forEach(p => { const k = (p.date || '').slice(0, 7); if (k in inc) inc[k] += gross(p); }));
  const fy = fyOf(t), fyInc = all.reduce((s, m) => s + (m.payments || []).filter(p => p.date && fyOf(p.date) === fy).reduce((a, p) => a + gross(p), 0), 0);
  const next30 = all.filter(m => m.nextDate && m.nextDate >= t && m.nextDate <= addDays(t, 30)).length;
  const added = all.filter(m => (m.created || '') >= addDays(t, -365)).length, closedY = all.filter(m => (m.closedOn || '') >= addDays(t, -365)).length;
  return { all, open, byForum, byCourt, bySt, byOc, won, known: known.length, months, inc, fy, fyInc, next30, added, closedY, due: open.concat(all.filter(m => !isOpen(m))).reduce((s, m) => s + feeDue(m), 0) };
}
function sheetDashboard() {
  const d = dashData(), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxI = Math.max(1, ...Object.values(d.inc));
  openSheet(`<div class="s-head"><div><small>Saurabh Misra &amp; Associates – Chambers</small><h1>Practice dashboard</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <section class="tiles" style="margin:0 0 12px">
      <div class="tile" style="background:var(--hc-soft)"><span style="color:var(--hc)">Open matters</span><b style="color:var(--hc)">${d.open.length}</b><span>${d.all.length} in all</span></div>
      <div class="tile" style="background:var(--dc-soft)"><span style="color:var(--dc-ink)">Fees FY ${d.fy}</span><b style="color:var(--dc-ink)">${rupees(d.fyInc)}</b><span>gross, incl. TDS</span></div>
      <div class="tile" style="background:var(--saffron-soft)"><span style="color:var(--saffron-ink)">Pending fees</span><b style="color:var(--saffron-ink)">${rupees(d.due)}</b><span>all matters</span></div>
      <div class="tile" style="background:var(--tr-soft)"><span style="color:var(--tr-ink)">Next 30 days</span><b style="color:var(--tr-ink)">${d.next30}</b><span>listings</span></div>
    </section>
    <div class="grp"><span class="lbl">Fees received, last 12 months</span>
      <div class="cols">${d.months.map(k => `<div class="col"><i style="height:${Math.round(d.inc[k] / maxI * 100)}%" title="${rupees(d.inc[k])}"></i><small>${MON[+k.slice(5) - 1].slice(0, 1)}</small></div>`).join('')}</div>
      <p class="hint" style="margin:4px 0 0">Highest: ${rupees(maxI === 1 ? 0 : maxI)} · this month: ${rupees(d.inc[d.months[11]])}</p></div>
    <div class="grp"><span class="lbl">Results${d.known ? ` · in our favour ${Math.round(d.won / d.known * 100)}% of ${d.known} with a clear result` : ''}</span>${d.byOc.length ? barRows(d.byOc) : '<p class="hint" style="margin:0">No matter marked Decided yet.</p>'}</div>
    <div class="grp"><span class="lbl">Open matters by category</span>${barRows(d.byForum)}</div>
    <div class="grp"><span class="lbl">Busiest Hon'ble Courts (open matters)</span>${barRows(d.byCourt)}</div>
    <div class="grp"><span class="lbl">Open matters by status</span>${barRows(d.bySt)}</div>
    <p class="hint">Last 12 months: ${d.added} matters added, ${d.closedY} closed.</p>`);
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="dashboard"]')) sheetDashboard(); });
