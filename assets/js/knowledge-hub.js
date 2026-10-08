/* A progressively enhanced, accessible client-side filter for the public Knowledge Hub. */
(() => {
  'use strict';
  const root = document.querySelector('.knowledge-hub-page');
  if (!root) return;
  const input = root.querySelector('#knowledge-search');
  const chips = [...root.querySelectorAll('[data-knowledge-filter]')];
  const clusters = [...root.querySelectorAll('.related-cluster[id^="cluster-"]')];
  const result = root.querySelector('#knowledge-result-count');
  const empty = root.querySelector('#knowledge-empty');
  const clear = root.querySelector('#knowledge-clear');
  if (!input || !chips.length || !clusters.length || !result || !empty || !clear) return;
  let activeCluster = 'all';
  const normalize = value => (value || '').toLocaleLowerCase('fa')
    .normalize('NFKC')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const entries = clusters.flatMap(section => [...section.querySelectorAll('.related-cluster-grid > a')].map(card => ({
    card, section, text: normalize(card.textContent), cluster: section.id
  })));
  function refresh() {
    const q = normalize(input.value);
    let matches = 0;
    for (const entry of entries) {
      const show = (activeCluster === 'all' || activeCluster === entry.cluster) &&
        (!q || q.split(' ').every(term => entry.text.includes(term)));
      entry.card.hidden = !show;
      if (show) matches++;
    }
    for (const section of clusters) {
      section.hidden = ![...section.querySelectorAll('.related-cluster-grid > a')].some(card => !card.hidden);
    }
    for (const chip of chips) {
      const selected = chip.dataset.knowledgeFilter === activeCluster;
      chip.setAttribute('aria-pressed', String(selected));
    }
    result.textContent = matches === entries.length ? 'نمایش هر ۴۵ راهنما' :
      'نمایش ' + new Intl.NumberFormat('fa-IR').format(matches) + ' راهنما از ۴۵ راهنما';
    empty.hidden = matches !== 0;
    clear.hidden = !input.value;
  }
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { input.value = ''; refresh(); input.blur(); }
  });
  clear.addEventListener('click', () => { input.value = ''; refresh(); input.focus(); });
  chips.forEach(chip => chip.addEventListener('click', () => {
    activeCluster = chip.dataset.knowledgeFilter || 'all';
    refresh();
  }));
  refresh();
})();