/* ==========================================================
   Leab Studios — interactions
   ========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Split headings into words ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const out = document.createDocumentFragment();
    const wrap = node => {
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.style.setProperty('--i', i++);
      inner.appendChild(node);
      w.appendChild(inner);
      return w;
    };
    [...el.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) out.appendChild(document.createTextNode(' '));
          else out.appendChild(wrap(document.createTextNode(part)));
        });
      } else if (node.nodeName === 'BR') {
        out.appendChild(node.cloneNode());
      } else {
        out.appendChild(wrap(node.cloneNode(true)));
      }
    });
    el.textContent = '';
    el.appendChild(out);
  });

  /* ---------- Highlight words (mission) ---------- */
  const highlights = $$('[data-highlight]').map(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="hw">${w}</span>`).join(' ');
    return { el, words: $$('.hw', el) };
  });

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], [data-split], .contact__title').forEach(el => io.observe(el));

  /* ---------- Loader ---------- */
  const loader = $('.loader');
  const countEl = $('[data-count]');
  const fill = $('.loader__ls--fill');
  const start = performance.now();
  const minTime = reduced ? 200 : 1300;
  let loaded = document.readyState === 'complete';
  window.addEventListener('load', () => (loaded = true));
  const maxWait = setTimeout(() => (loaded = true), 4000);

  const tickLoader = now => {
    const t = clamp((now - start) / minTime, 0, 1);
    const target = loaded ? t : Math.min(t, 0.86);
    const pct = Math.round(target * 100);
    countEl.textContent = pct;
    fill.style.setProperty('--p', `${100 - pct}%`);
    if (pct >= 100) return finishLoader();
    if (loader) requestAnimationFrame(tickLoader);
  else {
    body.classList.add('is-ready', 'intro-done');
    body.classList.remove('is-loading');
  }
  };
  const finishLoader = () => {
    clearTimeout(maxWait);
    loader.classList.add('is-out');
    setTimeout(() => body.classList.add('is-ready'), reduced ? 0 : 520);
    setTimeout(() => {
      loader.classList.add('is-done');
      body.classList.remove('is-loading');
    }, reduced ? 50 : 1100);
    setTimeout(() => body.classList.add('intro-done'), reduced ? 100 : 2600);
  };
  if (loader) requestAnimationFrame(tickLoader);
  else {
    body.classList.add('is-ready', 'intro-done');
    body.classList.remove('is-loading');
  }

  /* ---------- Hero letters wobble on hover ---------- */
  $$('.wm-l').forEach(l => {
    l.addEventListener('mouseenter', () => {
      if (!body.classList.contains('intro-done') || reduced) return;
      l.classList.remove('is-wobble');
      void l.getBoundingClientRect();
      l.classList.add('is-wobble');
    });
    l.addEventListener('animationend', e => {
      if (e.animationName === 'wobble') l.classList.remove('is-wobble');
    });
  });

  /* ---------- Mobile menu ---------- */
  const burger = $('.burger');
  const menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* ---------- Services accordion ---------- */
  const svcItems = $$('.svc__item');
  svcItems.forEach(item => {
    const btn = $('.svc__row', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      svcItems.forEach(o => {
        o.classList.remove('is-open');
        $('.svc__row', o).setAttribute('aria-expanded', 'false');
      });
      if (open) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  if (svcItems[0]) {
    svcItems[0].classList.add('is-open');
    $('.svc__row', svcItems[0]).setAttribute('aria-expanded', 'true');
  }

  /* ---------- Gallery: filters + lightbox ---------- */
  const gItems = $$('.g-item');
  $$('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      $$('.filter').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      gItems.forEach(it => {
        it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f);
        it.classList.add('is-in');
      });
    });
  });

  const lb = $('.lightbox');
  if (lb) {
    const lbImg = $('img', lb);
    const lbCap = $('figcaption', lb);
    let lbIndex = 0;
    let lastFocus = null;
    const visible = () => gItems.filter(it => !it.classList.contains('is-hidden')).map(it => $('.g-item__btn', it));
    const show = i => {
      const list = visible();
      lbIndex = (i + list.length) % list.length;
      const b = list[lbIndex];
      lbImg.src = b.dataset.src;
      lbImg.alt = $('img', b).alt;
      lbCap.textContent = b.dataset.caption;
    };
    const open = btn => {
      lastFocus = btn;
      show(visible().indexOf(btn));
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
      $('.lightbox__close', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      body.classList.remove('lightbox-open');
      if (lastFocus) lastFocus.focus();
    };
    $$('.g-item__btn').forEach(b => b.addEventListener('click', () => open(b)));
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__nav--prev', lb).addEventListener('click', () => show(lbIndex - 1));
    $('.lightbox__nav--next', lb).addEventListener('click', () => show(lbIndex + 1));
    lb.addEventListener('click', e => e.target === lb && close());
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(lbIndex - 1);
      if (e.key === 'ArrowRight') show(lbIndex + 1);
    });
  }

  /* ---------- Contact form → mailto ---------- */
  const form = $('[data-form]');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const note = $('.form__note', form);
      const data = new FormData(form);
      const nombre = (data.get('nombre') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const mensaje = (data.get('mensaje') || '').toString().trim();
      const servicios = data.getAll('servicio').join(', ');
      if (!nombre || !email || !mensaje || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = 'Completa tu nombre, un e-mail válido y tu mensaje.';
        return;
      }
      const subject = `Nuevo proyecto — ${nombre}`;
      const text = `Nombre: ${nombre}\nE-mail: ${email}\nServicios: ${servicios || '—'}\n\n${mensaje}`;
      window.location.href = `mailto:hello@leabstudios.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      note.textContent = '¡Gracias! Abrimos tu correo para enviar el mensaje.';
      form.reset();
    });
  }

  /* ---------- Cursor, magnetic, tilt, service image (fine pointers) ---------- */
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const cursor = $('.cursor');
  const cur = { x: mouse.x, y: mouse.y };

  if (finePointer && !reduced) {
    window.addEventListener('pointermove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursor.style.opacity = 1;
    }, { passive: true });
    document.addEventListener('pointerleave', () => (cursor.style.opacity = 0));

    const label = $('.cursor__label', cursor);
    const setLabel = text => {
      label.textContent = text || '';
      cursor.classList.toggle('is-label', !!text);
    };
    $$('a, button, [data-hover], .field--chips span, input, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
    $$('.svc__row').forEach(el => {
      el.addEventListener('mouseenter', () => setLabel('Abrir'));
      el.addEventListener('mouseleave', () => setLabel(''));
    });
    $$('.tile, .frame, .g-item__btn').forEach(el => {
      el.addEventListener('mouseenter', () => setLabel('Ver'));
      el.addEventListener('mouseleave', () => setLabel(''));
    });

    // Magnetic buttons
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1), color .45s';
        el.style.transform = '';
        setTimeout(() => (el.style.transition = ''), 600);
      });
    });

    // Tilt tiles
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- Scroll-driven effects ---------- */
  const header = $('.header');
  const progress = $('.progress span');
  const parallax = $$('[data-speed]').map(el => ({ el, speed: parseFloat(el.dataset.speed) || 0 }));
  const marquee = $('[data-marquee]');
  const hsec = $('.hscroll');
  const htrack = $('[data-htrack]');
  const redZones = '.gallery-hero, .services, .contact, .panel--red, .panel--dash, .marquee, .footer, .menu';
  let lastY = scrollY;
  let velocity = 0;
  let mqX = 0;
  let hsTop = 0;
  let hsDist = 0;
  const isDesktopH = () => innerWidth > 760;

  const measureH = () => {
    if (!hsec) return;
    if (!isDesktopH()) {
      hsec.style.removeProperty('--hs-h');
      htrack.style.transform = '';
      return;
    }
    hsDist = Math.max(0, htrack.scrollWidth - innerWidth);
    hsec.style.setProperty('--hs-h', `${hsDist + innerHeight}px`);
    hsTop = hsec.getBoundingClientRect().top + scrollY;
  };
  measureH();
  window.addEventListener('resize', measureH);
  window.addEventListener('load', measureH);
  if (document.fonts) document.fonts.ready.then(measureH);

  const isOnRed = (x, y) => {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (el.closest('.header, .cursor, .progress, .lightbox')) continue;
      return !!el.closest(redZones);
    }
    return false;
  };

  let frame = 0;
  const loop = () => {
    const y = scrollY;
    const vh = innerHeight;
    const dy = y - lastY;
    velocity = lerp(velocity, dy, 0.12);
    lastY = y;
    frame++;

    // progress bar
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // header
    if (!body.classList.contains('menu-open')) {
      header.classList.toggle('is-solid', y > 40);
      if (Math.abs(dy) > 2) header.classList.toggle('is-hidden', dy > 0 && y > 400);
    }
    if (frame % 6 === 0) header.classList.toggle('on-red', isOnRed(innerWidth / 2, 30));

    if (!reduced) {
      // parallax (uses the independent `translate` property so CSS transforms stay intact)
      parallax.forEach(p => {
        const r = p.el.getBoundingClientRect();
        const prev = p.shift || 0;
        const center = r.top - prev + r.height / 2;
        const shift = (center - vh / 2) * -p.speed;
        if (Math.abs(shift - prev) > 0.1) {
          p.el.style.translate = `0 ${shift.toFixed(1)}px`;
          p.shift = shift;
        }
      });

      // marquee: base drift + scroll velocity
      if (marquee) {
        const half = marquee.scrollWidth / 2;
        mqX -= 0.6 + Math.abs(velocity) * 0.35;
        if (mqX <= -half) mqX += half;
        marquee.style.transform = `translate3d(${mqX}px,0,0) skewX(${clamp(-velocity * 0.3, -10, 10)}deg)`;
      }

      // hero hand reacts to scroll
      const hang = $('.hero__hang');
      if (hang && y < vh * 1.2) hang.style.translate = `0 ${y * 0.35}px`;
    }

    // horizontal campaigns
    if (hsec && isDesktopH()) {
      const p = clamp(y - hsTop, 0, hsDist);
      htrack.style.transform = `translate3d(${-p}px,0,0)`;
    }

    // word highlight
    highlights.forEach(h => {
      const r = h.el.getBoundingClientRect();
      const t = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const n = Math.round(t * h.words.length);
      h.words.forEach((w, i) => w.classList.toggle('on', i < n || reduced));
    });

    // cursor
    if (finePointer && !reduced) {
      cur.x = lerp(cur.x, mouse.x, 0.22);
      cur.y = lerp(cur.y, mouse.y, 0.22);
      cursor.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
      if (frame % 5 === 0) cursor.classList.toggle('on-red', isOnRed(mouse.x, mouse.y));
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
