/**
 * ==========================================================================
 * MADEUP - KNOT WEAVING SCROLLYTELLING ENGINE
 * Concept: 無의 상태에서 출발하여 화면을 가로지르는 선들이 교차·모임점을 형성하고,
 *          최종 스크롤 지점에서 완벽한 '하나의 매듭'으로 조여지는 인터랙티브 시스템.
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
  // logo_m.png의 1개 단일 연속 선 궤적 (좌측 기둥 -> 좌측 아치 -> 중앙 하향 -> 물방울 루프 교차 -> 우측 아치 -> 우측 기둥)
  const LOGO_M_SPLINE = [
    // 0. Left Leg ascending to Left Arch Peak
    {
      p0: { x: -0.42, y: 0.38 },
      cp1: { x: -0.42, y: -0.15 },
      cp2: { x: -0.42, y: -0.38 },
      p1: { x: -0.23, y: -0.38 }
    },
    // 1. Left Arch curving over to Center-Crossing Entry
    {
      p0: { x: -0.23, y: -0.38 },
      cp1: { x: -0.06, y: -0.38 },
      cp2: { x: -0.04, y: -0.05 },
      p1: { x: 0.00, y: 0.08 }
    },
    // 2. Loop Curve Down and Around (Teardrop Loop Bottom)
    {
      p0: { x: 0.00, y: 0.08 },
      cp1: { x: 0.085, y: 0.22 },
      cp2: { x: 0.095, y: 0.38 },
      p1: { x: 0.00, y: 0.38 }
    },
    // 3. Loop Curve Up and Self-Crossing Exit (Self-intersects Segment 1!)
    {
      p0: { x: 0.00, y: 0.38 },
      cp1: { x: -0.095, y: 0.38 },
      cp2: { x: -0.085, y: 0.22 },
      p1: { x: 0.00, y: 0.08 }
    },
    // 4. Center to Right Arch Peak
    {
      p0: { x: 0.00, y: 0.08 },
      cp1: { x: 0.04, y: -0.05 },
      cp2: { x: 0.06, y: -0.38 },
      p1: { x: 0.23, y: -0.38 }
    },
    // 5. Right Arch descending to Right Leg Bottom
    {
      p0: { x: 0.23, y: -0.38 },
      cp1: { x: 0.42, y: -0.38 },
      cp2: { x: 0.42, y: -0.15 },
      p1: { x: 0.42, y: 0.38 }
    }
  ];

  // Point on a Cubic Bezier curve
  function getCubicPoint(p0, cp1, cp2, p1, t) {
    const invT = 1 - t;
    return {
      x: invT * invT * invT * p0.x + 3 * invT * invT * t * cp1.x + 3 * invT * t * t * cp2.x + t * t * t * p1.x,
      y: invT * invT * invT * p0.y + 3 * invT * invT * t * cp1.y + 3 * invT * t * t * cp2.y + t * t * t * p1.y
    };
  }

  // Get point on full Logo_M path for global parameter T in [0, 1]
  function getLogoMPoint(globalT, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY) {
    const segCount = LOGO_M_SPLINE.length; // 6
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
    ctx.shadowColor = '#d4b06f';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  function drawGlowStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = '#ffe39f';
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

  // --- RENDER KNOT STREAM (EXACT LOGO_M PROGRESSIVE STROKE) ---
  function renderKnotStream() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    state.time += 0.016;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const mouseOffX = (state.mouseX - cx) * 0.035;
    const mouseOffY = (state.mouseY - cy) * 0.035;

    // Viewport responsive scale for logo_m
    const scaleBase = Math.min(width * 0.76, height * 0.88);
    const scaleX = scaleBase;
    const scaleY = scaleBase * 0.95;

    // 1. Ambient Radial Glow Background
    const grad = ctx.createRadialGradient(
      state.mouseX, state.mouseY, 20,
      state.mouseX, state.mouseY, 480
    );
    grad.addColorStop(0, 'rgba(200, 168, 107, 0.07)');
    grad.addColorStop(1, 'rgba(8, 7, 6, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Stroke Progress (스크롤 진행률에 따라 logo_m 궤적이 한 획으로 그어짐)
    const strokeProgress = clamp(state.progress * 1.12, 0, 1);
    if (strokeProgress <= 0.005) return;

    const totalSteps = 320;
    const currentSteps = Math.floor(totalSteps * strokeProgress);

    if (currentSteps >= 2) {
      // Draw background ghost path (은은한 가이드라인)
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= totalSteps; i++) {
        const pt = getLogoMPoint(i / totalSteps, scaleX, scaleY, cx, cy, mouseOffX * 0.2, mouseOffY * 0.2);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(200, 168, 107, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Draw Active Luminous Logo_M Stroke (실시간으로 그어지는 메인 골드 라인)
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= currentSteps; i++) {
        const pt = getLogoMPoint(i / totalSteps, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = '#d4b06f';
      ctx.lineWidth = window.innerWidth < 768 ? 3.0 : 4.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(212, 176, 111, 0.65)';
      ctx.shadowBlur = 14;
      ctx.stroke();

      // Inner Bright Silk Core
      ctx.strokeStyle = '#fff5df';
      ctx.lineWidth = window.innerWidth < 768 ? 1.2 : 1.8;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();

      // 3. Leading Needle / Knot Tip (선두 발광점 & 스파클)
      if (strokeProgress < 0.98) {
        const headPt = getLogoMPoint(strokeProgress, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
        drawGlowPoint(ctx, headPt.x, headPt.y, 5.5, '#fff6e0');

        const pulse = Math.sin(state.time * 4) * 1.5;
        drawGlowStar(ctx, headPt.x, headPt.y, 8 + pulse, 'rgba(255, 235, 185, 0.9)');
      }
    }

    // 4. Center Knot Loop Self-Crossing Highlight (루프가 완성되어 교차되는 순간)
    if (strokeProgress >= 0.58) {
      const crossPt = getLogoMPoint(0.58, scaleX, scaleY, cx, cy, mouseOffX, mouseOffY);
      const crossPulse = Math.sin(state.time * 3) * 2;
      drawGlowPoint(ctx, crossPt.x, crossPt.y, 6 + crossPulse, 'rgba(255, 240, 200, 0.95)');
      drawGlowStar(ctx, crossPt.x, crossPt.y, 14 + crossPulse, 'rgba(212, 176, 111, 0.85)');
    }
  }

  // --- INITIALIZATION ---
  function init() {
    updateDimensions();
    initCanvas();
    setupEventListeners();
    setupFaq3DCylinder();
    setupProseSplit();
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

    // Rail Navigation
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

    // Top CTA & Hero Buttons
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

    // Gallery Drag & Wheel Interactivity (Lafour-style scrub)
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
        // Dragging left moves scroll forward; dragging right moves scroll back
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

    // FAQ Drag
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
    // HUD Knot Tension update
    if (el.hudFill && el.hudVal) {
      const tensionPercent = Math.round(p * 100);
      el.hudFill.style.width = `${tensionPercent}%`;
      el.hudVal.textContent = `${tensionPercent}%`;
    }

    // Chapter 1: The Model (Progress 0.00 - 0.18)
    const isModelActive = p >= 0.0 && p < 0.18;
    toggleScene(el.scenes.model, isModelActive);
    if (isModelActive) updateModelChapter(p);

    // Chapter 2: The Work (Progress 0.18 - 0.35)
    const isWorkActive = p >= 0.18 && p < 0.35;
    toggleScene(el.scenes.work, isWorkActive);
    if (isWorkActive) updateWorkChapter(p);

    // Chapter 3: The Collection Gallery (Progress 0.35 - 0.68)
    const isGalleryActive = p >= 0.35 && p < 0.68;
    toggleScene(el.scenes.gallery, isGalleryActive);
    if (isGalleryActive) updateGalleryChapter(p);

    // Chapter 4: Questions (Progress 0.68 - 0.85) - Only after gallery is complete!
    const isQuestionsActive = p >= 0.68 && p < 0.85;
    toggleScene(el.scenes.questions, isQuestionsActive);
    if (isQuestionsActive) updateQuestionsChapter(p);

    // Chapter 5: The Application (Progress 0.85 - 0.94)
    const isApplyActive = p >= 0.85 && p < 0.94;
    toggleScene(el.scenes.apply, isApplyActive);
    if (isApplyActive) updateApplyChapter(p);

    // Outro: Footer (Progress 0.94 - 1.00)
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
  }

  // --- CHAPTER 3: LAFOUR-STYLE HORIZONTAL SCROLL GALLERY LOGIC ---
  function updateGalleryChapter(p) {
    const subP = mapRange(p, 0.35, 0.68, 0, 1);
    const track = el.galleryTrack;
    const wrapper = el.galleryWrapper;

    if (track && wrapper) {
      // Calculate total horizontal track overflow
      const maxScroll = Math.max(0, track.scrollWidth - wrapper.clientWidth + 60);
      state.galleryTargetX = -subP * maxScroll;
      state.galleryCurrentX = lerp(state.galleryCurrentX, state.galleryTargetX, 0.14);
      track.style.transform = `translate3d(${state.galleryCurrentX}px, 0, 0)`;
    }

    // Update Current Index (01 to 10)
    const currentIdx = Math.min(10, Math.max(1, Math.floor(subP * 10) + 1));
    if (el.galleryCurrentIdx) {
      el.galleryCurrentIdx.textContent = String(currentIdx).padStart(2, '0');
    }
    if (el.galleryProgressBar) {
      el.galleryProgressBar.style.width = `${Math.max(10, subP * 100)}%`;
    }

    // Card Internal Parallax
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

    const totalCards = el.faqCards.length;
    let closestIndex = 0;
    let minAngleDist = 999;

    el.faqCards.forEach((card, i) => {
      const baseAngle = parseFloat(card.dataset.baseAngle);
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

    // 1. Draw Knot Line System
    renderKnotStream();

    // 2. Update UI Timeline
    updateTimeline(state.progress);
    updateGridMarkers();
    updateCursor();

    requestAnimationFrame(renderLoop);
  }

  window.handleApplySubmit = function (e) {
    e.preventDefault();
    const btn = el.applySubmitBtn;
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<span>제안서 문의가 접수되었습니다 ✓</span>';
    btn.style.backgroundColor = '#c8a86b';
    btn.style.color = '#080706';

    setTimeout(() => {
      if (el.applyForm) el.applyForm.reset();
      btn.disabled = false;
      btn.innerHTML = '<span>제안서 문의 보내기</span>';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }, 4000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
