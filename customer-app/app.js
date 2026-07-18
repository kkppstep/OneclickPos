// ============================================================
// Config
// ============================================================
// Same platform URL for every store — the store is selected by the
// ?store= param from the table's QR code. Replace with your deployed
// cloud API origin.
const CLOUD_API_BASE = 'https://api.yourpos.com';
const CLOUD_TIMEOUT_MS = 4000;
const LOCAL_HUB_TIMEOUT_MS = 4000;

// ============================================================
// State
// ============================================================
const state = {
  storeId: null,
  table: '',
  menu: [],          // [{ id, name, categories: [{id,name, products:[...]}] }]
  localHubUrl: null,  // e.g. "http://192.168.1.50:4000" — only reachable on store wifi
  kbzpayQrUrl: null,
  cart: new Map(),    // product_id -> { product_id, name, price, qty }
};

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
// Depends on a public, unauthenticated (or lightly-keyed) endpoint:
//   GET /public/stores/:storeId/menu
// expected to return { categories, local_hub_url, kbzpay_qr_url }.
// Not yet built on the cloud API — see cloud-api project.
// ============================================================
async function loadMenu() {
  const { storeId, table } = getParams();
  state.storeId = storeId;
  state.table = table;

  document.getElementById('tableBadge').textContent = table ? `Table ${table}` : '';

  if (!storeId) {
    renderMessage('No store found. Please rescan the table QR code.', true);
    return;
  }

  try {
    const data = await fetchWithTimeout(`${CLOUD_API_BASE}/public/stores/${storeId}/menu`);
    state.menu = data.categories || [];
    state.localHubUrl = data.local_hub_url || null;
    state.kbzpayQrUrl = data.kbzpay_qr_url || null;
    renderMenu();
  } catch (err) {
    // Unlike order submission, there's no local fallback for loading
    // the menu itself — we don't know the hub's LAN address until the
    // cloud tells us. If the cloud is unreachable, the customer needs
    // to be on wifi that has internet, or try again shortly.
    renderMessage("Can't load the menu right now. Check you're connected to the wifi and try again.", true);
  }
}

// ============================================================
// Rendering — menu
// ============================================================
function renderMessage(text, isError = false) {
  const main = document.getElementById('app');
  main.innerHTML = `<div class="state-message${isError ? ' error' : ''}">${escapeHtml(text)}</div>`;
}

function renderMenu() {
  const main = document.getElementById('app');
  main.innerHTML = '';

  if (state.menu.length === 0) {
    renderMessage('No items available right now.');
    return;
  }

  for (const category of state.menu) {
    const block = document.createElement('div');
    block.className = 'category-block';
    block.innerHTML = `
      <h2 class="category-title">${escapeHtml(category.name)}</h2>
      <hr class="category-divider">
    `;

    for (const product of category.products) {
      block.appendChild(renderProductCard(product));
    }
    main.appendChild(block);
  }

  updateCartBar();
}

