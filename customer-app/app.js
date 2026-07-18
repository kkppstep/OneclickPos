// ============================================================
// Config
// ============================================================
const CLOUD_API_BASE = 'https://api.yourpos.com';
const CLOUD_TIMEOUT_MS = 4000;
const LOCAL_HUB_TIMEOUT_MS = 4000;
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23EAF7EE"/></svg>'
);

// ============================================================
// State
// ============================================================
const state = {
  storeId: null,
  table: '',
  menu: [],
  localHubUrl: null,
  kbzpayQrUrl: null,
  cart: [], // { lineId, product_id, name, price, qty, notes }
  activeProduct: null,
};

let productModal, checkoutModal;

// ============================================================
// Networking helpers
// ============================================================
async function fetchWithTimeout(url, options = {}, timeoutMs = CLOUD_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return { storeId: params.get('store'), table: params.get('table') || '' };
}

// ============================================================
// Load menu
// ============================================================
async function loadMenu() {
  const { storeId, table } = getParams();
  state.storeId = storeId;
  state.table = table;
  document.getElementById('tableBadge').textContent = table ? `Table ${table}` : '';

  if (!storeId) {
    showMessage('No store found. Please rescan the table QR code.', true);
    return;
  }

  try {
    const data = await fetchWithTimeout(`${CLOUD_API_BASE}/public/stores/${storeId}/menu`);
    state.menu = data.categories || [];
    state.localHubUrl = data.local_hub_url || null;
    state.kbzpayQrUrl = data.kbzpay_qr_url || null;
    document.getElementById('loadingMessage').hidden = true;
    renderCategoryNav();
    renderMenu();
    observeSections();
  } catch (err) {
    showMessage("Can't load the menu right now. Check you're connected to the wifi and try again.", true);
  }
}

function showMessage(text, isError) {
  const el = document.getElementById('loadingMessage');
  el.hidden = false;
  el.textContent = text;
  el.className = 'state-message' + (isError ? ' error' : '');
}

// ============================================================
// Rendering — category nav + menu sections
// ============================================================
function renderCategoryNav() {
  const nav = document.getElementById('categoryNav');
  nav.innerHTML = state.menu.map((cat, i) => `
    <button class="category-pill${i === 0 ? ' active' : ''}" data-target="cat-${cat.id}">${escapeHtml(cat.name)}</button>
  `).join('');

  nav.querySelectorAll('.category-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.getElementById(pill.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderMenu() {
  const menuEl = document.getElementById('menu');
  menuEl.innerHTML = state.menu.map((cat) => `
    <section class="category-section" id="cat-${cat.id}">
      <div class="category-title">${escapeHtml(cat.name)}</div>
      ${cat.products.map((p) => productCardHtml(p)).join('')}
    </section>
  `).join('');

  menuEl.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => openProductModal(card.dataset.productId));
  });
}

function productCardHtml(product) {
  return `
    <div class="card product-card" data-product-id="${product.id}">
      <img src="${product.image_url || PLACEHOLDER_IMAGE}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="card-body">
        <div class="card-title">${escapeHtml(product.name)}</div>
        ${product.description ? `<div class="card-text">${escapeHtml(product.description)}</div>` : ''}
        <div class="price-row">
          <span class="price">${formatMoney(product.price)}</span>
          <button class="add-btn" aria-label="Add ${escapeHtml(product.name)}">+</button>
        </div>
      </div>
    </div>
  `;
}

// Highlights the category pill matching whichever section is in view —
// this is the "easy scroll between sub-menus" behavior.
function observeSections() {
  const sections = document.querySelectorAll('.category-section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.category-pill').forEach((pill) => {
          pill.classList.toggle('active', pill.dataset.target === id);
        });
      }
    });
  }, { rootMargin: '-100px 0px -70% 0px' });
  sections.forEach((s) => observer.observe(s));
}

function findProduct(productId) {
  for (const cat of state.menu) {
    const found = cat.products.find((p) => p.id === productId);
    if (found) return found;
  }
  return null;
}

