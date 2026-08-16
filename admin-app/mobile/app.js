// ============================================================
// POS Admin — mobile (Android, via Capacitor)
//
// A deliberately smaller app than the desktop dashboard (../app.js):
// three tabs only (Home/Products/Settings), no Stores/Hub setup/Staff/
// QR codes, and nothing links to /platform. Those stay desktop-only —
// they're one-time setup tasks that are easier with a bigger screen
// and a keyboard, not things an owner reaches for mid-shift on a
// phone. Same cloud-api backend and the same brand palette as the
// desktop app, just a different shape.
//
// No bundler, same as the desktop app — Capacitor plugins are reached
// through the auto-injected `window.Capacitor.Plugins` global instead
// of an import statement, so this stays plain script tags. Everything
// here also degrades gracefully in a plain desktop browser (for local
// testing) since every native call is guarded by isNative()/getPlugin().
// ============================================================

// ============================================================
// State
// ============================================================
const state = {
  apiBase: localStorage.getItem('apiBase') || (window.POS_CONFIG && window.POS_CONFIG.CLOUD_API_BASE) || '',
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: null,
  features: {}, // tenant.feature_overrides — gates Home (live_orders) and Analytics, same as desktop
  stores: [],
  storeId: localStorage.getItem('storeId') || '',
  categories: [],
  products: [],
};

function persist(key, value) {
  state[key] = value;
  localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : (value || ''));
}

// Best-effort device unregister so a signed-out phone stops getting
// this user's order alerts. Deliberately a raw fetch, not api() —
// api() calls logout() on a 401, and routing this particular call
// through api() would risk a logout()-calls-api()-calls-logout() loop
// if the token already expired.
async function logout() {
  const pushToken = localStorage.getItem('pushToken');
  if (pushToken && state.token) {
    try {
      await fetch(`${state.apiBase}/admin/push-tokens/${encodeURIComponent(pushToken)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` },
      });
    } catch (err) { /* best-effort — a stale token left server-side is harmless */ }
  }
  ['token', 'user', 'storeId', 'pushToken'].forEach((k) => localStorage.removeItem(k));
  state.token = '';
  state.user = null;
  state.storeId = '';
  state.features = {};
  state.stores = [];
  document.body.classList.remove('authed');
  switchTab('login');
}

