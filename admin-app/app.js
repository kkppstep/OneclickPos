// ============================================================
// State
// ============================================================
const state = {
  apiBase: localStorage.getItem('apiBase') || (window.POS_CONFIG && window.POS_CONFIG.CLOUD_API_BASE) || '',
  customerAppUrl: localStorage.getItem('customerAppUrl') || '',
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: null,
  features: {}, // tenants.feature_overrides — which gated tabs this tenant can see, set by platform admin
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
  state.features = {};
  document.querySelectorAll('.feature-nav-item').forEach((el) => { el.hidden = true; });
  switchTab('login');
}

// Shows/hides sidebar tabs gated by tenant.feature_overrides. Also
// checked server-side on the actual endpoints (cloud-api's
// middleware/features.js) — this is convenience, not the real gate.
function applyFeatureVisibility() {
  document.querySelectorAll('.feature-nav-item').forEach((el) => {
    el.hidden = state.features[el.dataset.feature] !== true;
  });
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
  staff: renderStaff,
  liveOrders: renderLiveOrders,
  orders: renderOrders,
  analytics: renderAnalytics,
  serviceRequests: renderServiceRequests,
};

let liveOrdersInterval = null;

function switchTab(tab) {
  if (tab !== 'login' && !state.token) tab = 'login';
  if (liveOrdersInterval) { clearInterval(liveOrdersInterval); liveOrdersInterval = null; }
  stopNewOrderAlert();
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
  updateContextBar();
  TABS[tab]();
}

document.querySelectorAll('.nav-item[data-tab]').forEach((el) => el.addEventListener('click', () => switchTab(el.dataset.tab)));

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
// Reusable drag-and-drop file upload
// Wires a drop-zone element to: drag/drop, click-to-browse, upload via
// POST /admin/uploads, and fill the resulting URL into a target input.
// ============================================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function attachUploadZone(zoneId, inputId, statusId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  if (!zone) return;

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { status.textContent = 'File is larger than 5MB — use a smaller file.'; return; }
    status.textContent = 'Uploading…';
    try {
      const data = await fileToBase64(file);
      const result = await api('/admin/uploads', { method: 'POST', body: { filename: file.name, contentType: file.type, data } });
      input.value = result.url;
      status.textContent = `Uploaded: ${escapeHtml(file.name)}`;
    } catch (err) {
      status.textContent = `Upload failed: ${err.message}`;
    }
  }

  zone.addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.onchange = () => handleFile(picker.files[0]);
    picker.click();
  });
  ['dragover', 'dragenter'].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('drag-active'); }));
  ['dragleave', 'drop'].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('drag-active'); }));
  zone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
}

function dropZoneHtml(zoneId, label) {
  return `<div class="drop-zone" id="${zoneId}">${label}<div class="drop-zone-status" id="${zoneId}-status"></div></div>`;
}

// ============================================================
// Reusable menu-theme fields: preset dropdown + custom controls.
// Shared between store creation and the per-store edit row via a
// unique `prefix` so element ids don't collide.
// ============================================================
function themeFieldsHtml(prefix, current) {
  const theme = current || { preset: 'green' };
  const preset = theme.preset || 'green';
  const layout = theme.layout || 'standard';
  return `
    <div class="field"><label>Menu theme</label>
      <select id="${prefix}-preset">
        <option value="green" ${preset === 'green' ? 'selected' : ''}>Green (default)</option>
        <option value="cozy" ${preset === 'cozy' ? 'selected' : ''}>Cozy (warm browns)</option>
        <option value="ice" ${preset === 'ice' ? 'selected' : ''}>Ice (cool blues)</option>
        <option value="custom" ${preset === 'custom' ? 'selected' : ''}>Custom</option>
      </select>
    </div>
    <div id="${prefix}-custom-fields" ${preset === 'custom' ? '' : 'hidden'}>
      <div class="field"><label>Accent color</label>
        <input id="${prefix}-primary" type="color" value="${theme.primary_color || '#1B7A3D'}" style="height:40px;padding:4px;">
      </div>
      <div class="field"><label>Background gradient (optional, ignored if an image is set)</label>
        <div style="display:flex;gap:10px;">
          <input id="${prefix}-gradFrom" type="color" value="${theme.gradient_from || '#ffffff'}" style="height:40px;padding:4px;flex:1;">
          <input id="${prefix}-gradTo" type="color" value="${theme.gradient_to || '#ffffff'}" style="height:40px;padding:4px;flex:1;">
        </div>
      </div>
      <div class="field"><label>Background image (optional, overrides gradient)</label>
        ${dropZoneHtml(`${prefix}-bgDrop`, 'Drag a background image here, or click to browse')}
        <input id="${prefix}-bgUrl" value="${escapeHtml(theme.background_image_url || '')}" placeholder="https://.../background.jpg">
      </div>
    </div>
    <div class="field"><label>Menu layout</label>
      <select id="${prefix}-layout">
        <option value="standard" ${layout === 'standard' ? 'selected' : ''}>Standard — scrolling card list</option>
        <option value="stage" ${layout === 'stage' ? 'selected' : ''}>Stage — dark, premium hero dish view</option>
      </select>
    </div>
  `;
}

function wireThemeFields(prefix) {
  const presetSelect = document.getElementById(`${prefix}-preset`);
  const customFields = document.getElementById(`${prefix}-custom-fields`);
  presetSelect.addEventListener('change', () => {
    customFields.hidden = presetSelect.value !== 'custom';
  });
  attachUploadZone(`${prefix}-bgDrop`, `${prefix}-bgUrl`, `${prefix}-bgDrop-status`);
}

function collectThemeConfig(prefix) {
  const preset = document.getElementById(`${prefix}-preset`).value;
  const layout = document.getElementById(`${prefix}-layout`).value;
  if (preset !== 'custom') return { preset, layout };
  return {
    preset: 'custom',
    layout,
    primary_color: document.getElementById(`${prefix}-primary`).value,
    gradient_from: document.getElementById(`${prefix}-gradFrom`).value,
    gradient_to: document.getElementById(`${prefix}-gradTo`).value,
    background_image_url: document.getElementById(`${prefix}-bgUrl`).value.trim() || null,
  };
}

// ============================================================
// Login (and one-time tenant bootstrap for the platform operator)
// ============================================================
function renderLogin() {
  setContent(`
    <h1>Log in</h1>
    <div class="subtitle">Business owners: sign in with Google. Staff: use the email/password your owner gave you.</div>
    <div class="card" style="max-width:420px;">
      <div class="field"><label>Cloud API URL</label><input id="apiBaseInput" value="${escapeHtml(state.apiBase)}" placeholder="https://your-api.vercel.app"></div>
      <button class="btn" id="googleSignInBtn" style="background:#fff;color:var(--text);border:1px solid var(--ivory-dim);width:100%;margin-bottom:14px;">Sign in with Google</button>
      <div style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-bottom:14px;">— staff log in —</div>
      <div class="field"><label>Email</label><input id="loginEmail"></div>
      <div class="field"><label>Password</label><input id="loginPassword" type="password"></div>
      <button class="btn" id="loginBtn">Log in</button>
      <div id="loginResult" style="margin-top:12px;"></div>
    </div>
  `);

  document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    persist('apiBase', document.getElementById('apiBaseInput').value.replace(/\/$/, ''));
    const supa = getSupabaseClient();
    if (!supa) {
      document.getElementById('loginResult').innerHTML = `<span style="color:#A6301F">Google sign-in isn't configured (missing SUPABASE_URL/SUPABASE_ANON_KEY).</span>`;
      return;
    }
    await supa.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
  });

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
      await loadTenantFeatures();
      switchTab('business');
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">${escapeHtml(err.message)}</span>`;
    }
  });
}

