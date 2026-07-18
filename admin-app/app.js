// ============================================================
// State
// ============================================================
const state = {
  apiBase: localStorage.getItem('apiBase') || '',
  customerAppUrl: localStorage.getItem('customerAppUrl') || '',
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: null,
  stores: [],
  categories: [],
  products: [],
  storeId: localStorage.getItem('storeId') || '',
};

function persist(key, value) {
  state[key] = value;
  localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : (value || ''));
}

function logout() {
  ['token', 'user', 'storeId'].forEach((k) => localStorage.removeItem(k));
  state.token = '';
  state.user = null;
  state.storeId = '';
  switchTab('login');
}

// ============================================================
// API helper
// ============================================================
async function api(path, options = {}) {
  const res = await fetch(`${state.apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired — please log in again.');
  }
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
  login: renderLogin,
  business: renderBusiness,
  stores: renderStores,
  categories: renderCategories,
  products: renderProducts,
  provisioning: renderProvisioning,
  qrcodes: renderQrCodes,
  orders: renderOrders,
};

function switchTab(tab) {
  if (tab !== 'login' && !state.token) tab = 'login';
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
  updateContextBar();
  TABS[tab]();
}

document.querySelectorAll('.nav-item').forEach((el) => el.addEventListener('click', () => switchTab(el.dataset.tab)));

function updateContextBar() {
  const store = state.stores.find((s) => s.id === state.storeId);
  document.getElementById('contextBar').innerHTML = state.user ? `
    ${escapeHtml(state.user.email)}<br>
    ${store ? `Store: ${escapeHtml(store.name)} (${escapeHtml(store.my_role || '')})` : 'No store selected'}<br>
    <a href="#" id="logoutLink" style="color:var(--gold)">Log out</a>
  ` : '';
  document.getElementById('logoutLink')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

function setContent(html) { document.getElementById('content').innerHTML = html; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }

// ============================================================
// Login (and one-time tenant bootstrap for the platform operator)
// ============================================================
function renderLogin() {
  setContent(`
    <h1>Log in</h1>
    <div class="subtitle">Enter your deployed cloud API URL, then log in.</div>
    <div class="card">
      <div class="field"><label>Cloud API URL</label><input id="apiBaseInput" value="${escapeHtml(state.apiBase)}" placeholder="https://your-api.vercel.app"></div>
      <div class="field"><label>Email</label><input id="loginEmail"></div>
      <div class="field"><label>Password</label><input id="loginPassword" type="password"></div>
      <button class="btn" id="loginBtn">Log in</button>
      <div id="loginResult" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <div style="font-weight:600;margin-bottom:8px;">First time setting up a new business?</div>
      <div class="subtitle" style="margin-bottom:14px;">Requires the platform operator's key — a one-time step done once per new business, not for daily staff login.</div>
      <div class="field"><label>Platform key</label><input id="platformKey" type="password"></div>
      <div class="field"><label>Business name</label><input id="bizName"></div>
      <div class="field"><label>Owner name</label><input id="ownerName"></div>
      <div class="field"><label>Owner email</label><input id="ownerEmail"></div>
      <div class="field"><label>Owner password</label><input id="ownerPassword" type="password"></div>
      <button class="btn secondary" id="bootstrapBtn">Create business</button>
      <div id="bootstrapResult" style="margin-top:12px;"></div>
    </div>
  `);

  document.getElementById('loginBtn').addEventListener('click', async () => {
    persist('apiBase', document.getElementById('apiBaseInput').value.replace(/\/$/, ''));
    const resultEl = document.getElementById('loginResult');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value },
      });
      persist('token', data.token);
      persist('user', data.user);
      state.stores = data.stores.map((s) => ({ id: s.store_id, name: s.store_name, my_role: s.role }));
      resultEl.innerHTML = `<span style="color:#2C5A28">Logged in as ${escapeHtml(data.user.email)}.</span>`;
      switchTab('business');
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">${escapeHtml(err.message)}</span>`;
    }
  });

  document.getElementById('bootstrapBtn').addEventListener('click', async () => {
    persist('apiBase', document.getElementById('apiBaseInput').value.replace(/\/$/, ''));
    const resultEl = document.getElementById('bootstrapResult');
    try {
      const res = await fetch(`${state.apiBase}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${document.getElementById('platformKey').value}` },
        body: JSON.stringify({
          business_name: document.getElementById('bizName').value.trim(),
          owner_name: document.getElementById('ownerName').value.trim(),
          owner_email: document.getElementById('ownerEmail').value.trim(),
          owner_password: document.getElementById('ownerPassword').value,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      resultEl.innerHTML = `<span style="color:#2C5A28">Business created — log in above with the owner email/password.</span>`;
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">${escapeHtml(err.message)}</span>`;
    }
  });
}

// ============================================================
// Business (read-only tenant info)
// ============================================================
async function renderBusiness() {
  setContent(`<h1>Business</h1><div id="bizInfo">Loading…</div>`);
  try {
    const tenant = await api('/admin/tenants/me');
    state.tenant = tenant;
    document.getElementById('bizInfo').innerHTML = `
      <div class="card">
        <div class="field"><label>Name</label><div>${escapeHtml(tenant.business_name)}</div></div>
        <div class="field"><label>Contact email</label><div>${escapeHtml(tenant.contact_email || '—')}</div></div>
        <div class="field"><label>Subscription status</label><div>${escapeHtml(tenant.subscription_status)}</div></div>
      </div>
    `;
  } catch (err) {
    document.getElementById('bizInfo').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// Stores
// ============================================================
async function renderStores() {
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
        name,
        address: document.getElementById('storeAddress').value.trim(),
        region_state: document.getElementById('storeRegion').value.trim(),
        kbzpay_qr_url: document.getElementById('storeKbzQr').value.trim() || null,
      },
    });
    renderStores();
  });

  const data = await api('/admin/stores');
  state.stores = data.stores;
  const rows = state.stores.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.region_state || '')}</td>
      <td>${escapeHtml(s.my_role || '')}</td>
      <td><button class="btn secondary select-store" data-id="${s.id}">${s.id === state.storeId ? 'Selected' : 'Select'}</button></td>
    </tr>
  `).join('');
  document.getElementById('storesTable').innerHTML = `
    <table><thead><tr><th>Store</th><th>Region</th><th>Your role</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  document.querySelectorAll('.select-store').forEach((btn) => {
    btn.addEventListener('click', () => { persist('storeId', btn.dataset.id); renderStores(); updateContextBar(); });
  });
}

