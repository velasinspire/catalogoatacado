// ================================================
// main.js — Inicialização e event listeners globais
// ================================================

// ——— VARIÁVEIS GLOBAIS ———
let WHATSAPP_NUMBER = '';
let IMAGE_BASE_PATH = '';
let ORDER_MIN_VALUE = 0;
let products = [];
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
  const effectiveMinQty  = rules.productMinQty  || (p ? p.minQty          : '—');
  const effectiveFragMin = rules.fragMinQty      || (p ? p.fragranceMinQty : '—');

  document.getElementById('mpt-rule-minqty-text').textContent  = `Mínimo por produto: ${effectiveMinQty} un.`;
  document.getElementById('mpt-rule-fragqty-text').textContent = `Mínimo por fragrância: ${effectiveFragMin} un.`;
  document.getElementById('mpt-rule-minorder-text').textContent = `Pedido mínimo: R$ ${rules.orderMin.toLocaleString('pt-BR')},00`;

  // Atualizar label de fragrância no modal
  if (p && p.hasFragrance && p.fragrances.length) {
    document.getElementById('modal-fragrance-min-label').textContent =
      `· mín. ${effectiveFragMin} un. por fragrância`;
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

  document.querySelector('.modal-close')
    .addEventListener('click', () => closeProductModal());

  document.getElementById('img-modal')
    .addEventListener('click', closeImgModal);
  document.querySelector('.img-modal-close')
    .addEventListener('click', closeImgModal);
});

// ——— CARREGAR DADOS E INICIALIZAR ———
Promise.all([
  fetch('data/config.json').then(r => r.json()),
  fetch('data/products.json').then(r => r.json()),
])
  .then(([config, data]) => {
    WHATSAPP_NUMBER = config.whatsappNumber;
    IMAGE_BASE_PATH = config.imageBasePath;
    PURCHASE_RULES  = config.purchaseRules;
    ORDER_MIN_VALUE = PURCHASE_RULES.inspire.orderMin;

    if (config.heroDesc) {
      const el = document.getElementById('hero-desc');
      if (el) el.textContent = config.heroDesc;
    }

    const minEl = document.getElementById('order-progress-min');
    if (minEl) minEl.textContent = `Mín: ${formatCurrency(ORDER_MIN_VALUE)}`;

    products = data;
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
