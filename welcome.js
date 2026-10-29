/* SM Chambers — welcome page. Shown each time the app is opened; stays until a click, tap or key press.
   Not shown when the app is returning from Microsoft sign-in or receiving shared papers. */
'use strict';
(function () {
  const q = location.search + location.hash;
  if (/[?&#](share|code|error|state)=/.test(q)) return;
  if (navigator.webdriver && !/[?&]welcome\b/.test(q)) return;   // automated checks only
  // Release count: one release per published update. RELEASES is the count at this update; when online the
  // app reads the live count from GitHub, so the cover page stays current without a manual edit.
  const RELEASES = 168;
  let rel = RELEASES;
  try { rel = Math.max(rel, +localStorage.getItem('sm-releases') || 0); } catch (e) {}
  const el = document.createElement('div');
  el.id = 'welcome';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Welcome to SM Chambers. Tap anywhere to enter.');
  el.tabIndex = 0;
  el.innerHTML = `
  <div class="wc-frame" aria-hidden="true"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>
  <div class="wc-in">
    <div class="wc-emblem"><img src="icons/emblem.webp" alt="Saurabh Misra Advocate emblem" width="760" height="760" decoding="async"><span class="wc-shine"></span></div>
    <div class="wc-text">
      <h1 class="wc-title">SM&nbsp;Chambers</h1>
      <p class="wc-firm">Saurabh Misra &amp; Associates – Chambers</p>
      <p class="wc-suite">A Comprehensive Litigation Management Suite</p>
      <div class="wc-rule"><span></span><b>◆</b><span></span></div>
      <p class="wc-special">Specially designed, developed and customised<br>for <b>Saurabh Misra, Advocate</b></p>
      <p class="wc-court"><span>High Court of Judicature at Allahabad</span><i class="wc-sep"> · </i><span>Lucknow Bench</span></p>
      <p class="wc-by">by <b>Harsh Mishra</b> <span>(Senior Software Engineer)</span></p>
      <p class="wc-about">SM Chambers is now <em>32 program modules</em>, about <em>8,200 dense lines</em> (roughly 30,000–35,000 lines of ordinary code), refined over <em><span id="wc-rel">${rel}</span> releases</em>. It covers matters and stages, client engagement forms with Standard and Strategic plans, fees and date fees, bills and receipts with TDS, fee-plan and consultation posters, Word documents in English and Hindi, OneDrive and Outlook integration, Supreme Today, Bare Acts, juniors, conflict checks, backups and an app lock.</p>
      <p class="wc-tap"><span class="wc-pc">Click anywhere to enter</span><span class="wc-ph">Tap anywhere to enter</span></p>
    </div>
  </div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('welcoming');
  try { el.focus({ preventScroll: true }); } catch (e) {}
  let done = false;
  function enter(e) {
    if (done) return; done = true;
    if (e) { e.preventDefault(); e.stopPropagation(); }
    el.classList.add('wc-out');
    document.documentElement.classList.remove('welcoming');
    setTimeout(() => el.remove(), 600);
  }
  el.addEventListener('click', enter);
  el.addEventListener('keydown', e => { if (['Enter', ' ', 'Escape'].includes(e.key)) enter(e); });
  window.smEnterWelcome = enter;
  if (navigator.onLine !== false && window.fetch) {
    fetch('https://api.github.com/repos/saurabhmisra69/case-diary/commits?sha=main&per_page=1', { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => { const m = /[?&]page=(\d+)>;\s*rel="last"/.exec(r.headers.get('link') || ''); return r.ok && m ? +m[1] : 0; })
      .then(n => { if (n >= RELEASES) { const s = document.getElementById('wc-rel'); if (s) s.textContent = n; try { localStorage.setItem('sm-releases', n); } catch (e) {} } })
      .catch(() => {});
  }
})();
