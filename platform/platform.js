// ============================================================
// State — entirely separate from the owner app's localStorage keys,
// so there's zero overlap even though both apps share a deployment.
// ============================================================
const state = {
  apiBase: localStorage.getItem('platformApiBase') || (window.POS_CONFIG && window.POS_CONFIG.CLOUD_API_BASE) || '',
  token: localStorage.getItem('platformToken') || '',
  admin: JSON.parse(localStorage.getItem('platformAdmin') || 'null'),
  featureKeys: [],
  expandedTenantId: null,
};

function persist(key, value) {
  state[key] = value;
  localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : (value || ''));
}

function logout() {
  ['platformToken', 'platformAdmin'].forEach((k) => localStorage.removeItem(k));
  state.token = '';
  state.admin = null;
  switchTab('login');
}

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
const TABS = { login: renderLogin, tenants: renderTenants, plans: renderPlans };

function switchTab(tab) {
  if (tab !== 'login' && !state.token) tab = 'login';
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
  updateContextBar();
  TABS[tab]();
}
document.querySelectorAll('.nav-item[data-tab]').forEach((el) => el.addEventListener('click', () => switchTab(el.dataset.tab)));

function updateContextBar() {
  document.getElementById('contextBar').innerHTML = state.admin ? `
    ${escapeHtml(state.admin.email)}<br>
    <a href="#" id="logoutLink" style="color:var(--gold)">Log out</a>
  ` : '';
  document.getElementById('logoutLink')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

function setContent(html) { document.getElementById('content').innerHTML = html; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }

// ============================================================
// Login — no sign-up screen here on purpose. Accounts are created by
// running create-platform-admin.sql directly against the database
// (see the root README), not through this app.
// ============================================================
function renderLogin() {
  setContent(`
    <h1>Platform admin</h1>
    <div class="subtitle">Operator-only. Not reachable from the shop-owner app.</div>
    <div class="card" style="max-width:420px;">
      <div class="field"><label>Cloud API URL</label><input id="apiBaseInput" value="${escapeHtml(state.apiBase)}" placeholder="https://your-api.vercel.app"></div>
      <div class="field"><label>Email</label><input id="loginEmail"></div>
      <div class="field"><label>Password</label><input id="loginPassword" type="password"></div>
      <button class="btn" id="loginBtn">Log in</button>
      <div id="loginResult" style="margin-top:12px;"></div>
      <div class="subtitle" style="margin-top:16px;">No account yet? Run create-platform-admin.sql against your database — see the root README.</div>
    </div>
  `);

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const cleanUrl = document.getElementById('apiBaseInput').value.replace(/\/$/, '');
    persist('platformApiBase', cleanUrl);
    state.apiBase = cleanUrl;
    const resultEl = document.getElementById('loginResult');
    try {
      const data = await api('/platform/auth/login', {
        method: 'POST',
        body: { email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value },
      });
      persist('platformToken', data.token);
      persist('platformAdmin', data.admin);
      switchTab('tenants');
    } catch (err) {
      resultEl.innerHTML = `<span style="color:#A6301F">${escapeHtml(err.message)}</span>`;
    }
  });
}

// ============================================================
// Tenants & accounts — combined screen: subscription status, feature
// permissions, and (expandable per tenant) individual account
// management (activate/deactivate, reset password).
// ============================================================
const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'suspended', 'cancelled'];

async function renderTenants() {
  setContent(`<h1>Tenants &amp; accounts</h1><div class="subtitle">Every business on the platform.</div><div id="tenantsList">Loading…</div>`);

  try {
    if (state.featureKeys.length === 0) {
      const featData = await api('/platform/features');
      state.featureKeys = featData.features;
    }
    const data = await api('/platform/tenants');
    renderTenantsList(data.tenants);
  } catch (err) {
    document.getElementById('tenantsList').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

function renderTenantsList(tenants) {
  const listEl = document.getElementById('tenantsList');
  listEl.innerHTML = tenants.map((t) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <div style="font-weight:700;">${escapeHtml(t.business_name)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">${t.store_count} store(s) — ${escapeHtml(t.contact_email || 'no contact email')}</div>
        </div>
        <span class="pill ${t.subscription_status === 'active' ? 'synced' : t.subscription_status === 'trial' ? 'pending' : ''}">${escapeHtml(t.subscription_status)}</span>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;align-items:center;">
        <select id="statusSelect-${t.id}">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === t.subscription_status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn secondary save-tenant-status" data-id="${t.id}">Save status</button>
      </div>

      <div style="margin-top:14px;">
        <div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;">Feature permissions</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          ${state.featureKeys.map((key) => `
            <label style="font-size:0.85rem;display:flex;align-items:center;gap:6px;">
              <input type="checkbox" class="feature-checkbox" data-tenant="${t.id}" data-key="${key}" ${t.feature_overrides?.[key] === true ? 'checked' : ''}>
              ${escapeHtml(key)}
            </label>
          `).join('')}
        </div>
        <button class="btn secondary save-features" data-id="${t.id}" style="margin-top:8px;">Save features</button>
      </div>

      <button class="btn secondary toggle-accounts" data-id="${t.id}" style="margin-top:14px;">
        ${state.expandedTenantId === t.id ? 'Hide accounts' : 'Manage accounts'}
      </button>
      <div id="accounts-${t.id}" ${state.expandedTenantId === t.id ? '' : 'hidden'} style="margin-top:12px;"></div>
    </div>
  `).join('');

  listEl.querySelectorAll('.save-tenant-status').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = document.getElementById(`statusSelect-${btn.dataset.id}`).value;
      await api(`/platform/tenants/${btn.dataset.id}`, { method: 'PATCH', body: { subscription_status: status } });
      renderTenants();
    });
  });

  listEl.querySelectorAll('.save-features').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const overrides = {};
      listEl.querySelectorAll(`.feature-checkbox[data-tenant="${btn.dataset.id}"]`).forEach((cb) => {
        overrides[cb.dataset.key] = cb.checked;
      });
      await api(`/platform/tenants/${btn.dataset.id}`, { method: 'PATCH', body: { feature_overrides: overrides } });
      const status = document.getElementById(`statusSelect-${btn.dataset.id}`);
      status.insertAdjacentHTML('afterend', ' <span style="color:#2C5A28;font-size:0.8rem;">Saved.</span>');
    });
  });

  listEl.querySelectorAll('.toggle-accounts').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const panel = document.getElementById(`accounts-${btn.dataset.id}`);
      if (state.expandedTenantId === btn.dataset.id) {
        state.expandedTenantId = null;
        renderTenants();
        return;
      }
      state.expandedTenantId = btn.dataset.id;
      panel.hidden = false;
      panel.innerHTML = 'Loading…';
      btn.textContent = 'Hide accounts';
      try {
        const data = await api(`/platform/tenants/${btn.dataset.id}/users`);
        renderAccountsPanel(panel, btn.dataset.id, data.users);
      } catch (err) {
        panel.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
      }
    });
  });
}