// ============================================================
// API helper — same shape as the desktop app's
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
    await logout();
    throw new Error('Session expired — please log in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setContent(html) { document.getElementById('content').innerHTML = html; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }
function myRole() {
  const store = state.stores.find((s) => s.id === state.storeId);
  return store ? store.my_role : null;
}
// Products/Categories/uploads are gated server-side by requireTenantRole
// (owner/manager at *any* store in the tenant, not necessarily the one
// currently selected) — mirrors that exactly, so someone who's a
// manager at one store but only cashier at the currently-selected one
// still sees the controls that will actually work for them.
function hasTenantRole(roles) {
  return state.stores.some((s) => roles.includes(s.my_role));
}
function noStoreMessageHtml() {
  return state.stores.length === 0
    ? `<div class="state-message">No store set up yet. Create one from the desktop dashboard, then come back here.</div>`
    : `<div class="state-message">Select a store first.</div>`;
}

// ============================================================
// Toast
// ============================================================
let toastTimeout = null;
function toast(message, isError = false) {
  document.getElementById('activeToast')?.remove();
  clearTimeout(toastTimeout);
  const el = document.createElement('div');
  el.id = 'activeToast';
  el.className = `toast${isError ? ' error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  toastTimeout = setTimeout(() => el.remove(), 2600);
}

// ============================================================
// Bottom sheet (add/edit forms, store picker)
// ============================================================
function openSheet(title, bodyHtml) {
  closeSheet();
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.id = 'activeSheetOverlay';
  overlay.addEventListener('click', closeSheet);

  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.id = 'activeSheet';
  sheet.addEventListener('click', (e) => e.stopPropagation());
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-header"><h2>${escapeHtml(title)}</h2><button class="sheet-close" id="sheetCloseBtn">&times;</button></div>
    <div id="sheetBody">${bodyHtml}</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
  document.getElementById('sheetCloseBtn').addEventListener('click', closeSheet);
  return sheet;
}
function closeSheet() {
  document.getElementById('activeSheetOverlay')?.remove();
  document.getElementById('activeSheet')?.remove();
}

// ============================================================
// Floating action button — only Products/Categories use it
// ============================================================
function setFab(onClick) {
  removeFab();
  if (!onClick) return;
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.id = 'activeFab';
  fab.textContent = '+';
  fab.addEventListener('click', onClick);
  document.getElementById('app').appendChild(fab);
}
function removeFab() { document.getElementById('activeFab')?.remove(); }

// ============================================================
// Native helpers — Capacitor plugins via the global, no bundler.
// Every call site is guarded so this file still runs (minus native
// features) if opened in a plain browser for local testing.
// ============================================================
function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}
function getPlugin(name) {
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];
}

function wireBackButton() {
  const AppPlugin = getPlugin('App');
  if (!AppPlugin) return;
  AppPlugin.addListener('backButton', () => {
    if (document.getElementById('activeSheet')) { closeSheet(); return; }
    if (state.token && activeTab !== 'home') { switchTab('home'); return; }
    AppPlugin.exitApp();
  });
}

// Refreshes live orders the moment the app comes back to the
// foreground, rather than waiting for the next 5s poll tick.
function wireAppStateHandling() {
  const AppPlugin = getPlugin('App');
  if (!AppPlugin) return;
  AppPlugin.addListener('appStateChange', ({ isActive }) => {
    if (isActive && state.token && activeTab === 'home') refreshLiveOrdersNow();
  });
}

async function pushPermissionGranted() {
  const Push = getPlugin('PushNotifications');
  if (!isNative() || !Push) return false;
  try {
    const perm = await Push.checkPermissions();
    return perm.receive === 'granted';
  } catch (err) {
    return false;
  }
}

let pushListenersWired = false;
// manual=true means a person tapped "Enable order notifications"
// themselves (Settings) — worth a toast either way. manual=false
// (called right after login) stays silent so it doesn't nag someone
// who already said no.
async function registerPush(manual = false) {
  if (!isNative()) return;
  const Push = getPlugin('PushNotifications');
  if (!Push) return;

  try {
    let status = (await Push.checkPermissions()).receive;
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      status = (await Push.requestPermissions()).receive;
    }
    if (status !== 'granted') {
      if (manual) toast("Notifications are off — enable them in the phone's Settings app.", true);
      return;
    }

    if (Push.createChannel) {
      await Push.createChannel({
        id: 'admin_orders_high',
        name: 'Order alerts',
        description: 'Immediate customer order and service-request alerts',
        importance: 5,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#F59E0B',
      });
    }

    if (!pushListenersWired) {
      pushListenersWired = true;
      Push.addListener('registration', async (tokenResult) => {
        try {
          await api('/admin/push-tokens', { method: 'POST', body: { token: tokenResult.value, platform: 'android' } });
          localStorage.setItem('pushToken', tokenResult.value);
        } catch (err) {
          console.error('[push] token registration failed:', err.message);
        }
      });
      Push.addListener('registrationError', (err) => console.error('[push] registration error:', JSON.stringify(err)));
      Push.addListener('pushNotificationReceived', (notification) => {
        const data = notification?.data || {};
        const table = data.table_number ? `စားပွဲအမှတ် ${data.table_number}` : 'အော်ဒါအသစ်';
        toast(notification?.title || `${table} မှ အကြောင်းကြားချက်ရှိပါသည်`);
        if (activeTab === 'home') {
          playAlertBeep();
          refreshLiveOrdersNow();
        }
      });
      // Tapping a notification (app backgrounded/killed) jumps straight
      // to the live-orders list, since that's the only kind of push
      // this app sends today.
      Push.addListener('pushNotificationActionPerformed', (event) => {
        if (state.token) switchTab('home');
        const data = event?.notification?.data || {};
        if (data.type === 'service_request') {
          toast(data.request_type === 'bill' ? `စားပွဲအမှတ် ${data.table_number} မှ ဘေလ်တောင်းနေပါသည်` : `စားပွဲအမှတ် ${data.table_number} မှ ဝန်ထမ်းခေါ်နေပါသည်`);
        }
      });
    }

    await Push.register();
    if (manual) toast('Order notifications enabled');
  } catch (err) {
    console.error('[push] setup failed:', err.message);
    if (manual) toast('Could not enable notifications', true);
  }
}

function ensureAudioCtx() {
  if (!alertAudioCtx) {
    try { alertAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { /* beep just won't play — not fatal */ }
  }
}

// ============================================================
// Navigation — bottom tabs
// ============================================================
const TABS = { login: renderLogin, home: renderHome, products: renderProductsTab, settings: renderSettingsTab };
let activeTab = 'home';
let pollInterval = null;

function switchTab(tab) {
  if (tab !== 'login' && !state.token) tab = 'login';
  activeTab = tab;
  clearInterval(pollInterval);
  pollInterval = null;
  stopNewOrderAlert();
  removeFab();
  closeSheet();
  document.querySelectorAll('.tab-btn').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
  updateStoreChip();
  (TABS[tab] || TABS.home)();
}

document.querySelectorAll('.tab-btn[data-tab]').forEach((el) => {
  el.addEventListener('click', () => { ensureAudioCtx(); switchTab(el.dataset.tab); });
});

// ============================================================
// Store chip (top bar) + store picker sheet
// ============================================================
function updateStoreChip() {
  const chip = document.getElementById('storeChip');
  if (!state.token) { chip.hidden = true; return; }
  const store = state.stores.find((s) => s.id === state.storeId);
  if (store) {
    chip.hidden = false;
    chip.textContent = state.stores.length > 1 ? `${store.name} \u25BE` : store.name;
    chip.onclick = state.stores.length > 1 ? openStorePicker : null;
  } else if (state.stores.length > 0) {
    chip.hidden = false;
    chip.textContent = 'Choose store \u25BE';
    chip.onclick = openStorePicker;
  } else {
    chip.hidden = true;
  }
}

function openStorePicker() {
  openSheet('Choose a store', `
    <div>${state.stores.map((s) => `
      <div class="store-option ${s.id === state.storeId ? 'selected' : ''}" data-id="${s.id}">
        <div><div class="store-name">${escapeHtml(s.name)}</div><div class="store-role">${escapeHtml(s.my_role || '')}</div></div>
        ${s.id === state.storeId ? '&#10003;' : ''}
      </div>
    `).join('')}</div>
  `);
  document.querySelectorAll('.store-option').forEach((row) => {
    row.addEventListener('click', () => {
      persist('storeId', row.dataset.id);
      closeSheet();
      switchTab(activeTab);
    });
  });
}

// ============================================================
// Login
// ============================================================
function renderLogin() {
  document.body.classList.remove('authed');
  setContent(`
    <div class="login-screen">
      <div class="brand-mark">
        <div class="name">POS Admin</div>
        <div class="tagline">Live orders, products, and settings — in your pocket.</div>
      </div>
      <div class="card">
        <div class="field"><label>Cloud API URL</label><input id="apiBaseInput" value="${escapeHtml(state.apiBase)}" placeholder="https://your-api.vercel.app"></div>
        <div class="field"><label>Email</label><input id="loginEmail" type="email" autocomplete="username" autocapitalize="none"></div>
        <div class="field"><label>Password</label><input id="loginPassword" type="password" autocomplete="current-password"></div>
        <button class="btn" id="loginBtn">Log in</button>
        <div id="loginResult" style="margin-top:12px;"></div>
      </div>
      <div class="mini-note">Signed in with Google on the desktop dashboard? This app uses email + password — ask an owner or the platform operator to set a password on your account first.</div>
    </div>
  `);

  document.getElementById('loginBtn').addEventListener('click', async () => {
    ensureAudioCtx();
    persist('apiBase', document.getElementById('apiBaseInput').value.trim().replace(/\/$/, ''));
    const resultEl = document.getElementById('loginResult');
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: {
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPassword').value,
        },
      });
      persist('token', data.token);
      persist('user', data.user);
      state.stores = data.stores.map((s) => ({ id: s.store_id, name: s.store_name, my_role: s.role }));
      if (!state.storeId && state.stores.length > 0) persist('storeId', state.stores[0].id);
      await loadTenantFeatures();
      document.body.classList.add('authed');
      switchTab('home');
      registerPush();
    } catch (err) {
      resultEl.innerHTML = `<span style="color:var(--red)">${escapeHtml(err.message)}</span>`;
      btn.disabled = false;
    }
  });
}

async function loadTenantFeatures() {
  try {
    const tenant = await api('/admin/tenants/me');
    state.tenant = tenant;
    state.features = tenant.feature_overrides || {};
  } catch (err) {
    console.error('[features] failed to load tenant features:', err.message);
  }
}

// ============================================================
// Home — live orders
// ============================================================
let notifiedIds = new Set();
let alertAudioCtx = null;
let alertLoopInterval = null;

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

// Foreground-only fallback (beep + banner) for while the app is open
// on the Home tab. Push notifications (registerPush(), above) are
// what cover the app being backgrounded or closed — that's real FCM
// push, not this.
function startNewOrderAlert(count) {
  document.getElementById('newOrderBanner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'newOrderBanner';
  banner.className = 'new-order-banner';
  banner.innerHTML = `<span>${count} new order${count > 1 ? 's' : ''}</span><button id="dismissNewOrderBanner">Dismiss</button>`;
  document.getElementById('content').prepend(banner);
  document.getElementById('dismissNewOrderBanner').addEventListener('click', stopNewOrderAlert);

  playAlertBeep();
  clearInterval(alertLoopInterval);
  alertLoopInterval = setInterval(playAlertBeep, 1400);
}
function stopNewOrderAlert() {
  document.getElementById('newOrderBanner')?.remove();
  clearInterval(alertLoopInterval);
  alertLoopInterval = null;
}

function updateHomeBadge(count) {
  const tabBtn = document.querySelector('.tab-btn[data-tab="home"]');
  if (!tabBtn) return;
  let badge = tabBtn.querySelector('.tab-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      tabBtn.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : String(count);
  } else {
    badge?.remove();
  }
}

async function renderHome() {
  stopNewOrderAlert();

  if (state.features.live_orders !== true) {
    setContent(`<h1>Live orders</h1><div class="state-message">This feature isn't enabled for your account yet. Contact the platform operator.</div>`);
    return;
  }
  if (!state.storeId) {
    setContent(`
      <h1>Live orders</h1>
      ${noStoreMessageHtml()}
      ${state.stores.length > 0 ? `<button class="btn" id="pickStoreBtn">Choose a store</button>` : ''}
    `);
    document.getElementById('pickStoreBtn')?.addEventListener('click', openStorePicker);
    return;
  }

  notifiedIds = new Set();
  setContent(`
    <h1>တိုက်ရိုက်အော်ဒါများ</h1>
    <div class="subtitle">အလိုအလျောက် အပ်ဒိတ်လုပ်ပါမည်။</div>
    <div class="android-service-request-box">
      <div class="android-section-title">ဝန်ဆောင်မှု တောင်းဆိုချက်များ</div>
      <div id="androidServiceRequestsList"><div class="state-message">ဖတ်နေသည်…</div></div>
    </div>
    <div class="android-section-title" style="margin-top:18px;">အော်ဒါများ</div>
    <div id="liveOrdersList"><div class="skeleton"></div><div class="skeleton"></div></div>
  `);

  let firstLoad = true;
  const load = async () => {
    try {
      const data = await api(`/admin/stores/${state.storeId}/live-orders`);
      await refreshAndroidServiceRequests();
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
      updateHomeBadge(data.orders.length);
      renderLiveOrdersList(data.orders);
    } catch (err) {
      const el = document.getElementById('liveOrdersList');
      if (el) el.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
    }
  };

  await load();
  clearInterval(pollInterval);
  pollInterval = setInterval(load, 5000);
}

