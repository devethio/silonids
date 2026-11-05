/* Silondis site behaviour: header, mobile menu, English/Amharic toggle, tabs, hero animation, toasts. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header shadow on scroll
  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // mobile menu
  var menuBtn = $('.menu-btn'), links = $('.nav-links');
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', links).forEach(function (a) { a.addEventListener('click', function () { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }); });
  }

  /* ---------- language ----------
     English is written in the HTML and the app. In Amharic mode every text node, placeholder,
     aria-label, title and alt whose English text is in window.SILONDIS_AM (assets/js/i18n-am.js)
     is swapped, including text the app draws later. Elements with data-am-html swap their whole
     inner HTML, for sentences whose word order changes around a link or emphasis. */
  var DICT = window.SILONDIS_AM || {}, PATTERNS = window.SILONDIS_AM_PATTERNS || [];
  var ORIG = new WeakMap(), ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var lang = (function () { try { return localStorage.getItem('silondis-lang') === 'en' ? 'en' : 'am'; } catch (e) { return 'am'; } })();
  var busy = false;
  function amFor(en) {
    var key = en.replace(/\s+/g, ' ').trim(); if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(DICT, key)) return DICT[key];
    for (var i = 0; i < PATTERNS.length; i++) { var m = key.match(PATTERNS[i][0]); if (m) { var r = PATTERNS[i][1].apply(null, m.slice(1)); if (r != null) return r; } }
    // several sentences in one text node: translate each, only if all of them are known
    var parts = key.split(/(?<=[.?!])\s+/);
    if (parts.length > 1) { var out = []; for (var j = 0; j < parts.length; j++) { var tj = amFor(parts[j]); if (tj == null) return null; out.push(tj); } return out.join(' '); }
    return null;
  }
  function swapText(node) {
    var o = ORIG.get(node), v = node.nodeValue;
    if (!o || (v !== o.en && v !== o.am)) { o = { en: v, am: undefined }; ORIG.set(node, o); }
    if (lang === 'am') {
      if (o.am === undefined) { var t = amFor(o.en); o.am = t == null ? null : o.en.match(/^\s*/)[0] + t + o.en.match(/\s*$/)[0]; }
      if (o.am != null && v !== o.am) node.nodeValue = o.am;
    } else if (v !== o.en) node.nodeValue = o.en;
  }
  function setIf(el, n, v) { if (el.getAttribute(n) !== v) el.setAttribute(n, v); }
  function swapAttrs(el) {
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a), en = el.getAttribute('data-en-' + a), am = el.getAttribute('data-am-' + a);
      if (en === null || (cur !== en && cur !== am)) { en = cur; setIf(el, 'data-en-' + a, en); }
      if (lang === 'am') { var t = amFor(en); if (t != null) { setIf(el, 'data-am-' + a, t); setIf(el, a, t); } }
      else setIf(el, a, en);
    });
  }
  function translate(root) {
    if (!root) return;
    busy = true;
    try {
      if (root.nodeType === 3) { swapText(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      var base = root.nodeType === 9 ? root.body : root; if (!base) return;
      var htmlEls = base.querySelectorAll ? Array.prototype.slice.call(base.querySelectorAll('[data-am-html]')) : [];
      if (base.hasAttribute && base.hasAttribute('data-am-html')) htmlEls.push(base);
      htmlEls.forEach(function (el) {
        if (!el.hasAttribute('data-en-html')) el.setAttribute('data-en-html', el.innerHTML);
        var want = lang === 'am' ? el.getAttribute('data-am-html') : el.getAttribute('data-en-html');
        if (el.innerHTML !== want) el.innerHTML = want;
      });
      var w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (n) {
          if (n.nodeType === 1) { var tg = n.tagName; if (tg === 'SCRIPT' || tg === 'STYLE' || n.hasAttribute('data-no-i18n')) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      if (base.nodeType === 1) swapAttrs(base);
      var n; while ((n = w.nextNode())) {
        if (n.nodeType === 1) { swapAttrs(n); continue; }
        if (n.parentNode && n.parentNode.closest && n.parentNode.closest('[data-am-html]')) continue;
        swapText(n);
      }
    } finally { busy = false; }
  }
  function setLang(l) {
    lang = l === 'am' ? 'am' : 'en';
    try { localStorage.setItem('silondis-lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('lang-am', lang === 'am');
    translate(document);
    if (DICT['__title__' + location.pathname.split('/').pop()] && lang === 'am') document.title = DICT['__title__' + location.pathname.split('/').pop()];
    $$('.lang-btn').forEach(function (b) { busy = true; b.textContent = lang === 'am' ? 'English' : 'አማርኛ'; b.setAttribute('aria-label', lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'); busy = false; });
    document.dispatchEvent(new CustomEvent('silondis:lang', { detail: lang }));
  }
  window.SilondisLang = { get: function () { return lang; }, set: setLang, t: function (en) { return lang === 'am' ? (amFor(en) || en) : en; }, translate: translate };
  $$('.lang-btn').forEach(function (b) { b.addEventListener('click', function () { setLang(lang === 'am' ? 'en' : 'am'); }); });
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      if (lang === 'en') return;
      muts.forEach(function (m) {
        if (m.type === 'characterData') { if (!(m.target.parentNode && m.target.parentNode.closest && m.target.parentNode.closest('[data-am-html],[data-no-i18n]'))) translate(m.target); }
        else if (m.type === 'attributes') swapAttrs(m.target);
        else m.addedNodes.forEach(function (nd) {
          if (nd.nodeType === 3) { if (!(nd.parentNode && nd.parentNode.closest && nd.parentNode.closest('[data-am-html],[data-no-i18n]'))) translate(nd); }
          else if (nd.nodeType === 1 && !(nd.closest && nd.closest('[data-am-html]') && nd !== nd.closest('[data-am-html]'))) translate(nd);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'] });
  }
  setLang(lang);

  // year
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // tabs: [data-tabs] container with [role=tab][aria-controls]
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role=tab]', box);
    function select(t) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(x.getAttribute('aria-controls')); if (panel) panel.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n);
      });
    });
  });

  // hero order tracker: cycles through the order steps
  var tracker = $('[data-tracker]');
  if (tracker) {
    var steps = $$('.trk-step', tracker), i = 0;
    var tick = function () {
      steps.forEach(function (s, k) { s.classList.toggle('done', k < i); s.classList.toggle('now', k === i); });
      var label = $('[data-tracker-status]'); if (label && steps[i]) label.textContent = steps[i].getAttribute('data-label');
      i = (i + 1) % steps.length;
    };
    i = 2; tick();
    if (!reduce) setInterval(tick, 2200);
  }

  // count-up for figures with data-count (real, stated numbers only)
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        var el = en.target, end = Number(el.getAttribute('data-count')), t0 = performance.now(), dur = 1100;
        var fmt = function (v) { return Math.round(v).toLocaleString('en-US'); };
        var step = function (t) { var p = Math.min(1, (t - t0) / dur); el.textContent = fmt(end * (1 - Math.pow(1 - p, 3))) + (el.getAttribute('data-suffix') || ''); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { io.observe(el); });
  }

  // toast
  window.silondisToast = function (msg) {
    var el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(window.silondisToast.t);
    window.silondisToast.t = setTimeout(function () { el.hidden = true; }, 3600);
  };
})();
