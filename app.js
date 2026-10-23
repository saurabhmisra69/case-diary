/* Case Diary — Step 1
   Sign-in with Microsoft, data kept in OneDrive\Case Diary, Home (today) and Record next date.
   Code only in this repository; all case data lives in the user's own OneDrive. */
'use strict';

const APP_VERSION = '1.8.0';
const CLIENT_ID = 'df289e5d-2a3c-4280-b4be-b440bfe8ea8b';
const SCOPES = ['User.Read', 'Files.ReadWrite', 'Calendars.ReadWrite'];
const DIARY_DIR = 'Case Diary';
const DATA_FILE = DIARY_DIR + '/diary.json';
const EXCEL_FILE = DIARY_DIR + '/Case Diary.xlsx';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const LS_DATA = 'cd.data', LS_DIRTY = 'cd.dirty', LS_ETAG = 'cd.etag', LS_SYNCED = 'cd.synced';

const FORUMS = {
  HC:       { label: 'High Court',        c: 'var(--hc)', soft: 'var(--hc-soft)', ink: 'var(--hc)' },
  District: { label: 'District courts',   c: 'var(--dc)', soft: 'var(--dc-soft)', ink: 'var(--dc-ink)' },
  Tribunal: { label: 'Tribunal (AFT/DRT/RERA)', c: 'var(--tr)', soft: 'var(--tr-soft)', ink: 'var(--tr-ink)' },
  Consumer: { label: 'Consumer commission', c: 'var(--co)', soft: 'var(--co-soft)', ink: 'var(--co-ink)' },
  Family:   { label: 'Family Court',      c: 'var(--fam)', soft: 'var(--fam-soft)', ink: 'var(--fam-ink)' },
  Revenue:  { label: 'Revenue court',     c: 'var(--rv)', soft: 'var(--rv-soft)', ink: 'var(--rv-ink)' },
  Advisory: { label: 'Advisory / Pre-litigation', c: 'var(--adv)', soft: 'var(--adv-soft)', ink: 'var(--adv-ink)' },
};
const TYPES = ['Complaint','FIR','Writ','482','Bail','ABA','Revision','Appeal','Suit','WS','Execution','DV','125','138 NI','Arbitration','AFT','Consumer','RERA','Mutation','Opinion','Notice','Deed'];
const STATUSES = ['Not filed', 'Filed – under objection', 'Pending', 'Admitted', 'Part-heard', 'Reserved', 'Proceedings stayed', 'Adjourned sine die', 'Decided', 'Abated', 'Withdrawn', 'Dismissed in default', 'Infructuous', 'Returned', 'Transferred', 'Consigned to record', 'Dropped / Closed'];
const OPEN_STATUSES = ['Not filed', 'Filed – under objection', 'Pending', 'Admitted', 'Part-heard', 'Reserved', 'Proceedings stayed', 'Adjourned sine die'];
const OUTCOMES = ['In our favour', 'Against us', 'Partly in our favour', 'Disposed of with directions', 'Compromise / settled', 'Remanded'];
const ADV_STATUSES = ['Instructions received', 'In progress', 'Draft / opinion sent', 'Legal notice sent – awaiting reply / instructions', 'Retainer – active', 'Retainer – on hold (payment awaited)', 'Advice given – completed', 'Closed – notice served its purpose', 'Retainer – expired / not renewed', 'Retainer – terminated', 'Dropped'];
const ADV_OPEN = ['Instructions received', 'In progress', 'Draft / opinion sent', 'Legal notice sent – awaiting reply / instructions', 'Retainer – active', 'Retainer – on hold (payment awaited)'];
const SHORT_ST = { 'Filed – under objection': 'Objection', 'Proceedings stayed': 'Stayed', 'Adjourned sine die': 'Sine die', 'Dismissed in default': 'Dismissed (default)', 'Consigned to record': 'Consigned', 'Dropped / Closed': 'Dropped',
  'Instructions received': 'Instructions', 'Draft / opinion sent': 'Draft sent', 'Legal notice sent – awaiting reply / instructions': 'Notice sent', 'Retainer – active': 'Retainer', 'Retainer – on hold (payment awaited)': 'On hold', 'Advice given – completed': 'Advised', 'Closed – notice served its purpose': 'Notice done', 'Retainer – expired / not renewed': 'Expired', 'Retainer – terminated': 'Terminated' };
