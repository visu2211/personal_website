// Command palette: press ⌘K (Ctrl+K elsewhere) or the search chip in the nav, type to filter, ↑↓ to move, Enter to run.
// Sections on the current page come from its [data-trail] markers, so each page gets its own "Go" list.
(() => {
  const EMAIL = 'vkanala22@gmail.com';
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';   // '/' and '/index' are both home
  const here = (p) => page === p || (p === 'index' && page === '');

  const I = {
    go: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    out: '<path d="M7 17 17 7M8 7h9v9"/>',
    page: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    fire: '<path d="M12 3c2.5 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1.6-4.6 2.5-6.5.8 2 1.7 3 2.5 3-.8-3 0-5.5 1-7.5Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  const open = (url) => window.open(url, '_blank', 'noopener');
  const goTo = (el) => { close(); el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };

  function commands() {
    const list = [];
    const add = (group, label, icon, run, extra = {}) => list.push({ group, label, icon, run, ...extra });

    // plain words people type for each section, since the labels are trail-themed
    const KEYS = { notes: 'about me bio', basecamp: 'education school rutgers gpa', log: 'work experience jobs internships capital one', projects: 'projects built portfolio',
      pack: 'skills tech stack languages', badges: 'leadership teaching ta involvement', eagle: 'eagle scout scouting', side: 'hobbies beyond scrapbook',
      campfire: 'contact talk email', training: 'gym lifting running hevy strava', music: 'spotify songs listening', chess: 'chess rating', court: 'hobbies volleyball motorcycle games ps5',
      map: 'globe places', journal: 'photos trips' };
    // this page's sections, in page order
    document.querySelectorAll('[data-trail]').forEach((el) => {
      if (el.matches('.hero, .page-head')) return;
      const title = el.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim();
      add('Go', `Go to ${el.dataset.trail}`, 'go', () => goTo(el), { hint: title, keys: `${title} ${el.id} ${KEYS[el.id] || ''}` });
    });
    add('Go', 'Back to top', 'up', () => { close(); scrollTo({ top: 0, behavior: 'smooth' }); });

    const pages = [['index', 'Work', 'home résumé experience projects'], ['beyond', 'Beyond code', 'hobbies chess spotify music lifting running volleyball motorcycle ps5'],
      ['scrapbook', 'Scrapbook', 'places travel trips journal'], ['world', 'World globe', 'map places travel'], ['photos', 'Photo album', 'pictures eagle scout']];
    pages.filter(([p]) => !here(p)).forEach(([p, name, keys]) =>
      add('Pages', name, p === 'world' ? 'globe' : 'page', () => { location.href = p === 'index' ? '/' : `/${p}`; }, { keys }));

    add('Open', 'LinkedIn', 'out', () => open('https://linkedin.com/in/vishal-kanala'), { hint: 'new tab', keys: 'linkedin profile' });
    add('Open', 'GitHub', 'out', () => open('https://github.com/visu2211'), { hint: 'new tab', keys: 'code repos' });
    add('Open', 'Play me on chess.com', 'out', () => open('https://www.chess.com/member/visu22'), { hint: 'new tab', keys: 'chess blitz challenge' });
    add('Open', 'Volleyball clips on Hudl', 'out', () => open('https://www.hudl.com/profile/17503000/Vishal-Kanala'), { hint: 'new tab', keys: 'volleyball highlights video' });
    add('Open', 'Recent runs on Strava', 'out', () => open('https://www.strava.com/athletes/visu22'), { hint: 'new tab', keys: 'running strava' });
    add('Open', 'Workouts on Hevy', 'out', () => open('https://hevy.com/user/visu22'), { hint: 'new tab', keys: 'lifting gym hevy' });
    add('Open', 'Open Tab in Profile extension', 'out', () => open('https://chromewebstore.google.com/detail/open-tab-in-profile/ghlooolfgfmophmhdidhpdgdfemibaab'), { hint: 'new tab', keys: 'chrome web store project' });

    add('Contact', 'Copy email', 'copy', async (row) => {
      try { await navigator.clipboard.writeText(EMAIL); row.querySelector('.cmd-hint').textContent = 'Copied ✓'; setTimeout(close, 700); }
      catch { location.href = `mailto:${EMAIL}`; }
    }, { hint: EMAIL, keys: 'email address contact', keep: true });
    add('Contact', 'Email me', 'mail', () => { close(); location.href = `mailto:${EMAIL}`; }, { keys: 'mail contact' });

    add('Fun', 'Pull up a log by the fire', 'fire', () => {
      if (here('index')) { const g = document.getElementById('grab'); goTo(document.getElementById('campfire')); setTimeout(() => g && !g.closest('.toppled') && g.click(), 700); }
      else location.href = '/#pull-up';
    }, { keys: 'campfire talk contact' });
    add('Fun', 'Spin the globe', 'globe', () => { location.href = '/world'; }, { keys: 'world map' });
    return list;
  }

  /* ---------- markup ---------- */
  const root = document.createElement('div');
  root.className = 'cmdk'; root.hidden = true;
  root.innerHTML = `
    <div class="cmdk-scrim" data-close></div>
    <div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Command menu">
      <div class="cmdk-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="text" placeholder="Type a command, or try ‘chess’…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" spellcheck="false">
        <kbd data-close>esc</kbd>
      </div>
      <div class="cmdk-list" id="cmdk-list" role="listbox"></div>
      <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> run</span><span class="cmdk-k">${mac ? '⌘' : 'Ctrl'} K</span></div>
    </div>`;
  document.body.append(root);
  const input = root.querySelector('input'), listEl = root.querySelector('.cmdk-list');
  let items = [], shown = [], active = 0, lastFocus = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // every typed word must appear in the label, hint or keywords
  const matches = (c, q) => q.split(/\s+/).every((w) => `${c.label} ${c.hint || ''} ${c.keys || ''} ${c.group}`.toLowerCase().includes(w));

  function render() {
    const q = input.value.trim().toLowerCase();
    shown = q ? items.filter((c) => matches(c, q)) : items;
    active = Math.min(active, Math.max(shown.length - 1, 0));
    if (!shown.length) { listEl.innerHTML = `<p class="cmdk-empty">Nothing matches “${esc(input.value)}”. Try “email” or “chess”.</p>`; return; }
    let html = '', group = '';
    shown.forEach((c, i) => {
      if (c.group !== group) { group = c.group; html += `<div class="cmdk-group">${group}</div>`; }
      html += `<button type="button" class="cmd" role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i === active}">${svg(c.icon)}<span class="cmd-label">${esc(c.label)}</span>${c.hint ? `<span class="cmd-hint">${esc(c.hint)}</span>` : ''}</button>`;
    });
    listEl.innerHTML = html;
    input.setAttribute('aria-activedescendant', `cmd-${active}`);
  }
  function setActive(i, scroll = true) {
    if (!shown.length) return;
    active = (i + shown.length) % shown.length;
    listEl.querySelectorAll('.cmd').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === active)));
    input.setAttribute('aria-activedescendant', `cmd-${active}`);
    if (scroll) listEl.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }
  function run(i) {
    const c = shown[i]; if (!c) return;
    const row = listEl.querySelector(`[data-i="${i}"]`);
    if (!c.keep) close();
    c.run(row);
  }
  function openPalette() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    items = commands(); input.value = ''; active = 0; render();
    root.hidden = false; document.documentElement.classList.add('cmdk-open');
    requestAnimationFrame(() => { root.classList.add('on'); input.focus(); });
  }
  function close() {
    if (root.hidden) return;
    root.classList.remove('on'); document.documentElement.classList.remove('cmdk-open');
    setTimeout(() => { root.hidden = true; }, 160);
    lastFocus?.focus?.({ preventScroll: true });
  }

  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    else if (e.key === 'Tab') e.preventDefault();      // focus stays in the dialog
  });
  listEl.addEventListener('pointermove', (e) => { const b = e.target.closest('.cmd'); if (b && +b.dataset.i !== active) setActive(+b.dataset.i, false); });
  listEl.addEventListener('click', (e) => { const b = e.target.closest('.cmd'); if (b) run(+b.dataset.i); });
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.hidden ? openPalette() : close(); }
    else if (e.key === 'Escape' && !root.hidden) { e.preventDefault(); close(); }
  }, true);

  // search chip in the nav, so it's discoverable (and tappable on phones)
  const nav = document.querySelector('.site-nav .inner');
  if (nav) {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'cmdk-chip'; chip.setAttribute('aria-label', 'Open command menu');
    chip.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd>`;
    chip.addEventListener('click', openPalette);
    nav.append(chip);
  }
})();
