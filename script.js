(() => {
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const barra = document.getElementById('barra');
  const sc = () => barra.classList.toggle('cheia', scrollY > 40);
  addEventListener('scroll', sc, { passive: true }); sc();
  const hamb = document.querySelector('.hamb'), nav = document.querySelector('.nav');
  hamb.addEventListener('click', () => { const a = nav.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', a); });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('aberto'); hamb.setAttribute('aria-expanded', false); }));

  // HERO: letras separadas + barras de equalizador que descem revelando a foto
  const palavras = [...document.querySelectorAll('.onda-txt')];
  palavras.forEach(w => { w.innerHTML = [...w.textContent].map((c, i) => `<span style="--i:${i}">${c}</span>`).join(''); });
  const eq = document.querySelector('.eq');
  if (!reduz) {
    const n = innerWidth < 760 ? 14 : 28;
    let h = '';
    for (let i = 0; i < n; i++) {
      const centro = Math.abs(i - n / 2) / (n / 2);
      h += `<span style="--d:${(0.05 + Math.random() * 0.35).toFixed(2)};--a:${(0.25 + (1 - centro) * 0.35 + Math.random() * 0.2).toFixed(2)}"></span>`;
    }
    eq.innerHTML = h;
    setTimeout(() => eq.remove(), 2600);
  }

  // HERO: a onda sonora sai dos fones e passa pelas letras (peso e largura variam)
  const letras = palavras.flatMap((w, k) => {
    const ls = [...w.querySelectorAll('span')];
    return ls.map((s, i) => ({ s, d: k === 0 ? (ls.length - 1 - i) : i, el: s }));
  });
  if (!reduz) {
    let mx = -1e4, my = -1e4, ativo = true;
    const hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    hero.addEventListener('pointerleave', () => { mx = my = -1e4; });
    new IntersectionObserver(es => { ativo = es[0].isIntersecting; if (ativo) requestAnimationFrame(loop); }).observe(hero);
    let rects = [];
    const mede = () => { rects = letras.map(l => l.el.getBoundingClientRect()); };
    addEventListener('resize', mede); document.fonts.ready.then(mede); setTimeout(mede, 2200);
    const t0 = performance.now();
    function loop(t) {
      if (!ativo) return;
      const tt = (t - t0) / 1000;
      const entrada = Math.min(1, Math.max(0, (tt - 1.6) / 1.2));
      letras.forEach((l, i) => {
        const fase = tt * 2.0 - l.d * 0.75;
        let w = Math.sin(fase) * 0.5 + 0.5;
        let prox = 0;
        const r = rects[i];
        if (r) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; prox = Math.max(0, 1 - Math.hypot(mx - cx, my - cy) / 260); }
        const wg = 800 - entrada * (220 * (1 - w)) + prox * 100;
        const wd = 118 - entrada * (26 * (1 - w)) + prox * 30;
        l.s.style.setProperty('--wg', wg.toFixed(0));
        l.s.style.setProperty('--wd', wd.toFixed(1));
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // TESTE DE FREQUÊNCIAS (Web Audio)
  const svg = document.getElementById('tsSvg');
  const freqs = [250, 500, 1000, 2000, 4000, 8000];
  const X0 = 60, X1 = 580, Y0 = 20, Y1 = 340;
  const xDe = f => X0 + (Math.log2(f / 250) / Math.log2(8000 / 250)) * (X1 - X0);
  const yDe = db => Y0 + (db / 80) * (Y1 - Y0);
  const eixos = svg.querySelector('.eixos');
  let g = '';
  [0, 20, 40, 60, 80].forEach(db => { g += `<line x1="${X0}" x2="${X1}" y1="${yDe(db)}" y2="${yDe(db)}"/><text x="${X0 - 10}" y="${yDe(db) + 4}" text-anchor="end">${db}</text>`; });
  freqs.forEach(f => { g += `<line x1="${xDe(f)}" x2="${xDe(f)}" y1="${Y0}" y2="${Y1}"/><text x="${xDe(f)}" y="${Y1 + 22}" text-anchor="middle">${f >= 1000 ? f / 1000 + 'k' : f}</text>`; });
  g += `<text x="${X0 - 34}" y="${Y0 + 4}" text-anchor="end">dB</text>`;
  g += `<text x="${X1}" y="${Y0 + 16}" text-anchor="end">audição normal</text><text x="${X1}" y="${Y1 - 8}" text-anchor="end">perda importante</text>`;
  eixos.innerHTML = g;
  const res = {};
  let fAtual = 1000, ctx = null, osc = null, ganho = null;
  const vol = document.getElementById('tsVol'), dica = document.getElementById('tsDica'), rotF = document.getElementById('tsFreq');
  const tabs = [...document.querySelectorAll('.ts-freqs button')];
  const fmt = f => f >= 1000 ? (f / 1000) + ' kHz' : f + ' Hz';
  const liga = () => {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (!osc) {
        osc = ctx.createOscillator(); ganho = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = fAtual; ganho.gain.value = 0;
        osc.connect(ganho).connect(ctx.destination); osc.start();
      }
    } catch (e) { dica.textContent = 'O navegador bloqueou o áudio. Toque no controle novamente.'; }
  };
  const ajustaGanho = v => { if (ganho) ganho.gain.setTargetAtTime(v === 0 ? 0 : Math.pow(10, (v - 100) / 28) * 0.5, ctx.currentTime, 0.03); };
  const desliga = () => { if (ganho) ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => { if (osc) { try { osc.stop(); } catch (e) {} osc.disconnect(); osc = null; } }, 300); };
  const desenha = () => {
    const pts = freqs.filter(f => res[f] != null).map(f => [xDe(f), yDe(res[f])]);
    document.getElementById('tsLinha').setAttribute('points', pts.map(p => p.join(',')).join(' '));
    document.getElementById('tsPontos').innerHTML = freqs.filter(f => res[f] != null).map(f => `<circle r="8" cx="${xDe(f)}" cy="${yDe(res[f])}" class="${f === fAtual ? 'ativo' : ''}"/>`).join('');
    const v = Object.values(res), cap = document.getElementById('tsResumo');
    if (v.length < 3) { cap.textContent = 'Marque pelo menos três frequências para ver o seu traçado.'; return; }
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const agudos = [4000, 8000].filter(f => res[f] != null).map(f => res[f]);
    const queda = agudos.length && Math.max(...agudos) - m > 15;
    cap.textContent = m < 25 ? 'Traçado dentro da faixa esperada para uma triagem caseira. Vale repetir a cada dois anos, ou antes se surgir zumbido.'
      : m < 45 ? 'Alguns tons precisaram de volume acima do esperado. Uma audiometria na cabine acústica mostra se é o fone, o ambiente ou o ouvido.'
      : 'Vários tons só apareceram em volume alto. Marque uma audiometria para medir com precisão.';
    if (queda) cap.textContent += ' Os agudos ficaram mais baixos que o resto, padrão comum em quem convive com ruído.';
  };
  const seleciona = f => {
    fAtual = f; rotF.textContent = fmt(f);
    tabs.forEach(t => t.setAttribute('aria-selected', +t.dataset.f === f));
    vol.value = 0; vol.style.setProperty('--p', '0%');
    if (osc) osc.frequency.setValueAtTime(f, ctx.currentTime);
    dica.textContent = 'Arraste devagar e solte quando ouvir o tom de ' + fmt(f) + '.';
    desenha();
  };
  tabs.forEach(t => t.addEventListener('click', () => seleciona(+t.dataset.f)));
  vol.addEventListener('pointerdown', liga);
  vol.addEventListener('keydown', liga);
  vol.addEventListener('input', () => { vol.style.setProperty('--p', vol.value + '%'); if (!osc) liga(); ajustaGanho(+vol.value); });
  const registra = () => {
    const v = +vol.value; if (v === 0) return;
    res[fAtual] = Math.round((v / 100) * 80);
    desliga();
    tabs.find(t => +t.dataset.f === fAtual).classList.add('feito');
    const prox = freqs.find(f => res[f] == null);
    desenha();
    if (prox) setTimeout(() => seleciona(prox), 450); else dica.textContent = 'Pronto. Veja o seu traçado ao lado.';
  };
  vol.addEventListener('change', registra);
  document.getElementById('tsReset').addEventListener('click', () => { Object.keys(res).forEach(k => delete res[k]); tabs.forEach(t => t.classList.remove('feito')); desliga(); seleciona(1000); });
  seleciona(1000);

  // OSCILOSCÓPIO: ondas finas que respondem à posição do cursor
  const sec = document.querySelector('.osc'), cv = sec.querySelector('.osc-cv'), c2 = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2), alvo = .5, freqX = .5, vis = false;
  const tam = () => { const b = sec.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; };
  tam(); addEventListener('resize', tam);
  sec.addEventListener('pointermove', e => { const b = sec.getBoundingClientRect(); alvo = (e.clientX - b.left) / b.width; });
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) requestAnimationFrame(osci); }).observe(sec);
  const desenhaOnda = t => {
    c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H);
    freqX += (alvo - freqX) * 0.05;
    const linhas = [{ a: 38, k: 1, c: 'rgba(127,208,220,.55)', w: 1.5 }, { a: 22, k: 1.7, c: 'rgba(127,208,220,.25)', w: 1 }, { a: 14, k: 2.6, c: 'rgba(232,87,47,.45)', w: 1 }];
    linhas.forEach((l, j) => {
      c2.beginPath(); c2.strokeStyle = l.c; c2.lineWidth = l.w;
      const f = (2 + freqX * 10) * l.k;
      for (let x = 0; x <= W; x += 4) {
        const env = Math.sin(Math.PI * x / W);
        const y = H * 0.56 + Math.sin(x / W * f * Math.PI * 2 - t * (0.0009 + j * 0.0003)) * l.a * env * (1 + .4 * Math.sin(t * .0006 + j));
        x ? c2.lineTo(x, y) : c2.moveTo(x, y);
      }
      c2.stroke();
    });
  };
  function osci(t) { if (!vis) return; desenhaOnda(t); if (!reduz) requestAnimationFrame(osci); }
  if (reduz) desenhaOnda(0);
})();

