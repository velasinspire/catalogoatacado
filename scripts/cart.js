// ================================================
// cart.js — Carrinho com faixas de preço, valor mínimo e validação final
// ================================================

const cart = {};
const CART_STORAGE_KEY = 'velas-inspire-shared-cart-v1';

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '{}');
    if (!savedCart || typeof savedCart !== 'object' || Array.isArray(savedCart)) return;

    Object.keys(cart).forEach(key => delete cart[key]);
    Object.values(savedCart).forEach(entry => {
      if (!entry?.product || !Number.isFinite(Number(entry.quantity))) return;
      const latestProduct = products.find(product =>
        product.id === entry.product.id &&
        product.catalog === entry.product.catalog
      );
      const normalizedEntry = {
        ...entry,
        product: latestProduct || entry.product,
        quantity: Number(entry.quantity),
        purchaseType: entry.purchaseType || 'inspire'
      };
      const key = cartKey(
        normalizedEntry.product.id,
        normalizedEntry.fragrance,
        normalizedEntry.purchaseType,
        normalizedEntry.product.catalog
      );
      if (cart[key]) cart[key].quantity += normalizedEntry.quantity;
      else cart[key] = normalizedEntry;
    });
    saveCart();
  } catch (error) {
    console.warn('Não foi possível restaurar o carrinho salvo.', error);
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn('Não foi possível salvar o carrinho.', error);
  }
}

function cartKey(productId, fragrance, purchaseType = 'inspire', catalog = 'main') {
  return `${catalog || 'main'}__${productId}__${purchaseType}__${fragrance || 'sem-opcao'}`;
}

function addToCart(productId, qty, fragrance, purchaseType) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const itemPurchaseType = purchaseType || modalPurchaseType || currentPurchaseType || 'inspire';
  const key = cartKey(productId, fragrance, itemPurchaseType, product.catalog);
  if (cart[key]) {
    cart[key].quantity += qty;
  } else {
    cart[key] = {
      product,
      quantity: qty,
      fragrance: fragrance || null,
      purchaseType: itemPurchaseType
    };
  }

  saveCart();

  document.getElementById('product-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';

  showToast(`"${product.name}" adicionado ao pedido!`);
  animateBadge();
  renderCart();
}

function changeCartQty(key, delta) {
  if (!cart[key]) return;
  const product = cart[key].product;
  const newQty  = cart[key].quantity + delta;

  if (newQty <= 0) {
    if (confirm(`Deseja remover "${product.name}" do pedido?`)) {
      delete cart[key];
    }
  } else {
    cart[key].quantity = newQty;
  }
  saveCart();
  renderCart();
}

function setCartQtyFromInput(key, value) {
  if (!cart[key]) return;
  const product = cart[key].product;
  let newQty = parseFloat(value);

  if (isNaN(newQty) || newQty <= 0) {
    if (confirm(`Deseja remover "${product.name}" do pedido?`)) {
      delete cart[key];
    }
  } else {
    cart[key].quantity = newQty;
  }
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  delete cart[key];
  saveCart();
  renderCart();
}

function getCartProductTotal(product, purchaseType = 'inspire') {
  return Object.values(cart).reduce((total, entry) => {
    const isSameProduct = entry.product.id === product.id &&
      (entry.product.catalog || 'main') === (product.catalog || 'main') &&
      (entry.purchaseType || 'inspire') === purchaseType;
    return isSameProduct ? total + entry.quantity : total;
  }, 0);
}

function getCartProductTier(product, purchaseType = 'inspire') {
  return getActiveTier(product, getCartProductTotal(product, purchaseType));
}

function getCartPurchaseTypes() {
  return new Set(Object.values(cart).map(entry => entry.purchaseType || 'inspire'));
}

function getCartOrderMinimum() {
  return getCartPurchaseTypes().has('whitelabel')
    ? PURCHASE_RULES.whitelabel.orderMin
    : PURCHASE_RULES.inspire.orderMin;
}

function calcTotal() {
  return Object.values(cart).reduce((sum, entry) => {
    const tier = getCartProductTier(entry.product, entry.purchaseType || 'inspire');
    return sum + tier.price * entry.quantity;
  }, 0);
}

