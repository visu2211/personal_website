// Shared behavior for every page: topo map ground, lantern + firefly cursor,
// trail-blaze pagination, scroll reveals, copy buttons.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const css = getComputedStyle(document.documentElement);
  const token = (n) => css.getPropertyValue(n).trim();

  /* ---------- topographic ground ---------- */
  // Seeded value noise -> marching squares contours, drawn twice:
  // faint on #topo, bright on #topo-lit (masked to a circle around the cursor).
  function makeNoise(seed) {
    const perm = new Uint8Array(512);
    const p = [...Array(256).keys()];
    let s = seed;
    for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const val = (x, y) => perm[(x & 255) + perm[y & 255]] / 255;
    const fade = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = fade(xf), v = fade(yf);
      const a = val(xi, yi), b = val(xi + 1, yi), c = val(xi, yi + 1), d = val(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  const noise = makeNoise(20270522);
  const field = (x, y) => noise(x, y) * .6 + noise(x * 2.1 + 31, y * 2.1 + 17) * .28 + noise(x * 4.3 + 7, y * 4.3 + 91) * .12;

  function drawTopo() {
    const base = document.getElementById('topo');
    const lit = document.getElementById('topo-lit');
    if (!base) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    const cell = W < 700 ? 10 : 8;
    const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
    const scale = 1 / 260;
    const g = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) g[j * cols + i] = field(i * cell * scale, j * cell * scale);
    const levels = 16;
    const segs = [];
    for (let L = 1; L < levels; L++) {
      const t = L / levels, path = [];
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        const a = g[j * cols + i], b = g[j * cols + i + 1], c = g[(j + 1) * cols + i + 1], d = g[(j + 1) * cols + i];
        const idx = (a > t) | ((b > t) << 1) | ((c > t) << 2) | ((d > t) << 3);
        if (idx === 0 || idx === 15) continue;
        const x = i * cell, y = j * cell;
        const lerp = (p, q) => (t - p) / (q - p);
        const T = [x + cell * lerp(a, b), y], R = [x + cell, y + cell * lerp(b, c)];
        const B = [x + cell * lerp(d, c), y + cell], Lf = [x, y + cell * lerp(a, d)];
        const table = { 1: [Lf, T], 2: [T, R], 3: [Lf, R], 4: [R, B], 5: [Lf, T, R, B], 6: [T, B], 7: [Lf, B],
          8: [B, Lf], 9: [B, T], 10: [T, R, B, Lf], 11: [B, R], 12: [R, Lf], 13: [R, T], 14: [T, Lf] };
        const s = table[idx];
        for (let k = 0; k < s.length; k += 2) path.push(s[k], s[k + 1]);
      }
      segs.push({ path, major: L % 4 === 0 });
    }
    const paint = (cv, color, alphaMinor, alphaMajor) => {
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = color; ctx.lineCap = 'round';
      for (const { path, major } of segs) {
        ctx.globalAlpha = major ? alphaMajor : alphaMinor;
        ctx.lineWidth = major ? 1.3 : .8;
        ctx.beginPath();
        for (let k = 0; k < path.length; k += 2) { ctx.moveTo(path[k][0], path[k][1]); ctx.lineTo(path[k + 1][0], path[k + 1][1]); }
        ctx.stroke();
      }
    };
    paint(base, token('--lichen'), .07, .13);
    if (lit) paint(lit, token('--firefly'), .45, .8);
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawTopo, 200); });
  drawTopo();

  /* ---------- lantern + firefly cursor ---------- */
  if (finePointer) {
    const root = document.documentElement;
    const fly = document.createElement('div'); fly.className = 'firefly'; document.body.appendChild(fly);
    let mx = innerWidth / 2, my = innerHeight / 3, fx = mx, fy = my, last = 0;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      root.style.setProperty('--mx', mx + 'px'); root.style.setProperty('--my', my + 'px');
      fly.classList.add('on');
      const now = performance.now();
      if (!reduce && now - last > 70) { last = now; spark(fx, fy); }
    });
    document.addEventListener('pointerleave', () => fly.classList.remove('on'));
    document.addEventListener('pointerover', (e) => fly.classList.toggle('hover', !!e.target.closest('a, button, [role="button"], input, select')));
    const spark = (x, y) => {
      const s = document.createElement('span'); s.className = 'spark';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 24 - 12) + 'px'); s.style.setProperty('--dy', (-Math.random() * 22 - 4) + 'px');
      document.body.appendChild(s); setTimeout(() => s.remove(), 900);
    };
    let t = 0;
    (function loop() {
      t += .04;
      const ease = reduce ? 1 : .14;
      fx += (mx - fx) * ease; fy += (my - fy) * ease;
      const wob = reduce ? 0 : 4;
      fly.style.transform = `translate(${fx + Math.sin(t * 1.7) * wob}px, ${fy + Math.cos(t * 1.3) * wob}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- trail pagination ---------- */
  // Desktop: a winding trail that draws itself as you scroll, a lantern riding your exact position,
  // painted blazes per section, and a label for where you are. J / K jump between sections.
  // Phones: a floating pill with a progress ring that opens a list of sections.
  const secs = [...document.querySelectorAll('[data-trail]')];
  if (secs.length > 1) {
    const n = secs.length, GAP = 46, PAD = 12, W = 28, H = PAD * 2 + GAP * (n - 1);
    const xAt = (y) => W / 2 + 6 * Math.sin(((y - PAD) / GAP) * Math.PI);
    const yAt = (i) => PAD + i * GAP;
    // sample the path so we can map any y to a length along it
    const pts = [], lens = [];
    let d = '', acc = 0;
    for (let y = PAD; y <= H - PAD + 0.01; y += 2) {
      const x = xAt(y);
      if (pts.length) { const [px, py] = pts[pts.length - 1]; acc += Math.hypot(x - px, y - py); }
      pts.push([x, y]); lens.push(acc);
      d += (pts.length === 1 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    const L = acc;
    const lenAt = (y) => { const k = Math.max(0, Math.min(lens.length - 1, Math.round((y - PAD) / 2))); return lens[k]; };
    const name = (i) => secs[i].dataset.trail;
    const num = (i) => String(i + 1).padStart(2, '0');

    const nav = document.createElement('nav');
    nav.className = 'trail'; nav.setAttribute('aria-label', 'Page sections');
    nav.style.height = H + 'px';
    nav.innerHTML = `
      <svg class="trail-path" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <path class="t-bg" d="${d}"/><path class="t-walk" d="${d}" style="stroke-dasharray:${L};stroke-dashoffset:${L}"/>
      </svg>
      <span class="lantern" aria-hidden="true"></span>
      <div class="trail-label" aria-hidden="true"><b></b><span></span></div>
      <div class="trail-keys" aria-hidden="true"><kbd>J</kbd><kbd>K</kbd></div>`;
    const walk = nav.querySelector('.t-walk'), lantern = nav.querySelector('.lantern'), label = nav.querySelector('.trail-label');
    const blazes = secs.map((sec, i) => {
      const b = document.createElement('button');
      b.className = 'blaze'; b.type = 'button';
      b.style.left = xAt(yAt(i)) - 4 + 'px'; b.style.top = yAt(i) - 7 + 'px';
      b.setAttribute('aria-label', `Jump to ${name(i)}`);
      b.innerHTML = `<span class="tip">${name(i)}</span>`;
      b.addEventListener('click', () => go(i));
      nav.appendChild(b); return b;
    });
    document.body.appendChild(nav);

    // phone pill + sheet
    const pill = document.createElement('button');
    pill.className = 'trail-pill'; pill.type = 'button'; pill.setAttribute('aria-expanded', 'false'); pill.setAttribute('aria-controls', 'trail-sheet');
    pill.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="r-bg"/><circle cx="18" cy="18" r="15" class="r-fg" pathLength="100"/></svg>
      <span class="p-num"></span><span class="p-name"></span><span class="p-chev" aria-hidden="true">▴</span>`;
    const sheet = document.createElement('div');
    sheet.className = 'trail-sheet'; sheet.id = 'trail-sheet'; sheet.hidden = true;
    sheet.innerHTML = `<div class="ts-head">On this page</div><ol>${secs.map((_, i) => `<li><button type="button" data-i="${i}"><i class="ts-blaze"></i><b>${num(i)}</b>${name(i)}</button></li>`).join('')}</ol>`;
    document.body.append(sheet, pill);
    const closeSheet = () => { sheet.hidden = true; pill.setAttribute('aria-expanded', 'false'); };
    pill.addEventListener('click', () => { sheet.hidden = !sheet.hidden; pill.setAttribute('aria-expanded', String(!sheet.hidden)); });
    sheet.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { closeSheet(); go(+b.dataset.i); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

    let cur = -1;
    function go(i) { secs[Math.max(0, Math.min(n - 1, i))].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
    function update() {
      const mid = innerHeight * 0.4;
      const tops = secs.map((s) => s.getBoundingClientRect().top);
      let i = 0; tops.forEach((t, k) => { if (t <= mid) i = k; });
      let f = i;
      if (i < n - 1) f = i + Math.max(0, Math.min(1, (mid - tops[i]) / (tops[i + 1] - tops[i] || 1)));
      const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      if (atEnd) { f = n - 1; i = n - 1; }
      const y = PAD + f * GAP;
      walk.style.strokeDashoffset = L - lenAt(y);
      lantern.style.transform = `translate(${xAt(y) - 5}px, ${y - 5}px)`;
      const pageP = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      pill.querySelector('.r-fg').style.strokeDashoffset = 100 - pageP * 100;
      if (i !== cur) {
        cur = i;
        blazes.forEach((b, k) => { b.setAttribute('aria-current', k === i ? 'true' : 'false'); b.classList.toggle('passed', k < i); });
        label.style.transform = `translateY(${yAt(i) - 11}px)`;
        label.classList.remove('swap'); void label.offsetWidth; label.classList.add('swap');
        label.querySelector('b').textContent = num(i); label.querySelector('span').textContent = name(i);
        pill.querySelector('.p-num').textContent = `${num(i)}/${num(n - 1)}`; pill.querySelector('.p-name').textContent = name(i);
        sheet.querySelectorAll('[data-i]').forEach((b) => b.toggleAttribute('aria-current', +b.dataset.i === i));
      }
    }
    let ticking = false;
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); update();

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); go(cur - 1); }
    });
  }

  /* ---------- reveals: only content below the fold starts hidden ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.remove('pending'); io.unobserve(e.target); }
    }), { threshold: .1 });
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('pending'); el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el);
      }
    });
  }

  /* ---------- no lone last words: join each paragraph's last two words (backs up CSS text-wrap: pretty) ---------- */
  const noWidow = (root = document) => root.querySelectorAll('main p, main li, main dd, main .tagline, .sec-intro').forEach((el) => {
    if (el.dataset.nw || el.textContent.trim().length < 40) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let last = null;
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) last = walker.currentNode;
    if (!last) return;
    const v = last.nodeValue.replace(/\s+$/, ''), i = v.lastIndexOf(' ');
    if (i > 0 && v.length - i < 14) { last.nodeValue = v.slice(0, i) + '\u00A0' + v.slice(i + 1) + last.nodeValue.slice(v.length); el.dataset.nw = '1'; }
  });
  noWidow();
  window.noWidow = noWidow; // pages that render text later (live stats, cards) call this after rendering

  /* ---------- spotlight on cards ---------- */
  document.querySelectorAll('.proj').forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--px', e.clientX - r.left + 'px'); c.style.setProperty('--py', e.clientY - r.top + 'px');
  }));

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.copy);
    const done = (msg) => { btn.textContent = msg; setTimeout(() => (btn.textContent = 'Copy'), 1600); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected'); };
    try { navigator.clipboard.writeText(el.textContent.trim()).then(() => done('Copied'), fallback); } catch { fallback(); }
  }));
})();
