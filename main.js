/* =========================================================
   공통 인터랙션 — 모든 페이지에서 사용
   움직임은 느리고 조용하게: 페이드, 선 긋기, 밑줄.
   ========================================================= */
(function () {
  const html = document.documentElement;
  const body = document.body;
  const page = body.dataset.page;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'power2.inOut';

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- 부드러운 스크롤 (데스크톱 휠) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.85 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.SITE = {
    lenis, reduce, fine, page, esc, EASE,
    bar: document.querySelector('.bar'),
    splitWords(el) {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => '<span class="w">' + esc(w) + '</span>').join(' ');
      return el.querySelectorAll('.w');
    },
    scrollTop() {
      lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  /* ---------- 현재 페이지 밑줄 ---------- */
  document.querySelectorAll('.bar a.u').forEach((a) => {
    if (a.getAttribute('href') === page + '.html') {
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- 서울 시계 ---------- */
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => { const s = 'Seoul ' + f.format(new Date()); clocks.forEach((c) => (c.textContent = s)); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- 미디어 파일이 없을 때 자리표시 ---------- */
  function toPlaceholder(el) {
    if (!el.isConnected || el.dataset.ph) return;
    el.dataset.ph = '1';
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.innerHTML = '<span>' + esc(el.dataset.fallback || 'media') + '</span>';
    el.replaceWith(ph);
  }
  SITE.watchMedia = function (root) {
    (root || document).querySelectorAll('img[data-fallback]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) toPlaceholder(img);
      else img.addEventListener('error', () => toPlaceholder(img));
    });
    (root || document).querySelectorAll('video[data-fallback]').forEach((v) => {
      if (v.error || v.networkState === 3) return toPlaceholder(v);
      v.addEventListener('error', () => toPlaceholder(v));
      if (v.autoplay) {
        v.muted = true;
        const p = v.play();
        if (p && p.catch) p.catch(() => {
          const kick = () => v.play().catch(() => {});
          addEventListener('touchstart', kick, { once: true, passive: true });
          addEventListener('pointerdown', kick, { once: true });
        });
      }
    });
  };
  SITE.watchMedia();

  /* ---------- 페이지 전환 : 조용한 페이드 ---------- */
  const veil = document.createElement('div');
  veil.className = 'veil';
  body.appendChild(veil);

  try { sessionStorage.removeItem('pt'); } catch (e) {}
  if (html.classList.contains('pt-in')) {
    gsap.to(veil, { opacity: 0, duration: 0.9, ease: EASE, delay: 0.05, onComplete: () => html.classList.remove('pt-in') });
  }

  const go = (href) => { location.href = href; };
  let leaving = false;

  function leave(href, target) {
    try { sessionStorage.setItem('pt', target); } catch (e) {}
    const toDark = target === 'info';
    veil.style.background = toDark ? '#1A0B09' : '#ACE3D9';
    const tl = gsap.timeline({ onComplete: () => go(href) });
    tl.to(veil, { opacity: 1, duration: 0.7, ease: EASE }, 0);
    // 3D Product로 갈 때: 메뉴가 위로 올라가고 글자가 밝아짐
    if (SITE.bar) {
      tl.to(SITE.bar, { y: 0, duration: 0.8, ease: EASE }, 0);
      tl.add(() => {
        SITE.bar.classList.toggle('is-light', toDark);
        body.classList.toggle('is-dark', toDark);
      }, 0);
    }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || leaving) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!/^[\w-]+\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    const target = href.split('#')[0].replace('.html', '');
    if (target === page) { SITE.scrollTop(); return; }
    leaving = true;
    if (reduce) return go(href);
    leave(href, target);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  /* ---------- 호버 라벨 (마우스 기기만) : 작은 글자가 커서를 따라옴 ---------- */
  if (fine && !reduce) {
    const lab = document.createElement('div');
    lab.className = 'hover-label';
    body.appendChild(lab);
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener('pointermove', (e) => { tx = e.clientX + 14; ty = e.clientY + 14; }, { passive: true });
    gsap.ticker.add(() => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      lab.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t) { lab.textContent = t.dataset.cursor; lab.classList.add('is-on'); }
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
      lab.classList.remove('is-on');
    });
    SITE.hideLabel = () => lab.classList.remove('is-on');
  } else {
    SITE.hideLabel = () => {};
  }

  /* ---------- 선 긋기 · 리빌 ---------- */
  SITE.drawTicks = function (root) {
    if (reduce) return;
    (root || document).querySelectorAll('.tick:not([data-drawn])').forEach((el) => {
      el.dataset.drawn = '1';
      gsap.fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.4, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  };
  if (!reduce) {
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, { opacity: 0, y: 16, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }
  SITE.drawTicks();

  addEventListener('load', () => ScrollTrigger.refresh());
})();
