// ================================================
// main.js — Inicialização e event listeners globais
// ================================================

// ——— VARIÁVEIS GLOBAIS ———
let WHATSAPP_NUMBER = '';
let IMAGE_BASE_PATH = '';
let ORDER_MIN_VALUE = 0;
let products = [];
let productDetails = {};
const cardQtys = {};

// ——— TIPO DE COMPRA ———
// 'inspire' | 'whitelabel' | null (não selecionado no modal)
let currentPurchaseType = 'inspire'; // padrão global (carrinho)
let modalPurchaseType   = null;      // seleção no modal

// Preenchido dinamicamente a partir de data/config.json (purchaseRules)
let PURCHASE_RULES = {};

// ——— DEFINIR TIPO DE COMPRA (carrinho) ———
function setPurchaseType(type) {
  currentPurchaseType = type;
  ORDER_MIN_VALUE = PURCHASE_RULES[type].orderMin;

  // Atualizar botões
  document.getElementById('cpt-inspire').classList.toggle('cpt-btn--active', type === 'inspire');
  document.getElementById('cpt-whitelabel').classList.toggle('cpt-btn--active', type === 'whitelabel');

  // Atualizar texto de regra
  const rules = PURCHASE_RULES[type];
  const ruleText = rules.productMinQty
    ? `Pedido mínimo R$ ${rules.orderMin.toLocaleString('pt-BR')},00 · Mín. ${rules.productMinQty} un./produto · ${rules.fragMinQty} un./fragrância`
    : `Pedido mínimo R$ ${rules.orderMin.toLocaleString('pt-BR')},00 · Mín. conforme cada produto`;
  document.getElementById('cpt-rule-text').textContent = ruleText;

  // Atualizar nota do rodapé do carrinho
  document.getElementById('cart-note').textContent =
    `Pedido mínimo ${rules.label}: R$ ${rules.orderMin.toLocaleString('pt-BR')},00 · Produção iniciada após confirmação.`;

  // Atualizar barra de progresso e re-renderizar
  renderCart();
}

// ——— DEFINIR TIPO DE COMPRA NO MODAL ———
function setModalPurchaseType(type) {
  modalPurchaseType = type;
  currentPurchaseType = type; // sincroniza com o carrinho

  // Botões do modal
  document.getElementById('mpt-inspire').classList.toggle('mpt-btn--active', type === 'inspire');
  document.getElementById('mpt-whitelabel').classList.toggle('mpt-btn--active', type === 'whitelabel');

  // Sincronizar botões do carrinho
  document.getElementById('cpt-inspire').classList.toggle('cpt-btn--active', type === 'inspire');
  document.getElementById('cpt-whitelabel').classList.toggle('cpt-btn--active', type === 'whitelabel');

  // Mostrar regras
  const rules = PURCHASE_RULES[type];
  ORDER_MIN_VALUE = rules.orderMin;

  const rulesInfo = document.getElementById('mpt-rules-info');
  rulesInfo.style.display = 'flex';
  rulesInfo.classList.remove('mpt-rules-info--inspire', 'mpt-rules-info--wl');
  rulesInfo.classList.add(type === 'inspire' ? 'mpt-rules-info--inspire' : 'mpt-rules-info--wl');

  const p = products.find(x => x.id === modalProductId);
  const minimums = p ? getEffectiveMinimums(p) : { minQty: '—', fragMin: '—' };
  const effectiveMinQty  = minimums.minQty;
  const effectiveFragMin = minimums.fragMin;

  document.getElementById('mpt-rule-minqty-text').textContent  = `Mínimo por produto: ${p ? formatProductQty(p, effectiveMinQty) : effectiveMinQty}`;
  document.getElementById('mpt-rule-fragqty-text').textContent = `Mínimo por fragrância: ${p ? formatProductQty(p, effectiveFragMin) : effectiveFragMin}`;
  document.getElementById('mpt-rule-minorder-text').textContent = `Pedido mínimo: R$ ${rules.orderMin.toLocaleString('pt-BR')},00`;

  // Atualizar label de fragrância no modal
  if (p && p.hasFragrance && p.fragrances.length) {
    document.getElementById('modal-fragrance-min-label').textContent =
      `· mín. ${formatProductQty(p, effectiveFragMin)} por fragrância`;
  }

  // Atualizar botão adicionar
  updateAddModalButton(p);
}

