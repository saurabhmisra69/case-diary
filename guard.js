/* SM Chambers — protection: app lock (PIN), monthly offline backup, conflict check.
   The PIN is kept only on this device, as a salted SHA-256 hash; it never goes to OneDrive. */
'use strict';

/* ================= App lock ================= */
const PIN_KEY = 'cd.pin', ACTIVE_KEY = 'cd.lastActive', LOCK_AFTER = 5 * 60 * 1000;
const LOCK = { on: false, entry: '', fails: 0, until: 0 };
const LSX = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
const pinRec = () => { try { return JSON.parse(LSX.get(PIN_KEY) || 'null'); } catch (e) { return null; } };
const hasPin = () => !!pinRec();
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function setPin(pin) { const salt = [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join(''); LSX.set(PIN_KEY, JSON.stringify({ salt, hash: await sha(salt + ':' + pin) })); }
async function pinOk(pin) { const r = pinRec(); return !!r && (await sha(r.salt + ':' + pin)) === r.hash; }
const markActive = () => LSX.set(ACTIVE_KEY, String(Date.now()));

function lockScreen(msg) {
  let el = $('#lock'); if (!el) { el = document.createElement('div'); el.id = 'lock'; document.body.appendChild(el); }
  const wait = LOCK.until > Date.now() ? Math.ceil((LOCK.until - Date.now()) / 1000) : 0;
  el.innerHTML = `<div class="lock-in"><div class="lock-title"><b>SM Chambers</b><small>Saurabh Misra &amp; Associates – Chambers</small></div>
    <p class="lock-msg">${esc(msg || (wait ? 'Too many tries. Wait ' + wait + ' s' : 'Enter your PIN'))}</p>
    <div class="lock-dots">${[0, 1, 2, 3].map(i => `<i class="${i < LOCK.entry.length ? 'on' : ''}"></i>`).join('')}</div>
    <div class="lock-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-pin="${k}" ${wait ? 'disabled' : ''}>${k}</button>`).join('')}</div>
    <button class="lock-forgot" data-pin="forgot">Forgot PIN?</button></div>`;
  if (wait) setTimeout(() => LOCK.on && lockScreen(), 1000);
}
function lockNow() { if (!hasPin() || LOCK.on) return; LOCK.on = true; LOCK.entry = ''; document.documentElement.classList.add('locked'); lockScreen(); }
function unlock() { LOCK.on = false; LOCK.entry = ''; LOCK.fails = 0; document.documentElement.classList.remove('locked'); $('#lock')?.remove(); markActive(); }
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-pin]'); if (!b || !LOCK.on) return;
  const k = b.dataset.pin;
  if (k === 'forgot') {
    if (!confirm('Forgot PIN: the records on this phone will be cleared and you will sign in with Microsoft again. Your data is safe in OneDrive and comes back after sign-in. Continue?')) return;
    LSX.del(PIN_KEY); try { await signOut(); } catch (er) { location.reload(); } return;
  }
  if (k === '⌫') LOCK.entry = LOCK.entry.slice(0, -1); else if (LOCK.entry.length < 4) LOCK.entry += k;
  lockScreen();
  if (LOCK.entry.length === 4) {
    if (await pinOk(LOCK.entry)) return unlock();
    LOCK.fails++; LOCK.entry = '';
    if (LOCK.fails >= 5) LOCK.until = Date.now() + 30000 * Math.pow(2, Math.min(4, LOCK.fails - 5));
    lockScreen('Wrong PIN' + (LOCK.fails >= 3 ? ' (' + LOCK.fails + ' tries)' : ''));
  }
});
document.addEventListener('keydown', e => { if (!LOCK.on) return; if (/^\d$/.test(e.key)) $(`#lock [data-pin="${e.key}"]`)?.click(); else if (e.key === 'Backspace') $('#lock [data-pin="⌫"]')?.click(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (!LOCK.on) markActive(); }
  else if (hasPin() && Date.now() - (+LSX.get(ACTIVE_KEY) || 0) > LOCK_AFTER) lockNow();
});
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (!LOCK.on && hasPin()) markActive(); }, { passive: true }));
setInterval(() => { if (!LOCK.on && hasPin() && document.visibilityState === 'visible') markActive(); }, 60000);
/* opening the app: lock unless it was in use within the last 5 minutes */
if (hasPin() && Date.now() - (+LSX.get(ACTIVE_KEY) || 0) > LOCK_AFTER) { document.documentElement.classList.add('locked'); document.addEventListener('DOMContentLoaded', lockNow); if (document.readyState !== 'loading') lockNow(); }