function renderAccountsPanel(panel, tenantId, users) {
  panel.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Sign-in</th><th>Stores</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email || '—')}</td>
            <td>${escapeHtml(u.auth_provider)}</td>
            <td>${u.stores.map((s) => `${escapeHtml(s.store_name)} (${escapeHtml(s.role)})`).join(', ') || '—'}</td>
            <td><span class="pill ${u.is_active ? 'synced' : 'pending'}">${u.is_active ? 'active' : 'deactivated'}</span></td>
            <td>
              <button class="btn secondary toggle-active" data-id="${u.id}" data-active="${u.is_active}">${u.is_active ? 'Deactivate' : 'Activate'}</button>
              <button class="btn secondary reset-pw" data-id="${u.id}">Reset password</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  panel.querySelectorAll('.toggle-active').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextActive = btn.dataset.active !== 'true';
      await api(`/platform/users/${btn.dataset.id}`, { method: 'PATCH', body: { is_active: nextActive } });
      const data = await api(`/platform/tenants/${tenantId}/users`);
      renderAccountsPanel(panel, tenantId, data.users);
    });
  });

  panel.querySelectorAll('.reset-pw').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newPassword = prompt('New password for this account (they should change it after logging in):');
      if (!newPassword) return;
      await api(`/platform/users/${btn.dataset.id}`, { method: 'PATCH', body: { new_password: newPassword } });
      alert('Password reset. Share it with the account holder directly.');
    });
  });
}

// ============================================================
// Subscription plans — descriptive/billing definitions. Not what's
// actually enforced (that's feature_overrides above); see cloud-api's
// README for the distinction.
// ============================================================
async function renderPlans() {
  setContent(`
    <h1>Subscription plans</h1>
    <div class="card">
      <div class="field"><label>Name</label><input id="planName"></div>
      <div class="field"><label>Price (MMK)</label><input id="planPrice" type="number"></div>
      <div class="field"><label>Billing cycle</label>
        <select id="planCycle"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
      </div>
      <div class="field"><label>Max stores (blank = unlimited)</label><input id="planMaxStores" type="number"></div>
      <button class="btn" id="createPlanBtn">Add plan</button>
    </div>
    <div id="plansList">Loading…</div>
  `);

  document.getElementById('createPlanBtn').addEventListener('click', async () => {
    const name = document.getElementById('planName').value.trim();
    const price_mmk = Number(document.getElementById('planPrice').value);
    if (!name || !price_mmk) return;
    await api('/platform/plans', {
      method: 'POST',
      body: {
        name, price_mmk,
        billing_cycle: document.getElementById('planCycle').value,
        max_stores: document.getElementById('planMaxStores').value ? Number(document.getElementById('planMaxStores').value) : null,
      },
    });
    renderPlans();
  });

  try {
    const data = await api('/platform/plans');
    document.getElementById('plansList').innerHTML = data.plans.length === 0
      ? `<div class="state-message">No plans yet.</div>`
      : `<table><thead><tr><th>Name</th><th>Price</th><th>Cycle</th><th>Max stores</th></tr></thead><tbody>${
          data.plans.map((p) => `
            <tr><td>${escapeHtml(p.name)}</td><td>${Number(p.price_mmk).toLocaleString()} MMK</td><td>${escapeHtml(p.billing_cycle)}</td><td>${p.max_stores ?? 'Unlimited'}</td></tr>
          `).join('')
        }</tbody></table>`;
  } catch (err) {
    document.getElementById('plansList').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// Boot
// ============================================================
if (state.token && state.admin) {
  switchTab('tenants');
} else {
  switchTab('login');
}