const shortSt = s => SHORT_ST[s] || s || '';
const isRetainer = m => /^Retainer/.test(m.status || '') || !!m.retainer;
/* retainer reminders: next bill and renewal */
function retainerDue(m) {
  const r = m.retainer; if (!r || !r.from || !ADV_OPEN.includes(m.status || '')) return [];
  const out = [], t = todayIso(), every = +r.every || 3, n = +r.billed || 0;
  const next = addMonths(r.from, every * n);
  if ((!r.to || next <= r.to) && next <= addDays(t, 7)) out.push({ kind: 'bill', date: next, text: 'Raise bill ' + (n + 1) + (r.amount ? ' · ' + rupees(+r.amount) : '') });
  if (r.to && r.to <= addDays(t, 30)) out.push({ kind: 'renew', date: r.to, text: r.to < t ? 'Term ended ' + dmy(r.to) + ' · renewal?' : 'Term ends ' + dmy(r.to) + ' · raise renewal' });
  return out;
}
const statusList = m => m.forum === 'Advisory' ? ADV_STATUSES : STATUSES;
const isOpen = m => m.forum === 'Advisory' ? ADV_OPEN.includes(m.status || 'In progress') : OPEN_STATUSES.includes(m.status || 'Pending');
const HAPPENED = ['Adjourned','Evidence recorded','Heard','Reserved','Disposed','Not taken up'];
const FIXED_FOR = ['Hearing','Admission','Evidence','Cross-examination','Arguments','Orders','Reply / Objection','Framing of charge','313 statement','Judgment'];

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayIso = () => iso(new Date());
const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
const addMonths = (s, n) => { const d = parseIso(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d); };
const skipSunday = s => parseIso(s).getDay() === 0 ? addDays(s, 1) : s;
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOWL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dmy = s => s ? s.split('-').reverse().join('.') : '';
const short = s => { const d = parseIso(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
const rupees = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const cap = s => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const num = v => { const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; };

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

const I = {
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  wa: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
  plus: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  case: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  mic: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};

/* ---------- state ---------- */
const S = {
  account: null, name: '',
  data: null,            // { v, matters:[], updated }
  etag: localStorage.getItem(LS_ETAG) || '',
  dirty: localStorage.getItem(LS_DIRTY) === '1',
  syncing: false, syncErr: '', lastSynced: localStorage.getItem(LS_SYNCED) || '',
  tab: 'home', prevTab: 'home', mid: '', day: todayIso(), q: '', filter: 'pending',
};
const emptyData = () => ({ v: 1, matters: [], updated: 0 });
const live = () => (S.data?.matters || []).filter(m => !m.deleted);
/* the matter reference shown everywhere (the diary no. stays only as the internal key):
   SM/2026-013/C004-RDP in full, SM/2026-013 without a client code, 2026-013 in the small boxes */
const mrefBase = m => m ? (m.ref || ('SM/' + (+m.year ? m.year : 'OLD') + '-' + String(m.n).padStart(3, '0'))) : '';   // matters without a year: SM/OLD-016
const mref = m => m ? mrefBase(m) + (m.clientCode ? '/' + m.clientCode : '') : '';
const mrefBox = m => mrefBase(m).replace(/^SM\//, '');

function persistLocal() {
  try { localStorage.setItem(LS_DATA, JSON.stringify(S.data)); localStorage.setItem(LS_DIRTY, S.dirty ? '1' : '0'); } catch (e) {}
}
function change(fn) {
  fn(S.data); S.data.updated = Date.now(); S.dirty = true; persistLocal(); render(); scheduleSync();
}
function touch(m) { m.u = Date.now(); return m; }

/* ---------- Microsoft sign-in ---------- */
const redirectUri = location.origin + location.pathname.replace(/index\.html$/, '');
let msalApp;
async function initAuth() {
  msalApp = new msal.PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/consumers', redirectUri, navigateToLoginRequestUrl: false },
    cache: { cacheLocation: 'localStorage' },
  });
  await msalApp.initialize();
  const res = await msalApp.handleRedirectPromise().catch(e => { toast('Sign-in did not complete: ' + (e.errorMessage || e.message)); return null; });
  S.account = res?.account || msalApp.getAllAccounts()[0] || null;
  if (S.account) msalApp.setActiveAccount(S.account);
}
async function token() {
  try { return (await msalApp.acquireTokenSilent({ scopes: SCOPES, account: S.account })).accessToken; }
  catch (e) {
    if (e instanceof msal.InteractionRequiredAuthError) {
      // quiet renewal first (no typing); only if Microsoft insists, a quick redirect with the account already chosen
      try { return (await msalApp.ssoSilent({ scopes: SCOPES, loginHint: S.account?.username })).accessToken; } catch (_) {}
      await msalApp.acquireTokenRedirect({ scopes: SCOPES, account: S.account, loginHint: S.account?.username });
    }
    throw e;
  }
}
const signIn = () => msalApp.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
async function signOut() {
  if (S.dirty && !confirm('Some changes have not reached OneDrive yet. Sign out anyway?')) return;
  [LS_DATA, LS_DIRTY, LS_ETAG, LS_SYNCED].forEach(k => localStorage.removeItem(k));
  await msalApp.logoutRedirect({ account: S.account, postLogoutRedirectUri: redirectUri });
}

async function g(path, opts = {}) {
  const t = await token();
  const r = await fetch(path.startsWith('http') ? path : GRAPH + path, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  return r;
}
const drivePath = p => '/me/drive/root:/' + p.split('/').map(encodeURIComponent).join('/');

/* ---------- OneDrive sync ---------- */
function merge(local, remote) {
  const out = { v: 1, matters: [], updated: Math.max(local.updated || 0, remote.updated || 0) };
  const map = new Map();
  for (const m of remote.matters || []) map.set(m.id, m);
  for (const m of local.matters || []) { const r = map.get(m.id); if (!r || (m.u || 0) >= (r.u || 0)) map.set(m.id, m); }
  out.matters = [...map.values()];
  const fx = [...new Set([...(local.fixes || []), ...(remote.fixes || [])])]; if (fx.length) out.fixes = fx;
  const lm = local.meta || {}, rm = remote.meta || {}, meta = { ...rm, ...lm };
  for (const k of new Set([...Object.keys(lm), ...Object.keys(rm)])) if (/^seq:/.test(k)) meta[k] = Math.max(+lm[k] || 0, +rm[k] || 0);
  for (const k of ['juniors', 'library']) {   // lists kept on several devices: join them entry by entry
    if (!Array.isArray(lm[k]) && !Array.isArray(rm[k])) continue;
    const mp = new Map(); for (const x of [...(rm[k] || []), ...(lm[k] || [])]) { const o = mp.get(x.id); if (!o || (x.u || 0) >= (o.u || 0)) mp.set(x.id, x); }
    meta[k] = [...mp.values()];
  }
  if (Object.keys(meta).length) out.meta = meta;
  return out;
}
async function pull() {
  const meta = await g(drivePath(DATA_FILE));
  if (meta.status === 404) return null;
  if (!meta.ok) throw new Error('OneDrive ' + meta.status);
  const info = await meta.json();
  const body = await fetch(info['@microsoft.graph.downloadUrl']);
  if (!body.ok) throw new Error('Download ' + body.status);
  return { data: await body.json(), etag: info.eTag };
}
async function push() {
  const r = await g(drivePath(DATA_FILE) + ':/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(S.etag ? { 'If-Match': S.etag } : {}) },
    body: JSON.stringify(S.data),
  });
  if (r.status === 412 || r.status === 409) return false;
  if (!r.ok) throw new Error('Save ' + r.status);
  const info = await r.json(); S.etag = info.eTag; localStorage.setItem(LS_ETAG, S.etag);
  return true;
}
let syncTimer;
function scheduleSync(ms = 900) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }
async function sync() {
  if (S.syncing || !S.account) return;
  if (!navigator.onLine) { S.syncErr = 'offline'; renderSync(); return; }
  S.syncing = true; S.syncErr = ''; renderSync();
  try {
    const remote = await pull();
    if (remote) {
      if (remote.etag !== S.etag) { S.data = S.dirty ? merge(S.data, remote.data) : remote.data; S.etag = remote.etag; localStorage.setItem(LS_ETAG, S.etag); }
    } else { S.etag = ''; S.dirty = true; }
    if (S.dirty) {
      let ok = await push();
      if (!ok) { const again = await pull(); S.data = merge(S.data, again.data); S.etag = again.etag; ok = await push(); }
      if (!ok) throw new Error('OneDrive file changed; try again');
      S.dirty = false;
      writeExcel().catch(() => {});
      weeklyBackup().catch(() => {});
    }
    // an Outlook reminder that fails must not stop the diary from syncing
    try { await flushCalendar(); } catch (ce) { console.warn('calendar', ce); S.calErr = ce.message || 'Outlook reminder not set'; }
    S.lastSynced = new Date().toISOString(); localStorage.setItem(LS_SYNCED, S.lastSynced);
    persistLocal();
  } catch (e) { S.syncErr = e.message || 'error'; console.warn(e); }
  S.syncing = false; render();
  if (!S.syncErr) setTimeout(() => { typeof processInbox === 'function' && processInbox(); typeof runOneTimeFixes === 'function' && runOneTimeFixes(); }, 500);
}

async function writeExcel() {
  if (!window.XLSX) return;
  const ms = live().sort(byNo);
  const rows = ms.map(m => ({
    'Matter Ref.': mref(m), 'Client(s)': m.clients, 'Title': m.title, 'Forum': FORUMS[m.forum]?.label || '', 'Court': m.court,
    'Type': m.type, 'Case no.': m.caseNo, 'Crime / FIR no.': m.crimeNo, 'Police station': m.ps, 'Sections': m.sections,
    'Nature': m.nature, 'Appearing for': m.side, 'Status': m.status, 'Last date': dmy(m.lastDate), 'Next date': dmy(m.nextDate),
    'Fixed for': m.purpose, 'Item': m.item, 'Fees agreed': num(m.feeAgreed), 'Fees received': num(m.feeReceived),
    'Balance': Math.max(0, num(m.feeAgreed) - num(m.feeReceived)), 'CNR': m.cnr || '', 'Filing no.': m.filingNo || '', 'Client phone': m.phone, 'WhatsApp': m.whatsapp || '', 'Alternate contact': [m.altName, m.altPhone].filter(Boolean).join(' '), 'Deadline': dmy(m.deadline), 'Deadline for': m.deadlineFor, 'OneDrive folder': m.folderPath || '', 'Notes': m.notes,
  }));
  const hist = [];
  for (const m of ms) for (const h of (m.hearings || [])) hist.push({ 'Matter Ref.': mref(m), 'Title': m.title, 'Date': dmy(h.date), 'What happened': h.happened, 'Next date': dmy(h.next), 'Fixed for': h.purpose, 'Note': h.note });
  const pays = [];
  for (const m of ms) for (const p of (m.payments || [])) pays.push({ 'Matter Ref.': mref(m), 'Client(s)': m.clients, 'Title': m.title, 'Date': dmy(p.date), 'Amount': num(p.amount), 'Mode': p.mode, 'Note': p.note });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Matter Ref.': '' }]), 'Matters');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hist.length ? hist : [{ 'Matter Ref.': '' }]), 'Hearings');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pays.length ? pays : [{ 'Matter Ref.': '' }]), 'Fee payments');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await g(drivePath(EXCEL_FILE) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: buf });
}
async function weeklyBackup() {
  const last = localStorage.getItem('cd.backup') || '';
  if (last && (Date.now() - Date.parse(last)) < 7 * 864e5) return;
  const r = await g(drivePath(DIARY_DIR + '/Backups/diary ' + todayIso() + '.json') + ':/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S.data) });
  if (r.ok) localStorage.setItem('cd.backup', new Date().toISOString());
}

/* Outlook reminders: an all-day entry on the hearing date, alert at 7 pm the evening before */
async function flushCalendar() {
  for (const m of live().filter(x => x.calPending)) {
    try {
      if (!m.nextDate || !isOpen(m)) {
        if (m.eventId) await g('/me/events/' + m.eventId, { method: 'DELETE' });
        m.eventId = ''; m.calPending = false; touch(m); S.dirty = true; continue;
      }
      const ev = {
        subject: 'Court: ' + m.title + (m.caseNo ? ' (' + m.caseNo + ')' : ''),
        body: { contentType: 'text', content: [m.court, m.purpose ? 'Fixed for: ' + m.purpose : '', m.item ? 'Item ' + m.item : '', 'Matter ref. ' + mref(m)].filter(Boolean).join('\n') },
        isAllDay: true, showAs: 'free',
        start: { dateTime: m.nextDate + 'T00:00:00', timeZone: 'India Standard Time' },
        end: { dateTime: addDays(m.nextDate, 1) + 'T00:00:00', timeZone: 'India Standard Time' },
        isReminderOn: true, reminderMinutesBeforeStart: 300,
        categories: ['SM Chambers'],
      };
      let r = m.eventId ? await g('/me/events/' + m.eventId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) }) : null;
      if (!r || r.status === 404) r = await g('/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
      if (r.ok) { const j = await r.json(); m.eventId = j.id; m.calPending = false; touch(m); S.dirty = true; }
    } catch (e) { console.warn('calendar', e); }
  }
  if (S.dirty) { persistLocal(); scheduleSync(1500); }
}