/* TRANSIÇÕES v2 · Timbre Otorrino e Audiologia · entradas em forma de onda
   Entradas de textos, imagens e cartões + traço de passagem entre seções, com assinatura própria do nicho.
   Só roda com JS e sem prefers-reduced-motion; o conteúdo nunca fica escondido sem JS. */
(() => {
  const C = {"step": 0.08, "settle": 2.6, "words": true, "divider": "<svg viewBox=\"0 0 1200 28\"><path class=\"ln\" pathLength=\"1\" style=\"--ld:0.00s\" d=\"M0 14.0 L6 14.0 L12 14.0 L18 14.1 L24 14.1 L30 14.1 L36 14.1 L42 14.0 L48 14.0 L54 13.9 L60 13.9 L66 13.8 L72 13.8 L78 13.9 L84 13.9 L90 14.0 L96 14.1 L102 14.2 L108 14.3 L114 14.3 L120 14.3 L126 14.2 L132 14.0 L138 13.8 L144 13.6 L150 13.5 L156 13.4 L162 13.5 L168 13.6 L174 13.9 L180 14.2 L186 14.6 L192 14.9 L198 15.0 L204 15.0 L210 14.8 L216 14.3 L222 13.8 L228 13.2 L234 12.7 L240 12.4 L246 12.4 L252 12.6 L258 13.2 L264 14.0 L270 14.9 L276 15.8 L282 16.4 L288 16.6 L294 16.3 L300 15.5 L306 14.4 L312 13.1 L318 11.8 L324 10.7 L330 10.3 L336 10.4 L342 11.3 L348 12.8 L354 14.7 L360 16.6 L366 18.1 L372 19.1 L378 19.1 L384 18.1 L390 16.3 L396 13.9 L402 11.4 L408 9.1 L414 7.7 L420 7.3 L426 8.1 L432 10.2 L438 13.0 L444 16.3 L450 19.2 L456 21.4 L462 22.3 L468 21.7 L474 19.6 L480 16.4 L486 12.6 L492 8.9 L498 6.0 L504 4.5 L510 4.7 L516 6.6 L522 10.0 L528 14.2 L534 18.4 L540 22.0 L546 24.2 L552 24.5 L558 22.9 L564 19.7 L570 15.4 L576 10.8 L582 6.7 L588 3.9 L594 3.0 L600 4.1 L606 6.9 L612 11.1 L618 15.8 L624 20.1 L630 23.2 L636 24.7 L642 24.2 L648 21.9 L654 18.2 L660 13.8 L666 9.5 L672 6.2 L678 4.3 L684 4.2 L690 5.9 L696 9.0 L702 12.8 L708 16.8 L714 20.1 L720 22.2 L726 22.7 L732 21.7 L738 19.3 L744 16.1 L750 12.7 L756 9.7 L762 7.6 L768 6.8 L774 7.3 L780 9.0 L786 11.4 L792 14.1 L798 16.7 L804 18.6 L810 19.5 L816 19.4 L822 18.4 L828 16.7 L834 14.6 L840 12.6 L846 11.0 L852 10.0 L858 9.9 L864 10.5 L870 11.6 L876 13.1 L882 14.6 L888 15.8 L894 16.6 L900 16.9 L906 16.6 L912 15.9 L918 15.0 L924 13.9 L930 13.0 L936 12.4 L942 12.1 L948 12.2 L954 12.6 L960 13.2 L966 13.8 L972 14.4 L978 14.9 L984 15.1 L990 15.2 L996 15.0 L1002 14.6 L1008 14.2 L1014 13.9 L1020 13.5 L1026 13.4 L1032 13.3 L1038 13.4 L1044 13.6 L1050 13.8 L1056 14.0 L1062 14.2 L1068 14.3 L1074 14.4 L1080 14.4 L1086 14.3 L1092 14.2 L1098 14.0 L1104 13.9 L1110 13.8 L1116 13.8 L1122 13.8 L1128 13.8 L1134 13.9 L1140 14.0 L1146 14.0 L1152 14.1 L1158 14.1 L1164 14.1 L1170 14.1 L1176 14.1 L1182 14.0 L1188 14.0 L1194 14.0 L1200 14.0\"/></svg>", wordDelay: (i) => i * .06 + Math.sin(i * 1.1) * .04 + .04, cardDelay: (n) => (Math.sin(n * 1.2) + 1) * .16};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const html = document.documentElement;
  html.classList.add('fx');
  const mob = matchMedia('(max-width: 760px)').matches;
  const SKIP = '.hero, body > header, nav, footer, .nav, .wa, .whats, .wpp, [class*="whatsapp"], canvas, video, iframe, [data-nofx], [class*="marquee"], [class*="ticker"], [aria-hidden="true"]' + (C.skip ? ', ' + C.skip : '');
  const pinned = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p).position; if (s === 'sticky' || s === 'fixed') return true; } return false; };
  const F0 = new Map();
  if (C.imgFilter) document.querySelectorAll('section img').forEach(i => F0.set(i, getComputedStyle(i).filter));
  const sections = [...document.querySelectorAll('section')].filter(s => !s.parentElement.closest('section') && !s.matches(SKIP) && !s.closest(SKIP));

  // o sistema antigo de revelação (fade genérico) sai de cena fora da hero
  sections.forEach(s => s.querySelectorAll('.rv, .reveal').forEach(el => { el.classList.remove('rv', 'reveal'); el.style.transitionDelay = ''; }));
  sections.forEach(s => s.classList.remove('rv', 'reveal'));

  const items = []; // {el, kind}
  const taken = new Set();
  const isTaken = el => { for (const t of taken) if (t !== el && t.contains(el)) return true; return false; };

  sections.forEach(sec => {
    // 1. cartões: grupos de 3+ irmãos parecidos com imagem ou título
    const groups = [];
    sec.querySelectorAll('*').forEach(p => {
      const ch = [...p.children].filter(c => !['SCRIPT', 'TEMPLATE', 'BR'].includes(c.tagName));
      if (ch.length < 3 || p.closest(SKIP)) return;
      const sig = c => c.tagName + '.' + (c.classList[0] || '');
      const cnt = {}; ch.forEach(c => cnt[sig(c)] = (cnt[sig(c)] || 0) + 1);
      const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (best[1] < 3 || best[1] < ch.length * .7) return;
      const cards = ch.filter(c => sig(c) === best[0]);
      if (!cards.every(c => c.querySelector('img, h3, h4, strong, summary, dt') && c.getBoundingClientRect().height > 50)) return;
      if (cards.some(c => pinned(c))) return;
      if (groups.some(g => g.some(c => c.contains(p)))) return;
      groups.push(cards);
    });
    groups.forEach(g => g.forEach((c, i) => { if (!isTaken(c)) { c.classList.add('fx-c'); c.style.setProperty('--n', i); taken.add(c); items.push({ el: c, kind: 'c', i }); } }));

    // 2. imagens soltas (fora de cartões, fundos fixos e áreas presas)
    sec.querySelectorAll('img').forEach(img => {
      if (img.closest(SKIP) || isTaken(img) || pinned(img)) return;
      let w = img.parentElement; if (w.tagName === 'PICTURE') w = w.parentElement;
      const ws = getComputedStyle(img);
      if (ws.position === 'absolute' && w === sec) return;
      const r = w.getBoundingClientRect(), rs = sec.getBoundingClientRect();
      if (r.width * r.height > rs.width * rs.height * .85) return; // foto de fundo da seção
      let target = w;
      if (w === sec || w.querySelector('h1, h2, h3, p, a, button') ) target = img;
      if (isTaken(target) || taken.has(target)) return;
      target.classList.add('fx-i'); if (target === img) target.classList.add('fx-self');
      if (getComputedStyle(target).clipPath !== 'none') target.classList.add('fx-noclip');
      taken.add(target); items.push({ el: target, kind: 'i' });
    });

    // 3. textos: títulos, parágrafos, listas de dados, botões e formulários, em cascata
    sec.querySelectorAll('h2, h3, h4, p, li, blockquote, dl, form, ' + (C.extraText || '.eyebrow') + ', a[class*="btn"], a[class*="cta"], button[class*="btn"]').forEach(el => {
      if (el.closest(SKIP) || isTaken(el) || taken.has(el) || pinned(el)) return;
      if (el.closest('form') && el.tagName !== 'FORM') return;
      if (!el.textContent.trim() && el.tagName !== 'FORM') return;
      if (el.tagName === 'H2' && C.words) splitWords(el);
      else el.classList.add('fx-t');
      taken.add(el); items.push({ el, kind: el.classList.contains('fx-ws') ? 'w' : 't' });
    });
  });

  function splitWords(h) {
    h.classList.add('fx-ws');
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(t => { if (!t) return; if (/^\s+$/.test(t)) frag.append(t); else { const s = document.createElement('span'); s.className = 'fx-w'; s.textContent = t; frag.append(s); } });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !/^(BR|SVG|IMG)$/i.test(n.tagName)) {
          const cs = getComputedStyle(n);
          if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text' || cs.display === 'block') { n.classList.add('fx-w'); return; }
          walk(n);
        }
      });
    };
    walk(h);
    [...h.querySelectorAll('.fx-w')].forEach((w, i, all) => w.style.setProperty('--wd', C.wordDelay(i, all.length) + 's'));
  }

  // filtro de cor de cada foto preservado: a entrada soma o efeito ao filtro original
  if (C.imgFilter) document.querySelectorAll('.fx-i img, img.fx-i, .fx-c img').forEach(img => {
    const f = F0.get(img); img.style.setProperty('--f0', (f && f !== 'none' ? f + ' ' : '') + C.imgFilter);
  });

  // 4. traço de passagem entre seções
  let nDiv = 0;
  sections.forEach((sec, k) => {
    if (nDiv >= (C.maxDiv || 7) || k === 0 && C.skipFirstDiv) return;
    if (sec.matches(C.noDiv || '.fixo, .window, .janela, .sky')) return;
    if (!sec.querySelector('h2')) return;
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    const box = document.createElement('div');
    box.className = 'fx-div'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = C.divider;
    sec.prepend(box); nDiv++;
    items.push({ el: box, kind: 'd' });
  });

  // entrada: os elementos que chegam juntos entram em cascata, na ordem do texto
  const step = C.step * (mob ? .7 : 1);
  const show = (el, d) => {
    el.style.transitionDelay = d + 's';
    el.style.setProperty('--dl', d + 's');
    el.classList.add('fx-on');
    setTimeout(() => { el.classList.add('fx-done'); el.style.transitionDelay = ''; }, (d + C.settle) * 1000);
  };
  // elementos recortados (clip-path) são observados pelo pai, porque o recorte zera a área visível
  const proxyOf = el => ((el.classList.contains('fx-i') && !el.classList.contains('fx-noclip')) || (C.textClip && el.classList.contains('fx-t'))) ? el.parentElement : el;
  const watch = new Map();
  items.forEach(({ el }) => { const p = proxyOf(el); if (!watch.has(p)) watch.set(p, []); watch.get(p).push(el); });
  const io = new IntersectionObserver(es => {
    const ins = es.filter(e => e.isIntersecting).flatMap(e => { io.unobserve(e.target); return watch.get(e.target) || []; })
      .sort((a, b) => a.compareDocumentPosition(b) & 2 ? 1 : -1);
    ins.forEach((el, i) => {
      const n = el.classList.contains('fx-c') ? C.cardDelay(+el.style.getPropertyValue('--n') || 0) : Math.min(i, 7) * step;
      show(el, n);
    });
  }, { threshold: .14, rootMargin: '0px 0px -7% 0px' });
  watch.forEach((_, p) => io.observe(p));
  // quem chega por âncora já encontra o que ficou acima pronto
  requestAnimationFrame(() => watch.forEach((els, p) => { if (p.getBoundingClientRect().bottom < 0) { io.unobserve(p); els.forEach(el => show(el, 0)); } }));
})();
