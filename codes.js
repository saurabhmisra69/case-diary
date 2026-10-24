/* SM Chambers — Client codes: running client number + initials, e.g. C004-RDP.
   Built from each matter's CLIENT (not the case title). Nothing is saved until the advocate approves.
   He can change the client of a matter, merge two names of one person, edit a code, or skip a client for now. */
'use strict';

const CC_RX = /^C(\d{3,4})-/;
function initialsOf(name) {
  let s = String(name || '').replace(/\(.*?\)/g, ' ').replace(/@.*?(?=&|,|$)/g, ' ').replace(/\b(thru\.?|through)\b.*$/i, ' ');
  s = s.replace(/\b(dr|smt|shri|sri|sh|mr|mrs|ms|kumari|km|late|m\/s|messrs)\b\.?/gi, ' ').replace(/\b(pvt|private|ltd|limited|llp|co|inc|the|of|and)\b\.?/gi, ' ');
  const people = s.split(/\s*(?:&|,|\/)\s*/).map(x => x.replace(/[^A-Za-zऀ-ॿ ]/g, ' ').trim()).filter(Boolean).filter(x => !/^(anr|ors|others|another|\d+ ors)$/i.test(x));
  if (!people.length) return 'X';
  const first = people[0].split(/\s+/), lastWord = people[people.length - 1].split(/\s+/).pop();
  let ini = first.length === 1 ? (people.length > 1 && lastWord && lastWord !== first[0] ? first[0][0] + lastWord[0] : first[0].slice(0, 3)) : first.map(w => w[0]).join('');
  return ini.toUpperCase().slice(0, 6);
}
const sameClient = (a, b) => { const k = clientKey(a); return !!k && k === clientKey(b); };
/* the code this client already has in his other matters ('' if none, or if they disagree) */
function codeOfClient(name, exceptId) { const cs = [...new Set(live().filter(x => x.id !== exceptId && x.clientCode && sameClient(x.clients, name)).map(x => x.clientCode))]; return cs.length === 1 ? cs[0] : ''; }
const ccNum = code => { const m = String(code || '').match(CC_RX); return m ? +m[1] : 0; };
function ccNext() { return Math.max(+(S.data?.meta || {})['seq:C'] || 0, ...live().map(m => ccNum(m.clientCode)), 0) + 1; }
const ccFmt = (n, ini) => 'C' + String(n).padStart(3, '0') + '-' + ini;
const ccSkip = () => S.data?.meta?.codeSkip || {};
const iniClean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const ccPre = code => (String(code || '').match(/^C\d{3,4}-/) || [''])[0];
function ccLocked(gr) { const c = gr.code; return !!c && c !== 'MIXED' && (gr.ms.some(m => (m.letters || []).some(l => String(l.no).includes('/' + c + '/'))) || !!(S.data?.meta?.codeFixed || {})[c]); }
function ccGroups() {
  const gs = clientGroups().filter(g => g.key !== '(no client name)');
  const age = g => Math.min(...g.ms.map(m => (m.year || 9999) * 100000 + (m.n || 0)));
  gs.sort((a, b) => age(a) - age(b));
  const codeOf = g => { const cs = [...new Set(g.ms.map(m => m.clientCode).filter(Boolean))]; return cs.length === 1 ? cs[0] : cs.length > 1 ? 'MIXED' : ''; };
  let n = ccNext();
  return gs.map(g => { const code = codeOf(g), skip = !!ccSkip()[g.key];
    return { ...g, code, skip, sug: code && code !== 'MIXED' ? code : skip ? '' : ccFmt(n++, initialsOf(g.name)) }; });
}
/* a new client elsewhere in the app (first bill, receipt or letter) gets the next number too */
function suggestCodeNew(m) {
  return codeOfClient(m.clients, m.id) || ccFmt(ccNext(), initialsOf(m.clients || m.title));
}