/* ---------- matter helpers ---------- */
const byNo = (a, b) => (a.year - b.year) || (a.n - b.n);
function nextNumber(year) { return Math.max(0, ...live().filter(m => m.year === year).map(m => m.n)) + 1; }
const forumOf = m => FORUMS[m.forum] || FORUMS.District;
const needsDate = m => m.forum !== 'Advisory' && (m.status === 'Pending') && (!m.nextDate || m.nextDate < todayIso());
const feeDue = m => Math.max(0, num(m.feeAgreed) - num(m.feeReceived));
const onDay = day => live().filter(m => m.nextDate === day && isOpen(m));
const doneOn = day => live().filter(m => (m.hearings || []).some(h => h.date === day));
/* record of changes made to a matter (shown under Hearing history) */
function logChange(m, text) {
  const now = new Date(), stamp = todayIso() + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  m.changes = (m.changes || []).concat([{ at: stamp, t: text }]).slice(-60);
}
const FIELD_NAMES = { email: 'Email', clientCode: 'Client code', title: 'Title', clients: 'Client', forum: 'Category', court: "Hon'ble Court", type: 'Type', caseNo: 'Case no.', crimeNo: 'Crime no.', cnr: 'CNR', filingNo: 'Filing no.', ps: 'Police station', sections: 'Sections', side: 'Appearing for', nextDate: 'Next date', item: 'Item', purpose: 'Fixed for', status: 'Status', outcome: 'Result', feeAgreed: 'Fees agreed', feeReceived: 'Fees received', phone: 'Mobile', whatsapp: 'WhatsApp', altName: 'Alternate contact', altPhone: 'Alternate mobile', deadline: 'Deadline', notes: 'Notes' };
function logDiff(m, before, after, how) {
  const bits = [];
  for (const k of Object.keys(FIELD_NAMES)) {
    if (!(k in after)) continue;
    const o = String(before[k] ?? ''), n = String(after[k] ?? '');
    if (o === n) continue;
    const show = v => /Date$|deadline/.test(k) && /^\d{4}-/.test(v) ? dmy(v) : (k === 'forum' && FORUMS[v] ? FORUMS[v].label : v);
    bits.push(k === 'notes' ? 'Notes edited' : FIELD_NAMES[k] + ': ' + (o ? show(o) : '—') + ' → ' + (n ? show(n) : '—'));
  }
  if (bits.length) logChange(m, bits.join('; ') + (how ? ' (' + how + ')' : ''));
}
/* keep every listing: when a matter's next date is replaced, the old date goes into Hearing history */
function logListing(m, oldDate, newDate, how) {
  if (!oldDate || oldDate === newDate || oldDate > todayIso()) return;
  m.hearings = m.hearings || [];
  const ex = m.hearings.find(h => h.date === oldDate); if (ex) { if (!ex.next && newDate) ex.next = newDate; return; }
  m.hearings.push({ date: oldDate, happened: 'Listed', next: newDate || '', purpose: m.purpose || '', item: m.item || '', court: m.court || '', note: how || '' });
  m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  if (!m.lastDate || oldDate > m.lastDate) m.lastDate = oldDate;
}
function logPast(m, date, how) {
  if (!date || date > todayIso()) return;
  m.hearings = m.hearings || [];
  if (m.hearings.some(h => h.date === date)) return;
  m.hearings.push({ date, happened: 'Listed', note: how || '' });
  m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
}
/* matters entered more than once: same CNR, or same case no./year in the same forum, or same title with no case no. */
function dupKeys(m) {
  const ks = [];
  if (m.cnr) ks.push('cnr:' + m.cnr.toUpperCase());
  const d = String(m.caseNo || '').match(/(\d+)\s*(?:\/|of|-)\s*(\d{2,4})/i);
  if (d) { let y = d[2]; if (y.length === 2) y = '20' + y; ks.push('no:' + (m.forum || '') + ':' + (+d[1]) + '/' + y); }
  else if (m.title) ks.push('t:' + (m.forum || '') + ':' + m.title.toLowerCase().replace(/[^a-z0-9]+/g, ''));
  return ks;
}
let dupCache = null, dupStamp = '';
function dupsOf(m) {
  const stamp = (S.data?.updated || 0) + ':' + live().length;
  if (dupStamp !== stamp) {
    dupStamp = stamp; dupCache = new Map(); const by = new Map();
    for (const x of live()) for (const k of dupKeys(x)) { if (!by.has(k)) by.set(k, []); by.get(k).push(x); }
    for (const list of by.values()) if (list.length > 1) for (const x of list) { const s = dupCache.get(x.id) || new Set(); list.forEach(y => y.id !== x.id && s.add(y)); dupCache.set(x.id, s); }
    // possible copies: same parties (allowing a spelling slip) where one has no case no., or the numbers match
    const STOP = /^(state|thru|through|prin|secy|home|deptt|civil|secrt|lucknow|govt|government|another|others|other|and|smt|shri|versus|pvt|ltd|private|limited|the|with|anr|ors)$/;
    const toks = x => new Set(String(x.title || x.clients || '').toLowerCase().replace(/u\.?p\.?|m\/s|dr\./g, ' ').split(/[^a-z\u0900-\u097f]+/).filter(w => w.length >= 4 && !STOP.test(w)));
    const key = x => { const d = String(x.caseNo || '').match(/(\d+)\s*(?:\/|of|-)\s*(\d{2,4})/i); return d ? (+d[1]) + '/' + (d[2].length === 2 ? '20' + d[2] : d[2]) : ''; };
    const L = live().filter(x => !x.deleted), T = new Map(L.map(x => [x.id, toks(x)]));
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const p = L[i], q = L[j];
      if (p.forum && q.forum && p.forum !== q.forum) continue;
      const kp = key(p), kq = key(q); if (kp && kq && kp !== kq) continue;
      if (p.cnr && q.cnr && p.cnr !== q.cnr) continue;
      const A = T.get(p.id), B = T.get(q.id); if (A.size < 2 || B.size < 2) continue;
      let shared = 0; A.forEach(w => { if (B.has(w)) shared++; });
      if (shared >= 2 && shared / (A.size + B.size - shared) >= 0.6) {
        for (const [x, y] of [[p, q], [q, p]]) { const s = dupCache.get(x.id) || new Set(); s.add(y); dupCache.set(x.id, s); }
      }
    }
  }
  return [...(dupCache.get(m.id) || [])];
}
const dupStar = m => dupsOf(m).length ? '<span class="dupstar" title="Entered more than once">★</span> ' : '';
const waOf = m => phoneDigits(m.whatsapp) || phoneDigits(m.phone);
function phoneDigits(p) { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; if (d.length === 11 && d[0] === '0') d = '91' + d.slice(1); return d.length >= 11 ? d : ''; }
function matches(m, q) {
  q = q.toLowerCase().trim(); if (!q) return true;
  const hay = [m.no, mref(m), m.title, m.clients, ...(typeof aliasesOf === 'function' ? aliasesOf(m.clients) : []), m.caseNo, m.crimeNo, m.ps, m.court, m.sections, m.type, m.side, m.item, m.cnr, m.filingNo, m.phone, m.whatsapp, m.altPhone, m.altName, m.folderName, m.purpose, m.notes].join(' ').toLowerCase();
  const flat = s => s.replace(/[^a-z0-9\u0900-\u097f]/g, ''), hayFlat = flat(hay);
  // every word must match; "2787/2024", "2787-2024" and "27872024" all find the same case
  return q.split(/\s+/).every(w => hay.includes(w) || (flat(w) && hayFlat.includes(flat(w))));
}