function sheetLock() {
  const on = hasPin();
  openSheet(`<div class="s-head"><div><small>Security</small><h1>App lock</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <p class="hint">${on ? 'A PIN is set on this phone. The app locks when it has not been used for 5 minutes.' : 'Set a 4-digit PIN. The app will lock when it has not been used for 5 minutes. The PIN stays on this phone only; set one separately on each device.'}</p>
    <form id="pin_form" class="grp" style="gap:12px">
      ${on ? '<div class="field"><label for="pin_old">CURRENT PIN</label><input class="in pinin" id="pin_old" inputmode="numeric" maxlength="4" type="password" autocomplete="off" required></div>' : ''}
      <div class="two"><div class="field"><label for="pin_new">${on ? 'NEW PIN' : 'PIN'}</label><input class="in pinin" id="pin_new" inputmode="numeric" maxlength="4" type="password" autocomplete="off" ${on ? '' : 'required'}></div>
      <div class="field"><label for="pin_new2">AGAIN</label><input class="in pinin" id="pin_new2" inputmode="numeric" maxlength="4" type="password" autocomplete="off" ${on ? '' : 'required'}></div></div>
      <button class="save" type="submit">${on ? 'Change PIN' : 'Set PIN'}</button>
      ${on ? '<button type="button" class="ghost" data-pl="lock">Lock now</button><button type="button" class="ghost" data-pl="off" style="color:var(--red)">Turn off app lock</button>' : ''}
    </form>`);
  const read = id => ($('#' + id)?.value || '').trim();
  $('#pin_form').onsubmit = async e => {
    e.preventDefault();
    if (on && !(await pinOk(read('pin_old')))) return toast('Current PIN is wrong');
    const p = read('pin_new'); if (!/^\d{4}$/.test(p)) return toast('PIN must be 4 digits'); if (p !== read('pin_new2')) return toast('The two PINs do not match');
    if (/^(\d)\1{3}$|^1234$|^0000$/.test(p) && !confirm('This PIN is easy to guess. Use it anyway?')) return;
    await setPin(p); markActive(); closeSheet(); toast(on ? 'PIN changed' : 'App lock is on'); render();
  };
  $('#sheet-root').onclick = async e => { const b = e.target.closest('[data-pl]'); if (!b) return;
    if (b.dataset.pl === 'lock') { closeSheet(); lockNow(); return; }
    if (!(await pinOk(read('pin_old')))) return toast('Enter the current PIN first');
    LSX.del(PIN_KEY); closeSheet(); toast('App lock turned off'); render(); };
}

