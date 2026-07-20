// ============================================================
// Theme 2: Premium Dark UI - Same backend as customer-app
// ============================================================

const CLOUD_API_BASE = (window.POS_CONFIG && window.POS_CONFIG.CLOUD_API_BASE) || '';
const CLOUD_TIMEOUT_MS = 4000;
const LOCAL_HUB_TIMEOUT_MS = 4000;
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23220055"/><text x="200" y="150" text-anchor="middle" font-size="40" fill="%237c3aed" font-family="serif">⚜</text></svg>'
);

const state = {
  storeId: null,
  table: '',
  menu: [],
  localHubUrl: null,
  kbzpayQrUrl: null,
  cart: [],
  currentFilter: 'all',
};

let cartDrawerOpen = false;

// ============================================================
// Networking
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
// Load Menu from Cloud API
// ============================================================
async function loadMenu() {
  const { storeId, table } = getParams();
  state.storeId = storeId;
  state.table = table;
  
  if (table) {
    document.getElementById('table-badge').textContent = `Table ${table}`;
  }

  if (!storeId) {
    showError('No store found. Please rescan the table QR code.');
    return;
  }

  try {
    const data = await fetchWithTimeout(`${CLOUD_API_BASE}/public/stores/${storeId}/menu`);
    state.menu = data.categories || [];
    state.localHubUrl = data.local_hub_url || null;
    state.kbzpayQrUrl = data.kbzpay_qr_url || null;
    renderMenu();
  } catch (err) {
    showError("Can't load menu. Check WiFi connection.");
  }
}

function showError(msg) {
  alert(msg);
}