/* ---------- rendering ---------- */
function render() {
  if (!S.account) return renderSignIn();
  const V = window.VIEWS && window.VIEWS[S.tab];
  const html = V ? V() : S.tab === 'home' ? viewHome() : S.tab === 'matters' ? viewMatters() : S.tab === 'matter' && find(S.mid) ? viewMatter(find(S.mid)) : viewMore();
  $('#app').innerHTML = html + navHtml();
  renderSync();
}
function renderSignIn() {
  $('#app').innerHTML = `<section class="signin">
    <div class="logo-big" style="background:#F7F5F0"><svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true"><rect x="132" y="96" width="248" height="320" rx="14" fill="#1B2A4A"/><rect x="132" y="96" width="34" height="320" rx="10" fill="#7A2E2E"/><rect x="196" y="150" width="152" height="6" fill="#B08D57"/><rect x="196" y="352" width="152" height="6" fill="#B08D57"/><g fill="none" stroke="#D9BD8A" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M272 200v112M244 312h56M222 220h100"/><path d="M222 220l-20 46h40zM322 220l-20 46h40z"/></g></svg></div>
    <h1>SM Chambers</h1><p style="margin:-4px 0 10px;font-weight:700">Saurabh Misra &amp; Associates – Chambers</p>
    <p>Your matters, dates and fees, kept in your own OneDrive and the same on phone and computer.</p>
    <button class="btn-big" data-act="signin">Sign in with Microsoft</button>
    <p style="font-size:12px">Use the Microsoft account that holds your case folders. Your records are saved in your own OneDrive (SM Chambers data).</p>
  </section>`;
}
function syncLabel() {
  if (S.syncing) return ['wait', 'Saving to OneDrive…'];
  if (S.syncErr === 'offline') return ['wait', S.dirty ? 'Offline · changes waiting' : 'Offline'];
  if (S.syncErr) return ['err', 'Not synced · tap to retry'];
  if (S.dirty) return ['wait', '1 change waiting to sync'];
  if (S.lastSynced) { const d = new Date(S.lastSynced); return ['', 'Synced ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })]; }
  return ['wait', 'Connecting…'];
}
function renderSync() {
  const b = $('#syncbtn'); if (!b) return;
  const [cls, txt] = syncLabel(); b.className = 'sync ' + cls; b.innerHTML = '<span class="dot"></span>' + esc(txt);
}
function navHtml() {
  const t = (k, icon, label) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${icon}${label}</button>`;
  return `<button class="fab" aria-label="Add matter" data-act="add">${I.plus}</button>
  <nav class="nav" aria-label="Main">${t('home', I.home, 'Today')}${t('calendar', I.cal || '', 'Calendar')}${t('matters', I.case, 'Matters')}${t('clients', I.people || '', 'Clients')}${t('more', I.more, 'More')}</nav>`;
}
function weekDays() {
  const out = []; let d = todayIso();
  while (out.length < 6) { if (parseIso(d).getDay() !== 0) out.push(d); d = addDays(d, 1); }
  return out;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

function viewHome() {
  const now = new Date();
  const days = weekDays();
  const deadlines = live().filter(m => m.deadline && !m.deadlineDone && m.deadline <= addDays(todayIso(), 7)).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const week = days.map(d => {
    const n = onDay(d).length, due = deadlines.some(m => m.deadline === d);
    const d0 = parseIso(d);
    return `<button class="day ${d === S.day ? 'on' : ''}" data-act="day" data-day="${d}"><span>${DOW[d0.getDay()]}</span><b>${d0.getDate()}</b><span class="${due && d !== S.day ? 'due' : ''}">${n ? n + (d === S.day ? (n === 1 ? ' case' : ' cases') : '') : (due ? 'due' : '—')}</span></button>`;
  }).join('');

  const list = onDay(S.day), done = doneOn(S.day).filter(m => !list.includes(m));
  const fees = live().reduce((s, m) => s + feeDue(m), 0), feeClients = live().filter(m => feeDue(m) > 0).length;
  const need = live().filter(needsDate);
  const pending = live().filter(m => m.status === 'Pending' || m.status === 'Reserved');

  return `<header class="top">
    <div class="top-row">
      <div class="who"><span class="mark"><svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true"><rect x="132" y="96" width="248" height="320" rx="14" fill="#1B2A4A"/><rect x="132" y="96" width="34" height="320" rx="10" fill="#7A2E2E"/><rect x="196" y="150" width="152" height="6" fill="#B08D57"/><rect x="196" y="352" width="152" height="6" fill="#B08D57"/><g fill="none" stroke="#D9BD8A" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M272 200v112M244 312h56M222 220h100"/><path d="M222 220l-20 46h40zM322 220l-20 46h40z"/></g></svg></span><div><small>${DOWL[now.getDay()]}, ${now.getDate()} ${MONL[now.getMonth()]}</small><b>${esc(greeting())}${S.name ? ', ' + esc(S.name) : ''}</b></div></div>
      <button id="syncbtn" class="sync" data-act="sync"></button>
    </div>
    <div style="display:flex;gap:8px;align-items:stretch"><label class="search" style="flex:1">${I.search}<input type="search" placeholder="Case no., FIR, party, client" data-act="q" value="${esc(S.q)}" enterkeyhint="search"></label><button class="micbtn" data-act="voice" aria-label="Speak a next date">${I.mic}</button></div>
    <div class="week">${week}</div>
  </header>
  <main class="home-main">
    ${typeof guardCards === 'function' ? guardCards() : ''}
    ${typeof limitsToday === 'function' ? limitsToday() : ''}
    ${typeof tasksToday === 'function' ? tasksToday() : ''}
    ${briefHtml(list, deadlines, fees)}
    ${(() => { const rr = live().flatMap(m => retainerDue(m).map(x => ({ m, ...x }))); return rr.length ? `<section class="list"><div class="h2"><h2>Retainers</h2></div>${rr.map(x => `<button class="card row" data-act="open" data-id="${x.m.id}"><div class="item sm" style="background:var(--adv)"><small>${x.kind === 'bill' ? 'BILL' : 'TERM'}</small><b>${dmy(x.date).slice(0, 5)}</b></div><span class="m-col"><span class="m-title">${esc(x.m.title || x.m.clients)}</span><span class="m-meta">${esc(x.text)}</span></span></button>`).join('')}</section>` : ''; })()}
    <section class="list a-list">
      <div class="h2"><h2>${S.day === todayIso() ? 'Today in court' : 'In court · ' + DOWL[parseIso(S.day).getDay()] + ' ' + short(S.day)}</h2><button class="linkbtn" data-act="causelist" data-day="${S.day}">Cause list ↓</button></div>
      ${list.length && S.day <= todayIso() ? `<button class="save" data-act="results" data-day="${S.day}" style="min-height:50px;font-size:15px">Court over? Enter next dates for all ${list.length}</button>` : ''}
      ${list.length ? groupByCourt(list).map(([court, ms]) => {
        const f = forumOf(ms[0]);
        return `<span class="court-tag" style="background:${f.soft};color:${f.ink}">${esc(court)}${ms.length > 1 ? ' · ' + ms.length + ' matters' : ''}</span>` + ms.map(matterCard).join('');
      }).join('') : `<div class="card empty">${live().length ? 'Nothing listed for this day.' : 'No matters yet. Tap <b>+</b> to add your first matter.'}</div>`}
      ${done.map(doneRow).join('')}
    </section>
    <section class="tiles a-tiles">
      <button class="tile" style="background:var(--red-soft)" data-act="filter" data-f="deadline"><span style="color:var(--red-ink)">Deadlines</span><b style="color:var(--red-ink)">${deadlines.length}</b><span>${deadlines[0] ? esc(deadlines[0].deadlineFor || 'Due') + ' · ' + short(deadlines[0].deadline) : 'None this week'}</span></button>
      <button class="tile" style="background:var(--saffron-soft)" data-act="filter" data-f="fees"><span style="color:var(--saffron-ink)">Fees pending</span><b style="color:var(--saffron-ink)">${rupees(fees)}</b><span>${feeClients} matter${feeClients === 1 ? '' : 's'}</span></button>
      <button class="tile" style="background:var(--hc-soft)" data-act="filter" data-f="need"><span style="color:var(--hc)">Need a date</span><b style="color:var(--hc)">${need.length}</b><span>Date passed or blank</span></button>
      <button class="tile" style="background:var(--dc-soft)" data-act="filter" data-f="pending"><span style="color:var(--dc-ink)">Pending matters</span><b style="color:var(--dc-ink)">${pending.length}</b><span>Including reserved</span></button>
      <button class="tile wide" style="background:var(--hc-soft)" data-act="tab" data-tab="limit"><span style="color:var(--hc)">Limitation</span><b style="color:var(--hc);font-size:19px">Calculate last date</b><span>Appeal, revision, review, s.34, NI Act and more</span></button>
    </section>
  </main>`;
}
function groupByCourt(ms) {
  const order = ['HC', 'Tribunal', 'Consumer', 'Family', 'District', 'Revenue', 'Advisory'];
  const map = new Map();
  [...ms].sort((a, b) => (order.indexOf(a.forum) - order.indexOf(b.forum)) || (num(a.item) - num(b.item))).forEach(m => {
    const k = m.court || forumOf(m).label; if (!map.has(k)) map.set(k, []); map.get(k).push(m);
  });
  return [...map.entries()];
}
function briefHtml(list, deadlines, fees) {
  if (!live().length) return '';
  const parts = [];
  const isToday = S.day === todayIso();
  if (list.length) {
    const courts = groupByCourt(list).map(([c]) => c);
    parts.push(`<b>${list.length}</b> matter${list.length > 1 ? 's' : ''} ${isToday ? 'today' : 'on ' + short(S.day)}${courts.length > 1 ? ' in ' + courts.length + ' courts' : ' in ' + esc(courts[0])}.` + (courts.length > 1 ? ` Start at <b style="color:var(--hc)">${esc(courts[0])}</b>.` : ''));
  } else parts.push(isToday ? 'No matters listed today.' : 'No matters listed on ' + short(S.day) + '.');
  if (deadlines.length) parts.push(`${esc(deadlines[0].deadlineFor || 'A deadline')} in ${esc(deadlines[0].title)} is due <b style="color:var(--red)">${deadlines[0].deadline <= todayIso() ? 'today or overdue' : DOWL[parseIso(deadlines[0].deadline).getDay()]}</b>.`);
  if (fees > 0) parts.push(`${rupees(fees)} in fees is pending.`);
  return `<section class="card brief a-brief"><div style="display:flex;align-items:center;gap:8px"><span class="icon-chip">${I.sun}</span><h2 style="margin:0;font-family:var(--head);font-size:17px">Your day at a glance</h2></div><p>${parts.join(' ')}</p></section>`;
}
function itemBox(m) {
  const f = forumOf(m);
  return m.item ? `<div class="item" style="background:${f.c}"><small>ITEM</small><b>${esc(m.item)}</b></div>` : `<div class="item sm" style="background:${f.c}"><small>REF.</small><b>${esc(mrefBox(m))}</b></div>`;
}
function metaLine(m) { return [m.caseNo ? (m.type ? m.type + ' ' : '') + m.caseNo : m.type, m.crimeNo ? 'FIR ' + m.crimeNo + (m.ps ? ', PS ' + m.ps : '') : '', m.side ? 'for ' + m.side : ''].filter(Boolean).join(' · '); }
function matterCard(m) {
  const wa = waOf(m);
  return `<article class="card matter">
    <div class="m-top">${itemBox(m)}<div class="m-col" data-act="open" data-id="${m.id}" style="cursor:pointer">
      <span class="m-title">${dupStar(m)}${esc(m.title || m.clients)}</span>
      <span class="m-meta">${esc(metaLine(m))}</span>
      ${m.purpose ? `<span class="purpose">For: ${esc(m.purpose)}</span>` : ''}
    </div></div>
    <div class="acts">
      <button class="act primary" data-act="record" data-id="${m.id}">Next date</button>
      <button class="act blue" data-act="open" data-id="${m.id}">${I.folder}${m.folderId ? 'Files' : 'Details'}</button>
      <button class="act wa" data-act="wa" data-id="${m.id}" ${wa ? '' : 'disabled title="Add client phone first"'}>${I.wa}Client</button>
    </div>
  </article>`;
}
function doneRow(m) {
  const h = (m.hearings || []).filter(x => x.date === S.day).slice(-1)[0];
  return `<button class="card row" data-act="open" data-id="${m.id}">${itemBox(m)}<span class="m-col"><span class="m-title">${esc(m.title)}</span><span class="m-meta">${esc(h.happened)}${h.next ? ' · next ' + dmy(h.next) : ''}</span></span><span class="done-pill">Done</span></button>`;
}

function viewMatters() {
  const f = S.filter;
  const tests = {
    pending: m => isOpen(m),
    need: needsDate,
    deadline: m => m.deadline && !m.deadlineDone,
    fees: m => feeDue(m) > 0,
    HC: m => m.forum === 'HC', District: m => m.forum === 'District', Tribunal: m => m.forum === 'Tribunal', Consumer: m => m.forum === 'Consumer', Revenue: m => m.forum === 'Revenue', Advisory: m => m.forum === 'Advisory',
    decided: m => !isOpen(m),
    dups: m => dupsOf(m).length > 0,
    all: () => true,
  };
  const ms = live().filter(tests[f] || tests.all).filter(m => !S.stf || (m.status || 'Pending') === S.stf).filter(m => matches(m, S.q))
    .sort((a, b) => f === 'deadline' ? a.deadline.localeCompare(b.deadline) : ((a.nextDate || '9999').localeCompare(b.nextDate || '9999') || byNo(b, a)));
  const chip = (k, l) => `<button class="${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`;
  return `<header class="phead">
    <div class="top-row"><h1>Matters</h1><button id="syncbtn" class="sync" data-act="sync"></button></div>
    <label class="search">${I.search}<input type="search" placeholder="Search matters" data-act="q" value="${esc(S.q)}"></label>
    <div class="filters">${chip('pending', 'Pending')}${chip('need', 'Need a date')}${chip('deadline', 'Deadlines')}${chip('fees', 'Fees due')}${chip('HC', 'High Court')}${chip('District', 'District')}${chip('Tribunal', 'Tribunals')}${chip('Consumer', 'Consumer')}${chip('Revenue', 'Revenue')}${chip('Advisory', 'Advisory / Pre-litigation')}${live().some(m => dupsOf(m).length) ? chip('dups', '<span class="dupstar">★</span> Duplicates') : ''}${chip('decided', 'Decided / closed')}${chip('all', 'All')}</div>
  </header>
  <main><div class="list">
    <div class="h2"><span class="sub">${ms.length} matter${ms.length === 1 ? '' : 's'}${S.stf ? ' · ' + esc(S.stf) + ' <button class="linkbtn" data-act="filter" data-f="' + f + '">clear</button>' : ''}</span><button class="linkbtn" data-act="cats">Categories</button></div>
    ${ms.length ? ms.map(m => {
      const fo = forumOf(m), late = needsDate(m);
      const right = f === 'fees' ? rupees(feeDue(m)) : f === 'deadline' ? dmy(m.deadline) : (m.nextDate ? dmy(m.nextDate) : shortSt(m.status));
      return `<button class="card row" data-act="open" data-id="${m.id}">
        <div class="item sm" style="background:${fo.c}"><small>REF.</small><b>${esc(mrefBox(m))}</b></div>
        <span class="m-col"><span class="m-title">${dupStar(m)}${esc(m.title || m.clients)}</span><span class="m-meta">${esc([m.court, metaLine(m)].filter(Boolean).join(' · '))}</span></span>
        <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${late ? 'var(--red)' : 'var(--muted)'};text-align:right">${esc(right)}</span>
      </button>`;
    }).join('') : `<div class="card empty">No matters here.</div>`}
  </div></main>`;
}

function viewMore() {
  const n = live().length;
  return `<header class="phead"><div class="top-row"><h1>More</h1><button id="syncbtn" class="sync" data-act="sync"></button></div></header>
  <main><div class="menu">
    <div class="card"><b style="display:block;font-size:17px">Saurabh Misra &amp; Associates – Chambers</b><small style="color:var(--muted)">SM Chambers</small><div class="kv" style="margin-top:10px"><span>Signed in as</span><b>${esc(S.account?.username || '')}</b><span>Matters</span><b>${n}</b><span>Saved in</span><b>OneDrive › SM Chambers data</b><span>Version</span><b>${APP_VERSION}</b></div></div>
    ${typeof langSwitch === 'function' ? langSwitch() : ''}
    <button data-act="dashboard">Practice dashboard <small>matters, results, income</small></button>
    <button data-act="tab" data-tab="fees">Fees <small>dues and payments</small></button>
    <button data-act="causelist" data-day="${S.day}">Cause list in Word <small>on your letterhead</small></button>
    <button data-act="lock">App lock <small>${typeof hasPin === 'function' && hasPin() ? 'PIN set · locks after 5 min' : 'set a PIN'}</small></button>
    <button data-act="offbackup">Download full backup <small>${typeof lastOffline === 'function' && lastOffline() ? 'last ' + dmy(lastOffline().slice(0, 10)) : 'Excel + data file, for a pen drive'}</small></button>
    <button data-act="jtasks">Juniors &amp; tasks <small>open tasks, your juniors</small></button>
    <button data-act="codes">Client codes <small>client number + initials, e.g. C004-RDP</small></button>
    <button data-act="acts">Bare Acts <small>official text, searchable, offline</small></button>
    <button data-act="library">Judgment library <small>your own judgments, searchable</small></button>
    <button data-act="templates">My templates <small>made from your past drafts</small></button>
    <button data-act="conflict">Conflict check <small>before taking a new matter</small></button>
    <button data-act="paper">Paper size <small>A4 or Legal for each kind of document</small></button>
    <button data-act="tab" data-tab="limit">Limitation calculator <small>last date to file</small></button>
    <label class="menu-file"><input type="file" accept=".json,application/json" data-act="updfile" hidden><b>Apply update from Claude</b><small>pick the update file you downloaded</small></label>
    <button data-act="aikey">Order reading <small>${aiKey() ? 'key saved on this device' : 'add your API key'}</small></button>
    <button data-act="tab" data-tab="sort">Sort old folders <small>moves from the Folder Sorting Sheet</small></button>
    <button data-act="sync">Sync now <small>${esc(syncLabel()[1])}</small></button>
    <button data-act="openfolder">Open SM Chambers data in OneDrive <small>data file, Excel copy, backups</small></button>
    <button data-act="openexcel">Open Excel copy <small>refreshed after every save</small></button>
    <button data-act="install">Install on this device <small>home-screen app</small></button>
    <button data-act="signout" style="color:var(--red)">Sign out</button>
  </div></main>`;
}

/* ---------- sheets ---------- */
function openSheet(html) {
  $('#sheet-root').innerHTML = `<div class="scrim" data-act="scrim"><section class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${html}</section></div>`;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet-root').innerHTML = ''; document.body.style.overflow = ''; }
const find = id => live().find(m => m.id === id);

function sheetDetail(m) {
  const f = forumOf(m);
  const row = (k, v) => v ? `<span>${k}</span><b>${esc(v)}</b>` : '';
  const hist = [...(m.hearings || [])].reverse();
  openSheet(`<div class="s-head"><div><small style="color:${f.ink}">${esc(mref(m))} · ${esc(m.court || f.label)}</small><h1>${esc(m.title || m.clients)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="kv">${row('Client(s)', m.clients)}${row('Status', m.status)}${row('Type', m.type)}${row('Case no.', m.caseNo)}${row('Crime / FIR', m.crimeNo)}${row('Police station', m.ps)}${row('Sections', m.sections)}${row('Nature', m.nature)}${row('Appearing for', m.side)}${row('Last date', dmy(m.lastDate))}${row('Next date', dmy(m.nextDate))}${row('Fixed for', m.purpose)}${row('Item', m.item)}${row('Deadline', m.deadline ? dmy(m.deadline) + (m.deadlineFor ? ' · ' + m.deadlineFor : '') + (m.deadlineDone ? ' (done)' : '') : '')}${row('Fees', m.feeAgreed ? rupees(m.feeAgreed) + ' agreed · ' + rupees(m.feeReceived) + ' received' : '')}${row('Client phone', m.phone)}${row('Notes', m.notes)}</div>
    <div class="acts" style="grid-template-columns:1fr 1fr 1fr"><button class="act primary" data-act="record" data-id="${m.id}">Next date</button><button class="act blue" data-act="edit" data-id="${m.id}">Edit</button><button class="act wa" data-act="wa" data-id="${m.id}" ${waOf(m) ? '' : 'disabled'}>${I.wa}Client</button></div>
    ${m.deadline && !m.deadlineDone ? `<button class="ghost" data-act="deadlinedone" data-id="${m.id}">Mark deadline as done</button>` : ''}
    <div class="grp"><span class="lbl">Hearing history</span>${hist.length ? `<div class="hist">${hist.map(h => `<div><b>${dmy(h.date)}</b><span><b style="font-family:inherit">${esc(h.happened)}</b>${h.next ? ' → ' + dmy(h.next) : ''}${h.purpose ? ' · ' + esc(h.purpose) : ''}${h.note ? '<br><span style="color:var(--muted)">' + esc(h.note) + '</span>' : ''}</span></div>`).join('')}</div>` : '<span style="color:var(--muted);font-size:14px">No hearings recorded yet.</span>'}</div>`);
}

function sheetEdit(m) {
  const isNew = !m;
  const y = new Date().getFullYear();
  m = m || { year: y, forum: 'HC', status: 'Pending', nature: 'Criminal' };
  const opt = (arr, v) => (v && !arr.includes(v) ? `<option selected>${esc(v)}</option>` : '') + arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const fopt = Object.entries(FORUMS).map(([k, f]) => `<option value="${k}" ${k === m.forum ? 'selected' : ''}>${f.label}</option>`).join('');
  const fld = (id, label, val, type = 'text', extra = '') => `<div class="field"><label for="f_${id}">${label}</label><input class="in" id="f_${id}" name="${id}" type="${type}" value="${esc(val || '')}" ${extra}></div>`;
  openSheet(`<div class="s-head"><div><small style="color:var(--hc)">${isNew ? 'New matter' : 'Edit ' + esc(mref(m))}</small><h1>${isNew ? 'Add a matter' : esc(m.title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
  <form id="mform" class="grp" style="gap:14px" autocomplete="off">
    <div class="two">${fld('year', 'Year (for numbering)', m.year, 'number', 'min="1990" max="2100" required')}<div class="field"><label for="f_forum">Forum</label><select class="in" id="f_forum" name="forum">${fopt}</select></div></div>
    ${fld('clients', 'Client name(s)', m.clients, 'text', 'required placeholder="e.g. Nikhil Agnihotri & Anr."')}
    ${fld('aka', 'Client also known as', (typeof aliasesOf === 'function' ? aliasesOf(m.clients) : []).join(', '), 'text', 'placeholder="other names of the same client, e.g. Anuj Kumar Gupta (separate with commas)"')}
    ${fld('title', 'Parties (title)', m.title, 'text', 'placeholder="e.g. Ritz Restaurant v. Ram Dular Pathak"')}
    ${fld('court', 'Court', m.court, 'text', 'list="courts" placeholder="e.g. High Court, Lucknow Bench · Court 7"')}
    <datalist id="courts">${[...new Set(live().map(x => x.court).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="two"><div class="field"><label for="f_type">Type</label><select class="in" id="f_type" name="type"><option value=""></option>${opt(TYPES, m.type)}</select></div>${fld('caseNo', 'Case no.', m.caseNo, 'text', 'placeholder="e.g. 8027/2026"')}</div>
    ${fld('cnr', 'CNR no.', m.cnr, 'text', 'placeholder="16 characters, e.g. UPHC020344252026" style="text-transform:uppercase;font-family:var(--mono);letter-spacing:.03em" autocapitalize="characters" spellcheck="false"')}
    <div class="two">${fld('filingNo', 'Filing no.', m.filingNo)}<div class="field"><label>Client code</label><div class="in" style="display:flex;align-items:center;justify-content:space-between;font-family:var(--mono)">${esc(m.clientCode || '—')}<button type="button" class="linkbtn" data-act="${isNew ? 'codes' : 'setcode'}" data-id="${m.id || ''}">${m.clientCode ? 'Change' : 'Set'}</button></div></div></div>
    <div class="two">${fld('crimeNo', 'Crime / FIR no.', m.crimeNo)}${fld('ps', 'Police station', m.ps)}</div>
    ${fld('sections', 'Under section(s)', m.sections)}
    <div class="two"><div class="field"><label for="f_nature">Nature</label><select class="in" id="f_nature" name="nature">${opt(['Criminal', 'Civil', 'Other'], m.nature)}</select></div><div class="field"><label for="f_status">Status</label><select class="in" id="f_status" name="status">${opt(statusList(m), m.status)}</select></div></div>
    <div class="field" id="f_outwrap" style="${m.status === 'Decided' ? '' : 'display:none'}"><label for="f_outcome">Decided — result</label><select class="in" id="f_outcome" name="outcome"><option value="">—</option>${opt(OUTCOMES, m.outcome)}</select></div>
    ${fld('side', 'Appearing for', m.side, 'text', 'placeholder="e.g. Applicant, OP, Complainant"')}
    <div class="two">${fld('nextDate', 'Next date', m.nextDate, 'date')}${fld('item', 'Item no.', m.item)}</div>
    ${fld('purpose', 'Fixed for', m.purpose, 'text', 'list="ff"')}<datalist id="ff">${FIXED_FOR.map(x => `<option value="${x}">`).join('')}</datalist>
    <div class="two">${fld('deadline', 'Deadline', m.deadline, 'date')}${fld('deadlineFor', 'Deadline for', m.deadlineFor, 'text', 'placeholder="e.g. Reply, Appeal"')}</div>
    ${isNew ? `<div class="two">${fld('feeAgreed', 'Fees agreed (₹)', m.feeAgreed, 'text', 'inputmode="numeric"')}${fld('feeReceived', 'Fees received (₹)', m.feeReceived, 'text', 'inputmode="numeric"')}</div>` : `<p class="hint" style="margin:0 0 12px">Fees: ${rupees(m.feeReceived)} received of ${rupees(m.feeAgreed)} agreed. Add, edit or remove amounts under <b>Fees</b> on the matter page.</p>`}
    <div class="two">${fld('phone', 'Client mobile', m.phone, 'tel', 'placeholder="10-digit mobile"')}${fld('whatsapp', 'WhatsApp no. (if different)', m.whatsapp, 'tel', 'placeholder="blank = same as mobile"')}</div>
    ${fld('email', 'Client email', m.email, 'email', 'placeholder="for bills, receipts and updates" autocapitalize="off" spellcheck="false"')}
    <div class="two">${fld('altName', 'Alternate contact – name', m.altName, 'text', 'placeholder="e.g. son, pairokar"')}${fld('altPhone', 'Alternate mobile', m.altPhone, 'tel', 'placeholder="10-digit mobile"')}</div>
    <div class="field"><label for="f_notes">Notes</label><textarea class="in" id="f_notes" name="notes">${esc(m.notes || '')}</textarea></div>
    <button class="save" type="submit">${isNew ? 'Add matter' : 'Save changes'}</button>
    ${isNew ? '' : `<button class="ghost" type="button" data-act="del" data-id="${m.id}" style="color:var(--red)">Remove this matter</button>`}
  </form>`);
  $('#mform').onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    if (fd.status !== 'Decided') fd.outcome = '';
    for (const k in fd) fd[k] = String(fd[k]).trim();
    fd.year = parseInt(fd.year, 10) || y;
    if (!fd.title) fd.title = fd.clients;
    if (fd.cnr) fd.cnr = fd.cnr.toUpperCase().replace(/\s+/g, '');
    delete fd.clientCode;   // set in Client codes
    const aka = (fd.aka || '').split(/[,;]/).map(x => x.trim()).filter(Boolean); delete fd.aka;   // kept per client, not per matter
    const akaHad = typeof aliasesOf === 'function' ? aliasesOf(fd.clients) : [];
    if (isNew) aka.unshift(...akaHad);   // a new matter only adds names; it never drops names saved earlier
    const akaChanged = typeof aliasesOf === 'function' && (aka.length || !isNew) && [...new Set(aka)].join('|') !== akaHad.join('|');
    if (isNew && typeof conflictGate === 'function' && !(await conflictGate(fd))) return;
    if (isNew) {
      const rec = touch({ id: uid(), n: nextNumber(fd.year), hearings: [], created: todayIso(), ...fd });
      rec.no = rec.year + '/' + rec.n;
      if (rec.nextDate) rec.calPending = true;
      change(d => { d.matters.push(rec); if (akaChanged) setAliases(d, rec.clients, aka); });
      closeSheet(); toast('Matter ' + mref(rec) + ' added');
    } else {
      const old = find(m.id); const before = { caseNo: old.caseNo, type: old.type, court: old.court };
      change(() => {
        if (old.year !== fd.year) { old.n = nextNumber(fd.year); old.no = fd.year + '/' + old.n; }
        logDiff(old, { ...old }, fd, 'Edit');
        if (fd.nextDate !== old.nextDate) logListing(old, old.nextDate, fd.nextDate, 'date changed in Edit');
        if (fd.lastDate && fd.lastDate !== old.lastDate) logPast(old, fd.lastDate, 'last date entered in Edit');
        if (old.nextDate !== fd.nextDate || old.status !== fd.status || old.purpose !== fd.purpose || old.court !== fd.court) old.calPending = true;
        Object.assign(old, fd); touch(old);
        if (akaChanged) setAliases(S.data, old.clients, aka);
      });
      closeSheet(); toast('Saved'); if (typeof afterEdit === 'function') afterEdit(old, before);
    }
  };
}

function sheetRecord(m, pre) {
  const t = todayIso();
  const R = Object.assign({ happened: 'Adjourned', next: '', purpose: m.purpose || '', note: '', wa: !!waOf(m), cal: true }, pre || {});
  const f = forumOf(m);
  const base = m.nextDate && m.nextDate > t ? t : (m.nextDate || t);
  const quick = [['+1 week', skipSunday(addDays(base, 7))], ['+2 weeks', skipSunday(addDays(base, 14))], ['+1 month', skipSunday(addMonths(base, 1))]];
  const draw = () => {
    const others = R.next ? onDay(R.next).filter(x => x.id !== m.id).length : 0;
    const closing = R.happened === 'Disposed';
    openSheet(`<div class="s-head"><div><small style="color:${f.ink}">${R.step ? esc(R.step) + ' · ' : ''}${esc(m.court || f.label)}${m.item ? ' · Item ' + esc(m.item) : ''}</small><h1>${esc(m.title)}</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    ${R.fromOrder ? `<div class="picked" style="background:var(--hc-soft)"><b>Read from the order${R.heardOn ? ' dated ' + dmy(R.heardOn) : ''}</b><span>Please check before saving${R.deadline ? ' · deadline ' + esc(R.deadlineFor || '') + ' by ' + dmy(R.deadline) : ''}</span></div>` : ''}
    <div class="grp"><span class="lbl">What happened ${R.heardOn ? 'on ' + dmy(R.heardOn) : m.nextDate && m.nextDate <= t ? 'on ' + dmy(m.nextDate) : 'today'}</span><div class="chips">${HAPPENED.map(h => `<button class="chip ${R.happened === h ? 'on' : ''}" data-r="happened" data-v="${h}">${h}</button>`).join('')}</div></div>
    ${closing ? '<div class="picked"><b>Matter will be marked Decided</b><span>no next date</span></div>' : `
    <button class="act blue" data-r="speak" style="width:100%;min-height:46px;margin-bottom:10px">${I.mic} Speak the date${R.heard ? ' · heard “' + esc(R.heard) + '”' : ''}</button>
    <div class="grp"><span class="lbl">Next date${R.happened === 'Reserved' ? ' (optional)' : ''}</span>
      <div class="quick">${quick.map(([l, d]) => `<button class="${R.next === d ? 'on' : ''}" data-r="next" data-v="${d}"><span>${l}</span><small>${short(d)}</small></button>`).join('')}
        <button class="${R.next && !quick.some(q => q[1] === R.next) ? 'on' : ''}"><span>Pick</span><small>${R.next && !quick.some(q => q[1] === R.next) ? short(R.next) : 'date'}</small><input type="date" data-r="pick" value="${R.next}" aria-label="Pick next date"></button></div>
      ${R.next ? `<div class="picked"><b>${DOWL[parseIso(R.next).getDay()]}, ${dmy(R.next)}</b><span>${others ? others + ' other matter' + (others > 1 ? 's' : '') + ' that day' : 'No other matter that day'}</span></div>` : ''}
    </div>
    <div class="grp"><span class="lbl">Fixed for</span><div class="chips">${FIXED_FOR.map(x => `<button class="chip blue ${R.purpose === x ? 'on' : ''}" data-r="purpose" data-v="${x}" style="min-height:40px;font-size:13px">${x}</button>`).join('')}</div>
      <input class="in" data-r="purposeText" value="${esc(FIXED_FOR.includes(R.purpose) ? '' : R.purpose)}" placeholder="Or type, e.g. Cross of PW2"></div>`}
    <div class="field"><label for="r_note">NOTE (TYPE OR SPEAK)</label><div style="display:flex;gap:8px"><textarea class="in" id="r_note" data-r="note" style="flex:1">${esc(R.note)}</textarea><button class="ghost" data-r="mic" aria-label="Dictate note" style="width:56px;background:var(--saffron-soft);color:var(--saffron-ink);border:0">${I.mic}</button></div></div>
    <div class="toggles">
      <label><span>Tell client on WhatsApp${waOf(m) ? '' : ' <small style="color:var(--muted)">(no WhatsApp no. saved)</small>'}</span><input type="checkbox" data-r="wa" ${R.wa ? 'checked' : ''} ${waOf(m) ? '' : 'disabled'}></label>
      <label><span>Remind me the evening before (Outlook)</span><input type="checkbox" data-r="cal" ${R.cal ? 'checked' : ''}></label>
    </div>
    <button class="save" data-r="save" ${(!R.next && !closing && R.happened !== 'Reserved') ? 'disabled' : ''}>Save${R.next && !closing ? ' · next date ' + dmy(R.next) : ''}</button>`);
  };
  draw();
  const root = $('#sheet-root');
  root.onclick = e => {
    const el = e.target.closest('[data-r]'); if (!el) return;
    const k = el.dataset.r;
    if (k === 'happened' || k === 'next' || k === 'purpose') { R.note = $('#r_note')?.value || R.note; R[k] = el.dataset.v; if (k === 'happened' && el.dataset.v === 'Reserved') R.purpose = 'Judgment'; draw(); }
    else if (k === 'pick') { try { el.showPicker(); } catch (_) {} }
    else if (k === 'speak') {
      R.note = $('#r_note')?.value || R.note;
      toast('Listening… say e.g. "15 November, cross examination"', 2500);
      listen('en-IN').then(alts => {
        let p = null; for (const a of alts) { const q = parseSpoken(a); if (q.next) { p = q; R.heard = a; break; } }
        if (!p) { p = parseSpoken(alts[0]); R.heard = alts[0]; }
        if (p.next) R.next = p.next; if (p.purpose) R.purpose = p.purpose; if (p.item) R.item = p.item; if (p.happened) R.happened = p.happened;
        draw(); if (!p.next) toast('Date not caught. Say it again or pick it.');
      }).catch(er => toast(er.message));
    }
    else if (k === 'mic') dictate($('#r_note'));
    else if (k === 'save') save();
  };
  root.oninput = e => {
    const k = e.target.dataset?.r;
    if (k === 'note') R.note = e.target.value;
    if (k === 'purposeText') R.purpose = e.target.value;
  };
  root.onchange = e => {
    const k = e.target.dataset?.r;
    if (k === 'pick' && e.target.value) { R.note = $('#r_note')?.value || R.note; R.next = e.target.value; draw(); }
    if (k === 'wa') R.wa = e.target.checked;
    if (k === 'cal') R.cal = e.target.checked;
  };
  function save() {
    R.note = $('#r_note')?.value || R.note;
    const heardOn = R.heardOn || (m.nextDate && m.nextDate <= t ? m.nextDate : t);
    const closing = R.happened === 'Disposed';
    change(() => {
      m.hearings = m.hearings || [];
      const entry = { date: heardOn, happened: R.happened, next: closing ? '' : R.next, purpose: closing ? '' : R.purpose, note: R.note, item: m.item || '', court: m.court || '' };
      const ph = m.hearings.find(h => h.date === heardOn && h.happened === 'Listed');
      if (ph) Object.assign(ph, entry); else m.hearings.push(entry);
      m.hearings.sort((x, y) => (x.date || '').localeCompare(y.date || ''));
      m.lastDate = heardOn;
      if (closing) { m.status = 'Decided'; m.nextDate = ''; m.purpose = ''; m.item = ''; }
      else { m.nextDate = R.next; m.purpose = R.purpose; m.item = R.item || ''; m.status = R.happened === 'Reserved' ? 'Reserved' : 'Pending'; }
      if (R.cal || closing || m.eventId) m.calPending = true;
      touch(m);
    });
    closeSheet(); root.onclick = root.oninput = root.onchange = null;
    toast(closing ? 'Recorded · matter marked Decided' : 'Saved · next date ' + dmy(R.next));
    if (R.deadline) change(() => { m.deadline = R.deadline; m.deadlineFor = R.deadlineFor || 'Direction in order'; m.deadlineDone = false; touch(m); });
    if (R.wa && waOf(m)) sendWa(m, R);
    if (typeof R.after === 'function') setTimeout(R.after, 350);
  }
}

function waText(m, R) {
  const lines = ['Namaste.', `Update in your matter: ${m.title}${m.caseNo ? ' (' + (m.type ? m.type + ' ' : '') + m.caseNo + ')' : ''}${m.court ? ', ' + m.court : ''}.`];
  if (R) {
    lines.push(`Proceedings: ${R.happened}.`);
    if (R.happened === 'Disposed') lines.push('The matter has been disposed of. I will share the order once available.');
    else if (R.next) lines.push(`Next date: ${DOWL[parseIso(R.next).getDay()]}, ${dmy(R.next)}${R.purpose ? ', fixed for ' + R.purpose : ''}.`);
  } else if (m.nextDate) lines.push(`Next date: ${DOWL[parseIso(m.nextDate).getDay()]}, ${dmy(m.nextDate)}${m.purpose ? ', fixed for ' + m.purpose : ''}.`);
  lines.push('', 'Saurabh Misra, Advocate');
  return lines.join('\n');
}
function sendWa(m, R) { const p = waOf(m); if (p) window.open('https://wa.me/' + p + '?text=' + encodeURIComponent(waText(m, R)), '_blank'); }

function dictate(ta) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Dictation is not available in this browser. Use the keyboard microphone instead.');
  const r = new SR(); r.lang = 'en-IN'; r.interimResults = false;
  r.onresult = e => { ta.value = (ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript; ta.dispatchEvent(new Event('input', { bubbles: true })); };
  r.onerror = () => toast('Could not hear clearly. Please try again.');
  r.start(); toast('Listening…', 1800);
}

async function openDriveItem(path) {
  try {
    const r = await g(drivePath(path)); if (!r.ok) return toast('Not created yet. It appears after the first save.');
    window.open((await r.json()).webUrl, '_blank');
  } catch (e) { toast('Could not reach OneDrive'); }
}

/* ---------- events ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (a === 'scrim') { if (e.target === el) closeSheet(); return; }
  if (a === 'close') return closeSheet();
  if (a === 'signin') return signIn();
  if (a === 'signout') return signOut();
  if (a === 'sync') { if (S.syncErr && S.syncErr !== 'offline') toast('Last try: ' + S.syncErr, 5000); return sync(); }
  if (a === 'tab') { S.tab = el.dataset.tab; render(); scrollTo(0, 0); return; }
  if (a === 'day') { S.day = el.dataset.day; render(); return; }
  if (a === 'filter') { S.filter = el.dataset.f; S.stf = el.dataset.st || ''; S.tab = 'matters'; closeSheet(); render(); return; }
  if (a === 'cats') { sheetCategories(); return; }
  if (a === 'add') return sheetEdit(null);
  if (a === 'open') return openMatter(id);
  if (a === 'edit') return sheetEdit(find(id));
  if (a === 'record') return sheetRecord(find(id));
  if (a === 'wa') return sendWa(find(id));
  if (a === 'deadlinedone') { const m = find(id); change(() => { m.deadlineDone = true; touch(m); }); return; }
  if (a === 'del') { const m = find(id); if (confirm('Remove ' + mref(m) + '? It is removed from SM Chambers; the OneDrive case folder is not touched.')) { change(() => { m.deleted = true; m.calPending = !!m.eventId; m.nextDate = ''; touch(m); }); closeSheet(); if (S.tab === 'matter') { S.tab = S.prevTab || 'home'; render(); } toast('Matter removed'); } return; }
  if (a === 'openfolder') return openDriveItem(DIARY_DIR);
  if (a === 'openexcel') return openDriveItem(EXCEL_FILE);
  if (a === 'install') {
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
    else toast(/iphone|ipad/i.test(navigator.userAgent) ? 'In Safari: Share › Add to Home Screen' : 'Browser menu (⋮) › Install app / Add to Home screen', 4500);
  }
});
document.addEventListener('input', e => {
  if (e.target.dataset?.act === 'q') {
    S.q = e.target.value;
    if (S.tab === 'home' && S.q) { S.tab = 'matters'; S.filter = 'all'; }
    const pos = e.target.selectionStart; render();
    const i = document.querySelector('[data-act="q"]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (_) {} }
  }
});
window.addEventListener('online', () => scheduleSync(300));
window.addEventListener('offline', () => { S.syncErr = 'offline'; renderSync(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.account) { if (S.day < todayIso()) S.day = todayIso(); scheduleSync(300); } });

/* ---------- start ---------- */
(async function start() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await initAuth(); } catch (e) { $('#app').innerHTML = '<div class="splash"><p>Could not start sign-in. Check the internet and reload.</p></div>'; return; }
  try { S.data = JSON.parse(localStorage.getItem(LS_DATA) || 'null'); } catch (e) {}
  if (!S.data) S.data = emptyData();
  if (S.account) S.name = cap((S.account.name || '').split(' ')[0]);
  render();
  if (S.account) {
    sync();
    g('/me?$select=givenName,displayName').then(r => r.ok && r.json()).then(j => { if (j) { S.name = cap(j.givenName || (j.displayName || '').split(' ')[0]); render(); } }).catch(() => {});
  }
})();

