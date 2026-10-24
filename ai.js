/* SM Chambers — reading a court order with the Claude app (free with the Claude plan; no API key, no charge).
   The photo goes from this device to the Claude app (shared on the phone, or attached by hand on the PC) and to his OneDrive; nowhere else.
   Claude replies with a short block; he pastes it back here and checks the filled Record sheet before saving. */
'use strict';

try { localStorage.removeItem('cd.aikey'); } catch (e) {}   // the old paid API key is no longer used: removed from this device

/* the free bridge: send the paper + request to the Claude app, paste the reply back. Resolves with the parsed reply, or null. */
function claudeAppRead({ m, file, prompt, title, download }) {
  return new Promise(resolve => {
    const phone = typeof isPhone === 'function' ? isPhone() : /Android|iPhone/i.test(navigator.userAgent);
    const ask = prompt + '\n\nReply with ONLY that JSON, in one code block, nothing else — I will copy it back into my case diary.';
    let done = false; const finish = v => { if (done) return; done = true; resolve(v); };
    openSheet(`<div class="s-head"><div><small>${esc(m ? mref(m) : 'SM Chambers')} · free, with your Claude plan</small><h1>${esc(title || 'Read with Claude')}</h1></div><button class="x" data-ca="cancel" aria-label="Close">${I.x}</button></div>
      <ol class="hint" style="margin:0 0 10px;padding-left:18px;line-height:1.6"><li>Tap <b>Send to Claude</b>. ${phone ? 'Choose the <b>Claude</b> app and send.' : 'Claude opens in a new tab; press <b>Ctrl+V</b> to paste the request, and attach <b>' + esc(file ? file.name : 'the paper') + '</b>' + (download ? ' (just saved in Downloads)' : '') + '.'}</li>
      <li>When Claude answers, tap its <b>Copy</b> button.</li><li>Come back here and tap <b>Paste reply</b>.</li></ol>
      <button class="save" data-ca="send">Send to Claude</button>
      <div class="field" style="margin-top:14px"><label for="ca_txt">Claude’s reply</label><textarea class="in" id="ca_txt" rows="5" placeholder="Paste Claude’s reply here" style="font-family:var(--mono);font-size:12px"></textarea></div>
      <div class="two"><button class="ghost" data-ca="paste" style="margin:0">Paste reply</button><button class="act primary" data-ca="use" style="min-height:44px">Fill from this reply</button></div>
      <button class="linkbtn" data-ca="cancel" style="margin-top:8px">Cancel</button>`);
    const root = $('#sheet-root');
    const parse = () => { const t = $('#ca_txt').value; const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } };
    root.onclick = async e => {
      const b = e.target.closest('[data-ca]'); if (!b) return;
      const a = b.dataset.ca;
      if (a === 'cancel') { root.onclick = null; closeSheet(); return finish(null); }
      if (a === 'send') {
        if (phone && navigator.share) {
          const data = { title: title || 'Read this order', text: ask, ...(file && navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file] } : {}) };
          try { await navigator.share(data); return; } catch (er) { if (er.name === 'AbortError') return; }
        }
        try { await navigator.clipboard.writeText(ask); } catch (er) {}
        if (file && download) { const l = document.createElement('a'); l.href = URL.createObjectURL(file); l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); }
        window.open('https://claude.ai/new', '_blank');
        toast('Request copied. In Claude: Ctrl+V, attach ' + (file ? file.name : 'the paper') + ', send.', 7000); return;
      }
      if (a === 'paste') { try { $('#ca_txt').value = await navigator.clipboard.readText(); } catch (er) { toast('Long-press the box and choose Paste'); return; } }
      if (a === 'use' || a === 'paste') { const o = parse(); if (!o) { if (a === 'use') toast('That does not look like Claude’s reply. Copy the whole answer and paste again.', 5000); return; } root.onclick = null; closeSheet(); finish(o); }
    };
  });
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
  return `You are reading an Indian court order (it may be handwritten, in English or Hindi) for an advocate's case records.
Matter: ${m.title || m.clients}; ${m.type || ''} ${m.caseNo || ''}; ${m.court || ''}. Today is ${todayIso()}.
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

async function askClaudeOrder(m, file) {
  return claudeAppRead({ m, file, prompt: orderPrompt(m), title: 'Read this order' });
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

async function readOrder(m, given) {
  const file = given || await pickOrderFile(); if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf && file.size > 20 * 1024 * 1024) { toast('PDF is too large (over 20 MB)'); return; }
  let blob = file, o;
  try { if (!isPdf) blob = await shrinkImage(file); } catch (e) {}
  const send = isPdf ? file : new File([blob], (file.name || 'order').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  o = await askClaudeOrder(m, send); if (!o) return;
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
  if (el.dataset.act === 'readorder') { const m = find(el.dataset.id); if (m) readOrder(m); }
});
