// -------------------------------------------------------------
// CANVAS & INK LINE ART (RETINA & TOUCH OPTIMIZED)
// -------------------------------------------------------------
const canvas = document.getElementById('inkCanvas');
const ctx = canvas.getContext('2d');

let width, height, dpr;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  ctx.scale(dpr, dpr);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const points = [];
const maxPoints = 35; // 모바일 가독성을 위해 포인트 감소

let targetX = width / 2;
let targetY = height / 2;
let currentX = width / 2;
let currentY = height / 2;
let lastX = width / 2;
let lastY = height / 2;

// 마우스 & 터치 좌표 갱신
window.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    targetX = e.touches[0].clientX;
    targetY = e.touches[0].clientY;
  }
}, { passive: true });

function animateLineArt() {
  ctx.clearRect(0, 0, width, height);

  currentX += (targetX - currentX) * 0.2;
  currentY += (targetY - currentY) * 0.2;

  const dist = Math.hypot(currentX - lastX, currentY - lastY);

  if (dist > 2) {
    const steps = Math.min(Math.floor(dist / 2), 4);
    for (let i = 1; i <= steps; i++) {
      const interpX = lastX + (currentX - lastX) * (i / steps);
      const interpY = lastY + (currentY - lastY) * (i / steps);
      points.unshift({ x: interpX, y: interpY });
    }
    lastX = currentX;
    lastY = currentY;
  } else {
    points.unshift({ x: currentX, y: currentY });
  }

  while (points.length > maxPoints) {
    points.pop();
  }

  if (points.length > 3) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < points.length - 2; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = points[i + 2];

      const xc1 = (p0.x + p1.x) / 2;
      const yc1 = (p0.y + p1.y) / 2;
      const xc2 = (p1.x + p2.x) / 2;
      const yc2 = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.moveTo(xc1, yc1);
      ctx.quadraticCurveTo(p1.x, p1.y, xc2, yc2);

      const progress = 1 - (i / points.length);
      ctx.lineWidth = progress * 3.5 + 0.6;
      ctx.strokeStyle = `rgba(18, 18, 18, ${progress * 0.7})`;

      ctx.stroke();
    }
    ctx.restore();
  }

  requestAnimationFrame(animateLineArt);
}

// -------------------------------------------------------------
// NAVIGATION & PAGE LOGIC
// -------------------------------------------------------------
let currentSection = 0;
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.chapter-item');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
let isTransitioning = false;

let sec1Step = 0;
const totalSec1Steps = 3;

function goToSection(index) {
  if (index < 0 || index >= sections.length || (index === currentSection && isTransitioning)) return;

  isTransitioning = true;

  sections[currentSection].classList.remove('active');
  sections[index].classList.add('active');

  // 활성화 메뉴 표시 동기화
  navItems.forEach((el, idx) => el.classList.toggle('active', idx === index));
  mobileNavItems.forEach((el, idx) => el.classList.toggle('active', idx === index));

  currentSection = index;

  const bgVideo = document.getElementById('bgVideo');

  if (index === 1) {
    if (bgVideo) {
      bgVideo.classList.add('active');
      bgVideo.play().catch(e => console.log("Video play error:", e));
    }

    sec1Step = 0;
    updateSec1Cards();
    
    const sec1Header = document.querySelector('.sec1-header');
    if (sec1Header) sec1Header.classList.remove('show');

    setTimeout(() => {
      if (currentSection === 1 && sec1Header) {
        sec1Header.classList.add('show');
      }
    }, 400);

  } else {
    if (bgVideo) {
      bgVideo.classList.remove('active');
      bgVideo.pause();
    }
  }

  setTimeout(() => {
    isTransitioning = false;
  }, 800);
}

function nextSection() {
  if (currentSection < sections.length - 1) {
    goToSection(currentSection + 1);
  }
}

function prevSection() {
  if (currentSection > 0) {
    goToSection(currentSection - 1);
  }
}

// 휠 스크롤 (PC)
window.addEventListener('wheel', (e) => {
  if (isTransitioning) return;
  const delta = e.deltaY;

  if (currentSection === 1) {
    if (delta > 30) { 
      if (sec1Step < totalSec1Steps) {
        sec1Step++;
        updateSec1Cards();
        lockScrollTemp();
        return; 
      }
    } else if (delta < -30) { 
      if (sec1Step > 0) {
        sec1Step--;
        updateSec1Cards();
        lockScrollTemp();
        return; 
      }
    }
  }

  if (delta > 30) {
    nextSection();
  } else if (delta < -30) {
    prevSection();
  }
}, { passive: true });

// -------------------------------------------------------------
// MOBILE TOUCH SWIPE OPTIMIZATION
// -------------------------------------------------------------
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (isTransitioning) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const deltaX = touchStartX - touchEndX;
  const deltaY = touchStartY - touchEndY;

  // 수직 스와이프가 주요 동작일 때만 페이지 전환 (수평 스와이프 간섭 제외)
  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 40) {
    if (deltaY > 0) { // 위로 스와이프 (다음)
      if (currentSection === 1 && sec1Step < totalSec1Steps) {
        sec1Step++;
        updateSec1Cards();
        lockScrollTemp();
        return;
      }
      nextSection();
    } else { // 아래로 스와이프 (이전)
      if (currentSection === 1 && sec1Step > 0) {
        sec1Step--;
        updateSec1Cards();
        lockScrollTemp();
        return;
      }
      prevSection();
    }
  }
}, { passive: true });

// 키보드 조작
window.addEventListener('keydown', (e) => {
  if (isTransitioning) return;

  if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    if (currentSection === 1 && sec1Step < totalSec1Steps) {
      sec1Step++;
      updateSec1Cards();
      lockScrollTemp();
      return;
    }
    nextSection();
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    if (currentSection === 1 && sec1Step > 0) {
      sec1Step--;
      updateSec1Cards();
      lockScrollTemp();
      return;
    }
    prevSection();
  }
});

function updateSec1Cards() {
  const cards = document.querySelectorAll('.sec1-card');
  cards.forEach((card) => {
    const cardStep = parseInt(card.getAttribute('data-step'), 10);
    if (cardStep <= sec1Step) {
      card.classList.add('visible');
    } else {
      card.classList.remove('visible');
    }
  });
}

function lockScrollTemp() {
  isTransitioning = true;
  setTimeout(() => {
    isTransitioning = false;
  }, 400);
}

// 아코디언 토글
function toggleAccordion(header) {
  const item = header.parentElement;
  const isOpen = item.classList.contains('open');

  document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('open'));

  if (!isOpen) {
    item.classList.add('open');
  }
}

// 폼 제안 제출
function handleFormSubmit(e) {
  e.preventDefault();
  showToast("제안서가 성공적으로 전달되었습니다.");
  e.target.reset();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastText').innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// -------------------------------------------------------------
// MOBILE MENU TOGGLE
// -------------------------------------------------------------
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');

if (mobileMenuBtn && mobileNavOverlay) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileNavOverlay.classList.add('active');
  });
}

function closeMobileMenu() {
  if (mobileNavOverlay) {
    mobileNavOverlay.classList.remove('active');
  }
}

if (mobileMenuClose) {
  mobileMenuClose.addEventListener('click', closeMobileMenu);
}

// 초기화
window.addEventListener('load', () => {
  animateLineArt();

  const introOverlay = document.getElementById('introOverlay');
  if (introOverlay) {
    setTimeout(() => {
      introOverlay.classList.add('fold');
    }, 500);

    setTimeout(() => {
      introOverlay.classList.add('fade-out');
    }, 1600);

    setTimeout(() => {
      introOverlay.remove();
    }, 2500);
  }
});