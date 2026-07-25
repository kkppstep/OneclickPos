// ==========================================
// Global State & Config
// ==========================================
let state = {
  categories: [],
  products: [],
  cart: [],
  activeCategory: null,
  theme: {
    layout: 'card-list', // 'card-list' | 'stage'
    preset: 'cozy',     // 'cozy' | 'ice' | 'green'
    accent: '#1B7A3D',
    bgImage: null
  },
  tableNumber: null,
  audioPlaying: false
};

// Bootstrap Modals
let productModalInstance = null;
let checkoutModalInstance = null;
let currentModalProductId = null;
let observer = null;

// Preset Color Palettes
const THEME_PRESETS = {
  cozy: { accent: '#8C4327', dark: '#5C2B18', light: '#FDF6F0', pale: '#F4E7DE' },
  ice:  { accent: '#2B7A9E', dark: '#1A4F68', light: '#F0F8FF', pale: '#DDEEFA' },
  green:{ accent: '#1B7A3D', dark: '#125C2E', light: '#EAF7EE', pale: '#DCF0E2' }
};

// Default Fallback Data
const DEFAULT_PRODUCTS = [
  {
    id: '1',
    name: 'Special Fried Rice',
    description: 'Fragrant jasmine rice with eggs, fresh vegetables, and house sauce.',
    price: 4500,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60',
    soldOut: false,
    isStageHero: true
  },
  {
    id: '2',
    name: 'Iced Green Tea',
    description: 'Refreshing Thai green tea brewed fresh with milk.',
    price: 2500,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60',
    soldOut: false,
    isStageHero: false
  }
];

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initModals();
  bootstrapApp();
});

function initModals() {
  const pm = document.getElementById('productModal');
  const cm = document.getElementById('checkoutModal');
  if (pm) productModalInstance = new bootstrap.Modal(pm);
  if (cm) checkoutModalInstance = new bootstrap.Modal(cm);
}

