/* ==========================================================================
   KMSS — core script
   Handles: loading the data files, English/Arabic switching, dark mode,
   the shared navbar + footer, and small shared helpers.

   You do not need to edit this file to change content — content lives in
   the /data folder. See docs/HOW-TO-EDIT.md
   ========================================================================== */

const KMSS = (() => {
  'use strict';

  const state = {
    lang: 'en',
    site: null,
    dict: null,
  };

  /* ---- storage helpers (never throw, private browsing safe) ------------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /* ---- data loading ----------------------------------------------------- */
  const cache = new Map();
  async function loadJSON(file) {
    if (cache.has(file)) return cache.get(file);
    const p = fetch(`data/${file}.json`, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); return r.json(); })
      .catch(err => {
        console.error(`[KMSS] Could not load data/${file}.json —`, err.message);
        throw err;
      });
    cache.set(file, p);
    return p;
  }

  /* ---- translation ------------------------------------------------------ */
  // t('nav.events') -> the string in the current language
  function t(key) {
    const entry = state.dict && state.dict[key];
    if (!entry) return key;
    return entry[state.lang] || entry.en || key;
  }
  // pick({en:'Hi', ar:'مرحبا'}) -> the right one, falling back to English
  function pick(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return (obj[state.lang] && String(obj[state.lang]).trim()) || obj.en || '';
  }

  function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    // data-i18n-attr="placeholder:events.search,aria-label:ev.close"
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.getAttribute('data-i18n-attr').split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  /* ---- language switching ---------------------------------------------- */
  function setLang(lang, { rerender = true } = {}) {
    state.lang = lang === 'ar' ? 'ar' : 'en';
    const html = document.documentElement;
    html.setAttribute('lang', state.lang);
    html.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    store.set('kmss-lang', state.lang);
    if (rerender) {
      applyI18n();
      renderChrome();
      // Page modules (events, guide, …) listen for this and redraw themselves.
      document.dispatchEvent(new CustomEvent('kmss:lang', { detail: { lang: state.lang } }));
    }
  }

  /* ---- dark mode -------------------------------------------------------- */
  function setTheme(mode) {
    if (mode === 'system') {
      document.documentElement.removeAttribute('data-theme');
      store.set('kmss-theme', 'system');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
      store.set('kmss-theme', mode);
    }
  }
  function currentTheme() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /* ---- dates ------------------------------------------------------------ */
  const locale = () => (state.lang === 'ar' ? 'ar' : 'en-AU');

  // Events store date as "2026-09-12" and time as "18:30" (Melbourne local).
  function toDate(ev) {
    const [y, m, d] = String(ev.date).split('-').map(Number);
    const [hh, mm] = String(ev.start || '00:00').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  }
  function fmtDate(ev, opts) {
    return toDate(ev).toLocaleDateString(locale(), opts || { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtTime(ev) {
    if (!ev.start) return '';
    const s = toDate(ev).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
    if (!ev.end) return s;
    const [h2, m2] = String(ev.end).split(':').map(Number);
    const endD = toDate(ev); endD.setHours(h2 || 0, m2 || 0);
    return `${s} – ${endD.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' })}`;
  }
  // An event counts as "upcoming" until the end of its day.
  function isUpcoming(ev) {
    const d = toDate(ev); d.setHours(23, 59, 59, 999);
    return d.getTime() >= Date.now();
  }

  /* ---- small UI helpers ------------------------------------------------- */
  function el(tag, attrs = {}, html = '') {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (html) n.innerHTML = html;
    return n;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  function toast(msg) {
    let n = document.querySelector('.toast');
    if (!n) { n = el('div', { class: 'toast', role: 'status' }); document.body.appendChild(n); }
    n.textContent = msg;
    requestAnimationFrame(() => n.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove('is-on'), 2600);
  }

  function errorBanner(container, extra = '') {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'databanner' }, `${esc(t('err.data'))} ${esc(extra)}`));
  }

  /* ---- icons ------------------------------------------------------------ */
  const I = {
    cal:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    pin:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
    tag:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.6 13.6 13 21.2a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 2.6 12.8V4.8a2 2 0 0 1 2-2h8a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/></svg>',
    moon:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 13.4A9 9 0 1 1 10.6 3a7.2 7.2 0 0 0 10.4 10.4Z"/></svg>',
    sun:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2m0 16v2M4.2 4.2l1.5 1.5m12.6 12.6 1.5 1.5M2 12h2m16 0h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/></svg>',
    burger:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    chev:  '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13m-5-6 6 6-6 6"/></svg>',
    ig:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
    wa:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.1c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6-1.6-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.6-.7c.1-.2.1-.4 0-.6l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-1 1.9-.6 3a9.6 9.6 0 0 0 4.6 4.9c1.3.6 2.4.6 3.2.3.4-.2 1-.7 1.2-1.2.1-.4.1-.7 0-.8Z"/></svg>',
    mail:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3.5 7 7.6 5.3a1.5 1.5 0 0 0 1.8 0L20.5 7"/></svg>',
    x:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.8 21H1.6l7.5-8.6L1.2 3h6.6l4.5 5.6Zm-1.1 16h1.8L7.7 4.8H5.8Z"/></svg>',
    tiktok:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2-2.5V9.5a5.8 5.8 0 1 0 5 5.7V8.8a6.6 6.6 0 0 0 3.8 1.2V7a3.9 3.9 0 0 1-3.8-3.9Z"/></svg>',
    yt:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 8.4a3 3 0 0 0-2.1-2.1C18.6 5.8 12 5.8 12 5.8s-6.6 0-8.4.5A3 3 0 0 0 1.5 8.4 31 31 0 0 0 1 12a31 31 0 0 0 .5 3.6 3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-3.6ZM10 15.2V8.8l5.5 3.2Z"/></svg>',
    li:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 9.5h4V21H3ZM9.5 9.5h3.8v1.6h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.2c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4Z"/></svg>',
  };

  /* ---- navbar + footer (injected on every page) ------------------------- */
  const NAV = [
    { key: 'nav.home',   href: 'index.html' },
    { key: 'nav.events', href: 'events.html' },
    { key: 'nav.guide',  href: 'guide.html' },
    { key: 'nav.about',  href: 'about.html' },
  ];

  // The KMSS mark. Drawn as a CSS mask (see .brand__mark in main.css) so the one
  // SVG file adapts to navy on white, off-white on navy, and dark mode.
  function logoMark(height = 38) {
    const width = Math.round(height * 34 / 38);
    return `<span class="brand__mark" style="width:${width}px;height:${height}px;flex-basis:${width}px" aria-hidden="true"></span>`;
  }

  function renderChrome() {
    const page = document.body.dataset.page || '';
    const s = state.site || {};
    const c = s.contact || {};

    /* ---------- navbar ---------- */
    const navHost = document.getElementById('site-nav');
    if (navHost) {
      navHost.className = 'nav';
      navHost.innerHTML = `
        <div class="wrap nav__inner">
          <a class="brand" href="index.html">
            ${logoMark()}
            <span class="brand__text">${esc(pick(s.name) || 'KMSS')}<small>${esc(pick(s.fullName) || '')}</small></span>
          </a>
          <nav class="nav__links" id="nav-links" aria-label="Main">
            ${NAV.flatMap(n => n.key === 'nav.guide' && s.sellfyStore
                ? [n, { key: 'nav.store', href: s.sellfyStore, external: true }]
                : [n])
              .map(n => `<a class="nav__link ${page === n.href.replace('.html', '') ? 'is-active' : ''}" href="${esc(n.href)}" data-i18n="${n.key}"${n.external ? ' target="_blank" rel="noopener"' : ''}>${esc(t(n.key))}</a>`).join('')}
            <a class="btn btn--primary btn--sm" href="about.html#join" data-i18n="nav.join" style="margin-inline-start:8px">${esc(t('nav.join'))}</a>
          </nav>
          <div class="nav__tools">
            <button class="icon-btn icon-btn--lang" id="lang-btn" data-i18n="nav.lang">${esc(t('nav.lang'))}</button>
            <button class="icon-btn" id="theme-btn" data-i18n-attr="aria-label:nav.theme,title:nav.theme" aria-label="${esc(t('nav.theme'))}">${currentTheme() === 'dark' ? I.sun : I.moon}</button>
            <button class="icon-btn nav__burger" id="burger" data-i18n-attr="aria-label:nav.menu" aria-label="${esc(t('nav.menu'))}" aria-expanded="false">${I.burger}</button>
          </div>
        </div>`;

      navHost.querySelector('#lang-btn').onclick = () => setLang(state.lang === 'en' ? 'ar' : 'en');
      navHost.querySelector('#theme-btn').onclick = (e) => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        setTheme(next);
        e.currentTarget.innerHTML = next === 'dark' ? I.sun : I.moon;
      };
      const burger = navHost.querySelector('#burger');
      const links = navHost.querySelector('#nav-links');
      burger.onclick = () => {
        const open = links.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        burger.innerHTML = open ? I.close : I.burger;
      };
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        links.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = I.burger;
      }));
    }

    /* ---------- footer ---------- */
    const footHost = document.getElementById('site-footer');
    if (footHost) {
      const social = [
        ['instagram', I.ig, 'Instagram'], ['whatsapp', I.wa, 'WhatsApp'],
        ['x', I.x, 'X'], ['tiktok', I.tiktok, 'TikTok'],
        ['youtube', I.yt, 'YouTube'], ['linkedin', I.li, 'LinkedIn'],
      ].filter(([k]) => c[k] && !String(c[k]).includes('REPLACE'))
       .map(([k, svg, label]) => `<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${label}" title="${label}">${svg}</a>`).join('');

      footHost.className = 'footer';
      footHost.innerHTML = `
        <div class="wrap">
          <div class="footer__grid">
            <div>
              <a class="brand" href="index.html" style="margin-bottom:14px">${logoMark(34)}
                <span class="brand__text">${esc(pick(s.name) || 'KMSS')}<small>${esc(pick(s.city) || '')}</small></span></a>
              <p style="color:var(--ink-soft);font-size:.93rem;max-width:36ch">${esc(pick(s.tagline))}</p>
              <div class="socials" style="margin-top:18px">${social}
                ${c.email ? `<a href="mailto:${esc(c.email)}" aria-label="Email" title="Email">${I.mail}</a>` : ''}</div>
            </div>
            <div>
              <h4 data-i18n="foot.explore">${esc(t('foot.explore'))}</h4>
              <ul>${NAV.map(n => `<li><a href="${n.href}" data-i18n="${n.key}">${esc(t(n.key))}</a></li>`).join('')}</ul>
            </div>
            <div>
              <h4 data-i18n="foot.community">${esc(t('foot.community'))}</h4>
              <ul>
                <li><a href="about.html#join" data-i18n="nav.join">${esc(t('nav.join'))}</a></li>
                ${c.whatsapp && !c.whatsapp.includes('REPLACE') ? `<li><a href="${esc(c.whatsapp)}" target="_blank" rel="noopener" data-i18n="join.wa">${esc(t('join.wa'))}</a></li>` : ''}
                ${s.sellfyStore ? `<li><a href="${esc(s.sellfyStore)}" target="_blank" rel="noopener" data-i18n="nav.store">${esc(t('nav.store'))}</a></li>` : ''}
                <li><a href="guide.html" data-i18n="nav.guide">${esc(t('nav.guide'))}</a></li>
              </ul>
            </div>
            <div>
              <h4 data-i18n="foot.contact">${esc(t('foot.contact'))}</h4>
              <ul>
                ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ''}
                <li><a href="about.html#contact" data-i18n="about.contactTitle">${esc(t('about.contactTitle'))}</a></li>
              </ul>
            </div>
          </div>
          <div class="footer__bottom">
            <span>© ${new Date().getFullYear()} ${esc(pick(s.fullName) || 'KMSS')}. <span data-i18n="foot.rights">${esc(t('foot.rights'))}</span></span>
            <span>${esc(pick(s.city) || '')}</span>
          </div>
        </div>`;
    }
  }

  /* ---- scroll reveal ---------------------------------------------------- */
  function watchReveals(root = document) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    root.querySelectorAll('.reveal:not(.is-in)').forEach(n => io.observe(n));
  }

  /* ---- boot ------------------------------------------------------------- */
  async function init() {
    // Restore preferences before first paint of the chrome
    const savedTheme = store.get('kmss-theme');
    if (savedTheme && savedTheme !== 'system') document.documentElement.setAttribute('data-theme', savedTheme);

    const savedLang = store.get('kmss-lang');
    const browserIsArabic = (navigator.language || '').toLowerCase().startsWith('ar');
    state.lang = savedLang ? (savedLang === 'ar' ? 'ar' : 'en') : (browserIsArabic ? 'ar' : 'en');
    document.documentElement.setAttribute('lang', state.lang);
    document.documentElement.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');

    try {
      const [site, dict] = await Promise.all([loadJSON('site'), loadJSON('i18n')]);
      state.site = site; state.dict = dict;
    } catch {
      state.site = state.site || {}; state.dict = state.dict || {};
    }

    applyI18n();
    renderChrome();
    watchReveals();

    const nav = document.getElementById('site-nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8);
      onScroll();
      addEventListener('scroll', onScroll, { passive: true });
    }
    document.dispatchEvent(new CustomEvent('kmss:ready', { detail: { lang: state.lang } }));
  }

  return { state, init, loadJSON, t, pick, applyI18n, setLang, toast, el, esc, errorBanner,
           toDate, fmtDate, fmtTime, isUpcoming, locale, watchReveals, I, logoMark };
})();

document.addEventListener('DOMContentLoaded', KMSS.init);
