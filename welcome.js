/* SM Chambers — welcome page. Shown each time the app is opened; stays until a click, tap or key press.
   Not shown when the app is returning from Microsoft sign-in or receiving shared papers. */
'use strict';
(function () {
  const q = location.search + location.hash;
  if (/[?&#](share|code|error|state)=/.test(q)) return;
  if (navigator.webdriver && !/[?&]welcome\b/.test(q)) return;   // automated checks only
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
      <div class="wc-rule"><span></span><b>◆</b><span></span></div>
      <p class="wc-special">Specially designed, developed and customised<br>for <b>Saurabh Misra, Advocate</b></p>
      <p class="wc-court">High Court of Judicature at Allahabad · Lucknow Bench</p>
      <p class="wc-about">SM Chambers is now <em>26 program modules</em>, about <em>7,000 dense lines</em> (roughly 25,000–30,000 lines of ordinary code), refined over <em>141 releases</em>. It covers matters and stages, fees and date fees, bills and receipts with TDS, Word documents in English and Hindi, OneDrive and Outlook integration, Supreme Today, Bare Acts, juniors, conflict checks, backups and an app lock.</p>
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
})();