async function saveMobileReceiptImage(order) {
  if (!order) throw new Error('Order data is unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 150 + order.items.length * 24;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('RECEIPT', 192, 28);
  ctx.font = '14px monospace';
  ctx.fillText(order.table_number ? `Table ${order.table_number}` : 'Takeaway', 192, 50);
  ctx.textAlign = 'left';
  let y = 82;
  order.items.forEach((item) => {
    ctx.fillText(`${item.qty} x ${item.product_name_snapshot}`, 16, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(item.line_total), 368, y);
    ctx.textAlign = 'left';
    y += 24;
  });
  ctx.beginPath(); ctx.moveTo(16, y + 4); ctx.lineTo(368, y + 4); ctx.stroke();
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Total', 16, y + 30);
  ctx.textAlign = 'right';
  ctx.fillText(String(order.total), 368, y + 30);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `receipt-${order.table_number || 'takeaway'}-${Date.now()}.png`;
  link.click();
}
function aggregateMobileReceiptItems(orders) {
  const groups = new Map();
  for (const order of orders || []) {
    for (const item of order.items || []) {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unit_price || 0);
      const notes = item.notes || '';
      const key = `${item.product_id || item.product_name_snapshot}|${unitPrice}|${notes}`;
      const existing = groups.get(key);
      if (existing) {
        existing.qty += qty;
        existing.line_total += Number(item.line_total || qty * unitPrice);
      } else {
        groups.set(key, { product_name_snapshot: item.product_name_snapshot, qty, unit_price: unitPrice, line_total: Number(item.line_total || qty * unitPrice), notes: notes || null });
      }
    }
  }
  return Array.from(groups.values());
}

