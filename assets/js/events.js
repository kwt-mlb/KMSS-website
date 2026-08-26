/* ==========================================================================
   KMSS — events, calendar and tickets
   Reads data/events.json. Powers the homepage previews and events.html.
   Ticket buttons link straight to the Sellfy product URL on each event.
   ========================================================================== */

(() => {
  'use strict';
  const { t, pick, esc, el, toast, toDate, fmtDate, fmtTime, isUpcoming, locale, I } = KMSS;

  let ALL = [];
  let hashHooked = false;
  const CATS = ['social', 'cultural', 'academic', 'sports', 'trip', 'other'];

  /* ---- helpers ---------------------------------------------------------- */
  const byDateAsc  = (a, b) => toDate(a) - toDate(b);
  const byDateDesc = (a, b) => toDate(b) - toDate(a);

  function catLabel(c) { return t(`cat.${CATS.includes(c) ? c : 'other'}`); }

  function statusTag(ev) {
    if (ev.status === 'soldout') return `<span class="tag tag--soldout">${esc(t('ev.soldout'))}</span>`;
    if (ev.status === 'free')    return `<span class="tag tag--free">${esc(t('ev.free'))}</span>`;
    if (ev.status === 'invite')  return `<span class="tag tag--gold">${esc(t('ev.invite'))}</span>`;
    if (ev.price)                return `<span class="tag tag--brand">${esc(ev.price)}</span>`;
    return '';
  }

  // The ticket button. Points at the event's own Sellfy product page.
  function ticketBtn(ev, cls = 'btn btn--primary btn--sm') {
    if (!isUpcoming(ev)) {
      return ev.album ? `<a class="btn btn--ghost btn--sm" href="${esc(ev.album)}" target="_blank" rel="noopener">${esc(t('ev.album'))}</a>` : '';
    }
    if (ev.status === 'soldout') return '';   // the "Sold out" tag already says it
    if (!ev.ticket) return '';
    return `<a class="${cls}" href="${esc(ev.ticket)}" target="_blank" rel="noopener">${esc(t('ev.tickets'))} ${I.arrow}</a>`;
  }

  function mediaBlock(ev) {
    const d = toDate(ev);
    const chip = `<div class="datechip"><b>${d.toLocaleDateString(locale(), { day: 'numeric' })}</b>
      <span>${d.toLocaleDateString(locale(), { month: 'short' })}</span></div>`;
    const img = ev.image
      ? `<img src="${esc(ev.image)}" alt="" loading="lazy" onerror="this.remove()">`
      : `<div style="width:100%;height:100%;background:
           linear-gradient(140deg, var(--deep), color-mix(in srgb, var(--brand-light) 48%, var(--deep)));
           display:grid;place-items:center;font-size:2.6rem">${catEmoji(ev.category)}</div>`;
    return `<div class="card__media">${chip}${img}</div>`;
  }

  function catEmoji(c) {
    return ({ social: '🎉', cultural: '🇰🇼', academic: '📚', sports: '⚽', trip: '🚌' })[c] || '✨';
  }

  /* ---- card ------------------------------------------------------------- */
  function eventCard(ev, { wide = false } = {}) {
    const past = !isUpcoming(ev);
    const node = el('article', { class: `card reveal${wide ? ' card--wide' : ''}` });
    node.innerHTML = `
      ${mediaBlock(ev)}
      <div class="card__body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="tag">${esc(catLabel(ev.category))}</span>
          ${wide && !past ? `<span class="tag tag--accent">${esc(t('ev.featured'))}</span>` : ''}
          ${statusTag(ev)}
        </div>
        <h3>${esc(pick(ev.title))}</h3>
        <div class="card__meta">
          <span>${I.cal}${esc(fmtDate(ev, { weekday: 'short', day: 'numeric', month: 'short',
            year: (wide || toDate(ev).getFullYear() !== new Date().getFullYear()) ? 'numeric' : undefined }))}</span>
          ${ev.start ? `<span>${I.clock}${esc(fmtTime(ev))}</span>` : ''}
          ${pick(ev.venue) ? `<span>${I.pin}${esc(pick(ev.venue))}</span>` : ''}
        </div>
        <p style="color:var(--ink-soft);font-size:.95rem">${esc(pick(ev.summary))}</p>
        ${wide && !past ? `<div class="countdown" data-countdown="${esc(ev.id)}"></div>` : ''}
      </div>
      <div class="card__foot">
        ${ticketBtn(ev)}
        <button class="btn btn--ghost btn--sm" data-open="${esc(ev.id)}">${esc(t('ev.details'))}</button>
      </div>`;
    node.querySelector('[data-open]').addEventListener('click', () => openModal(ev));
    if (wide && !past) startCountdown(node.querySelector('[data-countdown]'), ev);
    return node;
  }

  /* ---- countdown -------------------------------------------------------- */
  function startCountdown(host, ev) {
    if (!host) return;
    const target = toDate(ev).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { host.innerHTML = `<span class="tag tag--accent">${esc(t('ev.happening'))}</span>`; return; }
      const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60;
      host.innerHTML = [[d, 'ev.days'], [h, 'ev.hours'], [m, 'ev.mins']]
        .map(([v, k]) => `<div><b>${v.toLocaleString(locale())}</b><span>${esc(t(k))}</span></div>`).join('');
    };
    tick();
    clearInterval(host._timer);
    host._timer = setInterval(tick, 30000);
  }

  /* ---- calendar export -------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(dt) {
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  }
  function endDate(ev) {
    const d = toDate(ev);
    if (ev.end) { const [h, m] = String(ev.end).split(':').map(Number); const e = toDate(ev); e.setHours(h || 0, m || 0); return e; }
    return new Date(d.getTime() + 2 * 36e5);
  }
  function gcalUrl(ev) {
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: pick(ev.title),
      dates: `${stamp(toDate(ev))}/${stamp(endDate(ev))}`,
      details: `${pick(ev.summary)}\n\n${location.origin}${location.pathname}#${ev.id}`,
      location: pick(ev.venue),
      ctz: 'Australia/Melbourne',
    });
    return `https://calendar.google.com/calendar/render?${p}`;
  }
  function downloadIcs(ev) {
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KMSS//Events//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:Australia/Melbourne', 'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${ev.id}@kmss`,
      `DTSTAMP:${stamp(new Date())}Z`,
      `DTSTART;TZID=Australia/Melbourne:${stamp(toDate(ev))}`,
      `DTEND;TZID=Australia/Melbourne:${stamp(endDate(ev))}`,
      `SUMMARY:${icsEsc(pick(ev.title))}`,
      `DESCRIPTION:${icsEsc(pick(ev.summary))}`,
      `LOCATION:${icsEsc(pick(ev.venue))}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${ev.id}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const icsEsc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

  /* ---- modal ------------------------------------------------------------ */
  function openModal(ev) {
    let dlg = document.getElementById('ev-modal');
    if (!dlg) {
      dlg = el('dialog', { class: 'modal', id: 'ev-modal' });
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    }
    const past = !isUpcoming(ev);
    const deet = (icon, label, value, href) => value ? `
      <div class="deet">${icon}<div><b>${esc(label)}</b>
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(value)}</a>` : esc(value)}</div></div>` : '';

    dlg.innerHTML = `
      <div class="modal__wrapper">
        <button class="icon-btn modal__close" aria-label="${esc(t('ev.close'))}">${I.close}</button>
        <div class="modal__box">
          ${ev.image ? `<div class="modal__media"><img src="${esc(ev.image)}" alt="" onerror="this.closest('.modal__media').remove()"></div>` : ''}
          <div class="modal__body">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="tag">${esc(catLabel(ev.category))}</span>${statusTag(ev)}
            </div>
            <h2 style="font-size:clamp(1.5rem,3vw,2rem)">${esc(pick(ev.title))}</h2>
            <p style="color:var(--ink-soft)">${esc(pick(ev.summary))}</p>
            ${pick(ev.details) ? `<p style="color:var(--ink-soft)">${esc(pick(ev.details))}</p>` : ''}
            <div class="deets">
              ${deet(I.cal, t('ev.when'), `${fmtDate(ev)}${ev.start ? ' · ' + fmtTime(ev) : ''}`)}
              ${deet(I.pin, t('ev.where'), pick(ev.venue), ev.mapUrl || null)}
              ${deet(I.tag, t('ev.price'), ev.price || t('ev.free'))}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
              ${ticketBtn(ev, 'btn btn--primary')}
              ${!past ? `<a class="btn btn--ghost btn--sm" href="${esc(gcalUrl(ev))}" target="_blank" rel="noopener">${I.cal} ${esc(t('ev.gcal'))}</a>
                         <button class="btn btn--ghost btn--sm" data-ics>${esc(t('ev.ics'))}</button>` : ''}
              <button class="btn btn--ghost btn--sm" data-share>${esc(t('ev.share'))}</button>
            </div>
          </div>
        </div>
      </div>`;

    dlg.querySelector('.modal__close').onclick = () => dlg.close();
    const icsBtn = dlg.querySelector('[data-ics]');
    if (icsBtn) icsBtn.onclick = () => downloadIcs(ev);
    dlg.querySelector('[data-share]').onclick = async () => {
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, 'events.html')}#${ev.id}`;
      const data = { title: pick(ev.title), text: pick(ev.summary), url };
      if (navigator.share) { try { await navigator.share(data); return; } catch { /* cancelled */ } }
      try { await navigator.clipboard.writeText(url); toast(t('ev.copied')); } catch { prompt('', url); }
    };
    dlg.showModal();
  }

  /* ---- month calendar --------------------------------------------------- */
  let calMonth = new Date();
  function renderCalendar(host) {
    if (!host) return;
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const startDow = (first.getDay() + 6) % 7;           // week starts Monday
    const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const dowNames = Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' }));

    const cells = [];
    for (let i = startDow; i > 0; i--) {
      const d = new Date(first); d.setDate(1 - i);
      cells.push({ date: d, out: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(calMonth.getFullYear(), calMonth.getMonth(), d), out: false });
    while (cells.length % 7) {
      const last = cells[cells.length - 1].date; const d = new Date(last); d.setDate(d.getDate() + 1);
      cells.push({ date: d, out: true });
    }

    host.innerHTML = `
      <div class="cal__head">
        <button class="icon-btn" data-cal="-1" aria-label="Previous month">‹</button>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="cal__title">${esc(calMonth.toLocaleDateString(locale(), { month: 'long', year: 'numeric' }))}</span>
          <button class="btn btn--ghost btn--sm" data-cal="0">${esc(t('events.today'))}</button>
        </div>
        <button class="icon-btn" data-cal="1" aria-label="Next month">›</button>
      </div>
      <div class="cal__grid">
        ${dowNames.map(n => `<div class="cal__dow">${esc(n)}</div>`).join('')}
        ${cells.map(c => {
          const iso = `${c.date.getFullYear()}-${pad(c.date.getMonth() + 1)}-${pad(c.date.getDate())}`;
          const on = ALL.filter(e => e.date === iso);
          const isToday = c.date.getTime() === today.getTime();
          return `<div class="cal__cell ${c.out ? 'is-out' : ''} ${isToday ? 'is-today' : ''}">
            <span class="cal__num">${c.date.toLocaleDateString(locale(), { day: 'numeric' })}</span>
            ${on.map(e => `<button class="cal__ev ${isUpcoming(e) ? '' : 'is-past'}" data-ev="${esc(e.id)}"
                title="${esc(pick(e.title))}">${esc(pick(e.title))}</button>`).join('')}
          </div>`;
        }).join('')}
      </div>`;

    host.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
      const step = Number(b.dataset.cal);
      calMonth = step === 0 ? new Date() : new Date(calMonth.getFullYear(), calMonth.getMonth() + step, 1);
      renderCalendar(host);
    });
    host.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => {
      const ev = ALL.find(e => e.id === b.dataset.ev);
      if (ev) openModal(ev);
    });
  }

  /* ---- events page ------------------------------------------------------ */
  function initEventsPage() {
    const upHost   = document.getElementById('up-list');
    const pastHost = document.getElementById('past-list');
    const calHost  = document.getElementById('cal');
    const search   = document.getElementById('ev-search');
    const catSel   = document.getElementById('ev-cat');

    // Category dropdown
    if (catSel) {
      const cur = catSel.value;
      catSel.innerHTML = `<option value="">${esc(t('events.allCats'))}</option>` +
        CATS.map(c => `<option value="${c}">${esc(t(`cat.${c}`))}</option>`).join('');
      catSel.value = cur;
    }

    const q = () => (search?.value || '').trim().toLowerCase();
    const matches = ev => {
      const term = q();
      if (catSel?.value && ev.category !== catSel.value) return false;
      if (!term) return true;
      return [pick(ev.title), pick(ev.summary), pick(ev.venue), ev.category].join(' ').toLowerCase().includes(term);
    };

    const empty = (titleKey, bodyKey) =>
      `<div class="empty"><b>${esc(t(titleKey))}</b>${esc(t(bodyKey))}</div>`;

    function draw() {
      if (upHost) {
        const up = ALL.filter(isUpcoming).filter(matches).sort(byDateAsc);
        upHost.innerHTML = '';
        if (!up.length) {
          upHost.innerHTML = q() || catSel?.value
            ? empty('events.noResults', 'events.noResultsBody')
            : empty('events.noUpcoming', 'events.noUpcomingBody');
        } else {
          const featIdx = up.findIndex(e => e.featured);
          up.forEach((ev, i) => upHost.appendChild(eventCard(ev, { wide: i === featIdx })));
        }
      }
      if (pastHost) {
        const past = ALL.filter(e => !isUpcoming(e)).filter(matches).sort(byDateDesc);
        pastHost.innerHTML = '';
        if (!past.length) { pastHost.innerHTML = empty('events.noResults', 'events.noResultsBody'); }
        else {
          let year = null;
          past.forEach(ev => {
            const y = toDate(ev).getFullYear();
            if (y !== year) {
              year = y;
              const count = past.filter(e => toDate(e).getFullYear() === y).length;
              pastHost.appendChild(el('div', { class: 'year-head' },
                `<b>${y}</b><hr><span class="tag">${count}</span>`));
              const grid = el('div', { class: 'cards' });
              grid.dataset.year = y;
              pastHost.appendChild(grid);
            }
            pastHost.querySelector(`.cards[data-year="${y}"]`).appendChild(eventCard(ev));
          });
        }
      }
      renderCalendar(calHost);
      KMSS.watchReveals(document);
    }

    // Tabs
    const tabs = document.querySelectorAll('[data-tab]');
    const panels = document.querySelectorAll('[data-panel]');
    function showTab(name) {
      tabs.forEach(b => b.classList.toggle('is-active', b.dataset.tab === name));
      panels.forEach(p => p.classList.toggle('hide', p.dataset.panel !== name));
      history.replaceState(null, '', `#${name}`);
    }
    tabs.forEach(b => b.onclick = () => showTab(b.dataset.tab));

    search?.addEventListener('input', draw);
    catSel?.addEventListener('change', draw);
    draw();

    // Deep link: #upcoming / #calendar / #past, or #event-id opens that event.
    // Also runs on hashchange, so a link to events.html#some-event still works
    // when the visitor is already on the events page.
    function openFromHash(fallbackToUpcoming = true) {
      const hash = decodeURIComponent(location.hash.slice(1));
      const target = ALL.find(e => e.id === hash);
      if (target) { showTab(isUpcoming(target) ? 'upcoming' : 'past'); openModal(target); return true; }
      if (['upcoming', 'calendar', 'past'].includes(hash)) { showTab(hash); return true; }
      if (fallbackToUpcoming) showTab('upcoming');
      return false;
    }
    openFromHash();
    if (!hashHooked) {                       // only ever register this once
      hashHooked = true;
      addEventListener('hashchange', () => openFromHash(false));
    }
  }

  /* ---- homepage --------------------------------------------------------- */
  function initHome() {
    const upcoming = ALL.filter(isUpcoming).sort(byDateAsc);

    // Hero "next event" card
    const heroHost = document.getElementById('hero-next');
    if (heroHost) {
      const next = upcoming[0];
      if (!next) {
        heroHost.innerHTML = `<p style="color:var(--ink-soft)">${esc(t('hero.noEvents'))}</p>`;
      } else {
        heroHost.innerHTML = `
          <span class="tag tag--accent">${esc(t('hero.badge'))}</span>
          <h3>${esc(pick(next.title))}</h3>
          <div class="card__meta" style="margin-bottom:8px">
            <span>${I.cal}${esc(fmtDate(next))}</span>
            ${pick(next.venue) ? `<span>${I.pin}${esc(pick(next.venue))}</span>` : ''}
          </div>
          <div class="countdown" id="hero-countdown"></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
            ${ticketBtn(next, 'btn btn--primary btn--sm')}
            <button class="btn btn--ghost btn--sm" id="hero-details">${esc(t('ev.details'))}</button>
          </div>`;
        startCountdown(heroHost.querySelector('#hero-countdown'), next);
        heroHost.querySelector('#hero-details').onclick = () => openModal(next);
      }
    }

    // "What's on this semester" — next three
    const listHost = document.getElementById('home-events');
    if (listHost) {
      listHost.innerHTML = '';
      const three = upcoming.slice(0, 3);
      if (!three.length) listHost.innerHTML = `<div class="empty" style="grid-column:1/-1"><b>${esc(t('events.noUpcoming'))}</b>${esc(t('events.noUpcomingBody'))}</div>`;
      else three.forEach(ev => listHost.appendChild(eventCard(ev)));
      KMSS.watchReveals(listHost);
    }
  }

  /* ---- boot ------------------------------------------------------------- */
  document.addEventListener('kmss:ready', async () => {
    const page = document.body.dataset.page;
    if (!['index', 'events'].includes(page)) return;
    const host = document.getElementById('up-list') || document.getElementById('home-events');
    try {
      const data = await KMSS.loadJSON('events');
      ALL = (data.events || []).filter(e => e && e.date && e.id);
    } catch {
      KMSS.errorBanner(host, '(data/events.json)');
      return;
    }
    const draw = () => (page === 'events' ? initEventsPage() : initHome());
    draw();
    // Redraw everything when the visitor switches language (registered once).
    document.addEventListener('kmss:lang', draw);
  });
})();
