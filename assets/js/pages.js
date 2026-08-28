/* ==========================================================================
   KMSS — homepage blocks + About page (committee, FAQ, join form)
   ========================================================================== */

(() => {
  'use strict';
  const { t, pick, esc, el, toast, I } = KMSS;

  /* ---- shared blocks ---------------------------------------------------- */
  function renderStats() {
    const host = document.getElementById('hero-stats');
    if (!host) return;
    const stats = KMSS.state.site?.stats || [];
    host.innerHTML = stats.map(s =>
      `<div class="hero__stat"><b dir="ltr">${esc(s.value)}</b><span>${esc(pick(s.label))}</span></div>`).join('');
  }

  function renderPillars() {
    const host = document.getElementById('pillars');
    if (!host) return;
    const pillars = KMSS.state.site?.pillars || [];
    host.innerHTML = pillars.map(p => `
      <div class="pillar reveal">
        <div class="pillar__icon" aria-hidden="true">${esc(p.icon)}</div>
        <h3>${esc(pick(p.title))}</h3>
        <p>${esc(pick(p.text))}</p>
      </div>`).join('');
    KMSS.watchReveals(host);
  }

  function renderSponsors() {
    const host = document.getElementById('sponsors');
    if (!host) return;
    const list = (KMSS.state.site?.sponsors || []).filter(s => s.name);
    if (!list.length) { host.closest('section')?.classList.add('hide'); return; }
    host.innerHTML = list.map(s => s.url
      ? `<a class="sponsor" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`
      : `<span class="sponsor">${esc(s.name)}</span>`).join('');
  }

  function renderIntro() {
    document.querySelectorAll('[data-site]').forEach(node => {
      const path = node.dataset.site.split('.');
      let v = KMSS.state.site;
      for (const k of path) v = v?.[k];
      node.textContent = pick(v);
    });
  }

  /* ---- about page ------------------------------------------------------- */
  const TEAM_GROUPS = ['exec', 'student', 'activities', 'sport', 'media'];

  async function renderTeam() {
    const host = document.getElementById('team');
    if (!host) return;
    let data;
    try { data = await KMSS.loadJSON('team'); }
    catch { KMSS.errorBanner(host, '(data/team.json)'); return; }

    const yearHost = document.getElementById('team-year');
    if (yearHost && data.year) yearHost.textContent = data.year;

    const members = data.members || [];

    function personCard(m, groupLabel) {
      const name = pick(m.name);
      const role = pick(m.role);
      // The group heading already says "Activities Committee" — don't repeat it
      // under every face. Only show the role when it adds something.
      const showRole = role && role !== groupLabel;
      const initials = name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
      const avatar = m.photo
        ? `<img class="person__avatar" src="${esc(m.photo)}" alt="${esc(name)}" loading="lazy">`
        : `<div class="person__avatar" aria-hidden="true">${esc(initials)}</div>`;
      return `<div class="person reveal">${avatar}<b>${esc(name)}</b>
        ${showRole ? `<span>${esc(role)}</span>` : ''}
        ${m.uni ? `<small>${esc(m.uni)}</small>` : ''}
        ${m.email ? `<small><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></small>` : ''}</div>`;
    }

    // Group members under their committee heading, keeping the order in the file.
    // Anyone without a recognised group falls into a final "Committee" block.
    const order = TEAM_GROUPS.filter(g => members.some(m => m.group === g));
    const ungrouped = members.filter(m => !TEAM_GROUPS.includes(m.group));

    if (!order.length) {
      host.innerHTML = `<div class="people">${members.map(m => personCard(m, null)).join('')}</div>`;
    } else {
      host.innerHTML = order.map(g => {
        const label = t(`team.${g}`);
        return `<div class="team-group">
          <h3 class="team-group__head">${esc(label)}</h3>
          <div class="people">${members.filter(m => m.group === g).map(m => personCard(m, label)).join('')}</div>
        </div>`;
      }).join('') + (ungrouped.length ? `
        <div class="team-group">
          <h3 class="team-group__head">${esc(t('team.other'))}</h3>
          <div class="people">${ungrouped.map(m => personCard(m, null)).join('')}</div>
        </div>` : '');
    }
    KMSS.watchReveals(host);
  }

  async function renderFaq() {
    const host = document.getElementById('faq');
    if (!host) return;
    let data;
    try { data = await KMSS.loadJSON('faq'); }
    catch { KMSS.errorBanner(host, '(data/faq.json)'); return; }
    host.innerHTML = (data.faqs || []).map(f => `
      <details class="gitem reveal">
        <summary>${esc(pick(f.q))}${I.chev}</summary>
        <div class="gitem__body"><p>${esc(pick(f.a))}</p></div>
      </details>`).join('');
    KMSS.watchReveals(host);
  }

  /* ---- join form -------------------------------------------------------- */
  function initJoin() {
    const form = document.getElementById('join-form');
    const s = KMSS.state.site || {};

    // Buttons that point at the Google Form / WhatsApp group.
    // If a link hasn't been filled in yet, fall back to emailing the society
    // rather than leaving a call-to-action with no button at all.
    const ok = u => u && !String(u).includes('REPLACE');
    const mailto = s.contact?.email ? `mailto:${s.contact.email}?subject=I'd like to join KMSS` : '';

    document.querySelectorAll('[data-join-link]').forEach(a => {
      const url = ok(s.joinFormUrl) ? s.joinFormUrl : mailto;
      if (!url) { a.classList.add('hide'); return; }
      a.href = url;
      if (url === mailto) a.removeAttribute('target');
    });
    document.querySelectorAll('[data-wa-link]').forEach(a => {
      if (ok(s.contact?.whatsapp)) a.href = s.contact.whatsapp; else a.classList.add('hide');
    });

    if (!form) return;
    // The inline email box only works if a Formspree endpoint is configured.
    if (!s.joinFormspree) { form.classList.add('hide'); return; }
    form.action = s.joinFormspree;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await fetch(s.joinFormspree, {
          method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form),
        });
        if (!res.ok) throw new Error('bad response');
        form.reset(); toast(t('join.thanks'));
      } catch {
        toast(t('join.error'));
      } finally { btn.disabled = false; }
    };
  }

  /* ---- boot ------------------------------------------------------------- */
  function drawAll() {
    renderIntro(); renderStats(); renderPillars(); renderSponsors();
    renderTeam(); renderFaq(); initJoin();
  }
  document.addEventListener('kmss:ready', () => {
    drawAll();
    document.addEventListener('kmss:lang', drawAll);
  });
})();