// ================================================
// VALIDAÇÃO FINAL DO CARRINHO — respeita tipo de compra
// ================================================
function validateCart() {
  const byProduct = {};
  Object.values(cart).forEach(entry => {
    const purchaseType = entry.purchaseType || 'inspire';
    const groupKey = `${entry.product.catalog || 'main'}__${entry.product.id}__${purchaseType}`;
    if (!byProduct[groupKey]) {
      byProduct[groupKey] = { product: entry.product, fragrances: {}, purchaseType };
    }
    if (entry.fragrance) {
      byProduct[groupKey].fragrances[entry.fragrance] =
        (byProduct[groupKey].fragrances[entry.fragrance] || 0) + entry.quantity;
    } else {
      byProduct[groupKey].totalDirect = (byProduct[groupKey].totalDirect || 0) + entry.quantity;
    }
  });

  const errors = [];

  Object.values(byProduct).forEach(({ product, fragrances, totalDirect, purchaseType }) => {
    const messages = [];
    const hasFragrances = product.hasFragrance && product.fragrances.length > 0;
    const rules = PURCHASE_RULES[purchaseType] || PURCHASE_RULES.inspire;

    // Mínimos efetivos: White Label sobrescreve os padrões do produto
    const effectiveMinQty  = isWeightProduct(product) ? product.minQty : (rules.productMinQty || product.minQty);
    const effectiveFragMin = isWeightProduct(product) ? product.fragranceMinQty : (rules.fragMinQty || product.fragranceMinQty);

    if (hasFragrances) {
      const totalQty = Object.values(fragrances).reduce((s, v) => s + v, 0);

      if (totalQty < effectiveMinQty) {
        messages.push(
          `Quantidade total insuficiente: ${formatProductQty(product, totalQty)} (mínimo ${formatProductQty(product, effectiveMinQty)})`
        );
      }

      Object.entries(fragrances).forEach(([name, qty]) => {
        if (qty < effectiveFragMin) {
          const optionLabel = product.optionLabel || 'Fragrância';
          messages.push(
            `${optionLabel} "${name}": ${formatProductQty(product, qty)} (mínimo ${formatProductQty(product, effectiveFragMin)}/${optionLabel.toLowerCase()})`
          );
        }
      });

    } else {
      const totalQty = totalDirect || 0;
      if (totalQty < effectiveMinQty) {
        messages.push(
          `Quantidade insuficiente: ${formatProductQty(product, totalQty)} (mínimo ${formatProductQty(product, effectiveMinQty)})`
        );
      }
    }

    if (messages.length > 0) {
      errors.push({
        productId: product.id,
        productCatalog: product.catalog || 'main',
        purchaseType,
        productName: product.name,
        messages
      });
    }
  });

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}

