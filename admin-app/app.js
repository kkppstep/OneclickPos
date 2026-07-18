// ============================================================
// State — persisted in localStorage so the admin key and current
// tenant/store selection survive a page refresh.
// ============================================================
const state = {
  apiBase: localStorage.getItem('apiBase') || '',
  adminKey: localStorage.getItem('adminKey') || '',
  customerAppUrl: localStorage.getItem('customerAppUrl') || '',
  tenantId: localStorage.getItem('tenantId') || '',
  storeId: localStorage.getItem('storeId') || '',
  tenants: [],
  stores: [],
  categories: [],
  products: [],
};

function persist(key, value) {
  state[key] = value;
  localStorage.setItem(key, value || '');
}

// ============================================================
// API helper — every call carries the admin bearer key. This is the
// placeholder ADMIN_API_KEY scheme from cloud-api/middleware/adminAuth.js,
// not real per-user login — see that file's comment before production.
// ============================================================
async function api(path, options = {}) {
  const res = await fetch(`${state.apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.adminKey}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

// ============================================================
// Navigation
// ============================================================
const TABS = {
  settings: renderSettings,
  tenants: renderTenants,
  stores: renderStores,
  categories: renderCategories,
  products: renderProducts,
  provisioning: renderProvisioning,
  qrcodes: renderQrCodes,
  orders: renderOrders,
};

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  updateContextBar();
  TABS[tab]();
}

document.querySelectorAll('.nav-item').forEach((el) => {
  el.addEventListener('click', () => switchTab(el.dataset.tab));
});

function updateContextBar() {
  const tenant = state.tenants.find((t) => t.id === state.tenantId);
  const store = state.stores.find((s) => s.id === state.storeId);
  document.getElementById('contextBar').innerHTML = `
    ${tenant ? `Tenant: ${escapeHtml(tenant.business_name)}` : 'No tenant selected'}<br>
    ${store ? `Store: ${escapeHtml(store.name)}` : 'No store selected'}
  `;
}

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ============================================================
// Settings — connection details, entered once
// ============================================================
function renderSettings() {
  setContent(`
    <h1>Connection</h1>
    <div class="subtitle">Points this dashboard at your deployed cloud API.</div>
    <div class="card">
      <div class="field">
        <label>Cloud API URL</label>
        <input id="apiBaseInput" value="${escapeHtml(state.apiBase)}" placeholder="https://your-api.vercel.app">
      </div>
      <div class="field">
        <label>Admin API key</label>
        <input id="adminKeyInput" type="password" value="${escapeHtml(state.adminKey)}" placeholder="matches ADMIN_API_KEY on the server">
      </div>
      <div class="field">
        <label>Customer ordering app URL (for QR codes)</label>
        <input id="customerAppUrlInput" value="${escapeHtml(state.customerAppUrl)}" placeholder="https://order.yourpos.com">
      </div>
      <button class="btn" id="saveSettingsBtn">Save & test connection</button>
      <div id="settingsResult" style="margin-top:14px;"></div>
    </div>
  `);

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    persist('apiBase', document.getElementById('apiBaseInput').value.replace(/\/$/, ''));
    persist('adminKey', document.getElementById('adminKeyInput').value);
    persist('customerAppUrl', document.getElementById('customerAppUrlInput').value.replace(/\/$/, ''));

    const resultEl = document.getElementById('settingsResult');
    try {
      const data = await api('/admin/tenants');
      state.tenants = data.tenants;
      resultEl.innerHTML = `<span style="color:#2C5A28">Connected — found ${data.tenants.length} tenant(s).</span>`;
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">Couldn't connect: ${escapeHtml(err.message)}</span>`;
    }
  });
}