function bootstrapApp() {
  const config = window.SERVER_CONFIG || {};

  state.products = config.menu || DEFAULT_PRODUCTS;
  state.tableNumber = config.tableNumber || getQueryParam('table') || null;
  
  if (config.theme) {
    state.theme = { ...state.theme, ...config.theme };
  }

  // Extract categories
  state.categories = [...new Set(state.products.map(p => p.category))];
  if (state.categories.length > 0) state.activeCategory = state.categories[0];

  // UI Setup
  renderTableBadge();
  applyThemeSettings();
  renderCategoryNav();
  renderMenu();
  setupScrollObserver();
  setupCartBar();
  setupAmbientAudio(config.ambientTrack);

  const loadingMsg = document.getElementById('loadingMessage');
  if (loadingMsg) loadingMsg.hidden = true;
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function renderTableBadge() {
  const badge = document.getElementById('tableBadge');
  if (badge) {
    badge.textContent = state.tableNumber ? `Table ${state.tableNumber}` : 'Takeaway';
  }
}

// ==========================================
// Theme & Preset Application
// ==========================================
function applyThemeSettings() {
  const { layout, preset, accent, bgImage } = state.theme;
  const root = document.documentElement;

  // Apply CSS Variables based on Preset or Custom Accent
  const presetColors = THEME_PRESETS[preset] || THEME_PRESETS.green;
  const activeAccent = accent || presetColors.accent;

  root.style.setProperty('--accent', activeAccent);
  root.style.setProperty('--accent-dark', presetColors.dark);
  root.style.setProperty('--accent-light', presetColors.light);
  root.style.setProperty('--accent-pale', presetColors.pale);

  // Background Theme handling
  if (bgImage) {
    document.body.classList.add('themed-bg');
    document.body.style.backgroundImage = `url('${bgImage}')`;
  }

  // Stage Layout Theme vs Card List Theme
  if (layout === 'stage') {
    document.body.classList.add('theme-stage');
    renderStageHero();
  } else {
    document.body.classList.remove('theme-stage');
    const stageSec = document.getElementById('stageSection');
    if (stageSec) stageSec.hidden = true;
  }
}

function renderStageHero() {
  const heroItem = state.products.find(p => p.isStageHero) || state.products[0];
  if (!heroItem) return;

  const stageSec = document.getElementById('stageSection');
  const stageImg = document.getElementById('stageImg');
  const stageTitle = document.getElementById('stageTitle');
  const stageDesc = document.getElementById('stageDesc');
  const stagePrice = document.getElementById('stagePrice');
  const stageAddBtn = document.getElementById('stageAddBtn');

  if (stageSec) stageSec.hidden = false;
  if (stageImg) stageImg.src = heroItem.image || '';
  if (stageTitle) stageTitle.textContent = heroItem.name;
  if (stageDesc) stageDesc.textContent = heroItem.description;
  if (stagePrice) stagePrice.textContent = `${heroItem.price.toLocaleString()} MMK`;

  if (stageAddBtn) {
    stageAddBtn.onclick = () => addToCart(heroItem.id);
  }
}

// ==========================================
// Category Nav & Scroll Spy (IntersectionObserver)
// ==========================================
function renderCategoryNav() {
  const nav = document.getElementById('categoryNav');
  if (!nav) return;

  nav.innerHTML = state.categories.map(cat => `
    <button 
      class="category-pill ${cat === state.activeCategory ? 'active' : ''}" 
      id="pill-${cat}"
      onclick="scrollToCategory('${cat}')"
    >
      ${cat}
    </button>
  `).join('');
}

function scrollToCategory(category) {
  state.activeCategory = category;
  updateActivePill(category);
  
  const target = document.getElementById(`cat-${category}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

function updateActivePill(category) {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('active');
  });
  const activePill = document.getElementById(`pill-${category}`);
  if (activePill) {
    activePill.classList.add('active');
    activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// Highlights top navigation pill automatically as user scrolls
function setupScrollObserver() {
  if (observer) observer.disconnect();

  const options = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const catName = entry.target.getAttribute('data-category');
        if (catName) {
          state.activeCategory = catName;
          updateActivePill(catName);
        }
      }
    });
  }, options);

  document.querySelectorAll('.category-section').forEach(sec => observer.observe(sec));
}

// ==========================================
// Rendering Menu Sections
// ==========================================
function renderMenu() {
  const menuContainer = document.getElementById('menu');
  if (!menuContainer) return;

  menuContainer.innerHTML = state.categories.map(cat => {
    const categoryProducts = state.products.filter(p => p.category === cat);

    return `
      <section class="category-section" id="cat-${cat}" data-category="${cat}">
        <h2 class="category-title">${cat}</h2>
        ${categoryProducts.map(product => `
          <div class="product-card ${product.soldOut ? 'sold-out' : ''}" onclick="openProductModal('${product.id}')">
            ${product.soldOut ? '<span class="sold-out-badge">Sold Out</span>' : ''}
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <div class="card-body">
              <div class="card-title">${product.name}</div>
              <div class="card-text">${product.description}</div>
              <div class="price-row">
                <span class="price">${product.price.toLocaleString()} MMK</span>
                ${!product.soldOut ? `
                  <button class="add-btn" type="button" onclick="event.stopPropagation(); addToCart('${product.id}')">+</button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }).join('');
}

// ==========================================
// Product Modal
// ==========================================
function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.soldOut) return;

  currentModalProductId = productId;
  const modalContent = document.getElementById('productModalContent');

  modalContent.innerHTML = `
    <img src="${product.image}" class="pm-image" alt="${product.name}">
    <div class="pm-body">
      <div class="pm-title">${product.name}</div>
      <div class="pm-desc">${product.description}</div>
      <div class="pm-price">${product.price.toLocaleString()} MMK</div>

      <div class="qty-stepper">
        <button class="qty-btn" type="button" onclick="adjustModalQty(-1)">-</button>
        <span class="qty-value" id="modalQty">1</span>
        <button class="qty-btn" type="button" onclick="adjustModalQty(1)">+</button>
      </div>

      <label class="comment-label">Special requests / instructions</label>
      <textarea class="comment-input" id="modalComment" rows="2" placeholder="e.g. Less spicy, extra sauce..."></textarea>

      <button class="btn-green" type="button" onclick="confirmAddToCart()">Add to order</button>
      <button class="btn-green-outline" type="button" data-bs-dismiss="modal">Cancel</button>
    </div>
  `;

  if (productModalInstance) productModalInstance.show();
}

