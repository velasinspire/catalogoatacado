// ================================================
// products.js — Renderização dos cards e modal de produto
// ================================================

function getActiveTier(product, qty) {
  const tiers = [...product.priceTiers].reverse();
  for (const tier of tiers) {
    if (qty >= tier.min) return tier;
  }
  return product.priceTiers[0];
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  products.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.onclick = () => openProductModal(p.id);

    const imgSrc    = IMAGE_BASE_PATH + p.image;
    const tiersHTML = p.priceTiers.map(t => `
      <div class="card-tier">
        <span>${t.label}</span>
        <span class="card-tier-price">${formatCurrency(t.price)}</span>
      </div>
    `).join('');

    const fragranceNote = p.hasFragrance && p.fragrances.length > 0
      ? `<span class="card-minqty">🌿 ${p.fragrances.length} opções · mín. ${p.fragranceMinQty} un./fragrância</span>`
      : '';

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${imgSrc}" alt="${p.name}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80'" />
        ${p.tag ? `<span class="card-badge">${p.tag}</span>` : ''}
      </div>
      <div class="card-body">
        <h3 class="card-name">${p.name}</h3>
        <p class="card-detail">${p.detail}</p>
        <div class="card-tiers">${tiersHTML}</div>
        <span class="card-minqty">📦 Mín. ${p.minQty} unidade${p.minQty > 1 ? 's' : ''} no total</span>
        ${fragranceNote}
        <button class="btn-open-modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar ao pedido
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ================================================
// ESTADO DO MODAL
// ================================================
let modalProductId  = null;
let modalTotalQty   = 0;
let modalFragrances = {};

function modalAllocated() {
  return Object.values(modalFragrances).reduce((s, v) => s + v, 0);
}

// ——— ABRIR MODAL ———
function openProductModal(productId, highlightField) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  modalProductId  = productId;
  modalFragrances = {};
  modalPurchaseType = currentPurchaseType; // herda o tipo atual
  modalTotalQty   = p.hasFragrance && p.fragrances.length > 0 ? 0 : p.minQty;

  const imgSrc = IMAGE_BASE_PATH + p.image;
  document.getElementById('modal-img').src = imgSrc;
  document.getElementById('modal-img').onerror = function () {
    this.src = 'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80';
  };
  document.getElementById('modal-img').alt    = p.name;
  document.getElementById('modal-tag').textContent    = p.tag || '';
  document.getElementById('modal-name').textContent   = p.name;
  document.getElementById('modal-detail').textContent = p.detail;
  document.getElementById('modal-minqty').textContent =
    `📦 Mínimo de ${p.minQty} unidade${p.minQty > 1 ? 's' : ''} no total`;

  // Reset seletor de tipo no modal — pré-seleciona o tipo do carrinho
  document.getElementById('mpt-inspire').classList.toggle('mpt-btn--active', currentPurchaseType === 'inspire');
  document.getElementById('mpt-whitelabel').classList.toggle('mpt-btn--active', currentPurchaseType === 'whitelabel');

  // Mostrar regras se já há tipo selecionado
  if (currentPurchaseType) {
    setModalPurchaseType(currentPurchaseType);
  } else {
    document.getElementById('mpt-rules-info').style.display = 'none';
  }

  renderModalTiers(p, modalTotalQty);

  const fragranceWrap = document.getElementById('modal-fragrance-wrap');
  const hasFragrance  = p.hasFragrance && p.fragrances.length > 0;

  if (hasFragrance) {
    fragranceWrap.style.display = 'flex';
    const rules = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
    const fragMin = rules.fragMinQty || p.fragranceMinQty;
    document.getElementById('modal-fragrance-min-label').textContent =
      `· mín. ${fragMin} un. por fragrância`;
    document.getElementById('qty-derived-hint').style.display = 'block';
  } else {
    fragranceWrap.style.display = 'none';
    document.getElementById('qty-derived-hint').style.display = 'none';
  }

  updateTotalQtyDisplay(p);

  const oldBalance = document.getElementById('modal-balance');
  if (oldBalance) oldBalance.remove();

  renderModalFragrances(p);
  updateModalActivePrice(p);
  updateAddModalButton(p);

  document.getElementById('product-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Highlight de campo inválido (vindo do botão "Corrigir produto")
  if (highlightField) {
    setTimeout(() => highlightModalField(highlightField), 350);
  }
}

function highlightModalField(field) {
  if (field === 'fragrance') {
    const wrap = document.getElementById('modal-fragrance-wrap');
    if (wrap) {
      wrap.classList.add('field-highlight');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => wrap.classList.remove('field-highlight'), 2500);
    }
  } else if (field === 'qty') {
    const wrap = document.querySelector('.modal-qty-wrap');
    if (wrap) {
      wrap.classList.add('field-highlight');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => wrap.classList.remove('field-highlight'), 2500);
    }
  }
}