// ============================================================
// Business (read-only tenant info)
// ============================================================
// Called right after any successful login (password or Google) so the
// sidebar reflects the tenant's enabled features immediately, without
// waiting for the user to visit the Business tab first.
async function loadTenantFeatures() {
  try {
    const tenant = await api('/admin/tenants/me');
    state.tenant = tenant;
    state.features = tenant.feature_overrides || {};
    applyFeatureVisibility();
  } catch (err) {
    console.error('[features] failed to load tenant features:', err.message);
  }
}

async function renderBusiness() {
  setContent(`<h1>Business</h1><div id="bizInfo">Loading…</div>`);
  try {
    const tenant = await api('/admin/tenants/me');
    state.tenant = tenant;
    state.features = tenant.feature_overrides || {};
    applyFeatureVisibility();
    const enabledFeatures = Object.entries(state.features).filter(([, v]) => v === true).map(([k]) => k);
    document.getElementById('bizInfo').innerHTML = `
      <div class="card">
        <div class="field"><label>Name</label><div>${escapeHtml(tenant.business_name)}</div></div>
        <div class="field"><label>Contact email</label><div>${escapeHtml(tenant.contact_email || '—')}</div></div>
        <div class="field"><label>Subscription status</label><div>${escapeHtml(tenant.subscription_status)}</div></div>
        <div class="field"><label>Enabled features</label><div>${
          enabledFeatures.length ? enabledFeatures.map((f) => `<span class="pill synced" style="margin-right:4px;">${escapeHtml(f)}</span>`).join('') : '<span class="state-message" style="padding:0;">None yet — contact the platform operator to enable extra features.</span>'
        }</div></div>
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
      <div class="field"><label>KBZPay QR image (optional)</label>
        ${dropZoneHtml('storeKbzDrop', 'Drag the QR image here, or click to browse')}
        <input id="storeKbzQr" placeholder="https://.../kbzpay-qr.png">
      </div>
      <div class="field"><label>Ambient music (optional)</label>
        ${dropZoneHtml('storeAmbientDrop', 'Drag a small audio loop here, or click to browse')}
        <input id="storeAmbientUrl" placeholder="https://.../lobby-loop.mp3">
      </div>
      <div class="field"><label><input type="checkbox" id="storeAmbientEnabled" style="width:auto;margin-right:6px;">Play while browsing the menu</label></div>
      ${themeFieldsHtml('createTheme')}
      <button class="btn" id="createStoreBtn">Create store</button>
    </div>
    <div id="storesTable">Loading…</div>
  `);

  attachUploadZone('storeKbzDrop', 'storeKbzQr', 'storeKbzDrop-status');
  attachUploadZone('storeAmbientDrop', 'storeAmbientUrl', 'storeAmbientDrop-status');
  wireThemeFields('createTheme');

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
        ambient_audio_url: document.getElementById('storeAmbientUrl').value.trim() || null,
        ambient_audio_enabled: document.getElementById('storeAmbientEnabled').checked,
        theme_config: collectThemeConfig('createTheme'),
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
      <td><span class="pill">${escapeHtml(s.my_role || '')}</span></td>
      <td>
        <button class="btn secondary select-store" data-id="${s.id}">${s.id === state.storeId ? 'Selected' : 'Select'}</button>
        <button class="btn secondary edit-store" data-id="${s.id}">Edit settings</button>
      </td>
    </tr>
    <tr class="edit-row" id="edit-row-${s.id}" hidden><td colspan="4"></td></tr>
  `).join('');
  document.getElementById('storesTable').innerHTML = `
    <table><thead><tr><th>Store</th><th>Region</th><th>Your role</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  document.querySelectorAll('.select-store').forEach((btn) => {
    btn.addEventListener('click', () => { persist('storeId', btn.dataset.id); renderStores(); updateContextBar(); });
  });
  document.querySelectorAll('.edit-store').forEach((btn) => {
    btn.addEventListener('click', () => openStoreEditRow(btn.dataset.id));
  });
}