// ============================================================
// Tenants
// ============================================================
async function renderTenants() {
  setContent(`
    <h1>Tenants</h1>
    <div class="subtitle">A tenant is one business — it may run several stores.</div>
    <div class="card">
      <div class="field"><label>Business name</label><input id="tenantName"></div>
      <div class="field"><label>Contact email</label><input id="tenantEmail"></div>
      <button class="btn" id="createTenantBtn">Create tenant</button>
    </div>
    <div id="tenantsTable">Loading…</div>
  `);

  document.getElementById('createTenantBtn').addEventListener('click', async () => {
    const business_name = document.getElementById('tenantName').value.trim();
    if (!business_name) return;
    await api('/admin/tenants', { method: 'POST', body: { business_name, contact_email: document.getElementById('tenantEmail').value.trim() } });
    renderTenants();
  });

  try {
    const data = await api('/admin/tenants');
    state.tenants = data.tenants;
    renderTenantsTable();
  } catch (err) {
    document.getElementById('tenantsTable').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

function renderTenantsTable() {
  const rows = state.tenants.map((t) => `
    <tr>
      <td>${escapeHtml(t.business_name)}</td>
      <td>${escapeHtml(t.contact_email || '')}</td>
      <td><button class="btn secondary select-tenant" data-id="${t.id}">${t.id === state.tenantId ? 'Selected' : 'Select'}</button></td>
    </tr>
  `).join('');
  document.getElementById('tenantsTable').innerHTML = `
    <table><thead><tr><th>Business</th><th>Email</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  document.querySelectorAll('.select-tenant').forEach((btn) => {
    btn.addEventListener('click', () => {
      persist('tenantId', btn.dataset.id);
      renderTenantsTable();
      updateContextBar();
    });
  });
}

// ============================================================
// Stores
// ============================================================
async function renderStores() {
  if (!state.tenantId) {
    setContent(`<h1>Stores</h1><div class="state-message">Select a tenant first.</div>`);
    return;
  }
  setContent(`
    <h1>Stores</h1>
    <div class="card">
      <div class="field"><label>Store name</label><input id="storeName"></div>
      <div class="field"><label>Address</label><input id="storeAddress"></div>
      <div class="field"><label>Region / state</label><input id="storeRegion" placeholder="e.g. Yangon, Rakhine, Kachin"></div>
      <div class="field"><label>KBZPay QR image URL (optional)</label><input id="storeKbzQr" placeholder="https://.../kbzpay-qr.png"></div>
      <button class="btn" id="createStoreBtn">Create store</button>
    </div>
    <div id="storesTable">Loading…</div>
  `);

  document.getElementById('createStoreBtn').addEventListener('click', async () => {
    const name = document.getElementById('storeName').value.trim();
    if (!name) return;
    await api('/admin/stores', {
      method: 'POST',
      body: {
        tenant_id: state.tenantId,
        name,
        address: document.getElementById('storeAddress').value.trim(),
        region_state: document.getElementById('storeRegion').value.trim(),
        kbzpay_qr_url: document.getElementById('storeKbzQr').value.trim() || null,
      },
    });
    renderStores();
  });

  const data = await api(`/admin/stores?tenant_id=${state.tenantId}`);
  state.stores = data.stores;
  const rows = state.stores.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.region_state || '')}</td>
      <td><button class="btn secondary select-store" data-id="${s.id}">${s.id === state.storeId ? 'Selected' : 'Select'}</button></td>
    </tr>
  `).join('');
  document.getElementById('storesTable').innerHTML = `
    <table><thead><tr><th>Store</th><th>Region</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  document.querySelectorAll('.select-store').forEach((btn) => {
    btn.addEventListener('click', () => {
      persist('storeId', btn.dataset.id);
      renderStores();
      updateContextBar();
    });
  });
}

// ============================================================
// Categories
// ============================================================
async function renderCategories() {
  if (!state.tenantId) {
    setContent(`<h1>Categories</h1><div class="state-message">Select a tenant first.</div>`);
    return;
  }
  setContent(`
    <h1>Categories</h1>
    <div class="card">
      <div class="field"><label>Name</label><input id="categoryName" placeholder="e.g. Noodles, Drinks"></div>
      <button class="btn" id="createCategoryBtn">Add category</button>
    </div>
    <div id="categoriesTable">Loading…</div>
  `);

  document.getElementById('createCategoryBtn').addEventListener('click', async () => {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return;
    await api('/admin/categories', { method: 'POST', body: { tenant_id: state.tenantId, name } });
    renderCategories();
  });

  const data = await api(`/admin/categories?tenant_id=${state.tenantId}`);
  state.categories = data.categories;
  const rows = state.categories.map((c) => `<tr><td>${escapeHtml(c.name)}</td></tr>`).join('');
  document.getElementById('categoriesTable').innerHTML = `<table><tbody>${rows}</tbody></table>`;
}

// ============================================================
// Products
// ============================================================
async function renderProducts() {
  if (!state.tenantId) {
    setContent(`<h1>Products</h1><div class="state-message">Select a tenant first.</div>`);
    return;
  }
  const catData = await api(`/admin/categories?tenant_id=${state.tenantId}`);
  state.categories = catData.categories;
  const categoryOptions = state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  setContent(`
    <h1>Products</h1>
    <div class="card">
      <div class="field"><label>Name</label><input id="productName"></div>
      <div class="field"><label>Price (MMK)</label><input id="productPrice" type="number"></div>
      <div class="field"><label>Category</label><select id="productCategory"><option value="">— none —</option>${categoryOptions}</select></div>
      <button class="btn" id="createProductBtn">Add product</button>
    </div>
    <div id="productsTable">Loading…</div>
  `);

  document.getElementById('createProductBtn').addEventListener('click', async () => {
    const name = document.getElementById('productName').value.trim();
    const price = Number(document.getElementById('productPrice').value);
    if (!name || !price) return;
    await api('/admin/products', {
      method: 'POST',
      body: { tenant_id: state.tenantId, name, price, category_id: document.getElementById('productCategory').value || null },
    });
    renderProducts();
  });

  const data = await api(`/admin/products?tenant_id=${state.tenantId}`);
  state.products = data.products;
  const rows = state.products.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${Number(p.price).toLocaleString()} MMK</td>
      <td><span class="pill ${p.is_active ? 'synced' : ''}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
    </tr>
  `).join('');
  document.getElementById('productsTable').innerHTML = `
    <table><thead><tr><th>Name</th><th>Price</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  `;
}

