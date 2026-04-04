// ================================================
// cart.js — Carrinho com faixas de preço, valor mínimo e validação final
// ================================================

const cart = {};

function cartKey(productId, fragrance) {
  return fragrance ? `${productId}__${fragrance}` : `${productId}`;
}

function addToCart(productId, qty, fragrance, purchaseType) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const key = cartKey(productId, fragrance);
  if (cart[key]) {
    cart[key].quantity += qty;
  } else {
    cart[key] = {
      product,
      quantity: qty,
      fragrance: fragrance || null,
      purchaseType: purchaseType || currentPurchaseType || 'inspire'
    };
  }

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
  renderCart();
}

function removeFromCart(key) {
  delete cart[key];
  renderCart();
}

function calcTotal() {
  return Object.values(cart).reduce((sum, entry) => {
    const tier = getActiveTier(entry.product, entry.quantity);
    return sum + tier.price * entry.quantity;
  }, 0);
}

// ================================================
// VALIDAÇÃO FINAL DO CARRINHO — respeita tipo de compra
// ================================================
function validateCart() {
  const rules = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;

  const byProduct = {};
  Object.values(cart).forEach(entry => {
    const id = entry.product.id;
    if (!byProduct[id]) {
      byProduct[id] = { product: entry.product, fragrances: {}, purchaseType: entry.purchaseType };
    }
    if (entry.fragrance) {
      byProduct[id].fragrances[entry.fragrance] = entry.quantity;
    } else {
      byProduct[id].totalDirect = (byProduct[id].totalDirect || 0) + entry.quantity;
    }
  });

  const errors = [];

  Object.values(byProduct).forEach(({ product, fragrances, totalDirect }) => {
    const messages = [];
    const hasFragrances = product.hasFragrance && product.fragrances.length > 0;

    // Mínimos efetivos: White Label sobrescreve os padrões do produto
    const effectiveMinQty  = rules.productMinQty  || product.minQty;
    const effectiveFragMin = rules.fragMinQty      || product.fragranceMinQty;

    if (hasFragrances) {
      const totalQty = Object.values(fragrances).reduce((s, v) => s + v, 0);

      if (totalQty < effectiveMinQty) {
        messages.push(
          `Quantidade total insuficiente: ${totalQty} un. (mínimo ${effectiveMinQty} un.)`
        );
      }

      Object.entries(fragrances).forEach(([name, qty]) => {
        if (qty < effectiveFragMin) {
          messages.push(
            `Fragrância "${name}": ${qty} un. (mínimo ${effectiveFragMin} un./fragrância)`
          );
        }
      });

    } else {
      const totalQty = totalDirect || 0;
      if (totalQty < effectiveMinQty) {
        messages.push(
          `Quantidade insuficiente: ${totalQty} un. (mínimo ${effectiveMinQty} un.)`
        );
      }
    }

    if (messages.length > 0) {
      errors.push({ productId: product.id, productName: product.name, messages });
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
    validation.errors.forEach(e => { errorMap[e.productId] = e; });
  }

  container.innerHTML = '';
  const grandTotal = calcTotal();

  entries.forEach(([key, entry]) => {
    const { product, quantity, fragrance } = entry;
    const tier     = getActiveTier(product, quantity);
    const subtotal = tier.price * quantity;

    const productErrorObj = errorMap[product.id];
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
        <button class="cart-item-remove" onclick="removeFromCart('${key}')" aria-label="Remover">✕</button>
      </div>
      <div class="cart-item-sub">
        ${fragrance ? `🌿 ${fragrance}` : ''}
        <span class="badge-tier">${tier.label} · ${formatCurrency(tier.price)}/un</span>
      </div>
      <div class="cart-item-footer">
        <div class="cart-item-qty-ctrl">
          <button class="cart-item-qty-btn" onclick="changeCartQty('${key}', -1)">−</button>
          <span class="cart-item-qty-val">${quantity}</span>
          <button class="cart-item-qty-btn" onclick="changeCartQty('${key}', 1)">+</button>
        </div>
        <span class="cart-item-price">${formatCurrency(subtotal)}</span>
      </div>
      ${hasError ? `
        <div class="cart-item-errors">
          ${itemErrors.map(msg => `<span class="cart-item-error-msg">⚠ ${msg}</span>`).join('')}
          <button class="cart-item-fix-btn" onclick="navigateToProduct(${product.id})">
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