function adjustModalQty(delta) {
  const qtyEl = document.getElementById('modalQty');
  if (!qtyEl) return;
  let qty = parseInt(qtyEl.textContent) + delta;
  if (qty < 1) qty = 1;
  qtyEl.textContent = qty;
}

function confirmAddToCart() {
  const qtyEl = document.getElementById('modalQty');
  const commentEl = document.getElementById('modalComment');

  const qty = qtyEl ? parseInt(qtyEl.textContent) : 1;
  const note = commentEl ? commentEl.value.trim() : '';

  addToCart(currentModalProductId, qty, note);
  if (productModalInstance) productModalInstance.hide();
}

// ==========================================
// Cart Logic & Checkout
// ==========================================
function addToCart(productId, qty = 1, note = '') {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existingIndex = state.cart.findIndex(item => item.id === productId && item.note === note);

  if (existingIndex > -1) {
    state.cart[existingIndex].qty += qty;
  } else {
    state.cart.push({ ...product, qty, note });
  }

  updateCartBar();
}

function setupCartBar() {
  const cartBar = document.getElementById('cartBar');
  if (cartBar) {
    cartBar.onclick = openCheckoutModal;
  }
}

function updateCartBar() {
  const cartBar = document.getElementById('cartBar');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');

  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (cartCount) cartCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  if (cartTotal) cartTotal.textContent = `${totalPrice.toLocaleString()} MMK`;

  if (cartBar) {
    cartBar.hidden = totalItems === 0;
  }
}

function openCheckoutModal() {
  const modalContent = document.getElementById('checkoutModalContent');
  if (!modalContent) return;

  const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  modalContent.innerHTML = `
    <div class="modal-header border-0 pb-0">
      <h5 class="modal-title fw-bold">Your Order</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      ${state.cart.map(item => `
        <div class="line-item">
          <div>
            <div class="line-item-name">${item.name} x ${item.qty}</div>
            ${item.note ? `<div class="line-item-note">"${item.note}"</div>` : ''}
          </div>
          <div class="line-item-sub">${(item.price * item.qty).toLocaleString()} MMK</div>
        </div>
      `).join('')}

      <div class="summary-total">
        <span>Total</span>
        <span>${totalPrice.toLocaleString()} MMK</span>
      </div>
    </div>
    <div class="modal-footer border-0">
      <button class="btn-green" type="button" onclick="submitOrder()">Confirm Order</button>
    </div>
  `;

  if (checkoutModalInstance) checkoutModalInstance.show();
}

function submitOrder() {
  alert('Order submitted successfully!');
  state.cart = [];
  updateCartBar();
  if (checkoutModalInstance) checkoutModalInstance.hide();
}

// ==========================================
// Ambient Audio Controls
// ==========================================
function setupAmbientAudio(trackUrl) {
  const btn = document.getElementById('ambientToggle');
  const audio = document.getElementById('ambientAudio');

  if (!trackUrl || !btn || !audio) return;

  audio.src = trackUrl;
  btn.hidden = false;

  btn.onclick = () => {
    if (state.audioPlaying) {
      audio.pause();
      btn.classList.add('muted');
      state.audioPlaying = false;
    } else {
      audio.play().then(() => {
        btn.classList.remove('muted');
        state.audioPlaying = true;
      }).catch(err => console.error("Audio playback error:", err));
    }
  };
}