/* ================= Monthly offline backup ================= */
const OFF_KEY = 'cd.offbk';
const lastOffline = () => [LSX.get(OFF_KEY), S.data?.meta?.offlineBackup].filter(Boolean).sort().pop() || '';
const backupDue = () => !lastOffline() || (Date.now() - Date.parse(lastOffline())) > 30 * 864e5;
function rowsOf(list) { return list.length ? list : [{ '': '' }]; }
function fullWorkbook(ms) {
  const X = window.XLSX, wb = X.utils.book_new(), add = (name, rows) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rowsOf(rows)), name);
  add('Matters', ms.map(m => ({ 'Matter Ref.': mref(m), 'Client(s)': m.clients, 'Title': m.title, 'Category': (FORUMS[m.forum] || {}).label || '', "Hon'ble Court": m.court, 'Type': m.type, 'Case no.': m.caseNo, 'CNR': m.cnr, 'Filing no.': m.filingNo, 'Crime / FIR': m.crimeNo, 'P.S.': m.ps, 'Sections': m.sections, 'Appearing for': m.side, 'Status': m.status, 'Result': m.outcome, 'Next date': dmy(m.nextDate), 'Fixed for': m.purpose, 'Fees agreed': num(m.feeAgreed), 'Fees received': num(m.feeReceived), 'Mobile': m.phone, 'WhatsApp': m.whatsapp, 'Alternate': [m.altName, m.altPhone].filter(Boolean).join(' '), 'Folder': m.folderPath || m.folderName || '', 'Notes': m.notes })));
  add('Hearings', ms.flatMap(m => (m.hearings || []).map(h => ({ 'Matter Ref.': mref(m), 'Title': m.title, 'Date': dmy(h.date), 'What happened': h.happened, 'Next date': dmy(h.next), 'Fixed for': h.purpose, 'Note': h.note }))));
  add('Payments', ms.flatMap(m => (m.payments || []).map(p => ({ 'Matter Ref.': mref(m), 'Client(s)': m.clients, 'Date': dmy(p.date), 'Received (net)': num(p.amount), 'TDS': num(p.tds), 'Gross': num(p.amount) + num(p.tds), 'Mode': p.mode, 'Receipt': p.receiptNo, 'Note': p.note }))));
  add('Bills', ms.flatMap(m => (m.bills || []).map(b => ({ 'Bill No.': b.no, 'Date': dmy(b.date), 'Matter Ref.': mref(m), 'Client': (b.to || m.clients || '').split('\n')[0], 'Amount': num(b.total), 'Status': b.state || (billPaid(m, b) >= num(b.total) ? 'Paid' : billPaid(m, b) ? 'Part-paid' : 'Unpaid'), 'Reason': b.reason || '', 'Replaces / replaced by': [b.replaces, b.by].filter(Boolean).join(' / ') }))));
  add('Receipts', ms.flatMap(m => (m.receipts || []).map(r => ({ 'Receipt No.': r.no, 'Date': dmy(r.date), 'Matter Ref.': mref(m), 'From': r.from, 'Amount': num(r.amount), 'Bill': ((m.bills || []).find(b => b.id === r.billId) || {}).no || '', 'Status': r.state || 'Valid', 'Reason': r.reason || '' }))));
  add('Letters', ms.flatMap(m => (m.letters || []).map(l => ({ 'Ref.': l.no, 'Date': dmy(l.date), 'Matter Ref.': mref(m), 'Kind': l.kind, 'To': (l.to || '').split('\n')[0], 'Subject': l.subject, 'Status': l.state || 'Issued', 'Reason': l.reason || '' }))));
  add('Expenses', ms.flatMap(m => (typeof expList === 'function' ? expList(m) : []).map(x => ({ 'Matter Ref.': mref(m), 'Title': m.title, 'Date': dmy(x.date), 'Type': x.type, 'Paid to': x.to, 'Amount': num(x.amount), 'Borne by': x.bearer === 'client' ? 'Client (to recover)' : 'From my fee', 'Note': x.note }))));
  return wb;
}
async function offlineBackup() {
  if (!window.XLSX) return toast('Excel library still loading, try again in a moment');
  const JSZip = await loadJSZip(), z = new JSZip(), day = todayIso();
  z.file('SM Chambers data ' + day + '.json', JSON.stringify(S.data, null, 1));
  z.file('SM Chambers register ' + day + '.xlsx', XLSX.write(fullWorkbook(live().sort(byNo)), { bookType: 'xlsx', type: 'array' }));
  z.file('README.txt', 'SM Chambers — Saurabh Misra & Associates – Chambers\r\nBackup taken ' + dmy(day) + '.\r\n\r\nThe .xlsx file opens in Excel: matters, hearings, payments, bills, receipts, letters and expenses.\r\nThe .json file is the complete record; it can be put back by Claude if ever needed.\r\nKeep this file on a pen drive or another safe place.\r\n');
  const blob = await z.generateAsync({ type: 'blob' }), name = 'SM Chambers backup ' + day + '.zip';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  const now = new Date().toISOString(); LSX.set(OFF_KEY, now); change(d => { d.meta = d.meta || {}; d.meta.offlineBackup = now; });
  toast('Backup saved to Downloads: ' + name + '. Copy it to a pen drive.', 6000); render();
}

