/*
 * Floating table of contents for article pages.
 *
 * Every article page loads this file. It reads the article's h2/h3 headings, gives each one an
 * id, and shows a round button in the corner that opens a list of the sections. The ring around
 * the button fills as the reader moves through the article.
 *
 * Nothing to do per article: write sections with "## " and "### " in Markdown (or h2/h3 in HTML)
 * and the list appears by itself once there are at least MIN_HEADINGS of them.
 * To keep one heading out of the list, give it (or a box around it) data-toc="skip".
 * To turn the list off for one article, put data-toc="off" on its <article>.
 */
(function () {
  'use strict';

  var MIN_HEADINGS = 3;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var article = document.querySelector('article');
    if (!article || article.getAttribute('data-toc') === 'off' || document.getElementById('toc-fab')) return;

    var heads = Array.prototype.filter.call(article.querySelectorAll('h2, h3'), function (h) {
      return h.textContent.trim() && !h.closest('[data-toc="skip"], .ibox, figure, details, aside');
    });
    if (heads.length < MIN_HEADINGS) return;

    var lang = (article.getAttribute('lang') || document.documentElement.lang || 'en').slice(0, 2);
    var ar = lang === 'ar';
    var T = ar
      ? { title: 'المحتويات', open: 'فهرس المقال', close: 'إغلاق الفهرس' }
      : { title: 'Contents', open: 'Table of contents', close: 'Close table of contents' };

    /* ---------- ids for the headings (Arabic letters are kept) ---------- */
    var used = {};
    function slugify(s) {
      var out;
      try { out = s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-'); }
      catch (e) { out = s.toLowerCase().replace(/[\s.,:;!?؟،؛'"()\[\]{}\/\\]+/g, '-'); }
      return out.replace(/^-+|-+$/g, '') || 'section';
    }
    heads.forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent.trim()), id = base, n = 2;
        while (used[id] || document.getElementById(id)) id = base + '-' + n++;
        h.id = id;
      }
      used[h.id] = true;
    });

    /* ---------- styles ---------- */
    var css = [
      '.toc-fab{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));inset-inline-end:20px;z-index:40;width:52px;height:52px;border-radius:50%;border:none;padding:0;cursor:pointer;background:#2F6F6A;color:#F9F7F0;box-shadow:0 6px 18px rgba(27,31,30,.22);display:flex;align-items:center;justify-content:center;transition:transform .18s ease,background .18s ease;-webkit-tap-highlight-color:transparent;}',
      '.toc-fab:hover{background:#235E59;transform:translateY(-2px);}',
      '.toc-fab:focus-visible{outline:3px solid #9CC3BE;outline-offset:3px;}',
      '.toc-fab svg{display:block;}',
      '.toc-fab .toc-ring{position:absolute;inset:0;transform:rotate(-90deg);pointer-events:none;}',
      '[dir="rtl"] .toc-fab .toc-ring{transform:rotate(-90deg) scaleY(-1);}',
      '.toc-fab .toc-ring circle{fill:none;stroke-width:3;}',
      '.toc-fab .toc-ring .bg{stroke:rgba(249,247,240,.22);}',
      '.toc-fab .toc-ring .fg{stroke:#F9F7F0;stroke-linecap:round;transition:stroke-dashoffset .12s linear;}',
      '.toc-panel{position:fixed;bottom:calc(max(20px,env(safe-area-inset-bottom)) + 64px);inset-inline-end:20px;z-index:41;width:min(340px,calc(100vw - 32px));max-height:min(65vh,520px);display:flex;flex-direction:column;background:#FBFAF5;border:1px solid #E4E0D3;border-radius:16px;box-shadow:0 16px 40px rgba(27,31,30,.18);opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);transform-origin:bottom right;transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s;}',
      '[dir="rtl"] .toc-panel{transform-origin:bottom left;}',
      '.toc-panel.open{opacity:1;visibility:visible;transform:none;transition:opacity .18s ease,transform .18s ease;}',
      '.toc-panel .toc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 10px;border-bottom:1px solid #EDE9DD;}',
      '.toc-panel .toc-title{margin:0;font-size:13px;font-weight:600;letter-spacing:.04em;color:#2F6F6A;}',
      '.toc-panel .toc-x{border:none;background:none;cursor:pointer;color:#6B6A63;font-size:22px;line-height:1;padding:2px 6px;border-radius:6px;}',
      '.toc-panel .toc-x:hover{background:#EDE9DD;color:#1B1F1E;}',
      '.toc-panel ol{list-style:none;margin:0;padding:8px;overflow-y:auto;overscroll-behavior:contain;}',
      '.toc-panel li a{display:block;padding:8px 10px;border-radius:8px;font-size:15px;line-height:1.5;color:#33342F;text-decoration:none;border-inline-start:3px solid transparent;}',
      '.toc-panel li.l3 a{padding-inline-start:26px;font-size:14px;color:#6B6A63;}',
      '.toc-panel li a:hover{background:#F0EDE3;color:#1B1F1E;text-decoration:none;}',
      '.toc-panel li a.active{color:#235E59;font-weight:600;border-inline-start-color:#2F6F6A;background:#EEF3F1;}',
      '.toc-target{scroll-margin-top:84px;}',
      '@media (max-width:560px){',
      '  .toc-fab{width:48px;height:48px;inset-inline-end:16px;bottom:max(16px,env(safe-area-inset-bottom));}',
      '  .toc-panel{inset-inline:16px;width:auto;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 60px);max-height:60vh;}',
      '}',
      '@media print{.toc-fab,.toc-panel{display:none!important;}}',
      '@media (prefers-reduced-motion:reduce){.toc-fab,.toc-panel,.toc-fab .toc-ring .fg{transition:none!important;}}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'toc-style';
    style.textContent = css;
    document.head.appendChild(style);

    /* ---------- button and panel ---------- */
    var dir = ar ? 'rtl' : 'ltr';
    var R = 24, C = 2 * Math.PI * R;
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'toc-fab';
    fab.className = 'toc-fab';
    fab.setAttribute('dir', dir);
    fab.setAttribute('aria-label', T.open);
    fab.setAttribute('title', T.open);
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'toc-panel');
    fab.innerHTML =
      '<svg class="toc-ring" viewBox="0 0 52 52" width="100%" height="100%" aria-hidden="true">' +
        '<circle class="bg" cx="26" cy="26" r="' + R + '"></circle>' +
        '<circle class="fg" cx="26" cy="26" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"></circle>' +
      '</svg>' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"' +
        (ar ? ' style="transform:scaleX(-1)"' : '') + '>' +
        '<line x1="9" y1="6" x2="20" y2="6"></line><line x1="9" y1="12" x2="20" y2="12"></line><line x1="9" y1="18" x2="20" y2="18"></line>' +
        '<circle cx="4.5" cy="6" r="1" fill="currentColor"></circle><circle cx="4.5" cy="12" r="1" fill="currentColor"></circle><circle cx="4.5" cy="18" r="1" fill="currentColor"></circle>' +
      '</svg>';
    var ring = fab.querySelector('.fg');

    var panel = document.createElement('nav');
    panel.id = 'toc-panel';
    panel.className = 'toc-panel' + (ar ? ' ar' : '');
    panel.setAttribute('dir', dir);
    panel.setAttribute('lang', lang);
    panel.setAttribute('aria-label', T.title);
    panel.innerHTML = '<div class="toc-head"><p class="toc-title">' + T.title + '</p>' +
      '<button type="button" class="toc-x" aria-label="' + T.close + '">×</button></div><ol></ol>';
    var list = panel.querySelector('ol');
    var links = heads.map(function (h) {
      h.classList.add('toc-target');
      var li = document.createElement('li');
      li.className = h.tagName === 'H3' ? 'l3' : 'l2';
      var a = document.createElement('a');
      a.href = '#' + encodeURIComponent(h.id);
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    /* ---------- open / close ---------- */
    function isOpen() { return panel.classList.contains('open'); }
    function setOpen(open, focusBack) {
      panel.classList.toggle('open', open);
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      fab.setAttribute('aria-label', open ? T.close : T.open);
      if (open) {
        var act = list.querySelector('a.active');
        if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
        (act || links[0]).focus({ preventScroll: true });
      } else if (focusBack) fab.focus();
    }
    fab.addEventListener('click', function () { setOpen(!isOpen()); });
    panel.querySelector('.toc-x').addEventListener('click', function () { setOpen(false, true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !panel.contains(e.target) && !fab.contains(e.target)) setOpen(false);
    });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        heads[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#' + encodeURIComponent(heads[i].id));
        setOpen(false);
      });
    });

    /* ---------- current section and reading progress ---------- */
    var ticking = false;
    function update() {
      ticking = false;
      var top = article.getBoundingClientRect().top + window.pageYOffset;
      var span = article.offsetHeight - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, (window.pageYOffset - top) / span)) : 1;
      ring.setAttribute('stroke-dashoffset', String(C * (1 - p)));

      var cur = -1, line = 110;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].getBoundingClientRect().top <= line) cur = i; else break;
      }
      links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });
})();