// ============================================================
// Product modal — quantity stepper + comment, then add to cart
// ============================================================
function openProductModal(productId) {
  const product = findProduct(productId);
  if (!product) return;

  let qty = 1;
  const content = document.getElementById('productModalContent');

  function render() {
    content.innerHTML = `
      <img class="pm-image" src="${product.image_url || PLACEHOLDER_IMAGE}" alt="${escapeHtml(product.name)}">
      <div class="pm-body">
        <div class="pm-title">${escapeHtml(product.name)}</div>
        ${product.description ? `<div class="pm-desc">${escapeHtml(product.description)}</div>` : ''}
        <div class="pm-price">${formatMoney(product.price)}</div>

        <div class="qty-stepper">
          <button class="qty-btn" id="qtyMinus" aria-label="Decrease quantity">−</button>
          <span class="qty-value" id="qtyValue">${qty}</span>
          <button class="qty-btn" id="qtyPlus" aria-label="Increase quantity">+</button>
        </div>

        <label class="comment-label" for="itemComment">Any requests? (e.g. more sweet, less spicy)</label>
        <textarea class="comment-input" id="itemComment" rows="2" placeholder="Optional"></textarea>

        <button class="btn-green" id="addToCartBtn">Add to order — ${formatMoney(product.price * qty)}</button>
      </div>
    `;

    document.getElementById('qtyMinus').addEventListener('click', () => { if (qty > 1) { qty--; render(); } });
    document.getElementById('qtyPlus').addEventListener('click', () => { qty++; render(); });
    document.getElementById('addToCartBtn').addEventListener('click', () => {
      const notes = document.getElementById('itemComment').value.trim();
      addToCart(product, qty, notes);
      productModal.hide();
    });
  }

  render();
  productModal.show();
}

// ============================================================
// Cart
// ============================================================
function addToCart(product, qty, notes) {
  state.cart.push({
    lineId: crypto.randomUUID(),
    product_id: product.id,
    name: product.name,
    price: product.price,
    qty,
    notes: notes || null,
  });
  updateCartBar();
}

function removeFromCart(lineId) {
  state.cart = state.cart.filter((line) => line.lineId !== lineId);
  updateCartBar();
}

function cartTotal() {
  return state.cart.reduce((sum, line) => sum + line.price * line.qty, 0);
}
function cartItemCount() {
  return state.cart.reduce((sum, line) => sum + line.qty, 0);
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cartItemCount();
  if (count === 0) { bar.hidden = true; return; }
  bar.hidden = false;
  document.getElementById('cartCount').textContent = `${count} item${count > 1 ? 's' : ''}`;
  document.getElementById('cartTotal').textContent = formatMoney(cartTotal());
}

document.getElementById('cartBar').addEventListener('click', () => openCheckout('cart'));

// ============================================================
// Checkout modal — cart review -> payment -> confirmation
// ============================================================
let selectedPayment = 'cash';

function openCheckout(step) {
  if (step === 'cart') renderCartStep();
  else if (step === 'payment') renderPaymentStep();
  checkoutModal.show();
}

function renderCartStep() {
  const content = document.getElementById('checkoutModalContent');
  content.innerHTML = `
    <div class="pm-body">
      <div class="pm-title">Your order — Table ${escapeHtml(state.table)}</div>
      <div id="lineItems" style="margin: 14px 0;"></div>
      <div class="summary-total"><span>Total</span><span>${formatMoney(cartTotal())}</span></div>
      <button class="btn-green" id="toPaymentBtn" style="margin-top:16px;">Choose payment</button>
      <button class="btn-green-outline" data-bs-dismiss="modal">Back to menu</button>
    </div>
  `;

  const lineItemsEl = content.querySelector('#lineItems');
  lineItemsEl.innerHTML = state.cart.map((line) => `
    <div class="line-item">
      <div>
        <div class="line-item-name">${line.qty} × ${escapeHtml(line.name)}</div>
        ${line.notes ? `<div class="line-item-note">${escapeHtml(line.notes)}</div>` : ''}
        <div class="line-item-sub">${formatMoney(line.price)} each</div>
      </div>
      <div style="text-align:right;">
        <div>${formatMoney(line.price * line.qty)}</div>
        <button class="btn btn-sm btn-link text-danger p-0 remove-line" data-line-id="${line.lineId}" style="font-size:0.75rem;">Remove</button>
      </div>
    </div>
  `).join('');

  content.querySelectorAll('.remove-line').forEach((btn) => {
    btn.addEventListener('click', () => { removeFromCart(btn.dataset.lineId); renderCartStep(); });
  });
  content.querySelector('#toPaymentBtn').addEventListener('click', renderPaymentStep);
}