/* ================= Conflict check ================= */
const CF_NOISE = /\b(smt|shri|sri|sh|kumari|km|mr|mrs|ms|dr|m\/s|ms\.|messrs|the|and|anr|anrs|ors|others|another|through|thru|its|director|proprietor|partner|secretary|president|manager|son|s\/o|d\/o|w\/o|r\/o|of|pvt|private|ltd|limited|co|company|firm|llp|inc)\b\.?/gi;
const CF_GOV = /\b(state of u\.?\s*p\.?|state of uttar pradesh|union of india|state|govt|government|u\.?o\.?i\.?|lda|lmc|nagar nigam|police|sho|commissioner)\b/i;
function persons(s) {
  return String(s || '').split(/\s*(?:&|,|;|\band\b|\bthrough\b|\/)\s*/i).map(x => x.replace(/\(.*?\)/g, ' ').replace(CF_NOISE, ' ').replace(/[^a-zऀ-ॿ ]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(x => x.length > 2 && !CF_GOV.test(x));
}
function samePerson(a, b) {
  if (a === b) return true;
  const A = a.split(' '), B = b.split(' ');
  if (A.length < 2 || B.length < 2) return false;           // a single word (a surname) is never enough
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  return s.every(w => l.includes(w));
}
function sidesOf(m) {
  const pt = parties(m), ours = persons(m.clients);
  const f = persons(pt.first), sc = persons(pt.second);
  const hit = list => list.some(x => ours.some(o => samePerson(x, o)));
  if (!pt.second) return { ours, other: [] };
  return hit(sc) && !hit(f) ? { ours, other: f } : { ours, other: sc };
}
/* names: who the new matter is for, and who is on the other side */
function conflictHits(forNames, againstNames, skipId) {
  const F = persons(forNames), A = persons(againstNames), out = [];
  for (const m of (S.data.matters || [])) {
    if (m.id === skipId) continue;
    const sd = sidesOf(m), why = [];
    if (typeof aliasesOf === 'function') { const ak = aliasesOf(m.clients).flatMap(x => persons(x)); if (ak.length) sd.ours = [...sd.ours, ...ak]; }
    A.forEach(a => { if (sd.ours.some(o => samePerson(a, o))) why.push({ sev: 'red', t: `You acted FOR ${cap1(a)} in this matter; the new matter is against them.` }); });
    F.forEach(c => { if (sd.other.some(o => samePerson(c, o))) why.push({ sev: 'red', t: `Your new client ${cap1(c)} was on the OTHER side in this matter.` }); });
    A.forEach(a => { if (sd.other.some(o => samePerson(a, o))) why.push({ sev: 'info', t: `${cap1(a)} was on the other side here too.` }); });
    F.forEach(c => { if (sd.ours.some(o => samePerson(c, o))) why.push({ sev: 'ok', t: `Existing client: ${cap1(c)}.` }); });
    if (why.length) out.push({ m, why });
  }
  const rank = h => h.why.some(w => w.sev === 'red') ? 0 : h.why.some(w => w.sev === 'info') ? 1 : 2;
  return out.sort((x, y) => rank(x) - rank(y));
}
const cap1 = s => s.replace(/\b\w/g, c => c.toUpperCase());
function conflictHtml(hits) {
  if (!hits.length) return '<p class="hint" style="color:var(--dc-ink)">No conflict found in your matters.</p>';
  return `<div class="hist">${hits.map(({ m, why }) => `<div><b style="font-family:var(--mono);font-size:12px">${esc(mref(m))}</b><span><b style="font-family:inherit">${esc(m.title || m.clients)}</b>${m.deleted ? ' <small>(removed)</small>' : ''}<br>${why.map(w => `<span class="cf-${w.sev}">${esc(w.t)}</span>`).join('<br>')}<br><button class="linkbtn" data-act="open" data-id="${m.id}">Open</button></span></div>`).join('')}</div>`;
}
/* called by the new-matter form before saving; resolves true to go on */
function conflictGate(fd) {
  return new Promise(res => {
    const pt = parties({ title: fd.title, clients: fd.clients }), ours = persons(fd.clients);
    const firstOurs = persons(pt.first).some(x => ours.some(o => samePerson(x, o)));
    const against = pt.second ? (firstOurs ? pt.second : pt.first) : '';
    const hits = conflictHits(fd.clients, against);
    if (!hits.some(h => h.why.some(w => w.sev === 'red'))) return res(true);
    const box = document.createElement('div'); box.id = 'cf_over'; box.className = 'cf-over';
    box.innerHTML = `<div class="cf-card"><h2 style="margin:0 0 6px;color:var(--red)">Possible conflict of interest</h2><p class="hint" style="margin:0 0 10px">Checked ${esc(fd.clients)}${against ? ' against ' + esc(against) : ''} across all your matters.</p>${conflictHtml(hits.filter(h => h.why.some(w => w.sev !== 'ok')))}
      <div class="two" style="margin-top:14px"><button class="ghost" data-cf="back">Go back</button><button class="save" data-cf="go" style="margin:0">Add anyway</button></div></div>`;
    document.body.appendChild(box);
    box.onclick = e => { const b = e.target.closest('[data-cf]'); if (!b) return; box.remove(); res(b.dataset.cf === 'go'); };
  });
}
function sheetConflict() {
  openSheet(`<div class="s-head"><div><small>Before you take a matter</small><h1>Conflict check</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="cf_form" class="grp" style="gap:12px">
      <div class="field"><label for="cf_for">NEW CLIENT</label><input class="in" id="cf_for" placeholder="e.g. Ramesh Kumar Verma"></div>
      <div class="field"><label for="cf_ag">OTHER SIDE</label><input class="in" id="cf_ag" placeholder="e.g. Suresh Chandra Verma & Anr."></div>
      <button class="save" type="submit">Check all matters</button></form><div id="cf_out" style="margin-top:12px"></div>
    <p class="hint">Full names are matched (a surname alone is not enough), across all matters including closed and removed ones. State / Union of India are ignored.</p>`);
  $('#cf_form').onsubmit = e => { e.preventDefault(); const f = $('#cf_for').value, a = $('#cf_ag').value; if (!f.trim() && !a.trim()) return toast('Enter at least one name');
    $('#cf_out').innerHTML = conflictHtml(conflictHits(f, a)); };
}

/* Today: gentle reminders for the lock and the backup */
function guardCards() {
  const cards = [];
  if (!hasPin() && !(S.data?.meta?.noLockNag)) cards.push(`<section class="card ask-card"><b>Protect your chambers data</b><p class="hint" style="margin:4px 0 8px">Set a 4-digit PIN so nobody else can open client files, fees and bank details on this phone.</p><div class="two"><button class="act primary" data-act="lock">Set PIN</button><button class="ghost" data-act="nolocknag">Not now</button></div></section>`);
  if (backupDue() && live().length) cards.push(`<section class="card ask-card"><b>Monthly backup ${lastOffline() ? 'due (last ' + dmy(lastOffline().slice(0, 10)) + ')' : 'not taken yet'}</b><p class="hint" style="margin:4px 0 8px">Download all your records (Excel + data file) and keep them on a pen drive.</p><button class="act primary" data-act="offbackup" style="width:100%">Download backup</button></section>`);
  return cards.join('');
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="lock"],[data-act="offbackup"],[data-act="conflict"],[data-act="nolocknag"]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'lock') sheetLock(); else if (a === 'offbackup') offlineBackup().catch(er => toast('Backup failed: ' + er.message));
  else if (a === 'conflict') sheetConflict();
  else { change(d => { d.meta = d.meta || {}; d.meta.noLockNag = true; }); render(); }
});
