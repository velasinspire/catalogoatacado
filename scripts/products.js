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

function isWeightProduct(product) {
  return product.measurement === 'weight';
}

function getQuantityStep(product) {
  return product.quantityStep || 1;
}

function formatProductQty(product, qty) {
  if (!isWeightProduct(product)) return `${qty} un.`;
  if (qty < 1) return `${Math.round(qty * 1000)} g`;
  return `${qty.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}

function getEffectiveMinimums(product) {
  const rules = PURCHASE_RULES[currentPurchaseType] || PURCHASE_RULES.inspire;
  return {
    minQty: isWeightProduct(product) ? product.minQty : (rules.productMinQty || product.minQty),
    fragMin: isWeightProduct(product) ? product.fragranceMinQty : (rules.fragMinQty || product.fragranceMinQty)
  };
}

function getOptionLabels(product) {
  return {
    singular: product.optionLabel || 'Fragrância',
    plural: product.optionLabelPlural || 'Fragrâncias'
  };
}

function getProductImages(product) {
  return Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image];
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  if (!products.length) {
    grid.innerHTML = `
      <div class="catalog-empty-state">
        <span aria-hidden="true">✦</span>
        <h3>Produtos em preparação</h3>
        <p>Os itens da coleção Expresso Polar serão exibidos aqui com fotos, preços e opções para o seu pedido.</p>
      </div>`;
    return;
  }

  products.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 0.05}s`;

    const productImages = getProductImages(p);
    const imgSrc = IMAGE_BASE_PATH + productImages[0];
    const detailHTML = p.detail.split('·').map(item => item.trim()).filter(Boolean)
      .map(item => `<span>${item}</span>`).join('');
    const tiersHTML = p.priceTiers.map((t, tierIndex) => `
      <div class="card-tier${tierIndex === p.priceTiers.length - 1 && p.priceTiers.length > 1 ? ' card-tier--best' : ''}">
        <span>${t.label}</span>
        <span class="card-tier-price">${formatCurrency(t.price)}</span>
      </div>
    `).join('');

    const optionLabels = getOptionLabels(p);
    const fragranceNote = p.hasFragrance && p.fragrances.length > 0
      ? `<span class="card-minqty"><span class="card-note-icon card-note-icon--leaf" aria-hidden="true"></span><span><strong>${optionLabels.plural}: ${p.fragrances.length} opções</strong><small>Mín. ${formatProductQty(p, p.fragranceMinQty)} por opção</small></span></span>`
      : '';

    card.innerHTML = `
      <div class="card-media">
        <div class="card-image-wrap" role="button" tabindex="0" aria-label="Ver detalhes de ${p.name}"
             onclick="openProductDetails(${p.id})" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProductDetails(${p.id}); }">
          <img src="${imgSrc}" alt="${p.name}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80'" />
          ${p.tag ? `<span class="card-badge">${p.tag}</span>` : ''}
        </div>
        <div class="card-notes">
          <span class="card-minqty"><span class="card-note-icon card-note-icon--box" aria-hidden="true"></span><span><strong>Mínimo: ${formatProductQty(p, p.minQty)}</strong><small>Por produto</small></span></span>
          ${fragranceNote}
        </div>
      </div>
      <div class="card-body">
        <div class="card-info">
          <h3 class="card-name">${p.name}</h3>
          <div class="card-detail">${detailHTML}</div>
          <div class="card-info-actions">
            <button class="btn-card-details" type="button" onclick="openProductDetails(${p.id})">Ver detalhes do produto</button>
            ${productImages.length > 1 ? `<span class="card-photo-count">${productImages.length} fotos disponíveis</span>` : ''}
          </div>
        </div>
        <div class="card-commerce">
          <span class="card-section-label">Preço por quantidade</span>
          <div class="card-tiers">${tiersHTML}</div>
          <button class="btn-open-modal" onclick="openProductModal(${p.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar ao pedido
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ================================================
// MODAL EDITORIAL — DETALHES DO PRODUTO
// ================================================
function openProductDetails(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  const content = productDetails[String(productId)] || {};
  const images = getProductImages(product);
  const description = Array.isArray(content.description) && content.description.length
    ? content.description
    : [product.detail];

  document.getElementById('details-modal-tag').textContent = product.tag || 'Inspire';
  document.getElementById('details-modal-name').textContent = content.title || product.name;
  document.getElementById('details-modal-summary').innerHTML = description
    .map(paragraph => `<p>${paragraph}</p>`).join('');
  document.getElementById('details-modal-technical').textContent = product.detail;

  const benefits = document.getElementById('details-modal-benefits');
  benefits.innerHTML = content.benefits?.length
    ? `<h4>${content.benefitsTitle || 'Benefícios'}</h4><ul>${content.benefits.map(item => `<li>${item}</li>`).join('')}</ul>`
    : '';
  benefits.hidden = !content.benefits?.length;

  const usage = document.getElementById('details-modal-usage');
  const usageContent = Array.isArray(content.usage)
    ? content.usage.map(item => `<p class="details-usage-item"><strong>${item.label}</strong><span>${item.text}</span></p>`).join('')
    : `<p>${content.usage || ''}</p>`;
  usage.innerHTML = content.usage ? `<h4>Modo de uso</h4>${usageContent}` : '';
  usage.hidden = !content.usage;

  const care = document.getElementById('details-modal-care');
  care.innerHTML = content.care?.length
    ? `<h4>Cuidados</h4><ul>${content.care.map(item => `<li>${item}</li>`).join('')}</ul>`
    : '';
  care.hidden = !content.care?.length;

  const tip = document.getElementById('details-modal-tip');
  tip.innerHTML = content.tip ? `<strong>Dica Inspire</strong><span>${content.tip}</span>` : '';
  tip.hidden = !content.tip;

  const mainImage = document.getElementById('details-modal-main-image');
  mainImage.src = IMAGE_BASE_PATH + images[0];
  mainImage.alt = product.name;
  document.getElementById('details-modal-thumbs').innerHTML = images.length > 1
    ? images.map((image, index) => `
        <button type="button" class="details-thumb${index === 0 ? ' active' : ''}"
                onclick="selectDetailsImage(this, '${IMAGE_BASE_PATH + image}', '${product.name}')">
          <img src="${IMAGE_BASE_PATH + image}" alt="${product.name} — foto ${index + 1}">
        </button>`).join('')
    : '';

  const addButton = document.getElementById('details-modal-add');
  addButton.onclick = () => {
    closeProductDetails();
    openProductModal(product.id);
  };

  document.getElementById('details-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function selectDetailsImage(button, src, alt) {
  document.getElementById('details-modal-main-image').src = src;
  document.getElementById('details-modal-main-image').alt = alt;
  document.querySelectorAll('.details-thumb').forEach(thumb => thumb.classList.remove('active'));
  button.classList.add('active');
}

function closeProductDetails(event) {
  if (event && event.target !== document.getElementById('details-modal-overlay')) return;
  document.getElementById('details-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ================================================
// ESTADO DO MODAL
// ================================================
let modalProductId  = null;
let modalTotalQty   = 0;
let modalFragrances = {};
let modalGalleryImages = [];
let modalGalleryIndex  = 0;
let modalGalleryTouchX = null;

function renderModalGallery(product) {
  modalGalleryImages = getProductImages(product).map(image => IMAGE_BASE_PATH + image);
  modalGalleryIndex = 0;

  const track = document.getElementById('modal-gallery-track');
  track.innerHTML = modalGalleryImages.map((src, index) => `
    <button class="modal-gallery-slide" type="button"
            onclick="openImgModal(this.querySelector('img').src, this.querySelector('img').alt)"
            aria-label="Ampliar foto ${index + 1} de ${modalGalleryImages.length}">
      <img src="${src}" alt="${product.name} — foto ${index + 1}" loading="${index === 0 ? 'eager' : 'lazy'}"
           onerror="this.src='https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80'" />
    </button>
  `).join('');

  document.getElementById('modal-gallery-dots').innerHTML = modalGalleryImages.map((_, index) => `
    <button class="modal-gallery-dot" type="button" onclick="goToModalGalleryImage(${index})"
            aria-label="Ir para foto ${index + 1}"></button>
  `).join('');

  const gallery = document.getElementById('modal-gallery');
  gallery.classList.toggle('modal-img-wrap--single', modalGalleryImages.length === 1);
  updateModalGallery();
}

function updateModalGallery() {
  document.getElementById('modal-gallery-track').style.transform =
    `translateX(-${modalGalleryIndex * 100}%)`;

  document.querySelectorAll('.modal-gallery-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index === modalGalleryIndex);
    dot.setAttribute('aria-current', index === modalGalleryIndex ? 'true' : 'false');
  });
}

function goToModalGalleryImage(index) {
  if (!modalGalleryImages.length) return;
  modalGalleryIndex = (index + modalGalleryImages.length) % modalGalleryImages.length;
  updateModalGallery();
}

function changeModalGalleryImage(direction) {
  goToModalGalleryImage(modalGalleryIndex + direction);
}

function handleModalGalleryTouchStart(event) {
  modalGalleryTouchX = event.changedTouches[0].clientX;
}

function handleModalGalleryTouchEnd(event) {
  if (modalGalleryTouchX === null || modalGalleryImages.length < 2) return;
  const distance = event.changedTouches[0].clientX - modalGalleryTouchX;
  modalGalleryTouchX = null;
  if (Math.abs(distance) >= 45) changeModalGalleryImage(distance < 0 ? 1 : -1);
}

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

  renderModalGallery(p);
  document.getElementById('modal-tag').textContent    = p.tag || '';
  document.getElementById('modal-name').textContent   = p.name;
  document.getElementById('modal-detail').textContent = p.detail;
  document.getElementById('modal-minqty').textContent =
    `📦 Mínimo de ${formatProductQty(p, p.minQty)} no total`;

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
    const { fragMin } = getEffectiveMinimums(p);
    const optionLabels = getOptionLabels(p);
    document.getElementById('modal-option-label').textContent = optionLabels.singular;
    document.getElementById('modal-fragrance-min-label').textContent =
      `· mín. ${formatProductQty(p, fragMin)} por ${optionLabels.singular.toLowerCase()}`;
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
  qtyVal.step = getQuantityStep(product);

  if (hasFragrance) {
    qtyDec.onclick = () => decrementLastFragrance(product);
    qtyInc.style.display = 'none';
    qtyDec.title = `Remove ${formatProductQty(product, getQuantityStep(product))} da última ${getOptionLabels(product).singular.toLowerCase()} adicionada`;
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
  const { minQty } = getEffectiveMinimums(product);
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

  let value = parseFloat(qtyVal.value);
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
  changeFragranceQty(last, -getQuantityStep(product));
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
  el.textContent = `${formatCurrency(tier.price)}/${isWeightProduct(product) ? 'kg' : 'un'} · Subtotal: ${formatCurrency(subtotal)}`;
}

function renderModalFragrances(product) {
  if (!product.hasFragrance || !product.fragrances.length) return;
  const container = document.getElementById('modal-fragrances');
  const { fragMin } = getEffectiveMinimums(product);
  const step = getQuantityStep(product);

  container.innerHTML = product.fragrances.map(f => {
    const qty      = modalFragrances[f] || 0;
    const canDec   = qty > 0;
    const belowMin = qty > 0 && qty < fragMin;

    return `
      <div class="fragrance-row ${qty > 0 ? 'fragrance-row--active' : ''}">
        <span class="fragrance-name">${f}</span>
        <div class="fragrance-qty-ctrl">
          <button class="frag-qty-btn" onclick="changeFragranceQty('${f}', -${step})"
                  ${!canDec ? 'disabled' : ''}>−</button>
          <input type="number" class="frag-qty-val frag-qty-input ${qty > 0 ? 'frag-qty-val--set' : ''}"
                 value="${qty}" min="0" step="${step}" inputmode="decimal"
                 onfocus="this.select()" onkeydown="if(event.key==='Enter') this.blur()"
                 onchange="setFragranceQtyFromInput('${f}', this.value)" />
          <button class="frag-qty-btn" onclick="changeFragranceQty('${f}', ${step})">+</button>
        </div>
        ${belowMin ? `<span class="frag-warning">⚠ mín. ${formatProductQty(product, fragMin)}</span>` : ''}
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

  const { minQty } = getEffectiveMinimums(product);
  const total   = modalTotalQty;
  const missing = Math.max(0, minQty - total);

  if (total === 0) {
    balanceEl.className   = 'modal-balance modal-balance--pending';
    balanceEl.textContent = `Adicione ${getOptionLabels(product).plural.toLowerCase()} para compor o mínimo de ${formatProductQty(product, minQty)}`;
  } else if (missing > 0) {
    balanceEl.className   = 'modal-balance modal-balance--pending';
    balanceEl.textContent = `Faltam ${formatProductQty(product, missing)} para atingir o mínimo de ${formatProductQty(product, minQty)}`;
  } else {
    balanceEl.className   = 'modal-balance modal-balance--ok';
    balanceEl.textContent = `✓ ${formatProductQty(product, total)} selecionado${isWeightProduct(product) ? 's' : total > 1 ? 's' : ''}`;
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

  let newQty = parseFloat(value);
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
  const { minQty, fragMin } = getEffectiveMinimums(product);

  if (!product.hasFragrance || !product.fragrances.length) {
    if (modalTotalQty < minQty) {
      return { valid: false, reason: `Mínimo de ${formatProductQty(product, minQty)}` };
    }
    return { valid: true };
  }

  const entries = Object.entries(modalFragrances);

  if (entries.length === 0) {
    return { valid: false, reason: `Adicione ao menos uma ${getOptionLabels(product).singular.toLowerCase()}` };
  }

  for (const [name, qty] of entries) {
    if (qty < fragMin) {
      return {
        valid: false,
        reason: `"${name}": mín. ${formatProductQty(product, fragMin)} (tem ${formatProductQty(product, qty)})`
      };
    }
  }

  if (modalTotalQty < minQty) {
    const diff = minQty - modalTotalQty;
    return {
      valid: false,
      reason: `Faltam ${formatProductQty(product, diff)} para o mínimo de ${formatProductQty(product, minQty)}`
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
      Adicionar ${formatProductQty(product, modalTotalQty)} — ${typeName}
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