function sheetCodes(filter) {
  const st = { f: filter || 'todo', edit: {} };
  const draw = () => {
    const G = ccGroups(), todo = G.filter(g => !g.code && !g.skip), done = G.filter(g => g.code), skipped = G.filter(g => g.skip && !g.code);
    const list = st.f === 'todo' ? todo : st.f === 'done' ? done : skipped;
    openSheet(`<div class="s-head"><div><small>${G.length} clients · ${done.length} with codes</small><h1>Client codes</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
      <p class="hint" style="margin-top:0">Code = client number (given by the app) + initials (yours to edit until the first letter goes out, or until you tap <b>Fix</b>), e.g. <b>C004-RDP</b>. Built from <b>who your client is</b> in each matter — change it where it is wrong. Nothing is saved until you approve.</p>
      <div class="chips"><button class="chip ${st.f === 'todo' ? 'on' : ''}" data-cc="f" data-v="todo">To approve (${todo.length})</button><button class="chip ${st.f === 'done' ? 'on' : ''}" data-cc="f" data-v="done">Approved (${done.length})</button><button class="chip ${st.f === 'skip' ? 'on' : ''}" data-cc="f" data-v="skip">Skipped (${skipped.length})</button></div>
      ${st.f === 'todo' && todo.length ? `<button class="save" data-cc="all" style="margin:10px 0">Approve all ${todo.length} as shown</button>` : ''}
      <div class="grp" style="gap:10px;margin-top:8px">${list.map(g => card(g)).join('') || '<p class="empty">Nothing here.</p>'}</div>`);
  };
  const card = g => {
    const locked = g.code && ccLocked(g), ek = 'e_' + btoa(unescape(encodeURIComponent(g.key))).replace(/[^a-z0-9]/gi, '');
    return `<div class="card" style="padding:12px 14px;box-shadow:none;border:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>${esc(g.name)}${g.aka && g.aka.length ? `<small style="display:block;font-weight:500;color:var(--muted)">also ${esc(g.aka.join(', '))}</small>` : ''}</b>${g.code ? `<b style="font-family:var(--mono);color:var(--dc-ink)">${esc(g.code)}</b>` : ''}</div>
      <div class="hist" style="margin-top:6px">${g.ms.map(m => `<div><b style="font-size:11px">${esc(mref(m))}</b><span>${esc(m.title || '')}${m.caseNo ? ' · ' + esc(m.caseNo) : ''}<br><button class="linkbtn" data-cc="client" data-id="${m.id}">Change client</button></span></div>`).join('')}</div>
      ${g.code === 'MIXED' ? `<p class="hint" style="color:var(--red)">These matters have different codes: ${esc([...new Set(g.ms.map(m => m.clientCode).filter(Boolean))].join(', '))}. Set one below.</p>` : ''}
      ${(() => { const numbered = !g.code || g.code === 'MIXED' || ccPre(g.code);
        if (g.code && g.code !== 'MIXED' && locked) return `<p class="hint" style="margin:8px 0 0;color:var(--dc-ink)">✓ Fixed${(S.data?.meta?.codeFixed || {})[g.code] ? '' : ' — a letter has gone out with this code'}</p>`;
        if (g.code && g.code !== 'MIXED' && !ccPre(g.code)) return `<p class="hint" style="margin:8px 0 0">Older style code (no number).</p>`;
        const pre = g.code && g.code !== 'MIXED' ? ccPre(g.code) : ccPre(g.sug), ini = (g.code && g.code !== 'MIXED' ? g.code : g.sug).replace(/^C\d{3,4}-/, '');
        return numbered ? `<div style="display:flex;gap:6px;align-items:center;margin-top:8px"><span class="ccpre" title="Number given by the app">${esc(pre)}</span><input class="in" id="${ek}" data-cc-in="${esc(g.key)}" value="${esc(ini)}" maxlength="6" style="flex:1;font-family:var(--mono);text-transform:uppercase" autocapitalize="characters" spellcheck="false" aria-label="Initials"><button class="act primary" data-cc="ok" data-k="${esc(g.key)}" data-in="${ek}" style="min-height:42px;padding:0 12px">${g.code && g.code !== 'MIXED' ? 'Save' : 'Approve'}</button></div>` : ''; })()}
      <div class="chips" style="margin-top:8px">${g.code && g.code !== 'MIXED' && !locked && ccPre(g.code) ? `<button class="chip" data-cc="fix" data-k="${esc(g.key)}">Fix this code</button>` : ''}${g.code && g.code !== 'MIXED' && !locked && !ccPre(g.code) ? `<button class="chip" data-cc="renum" data-k="${esc(g.key)}">Give it a numbered code</button>` : ''}
        ${!g.code ? (g.skip ? `<button class="chip" data-cc="unskip" data-k="${esc(g.key)}">Bring back</button>` : `<button class="chip" data-cc="skip" data-k="${esc(g.key)}">Skip for now</button>`) : ''}
        <button class="chip" data-cc="merge" data-k="${esc(g.key)}">Same person as…</button><button class="chip" data-cc="aka" data-k="${esc(g.key)}">Also known as…</button></div></div>`;
  };
  const grOf = k => ccGroups().find(g => g.key === k);
  const approve = (g, ini) => {
    ini = iniClean(ini); if (!ini) return toast('Enter the initials');
    const keep = g.code && g.code !== 'MIXED' && ccPre(g.code);   // an approved client keeps its number
    const code = (keep || ccFmt(ccNext(), '')) + ini;
    const clash = live().find(m => m.clientCode === code && clientKey(m.clients) !== g.key); if (clash) return toast(code + ' is already used for ' + clientName(clash.clients));
    change(d => { d.meta = d.meta || {}; d.meta['seq:C'] = Math.max(+d.meta['seq:C'] || 0, ccNum(code));
      g.ms.forEach(m => { if (m.clientCode !== code) { logChange(m, 'Client code: ' + (m.clientCode || '—') + ' → ' + code); m.clientCode = code; touch(m); } }); });
    return true;
  };
  draw();
  const root = $('#sheet-root');
  root.onclick = e => {
    const b = e.target.closest('[data-cc]'); if (!b) return;
    const a = b.dataset.cc, g = b.dataset.k ? grOf(b.dataset.k) : null;
    if (a === 'f') { st.f = b.dataset.v; return draw(); }
    if (a === 'ok') { if (approve(g, $('#' + b.dataset.in).value)) { toast(g.name + ': ' + (grOf(g.key) || {}).code); draw(); } return; }
    if (a === 'all') { const T = ccGroups().filter(x => !x.code && !x.skip); if (!confirm('Approve ' + T.length + ' codes as shown?')) return;
      T.forEach(x => { const el = root.querySelector(`[data-cc-in="${CSS.escape(x.key)}"]`); approve(x, el ? el.value : x.sug.replace(/^C\d{3,4}-/, '')); }); toast(T.length + ' clients coded'); return draw(); }
    if (a === 'fix') { if (!confirm('Fix ' + g.code + ' for ' + g.name + '? The initials cannot be changed after this.')) return; change(d => { d.meta = d.meta || {}; d.meta.codeFixed = Object.assign({}, d.meta.codeFixed, { [g.code]: todayIso() }); g.ms.forEach(m => logChange(m, 'Client code fixed: ' + g.code)); }); toast(g.code + ' fixed'); return draw(); }
    if (a === 'renum') { change(() => g.ms.forEach(m => { logChange(m, 'Client code ' + m.clientCode + ' removed, to get a numbered code'); m.clientCode = ''; touch(m); })); st.f = 'todo'; return draw(); }
    if (a === 'skip' || a === 'unskip') { change(d => { d.meta = d.meta || {}; const s = Object.assign({}, d.meta.codeSkip); if (a === 'skip') s[g.key] = true; else delete s[g.key]; d.meta.codeSkip = s; }); return draw(); }
    if (a === 'aka') return sheetAliases(g.ms[0].clients, () => sheetCodes(st.f));
    if (a === 'client') { const m = find(b.dataset.id); return changeClient(m, () => sheetCodes(st.f)); }
    if (a === 'merge') { const others = ccGroups().filter(x => x.key !== g.key);
      openSheet(`<div class="s-head"><div><small>${esc(g.name)}</small><h1>Same person as…</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
        <p class="hint">${g.ms.length} matter${g.ms.length > 1 ? 's' : ''} of “${esc(g.name)}” will be put under the name you pick.</p>
        <div class="flist" style="max-height:60vh;overflow:auto">${others.map(x => `<button class="frow" data-mg="${esc(x.key)}"><span class="ficon" style="font-size:10px">${esc(x.code || '—')}</span><span class="fname">${esc(x.name)}<small>${x.ms.length} matter(s)</small></span></button>`).join('')}</div><button class="linkbtn" data-mg="">‹ Back</button>`);
      root.onclick = ev => { const x = ev.target.closest('[data-mg]'); if (!x) return; root.onclick = null; if (!x.dataset.mg) return sheetCodes(st.f);
        const tg = grOf(x.dataset.mg); change(() => g.ms.forEach(m => { logChange(m, 'Client: ' + m.clients + ' → ' + tg.ms[0].clients + ' (same person)'); m.clients = tg.ms[0].clients; if (tg.code && tg.code !== 'MIXED') m.clientCode = tg.code; touch(m); }));
        toast('Merged into ' + tg.name); sheetCodes(st.f); };
    }
  };
}
function changeClient(m, back) {
  const names = [...new Set(live().map(x => clientName(x.clients)).filter(Boolean))].sort();
  openSheet(`<div class="s-head"><div><small>${esc(mref(m))} · ${esc(m.title || '')}</small><h1>Who is your client?</h1></div><button class="x" data-act="close" aria-label="Close">${I.x}</button></div>
    <form id="ch_form" class="grp" style="gap:12px"><div class="field"><label for="ch_n">CLIENT NAME(S)</label><input class="in" id="ch_n" list="ch_l" value="${esc(m.clients || '')}" required><datalist id="ch_l">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
    <p class="hint" style="margin:0">Pick an existing client to put this matter with their other matters, or type a new name (e.g. Sana Rizvi).</p>
    <button class="save" type="submit">Save</button><button type="button" class="linkbtn" data-ch="back">‹ Back</button></form>`);
  $('#ch_form').onsubmit = e => { e.preventDefault(); const v = $('#ch_n').value.trim(); if (!v || v === m.clients) return back();
    change(() => { logChange(m, 'Client: ' + (m.clients || '—') + ' → ' + v); m.clients = v; const cc = codeOfClient(v, m.id); m.clientCode = (m.letters || []).length ? m.clientCode : cc; touch(m); });
    toast('Client: ' + v); back(); };
  $('#sheet-root').onclick = e => { if (e.target.closest('[data-ch]')) back(); };
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="codes"]')) sheetCodes(); });
