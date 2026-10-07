/**
 * ==========================================================================
 * MADEUP - KNOT WEAVING SCROLLYTELLING ENGINE
 * ==========================================================================
 */

(function () {
  'use strict';

  // --- GLOBAL STATE ---
  const state = {
    scrollY: 0,
    targetScrollY: 0,
    maxScroll: 1,
    progress: 0,
    smoothedProgress: 0,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    isDraggingFaq: false,
    faqDragStartX: 0,
    faqRotationOffset: 0,
    faqCurrentAngle: 0,
    faqTargetAngle: 0,
    galleryCurrentX: 0,
    galleryTargetX: 0,
    isDraggingGallery: false,
    galleryDragStartX: 0,
    activeChapterIndex: 0,
    time: 0
  };

  // --- DOM ELEMENTS ---
  const el = {
    scrollSpacer: document.getElementById('scrollSpacer'),
    cursor: document.getElementById('cursor'),
    canvas: document.getElementById('knotStreamCanvas'),
    hudFill: document.getElementById('hudFill'),
    hudVal: document.getElementById('hudVal'),
    railLinks: document.querySelectorAll('.rail-nav a'),
    
    // Scenes
    scenes: {
      model: document.getElementById('sceneModel'),
      work: document.getElementById('sceneWork'),
      gallery: document.getElementById('sceneGallery'),
      questions: document.getElementById('sceneQuestions'),
      apply: document.getElementById('sceneApply'),
      footer: document.getElementById('sceneFooter')
    },
    
    // Chapter 1
    beatBlocks: document.querySelectorAll('.beat-block'),
    standProse: document.getElementById('standProse'),

    // Chapter 2
    workTimelineLine: document.getElementById('timelineLineActive'),
    counterVal: document.getElementById('counterVal'),
    workCards: document.querySelectorAll('.work-card'),

    // Chapter 3 (Horizontal Gallery)
    galleryWrapper: document.getElementById('galleryWrapper'),
    galleryTrack: document.getElementById('galleryTrack'),
    galleryCurrentIdx: document.getElementById('galleryCurrentIdx'),
    galleryProgressBar: document.getElementById('galleryProgressBar'),
    galleryItems: document.querySelectorAll('.gallery-item'),

    // Chapter 4
    faqCylinder: document.getElementById('faqCylinder'),
    faqCards: document.querySelectorAll('.faq-card'),
    faqLeadLine: document.getElementById('faqLeadLine'),
    leadLinePath: document.getElementById('leadLinePath'),
    leadLineDot: document.getElementById('leadLineDot'),

    // Cross markers
    crossMarkers: document.querySelectorAll('.cross-marker'),

    // Application Form
    applyForm: document.getElementById('applyForm'),
    applySubmitBtn: document.getElementById('applySubmitBtn'),
    applyFormContainer: document.querySelector('.apply-container')
  };

  // --- UTILITY FUNCTIONS ---
  const lerp = (start, end, factor) => start + (end - start) * factor;
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const mapRange = (val, inMin, inMax, outMin, outMax) => {
    const clamped = clamp(val, inMin, inMax);
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
  };

  // --- CANVAS & KNOT ENGINE ---
  let ctx;
  let width = window.innerWidth;
  let height = window.innerHeight;

  function initCanvas() {
    if (!el.canvas) return;
    ctx = el.canvas.getContext('2d');
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!el.canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    el.canvas.width = width;
    el.canvas.height = height;
  }

  // --- PRELOAD LOGO_M FOR FINAL KNOT CLIMAX ---
  const logoMImg = new Image();
  logoMImg.src = 'png/logo_m.png';

  // --- LOGO_M PARAMETRIC BEZIER SPLINE DEFINITION ---
  const LOGO_M_SPLINE = [
    { p0: { x: -0.42, y: 0.38 }, cp1: { x: -0.42, y: -0.15 }, cp2: { x: -0.42, y: -0.38 }, p1: { x: -0.23, y: -0.38 } },
    { p0: { x: -0.23, y: -0.38 }, cp1: { x: -0.06, y: -0.38 }, cp2: { x: -0.04, y: -0.05 }, p1: { x: 0.00, y: 0.08 } },
    { p0: { x: 0.00, y: 0.08 }, cp1: { x: 0.085, y: 0.22 }, cp2: { x: 0.095, y: 0.38 }, p1: { x: 0.00, y: 0.38 } },
    { p0: { x: 0.00, y: 0.38 }, cp1: { x: -0.095, y: 0.38 }, cp2: { x: -0.085, y: 0.22 }, p1: { x: 0.00, y: 0.08 } },
    { p0: { x: 0.00, y: 0.08 }, cp1: { x: 0.04, y: -0.05 }, cp2: { x: 0.06, y: -0.38 }, p1: { x: 0.23, y: -0.38 } },
    { p0: { x: 0.23, y: -0.38 }, cp1: { x: 0.42, y: -0.38 }, cp2: { x: 0.42, y: -0.15 }, p1: { x: 0.42, y: 0.38 } }
  ];

  function getCubicPoint(p0, cp1, cp2, p1, t) {
    const invT = 1 - t;
    return {
      x: invT * invT * invT * p0.x + 3 * invT * invT * t * cp1.x + 3 * invT * t * t * cp2.x + t * t * t * p1.x,
      y: invT * invT * invT * p0.y + 3 * invT * invT * t * cp1.y + 3 * invT * t * t * cp2.y + t * t * t * p1.y
    };
  }

  function getLogoMPoint(globalT, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY) {
    const segCount = LOGO_M_SPLINE.length;
    const scaledT = clamp(globalT, 0, 1) * segCount;
    const segIdx = Math.min(segCount - 1, Math.floor(scaledT));
    const segT = scaledT - segIdx;
    const seg = LOGO_M_SPLINE[segIdx];

    const pt = getCubicPoint(seg.p0, seg.cp1, seg.cp2, seg.p1, segT);
    return {
      x: cx + pt.x * scaleX + mouseOffX * (1 - Math.abs(pt.y)),
      y: cy + pt.y * scaleY + mouseOffY * (1 - Math.abs(pt.x))
    };
  }

  // --- GLOW & STAR UTILITIES ---
  function drawGlowPoint(ctx, x, y, radius, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = '#e2f5f1';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  function drawGlowStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
    ctx.restore();
  }

  // --- RENDER KNOT STREAM ---
  function renderKnotStream() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    state.time += 0.016;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const mouseOffX = (state.mouseX - cx) * 0.035;
    const mouseOffY = (state.mouseY - cy) * 0.035;

    const scaleBase = Math.min(width * 0.76, height * 0.88);
    const scaleX = scaleBase;
    const scaleY = scaleBase * 0.95;

    const grad = ctx.createRadialGradient(
      state.mouseX, state.mouseY, 20,
      state.mouseX, state.mouseY, 480
    );
    grad.addColorStop(0, 'rgba(172, 227, 217, 0.08)');
    grad.addColorStop(1, 'rgba(26, 11, 9, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const strokeProgress = clamp(state.progress * 1.12, 0, 1);
    if (strokeProgress <= 0.005) return;

    const totalSteps = 320;
    const currentSteps = Math.floor(totalSteps * strokeProgress);

    if (currentSteps >= 2) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= totalSteps; i++) {
        const pt = getLogoMPoint(i / totalSteps, scaleX, scaleY, cx, cy, mouseOffX * 0.2, mouseOffY * 0.2);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(172, 227, 217, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= currentSteps; i++) {
        const pt = getLogoMPoint(i / totalSteps, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = '#ACE3D9';
      ctx.lineWidth = window.innerWidth < 768 ? 3.0 : 4.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(226, 245, 241, 0.85)';
      ctx.shadowBlur = 16;
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = window.innerWidth < 768 ? 1.2 : 1.8;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      if (strokeProgress < 0.98) {
        const headPt = getLogoMPoint(strokeProgress, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
        drawGlowPoint(ctx, headPt.x, headPt.y, 5.5, '#FFFFFF');

        const pulse = Math.sin(state.time * 4) * 1.5;
        drawGlowStar(ctx, headPt.x, headPt.y, 8 + pulse, 'rgba(249, 249, 247, 0.95)');
      }
    }

    if (strokeProgress >= 0.58) {
      const crossPt = getLogoMPoint(0.58, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
      const crossPulse = Math.sin(state.time * 3) * 2;
      drawGlowPoint(ctx, crossPt.x, crossPt.y, 6 + crossPulse, 'rgba(255, 255, 255, 0.95)');
      drawGlowStar(ctx, crossPt.x, crossPt.y, 14 + crossPulse, 'rgba(172, 227, 217, 0.9)');
    }
  }

  // --- INITIALIZATION ---
  function init() {
    updateDimensions();
    initCanvas();
    setupEventListeners();
    setupFaq3DCylinder();
    setupProseSplit();
    init3DPouchViewer(); // 3D 파우치 뷰어 초기화
    requestAnimationFrame(renderLoop);
  }

  function updateDimensions() {
    state.maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  }

  function setupEventListeners() {
    window.addEventListener('resize', () => {
      updateDimensions();
      resizeCanvas();
    });

    window.addEventListener('scroll', () => {
      state.targetScrollY = window.scrollY;
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    });

    el.railLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const chapterIdx = parseInt(link.getAttribute('data-chapter'), 10);
        const chapterProgressMap = [0.02, 0.22, 0.40, 0.72];
        const targetProgress = chapterProgressMap[chapterIdx] || 0;
        const targetScroll = targetProgress * state.maxScroll;

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      });
    });

    const heroCta = document.getElementById('heroCta');
    const topApplyBtn = document.getElementById('topApplyBtn');
    [heroCta, topApplyBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.scrollTo({
            top: 0.88 * state.maxScroll,
            behavior: 'smooth'
          });
        });
      }
    });

    const galleryWrapper = el.galleryWrapper;
    if (galleryWrapper) {
      galleryWrapper.addEventListener('mousedown', (e) => {
        state.isDraggingGallery = true;
        state.galleryDragStartX = e.clientX;
      });

      window.addEventListener('mouseup', () => {
        state.isDraggingGallery = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!state.isDraggingGallery) return;
        const deltaX = e.clientX - state.galleryDragStartX;
        state.galleryDragStartX = e.clientX;
        window.scrollBy({ top: -deltaX * 3.5, behavior: 'auto' });
      });

      galleryWrapper.addEventListener('touchstart', (e) => {
        state.isDraggingGallery = true;
        state.galleryDragStartX = e.touches[0].clientX;
      }, { passive: true });

      window.addEventListener('touchend', () => {
        state.isDraggingGallery = false;
      });

      window.addEventListener('touchmove', (e) => {
        if (!state.isDraggingGallery) return;
        const deltaX = e.touches[0].clientX - state.galleryDragStartX;
        state.galleryDragStartX = e.touches[0].clientX;
        window.scrollBy({ top: -deltaX * 3.5, behavior: 'auto' });
      }, { passive: true });

      galleryWrapper.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          window.scrollBy({ top: e.deltaX * 2.5, behavior: 'auto' });
        }
      }, { passive: true });
    }

    const faqContainer = el.faqCylinder;
    if (faqContainer) {
      faqContainer.addEventListener('mousedown', (e) => {
        state.isDraggingFaq = true;
        state.faqDragStartX = e.clientX;
      });

      window.addEventListener('mouseup', () => {
        state.isDraggingFaq = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!state.isDraggingFaq) return;
        const deltaX = e.clientX - state.faqDragStartX;
        state.faqRotationOffset += deltaX * 0.4;
        state.faqDragStartX = e.clientX;
      });

      faqContainer.addEventListener('touchstart', (e) => {
        state.isDraggingFaq = true;
        state.faqDragStartX = e.touches[0].clientX;
      }, { passive: true });

      window.addEventListener('touchend', () => {
        state.isDraggingFaq = false;
      });

      window.addEventListener('touchmove', (e) => {
        if (!state.isDraggingFaq) return;
        const deltaX = e.touches[0].clientX - state.faqDragStartX;
        state.faqRotationOffset += deltaX * 0.5;
        state.faqDragStartX = e.touches[0].clientX;
      }, { passive: true });
    }

    el.faqCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        const totalCards = el.faqCards.length;
        const targetAngle = -(index * (360 / totalCards));
        state.faqRotationOffset = targetAngle;
      });
    });
  }

  function setupProseSplit() {
    if (!el.standProse) return;
    const text = el.standProse.textContent.trim();
    const words = text.split(/\s+/);
    el.standProse.innerHTML = words
      .map(word => `<span class="prose-word" style="display:inline-block; margin-right: 0.25em; transition: opacity 0.3s ease;">${word}</span>`)
      .join('');
  }

  function setupFaq3DCylinder() {
    const totalCards = el.faqCards.length;
    if (totalCards === 0) return;
    const angleStep = 360 / totalCards;
    const radius = window.innerWidth < 768 ? 260 : 380;

    el.faqCards.forEach((card, i) => {
      const angle = i * angleStep;
      card.dataset.baseAngle = angle;
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });
  }

  // --- TIMELINE STATE MACHINE ---
  function updateTimeline(p) {
    if (el.hudFill && el.hudVal) {
      const tensionPercent = Math.round(p * 100);
      el.hudFill.style.width = `${tensionPercent}%`;
      el.hudVal.textContent = `${tensionPercent}%`;
    }

    const isModelActive = p >= 0.0 && p < 0.18;
    toggleScene(el.scenes.model, isModelActive);
    if (isModelActive) updateModelChapter(p);

    const isWorkActive = p >= 0.18 && p < 0.35;
    toggleScene(el.scenes.work, isWorkActive);
    if (isWorkActive) updateWorkChapter(p);

    const isGalleryActive = p >= 0.35 && p < 0.68;
    toggleScene(el.scenes.gallery, isGalleryActive);
    if (isGalleryActive) updateGalleryChapter(p);

    const isQuestionsActive = p >= 0.68 && p < 0.85;
    toggleScene(el.scenes.questions, isQuestionsActive);
    if (isQuestionsActive) updateQuestionsChapter(p);

    const isApplyActive = p >= 0.85 && p < 0.94;
    toggleScene(el.scenes.apply, isApplyActive);
    if (isApplyActive) updateApplyChapter(p);

    const isFooterActive = p >= 0.94;
    toggleScene(el.scenes.footer, isFooterActive);

    updateRailNavigation(p);
  }

  function toggleScene(sceneElement, isActive) {
    if (!sceneElement) return;
    if (isActive) sceneElement.classList.add('active');
    else sceneElement.classList.remove('active');
  }

  function updateModelChapter(p) {
    let currentBeat = 0;
    if (p >= 0.13) currentBeat = 3;
    else if (p >= 0.09) currentBeat = 2;
    else if (p >= 0.05) currentBeat = 1;

    el.beatBlocks.forEach((beat, idx) => {
      if (idx === currentBeat) beat.classList.add('active');
      else beat.classList.remove('active');
    });

    if (el.standProse) {
      const words = el.standProse.querySelectorAll('.prose-word');
      const wordProgress = mapRange(p, 0.0, 0.16, 0, words.length);
      words.forEach((word, index) => {
        word.style.opacity = index <= wordProgress ? '1' : '0.2';
      });
    }
  }

  function updateWorkChapter(p) {
    const subP = mapRange(p, 0.18, 0.35, 0, 1);

    if (el.workTimelineLine) {
      const strokeVal = 800 * (1 - subP);
      el.workTimelineLine.style.strokeDashoffset = strokeVal;
    }

    if (el.counterVal) {
      if (subP < 0.6) {
        const val = (subP / 0.6 * 70.8).toFixed(1);
        el.counterVal.textContent = `${val}%`;
      } else {
        el.counterVal.textContent = '70.8%';
      }
    }

    const activeWorkCard = subP < 0.5 ? 0 : 1;
    el.workCards.forEach((card, idx) => {
      if (idx === activeWorkCard) card.classList.add('active');
      else card.classList.remove('active');
    });

    // 3D Scene Render Call
    render3DScene(subP);
  }

  function updateGalleryChapter(p) {
    const subP = mapRange(p, 0.35, 0.68, 0, 1);
    const track = el.galleryTrack;
    const wrapper = el.galleryWrapper;

    if (track && wrapper) {
      const maxScroll = Math.max(0, track.scrollWidth - wrapper.clientWidth + 60);
      state.galleryTargetX = -subP * maxScroll;
      state.galleryCurrentX = lerp(state.galleryCurrentX, state.galleryTargetX, 0.14);
      track.style.transform = `translate3d(${state.galleryCurrentX}px, 0, 0)`;
    }

    const currentIdx = Math.min(10, Math.max(1, Math.floor(subP * 10) + 1));
    if (el.galleryCurrentIdx) {
      el.galleryCurrentIdx.textContent = String(currentIdx).padStart(2, '0');
    }
    if (el.galleryProgressBar) {
      el.galleryProgressBar.style.width = `${Math.max(10, subP * 100)}%`;
    }

    if (el.galleryItems) {
      el.galleryItems.forEach((item, idx) => {
        const img = item.querySelector('.gallery-img');
        if (img) {
          const itemRel = (subP * 10 - idx);
          const pOffset = clamp(itemRel * 6, -18, 18);
          img.style.transform = `scale(1.05) translateX(${pOffset}px)`;
        }
      });
    }
  }

  function updateQuestionsChapter(p) {
    const subP = mapRange(p, 0.68, 0.85, 0, 1);
    const scrollDrivenAngle = subP * -360;
    state.faqTargetAngle = scrollDrivenAngle + state.faqRotationOffset;
    state.faqCurrentAngle = lerp(state.faqCurrentAngle, state.faqTargetAngle, 0.1);

    if (el.faqCylinder) {
      el.faqCylinder.style.transform = `rotateY(${state.faqCurrentAngle}deg)`;
    }

    let closestIndex = 0;
    let minAngleDist = 999;

    el.faqCards.forEach((card, i) => {
      const baseAngle = parseFloat(card.dataset.baseAngle || '0');
      let relativeAngle = (baseAngle + state.faqCurrentAngle) % 360;
      if (relativeAngle < -180) relativeAngle += 360;
      if (relativeAngle > 180) relativeAngle -= 360;

      const dist = Math.abs(relativeAngle);
      if (dist < minAngleDist) {
        minAngleDist = dist;
        closestIndex = i;
      }

      const blur = mapRange(dist, 0, 180, 0, 6);
      const opacity = mapRange(dist, 0, 180, 1, 0.25);

      card.style.filter = `blur(${blur}px)`;
      card.style.opacity = opacity;
    });

    updateLeadLine(closestIndex);
  }

  function updateLeadLine(closestIdx) {
    if (!el.faqLeadLine || !el.leadLinePath || !el.leadLineDot) return;
    const activeCard = el.faqCards[closestIdx];
    if (!activeCard) return;

    const rect = activeCard.getBoundingClientRect();
    const stageRect = el.scenes.questions.getBoundingClientRect();

    const startX = 60;
    const startY = 80;
    const endX = rect.left - stageRect.left + 20;
    const endY = rect.top - stageRect.top + rect.height / 2;

    el.leadLinePath.setAttribute('x1', startX);
    el.leadLinePath.setAttribute('y1', startY);
    el.leadLinePath.setAttribute('x2', endX);
    el.leadLinePath.setAttribute('y2', endY);

    el.leadLineDot.setAttribute('cx', endX);
    el.leadLineDot.setAttribute('cy', endY);
  }

  function updateApplyChapter(p) {
    if (!el.applyFormContainer) return;
    const mouseNormX = (state.mouseX / window.innerWidth - 0.5) * 16;
    const mouseNormY = (state.mouseY / window.innerHeight - 0.5) * 16;
    el.applyFormContainer.style.transform = `rotateY(${mouseNormX}deg) rotateX(${-mouseNormY}deg)`;
  }

  function updateRailNavigation(p) {
    let activeIdx = 0;
    if (p >= 0.68) activeIdx = 3;
    else if (p >= 0.35) activeIdx = 2;
    else if (p >= 0.18) activeIdx = 1;

    if (activeIdx !== state.activeChapterIndex) {
      state.activeChapterIndex = activeIdx;
      el.railLinks.forEach((link, idx) => {
        if (idx === activeIdx) link.classList.add('active');
        else link.classList.remove('active');
      });
    }
  }

  function updateGridMarkers() {
    const mouseXRatio = (state.mouseX / window.innerWidth - 0.5) * 10;
    const mouseYRatio = (state.mouseY / window.innerHeight - 0.5) * 10;

    el.crossMarkers.forEach((cross) => {
      cross.style.transform = `translate(calc(-50% + ${mouseXRatio}px), calc(-50% + ${mouseYRatio}px))`;
    });
  }

  function updateCursor() {
    if (!el.cursor) return;
    state.cursorX = lerp(state.cursorX, state.mouseX, 0.2);
    state.cursorY = lerp(state.cursorY, state.mouseY, 0.2);
    el.cursor.style.transform = `translate3d(${state.cursorX}px, ${state.cursorY}px, 0)`;
  }

  // --- MAIN RENDER LOOP ---
  function renderLoop() {
    state.scrollY = lerp(state.scrollY, state.targetScrollY, 0.08);

    if (state.maxScroll > 0) {
      state.progress = clamp(state.scrollY / state.maxScroll, 0, 1);
    } else {
      state.progress = 0;
    }

    renderKnotStream();
    updateTimeline(state.progress);
    updateGridMarkers();
    updateCursor();

    requestAnimationFrame(renderLoop);
  }

  // 제출 버튼 핸들러
  window.handleApplySubmit = function (e) {
    e.preventDefault();
    const btn = el.applySubmitBtn;
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<span>제안서 문의가 접수되었습니다 ✓</span>';
    btn.style.backgroundColor = '#ACE3D9';
    btn.style.color = '#1A0B09';

    setTimeout(() => {
      if (el.applyForm) el.applyForm.reset();
      btn.disabled = false;
      btn.innerHTML = '<span>제안서 문의 보내기</span>';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }, 4000);
  };

  // --- 3D INTERACTIVE POUCH VIEWER (THREE.JS INTEGRATION) ---
  let scene3D, camera3D, renderer3D, pouchMesh, knotMeshGroup;
  let is3DDragging = false, previousMouseX = 0, previousMouseY = 0;
  let targetRotX = 0, targetRotY = 0;

  function init3DPouchViewer() {
    const wrapper = document.getElementById('canvas3dWrapper');
    const canvas = document.getElementById('pouch3dCanvas');
    if (!wrapper || !canvas || typeof THREE === 'undefined') return;

    // 1. Scene & Camera
    scene3D = new THREE.Scene();
    camera3D = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.1, 1000);
    camera3D.position.set(0, 0, 7.5);

    // 2. Renderer
    renderer3D = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer3D.setSize(wrapper.clientWidth, wrapper.clientHeight);
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene3D.add(ambientLight);

    const silverDirLight = new THREE.DirectionalLight(0xe2f5f1, 2.5);
    silverDirLight.position.set(5, 8, 5);
    scene3D.add(silverDirLight);

    const fillLight = new THREE.PointLight(0xffffff, 1.5, 10);
    fillLight.position.set(-5, -2, 2);
    scene3D.add(fillLight);

    // 4. Create Pouch Body & Knot Geometry
    const pouchGroup = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.0, 2.4, 32, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x181715,
      roughness: 0.4,
      metalness: 0.1
    });
    pouchMesh = new THREE.Mesh(bodyGeo, bodyMat);
    pouchGroup.add(pouchMesh);

    knotMeshGroup = new THREE.Group();
    const knotGeo = new THREE.TorusGeometry(0.85, 0.1, 16, 60);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0xace3d9,
      roughness: 0.2,
      metalness: 0.8
    });
    const knotRing = new THREE.Mesh(knotGeo, knotMat);
    knotRing.rotation.x = Math.PI / 2;
    knotRing.position.y = 1.1;
    knotMeshGroup.add(knotRing);
    pouchGroup.add(knotMeshGroup);

    scene3D.add(pouchGroup);

    // 5. Drag Interactions
    wrapper.addEventListener('mousedown', (e) => {
      is3DDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => { is3DDragging = false; });

    window.addEventListener('mousemove', (e) => {
      if (!is3DDragging || !pouchGroup) return;
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;
      
      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
      
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    window.addEventListener('resize', () => {
      if (!wrapper || !renderer3D || !camera3D) return;
      camera3D.aspect = wrapper.clientWidth / wrapper.clientHeight;
      camera3D.updateProjectionMatrix();
      renderer3D.setSize(wrapper.clientWidth, wrapper.clientHeight);
    });
  }

  function render3DScene(progress) {
    if (!scene3D || !renderer3D || !camera3D) return;

    const pouchGroup = scene3D.children.find(c => c.type === 'Group');
    if (pouchGroup) {
      pouchGroup.rotation.y += (targetRotY + progress * Math.PI * 2 - pouchGroup.rotation.y) * 0.08;
      pouchGroup.rotation.x += (targetRotX - pouchGroup.rotation.x) * 0.08;
    }

    renderer3D.render(scene3D, camera3D);
  }

  // --- START ENGINE ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();