/* overview: how many matters in each category and status */
function sheetCategories() {
  const all = live();
  const rows = Object.entries(FORUMS).map(([k, fo]) => {
    const ms = all.filter(m => (m.forum || 'District') === k); if (!ms.length) return '';
    const open = ms.filter(isOpen), counts = {};
    ms.forEach(m => { const s = m.status || (k === 'Advisory' ? 'In progress' : 'Pending'); counts[s] = (counts[s] || 0) + 1; });
    const order = k === 'Advisory' ? ADV_STATUSES : STATUSES;
    return `<div class="cat-card" style="border-left:6px solid ${fo.c}">
      <button class="cat-head" data-act="filter" data-f="${k}"><b>${esc(fo.label)}</b><span>${open.length} open · ${ms.length - open.length} closed</span></button>
      <div class="cat-sts">${Object.keys(counts).sort((x, y) => { const ix = s => { const i = order.indexOf(s); return i < 0 ? 99 : i; }; return ix(x) - ix(y); }).map(s => `<button data-act="filter" data-f="${k}" data-st="${esc(s)}" class="${isOpen({ forum: k, status: s }) ? '' : 'closed'}">${esc(s)} <b>${counts[s]}</b></button>`).join('')}</div>
    </div>`;
  }).join('');
  openSheet(`<div class="s-head"><div><small>${all.length} matters</small><h1>Categories</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <div class="cats">${rows}</div><p class="hint">Tap a category or a status to see those matters.</p>`);
}