function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-info">
      <div class="product-name">${escapeHtml(product.name)}</div>
      <div class="product-price">${formatMoney(product.price)}</div>
    </div>
    <div class="qty-control" data-product-id="${product.id}">
      <button class="qty-btn minus" aria-label="Remove one">−</button>
      <span class="qty-value">0</span>
      <button class="qty-btn add" aria-label="Add one">+</button>
    </div>
  `;

  const qtyEl = card.querySelector('.qty-value');
  card.querySelector('.add').addEventListener('click', () => {
    changeCartQty(product, 1);
    qtyEl.textContent = state.cart.get(product.id)?.qty || 0;
  });
  card.querySelector('.minus').addEventListener('click', () => {
    changeCartQty(product, -1);
    qtyEl.textContent = state.cart.get(product.id)?.qty || 0;
  });

  return card;
}

// ============================================================
// Cart
// ============================================================
function changeCartQty(product, delta) {
  const existing = state.cart.get(product.id);
  const nextQty = (existing?.qty || 0) + delta;

  if (nextQty <= 0) {
    state.cart.delete(product.id);
  } else {
    state.cart.set(product.id, { product_id: product.id, name: product.name, price: product.price, qty: nextQty });
  }
  updateCartBar();
}

function cartTotal() {
  let total = 0;
  for (const item of state.cart.values()) total += item.price * item.qty;
  return total;
}

function cartItemCount() {
  let count = 0;
  for (const item of state.cart.values()) count += item.qty;
  return count;
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cartItemCount();
  if (count === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  document.getElementById('cartCount').textContent = `${count} item${count > 1 ? 's' : ''}`;
  document.getElementById('cartTotal').textContent = formatMoney(cartTotal());
}

document.getElementById('cartBar').addEventListener('click', openCartDrawer);
document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);

// ============================================================
// Drawer: cart review -> payment method -> confirmation
// ============================================================
function openDrawer() {
  document.getElementById('drawerBackdrop').hidden = false;
  document.getElementById('drawer').hidden = false;
}
function closeDrawer() {
  document.getElementById('drawerBackdrop').hidden = true;
  document.getElementById('drawer').hidden = true;
}

function openCartDrawer() {
  const content = document.getElementById('drawerContent');
  const items = Array.from(state.cart.values());

  content.innerHTML = `
    <h2>Your order — Table ${escapeHtml(state.table)}</h2>
    <div id="lineItems"></div>
    <div class="summary-row total">
      <span>Total</span><span>${formatMoney(cartTotal())}</span>
    </div>
    <button class="btn-primary" id="toPaymentBtn">Choose payment</button>
    <button class="btn-secondary" id="backToMenuBtn">Back to menu</button>
  `;

  const lineItemsEl = content.querySelector('#lineItems');
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'line-item';
    row.innerHTML = `
      <div>
        <div class="line-item-name">${escapeHtml(item.name)}</div>
        <div class="line-item-sub">${item.qty} × ${formatMoney(item.price)}</div>
      </div>
      <div>${formatMoney(item.price * item.qty)}</div>
    `;
    lineItemsEl.appendChild(row);
  }

  content.querySelector('#toPaymentBtn').addEventListener('click', openPaymentDrawer);
  content.querySelector('#backToMenuBtn').addEventListener('click', closeDrawer);
  openDrawer();
}

let selectedPayment = 'cash';

function openPaymentDrawer() {
  const content = document.getElementById('drawerContent');
  content.innerHTML = `
    <h2>How will you pay?</h2>
    <div id="paymentOptions"></div>
    <div id="qrArea"></div>
    <button class="btn-primary" id="placeOrderBtn">Place order</button>
    <button class="btn-secondary" id="backToCartBtn">Back</button>
  `;

  const options = [
    { id: 'cash', label: 'Cash', hint: 'Pay at the counter' },
    ...(state.kbzpayQrUrl ? [{ id: 'kbzpay', label: 'KBZPay', hint: 'Scan the QR to pay now' }] : []),
  ];

  const optionsEl = content.querySelector('#paymentOptions');
  for (const opt of options) {
    const el = document.createElement('div');
    el.className = 'payment-option' + (opt.id === selectedPayment ? ' selected' : '');
    el.innerHTML = `<div>${opt.label}<span class="hint">${opt.hint}</span></div>`;
    el.addEventListener('click', () => {
      selectedPayment = opt.id;
      openPaymentDrawer(); // re-render with new selection
    });
    optionsEl.appendChild(el);
  }

  const qrArea = content.querySelector('#qrArea');
  if (selectedPayment === 'kbzpay' && state.kbzpayQrUrl) {
    qrArea.innerHTML = `
      <div class="qr-panel">
        <img src="${state.kbzpayQrUrl}" alt="KBZPay QR code">
        <div class="qr-note">Scan with your KBZPay app, then place your order. Staff will confirm payment at the counter.</div>
      </div>
    `;
  }

  content.querySelector('#placeOrderBtn').addEventListener('click', handlePlaceOrder);
  content.querySelector('#backToCartBtn').addEventListener('click', openCartDrawer);
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
    const content = document.getElementById('drawerContent');
    const errorEl = document.createElement('div');
    errorEl.className = 'state-message error';
    errorEl.textContent = "Couldn't reach the kitchen. Please check you're connected to the wifi and try again.";
    content.prepend(errorEl);
  }
}

function showConfirmation() {
  const content = document.getElementById('drawerContent');
  content.innerHTML = `
    <div class="confirmation">
      <div class="mark">✓</div>
      <h2>Order placed</h2>
      <p>Table ${escapeHtml(state.table)} — the kitchen has your order.</p>
      <button class="btn-primary" id="doneBtn">Done</button>
    </div>
  `;
  content.querySelector('#doneBtn').addEventListener('click', () => {
    state.cart.clear();
    updateCartBar();
    closeDrawer();
  });
}

// ============================================================
// Order submission — tries the cloud first (works over store wifi
// with internet, or the customer's own mobile data), falls back to
// the local hub over LAN only if the cloud call fails. The hub
// fallback only succeeds if this phone is on the store's own wifi.
// ============================================================
function buildOrderPayload(paymentMethod) {
  const items = Array.from(state.cart.values()).map((item) => ({
    product_id: item.product_id,
    product_name_snapshot: item.name,
    qty: item.qty,
    unit_price: item.price,
    line_total: item.price * item.qty,
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
    payments: [{
      method: paymentMethod,
      amount: subtotal,
      status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
    }],
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
loadMenu();
