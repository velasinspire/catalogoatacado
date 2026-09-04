// ================================================
// whatsapp.js — Geração da mensagem e abertura do link
// ================================================

function openWhatsApp(event) {
  event.preventDefault();

  const entries = Object.values(cart);

  if (entries.length === 0) {
    const text = `Olá! Gostaria de saber mais sobre os produtos do ${CATALOG_NAME} da Velas Inspire 🌿`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
    return;
  }

  // 1. Regras concordadas?
  const agreed = document.getElementById('cart-rules-agreed');
  if (!agreed || !agreed.checked) {
    showToast('Confirme que leu as Regras de Compra antes de enviar.');
    openCart();
    // Piscar o checkbox
    const checkWrap = document.querySelector('.cart-rules-check');
    if (checkWrap) {
      checkWrap.classList.add('shake');
      setTimeout(() => checkWrap.classList.remove('shake'), 600);
    }
    return;
  }

  // 2. Validar quantidades
  const validation = validateCart();
  if (!validation.valid) {
    showCartValidationErrors(validation.errors);
    return;
  }

  // 3. Verificar valor mínimo
  const total = calcTotal();
  if (total < ORDER_MIN_VALUE) {
    showToast(`Pedido mínimo de ${formatCurrency(ORDER_MIN_VALUE)} não atingido.`);
    return;
  }

  // ——— MONTAR MENSAGEM ———
  const purchaseTypes = getCartPurchaseTypes();
  const typeName = purchaseTypes.size > 1
    ? 'Misto — Inspire + White Label'
    : PURCHASE_RULES[[...purchaseTypes][0] || 'inspire']?.label || 'Inspire';
  const catalogsInOrder = new Set(entries.map(({ product }) => product.catalog || 'main'));
  const orderCatalogName = catalogsInOrder.size > 1
    ? 'Linha regular + Expresso Polar'
    : CATALOG_NAME;

  const lines = [
    `*Olá! Gostaria de fazer um pedido — Velas Inspire* 🌿\n`,
    `*${orderCatalogName} · ${typeName}*\n`,
  ];

  ['inspire', 'whitelabel'].forEach(purchaseType => {
    const typeEntries = entries.filter(entry => (entry.purchaseType || 'inspire') === purchaseType);
    if (!typeEntries.length) return;

    lines.push(`\n*PRODUTOS ${PURCHASE_RULES[purchaseType].label.toUpperCase()}*`);
    typeEntries.forEach(({ product, quantity, fragrance }) => {
      const productTotal  = getCartProductTotal(product, purchaseType);
      const tier          = getActiveTier(product, productTotal);
      const subtotal      = tier.price * quantity;
      const fragranceNote = fragrance ? ` · ${product.optionLabel || 'Fragrância'}: ${fragrance}` : '';
      lines.push(
        `• *${product.name}* (${formatProductQty(product, quantity)}${fragranceNote}) — ${formatCurrency(subtotal)} _(${tier.label} · ${formatCurrency(tier.price)}/${isWeightProduct(product) ? 'kg' : 'un'})_`
      );
    });
  });

  lines.push(`\n*Total estimado: ${formatCurrency(total)}*`);
  lines.push(`*Tipo de compra: ${typeName}*`);
  lines.push('\nPode confirmar disponibilidade, prazo de produção e forma de pagamento?');

  const message = lines.join('\n');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

function showCartValidationErrors(errors) {
  openCart();

  let errorPanel = document.getElementById('cart-validation-errors');
  if (!errorPanel) {
    errorPanel = document.createElement('div');
    errorPanel.id = 'cart-validation-errors';
    errorPanel.className = 'cart-validation-errors';
    const footer = document.querySelector('.cart-footer');
    const btn    = document.getElementById('btn-whatsapp-cart');
    footer.insertBefore(errorPanel, btn);
  }

  errorPanel.innerHTML = `
    <div class="cve-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>Corrija os itens abaixo antes de enviar</span>
    </div>
    <ul class="cve-list">
      ${errors.map(e => `
        <li class="cve-product">
          <strong>${e.productName} · ${PURCHASE_RULES[e.purchaseType || 'inspire']?.label || 'Inspire'}</strong>
          <ul class="cve-msgs">
            ${e.messages.map(m => `<li>${m}</li>`).join('')}
          </ul>
          <button class="cve-fix-btn" onclick="navigateToProduct(${e.productId}, '${e.purchaseType || 'inspire'}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Corrigir produto
          </button>
        </li>
      `).join('')}
    </ul>
  `;

  document.getElementById('cart-items').scrollTop = 0;

  const checkInterval = setInterval(() => {
    if (validateCart().valid) {
      errorPanel.remove();
      clearInterval(checkInterval);
    }
  }, 500);
}