// ——— RENDERIZAR CARRINHO ———
function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl   = document.getElementById('cart-total');
  const badge     = document.getElementById('fab-badge');
  const btnWa     = document.getElementById('btn-whatsapp-cart');
  const agreed    = document.getElementById('cart-rules-agreed');

  const entries    = Object.entries(cart);
  const totalItems = Object.values(cart).reduce((s, e) => s + e.quantity, 0);
  badge.textContent = totalItems;
  ORDER_MIN_VALUE = getCartOrderMinimum();
  updateCartPurchaseTypeSummary();

  if (entries.length === 0) {
    container.innerHTML = '<p class="cart-empty">Nenhum produto adicionado ainda.</p>';
    totalEl.textContent = 'R$ 0,00';
    btnWa.disabled = true;
    updateOrderProgress(0);
    return;
  }

  const validation = validateCart();
  const errorMap = {};
  if (!validation.valid) {
    validation.errors.forEach(e => {
      errorMap[`${e.productCatalog || 'main'}__${e.productId}__${e.purchaseType || 'inspire'}`] = e;
    });
  }

  container.innerHTML = '';
  const grandTotal = calcTotal();

  entries.forEach(([key, entry]) => {
    const { product, quantity, fragrance } = entry;
    const purchaseType = entry.purchaseType || 'inspire';
    const productTotal = getCartProductTotal(product, purchaseType);
    const tier     = getActiveTier(product, productTotal);
    const subtotal = tier.price * quantity;

    const productErrorObj = errorMap[`${product.catalog || 'main'}__${product.id}__${purchaseType}`];
    const productErrors   = productErrorObj ? productErrorObj.messages : [];
    const itemErrors = fragrance
      ? productErrors.filter(msg =>
          msg.includes(`"${fragrance}"`) || msg.includes('Quantidade total')
        )
      : productErrors;

    const hasError = itemErrors.length > 0;

    const item = document.createElement('div');
    item.className = `cart-item${hasError ? ' cart-item--invalid' : ''}`;
    item.setAttribute('data-product-id', product.id);

    item.innerHTML = `
      <div class="cart-item-header">
        <span class="cart-item-name">${product.name}</span>
        <span class="cart-item-type cart-item-type--${purchaseType}">${PURCHASE_RULES[purchaseType]?.label || 'Inspire'}</span>
        <button class="cart-item-remove" onclick="removeFromCart('${key}')" aria-label="Remover">✕</button>
      </div>
      <div class="cart-item-sub">
        ${fragrance ? `🌿 ${fragrance}` : ''}
        <span class="badge-tier">${tier.label} · ${formatCurrency(tier.price)}/${isWeightProduct(product) ? 'kg' : 'un'}</span>
      </div>
      <div class="cart-item-footer">
        <div class="cart-item-qty-ctrl">
          <button class="cart-item-qty-btn" onclick="changeCartQty('${key}', -${getQuantityStep(product)})">−</button>
          <input type="number" class="cart-item-qty-val cart-item-qty-input" value="${quantity}" min="${getQuantityStep(product)}" step="${getQuantityStep(product)}" inputmode="${isWeightProduct(product) ? 'decimal' : 'numeric'}"
                 onfocus="this.select()" onkeydown="if(event.key==='Enter') this.blur()"
                 onchange="setCartQtyFromInput('${key}', this.value)" />
          <button class="cart-item-qty-btn" onclick="changeCartQty('${key}', ${getQuantityStep(product)})">+</button>
        </div>
        <span class="cart-item-price">${formatCurrency(subtotal)}</span>
      </div>
      ${hasError ? `
        <div class="cart-item-errors">
          ${itemErrors.map(msg => `<span class="cart-item-error-msg">⚠ ${msg}</span>`).join('')}
          <button class="cart-item-fix-btn" onclick="navigateToProduct(${product.id}, '${purchaseType}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Corrigir produto
          </button>
        </div>` : ''}
    `;
    container.appendChild(item);
  });

  totalEl.textContent = formatCurrency(grandTotal);

  const reachedMin = grandTotal >= ORDER_MIN_VALUE;
  const rulesAgreed = agreed && agreed.checked;

  btnWa.disabled = !reachedMin || !validation.valid || !rulesAgreed;

  if (!rulesAgreed && entries.length > 0) {
    btnWa.title = 'Marque que leu e concordou com as Regras de Compra';
  } else if (!validation.valid) {
    btnWa.title = 'Corrija os itens com ⚠ antes de enviar';
  } else if (!reachedMin) {
    btnWa.title = `Pedido mínimo de ${formatCurrency(ORDER_MIN_VALUE)} não atingido`;
  } else {
    btnWa.title = '';
  }

  updateOrderProgress(grandTotal);
}

function updateOrderProgress(total) {
  const progressEl = document.getElementById('order-progress');
  const barEl      = document.getElementById('order-progress-bar');
  const missingEl  = document.getElementById('order-missing');
  const minEl      = document.getElementById('order-progress-min');

  const pct = Math.min((total / ORDER_MIN_VALUE) * 100, 100);
  barEl.style.width = `${pct}%`;
  minEl.textContent = `Mín: ${formatCurrency(ORDER_MIN_VALUE)}`;

  if (total >= ORDER_MIN_VALUE) {
    progressEl.classList.add('hidden');
  } else {
    progressEl.classList.remove('hidden');
    const missing = ORDER_MIN_VALUE - total;
    missingEl.innerHTML = `${formatCurrency(missing)}`;
  }
}

function openCart() {
  document.getElementById('cart-panel').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-panel').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
  document.body.style.overflow = '';
}