function openStoreEditRow(storeId) {
  const store = state.stores.find((s) => s.id === storeId);
  const row = document.getElementById(`edit-row-${storeId}`);
  row.hidden = false;
  row.querySelector('td').innerHTML = `
    <div class="card" style="margin:8px 0;">
      <div class="field"><label>KBZPay QR image</label>
        ${dropZoneHtml(`editKbzDrop-${storeId}`, 'Drag the QR image here, or click to browse')}
        <input id="editKbz-${storeId}" value="${escapeHtml(store.kbzpay_qr_url || '')}">
      </div>
      <div class="field"><label>Ambient music</label>
        ${dropZoneHtml(`editAmbientDrop-${storeId}`, 'Drag a small audio loop here, or click to browse')}
        <input id="editAmbient-${storeId}" value="${escapeHtml(store.ambient_audio_url || '')}">
      </div>
      <div class="field"><label><input type="checkbox" id="editAmbientOn-${storeId}" style="width:auto;margin-right:6px;" ${store.ambient_audio_enabled ? 'checked' : ''}>Play while browsing the menu</label></div>
      ${themeFieldsHtml(`editTheme-${storeId}`, store.theme_config)}
      <button class="btn" id="saveStoreEdit-${storeId}">Save</button>
    </div>
  `;
  attachUploadZone(`editKbzDrop-${storeId}`, `editKbz-${storeId}`, `editKbzDrop-${storeId}-status`);
  attachUploadZone(`editAmbientDrop-${storeId}`, `editAmbient-${storeId}`, `editAmbientDrop-${storeId}-status`);
  wireThemeFields(`editTheme-${storeId}`);
  document.getElementById(`saveStoreEdit-${storeId}`).addEventListener('click', async () => {
    await api(`/admin/stores/${storeId}`, {
      method: 'PATCH',
      body: {
        kbzpay_qr_url: document.getElementById(`editKbz-${storeId}`).value.trim() || null,
        ambient_audio_url: document.getElementById(`editAmbient-${storeId}`).value.trim() || null,
        ambient_audio_enabled: document.getElementById(`editAmbientOn-${storeId}`).checked,
        theme_config: collectThemeConfig(`editTheme-${storeId}`),
      },
    });
    renderStores();
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
  renderCategoriesTable();
}

function renderCategoriesTable() {
  document.getElementById('categoriesTable').innerHTML = `<table><tbody>${
    state.categories.map((c) => `
      <tr id="cat-row-${c.id}">
        <td><span class="cat-name-text">${escapeHtml(c.name)}</span></td>
        <td style="text-align:right;">
          <button class="btn secondary rename-cat" data-id="${c.id}">Rename</button>
          <button class="btn danger delete-cat" data-id="${c.id}">Delete</button>
        </td>
      </tr>
    `).join('')
  }</tbody></table>`;

  document.querySelectorAll('.rename-cat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = state.categories.find((c) => c.id === btn.dataset.id);
      const row = document.getElementById(`cat-row-${cat.id}`);
      row.querySelector('td').innerHTML = `<input id="renameInput-${cat.id}" value="${escapeHtml(cat.name)}">`;
      row.querySelector('td:last-child').innerHTML = `
        <button class="btn save-rename-cat" data-id="${cat.id}">Save</button>
        <button class="btn secondary cancel-rename-cat">Cancel</button>
      `;
      row.querySelector('.save-rename-cat').addEventListener('click', async () => {
        const name = document.getElementById(`renameInput-${cat.id}`).value.trim();
        if (!name) return;
        try {
          await api(`/admin/categories/${cat.id}`, { method: 'PATCH', body: { name } });
          renderCategories();
        } catch (err) {
          alert(err.message);
        }
      });
      row.querySelector('.cancel-rename-cat').addEventListener('click', renderCategoriesTable);
    });
  });

  document.querySelectorAll('.delete-cat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cat = state.categories.find((c) => c.id === btn.dataset.id);
      if (!confirm(`Delete "${cat.name}"? Products in it become uncategorized, not deleted.`)) return;
      try {
        await api(`/admin/categories/${btn.dataset.id}`, { method: 'DELETE' });
        renderCategories();
      } catch (err) {
        alert(err.message);
      }
    });
  });
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
      <div class="field"><label>Image URL</label>
        ${dropZoneHtml('productImageDrop', 'Drag an image here, or click to browse')}
        <input id="productImageUrl" placeholder="https://.../shan-noodles.jpg">
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>Price (MMK)</label><input id="productPrice" type="number"></div>
        <div class="field" style="flex:1;"><label>Cost (MMK, optional)</label><input id="productCost" type="number"></div>
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>SKU (optional)</label><input id="productSku"></div>
        <div class="field" style="flex:1;"><label>Barcode (optional)</label><input id="productBarcode"></div>
      </div>
      <div class="field"><label>Category</label><select id="productCategory"><option value="">— none —</option>${categoryOptions}</select></div>
      <button class="btn" id="createProductBtn">Add product</button>
    </div>
    <div id="productsTable">Loading…</div>
  `);

  attachUploadZone('productImageDrop', 'productImageUrl', 'productImageDrop-status');

  document.getElementById('createProductBtn').addEventListener('click', async () => {
    const name = document.getElementById('productName').value.trim();
    const price = Number(document.getElementById('productPrice').value);
    if (!name || !price) return;
    const cost = document.getElementById('productCost').value;
    try {
      await api('/admin/products', {
        method: 'POST',
        body: {
          name,
          price,
          description: document.getElementById('productDescription').value.trim() || null,
          image_url: document.getElementById('productImageUrl').value.trim() || null,
          sku: document.getElementById('productSku').value.trim() || null,
          barcode: document.getElementById('productBarcode').value.trim() || null,
          cost: cost ? Number(cost) : null,
          category_id: document.getElementById('productCategory').value || null,
        },
      });
      renderProducts();
    } catch (err) {
      alert(err.message);
    }
  });

  await loadProductsTable();
}

async function loadProductsTable() {
  const data = await api(`/admin/products${state.storeId ? `?store_id=${state.storeId}` : ''}`);
  state.products = data.products;
  renderProductsTable();
}

function renderProductsTable() {
  const rows = state.products.map((p) => `
    <tr id="product-row-${p.id}">
      <td>${escapeHtml(p.name)}</td>
      <td>${Number(p.price).toLocaleString()} MMK</td>
      <td><span class="pill ${p.is_active ? 'synced' : ''}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        ${
          state.storeId
            ? `<button class="btn secondary toggle-availability" data-id="${p.id}" data-available="${p.is_available}">${p.is_available ? 'Mark sold out' : 'Mark available'}</button>`
            : `<span style="font-size:0.78rem;color:var(--text-muted)">Select a store to manage</span>`
        }
        <button class="btn secondary edit-product" data-id="${p.id}">Edit</button>
        <button class="btn danger delete-product" data-id="${p.id}">Delete</button>
      </td>
    </tr>
    <tr class="edit-row" id="product-edit-row-${p.id}" hidden><td colspan="4"></td></tr>
  `).join('');
  document.getElementById('productsTable').innerHTML = `
    <table><thead><tr><th>Name</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;

  document.querySelectorAll('.toggle-availability').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextAvailable = btn.dataset.available !== 'true';
      await api(`/admin/stores/${state.storeId}/products/${btn.dataset.id}/availability`, {
        method: 'PATCH',
        body: { is_available: nextAvailable },
      });
      loadProductsTable();
    });
  });

  document.querySelectorAll('.edit-product').forEach((btn) => {
    btn.addEventListener('click', () => openProductEditRow(btn.dataset.id));
  });

  document.querySelectorAll('.delete-product').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const product = state.products.find((p) => p.id === btn.dataset.id);
      if (!confirm(`Delete "${product.name}"?`)) return;
      try {
        const result = await api(`/admin/products/${btn.dataset.id}`, { method: 'DELETE' });
        if (result.deactivated) alert(`"${product.name}" has order history, so it was deactivated instead of deleted — it's off the menu either way.`);
        loadProductsTable();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function openProductEditRow(productId) {
  const product = state.products.find((p) => p.id === productId);
  const categoryOptions = state.categories.map((c) => `<option value="${c.id}" ${c.id === product.category_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  const row = document.getElementById(`product-edit-row-${productId}`);
  row.hidden = false;
  row.querySelector('td').innerHTML = `
    <div class="card" style="margin:8px 0;">
      <div class="field"><label>Name</label><input id="editName-${productId}" value="${escapeHtml(product.name)}"></div>
      <div class="field"><label>Description</label><input id="editDescription-${productId}" value="${escapeHtml(product.description || '')}"></div>
      <div class="field"><label>Image URL</label>
        ${dropZoneHtml(`editImageDrop-${productId}`, 'Drag an image here, or click to browse')}
        <input id="editImageUrl-${productId}" value="${escapeHtml(product.image_url || '')}">
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>Price (MMK)</label><input id="editPrice-${productId}" type="number" value="${product.price}"></div>
        <div class="field" style="flex:1;"><label>Cost (MMK)</label><input id="editCost-${productId}" type="number" value="${product.cost || ''}"></div>
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>SKU</label><input id="editSku-${productId}" value="${escapeHtml(product.sku || '')}"></div>
        <div class="field" style="flex:1;"><label>Barcode</label><input id="editBarcode-${productId}" value="${escapeHtml(product.barcode || '')}"></div>
      </div>
      <div class="field"><label>Category</label><select id="editCategory-${productId}"><option value="">— none —</option>${categoryOptions}</select></div>
      <div class="field"><label><input type="checkbox" id="editIsActive-${productId}" style="width:auto;margin-right:6px;" ${product.is_active ? 'checked' : ''}>Active (shows in the catalog at all)</label></div>
      <button class="btn" id="saveProductEdit-${productId}">Save</button>
      <button class="btn secondary" id="cancelProductEdit-${productId}">Cancel</button>
    </div>
  `;
  attachUploadZone(`editImageDrop-${productId}`, `editImageUrl-${productId}`, `editImageDrop-${productId}-status`);
  document.getElementById(`cancelProductEdit-${productId}`).addEventListener('click', () => { row.hidden = true; });
  document.getElementById(`saveProductEdit-${productId}`).addEventListener('click', async () => {
    const cost = document.getElementById(`editCost-${productId}`).value;
    try {
      await api(`/admin/products/${productId}`, {
        method: 'PATCH',
        body: {
          name: document.getElementById(`editName-${productId}`).value.trim(),
          description: document.getElementById(`editDescription-${productId}`).value.trim() || null,
          image_url: document.getElementById(`editImageUrl-${productId}`).value.trim() || null,
          sku: document.getElementById(`editSku-${productId}`).value.trim() || null,
          barcode: document.getElementById(`editBarcode-${productId}`).value.trim() || null,
          price: Number(document.getElementById(`editPrice-${productId}`).value),
          cost: cost ? Number(cost) : null,
          category_id: document.getElementById(`editCategory-${productId}`).value || null,
          is_active: document.getElementById(`editIsActive-${productId}`).checked,
        },
      });
      loadProductsTable();
    } catch (err) {
      alert(err.message);
    }
  });
}

// ============================================================
// Hub provisioning
// ============================================================
async function renderProvisioning() {
  if (!state.storeId) { setContent(`<h1>Hub setup</h1><div class="state-message">Select a store first.</div>`); return; }

  const data = await api('/admin/stores');
  const store = data.stores.find((s) => s.id === state.storeId);

  setContent(`
    <h1>Hub setup</h1>

    <div class="card">
      <h2 style="margin-top:0;">Receipt printer</h2>
      <div class="subtitle">A generic 80mm Wi-Fi/Ethernet printer (Xprinter, ZJiang, and most budget ESC/POS printers work) on the same network as whichever device is printing — either local-hub, or print-bridge for stores without one.</div>
      <div class="field"><label><input type="checkbox" id="printerEnabled" style="width:auto;margin-right:6px;" ${store.printer_enabled ? 'checked' : ''}>Printing enabled</label></div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:2;"><label>Printer IP address</label><input id="printerIp" placeholder="192.168.1.50" value="${escapeHtml(store.printer_ip || '')}"></div>
        <div class="field" style="flex:1;"><label>Port</label><input id="printerPort" type="number" value="${store.printer_port || 9100}"></div>
      </div>
      <div class="field"><label>Printer model</label>
        <select id="printerModel">
          <option value="epson" ${store.printer_model === 'epson' ? 'selected' : ''}>Epson command set (most budget printers — try this first)</option>
          <option value="star" ${store.printer_model === 'star' ? 'selected' : ''}>Star</option>
          <option value="tanca" ${store.printer_model === 'tanca' ? 'selected' : ''}>Tanca</option>
          <option value="daruma" ${store.printer_model === 'daruma' ? 'selected' : ''}>Daruma</option>
        </select>
      </div>
      <div class="field"><label><input type="checkbox" id="printerCashDrawer" style="width:auto;margin-right:6px;" ${store.printer_has_cash_drawer ? 'checked' : ''}>Has a cash drawer wired to the printer</label></div>
      <button class="btn" id="savePrinterBtn">Save printer settings</button>
      <div id="printerSaveResult"></div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:10px;">Takes effect within about a cycle (a few seconds to a minute) — whichever device is printing for this store checks for changes periodically, no restart needed. No PC on site at all? See <code>print-bridge/README.md</code> — it's a lighter alternative to a full hub that only handles printing.</p>
    </div>

    <div class="card">
      <h2 style="margin-top:0;">Pair a device</h2>
      <div class="subtitle">Generates a one-time code to register a new hub or print-bridge device for this store. Requires owner/manager role.</div>
      <div class="field"><label>Code expires in (minutes)</label><input id="expiryMinutes" type="number" value="30"></div>
      <button class="btn" id="generateCodeBtn">Generate code</button>
      <div id="codeResult"></div>
    </div>
  `);

  document.getElementById('savePrinterBtn').addEventListener('click', async () => {
    try {
      await api(`/admin/stores/${state.storeId}`, {
        method: 'PATCH',
        body: {
          printer_enabled: document.getElementById('printerEnabled').checked,
          printer_ip: document.getElementById('printerIp').value.trim() || null,
          printer_port: Number(document.getElementById('printerPort').value) || 9100,
          printer_model: document.getElementById('printerModel').value,
          printer_has_cash_drawer: document.getElementById('printerCashDrawer').checked,
        },
      });
      document.getElementById('printerSaveResult').innerHTML = `<div class="state-message" style="margin-top:10px;">Saved.</div>`;
    } catch (err) {
      document.getElementById('printerSaveResult').innerHTML = `<div class="state-message error" style="margin-top:10px;">${escapeHtml(err.message)}</div>`;
    }
  });

  document.getElementById('generateCodeBtn').addEventListener('click', async () => {
    try {
      const codeData = await api(`/admin/stores/${state.storeId}/provisioning-codes`, {
        method: 'POST',
        body: { expires_in_minutes: Number(document.getElementById('expiryMinutes').value) || 30 },
      });
      document.getElementById('codeResult').innerHTML = `
        <div class="code-display">${escapeHtml(codeData.code)}</div>
        <p style="font-size:0.85rem;color:var(--text-muted)">Expires at ${new Date(codeData.expires_at).toLocaleTimeString()}. On the hub or print-bridge device, run:</p>
        <pre style="background:var(--ivory-dim);padding:10px;border-radius:8px;font-size:0.8rem;overflow-x:auto">STORE_ID=${state.storeId} node scripts/register.js ${codeData.code}</pre>
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
    const qrBox = document.getElementById('qrBox');
    qrBox.innerHTML = `
      <div id="qrCanvas"></div>
      <div class="link-text">${escapeHtml(url)}</div>
      <div class="qr-actions">
        <button class="btn secondary" id="downloadQrBtn">Download PNG</button>
        <button class="btn secondary" id="printQrBtn">Print</button>
      </div>
    `;
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById('qrCanvas'), { text: url, width: 220, height: 220 });

    document.getElementById('downloadQrBtn').addEventListener('click', () => {
      const canvas = qrBox.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `table-${table}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    document.getElementById('printQrBtn').addEventListener('click', () => {
      const canvas = qrBox.querySelector('canvas');
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Table ${escapeHtml(table)} QR</title></head>
        <body style="text-align:center;font-family:sans-serif;padding:40px;">
          <h2>Table ${escapeHtml(table)}</h2>
          <img src="${dataUrl}" style="width:280px;height:280px;">
          <p style="color:#666;font-size:12px;">Scan to order</p>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    });
  });
}

// ============================================================
// Staff
// ============================================================
async function renderStaff() {
  if (state.features.staff_management !== true) { setContent(`<h1>Staff</h1><div class="state-message">This feature isn't enabled for your account yet. Contact the platform operator.</div>`); return; }
  if (!state.storeId) { setContent(`<h1>Staff</h1><div class="state-message">Select a store first.</div>`); return; }
  setContent(`
    <h1>Staff</h1>
    <div class="subtitle">Owner-only. Adds a login scoped to this store.</div>
    <div class="card">
      <div class="field"><label>Name</label><input id="staffName"></div>
      <div class="field"><label>Email</label><input id="staffEmail"></div>
      <div class="field"><label>Initial password</label><input id="staffPassword" type="password"></div>
      <div class="field"><label>Role</label>
        <select id="staffRole">
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
          <option value="kitchen_staff">Kitchen staff</option>
        </select>
      </div>
      <button class="btn" id="addStaffBtn">Add</button>
      <div id="staffResult" style="margin-top:10px;"></div>
    </div>
    <div id="staffTable">Loading…</div>
  `);

  document.getElementById('addStaffBtn').addEventListener('click', async () => {
    const resultEl = document.getElementById('staffResult');
    try {
      await api(`/admin/stores/${state.storeId}/staff`, {
        method: 'POST',
        body: {
          name: document.getElementById('staffName').value.trim(),
          email: document.getElementById('staffEmail').value.trim(),
          password: document.getElementById('staffPassword').value,
          role: document.getElementById('staffRole').value,
        },
      });
      resultEl.innerHTML = `<span style="color:#2C5A28">Added. Share the email/password with them directly.</span>`;
      renderStaffTable();
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">${escapeHtml(err.message)}</span>`;
    }
  });

  renderStaffTable();
}

async function renderStaffTable() {
  const data = await api(`/admin/stores/${state.storeId}/staff`);
  const rows = data.staff.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td><span class="pill">${escapeHtml(s.role)}</span></td>
      <td>${s.role !== 'owner' ? `<button class="btn secondary remove-staff" data-id="${s.id}">Remove</button>` : ''}</td>
    </tr>
  `).join('');
  document.getElementById('staffTable').innerHTML = `
    <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  document.querySelectorAll('.remove-staff').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/admin/stores/${state.storeId}/staff/${btn.dataset.id}`, { method: 'DELETE' });
      renderStaffTable();
    });
  });
}

// ============================================================
// Customer service requests — Myanmar staff-call queue.
// ============================================================
let serviceRequestIds = new Set();
let serviceRequestAudio = null;
function serviceRequestBeep() {
  if (!serviceRequestAudio) return;
  const now = serviceRequestAudio.currentTime;
  const oscillator = serviceRequestAudio.createOscillator();
  const gain = serviceRequestAudio.createGain();
  oscillator.connect(gain);
  gain.connect(serviceRequestAudio.destination);
  oscillator.frequency.value = 740;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  oscillator.start(now);
  oscillator.stop(now + 0.45);
}
async function renderServiceRequests() {
  if (!state.storeId) {
    setContent('<h1>ဝန်ဆောင်မှု တောင်းဆိုချက်များ</h1><div class="state-message">ဆိုင်တစ်ဆိုင်ကို အရင်ရွေးချယ်ပါ။</div>');
    return;
  }
  setContent(`
    <div class="service-request-header">
      <div><h1>ဝန်ဆောင်မှု တောင်းဆိုချက်များ</h1><div class="subtitle">စားပွဲများမှ ဘေလ် သို့မဟုတ် ဝန်ထမ်းခေါ်ဆိုမှုများ</div></div>
      <button class="btn secondary" id="enableServiceAlertsBtn">အသံအချက်ပေးမှု ဖွင့်မည်</button>
    </div>
    <div id="serviceRequestsList"><div class="state-message">ဖတ်နေသည်…</div></div>
  `);
  document.getElementById('enableServiceAlertsBtn').addEventListener('click', async () => {
    serviceRequestAudio = new (window.AudioContext || window.webkitAudioContext)();
    if (Notification?.permission === 'default') await Notification.requestPermission();
    document.getElementById('enableServiceAlertsBtn').textContent = 'အသံအချက်ပေးမှု ဖွင့်ထားသည်';
    serviceRequestBeep();
  });
  await refreshServiceRequests(true);
  liveOrdersInterval = setInterval(() => refreshServiceRequests(false), 5000);
}
async function refreshServiceRequests(firstLoad) {
  try {
    const data = await api(`/admin/stores/${state.storeId}/service-requests`);
    const fresh = data.requests.filter((request) => !serviceRequestIds.has(request.id));
    if (!firstLoad && fresh.length) {
      serviceRequestBeep();
      if (Notification?.permission === 'granted') new Notification('ဝန်ဆောင်မှု တောင်းဆိုချက်', { body: `${fresh.length} ခု ရှိပါသည်။`, tag: 'service-request' });
    }
    data.requests.forEach((request) => serviceRequestIds.add(request.id));
    renderServiceRequestList(data.requests);
  } catch (err) {
    const list = document.getElementById('serviceRequestsList');
    if (list) list.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}
function renderServiceRequestList(requests) {
  const list = document.getElementById('serviceRequestsList');
  if (!list) return;
  if (!requests.length) {
    list.innerHTML = '<div class="service-request-empty">လက်ရှိ တောင်းဆိုချက် မရှိသေးပါ။</div>';
    return;
  }
  list.innerHTML = requests.map((request) => {
    const isBill = request.request_type === 'bill';
    const title = isBill ? 'ဘေလ်တောင်းနေပါသည်' : 'ဝန်ထမ်းခေါ်နေပါသည်';
    const status = request.status === 'new' ? 'အသစ်' : 'လက်ခံပြီး';
    return `<article class="service-request-card ${request.status === 'new' ? 'is-new' : ''}">
      <div class="service-request-icon">${isBill ? '🧾' : '🔔'}</div>
      <div class="service-request-body"><div class="service-request-title">စားပွဲအမှတ် ${escapeHtml(request.table_number)} မှ ${title}</div><div class="service-request-meta">${status} · ${new Date(request.created_at).toLocaleTimeString('my-MM')}</div></div>
      <div class="service-request-actions">
        ${request.status === 'new' ? `<button class="btn secondary service-ack-btn" data-id="${request.id}">လက်ခံပြီး</button>` : ''}
        <button class="btn service-resolve-btn" data-id="${request.id}">ပြီးစီးပါပြီ</button>
      </div>
    </article>`;
  }).join('');
  document.querySelectorAll('.service-ack-btn').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    await api(`/admin/service-requests/${button.dataset.id}/acknowledge`, { method: 'POST' });
    refreshServiceRequests(false);
  }));
  document.querySelectorAll('.service-resolve-btn').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    await api(`/admin/service-requests/${button.dataset.id}/resolve`, { method: 'POST' });
    refreshServiceRequests(false);
  }));
}
// ============================================================
// Live orders — the kitchen/staff working view. Polls every 5s.
// ============================================================
let alertAudioCtx = null; // created on the "Enable alerts" click (user gesture) so later polls can reuse it without one
let alertLoopInterval = null;
let notifiedIds = new Set(); // orders we've already alerted on this session, so a poll doesn't re-alert the same order

function playAlertBeep() {
  if (!alertAudioCtx) return;
  const now = alertAudioCtx.currentTime;
  const osc = alertAudioCtx.createOscillator();
  const gain = alertAudioCtx.createGain();
  osc.connect(gain);
  gain.connect(alertAudioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.start(now);
  osc.stop(now + 0.35);
}

function startNewOrderAlert(count) {
  document.getElementById('newOrderBanner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'newOrderBanner';
  banner.className = 'new-order-banner';
  banner.innerHTML = `${count} new order${count > 1 ? 's' : ''} — <button id="dismissNewOrderBanner">Dismiss</button>`;
  document.getElementById('content').prepend(banner);
  document.getElementById('dismissNewOrderBanner').addEventListener('click', stopNewOrderAlert);

  if (Notification?.permission === 'granted') {
    new Notification('New order received', { body: `${count} new order${count > 1 ? 's' : ''} on Live orders`, tag: 'new-order' });
  }

  playAlertBeep();
  clearInterval(alertLoopInterval);
  alertLoopInterval = setInterval(playAlertBeep, 1400);

  let flashOn = false;
  clearInterval(window._titleFlashInterval);
  const baseTitle = document.title.replace(/^🔔 /, '');
  window._titleFlashInterval = setInterval(() => {
    document.title = flashOn ? baseTitle : `🔔 ${baseTitle}`;
    flashOn = !flashOn;
  }, 1000);
}

function stopNewOrderAlert() {
  document.getElementById('newOrderBanner')?.remove();
  clearInterval(alertLoopInterval);
  alertLoopInterval = null;
  clearInterval(window._titleFlashInterval);
  document.title = document.title.replace(/^🔔 /, '');
}

async function renderLiveOrders() {
  if (state.features.live_orders !== true) { setContent(`<h1>Live orders</h1><div class="state-message">This feature isn't enabled for your account yet. Contact the platform operator.</div>`); return; }
  if (!state.storeId) { setContent(`<h1>Live orders</h1><div class="state-message">Select a store first.</div>`); return; }

  notifiedIds = new Set(); // fresh session each time this tab is opened
  stopNewOrderAlert();

  setContent(`
    <h1>Live orders</h1>
    <div class="subtitle">Refreshes automatically.</div>
    ${
      Notification && Notification.permission === 'default'
        ? `<button class="btn secondary" id="enableAlertsBtn" style="margin-bottom:16px;">Enable sound + popup alerts for new orders</button>`
        : ''
    }
    <div id="liveOrdersList">Loading…</div>
  `);

  document.getElementById('enableAlertsBtn')?.addEventListener('click', async () => {
    if (!alertAudioCtx) alertAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    playAlertBeep();
    if (Notification) await Notification.requestPermission();
    document.getElementById('enableAlertsBtn').remove();
  });

  let firstLoad = true;

  const load = async () => {
    try {
      const data = await api(`/admin/stores/${state.storeId}/live-orders`);

      if (firstLoad) {
        data.orders.forEach((o) => notifiedIds.add(o.id));
        firstLoad = false;
      } else {
        const freshOrders = data.orders.filter((o) => !notifiedIds.has(o.id));
        if (freshOrders.length > 0) {
          freshOrders.forEach((o) => notifiedIds.add(o.id));
          startNewOrderAlert(freshOrders.length);
        }
      }

      renderLiveOrdersList(data.orders);
    } catch (err) {
      document.getElementById('liveOrdersList').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
    }
  };

  await load();
  liveOrdersInterval = setInterval(load, 5000);
}

function renderLiveOrdersList(orders) {
  const listEl = document.getElementById('liveOrdersList');
  if (orders.length === 0) {
    listEl.innerHTML = `<div class="state-message">No open orders right now.</div>`;
    return;
  }

  // Group by table — a table can carry more than one open order (a
  // second round ordered after the first), and checkout is one action
  // across all of them, not order-by-order. Orders with no table
  // (takeaway/counter) each stay their own single-order group.
  const groups = {};
  orders.forEach((o) => {
    const key = o.table_number || `__single_${o.id}`;
    if (!groups[key]) groups[key] = { table_number: o.table_number, channel: o.channel, orders: [] };
    groups[key].orders.push(o);
  });

  listEl.innerHTML = Object.entries(groups).map(([key, group]) => {
    const anyPending = group.orders.some((o) => o.payments.some((p) => p.status === 'pending'));
    const allPrepared = group.orders.every((o) => Boolean(o.prepared_at));
    const groupTotal = group.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const ordersHtml = group.orders.map((o) => `
      <div style="padding:8px 0;border-top:1px solid var(--ivory-dim);">
        <div style="font-size:0.72rem;color:var(--text-muted);">${new Date(o.created_at).toLocaleTimeString()}</div>
        ${o.items.map((i) => `
          <div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:0.88rem;">
            <span>${i.qty} × ${escapeHtml(i.product_name_snapshot)} <span style="color:var(--text-muted);font-size:0.78rem;">(${Number(i.unit_price || 0).toLocaleString()} MMK)</span></span>
            <strong style="white-space:nowrap;">${Number(i.line_total || (Number(i.qty || 0) * Number(i.unit_price || 0))).toLocaleString()} MMK</strong>
          </div>
          ${i.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);font-style:italic;">မှတ်ချက်: ${escapeHtml(i.notes)}</div>` : ''}
        `).join('')}
        <div style="display:flex;justify-content:flex-end;font-weight:700;margin-top:6px;">အော်ဒါစုစုပေါင်း: ${Number(o.total || 0).toLocaleString()} MMK</div>
        <button type="button" class="btn danger cancel-order-btn" data-id="${o.id}" style="margin-top:6px;padding:2px 10px;font-size:0.76rem;">Cancel this order</button>
      </div>
    `).join('');

    return `
      <div class="card" id="table-group-${key}">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="font-weight:700;">${group.table_number ? `Table ${escapeHtml(group.table_number)}` : escapeHtml(group.channel)}</div>
          ${!allPrepared ? `<span class="pill pending">Customer ordered</span>` : anyPending ? `<span class="pill pending">Prepared</span>` : `<span class="pill synced">Payment confirmed</span>`}
        </div>
        <div>${ordersHtml}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--ivory-dim);">
          <strong>စားပွဲစုစုပေါင်း: ${groupTotal.toLocaleString()} MMK</strong>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" class="btn secondary order-stage-btn prepared-btn" data-table="${escapeHtml(group.table_number || '')}" ${!group.table_number ? 'data-order-id="' + group.orders[0].id + '"' : ''} ${allPrepared ? 'disabled' : ''}>${allPrepared ? 'Prepared ✓' : 'Prepared'}</button>
          <button type="button" class="btn secondary order-stage-btn confirm-payment-btn" data-table="${escapeHtml(group.table_number || '')}" ${!group.table_number ? 'data-order-id="' + group.orders[0].id + '"' : ''} ${!allPrepared || !anyPending ? 'disabled' : ''}>Confirm payment</button>
          <button type="button" class="btn order-stage-btn complete-table-btn" data-table="${escapeHtml(group.table_number || '')}" ${!group.table_number ? 'data-order-id="' + group.orders[0].id + '"' : ''} ${!allPrepared || anyPending ? 'disabled' : ''}>Mark as complete</button>
        </div>
        <div class="action-error" id="group-error-${key}"></div>
      </div>
    `;
  }).join('');

    listEl.querySelectorAll('.prepared-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      btn.disabled = true;
      const errorEl = document.getElementById(`group-error-${btn.dataset.table || '__single_' + btn.dataset.orderId}`);
      try {
        if (btn.dataset.table) await api(`/admin/stores/${state.storeId}/tables/${encodeURIComponent(btn.dataset.table)}/prepared`, { method: 'POST' });
        else await api(`/admin/orders/${btn.dataset.orderId}/prepared`, { method: 'POST' });
        await refreshLiveOrdersNow();
      } catch (err) {
        btn.disabled = false;
        if (errorEl) errorEl.textContent = `Prepared failed: ${err.message}`;
      }
    });
  });
  listEl.querySelectorAll('.confirm-payment-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled = true;
      const originalLabel = btn.textContent;
      btn.textContent = 'Processing…';

      const errorEl = document.getElementById(`group-error-${btn.dataset.table || '__single_' + btn.dataset.orderId}`);
      try {
        let receipt;
        if (btn.dataset.table) {
          receipt = await api(`/admin/stores/${state.storeId}/tables/${encodeURIComponent(btn.dataset.table)}/confirm-payment`, { method: 'POST' });
        } else {
          await api(`/admin/orders/${btn.dataset.orderId}/confirm-payment`, { method: 'POST' });
          const data = await api(`/admin/stores/${state.storeId}/live-orders`);
          const order = data.orders.find((o) => o.id === btn.dataset.orderId);
          receipt = { table_number: null, orders: order ? [order] : [], total: order?.total || 0 };
        }
        await refreshLiveOrdersNow();
            } catch (err) {
        btn.disabled = false;
        btn.textContent = originalLabel;
        if (errorEl) errorEl.textContent = `Payment action failed: ${err.message}`;
        else alert(`Payment action failed: ${err.message}`);
      }
    });
  });
    listEl.querySelectorAll('.complete-table-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      btn.disabled = true;
      const errorEl = document.getElementById(`group-error-${btn.dataset.table || '__single_' + btn.dataset.orderId}`);
      try {
        const data = await api(`/admin/stores/${state.storeId}/live-orders`);
        const receipt = btn.dataset.table
          ? { table_number: btn.dataset.table, orders: data.orders.filter((o) => o.table_number === btn.dataset.table), total: data.orders.filter((o) => o.table_number === btn.dataset.table).reduce((sum, o) => sum + Number(o.total || 0), 0) }
          : { table_number: null, orders: data.orders.filter((o) => o.id === btn.dataset.orderId), total: Number(data.orders.find((o) => o.id === btn.dataset.orderId)?.total || 0) };
        await showReceipt(receipt, async () => {
          if (btn.dataset.table) await api(`/admin/stores/${state.storeId}/tables/${encodeURIComponent(btn.dataset.table)}/complete`, { method: 'POST' });
          else await api(`/admin/orders/${btn.dataset.orderId}/status`, { method: 'POST', body: { status: 'completed' } });
        });
        await refreshLiveOrdersNow();
      } catch (err) {
        btn.disabled = false;
        if (errorEl) errorEl.textContent = `Completion failed: ${err.message}`;
      }
    });
  });


  listEl.querySelectorAll('.cancel-order-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this order? The rest of the table\'s orders are unaffected.')) return;
      btn.disabled = true;
      try {
        await api(`/admin/orders/${btn.dataset.id}/status`, { method: 'POST', body: { status: 'voided' } });
        await refreshLiveOrdersNow();
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });
}