function renderPaymentStep() {
  const content = document.getElementById('checkoutModalContent');
  const options = [
    { id: 'cash', label: 'Cash', hint: 'Pay at the counter' },
    ...(state.kbzpayQrUrl ? [{ id: 'kbzpay', label: 'KBZPay', hint: 'Scan the QR to pay now' }] : []),
  ];

  content.innerHTML = `
    <div class="pm-body">
      <div class="pm-title">How will you pay?</div>
      <div id="paymentOptions" style="margin: 14px 0;"></div>
      <div id="qrArea"></div>
      <button class="btn-green" id="placeOrderBtn">Place order</button>
      <button class="btn-green-outline" id="backToCartBtn">Back</button>
    </div>
  `;

  const optsEl = content.querySelector('#paymentOptions');
  optsEl.innerHTML = options.map((opt) => `
    <div class="payment-option${opt.id === selectedPayment ? ' selected' : ''}" data-id="${opt.id}">
      ${opt.label}<span class="hint">${opt.hint}</span>
    </div>
  `).join('');
  optsEl.querySelectorAll('.payment-option').forEach((el) => {
    el.addEventListener('click', () => { selectedPayment = el.dataset.id; renderPaymentStep(); });
  });

  if (selectedPayment === 'kbzpay' && state.kbzpayQrUrl) {
    content.querySelector('#qrArea').innerHTML = `
      <div class="qr-panel">
        <img src="${state.kbzpayQrUrl}" alt="KBZPay QR code">
        <div class="line-item-sub">Scan with your KBZPay app, then place your order. Staff will confirm payment at the counter.</div>
      </div>
    `;
  }

  content.querySelector('#placeOrderBtn').addEventListener('click', handlePlaceOrder);
  content.querySelector('#backToCartBtn').addEventListener('click', renderCartStep);
}

async function handlePlaceOrder() {
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  const result = await submitOrder(selectedPayment);

  if (result.ok) {
    showConfirmation();
  } else {
    btn.disabled = false;
    btn.textContent = 'Place order';
    const content = document.getElementById('checkoutModalContent');
    const errorEl = document.createElement('div');
    errorEl.className = 'state-message error';
    errorEl.style.padding = '8px 0';
    errorEl.textContent = "Couldn't reach the kitchen. Check you're connected to the wifi and try again.";
    content.querySelector('.pm-body').prepend(errorEl);
  }
}

function showConfirmation() {
  document.getElementById('checkoutModalContent').innerHTML = `
    <div class="confirmation">
      <div class="mark">✓</div>
      <div class="pm-title">Order placed</div>
      <div class="line-item-sub">Table ${escapeHtml(state.table)} — the kitchen has your order.</div>
      <button class="btn-green" id="doneBtn" style="margin-top:18px;">Done</button>
    </div>
  `;
  document.getElementById('doneBtn').addEventListener('click', () => {
    state.cart = [];
    updateCartBar();
    checkoutModal.hide();
  });
}

// ============================================================
// Order submission — cloud first, local hub fallback (LAN only)
// ============================================================
function buildOrderPayload(paymentMethod) {
  const items = state.cart.map((line) => ({
    product_id: line.product_id,
    product_name_snapshot: line.name,
    qty: line.qty,
    unit_price: line.price,
    line_total: line.price * line.qty,
    notes: line.notes,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);

  return {
    id: crypto.randomUUID(),
    store_id: state.storeId,
    table_number: state.table,
    channel: 'customer_qr',
    status: 'open',
    subtotal,
    tax_total: 0,
    discount_total: 0,
    total: subtotal,
    items,
    payments: [{ method: paymentMethod, amount: subtotal, status: paymentMethod === 'cash' ? 'confirmed' : 'pending' }],
  };
}

async function submitOrder(paymentMethod) {
  const order = buildOrderPayload(paymentMethod);

  try {
    await fetchWithTimeout(
      `${CLOUD_API_BASE}/public/stores/${state.storeId}/orders`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) },
      CLOUD_TIMEOUT_MS
    );
    return { ok: true, via: 'cloud' };
  } catch (cloudErr) {
    if (!state.localHubUrl) return { ok: false };
    try {
      await fetchWithTimeout(
        `${state.localHubUrl}/orders`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) },
        LOCAL_HUB_TIMEOUT_MS
      );
      return { ok: true, via: 'hub' };
    } catch (hubErr) {
      return { ok: false };
    }
  }
}

// ============================================================
// Utilities
// ============================================================
function formatMoney(amount) {
  return `${Number(amount).toLocaleString()} MMK`;
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
  loadMenu();
});
