/* SM Chambers — "Draft with Claude": prepares a complete brief of the matter (details, hearings, orders read,
   authorities from the advocate's own library, his house style) with the chosen papers, and hands it to the
   Claude app on this device (free — his own Claude subscription). The finished draft is shared back into
   SM Chambers and filed in the matter folder › 1 Pleadings. */
'use strict';

const DRAFT_KINDS = ['Bail application', 'Anticipatory bail application', 'Application u/s 528 BNSS (quashing)', 'Criminal revision', 'Appeal', 'Writ petition', 'Reply / objection', 'Counter / rejoinder affidavit', 'Written statement', 'Written arguments', 'Discharge application', 'Legal notice', 'Reply to legal notice', 'Legal opinion', 'Letter to client', 'Other'];
const HOUSE_STYLE = [
  "Write \"Hon'ble Court\" wherever the court is referred to.",
  'Drafting style: assertive and unqualified on the client\'s core position; do not concede partial ground.',
  'Give the final draft as a Word (.docx) file, Times New Roman, on legal size paper (8.5 × 14 in) unless I say A4.',
  'Ask me before adding a supporting affidavit: full affidavit, short affidavit (titled only "AFFIDAVIT"), or none.',
  'Cite only authorities I have listed below or that you can verify; mark anything else "[citation to be verified]". Never invent a citation or a quotation.',
  'Apply the law in force on the relevant dates (IPC for offences before 1.7.2024, BNS thereafter; BNSS / BSA for procedure from 1.7.2024, subject to the savings for pending matters) and give the corresponding old / new section in brackets.',
  'Counsel block: Saurabh Misra, Advocate, Enrolment No. ' + ADV.enrol + ', ' + ADV.addr + ', Mobile ' + ADV.phone.split(',')[0].trim() + '.',
];
function brief(m, opt) {
  const L = [], pt = parties(m);
  L.push('MATTER (from my diary, SM Chambers)');
  [['Matter ref.', typeof matterRef === 'function' ? matterRef(m) : m.no], ['Parties', m.title], ['First party', pt.first], ['Second party', pt.second], ['My client(s)', m.clients], ['Appearing for', m.side],
    ["Hon'ble Court", m.court], ['Category', (FORUMS[m.forum] || {}).label], ['Case', [m.type, m.caseNo].filter(Boolean).join(' ')], ['CNR', m.cnr], ['Crime / FIR no.', m.crimeNo], ['Police station', m.ps], ['Sections', m.sections],
    ['Status', m.status + (m.outcome ? ' (' + m.outcome + ')' : '')], ['Next date', m.nextDate ? dmy(m.nextDate) + (m.purpose ? ' for ' + m.purpose : '') : ''], ['Notes', m.notes]].forEach(([k, v]) => { if (v) L.push(k + ': ' + v); });
  if (opt.hist && (m.hearings || []).length) { L.push('', 'HEARING HISTORY'); (m.hearings || []).slice(-15).forEach(h => L.push('- ' + dmy(h.date) + ': ' + (h.happened || '') + (h.next ? ' → ' + dmy(h.next) : '') + (h.purpose ? ' (' + h.purpose + ')' : '') + (h.note ? ' — ' + h.note : ''))); }
  if (opt.read && (m.readings || []).length) { L.push('', 'ORDERS / PAPERS ALREADY READ'); m.readings.slice(-6).forEach(x => L.push('- ' + dmy(x.date) + ' ' + (x.paper || '') + ': ' + (x.summary || '') + ((x.todo || []).length ? ' To do: ' + x.todo.join('; ') : ''))); }
  const A = (m.authorities || []).map(id => (typeof library === 'function' ? library() : []).find(x => x.id === id)).filter(Boolean);
  if (opt.auth && A.length) { L.push('', 'AUTHORITIES FROM MY OWN LIBRARY (rely on these; their PDFs are attached where I ticked them)'); A.forEach((x, i) => L.push((i + 1) + '. ' + x.title + (x.citation ? ', ' + x.citation : '') + (x.court ? ' (' + x.court + (x.date ? ', ' + dmy(x.date) : '') + ')' : '') + (x.note ? ' — ' + x.note : ''))); }
  return L.join('\n');
}
function claudePrompt(m, st) {
  return `Claude, please draft a ${st.kind === 'Other' ? (st.what || 'document') : st.kind}${st.lang === 'hi' ? ' in Hindi (Devanagari)' : ''} for this matter.\n${st.what && st.kind !== 'Other' ? '\nMy instructions: ' + st.what + '\n' : ''}\n${brief(m, st)}\n\n${st.files.length ? 'PAPERS ATTACHED: ' + st.files.map(f => f.name).join('; ') + '\n\n' : ''}MY HOUSE STYLE\n${HOUSE_STYLE.map(s => '- ' + s).join('\n')}${st.paper === 'A4' ? '\n- Use A4 paper for this one.' : ''}\n\nWhen done, give me the .docx file named "${dmy(todayIso())} ${st.kind === 'Other' ? 'Draft' : st.kind} – ${(m.title || m.clients || '').slice(0, 40)}".`;
}
async function folderPapers(m) {
  if (!m.folderId) return [];
  const out = [], kids = await listChildren(m.folderId);
  for (const k of kids) { if (k.file) out.push({ ...k, where: '' }); else if (k.folder && /^[0-5]\s/.test(k.name)) { try { (await listChildren(k.id)).filter(x => x.file).forEach(x => out.push({ ...x, where: k.name })); } catch (e) {} } }
  return out.filter(x => /\.(pdf|docx?|jpe?g|png)$/i.test(x.name)).sort((a, b) => (b.lastModifiedDateTime || '').localeCompare(a.lastModifiedDateTime || ''));
}
async function sheetClaudeDraft(m) {
  const st = { kind: DRAFT_KINDS[0], what: '', lang: 'en', hist: true, read: true, auth: true, pick: new Set(), files: [], papers: null, paper: typeof paperOf === 'function' ? paperOf('draft') : 'Legal' };
  const draw = () => {
    const A = (m.authorities || []).length;
    openSheet(`<div class="s-head"><div><small>${esc(m.no)} · free, with your Claude app</small><h1>Draft with Claude</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <div class="field"><label for="cd_kind">WHAT TO DRAFT</label><select class="in" id="cd_kind">${DRAFT_KINDS.map(k => `<option ${k === st.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="field"><label for="cd_what">YOUR INSTRUCTIONS (OPTIONAL)</label><textarea class="in" id="cd_what" rows="3" placeholder="e.g. Grounds: false implication, delay of 9 days in FIR, co-accused granted bail on 12.09.2026">${esc(st.what)}</textarea></div>
      <div class="chips"><button class="chip ${st.lang === 'en' ? 'on' : ''}" data-cd="lang" data-v="en">English</button><button class="chip ${st.lang === 'hi' ? 'on' : ''}" data-cd="lang" data-v="hi">हिन्दी</button></div>
      <span class="lbl" style="margin-top:12px;display:block">Send with it</span>
      <div class="toggles"><label><span>Matter details (always)</span><input type="checkbox" checked disabled></label><label><span>Hearing history (${(m.hearings || []).length})</span><input type="checkbox" data-cd="hist" ${st.hist ? 'checked' : ''}></label>
        <label><span>Orders already read (${(m.readings || []).length})</span><input type="checkbox" data-cd="read" ${st.read ? 'checked' : ''}></label><label><span>Authorities from my library (${A})</span><input type="checkbox" data-cd="auth" ${st.auth ? 'checked' : ''}></label><label><span>My house style (Hon'ble Court, legal size, DOCX…)</span><input type="checkbox" checked disabled></label></div>
      <span class="lbl" style="margin-top:12px;display:block">Papers from the matter folder ${st.pick.size ? '· ' + st.pick.size + ' chosen' : ''}</span>
      ${!m.folderId ? '<p class="hint">No folder linked to this matter.</p>' : st.papers === null ? '<p class="hint">Reading the folder…</p>' : st.papers.length ? `<div class="terms" style="max-height:30vh;overflow:auto">${st.papers.slice(0, 40).map(p => `<label class="term"><input type="checkbox" data-cdp="${p.id}" ${st.pick.has(p.id) ? 'checked' : ''}><span>${esc(p.name)}<br><small>${esc(p.where || 'folder')} · ${kb(p.size || 0)}</small></span></label>`).join('')}</div>` : '<p class="hint">The folder has no PDF, Word or photo.</p>'}
      <button class="save" data-cd="go" style="margin-top:12px">Open in Claude</button>
      <p class="hint">On the phone: choose <b>Claude</b> in the share list. On the computer: the request is copied, Claude opens in the browser — paste it and attach the papers (they download). When Claude gives the .docx, share it to <b>SM Chambers</b> › this matter › <b>1 Pleadings</b>.</p>`);
  };
  draw();
  folderPapers(m).then(p => { st.papers = p; draw(); }).catch(() => { st.papers = []; draw(); });
  const root = $('#sheet-root');
  root.oninput = e => { if (e.target.id === 'cd_what') st.what = e.target.value; };
  root.onchange = e => { if (e.target.id === 'cd_kind') st.kind = e.target.value; const k = e.target.dataset.cd; if (k) st[k] = e.target.checked; const p = e.target.dataset.cdp; if (p) e.target.checked ? st.pick.add(p) : st.pick.delete(p); };
  root.onclick = async e => {
    const b = e.target.closest('[data-cd]'); if (!b || b.tagName === 'INPUT') return;
    if (b.dataset.cd === 'lang') { st.lang = b.dataset.v; st.what = $('#cd_what').value; return draw(); }
    if (b.dataset.cd !== 'go') return;
    st.what = $('#cd_what').value; b.textContent = 'Preparing…';
    st.files = [];
    const A = st.auth ? (m.authorities || []).map(id => library().find(x => x.id === id)).filter(Boolean) : [];
    const ids = [...st.pick].map(id => ({ id, it: st.papers.find(p => p.id === id) })).concat(A.filter(x => x.itemId).map(x => ({ id: x.itemId, it: { name: x.name || x.title + '.pdf' } })));
    for (const { id, it } of ids.slice(0, 10)) { try { const r = await g('/me/drive/items/' + id + '/content'); if (r.ok) { const bl = await r.blob(); st.files.push(new File([bl], it.name, { type: bl.type || '' })); } } catch (er) {} }
    const text = claudePrompt(m, st);
    change(() => { logChange(m, 'Sent to Claude for drafting: ' + st.kind + (st.files.length ? ' (' + st.files.length + ' papers)' : '')); touch(m); });
    const phone = typeof isPhone === 'function' ? isPhone() : /Android|iPhone/i.test(navigator.userAgent);
    if (phone && navigator.share) {
      const data = { title: st.kind + ' – ' + (m.title || ''), text, ...(st.files.length && navigator.canShare && navigator.canShare({ files: st.files }) ? { files: st.files } : {}) };
      try { await navigator.share(data); b.textContent = 'Open in Claude'; return; } catch (er) { if (er.name === 'AbortError') { b.textContent = 'Open in Claude'; return; } }
    }
    try { await navigator.clipboard.writeText(text); } catch (er) {}
    st.files.forEach(f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
    window.open('https://claude.ai/new', '_blank');
    toast('Request copied' + (st.files.length ? ' and ' + st.files.length + ' papers downloaded' : '') + '. Paste it in Claude (Ctrl+V)' + (st.files.length ? ' and attach the papers.' : '.'), 7000);
    b.textContent = 'Open in Claude';
  };
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act="claudedraft"]'); if (el) { const m = find(el.dataset.id); if (m) sheetClaudeDraft(m); } });
