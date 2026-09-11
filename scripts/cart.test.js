const fs = require('fs');
const vm = require('vm');

const productCode = fs.readFileSync('scripts/products.js', 'utf8');
const cartCode = fs.readFileSync('scripts/cart.js', 'utf8');
const config = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
const natal = JSON.parse(fs.readFileSync('data/natal-2026-products.json', 'utf8'))
  .map(product => ({ ...product, catalog: 'natal-2026' }));
const polar = JSON.parse(fs.readFileSync('data/expresso-polar-products.json', 'utf8'))
  .map(product => ({ ...product, catalog: 'natal-2026' }));

const tests = String.raw`
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const closeTo = (actual, expected, message) => {
  assert(Math.abs(actual - expected) < 0.001, message + ': esperado ' + expected + ', recebido ' + actual);
};
const clearCart = () => Object.keys(cart).forEach(key => delete cart[key]);
const put = (product, quantity, fragrance = null, purchaseType = 'inspire') => {
  const key = cartKey(product.id, fragrance, purchaseType, product.catalog);
  cart[key] = { product, quantity, fragrance, purchaseType };
};

// Todas as faixas devem estar em ordem e ativar exatamente no limite inicial.
products.forEach(product => {
  product.priceTiers.forEach((tier, index) => {
    assert(getActiveTier(product, tier.min) === tier, product.name + ': faixa incorreta em ' + tier.min);
    if (index > 0) {
      const previous = product.priceTiers[index - 1];
      assert(getActiveTier(product, tier.min - 1) === previous, product.name + ': transição incorreta antes de ' + tier.min);
    }
    if (tier.max !== null) assert(tier.max + 1 === product.priceTiers[index + 1]?.min, product.name + ': lacuna nas faixas');
  });
});

const luminy = products.find(product => product.id === 2002);
closeTo(getActiveTier(luminy, 9).price, 139.90, 'Luminy 9 un.');
closeTo(getActiveTier(luminy, 10).price, 78.20, 'Luminy 10 un.');
closeTo(getActiveTier(luminy, 29).price, 78.20, 'Luminy 29 un.');
closeTo(getActiveTier(luminy, 30).price, 75.10, 'Luminy 30 un.');
closeTo(getActiveTier(luminy, 99).price, 75.10, 'Luminy 99 un.');
closeTo(getActiveTier(luminy, 100).price, 69.50, 'Luminy 100 un.');

const tin = products.find(product => product.id === 2006);
[[5,13.50],[6,13.00],[14,13.00],[15,10.90],[49,10.90],[50,9.95],[99,9.95],[100,8.80],[299,8.80],[300,8.40]]
  .forEach(([qty, price]) => closeTo(getActiveTier(tin, qty).price, price, 'Mini Latinha ' + qty + ' un.'));

// A faixa considera a soma das fragrâncias do mesmo produto.
clearCart();
put(luminy, 5, 'Ginger Fresh');
put(luminy, 5, 'Pacific Breeze');
closeTo(getCartProductTier(luminy).price, 78.20, 'Faixa pela soma dos aromas');
closeTo(calcTotal(), 782, 'Subtotal Luminy com aromas somados');
assert(validateCart().valid, 'Pedido Inspire Natal deveria respeitar mínimos');

// White Label: 20 unidades por produto e 10 por aroma.
clearCart();
put(luminy, 9, 'Ginger Fresh', 'whitelabel');
put(luminy, 11, 'Pacific Breeze', 'whitelabel');
assert(!validateCart().valid, 'White Label deveria rejeitar aroma abaixo de 10');
clearCart();
put(luminy, 10, 'Ginger Fresh', 'whitelabel');
put(luminy, 10, 'Pacific Breeze', 'whitelabel');
assert(validateCart().valid, 'White Label deveria aceitar 20 un. e 10 por aroma');

// Expresso Polar mantém seus mínimos próprios dentro da página unificada.
const polarSpray = products.find(product => product.id === 1001);
clearCart();
put(polarSpray, 5, 'Ho Ho Ho');
put(polarSpray, 5, 'Jingle Bells');
assert(!validateCart().valid, 'Expresso Polar deveria rejeitar total inferior a 15');
put(polarSpray, 5, 'Noite Feliz');
assert(validateCart().valid, 'Expresso Polar deveria aceitar 15 un. e 5 por aroma');

// Mínimo financeiro: Inspire R$ 1.000; White Label ou misto R$ 2.000.
clearCart();
put(luminy, 10, 'Ginger Fresh', 'inspire');
assert(getCartOrderMinimum() === 1000, 'Mínimo Inspire incorreto');
put(luminy, 20, 'Pacific Breeze', 'whitelabel');
assert(getCartOrderMinimum() === 2000, 'Mínimo misto incorreto');
clearCart();
put(luminy, 20, 'Pacific Breeze', 'whitelabel');
assert(getCartOrderMinimum() === 2000, 'Mínimo White Label incorreto');

console.log('OK — ' + products.length + ' produtos auditados');
console.log('OK — limites de todas as faixas');
console.log('OK — soma de aromas para definição de preço');
console.log('OK — mínimos Inspire, Expresso Polar e White Label');
console.log('OK — mínimos financeiros de R$ 1.000 e R$ 2.000');
`;

const context = {
  console,
  products: [...natal, ...polar],
  PURCHASE_RULES: config.purchaseRules,
  currentPurchaseType: 'inspire',
  modalPurchaseType: null,
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {},
  window: {},
  confirm: () => true,
  ORDER_MIN_VALUE: 0,
  CATALOG_ID: 'natal-2026'
};

vm.runInNewContext(`${productCode}\n${cartCode}\n${tests}`, context, { filename: 'cart-runtime.test.js' });
