(() => {
  const D = window.ARIS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const vh = () => window.innerHeight;
  // progress of a tall section scrolled through its sticky stage
  const prog = el => { const r = el.getBoundingClientRect(); const d = r.height - vh(); return d <= 0 ? 1 : clamp(-r.top / d); };

  /* ---------------- 1. 悩みの雲（3D） ---------------- */
  const cloud = $('#cloud');
  const words = [];
  if (cloud) {
    const list = D.worries;
    const N = Math.min(list.length * 3, window.innerWidth < 760 ? 80 : 140);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      s.textContent = list[i % list.length];
      const r = rnd();
      if (r > .93) s.className = 'redw'; else if (r > .8) s.className = 'hot';
      const spread = window.innerWidth < 760 ? 1.15 : 1.35;
      const small = window.innerWidth < 760; const w = { el: s, x: (rnd() - .5) * window.innerWidth * spread, y: (rnd() - .5) * vh() * 1.25, z: 150 - rnd() * 1450, size: small ? 10 + rnd() * 12 : 13 + rnd() * 22, a: .55 + rnd() * .45 };
      s.style.fontSize = w.size + 'px';
      cloud.appendChild(s); words.push(w);
    }
  }
  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  const dead = $('#dead'), qm = $('.qmark'), dots = $('.dots'), title = $('.title'), hint = $('.scroll-hint'), kick = $('.hero-kicker');
  function drawDead() {
    if (!dead) return;
    const p = prog(dead);
    // 0–.55: 言葉が手前へ流れる / .35–.6: ？ / .6–1: AI IS DEAD.
    const travel = p * 2900;
    cloud.style.transform = `rotateX(${my * -6}deg) rotateY(${mx * 8}deg)`;
    for (const w of words) {
      let z = w.z + travel;
      const o = z > 500 ? clamp(1 - (z - 500) / 300) : clamp((z + 2600) / 1400);
      const fadeOut = p > .55 ? clamp(1 - (p - .55) / .12) : 1;
      w.el.style.opacity = (w.a * o * fadeOut * (z > 800 ? 0 : 1)).toFixed(3);
      w.el.style.transform = `translate3d(${w.x}px,${w.y}px,${Math.min(z, 820)}px) translate(-50%,-50%)`;
    }
    const q = 1, qOut = clamp((p - .5) / .1);
    qm.style.opacity = (q * (1 - qOut)).toFixed(3);
    qm.style.transform = `translate(-50%,-50%) scale(${1 + p * .5 + qOut * 1.4}) rotate(${mx * 6}deg)`;
    dots.style.opacity = (1 - qOut).toFixed(3);
    const t = clamp((p - .62) / .14);
    title.style.opacity = t.toFixed(3);
    const l1 = $('.title .l1'), l2 = $('.title .l2');
    l1.style.transform = `translateY(${(1 - ease(t)) * 60}px) scale(${1 + (1 - ease(t)) * .25})`;
    const t2 = clamp((p - .68) / .12);
    l2.style.transform = `translateY(${(1 - ease(t2)) * 80}px) scale(${1 + (1 - ease(t2)) * .5})`;
    l2.style.opacity = t2.toFixed(3);
    $('.title .sub').style.opacity = clamp((p - .78) / .1).toFixed(3);
    hint.style.opacity = (1 - clamp(p / .08)).toFixed(3);
    kick.style.opacity = (1 - clamp((p - .4) / .1)).toFixed(3);
  }

  /* ---------------- 2. 縦書き：スクロールで一行ずつ ---------------- */
  function buildVT(el, lines) {
    el.innerHTML = lines.map(l => l === '' ? '<span class="gap"></span>' : `<span class="ln${l.startsWith('!') ? ' end' : ''}">${l.replace(/^!/, '').replace(/\[\[(.+?)\]\]/g, '<mark class="r">$1</mark>').replace(/\[(.+?)\]/g, '<mark>$1</mark>')}</span>`).join('');
  }
  const mani = $('#manifesto');
  if (mani) buildVT($('#vt-dead'), D.deadLines);
  const fp = $('#vt-fire');
  if (fp) buildVT(fp, D.fireLines);
  function drawVT(sec, vt, mult = 1) {
    if (!sec) return;
    const lns = $$('.ln', vt);
    let p;
    if (sec.classList.contains('manifesto')) p = prog(sec) * 1.15;
    else { const r = vt.getBoundingClientRect(); p = clamp((vh() * .9 - r.top) / (r.height + vh() * .35)) * 1.1; }
    const n = Math.floor(p * lns.length * mult);
    lns.forEach((l, i) => l.classList.toggle('on', i < n));
  }

  /* ---------------- 3. 燃える遷移 ---------------- */
  const burn = $('#burn');
  const cvs = $('#embers'), ctx = cvs && cvs.getContext('2d');
  const embers = [];
  function sizeCanvas() { if (!cvs) return; const d = Math.min(devicePixelRatio, 2); cvs.width = cvs.clientWidth * d; cvs.height = cvs.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  function drawBurn() {
    if (!burn) return;
    const p = prog(burn);
    const hole = ease(clamp(p / .42)) * 150;
    $('.black', burn).style.setProperty('--hole', hole + '%');
    const rise = ease(clamp((p - .22) / .4)) * vh() * (innerWidth < 760 ? .64 : .56);
    $('.team', burn).style.setProperty('--rise', rise + 'px');
    $('.heat', burn).style.setProperty('--heat', clamp((p - .2) / .3));
    burn.classList.toggle('lit', p > .1);
    burn.dataset.p = p;
    // header theme
    return p;
  }
  function tickEmbers() {
    if (!cvs || RM) return;
    const r = burn.getBoundingClientRect();
    const active = r.top < vh() && r.bottom > 0;
    const p = +burn.dataset.p || 0;
    const W = cvs.clientWidth, H = cvs.clientHeight;
    ctx.clearRect(0, 0, W, H);
    if (active && p > .02 && p < .97) {
      const rate = p < .5 ? 6 : 2;
      for (let i = 0; i < rate; i++) embers.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - .5) * .8, vy: -(1.2 + Math.random() * 3.2), life: 1, s: 1 + Math.random() * 3 });
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x += e.vx + Math.sin((e.y + i) / 40) * .4; e.y += e.vy; e.life -= .008;
      if (e.life <= 0 || e.y < -20) { embers.splice(i, 1); continue; }
      ctx.globalAlpha = e.life;
      ctx.fillStyle = e.life > .6 ? '#ffb347' : '#d30a0a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- header / 温度計 ---------------- */
  const hdr = $('.hdr'), temp = $('.temp i');
  function drawChrome() {
    const blueTop = $('#blue').getBoundingClientRect().top;
    const burnP = +(burn && burn.dataset.p) || 0;
    const final = $('#final').getBoundingClientRect();
    const light = (blueTop < 60 || burnP > .1) && !(final.top < 60 && final.bottom > 60);
    hdr.classList.toggle('light', light);
    hdr.classList.toggle('solid', !light && scrollY > vh() * 2.6);
    const total = document.documentElement.scrollHeight - vh();
    temp.parentElement.style.setProperty('--p', (scrollY / total * 100) + '%');
    temp.style.height = (scrollY / total * 100) + '%';
  }

  /* ---------------- 4. 3Dカード傾き ---------------- */
  if (!RM && matchMedia('(hover:hover)').matches) {
    $$('.card3d').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `rotateY(${x * 14}deg) rotateX(${y * -12}deg) translateZ(10px)`;
      });
      c.addEventListener('pointerleave', () => c.style.transform = '');
    });
  }

  /* ---------------- 5. キーキャップ ---------------- */
  const kb = $('#keys'), out = $('#keyout');
  if (kb) {
    kb.innerHTML = D.cando.map((k, i) => `<button class="kc" aria-pressed="${i === 0}" data-i="${i}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg><span><b>${esc(k.name)}</b><small>${esc(k.sub)}</small></span></button>`).join('');
    let typer;
    const show = i => {
      const k = D.cando[i];
      $$('.kc', kb).forEach(b => b.setAttribute('aria-pressed', b.dataset.i == i));
      $('.say', out).innerHTML = `<h4>${esc(k.h)}</h4><p>${esc(k.p)}</p>`;
      const scr = $('.screen', out); scr.innerHTML = '';
      clearTimeout(typer);
      let j = 0;
      const step = () => {
        if (j >= k.demo.length) return;
        const d = k.demo[j++];
        const row = document.createElement('div'); row.className = 'row';
        const cls = d.who === 'AI' ? 'ai' : d.who === '人' ? 'hu' : 'au';
        row.innerHTML = `<span class="who ${cls}">${esc(d.who)}</span><span>${esc(d.text)}</span>`;
        $$('.cur', scr).forEach(c => c.classList.remove('cur'));
        row.lastChild.classList.add('cur');
        scr.appendChild(row);
        typer = setTimeout(step, RM ? 0 : 650);
      };
      step();
    };
    kb.addEventListener('click', e => { const b = e.target.closest('.kc'); if (b) show(+b.dataset.i); });
    show(0);
  }

  /* ---------------- 6. CASES ---------------- */
  const tabs = $('#case-tabs'), stage = $('#case-stage');
  function renderCase(i) {
    const c = D.cases[i];
    $$('.case-tab', tabs).forEach(t => t.setAttribute('aria-selected', t.dataset.i == i));
    const ratio = c.time ? c.time.ratio : null;
    stage.innerHTML = `
    <article class="case-card" aria-live="polite">
      <div class="case-head">
        <div><span class="tag">${esc(c.tag)}</span><span class="cl">${esc(c.task)}</span>
          <h3>${esc(c.title)}</h3></div>
        <div class="metric"><span class="v" data-to="${c.metric.v}">${c.metric.v}</span><span class="u">${esc(c.metric.u)}</span><small>${esc(c.metric.label)}</small></div>
      </div>
      <div class="case-body">
        <div class="flipper">
          <div class="flip-toggle" role="group" aria-label="導入前後の切り替え">
            <button class="b" aria-pressed="true" data-f="0">${c.io ? '入れるもの' : 'これまで'}</button><button aria-pressed="false" data-f="1">${c.io ? '出てくるもの' : '導入後'}</button>
          </div>
          <div class="flip">
            <div class="side before"><span class="lbl">${c.io ? 'INPUT' : 'BEFORE'}</span><div class="big">${esc(c.before.label)}</div><p>${esc(c.before.detail)}</p></div>
            <div class="side aft"><span class="lbl">${c.io ? 'OUTPUT' : 'AFTER'}</span><div class="big">${esc(c.after.label)}</div><p>${esc(c.after.detail)}</p></div>
          </div>
          ${c.time ? `<div class="timebar">${esc(c.time.unit)}あたりの作業時間（当社試算）<div class="bars"><div class="b b1" style="width:100%">${esc(c.time.before)}</div><div class="b2row"><div class="b b2" style="width:100%" data-w="${Math.max(ratio * 100, 14)}">${esc(c.time.after)}</div><strong>${esc(c.time.red)}</strong></div></div></div>` : ''}
        </div>
        <div class="steps">${c.img ? `<img class="case-ill" src="assets/${c.img}.webp" alt="" width="1000" height="660">` : ''}<h4>エージェントの動き</h4><ol>${c.steps.map((s, k) => `<li style="animation-delay:${k * 90}ms"><span class="who ${s.who === 'AI' ? 'ai' : s.who === '人' ? 'hu' : 'au'}">${esc(s.who === '自動' ? '自動処理' : s.who)}</span><span>${esc(s.text)}</span></li>`).join('')}</ol></div>
      </div>
    </article>`;
    const card = $('.case-card', stage), flip = $('.flip', card);
    const setF = f => { flip.classList.toggle('after', !!f); $$('.flip-toggle button', card).forEach(b => b.setAttribute('aria-pressed', b.dataset.f == f)); };
    $('.flip-toggle', card).addEventListener('click', e => { const b = e.target.closest('button'); if (b) setF(+b.dataset.f); });
    // 自動で「導入後」へめくる
    setTimeout(() => { setF(1); const b2 = $('.b2', card); if (b2) b2.style.width = b2.dataset.w + '%'; }, RM ? 0 : 900);
    countUp($('.metric .v', card));
  }
  function countUp(el) {
    const raw = el.dataset.to; const to = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(to) || RM) return;
    const dec = (raw.split('.')[1] || '').length, t0 = performance.now(), dur = 900;
    const f = t => { const k = ease(clamp((t - t0) / dur)); el.textContent = (to * k).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ','); if (k < 1) requestAnimationFrame(f); else el.textContent = raw; };
    requestAnimationFrame(f);
  }
  if (tabs) {
    tabs.innerHTML = D.cases.map((c, i) => `<button class="case-tab" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(c.short)}<span class="c">${esc(c.tag)}</span></span></button>`).join('');
    tabs.addEventListener('click', e => { const t = e.target.closest('.case-tab'); if (t) renderCase(+t.dataset.i); });
    tabs.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const cur = $$('.case-tab', tabs).findIndex(t => t.getAttribute('aria-selected') === 'true');
      const n = (cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + D.cases.length) % D.cases.length;
      renderCase(n); $$('.case-tab', tabs)[n].focus(); e.preventDefault();
    });
    let started = false;
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !started) { started = true; renderCase(0); } }), { threshold: .2 }).observe(stage);
  }

  /* ---------------- 7. 20領域 ---------------- */
  const plane = $('#plane'), panel = $('#dom-panel');
  function renderDomain(i) {
    const d = D.domains[i];
    $$('.tile', plane).forEach(t => t.setAttribute('aria-pressed', t.dataset.i == i));
    panel.innerHTML = `<div class="cat">${esc(d.cat)}｜${esc(d.id)}</div><h3>${esc(d.name)}</h3><p style="font-size:14px;color:#4d6378;margin-top:6px">${esc(d.desc)}</p>
      <div class="q">${esc(d.q)}</div>
      <ul>${d.themes.map((t, k) => `<li><span class="ai">案${k + 1}</span><div><b>${esc(t.name)}</b><span>${esc(t.catch)}</span></div></li>`).join('')}</ul>
`;
  }
  if (plane) {
    plane.innerHTML = D.domains.map((d, i) => `<button class="tile" data-i="${i}" data-cat="${esc(d.cat)}" aria-pressed="false" aria-label="${esc(d.id + ' ' + d.name)}"><span class="s1"></span><span class="s2"></span><span class="top"><span>${esc(d.id)}</span></span></button>`).join('');
    plane.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) { renderDomain(+t.dataset.i); if (innerWidth < 1000) panel.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }); } });
    plane.addEventListener('pointerover', e => { const t = e.target.closest('.tile:not(.dim)'); if (t && matchMedia('(hover:hover)').matches) renderDomain(+t.dataset.i); });
    $('#filters').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const c = b.dataset.cat;
      $$('.tile', plane).forEach(t => t.classList.toggle('dim', c !== 'all' && t.dataset.cat !== c));
      const first = D.domains.findIndex(d => c === 'all' || d.cat === c); renderDomain(first);
    });
    renderDomain(0);
  }

  /* ---------------- 8. 守り⇄攻め ---------------- */
  /* ---------------- 9. 横展開 ---------------- */
  const spread = $('#spread');
  if (spread) {
    let on = false;
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !on) { on = true; $$('.dep', spread).forEach((d, i) => setTimeout(() => d.classList.add('on'), RM ? 0 : 300 + i * 260)); }
    }), { threshold: .5 }).observe(spread);
  }

  /* ---------------- 10. 数字 ---------------- */
  $$('.num .v b').forEach(el => { const o = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { countUp(el); o.disconnect(); } }), { threshold: .6 }); o.observe(el); });
  const belt = $('#belt');
  if (belt) { const L = [['sharefull','シェアフル'],['memoryd','メモリード'],['macnica','マクニカ'],['human-resocia','ヒューマンリソシア'],['roxx','ROXX'],['acn','ACN'],['tryhard-japan','TryHard JAPAN'],['resol','リソルグループ'],['cyberstep','CyberStep'],['yokucio','YOKUCIO GROUP'],['plage','PLAGE']]; const row = hid => L.map(([n, a]) => `<div class="logo"${hid ? ' aria-hidden="true"' : ''}><img src="assets/client-${n}.webp" alt="${hid ? '' : a}" loading="lazy"></div>`).join(''); belt.innerHTML = row(false) + row(true); }

  /* ---------------- reveal ---------------- */
  const ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }), { threshold: .15 });
  $$('.rv').forEach(el => ro.observe(el));

  /* ---------------- FAQ ---------------- */
  const faq = $('#faq-list');
  if (faq) faq.innerHTML = D.faq.map(f => `<details><summary><span class="q">Q</span><span>${esc(f.q)}</span><span class="pm" aria-hidden="true"></span></summary><div class="a">${esc(f.a)}</div></details>`).join('');

  /* ---------------- loop ---------------- */
  let last = -1;
  function frame() {
    const y = scrollY;
    if (y !== last) {
      last = y;
      drawDead(); drawBurn(); drawChrome();
      drawVT(mani, $('#vt-dead'));
      drawVT($('#fullpower'), fp);
    } else if (words.length && dead.getBoundingClientRect().bottom > 0) drawDead();
    tickEmbers();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
