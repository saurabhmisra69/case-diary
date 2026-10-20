/* Case Diary — reading a court order photo inside the app.
   Uses the advocate's own Anthropic API key, kept only in this browser (localStorage).
   The photo goes straight from this device to Anthropic and to his OneDrive; nowhere else.
   Nothing is saved until he checks the filled Record sheet and taps Save. */
'use strict';

const AI_KEY = 'cd.aikey', AI_MODEL = 'claude-sonnet-5-5';
function aiKey() { try { return localStorage.getItem(AI_KEY) || ''; } catch (e) { return ''; } }
function setAiKey(v) { try { v ? localStorage.setItem(AI_KEY, v) : localStorage.removeItem(AI_KEY); } catch (e) {} }

function sheetAiKey() {
  const k = aiKey();
  openSheet(`<div class="s-head"><div><small>More</small><h1>Order reading</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
  <p class="hint" style="margin:0 0 10px">Photograph an order and the app fills the next date, purpose, item and any deadline for you to check. It uses your own Anthropic API key. The key stays only on this device. Each order costs about ₹1–3.</p>
  <div class="field"><label for="ai_k">API KEY</label><input class="in" id="ai_k" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${k ? '••••••••' + esc(k.slice(-4)) : ''}"></div>
  <p class="hint" style="margin:6px 0 12px">Create it at console.anthropic.com › API keys, then paste it here. Set a monthly spending limit there as well.</p>
  <button class="save" data-ai="savekey">Save key on this device</button>
  ${k ? `<button class="ghost" data-ai="delkey" style="margin-top:10px;width:100%;color:var(--red)">Remove key from this device</button>` : ''}`);
  const root = $('#sheet-root');
  root.onclick = e => {
    const el = e.target.closest('[data-ai]'); if (!el) return;
    if (el.dataset.ai === 'savekey') {
      const v = $('#ai_k').value.trim();
      if (v.startsWith('••')) { closeSheet(); return; }
      if (!/^sk-ant-/.test(v)) { toast('That does not look like an Anthropic key (it starts with sk-ant-)'); return; }
      setAiKey(v); closeSheet(); root.onclick = null; toast('Key saved on this device'); render();
    }
    if (el.dataset.ai === 'delkey') { setAiKey(''); closeSheet(); root.onclick = null; toast('Key removed'); render(); }
  };
}

function pickOrderFile() {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*,application/pdf';
    inp.onchange = () => res(inp.files[0] || null);
    inp.click();
  });
}
async function shrinkImage(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
const toB64 = blob => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = bad; r.readAsDataURL(blob); });

function orderPrompt(m) {
  return `You are reading an Indian court order (it may be handwritten, in English or Hindi) for an advocate's diary.
Matter in the diary: ${m.title || m.clients}; ${m.type || ''} ${m.caseNo || ''}; ${m.court || ''}. Today is ${todayIso()}.
Reply with ONLY a JSON object, no other text:
{"sameMatter": true or false (does the order belong to this matter, judging by case number or parties),
 "orderDate": "YYYY-MM-DD" (date of this hearing),
 "happened": one of ${JSON.stringify(HAPPENED)},
 "nextDate": "YYYY-MM-DD" or "" (date fixed next; "" if disposed or none),
 "purpose": what the next date is fixed for, preferably one of ${JSON.stringify(FIXED_FOR)}, else a short phrase,
 "item": item or serial number if shown, else "",
 "summary": one or two plain English sentences saying what the Hon'ble Court ordered,
 "directions": [{"text": "short description, e.g. Counter affidavit", "dueDate": "YYYY-MM-DD"}] for anything to be done within a time limit (convert "within two weeks" from the order date),
 "doubtful": list of any field you could not read with confidence}
Never guess a date. If a date cannot be read clearly, give "" and name it in doubtful.`;
}

async function askClaudeOrder(m, blob, isPdf) {
  const data = await toB64(blob);
  const part = isPdf ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
                     : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1024, messages: [{ role: 'user', content: [part, { type: 'text', text: orderPrompt(m) }] }] })
  });
  if (r.status === 401) throw new Error('The API key was not accepted. Check it in More › Order reading.');
  if (r.status === 429) throw new Error('Too many requests or spending limit reached. Try again shortly.');
  if (!r.ok) { let t = ''; try { t = (await r.json()).error?.message || ''; } catch (e) {} throw new Error('Could not read the order (' + r.status + ') ' + t); }
  const j = await r.json();
  const txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
  if (s < 0) throw new Error('The order could not be read. Please enter the date with Next date.');
  return JSON.parse(txt.slice(s, e + 1));
}

const isIso = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
async function fileOrder(m, file, blob, isPdf, dateIso) {
  if (!m.folderId) return '';
  const kids = await listChildren(m.folderId);
  const orders = kids.find(k => k.folder && /^2\s*orders$/i.test(k.name)) || await makeFolder(m.folderId, '2 Orders');
  const base = (isIso(dateIso) ? dmy(dateIso) : dmy(todayIso())) + ' Order';
  const names = new Set((await listChildren(orders.id)).map(k => k.name.toLowerCase()));
  const ext = isPdf ? 'pdf' : 'jpg';
  let nm = base + '.' + ext; for (let i = 2; names.has(nm.toLowerCase()); i++) nm = base + ' (' + i + ').' + ext;
  await uploadFile(orders.id, isPdf ? file : new File([blob], nm, { type: 'image/jpeg' }), nm);
  return orders.name + ' › ' + nm;
}

async function readOrder(m) {
  if (!aiKey()) { sheetAiKey(); toast('First add your API key'); return; }
  const file = await pickOrderFile(); if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf && file.size > 20 * 1024 * 1024) { toast('PDF is too large (over 20 MB)'); return; }
  openSheet(`<div class="s-head"><div><small>${esc(m.no)}</small><h1>Reading the order…</h1></div></div><p class="hint">This takes about 10–20 seconds. Keep the app open.</p>`);
  let blob = file, o;
  try {
    if (!isPdf) blob = await shrinkImage(file);
    o = await askClaudeOrder(m, blob, isPdf);
  } catch (e) { closeSheet(); toast(e.message, 5000); return; }
  // file the order in "2 Orders" in the background; reading does not wait for it
  fileOrder(m, file, blob, isPdf, o.orderDate).then(w => w && toast('Order filed in ' + w, 4000)).catch(e => toast('Order read, but not filed: ' + e.message, 5000));
  const dl = (o.directions || []).filter(d => isIso(d.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const doubt = (o.doubtful || []).filter(Boolean);
  const pre = {
    fromOrder: true,
    heardOn: isIso(o.orderDate) && o.orderDate <= todayIso() ? o.orderDate : '',
    happened: HAPPENED.includes(o.happened) ? o.happened : 'Adjourned',
    next: isIso(o.nextDate) && o.nextDate > todayIso() ? o.nextDate : '',
    purpose: o.purpose || m.purpose || '',
    item: String(o.item || ''),
    note: [o.summary, doubt.length ? 'Not clear in the order: ' + doubt.join(', ') + '.' : ''].filter(Boolean).join(' '),
    deadline: dl ? dl.dueDate : '', deadlineFor: dl ? dl.text : ''
  };
  closeSheet();
  if (o.sameMatter === false) toast('This order may belong to another matter. Please check the case number.', 6000);
  sheetRecord(m, pre);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'aikey') sheetAiKey();
  if (el.dataset.act === 'readorder') { const m = find(el.dataset.id); if (m) readOrder(m); }
});