function showMobileReceiptPreview(tableNumber, orders) {
  const items = aggregateMobileReceiptItems(orders);
  const total = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const lines = items.map((item) => `<div class="receipt-line"><span>${item.qty} × ${escapeHtml(item.product_name_snapshot)}${item.notes ? `<small> (${escapeHtml(item.notes)})</small>` : ''}</span><strong>${item.line_total.toLocaleString()} MMK</strong></div>`).join('');
  openSheet(`စားပွဲ ${escapeHtml(tableNumber || '')} ဘေလ်`, `<div class="mobile-receipt-preview">${lines}<hr><div class="receipt-total"><strong>စုစုပေါင်း</strong><strong>${total.toLocaleString()} MMK</strong></div><p class="state-message">Confirm payment ပြီးနောက် ပြင်ဆင်ထားသော order များကို စုစည်းပြထားခြင်း ဖြစ်ပါသည်။</p></div>`);
}

function renderLiveOrdersList(orders) {
  const listEl = document.getElementById('liveOrdersList');
  if (!listEl) return;
  if (orders.length === 0) {
    listEl.innerHTML = `<div class="state-message">No open orders right now.</div>`;
    return;
  }

  const canConfirmPayment = ['owner', 'manager', 'cashier'].includes(myRole());

  listEl.innerHTML = orders.map((o) => {
    const pendingPayment = o.payments.some((p) => p.status === 'pending');
    const prepared = Boolean(o.prepared_at);
    const itemsHtml = o.items.map((i) => `
      <div class="order-item-line" style="display:flex;justify-content:space-between;gap:8px;">
        <span>${i.qty} &times; ${escapeHtml(i.product_name_snapshot)} <small>(${Number(i.unit_price || 0).toLocaleString()} MMK)</small></span>
        <strong>${Number(i.line_total || 0).toLocaleString()} MMK</strong>
        ${i.notes ? `<div class="note">မှတ်ချက်: ${escapeHtml(i.notes)}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <div class="order-table">${o.table_number ? `Table ${escapeHtml(o.table_number)}` : escapeHtml(o.channel)}</div>
            <div class="order-time">${new Date(o.created_at).toLocaleTimeString()}</div>
          </div>
          ${!prepared ? `<span class="pill awaiting">Customer ordered</span>` : pendingPayment ? `<span class="pill awaiting">Prepared</span>` : `<span class="pill paid">Payment confirmed</span>`}
        </div>
        <div>${itemsHtml}</div>
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn secondary small android-prepared-btn" data-id="${o.id}" ${prepared ? 'disabled' : ''}>${prepared ? 'Prepared ✓' : 'Prepared'}</button>
          ${canConfirmPayment ? `<button class="btn secondary small android-confirm-payment-btn" data-id="${o.id}" ${!prepared || !pendingPayment ? 'disabled' : ''}>Confirm payment</button>` : ''}
          <button class="btn small android-complete-btn" data-id="${o.id}" ${!prepared || pendingPayment ? 'disabled' : ''}>Mark as complete</button>
        </div>
        <div class="action-error" id="order-error-${o.id}"></div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.android-prepared-btn').forEach((btn) => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await api(`/admin/orders/${btn.dataset.id}/prepared`, { method: 'POST' }); await refreshLiveOrdersNow(); }
    catch (err) { btn.disabled = false; document.getElementById(`order-error-${btn.dataset.id}`).textContent = `Prepared failed: ${err.message}`; }
  }));
  listEl.querySelectorAll('.android-confirm-payment-btn').forEach((btn) => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const current = orders.find((item) => item.id === btn.dataset.id);
      const checkoutOrders = current?.table_number
        ? orders.filter((item) => item.table_number === current.table_number && item.prepared_at && item.payments.some((p) => p.status === 'pending'))
        : [current].filter(Boolean);
      for (const order of checkoutOrders) {
        await api(`/admin/orders/${order.id}/confirm-payment`, { method: 'POST' });
      }
      showMobileReceiptPreview(current?.table_number, checkoutOrders);
      toast('Payment confirmed');
      await refreshLiveOrdersNow();
    } catch (err) {
      btn.disabled = false;
      document.getElementById(`order-error-${btn.dataset.id}`).textContent = `Payment failed: ${err.message}`;
    }
  }));
  listEl.querySelectorAll('.android-complete-btn').forEach((btn) => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const order = orders.find((item) => item.id === btn.dataset.id);
      await saveMobileReceiptImage(order);
      await api(`/admin/orders/${btn.dataset.id}/status`, { method: 'POST', body: { status: 'completed' } });
      toast('Final confirmation saved');
      await refreshLiveOrdersNow();
    } catch (err) { btn.disabled = false; document.getElementById(`order-error-${btn.dataset.id}`).textContent = `Completion failed: ${err.message}`; }
  }));
  listEl.querySelectorAll('.complete-order-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api(`/admin/orders/${btn.dataset.id}/status`, { method: 'POST', body: { status: 'completed' } });
        toast('Order marked completed');
        await refreshLiveOrdersNow();
      } catch (err) {
        btn.disabled = false;
        const errEl = document.getElementById(`order-error-${btn.dataset.id}`);
        if (errEl) errEl.textContent = err.message;
      }
    });
  });
}