// ============================================================
// Hub provisioning
// ============================================================
async function renderProvisioning() {
  if (!state.storeId) {
    setContent(`<h1>Hub setup</h1><div class="state-message">Select a store first.</div>`);
    return;
  }
  setContent(`
    <h1>Hub setup</h1>
    <div class="subtitle">Generates a one-time code to register a new hub device for this store.</div>
    <div class="card">
      <div class="field"><label>Code expires in (minutes)</label><input id="expiryMinutes" type="number" value="30"></div>
      <button class="btn" id="generateCodeBtn">Generate code</button>
      <div id="codeResult"></div>
    </div>
  `);

  document.getElementById('generateCodeBtn').addEventListener('click', async () => {
    const expires_in_minutes = Number(document.getElementById('expiryMinutes').value) || 30;
    const data = await api(`/admin/stores/${state.storeId}/provisioning-codes`, {
      method: 'POST',
      body: { expires_in_minutes },
    });
    document.getElementById('codeResult').innerHTML = `
      <div class="code-display">${escapeHtml(data.code)}</div>
      <p style="font-size:0.85rem;color:var(--text-muted)">
        Expires at ${new Date(data.expires_at).toLocaleTimeString()}. On the hub device, run:
      </p>
      <pre style="background:var(--ivory-dim);padding:10px;border-radius:8px;font-size:0.8rem;overflow-x:auto">STORE_ID=${state.storeId} node scripts/register.js ${data.code}</pre>
    `;
  });
}

// ============================================================
// Table QR codes
// ============================================================
function renderQrCodes() {
  if (!state.storeId) {
    setContent(`<h1>Table QR codes</h1><div class="state-message">Select a store first.</div>`);
    return;
  }
  if (!state.customerAppUrl) {
    setContent(`<h1>Table QR codes</h1><div class="state-message">Set the customer ordering app URL in Connection first.</div>`);
    return;
  }

  setContent(`
    <h1>Table QR codes</h1>
    <div class="card">
      <div class="field"><label>Table number</label><input id="tableNumber" placeholder="e.g. 12"></div>
      <button class="btn" id="generateQrBtn">Generate</button>
      <div class="qr-box" id="qrBox"></div>
    </div>
  `);

  document.getElementById('generateQrBtn').addEventListener('click', () => {
    const table = document.getElementById('tableNumber').value.trim();
    if (!table) return;
    const url = `${state.customerAppUrl}/?store=${state.storeId}&table=${encodeURIComponent(table)}`;
    const qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = `<div id="qrCanvas"></div><div class="link-text">${escapeHtml(url)}</div>`;
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById('qrCanvas'), { text: url, width: 220, height: 220 });
  });
}

// ============================================================
// Orders
// ============================================================
async function renderOrders() {
  if (!state.storeId) {
    setContent(`<h1>Orders</h1><div class="state-message">Select a store first.</div>`);
    return;
  }
  setContent(`<h1>Orders</h1><div class="subtitle">Most recent 50 for this store.</div><div id="ordersTable">Loading…</div>`);

  const data = await api(`/admin/orders?store_id=${state.storeId}`);
  const rows = data.orders.map((o) => `
    <tr>
      <td>${o.table_number ? `Table ${escapeHtml(o.table_number)}` : '—'}</td>
      <td>${escapeHtml(o.channel)}</td>
      <td>${escapeHtml(o.status)}</td>
      <td>${Number(o.total).toLocaleString()} MMK</td>
      <td><span class="pill ${o.sync_status}">${escapeHtml(o.sync_status)}</span></td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
    </tr>
  `).join('');
  document.getElementById('ordersTable').innerHTML = `
    <table>
      <thead><tr><th>Table</th><th>Channel</th><th>Status</th><th>Total</th><th>Sync</th><th>Placed</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ============================================================
// Boot
// ============================================================
if (state.apiBase && state.adminKey) {
  api('/admin/tenants').then((data) => { state.tenants = data.tenants; switchTab('tenants'); })
    .catch(() => switchTab('settings'));
} else {
  switchTab('settings');
}