// Draws one combined receipt for everything just confirmed — a flat
// canvas render rather than building the screen version and the print
// version separately, so what prints can never drift from what staff
// saw. The same PNG drives all three: on-screen preview, the local
// download, and (via /admin/uploads + /admin/stores/:id/print-jobs)
// whatever hub or print-bridge is running for this store.
function renderReceiptCanvas(receipt) {
  const canvas = document.createElement('canvas');
  const width = 384; // matches 80mm paper at standard ESC/POS print density
  const lineHeight = 22;
  const allItems = receipt.orders.flatMap((o) => o.items.map((i) => ({ ...i, orderTime: o.created_at })));
  const notesCount = allItems.filter((i) => i.notes).length;
  const height = 140 + allItems.length * lineHeight + notesCount * (lineHeight * 0.8) + 90;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('RECEIPT', width / 2, 30);
  ctx.font = '15px monospace';
  ctx.fillText(receipt.table_number ? `Table ${receipt.table_number}` : 'Takeaway', width / 2, 52);
  ctx.fillText(new Date().toLocaleString(), width / 2, 72);
  ctx.textAlign = 'left';
  ctx.beginPath(); ctx.moveTo(16, 86); ctx.lineTo(width - 16, 86); ctx.stroke();

  let y = 110;
  allItems.forEach((item) => {
    ctx.font = '14px monospace';
    ctx.fillText(`${item.qty} x ${item.product_name_snapshot}`, 16, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(item.line_total), width - 16, y);
    ctx.textAlign = 'left';
    y += lineHeight;
    if (item.notes) {
      ctx.font = 'italic 11px monospace';
      ctx.fillText(`  note: ${item.notes}`, 16, y);
      y += lineHeight * 0.8;
    }
  });

  ctx.beginPath(); ctx.moveTo(16, y + 6); ctx.lineTo(width - 16, y + 6); ctx.stroke();
  y += 30;
  ctx.font = 'bold 17px monospace';
  ctx.fillText('Total', 16, y);
  ctx.textAlign = 'right';
  ctx.fillText(String(receipt.total), width - 16, y);

  return canvas;
}

