// ================================================
// ui.js — Utilitários visuais
// ================================================

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ——— TOAST ———
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ——— BADGE FAB ———
function animateBadge() {
  const badge = document.getElementById('fab-badge');
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 300);
}

// ——— MODAL DE IMAGEM (zoom) ———
function openImgModal(src, alt) {
  const modal = document.getElementById('img-modal');
  document.getElementById('img-modal-src').src = src;
  document.getElementById('img-modal-src').alt = alt;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeImgModal() {
  document.getElementById('img-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ——— TECLADO ———
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeImgModal(); closeCart(); closeProductModal(); closeProductDetails(); }
});

// ——— CARROSSEL DE COLEÇÕES DA PÁGINA PRINCIPAL ———
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.collection-carousel');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('.collection-banner')];
  const dots = [...carousel.querySelectorAll('.collection-carousel__dot')];
  let activeIndex = 0;
  let timer;

  const showSlide = index => {
    activeIndex = index;
    slides.forEach((slide, i) => {
      const active = i === activeIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.tabIndex = active ? 0 : -1;
      dots[i].classList.toggle('is-active', active);
      dots[i].setAttribute('aria-current', String(active));
    });
  };

  const startRotation = () => {
    clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => showSlide((activeIndex + 1) % slides.length), 6500);
  };

  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    showSlide(index);
    startRotation();
  }));
  carousel.addEventListener('mouseenter', () => clearInterval(timer));
  carousel.addEventListener('mouseleave', startRotation);
  carousel.addEventListener('focusin', () => clearInterval(timer));
  carousel.addEventListener('focusout', startRotation);
  startRotation();
});

// ——— FOTOS DO BANNER NATAL 2026 ———
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.querySelector('.home-christmas-banner');
  if (!banner) return;

  const slides = [...banner.querySelectorAll('.home-christmas-banner__slide')];
  const indicators = [...banner.querySelectorAll('.home-christmas-banner__progress i')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  if (slides.length < 2 || reducedMotion || mobile) return;

  let activeIndex = 0;
  let rotationTimer;

  const showNext = () => {
    slides[activeIndex].classList.remove('is-active');
    indicators[activeIndex]?.classList.remove('is-active');
    activeIndex = (activeIndex + 1) % slides.length;
    slides[activeIndex].classList.add('is-active');
    indicators[activeIndex]?.classList.add('is-active');
  };

  const startRotation = () => {
    clearInterval(rotationTimer);
    rotationTimer = setInterval(showNext, 6000);
  };

  banner.addEventListener('mouseenter', () => clearInterval(rotationTimer));
  banner.addEventListener('mouseleave', startRotation);
  banner.addEventListener('focusin', () => clearInterval(rotationTimer));
  banner.addEventListener('focusout', startRotation);
  startRotation();
});