// ——— NAVEGAR PARA PRODUTO COM ERRO (botão "Corrigir produto") ———
function navigateToProduct(productId) {
  closeCart();
  setTimeout(() => {
    const p = products.find(x => x.id === productId);
    if (p) openProductModal(p.id);
  }, 400);
}

// ——— REGISTRAR EVENT LISTENERS ———
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btn-header-wa')
    .addEventListener('click', openWhatsApp);

  document.getElementById('btn-whatsapp-cart')
    .addEventListener('click', openWhatsApp);

  document.getElementById('cart-close')
    .addEventListener('click', closeCart);

  document.getElementById('overlay')
    .addEventListener('click', closeCart);

  document.getElementById('fab-cart')
    .addEventListener('click', openCart);

  document.getElementById('product-modal-overlay')
    .addEventListener('click', closeProductModal);

  document.getElementById('details-modal-overlay')
    .addEventListener('click', closeProductDetails);

  document.getElementById('details-modal-close')
    .addEventListener('click', () => closeProductDetails());

  document.querySelector('.modal-close')
    .addEventListener('click', () => closeProductModal());

  document.getElementById('modal-gallery-prev')
    .addEventListener('click', () => changeModalGalleryImage(-1));
  document.getElementById('modal-gallery-next')
    .addEventListener('click', () => changeModalGalleryImage(1));
  document.getElementById('modal-gallery')
    .addEventListener('touchstart', handleModalGalleryTouchStart, { passive: true });
  document.getElementById('modal-gallery')
    .addEventListener('touchend', handleModalGalleryTouchEnd, { passive: true });

  document.addEventListener('keydown', event => {
    if (!document.getElementById('product-modal-overlay').classList.contains('open')) return;
    if (document.getElementById('img-modal').classList.contains('open')) return;
    if (event.key === 'ArrowLeft') changeModalGalleryImage(-1);
    if (event.key === 'ArrowRight') changeModalGalleryImage(1);
  });

  document.getElementById('img-modal')
    .addEventListener('click', closeImgModal);
  document.querySelector('.img-modal-close')
    .addEventListener('click', closeImgModal);
});

// ——— CARREGAR DADOS E INICIALIZAR ———
Promise.all([
  fetch('data/config.json').then(r => r.json()),
  fetch('data/products.json').then(r => r.json()),
  fetch('data/product-details.json').then(r => r.json()),
])
  .then(([config, data, details]) => {
    WHATSAPP_NUMBER = config.whatsappNumber;
    IMAGE_BASE_PATH = config.imageBasePath;
    PURCHASE_RULES  = config.purchaseRules;
    ORDER_MIN_VALUE = PURCHASE_RULES.inspire.orderMin;
    productDetails = details;

    if (config.heroDesc) {
      const el = document.getElementById('hero-desc');
      if (el) el.textContent = config.heroDesc;
    }

    const minEl = document.getElementById('order-progress-min');
    if (minEl) minEl.textContent = `Mín: ${formatCurrency(ORDER_MIN_VALUE)}`;

    const requestedOrder = [
      9, 11, 12, 13, 23, 10, 30, 29, 16, 15, 31, 32, 3, 1, 2,
      14, 34, 19, 22, 21, 20, 18, 17, 33, 6, 7, 8, 25, 26, 27, 28, 24
    ];

    const orderIndex = new Map(requestedOrder.map((id, index) => [id, index]));
    products = data
      .filter(product => ![4, 5].includes(product.id))
      .sort((a, b) => (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999));
    renderProducts();
    renderCart();

    // Inicializar label de regras do tipo padrão
    setPurchaseType('inspire');
  })
  .catch((err) => {
    console.error('Erro ao carregar arquivos:', err);
    document.getElementById('products-grid').innerHTML =
      '<p style="text-align:center;color:var(--ink-soft);padding:40px 20px">Erro ao carregar os arquivos. Verifique se config.json e products.json estão na pasta data/.</p>';
  });