// ============================================================
// Categories
// ============================================================
async function renderCategories() {
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
    try {
      await api('/admin/categories', { method: 'POST', body: { name } });
      renderCategories();
    } catch (err) {
      alert(err.message.includes('403') ? "You need an owner or manager role at one of your stores to add categories." : err.message);
    }
  });

  const data = await api('/admin/categories');
  state.categories = data.categories;
  document.getElementById('categoriesTable').innerHTML = `<table><tbody>${
    state.categories.map((c) => `<tr><td>${escapeHtml(c.name)}</td></tr>`).join('')
  }</tbody></table>`;
}

// ============================================================
// Products
// ============================================================
async function renderProducts() {
  const catData = await api('/admin/categories');
  state.categories = catData.categories;
  const categoryOptions = state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  setContent(`
    <h1>Products</h1>
    <div class="card">
      <div class="field"><label>Name</label><input id="productName"></div>
      <div class="field"><label>Description</label><input id="productDescription" placeholder="Shown on the customer menu"></div>
      <div class="field"><label>Image URL</label><input id="productImageUrl" placeholder="https://.../shan-noodles.jpg"></div>
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
      body: {
        name,
        price,
        description: document.getElementById('productDescription').value.trim() || null,
        image_url: document.getElementById('productImageUrl').value.trim() || null,
        category_id: document.getElementById('productCategory').value || null,
      },
    });
    renderProducts();
  });

  const data = await api('/admin/products');
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
  if (!state.storeId) { setContent(`<h1>Hub setup</h1><div class="state-message">Select a store first.</div>`); return; }
  setContent(`
    <h1>Hub setup</h1>
    <div class="subtitle">Generates a one-time code to register a new hub device for this store. Requires owner/manager role.</div>
    <div class="card">
      <div class="field"><label>Code expires in (minutes)</label><input id="expiryMinutes" type="number" value="30"></div>
      <button class="btn" id="generateCodeBtn">Generate code</button>
      <div id="codeResult"></div>
    </div>
  `);

  document.getElementById('generateCodeBtn').addEventListener('click', async () => {
    try {
      const data = await api(`/admin/stores/${state.storeId}/provisioning-codes`, {
        method: 'POST',
        body: { expires_in_minutes: Number(document.getElementById('expiryMinutes').value) || 30 },
      });
      document.getElementById('codeResult').innerHTML = `
        <div class="code-display">${escapeHtml(data.code)}</div>
        <p style="font-size:0.85rem;color:var(--text-muted)">Expires at ${new Date(data.expires_at).toLocaleTimeString()}. On the hub device, run:</p>
        <pre style="background:var(--ivory-dim);padding:10px;border-radius:8px;font-size:0.8rem;overflow-x:auto">STORE_ID=${state.storeId} node scripts/register.js ${data.code}</pre>
      `;
    } catch (err) {
      document.getElementById('codeResult').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
    }
  });
}

// ============================================================
// Table QR codes
// ============================================================
function renderQrCodes() {
  if (!state.storeId) { setContent(`<h1>Table QR codes</h1><div class="state-message">Select a store first.</div>`); return; }
  if (!state.customerAppUrl) {
    setContent(`
      <h1>Table QR codes</h1>
      <div class="card">
        <div class="field"><label>Customer ordering app URL</label><input id="customerAppUrlInput" placeholder="https://order.yourpos.com"></div>
        <button class="btn" id="saveCustomerUrlBtn">Save</button>
      </div>
    `);
    document.getElementById('saveCustomerUrlBtn').addEventListener('click', () => {
      persist('customerAppUrl', document.getElementById('customerAppUrlInput').value.replace(/\/$/, ''));
      renderQrCodes();
    });
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
    document.getElementById('qrBox').innerHTML = `<div id="qrCanvas"></div><div class="link-text">${escapeHtml(url)}</div>`;
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById('qrCanvas'), { text: url, width: 220, height: 220 });
  });
}

// ============================================================
// Orders
// ============================================================
async function renderOrders() {
  if (!state.storeId) { setContent(`<h1>Orders</h1><div class="state-message">Select a store first.</div>`); return; }
  setContent(`<h1>Orders</h1><div class="subtitle">Most recent 50 for this store.</div><div id="ordersTable">Loading…</div>`);

  try {
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
      <table><thead><tr><th>Table</th><th>Channel</th><th>Status</th><th>Total</th><th>Sync</th><th>Placed</th></tr></thead><tbody>${rows}</tbody></table>
    `;
  } catch (err) {
    document.getElementById('ordersTable').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// Boot
// ============================================================
if (state.token && state.user) {
  api('/admin/stores').then((data) => { state.stores = data.stores; switchTab('business'); }).catch(() => switchTab('login'));
} else {
  switchTab('login');
}