function closeProductModal(event) {
  if (event && event.target !== document.getElementById('product-modal-overlay')) return;
  document.getElementById('product-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  modalProductId  = null;
  modalPurchaseType = null;
}

function updateTotalQtyDisplay(product) {
  const hasFragrance = product.hasFragrance && product.fragrances.length > 0;
  const qtyVal       = document.getElementById('modal-qty-val');
  const qtyDec       = document.getElementById('modal-qty-dec');
  const qtyInc       = document.getElementById('modal-qty-inc');

  qtyVal.value = modalTotalQty;

  if (hasFragrance) {
    qtyDec.onclick = () => decrementLastFragrance(product);
    qtyInc.style.display = 'none';
    qtyDec.title = 'Remove uma unidade da última fragrância adicionada';
    qtyVal.disabled = true;
    qtyVal.onchange = null;
  } else {
    qtyInc.style.display = '';
    qtyDec.onclick = () => changeModalTotalQtyDirect(product, -1);
    qtyInc.onclick = () => changeModalTotalQtyDirect(product,  1);
    qtyVal.disabled = false;
    qtyVal.onchange = () => setModalTotalQtyFromInput(product);
  }
}

function changeModalTotalQtyDirect(product, delta) {
  const rules = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  const minQty = rules.productMinQty || product.minQty;
  const newTotal = modalTotalQty + delta;
  if (newTotal < minQty) return;
  modalTotalQty = newTotal;
  document.getElementById('modal-qty-val').value = modalTotalQty;
  renderModalTiers(product, modalTotalQty);
  updateModalActivePrice(product);
  updateAddModalButton(product);
}

function setModalTotalQtyFromInput(product) {
  const qtyVal = document.getElementById('modal-qty-val');
  const rules  = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  const minQty = rules.productMinQty || product.minQty;

  let value = parseInt(qtyVal.value, 10);
  if (isNaN(value) || value < minQty) value = minQty;

  modalTotalQty = value;
  qtyVal.value  = modalTotalQty;
  renderModalTiers(product, modalTotalQty);
  updateModalActivePrice(product);
  updateAddModalButton(product);
}

function decrementLastFragrance(product) {
  const keys = Object.keys(modalFragrances);
  if (keys.length === 0) return;
  const last = keys[keys.length - 1];
  changeFragranceQty(last, -1);
}

function renderModalTiers(product, qty) {
  const container  = document.getElementById('modal-tiers');
  const activeTier = getActiveTier(product, qty);
  container.innerHTML = product.priceTiers.map(t => `
    <div class="modal-tier ${t === activeTier ? 'active' : ''}">
      <span>${t.label}</span>
      <span class="modal-tier-price">${formatCurrency(t.price)}</span>
    </div>
  `).join('');
}

function updateModalActivePrice(product) {
  const qty  = modalTotalQty;
  const el   = document.getElementById('modal-active-price');
  if (qty === 0) { el.textContent = ''; return; }
  const tier     = getActiveTier(product, qty);
  const subtotal = tier.price * qty;
  el.textContent = `${formatCurrency(tier.price)}/un · Subtotal: ${formatCurrency(subtotal)}`;
}

function renderModalFragrances(product) {
  if (!product.hasFragrance || !product.fragrances.length) return;
  const container = document.getElementById('modal-fragrances');
  const rules = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  const fragMin = rules.fragMinQty || product.fragranceMinQty;

  container.innerHTML = product.fragrances.map(f => {
    const qty      = modalFragrances[f] || 0;
    const canDec   = qty > 0;
    const belowMin = qty > 0 && qty < fragMin;

    return `
      <div class="fragrance-row ${qty > 0 ? 'fragrance-row--active' : ''}">
        <span class="fragrance-name">${f}</span>
        <div class="fragrance-qty-ctrl">
          <button class="frag-qty-btn" onclick="changeFragranceQty('${f}', -1)"
                  ${!canDec ? 'disabled' : ''}>−</button>
          <input type="number" class="frag-qty-val frag-qty-input ${qty > 0 ? 'frag-qty-val--set' : ''}"
                 value="${qty}" min="0" inputmode="numeric"
                 onfocus="this.select()" onkeydown="if(event.key==='Enter') this.blur()"
                 onchange="setFragranceQtyFromInput('${f}', this.value)" />
          <button class="frag-qty-btn" onclick="changeFragranceQty('${f}', 1)">+</button>
        </div>
        ${belowMin ? `<span class="frag-warning">⚠ mín. ${fragMin} un.</span>` : ''}
      </div>
    `;
  }).join('');

  renderModalBalance(product);
}

function renderModalBalance(product) {
  let balanceEl = document.getElementById('modal-balance');
  if (!balanceEl) {
    balanceEl = document.createElement('div');
    balanceEl.id = 'modal-balance';
    document.getElementById('modal-fragrances').after(balanceEl);
  }

  const rules  = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  const minQty = rules.productMinQty || product.minQty;
  const total   = modalTotalQty;
  const missing = Math.max(0, minQty - total);

  if (total === 0) {
    balanceEl.className   = 'modal-balance modal-balance--pending';
    balanceEl.textContent = `Adicione fragrâncias para compor as ${minQty} unidades mínimas`;
  } else if (missing > 0) {
    balanceEl.className   = 'modal-balance modal-balance--pending';
    balanceEl.textContent = `Faltam ${missing} unidade${missing > 1 ? 's' : ''} para atingir o mínimo de ${minQty}`;
  } else {
    balanceEl.className   = 'modal-balance modal-balance--ok';
    balanceEl.textContent = `✓ ${total} unidade${total > 1 ? 's' : ''} selecionada${total > 1 ? 's' : ''}`;
  }
}

function changeFragranceQty(fragrance, delta) {
  const p = products.find(x => x.id === modalProductId);
  if (!p) return;

  const current = modalFragrances[fragrance] || 0;
  const newQty  = current + delta;
  if (newQty < 0) return;

  if (newQty === 0) {
    delete modalFragrances[fragrance];
  } else {
    modalFragrances[fragrance] = newQty;
  }

  modalTotalQty = modalAllocated();
  document.getElementById('modal-qty-val').value = modalTotalQty;

  renderModalTiers(p, modalTotalQty);
  renderModalFragrances(p);
  updateModalActivePrice(p);
  updateAddModalButton(p);
}

function setFragranceQtyFromInput(fragrance, value) {
  const p = products.find(x => x.id === modalProductId);
  if (!p) return;

  let newQty = parseInt(value, 10);
  if (isNaN(newQty) || newQty < 0) newQty = 0;

  if (newQty === 0) {
    delete modalFragrances[fragrance];
  } else {
    modalFragrances[fragrance] = newQty;
  }

  modalTotalQty = modalAllocated();
  document.getElementById('modal-qty-val').value = modalTotalQty;

  renderModalTiers(p, modalTotalQty);
  renderModalFragrances(p);
  updateModalActivePrice(p);
  updateAddModalButton(p);
}

function validateFragrances(product) {
  const rules    = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  const minQty   = rules.productMinQty  || product.minQty;
  const fragMin  = rules.fragMinQty     || product.fragranceMinQty;

  if (!product.hasFragrance || !product.fragrances.length) {
    if (modalTotalQty < minQty) {
      return { valid: false, reason: `Mínimo de ${minQty} unidades` };
    }
    return { valid: true };
  }

  const entries = Object.entries(modalFragrances);

  if (entries.length === 0) {
    return { valid: false, reason: 'Adicione ao menos uma fragrância' };
  }

  for (const [name, qty] of entries) {
    if (qty < fragMin) {
      return {
        valid: false,
        reason: `"${name}": mín. ${fragMin} un. (tem ${qty})`
      };
    }
  }

  if (modalTotalQty < minQty) {
    const diff = minQty - modalTotalQty;
    return {
      valid: false,
      reason: `Faltam ${diff} un. para o mínimo de ${minQty}`
    };
  }

  return { valid: true };
}

function updateAddModalButton(product) {
  const btn = document.getElementById('btn-add-modal');
  if (!product) return;

  const { valid, reason } = validateFragrances(product);

  btn.disabled = !valid;

  if (valid) {
    const typeName = PURCHASE_RULES[currentPurchaseType]?.label || '';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Adicionar ${modalTotalQty} un. — ${typeName}
    `;
    const hasFragrance = product.hasFragrance && product.fragrances.length > 0;
    btn.onclick = hasFragrance
      ? () => addToCartMultiFragrance(modalProductId, modalTotalQty, { ...modalFragrances }, currentPurchaseType)
      : () => addToCart(modalProductId, modalTotalQty, null, currentPurchaseType);
  } else {
    btn.textContent = reason;
  }
}

function addToCartMultiFragrance(productId, totalQty, fragranceMap, purchaseType) {
  Object.entries(fragranceMap).forEach(([fragrance, qty]) => {
    addToCart(productId, qty, fragrance, purchaseType);
  });
}
