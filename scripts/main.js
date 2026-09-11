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
const CATALOG_ID = document.body.dataset.catalog || 'main';
const IS_COLLECTION_CATALOG = CATALOG_ID !== 'main';
const CATALOG_NAME = CATALOG_ID === 'natal-2026'
  ? 'Natal 2026'
  : CATALOG_ID === 'christmas' ? 'Expresso Polar' : 'Catálogo Atacado 2026';
const CATALOG_FILES = {
  main: ['data/products.json', 'data/product-details.json'],
  christmas: ['data/expresso-polar-products.json', 'data/expresso-polar-details.json'],
  'natal-2026': ['data/natal-2026-products.json', 'data/natal-2026-details.json']
};

const catalogProductsRequest = CATALOG_ID === 'natal-2026'
  ? Promise.all([
      fetch('data/natal-2026-products.json').then(r => r.json()),
      fetch('data/expresso-polar-products.json').then(r => r.json())
    ]).then(([launches, polar]) => [
      ...launches.map(product => ({ ...product, collection: 'natal-2026' })),
      ...polar.map(product => ({ ...product, collection: 'expresso-polar' }))
    ])
  : fetch(CATALOG_FILES[CATALOG_ID][0]).then(r => r.json());

const catalogDetailsRequest = CATALOG_ID === 'natal-2026'
  ? Promise.all([
      fetch('data/expresso-polar-details.json').then(r => r.json()),
      fetch('data/natal-2026-details.json').then(r => r.json())
    ]).then(([polar, launches]) => ({ ...polar, ...launches }))
  : fetch(CATALOG_FILES[CATALOG_ID][1]).then(r => r.json());

// ——— TIPO DE COMPRA ———
// 'inspire' | 'whitelabel' | null (não selecionado no modal)
let currentPurchaseType = 'inspire'; // padrão global (carrinho)
let modalPurchaseType   = null;      // seleção no modal

// Preenchido dinamicamente a partir de data/config.json (purchaseRules)
let PURCHASE_RULES = {};

// ——— RESUMO AUTOMÁTICO DAS MODALIDADES NO CARRINHO ———
function updateCartPurchaseTypeSummary() {
  const types = getCartPurchaseTypes();
  const hasInspire = types.has('inspire');
  const hasWhiteLabel = types.has('whitelabel');

  document.getElementById('cpt-inspire')?.classList.toggle('cpt-tag--active', hasInspire);
  document.getElementById('cpt-whitelabel')?.classList.toggle('cpt-tag--active', hasWhiteLabel);

  const ruleLines = [];
  if (hasInspire || types.size === 0) {
    ruleLines.push('Inspire: pedido mínimo R$ 1.000,00 · Mín. conforme cada produto');
  }
  if (hasWhiteLabel || types.size === 0) {
    ruleLines.push('White Label: pedido mínimo R$ 2.000,00 · Mín. 20 un./produto · 10 un./fragrância');
  }
  document.getElementById('cpt-rule-text').innerHTML = ruleLines
    .map(line => `<span class="cpt-rule-line">${line}</span>`).join('');

  const orderLabel = hasWhiteLabel
    ? (hasInspire ? 'Pedido misto' : 'Pedido White Label')
    : 'Pedido Inspire';
  document.getElementById('cart-note').textContent =
    `${orderLabel} · Mínimo final: ${formatCurrency(ORDER_MIN_VALUE)} · Produção iniciada após confirmação.`;
}

function setModalPurchaseType(type) {
  modalPurchaseType = type;
  currentPurchaseType = type; // memoriza a escolha para o próximo produto

  // Botões do modal
  document.getElementById('mpt-inspire').classList.toggle('mpt-btn--active', type === 'inspire');
  document.getElementById('mpt-whitelabel')?.classList.toggle('mpt-btn--active', type === 'whitelabel');

  // Mostrar regras
  const rules = PURCHASE_RULES[type];

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
    const optionLabels = getOptionLabels(p);
    document.getElementById('modal-option-label').textContent = optionLabels.singular;
    document.getElementById('modal-fragrance-min-label').textContent =
      `· mín. ${formatProductQty(p, effectiveFragMin)} por ${optionLabels.singular.toLowerCase()}`;
  }

  // Atualizar botão adicionar
  updateAddModalButton(p);
}

// ——— NAVEGAR PARA PRODUTO COM ERRO (botão "Corrigir produto") ———
function navigateToProduct(productId, purchaseType = 'inspire') {
  closeCart();
  setTimeout(() => {
    currentPurchaseType = purchaseType;
    const p = products.find(x => x.id === productId);
    if (p) {
      openProductModal(p.id);
      return;
    }

    const savedEntry = Object.values(cart).find(entry => entry.product.id === productId);
    if (!savedEntry) return;
    const targetPage = savedEntry.product.catalog === 'christmas'
      ? 'expresso-polar.html'
      : savedEntry.product.catalog === 'natal-2026' ? 'natal-2026.html' : 'index.html';
    window.location.href = `${targetPage}#catalogo`;
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
  catalogProductsRequest,
  catalogDetailsRequest,
])
  .then(([config, data, details]) => {
    WHATSAPP_NUMBER = config.whatsappNumber;
    IMAGE_BASE_PATH = config.imageBasePath;
    PURCHASE_RULES  = config.purchaseRules;
    ORDER_MIN_VALUE = PURCHASE_RULES.inspire.orderMin;
    productDetails = details;

    if (config.heroDesc && !IS_COLLECTION_CATALOG) {
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
    products = (IS_COLLECTION_CATALOG
      ? data
      : data
          .filter(product => ![4, 5].includes(product.id))
          .sort((a, b) => (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999)))
      .map(product => ({
        ...product,
        catalog: CATALOG_ID
      }));
    loadCart();
    renderProducts();
    renderCart();

    // Inicializar indicadores automáticos das modalidades
    updateCartPurchaseTypeSummary();
  })
  .catch((err) => {
    console.error('Erro ao carregar arquivos:', err);
    document.getElementById('products-grid').innerHTML =
      '<p style="text-align:center;color:var(--ink-soft);padding:40px 20px">Erro ao carregar os arquivos. Verifique se config.json e products.json estão na pasta data/.</p>';
  });