// Shows the receipt, saves it to the device as a PNG, and queues it
// to print — one action covers all three, matching the moment this
// happens (staff checking a customer out), rather than three separate
// steps.
async function showReceipt(receipt, onFinalConfirm) {
  const canvas = renderReceiptCanvas(receipt);
  const dataUrl = canvas.toDataURL('image/png');

  const overlay = document.createElement('div');
  overlay.className = 'receipt-overlay';
  overlay.innerHTML = `
    <div class="receipt-modal">
      <img src="${dataUrl}" alt="Receipt" style="width:100%;border:1px solid var(--ivory-dim);">
      <div id="receiptPrintStatus" style="font-size:0.8rem;color:var(--text-muted);margin:10px 0;">စစ်ဆေးပြီး နောက်ဆုံးအတည်ပြုပါ။</div>
      <button class="btn" id="finalConfirmReceiptBtn">Final confirmation</button>
      <button class="btn secondary" id="closeReceiptBtn" style="margin-top:8px;">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('closeReceiptBtn').addEventListener('click', () => overlay.remove());
  document.getElementById('finalConfirmReceiptBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await saveReceiptImage(receipt, dataUrl);
      await onFinalConfirm?.();
      button.textContent = 'Confirmed and saved';
      setTimeout(() => overlay.remove(), 450);
    } catch (err) {
      button.disabled = false;
      const status = document.getElementById('receiptPrintStatus');
      if (status) status.textContent = `Receipt saved, but final confirmation failed: ${err.message}`;
    }
  });

}

async function saveReceiptImage(receipt, dataUrl) {
  const downloadLink = document.createElement('a');
  downloadLink.href = dataUrl;
  downloadLink.download = `receipt-${receipt.table_number || 'takeaway'}-${Date.now()}.png`;
  downloadLink.click();

  const statusEl = document.getElementById('receiptPrintStatus');
  if (!statusEl) return;
  statusEl.textContent = 'ဘေလ်ကို သိမ်းနေသည်…';
  try {
    const base64 = dataUrl.split(',')[1];
    const upload = await api('/admin/uploads', {
      method: 'POST',
      body: { filename: `receipt-${Date.now()}.png`, contentType: 'image/png', data: base64 },
    });
    await api(`/admin/stores/${state.storeId}/print-jobs`, { method: 'POST', body: { image_url: upload.url } });
    statusEl.textContent = 'ဘေလ်သိမ်းပြီး ပရင့်ထုတ်ရန် ပေးပို့ပြီးပါပြီ။';
  } catch (err) {
    statusEl.textContent = `ဘေလ်ကို စက်ထဲသိမ်းပြီးပါပြီ၊ ပရင့်မပို့နိုင်ပါ: ${err.message}`;
  }
}

// Re-fetches immediately after an action instead of waiting for the
// next 5s poll tick, without re-triggering the new-order alert for
// orders we already know about.
async function refreshLiveOrdersNow() {
  try {
    const data = await api(`/admin/stores/${state.storeId}/live-orders`);
    data.orders.forEach((o) => notifiedIds.add(o.id));
    renderLiveOrdersList(data.orders);
  } catch (err) {
    document.getElementById('liveOrdersList').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}


// ============================================================
// Analytics — daily revenue and best sellers
// ============================================================
async function renderAnalytics(days = 7) {
  if (state.features.analytics !== true) { setContent(`<h1>Analytics</h1><div class="state-message">This feature isn't enabled for your account yet. Contact the platform operator.</div>`); return; }
  if (!state.storeId) { setContent(`<h1>Analytics</h1><div class="state-message">Select a store first.</div>`); return; }

  setContent(`
    <h1>Analytics</h1>
    <div class="subtitle">Excludes voided/refunded orders.</div>
    <div style="display:flex;gap:8px;margin-bottom:20px;">
      <button class="btn ${days === 7 ? '' : 'secondary'}" id="range7">7 days</button>
      <button class="btn ${days === 30 ? '' : 'secondary'}" id="range30">30 days</button>
      <button class="btn ${days === 90 ? '' : 'secondary'}" id="range90">90 days</button>
    </div>
    <div id="analyticsContent">Loading…</div>
  `);

  document.getElementById('range7').addEventListener('click', () => renderAnalytics(7));
  document.getElementById('range30').addEventListener('click', () => renderAnalytics(30));
  document.getElementById('range90').addEventListener('click', () => renderAnalytics(90));

  try {
    const data = await api(`/admin/stores/${state.storeId}/analytics?days=${days}`);
    const el = document.getElementById('analyticsContent');

    const maxRevenue = Math.max(1, ...data.daily_revenue.map((d) => Number(d.revenue)));
    const barsHtml = data.daily_revenue.map((d) => {
      const heightPct = Math.max(4, (Number(d.revenue) / maxRevenue) * 100);
      const label = new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;">
          <div style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;">${Number(d.revenue).toLocaleString()}</div>
          <div style="width:100%;height:120px;display:flex;align-items:flex-end;">
            <div style="width:100%;height:${heightPct}%;background:var(--red);border-radius:4px 4px 0 0;"></div>
          </div>
          <div style="font-size:0.68rem;color:var(--text-muted);">${label}</div>
        </div>
      `;
    }).join('');

    const bestSellersRows = data.best_sellers.map((b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(b.name)}</td>
        <td>${b.qty_sold}</td>
        <td>${Number(b.revenue).toLocaleString()} MMK</td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div style="display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap;">
        <div class="card" style="flex:1;min-width:150px;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Total revenue</div>
          <div style="font-size:1.4rem;font-weight:700;">${Number(data.summary.total_revenue).toLocaleString()} MMK</div>
        </div>
        <div class="card" style="flex:1;min-width:150px;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Orders</div>
          <div style="font-size:1.4rem;font-weight:700;">${data.summary.total_orders}</div>
        </div>
        <div class="card" style="flex:1;min-width:150px;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Avg order value</div>
          <div style="font-size:1.4rem;font-weight:700;">${Math.round(Number(data.summary.avg_order_value)).toLocaleString()} MMK</div>
        </div>
      </div>

      <div class="card">
        <div style="font-weight:600;margin-bottom:14px;">Daily revenue</div>
        ${data.daily_revenue.length === 0
          ? `<div class="state-message">No orders in this range yet.</div>`
          : `<div style="display:flex;gap:6px;align-items:flex-end;">${barsHtml}</div>`}
      </div>

      <div class="card">
        <div style="font-weight:600;margin-bottom:10px;">Best sellers</div>
        ${data.best_sellers.length === 0
          ? `<div class="state-message">No sales in this range yet.</div>`
          : `<table><thead><tr><th>#</th><th>Product</th><th>Qty sold</th><th>Revenue</th></tr></thead><tbody>${bestSellersRows}</tbody></table>`}
      </div>
    `;
  } catch (err) {
    document.getElementById('analyticsContent').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}


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
// Google sign-in (Supabase Auth) plumbing
// ============================================================
let _supabaseClient;
function getSupabaseClient() {
  if (_supabaseClient !== undefined) return _supabaseClient;
  const cfg = window.POS_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || typeof window.supabase === 'undefined') {
    _supabaseClient = null;
  } else {
    _supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }
  return _supabaseClient;
}

// Called at boot. If the browser just came back from Google's OAuth
// redirect, Supabase's client picks up the session automatically from
// the URL — we just need to hand its access token to our own
// /auth/google-exchange to get our app's JWT (same shape as a normal
// email/password login from there on).
async function tryGoogleSessionExchange() {
  const supa = getSupabaseClient();
  if (!supa) return { ok: false };

  const { data } = await supa.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (!accessToken) return { ok: false }; // not returning from a Google redirect — normal case, not an error

  try {
    const result = await api('/auth/google-exchange', { method: 'POST', body: { supabase_access_token: accessToken } });
    persist('token', result.token);
    persist('user', result.user);
    state.stores = result.stores.map((s) => ({ id: s.store_id, name: s.store_name, my_role: s.role }));
    await supa.auth.signOut(); // done with the Supabase session; our own JWT drives the app from here
    return { ok: true };
  } catch (err) {
    console.error('[auth] google exchange failed:', err.message);
    return { ok: false, error: err.message };
  }
}

// ============================================================
// PWA install support
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('[sw] registration failed:', err.message));
  });
}

// ============================================================
// Boot
// ============================================================
async function boot() {
  if (state.token && state.user) {
    try {
      const data = await api('/admin/stores');
      state.stores = data.stores;
      await loadTenantFeatures();
      switchTab('business');
      return;
    } catch (err) {
      // falls through to login below
    }
  }

  const result = await tryGoogleSessionExchange();
  if (result.ok) {
    await loadTenantFeatures();
    switchTab('business');
    return;
  }

  switchTab('login');
  // Surfaced only if a Google sign-in actually happened and failed —
  // never shown on a plain first visit, since result.error is only
  // set inside the catch block above.
  if (result.error) {
    const resultEl = document.getElementById('loginResult');
    if (resultEl) resultEl.innerHTML = `<span style="color:#A6301F">Google sign-in failed: ${escapeHtml(result.error)}</span>`;
  }
  switchTab('login');
}

boot();