// ============================================================
// Rendering
// ============================================================
function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  const filtered = state.menu.flatMap(cat => 
    state.currentFilter === 'all' 
      ? cat.products 
      : cat.products.filter(p => p.category === state.currentFilter || state.currentFilter === 'all')
  );

  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card float-in';
    card.style.cssText = `
      background: rgba(18, 14, 22, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      height: 180px;
      backdrop-filter: blur(20px);
    `;
    
    const soldOut = product.is_available === false;
    const soldOutBadge = soldOut ? '<div style="position: absolute; top: 8px; left: 8px; background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 7px; font-weight: bold; z-index: 10;">Sold Out</div>' : '';

    card.innerHTML = `
      <div style="position: relative; height: 100%; display: flex; flex-direction: column;">
        ${soldOutBadge}
        <img src="${product.image_url || PLACEHOLDER_IMAGE}" alt="${product.name}" style="width: 100%; height: 100px; object-fit: cover; opacity: ${soldOut ? 0.5 : 1};">
        <div style="padding: 8px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 style="margin: 0; font-size: 10px; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</h3>
            <p style="margin: 2px 0 0 0; font-size: 8px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.description || 'Gourmet selection'}</p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: bold; background: linear-gradient(135deg, #fce0ad, #dfb26c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${product.price.toLocaleString()} MMK</span>
            <button onclick="event.stopPropagation(); addToCart(${state.menu.flat().indexOf(product)})" style="background: rgba(124, 58, 237, 0.5); border: 1px solid rgba(139, 92, 246, 0.3); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; transition: all 0.3s;" ${soldOut ? 'disabled opacity-50' : ''}>
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function filterCategory(cat) {
  state.currentFilter = cat;
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.style.background = 'rgba(255,255,255,0.03)';
    tab.style.border = '1px solid rgba(255,255,255,0.06)';
    tab.style.color = '#d1d5db';
  });
  event.target.style.background = 'linear-gradient(135deg, #7c3aed, #4f46e5)';
  event.target.style.border = 'none';
  event.target.style.color = 'white';
  renderMenu();
}

// ============================================================
// Cart Management
// ============================================================
function addToCart(productIndex) {
  const allProducts = state.menu.flatMap(cat => cat.products);
  const product = allProducts[productIndex];
  
  if (!product || product.is_available === false) return;

  const found = state.cart.find(i => i.product_id === product.id);
  if (found) {
    found.qty++;
  } else {
    state.cart.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      notes: ''
    });
  }
  triggerHaptic();
  updateCartUI();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.product_id !== productId);
  triggerHaptic();
  updateCartUI();
}

function updateCartQty(productId, delta) {
  const item = state.cart.find(i => i.product_id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
  else updateCartUI();
}

function updateCartUI() {
  const cartItems = document.getElementById('cart-items');
  const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const fee = subtotal > 0 ? 500 : 0;
  const total = subtotal + fee;

  // Update counter badge
  const counter = document.getElementById('cart-count');
  if (count > 0) {
    counter.style.display = 'flex';
    counter.textContent = count;
  } else {
    counter.style.display = 'none';
  }

  // Update items list
  if (state.cart.length === 0) {
    cartItems.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 12px;">Your cart is empty</div>';
  } else {
    cartItems.innerHTML = state.cart.map(item => `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <h4 style="margin: 0; font-size: 10px; font-weight: bold; color: white;">${item.name}</h4>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: #a78bfa;">${item.price.toLocaleString()} MMK × ${item.qty}</p>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button onclick="updateCartQty('${item.product_id}', -1)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; font-size: 10px;">−</button>
          <span style="font-size: 10px; color: white; min-width: 20px; text-align: center;">${item.qty}</span>
          <button onclick="updateCartQty('${item.product_id}', 1)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db; width: 20px; height: 20px; border-radius: 4px; cursor: pointer; font-size: 10px;">+</button>
        </div>
      </div>
    `).join('');
  }

  // Update totals
  document.getElementById('subtotal').textContent = `${subtotal.toLocaleString()} MMK`;
  document.getElementById('fee').textContent = `${fee.toLocaleString()} MMK`;
  document.getElementById('total').textContent = `${total.toLocaleString()} MMK`;
}

function toggleCartDrawer() {
  cartDrawerOpen = !cartDrawerOpen;
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  
  if (cartDrawerOpen) {
    drawer.style.transform = 'translateX(0)';
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
    updateCartUI();
  } else {
    drawer.style.transform = 'translateX(100%)';
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
  }
  triggerHaptic();
}

// ============================================================
// Order Submission - Cloud first, hub fallback
// ============================================================
function buildOrderPayload() {
  const items = state.cart.map(line => ({
    product_id: line.product_id,
    product_name_snapshot: line.name,
    qty: line.qty,
    unit_price: line.price,
    line_total: line.price * line.qty,
    notes: line.notes
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
    total: subtotal + 500,
    items,
    payments: [{ method: 'cash', amount: subtotal + 500, status: 'confirmed' }]
  };
}

async function submitOrder() {
  if (state.cart.length === 0) {
    alert('Please add items to your order');
    return;
  }

  const order = buildOrderPayload();
  
  try {
    // Try cloud first
    await fetchWithTimeout(
      `${CLOUD_API_BASE}/public/stores/${state.storeId}/orders`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) },
      CLOUD_TIMEOUT_MS
    );
    showSuccess('Order submitted to kitchen!');
  } catch (cloudErr) {
    // Try local hub
    if (state.localHubUrl) {
      try {
        await fetchWithTimeout(
          `${state.localHubUrl}/orders`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) },
          LOCAL_HUB_TIMEOUT_MS
        );
        showSuccess('Order saved locally!');
      } catch (hubErr) {
        showError('Could not submit order. Check connection.');
        return;
      }
    } else {
      showError('Could not reach kitchen. Check WiFi.');
      return;
    }
  }

  state.cart = [];
  updateCartUI();
  toggleCartDrawer();
}

function showSuccess(msg) {
  alert(msg);
}

// ============================================================
// UI Helpers
// ============================================================
function triggerHaptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch (e) {}
}

function changeTableID() {
  const newTable = prompt('Enter table number:', state.table || '1');
  if (newTable !== null) {
    state.table = newTable;
    document.getElementById('table-badge').textContent = `Table ${newTable}`;
  }
}

// ============================================================
// Initialize
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
});