// Re-fetches immediately after an action (or on app resume) instead of
// waiting for the next 5s poll tick, without re-triggering the
// new-order alert for orders already known about.
async function refreshAndroidServiceRequests() {
  const list = document.getElementById('androidServiceRequestsList');
  if (!list || !state.storeId) return;
  try {
    const data = await api(`/admin/stores/${state.storeId}/service-requests`);
    if (!data.requests.length) {
      list.innerHTML = '<div class="state-message">လက်ရှိ တောင်းဆိုချက် မရှိသေးပါ။</div>';
      return;
    }
    list.innerHTML = data.requests.map((request) => `
      <div class="android-service-request-card">
        <div><strong>စားပွဲအမှတ် ${escapeHtml(request.table_number)}</strong><br><span>${request.request_type === 'bill' ? 'ဘေလ်တောင်းနေပါသည်' : 'ဝန်ထမ်းခေါ်နေပါသည်'}</span></div>
        <div class="btn-row">
          ${request.status === 'new' ? `<button class="btn secondary small android-ack-btn" data-id="${request.id}">လက်ခံပြီး</button>` : ''}
          <button class="btn small android-resolve-btn" data-id="${request.id}">ပြီးစီးပါပြီ</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.android-ack-btn').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      await api(`/admin/service-requests/${button.dataset.id}/acknowledge`, { method: 'POST' });
      refreshAndroidServiceRequests();
    }));
    list.querySelectorAll('.android-resolve-btn').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      await api(`/admin/service-requests/${button.dataset.id}/resolve`, { method: 'POST' });
      refreshAndroidServiceRequests();
    }));
  } catch (err) {
    list.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}
async function refreshLiveOrdersNow() {
  if (!state.storeId) return;
  try {
    const data = await api(`/admin/stores/${state.storeId}/live-orders`);
    data.orders.forEach((o) => notifiedIds.add(o.id));
    updateHomeBadge(data.orders.length);
    renderLiveOrdersList(data.orders);
  } catch (err) {
    const el = document.getElementById('liveOrdersList');
    if (el) el.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// Products tab — Products / Categories segments
// ============================================================
let productsSubTab = 'products';

async function renderProductsTab() {
  setContent(`
    <h1>Products</h1>
    <div class="segmented">
      <button class="${productsSubTab === 'products' ? 'active' : ''}" id="segProducts">Products</button>
      <button class="${productsSubTab === 'categories' ? 'active' : ''}" id="segCategories">Categories</button>
    </div>
    <div id="productsTabBody"><div class="skeleton"></div><div class="skeleton"></div></div>
  `);
  document.getElementById('segProducts').addEventListener('click', () => { productsSubTab = 'products'; renderProductsTab(); });
  document.getElementById('segCategories').addEventListener('click', () => { productsSubTab = 'categories'; renderProductsTab(); });

  if (productsSubTab === 'products') await renderProductsList();
  else await renderCategoriesList();
}

async function renderProductsList() {
  const body = document.getElementById('productsTabBody');
  try {
    const catData = await api('/admin/categories');
    state.categories = catData.categories;
    const data = await api(`/admin/products${state.storeId ? `?store_id=${state.storeId}` : ''}`);
    state.products = data.products;
  } catch (err) {
    body.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
    return;
  }

  const canManage = hasTenantRole(['owner', 'manager']);
  body.innerHTML = state.products.length === 0
    ? `<div class="state-message">No products yet${canManage ? ' — tap + to add one.' : '.'}</div>`
    : `<div class="card">${state.products.map((p) => `
        <div class="list-row">
          ${p.image_url ? `<img class="thumb" src="${escapeHtml(p.image_url)}">` : `<div class="thumb"></div>`}
          <div class="row-main">
            <div class="row-title">${escapeHtml(p.name)}</div>
            <div class="row-sub">${Number(p.price).toLocaleString()} MMK &middot; ${p.is_active ? 'Active' : 'Inactive'}${state.storeId && p.is_available === false ? ' &middot; Sold out' : ''}</div>
          </div>
          ${canManage ? `
            <div class="row-actions">
              ${state.storeId ? `<button class="icon-btn toggle-avail-btn" data-id="${p.id}" data-available="${p.is_available}" title="Toggle sold out">${p.is_available === false ? '\u21BB' : '\u26D4'}</button>` : ''}
              <button class="icon-btn edit-product-btn" data-id="${p.id}" title="Edit">\u270E</button>
            </div>
          ` : ''}
        </div>
      `).join('')}</div>`;

  body.querySelectorAll('.edit-product-btn').forEach((btn) => btn.addEventListener('click', () => openProductSheet(btn.dataset.id)));
  body.querySelectorAll('.toggle-avail-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextAvailable = btn.dataset.available !== 'true';
      try {
        await api(`/admin/stores/${state.storeId}/products/${btn.dataset.id}/availability`, { method: 'PATCH', body: { is_available: nextAvailable } });
        toast(nextAvailable ? 'Marked available' : 'Marked sold out');
        renderProductsList();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  setFab(canManage ? () => openProductSheet(null) : null);
}

function openProductSheet(productId) {
  const product = productId ? state.products.find((p) => p.id === productId) : null;
  const categoryOptions = state.categories.map((c) => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

  openSheet(product ? 'Edit product' : 'New product', `
    <div class="field">
      <label>Photo</label>
      <div id="photoPicker" style="cursor:pointer;display:inline-block;">
        ${product?.image_url
          ? `<img id="photoPreview" class="thumb" style="width:76px;height:76px;" src="${escapeHtml(product.image_url)}">`
          : `<div id="photoPreview" class="thumb" style="width:76px;height:76px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">\u{1F4F7}</div>`}
      </div>
      <input type="file" accept="image/*" id="photoInput" hidden>
      <div class="drop-zone-status" id="photoStatus"></div>
      <input type="hidden" id="productImageUrl" value="${escapeHtml(product?.image_url || '')}">
    </div>
    <div class="field"><label>Name</label><input id="pName" value="${escapeHtml(product?.name || '')}"></div>
    <div class="field"><label>Description</label><input id="pDescription" value="${escapeHtml(product?.description || '')}" placeholder="Shown on the customer menu"></div>
    <div class="field-row">
      <div class="field"><label>Price (MMK)</label><input id="pPrice" type="number" inputmode="decimal" value="${product?.price ?? ''}"></div>
      <div class="field"><label>Cost (optional)</label><input id="pCost" type="number" inputmode="decimal" value="${product?.cost ?? ''}"></div>
    </div>
    <div class="field"><label>Category</label><select id="pCategory"><option value="">— none —</option>${categoryOptions}</select></div>
    ${product ? `<div class="checkbox-field"><input type="checkbox" id="pActive" ${product.is_active ? 'checked' : ''}><label for="pActive">Active (shows in the catalog at all)</label></div>` : ''}
    <button class="btn" id="sheetProductSave">${product ? 'Save' : 'Add product'}</button>
    ${product ? `<button class="btn danger" id="sheetProductDelete" style="margin-top:8px;">Delete</button>` : ''}
    <div class="action-error" id="sheetProductError"></div>
  `);

  document.getElementById('photoPicker').addEventListener('click', () => document.getElementById('photoInput').click());
  document.getElementById('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById('photoStatus');
    if (file.size > 5 * 1024 * 1024) { statusEl.textContent = 'File is larger than 5MB — use a smaller photo.'; return; }
    statusEl.textContent = 'Uploading…';
    try {
      const data = await fileToBase64(file);
      const result = await api('/admin/uploads', { method: 'POST', body: { filename: file.name, contentType: file.type, data } });
      document.getElementById('productImageUrl').value = result.url;
      document.getElementById('photoPreview').outerHTML = `<img id="photoPreview" class="thumb" style="width:76px;height:76px;" src="${escapeHtml(result.url)}">`;
      statusEl.textContent = 'Photo uploaded.';
    } catch (err) {
      statusEl.textContent = `Upload failed: ${err.message}`;
    }
  });

  document.getElementById('sheetProductSave').addEventListener('click', async () => {
    const errEl = document.getElementById('sheetProductError');
    const name = document.getElementById('pName').value.trim();
    const price = Number(document.getElementById('pPrice').value);
    if (!name || !price) { errEl.textContent = 'Name and price are required.'; return; }
    const cost = document.getElementById('pCost').value;
    const body = {
      name,
      price,
      description: document.getElementById('pDescription').value.trim() || null,
      image_url: document.getElementById('productImageUrl').value.trim() || null,
      cost: cost ? Number(cost) : null,
      category_id: document.getElementById('pCategory').value || null,
    };
    if (product) body.is_active = document.getElementById('pActive').checked;

    try {
      if (product) await api(`/admin/products/${product.id}`, { method: 'PATCH', body });
      else await api('/admin/products', { method: 'POST', body });
      closeSheet();
      toast(product ? 'Product updated' : 'Product added');
      renderProductsList();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  document.getElementById('sheetProductDelete')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      const result = await api(`/admin/products/${product.id}`, { method: 'DELETE' });
      closeSheet();
      toast(result.deactivated ? 'Has order history — deactivated instead of deleted' : 'Product deleted');
      renderProductsList();
    } catch (err) {
      document.getElementById('sheetProductError').textContent = err.message;
    }
  });
}

async function renderCategoriesList() {
  const body = document.getElementById('productsTabBody');
  try {
    const data = await api('/admin/categories');
    state.categories = data.categories;
  } catch (err) {
    body.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
    return;
  }

  const canManage = hasTenantRole(['owner', 'manager']);
  body.innerHTML = state.categories.length === 0
    ? `<div class="state-message">No categories yet${canManage ? ' — tap + to add one.' : '.'}</div>`
    : `<div class="card">${state.categories.map((c) => `
        <div class="list-row">
          <div class="row-main"><div class="row-title">${escapeHtml(c.name)}</div></div>
          ${canManage ? `
            <div class="row-actions">
              <button class="icon-btn edit-cat-btn" data-id="${c.id}" title="Rename">\u270E</button>
              <button class="icon-btn delete-cat-btn" data-id="${c.id}" title="Delete">\u{1F5D1}</button>
            </div>
          ` : ''}
        </div>
      `).join('')}</div>`;

  body.querySelectorAll('.edit-cat-btn').forEach((btn) => btn.addEventListener('click', () => openCategorySheet(btn.dataset.id)));
  body.querySelectorAll('.delete-cat-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cat = state.categories.find((c) => c.id === btn.dataset.id);
      if (!confirm(`Delete "${cat.name}"? Products in it become uncategorized, not deleted.`)) return;
      try {
        await api(`/admin/categories/${btn.dataset.id}`, { method: 'DELETE' });
        toast('Category deleted');
        renderCategoriesList();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  setFab(canManage ? () => openCategorySheet(null) : null);
}

function openCategorySheet(categoryId) {
  const cat = categoryId ? state.categories.find((c) => c.id === categoryId) : null;
  openSheet(cat ? 'Rename category' : 'New category', `
    <div class="field"><label>Name</label><input id="sheetCatName" value="${escapeHtml(cat?.name || '')}" placeholder="e.g. Noodles, Drinks"></div>
    <button class="btn" id="sheetCatSave">${cat ? 'Save' : 'Add category'}</button>
    <div class="action-error" id="sheetCatError"></div>
  `);
  document.getElementById('sheetCatSave').addEventListener('click', async () => {
    const name = document.getElementById('sheetCatName').value.trim();
    if (!name) return;
    try {
      if (cat) await api(`/admin/categories/${cat.id}`, { method: 'PATCH', body: { name } });
      else await api('/admin/categories', { method: 'POST', body: { name } });
      closeSheet();
      toast(cat ? 'Category updated' : 'Category added');
      renderCategoriesList();
    } catch (err) {
      document.getElementById('sheetCatError').textContent = err.message;
    }
  });
}

// ============================================================
// Settings tab — Account / Analytics / History segments
// ============================================================
let settingsSubTab = 'account';

async function renderSettingsTab() {
  setContent(`
    <h1>Settings</h1>
    <div class="segmented">
      <button class="${settingsSubTab === 'account' ? 'active' : ''}" id="segAccount">Account</button>
      <button class="${settingsSubTab === 'analytics' ? 'active' : ''}" id="segAnalytics">Analytics</button>
      <button class="${settingsSubTab === 'history' ? 'active' : ''}" id="segHistory">History</button>
    </div>
    <div id="settingsBody"><div class="skeleton"></div></div>
  `);
  document.getElementById('segAccount').addEventListener('click', () => { settingsSubTab = 'account'; renderSettingsTab(); });
  document.getElementById('segAnalytics').addEventListener('click', () => { settingsSubTab = 'analytics'; renderSettingsTab(); });
  document.getElementById('segHistory').addEventListener('click', () => { settingsSubTab = 'history'; renderSettingsTab(); });

  if (settingsSubTab === 'account') await renderAccountSection();
  else if (settingsSubTab === 'analytics') await renderAnalyticsSection();
  else await renderHistorySection();
}

async function renderAccountSection() {
  const body = document.getElementById('settingsBody');
  try {
    const tenant = await api('/admin/tenants/me');
    state.tenant = tenant;
    state.features = tenant.feature_overrides || {};
    const enabledFeatures = Object.entries(state.features).filter(([, v]) => v === true).map(([k]) => k);
    const store = state.stores.find((s) => s.id === state.storeId);
    const pushGranted = await pushPermissionGranted();

    body.innerHTML = `
      <div class="card">
        <div class="settings-row"><div class="label">Business</div><div class="value">${escapeHtml(tenant.business_name)}</div></div>
        <div class="settings-row"><div class="label">Contact email</div><div class="value">${escapeHtml(tenant.contact_email || '—')}</div></div>
        <div class="settings-row"><div class="label">Subscription</div><div class="value">${escapeHtml(tenant.subscription_status)}</div></div>
        <div class="settings-row"><div class="label">Signed in as</div><div class="value">${escapeHtml(state.user?.email || '')}</div></div>
        <button class="link-btn" id="editBizBtn">Edit business info</button>
      </div>

      <div class="card">
        <div class="settings-row"><div class="label">Current store</div><div class="value">${store ? escapeHtml(store.name) : '— none —'}</div></div>
        ${state.stores.length > 1 ? `<button class="link-btn" id="switchStoreBtn">Switch store</button>` : ''}
      </div>

      <div class="card">
        <div class="settings-row"><div class="label">Order alerts</div><div class="value">${pushGranted ? 'On' : 'Off'}</div></div>
        ${!pushGranted ? `<button class="btn secondary" id="enablePushBtn" style="margin-top:10px;">Enable order notifications</button>` : ''}
      </div>

      <div class="card">
        <div class="settings-row"><div class="label">Enabled features</div><div class="value">${enabledFeatures.length ? escapeHtml(enabledFeatures.join(', ')) : 'None yet'}</div></div>
      </div>

      <button class="btn danger" id="logoutBtn">Log out</button>
    `;

    document.getElementById('editBizBtn').addEventListener('click', () => openBusinessEditSheet(tenant));
    document.getElementById('switchStoreBtn')?.addEventListener('click', openStorePicker);
    document.getElementById('enablePushBtn')?.addEventListener('click', async () => { await registerPush(true); renderAccountSection(); });
    document.getElementById('logoutBtn').addEventListener('click', () => { if (confirm('Log out?')) logout(); });
  } catch (err) {
    body.innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

function openBusinessEditSheet(tenant) {
  openSheet('Edit business info', `
    <div class="field"><label>Business name</label><input id="bizName" value="${escapeHtml(tenant.business_name || '')}"></div>
    <div class="field"><label>Contact email</label><input id="bizEmail" type="email" value="${escapeHtml(tenant.contact_email || '')}"></div>
    <div class="field"><label>Contact phone</label><input id="bizPhone" value="${escapeHtml(tenant.contact_phone || '')}"></div>
    <button class="btn" id="bizSave">Save</button>
    <div class="action-error" id="bizError"></div>
  `);
  document.getElementById('bizSave').addEventListener('click', async () => {
    try {
      await api('/admin/tenants/me', {
        method: 'PATCH',
        body: {
          business_name: document.getElementById('bizName').value.trim(),
          contact_email: document.getElementById('bizEmail').value.trim(),
          contact_phone: document.getElementById('bizPhone').value.trim(),
        },
      });
      closeSheet();
      toast('Business info updated');
      renderAccountSection();
    } catch (err) {
      document.getElementById('bizError').textContent = err.message;
    }
  });
}

async function renderAnalyticsSection(days = 7) {
  const body = document.getElementById('settingsBody');

  if (state.features.analytics !== true) {
    body.innerHTML = `<div class="state-message">Analytics isn't enabled for your account yet. Contact the platform operator.</div>`;
    return;
  }
  if (!['owner', 'manager'].includes(myRole())) {
    body.innerHTML = `<div class="state-message">Only owners and managers can view analytics.</div>`;
    return;
  }
  if (!state.storeId) {
    body.innerHTML = noStoreMessageHtml();
    return;
  }

  body.innerHTML = `
    <div class="segmented" style="margin-bottom:14px;">
      <button class="range-btn ${days === 7 ? 'active' : ''}" data-days="7">7 days</button>
      <button class="range-btn ${days === 30 ? 'active' : ''}" data-days="30">30 days</button>
      <button class="range-btn ${days === 90 ? 'active' : ''}" data-days="90">90 days</button>
    </div>
    <div id="analyticsContent"><div class="skeleton"></div></div>
  `;
  body.querySelectorAll('.range-btn').forEach((btn) => btn.addEventListener('click', () => renderAnalyticsSection(Number(btn.dataset.days))));

  try {
    const data = await api(`/admin/stores/${state.storeId}/analytics?days=${days}`);
    const el = document.getElementById('analyticsContent');

    const maxRevenue = Math.max(1, ...data.daily_revenue.map((d) => Number(d.revenue)));
    const barsHtml = data.daily_revenue.map((d) => {
      const heightPct = Math.max(4, (Number(d.revenue) / maxRevenue) * 100);
      const label = new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const shortRevenue = Number(d.revenue) >= 1000 ? `${Math.round(Number(d.revenue) / 1000)}k` : Number(d.revenue).toLocaleString();
      return `
        <div class="bar-col">
          <div class="bar-val">${shortRevenue}</div>
          <div style="width:100%;flex:1;display:flex;align-items:flex-end;"><div class="bar" style="height:${heightPct}%;"></div></div>
          <div class="bar-label">${label}</div>
        </div>
      `;
    }).join('');

    const bestSellersHtml = data.best_sellers.map((b, i) => `
      <div class="list-row">
        <div class="row-main"><div class="row-title">${i + 1}. ${escapeHtml(b.name)}</div><div class="row-sub">${b.qty_sold} sold</div></div>
        <div class="value">${Number(b.revenue).toLocaleString()} MMK</div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="stat-row">
        <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">${Number(data.summary.total_revenue).toLocaleString()}</div></div>
        <div class="stat-card"><div class="stat-label">Orders</div><div class="stat-value">${data.summary.total_orders}</div></div>
        <div class="stat-card"><div class="stat-label">Avg order</div><div class="stat-value">${Math.round(Number(data.summary.avg_order_value)).toLocaleString()}</div></div>
      </div>
      <div class="card">
        <h2>Daily revenue</h2>
        ${data.daily_revenue.length === 0 ? `<div class="state-message">No orders in this range yet.</div>` : `<div class="bar-chart">${barsHtml}</div>`}
      </div>
      <div class="card">
        <h2>Best sellers</h2>
        ${data.best_sellers.length === 0 ? `<div class="state-message">No sales in this range yet.</div>` : bestSellersHtml}
      </div>
    `;
  } catch (err) {
    document.getElementById('analyticsContent').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

async function renderHistorySection() {
  const body = document.getElementById('settingsBody');
  if (!state.storeId) {
    body.innerHTML = noStoreMessageHtml();
    return;
  }
  if (!['owner', 'manager'].includes(myRole())) {
    body.innerHTML = `<div class="state-message">Only owners and managers can view order history.</div>`;
    return;
  }
  body.innerHTML = `<div class="subtitle">Most recent 50 orders.</div><div id="historyList"><div class="skeleton"></div></div>`;
  try {
    const data = await api(`/admin/orders?store_id=${state.storeId}`);
    const el = document.getElementById('historyList');
    el.innerHTML = data.orders.length === 0
      ? `<div class="state-message">No orders yet.</div>`
      : `<div class="card">${data.orders.map((o) => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${o.table_number ? `Table ${escapeHtml(o.table_number)}` : escapeHtml(o.channel)}</div>
              <div class="row-sub">${new Date(o.created_at).toLocaleString()} &middot; <span class="pill ${o.status === 'completed' ? 'paid' : o.status === 'open' ? 'awaiting' : 'inactive'}">${escapeHtml(o.status)}</span></div>
            </div>
            <div class="value">${Number(o.total).toLocaleString()} MMK</div>
          </div>
        `).join('')}</div>`;
  } catch (err) {
    document.getElementById('historyList').innerHTML = `<div class="state-message error">${escapeHtml(err.message)}</div>`;
  }
}

// ============================================================
// Boot
// ============================================================
async function boot() {
  wireBackButton();
  wireAppStateHandling();

  if (state.token && state.user) {
    try {
      const data = await api('/admin/stores');
      state.stores = data.stores;
      if (!state.storeId && state.stores.length > 0) persist('storeId', state.stores[0].id);
      await loadTenantFeatures();
      document.body.classList.add('authed');
      switchTab('home');
      registerPush();
      return;
    } catch (err) {
      // falls through to login below
    }
  }

  document.body.classList.remove('authed');
  switchTab('login');
}

boot();
