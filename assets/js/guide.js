/* ==========================================================================
   KMSS — Melbourne Guide
   Reads data/guide.json and builds the sidebar, sections and search.
   ========================================================================== */

(() => {
  'use strict';
  const { t, pick, esc, el, I } = KMSS;
  let CATS = [];

  function itemNode(item) {
    const points = (item.points || []).map(p => `<li>${esc(pick(p))}</li>`).join('');
    const links = (item.links || []).filter(l => l.url)
      .map(l => `<a class="btn btn--ghost btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${I.arrow}</a>`).join('');
    const node = el('details', { class: 'gitem' });
    node.innerHTML = `
      <summary>${esc(pick(item.title))}${I.chev}</summary>
      <div class="gitem__body">
        <p>${esc(pick(item.body))}</p>
        ${points ? `<ul>${points}</ul>` : ''}
        ${links ? `<div class="gitem__links">${links}</div>` : ''}
      </div>`;
    node._text = [pick(item.title), pick(item.body), ...(item.points || []).map(pick),
                  ...(item.links || []).map(l => l.label)].join(' ').toLowerCase();
    return node;
  }

  function checklistNode(items) {
    const ul = el('ul', { class: 'checklist' });
    items.forEach(item => {
      const li = el('li');
      li.innerHTML = `<div><b>${esc(pick(item.title))}</b><p>${esc(pick(item.body))}</p>
        ${(item.links || []).filter(l => l.url).map(l =>
          `<a class="btn btn--ghost btn--sm" style="margin-top:10px" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${I.arrow}</a>`).join('')}</div>`;
      li._text = [pick(item.title), pick(item.body)].join(' ').toLowerCase();
      ul.appendChild(li);
    });
    return ul;
  }

  function render() {
    const nav = document.getElementById('guide-nav');
    const body = document.getElementById('guide-body');
    if (!nav || !body) return;

    nav.innerHTML = CATS.map((c, i) =>
      `<button data-go="${esc(c.id)}" class="${i === 0 ? 'is-active' : ''}">
         <span aria-hidden="true">${esc(c.icon || '•')}</span> ${esc(pick(c.title))}</button>`).join('');

    body.innerHTML = '';
    CATS.forEach(cat => {
      const sec = el('section', { class: 'guide-cat reveal', id: cat.id });
      sec.innerHTML = `
        <div class="guide-cat__head">
          <div class="guide-cat__icon" aria-hidden="true">${esc(cat.icon || '•')}</div>
          <h2 style="font-size:clamp(1.4rem,3vw,1.9rem)">${esc(pick(cat.title))}</h2>
        </div>
        ${pick(cat.intro) ? `<p class="lede">${esc(pick(cat.intro))}</p>` : ''}`;
      const holder = cat.type === 'checklist'
        ? checklistNode(cat.items || [])
        : (() => { const g = el('div', { class: 'guide-items' }); (cat.items || []).forEach(i => g.appendChild(itemNode(i))); return g; })();
      holder.classList.add('guide-items-host');
      sec.appendChild(holder);
      body.appendChild(sec);
    });

    nav.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      document.getElementById(b.dataset.go)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Highlight the sidebar entry for whichever section is on screen
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        nav.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('is-active', b.dataset.go === e.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    body.querySelectorAll('.guide-cat').forEach(s => io.observe(s));

    KMSS.watchReveals(body);
  }

  function initSearch() {
    const input = document.getElementById('guide-search');
    const body = document.getElementById('guide-body');
    const nores = document.getElementById('guide-nores');
    if (!input || !body) return;
    input.oninput = () => {
      const term = input.value.trim().toLowerCase();
      let hits = 0;
      body.querySelectorAll('.guide-cat').forEach(sec => {
        let secHits = 0;
        sec.querySelectorAll('.gitem, .checklist li').forEach(node => {
          const show = !term || (node._text || '').includes(term);
          node.classList.toggle('hide', !show);
          if (show) { secHits++; if (term && node.tagName === 'DETAILS') node.open = true; }
        });
        sec.classList.toggle('hide', term && secHits === 0);
        hits += secHits;
      });
      nores?.classList.toggle('hide', !(term && hits === 0));
    };
  }

  document.addEventListener('kmss:ready', async () => {
    if (document.body.dataset.page !== 'guide') return;
    try {
      const data = await KMSS.loadJSON('guide');
      CATS = data.categories || [];
    } catch {
      KMSS.errorBanner(document.getElementById('guide-body'), '(data/guide.json)');
      return;
    }
    render(); initSearch();
    document.addEventListener('kmss:lang', () => { render(); initSearch(); });
  });
})();
