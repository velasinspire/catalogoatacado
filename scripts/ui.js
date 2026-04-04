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
  if (e.key === 'Escape') { closeImgModal(); closeCart(); closeProductModal(); }
});
