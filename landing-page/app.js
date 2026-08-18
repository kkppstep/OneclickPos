// ============================================================
// OneClickPOS landing page
// No build step, same as admin-app — GSAP loaded via CDN in
// index.html. This file: language switching, rendering the pricing
// cards from content.js, and the scroll-driven story animation.
// ============================================================

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

// ============================================================
// Best for category carousel
// ============================================================
const BEST_FOR_CONTENT = {
  en: {
    kicker: 'BEST FOR',
    heading: 'Different shops. One simple order system.',
    sub: 'Shinapp helps every kind of hospitality business keep orders clear and service moving.',
    labels: ['Busy restaurant', 'Cozy café', 'KTV restaurant', 'Hotel / motel', 'Dessert shop', 'New shop', 'Quiet service', 'Weak internet', 'Family restaurant'],
    overlines: ['BUSY SERVICE', 'COZY EXPERIENCE', 'ROOM SERVICE', 'ROOM ORDERING', 'SWEET SERVICE', 'START SIMPLE', 'QUIET SERVICE', 'LOCAL-FIRST', 'FAMILY FRIENDLY'],
    taglines: ['Keep busy tables and orders organized.', 'Let customers order without breaking the mood.', 'Separate room orders and combine the bill at checkout.', 'Take room-service orders by room number.', 'Make QR ordering feel easy and welcoming.', 'Start your new shop with a system that can grow.', 'Call staff quietly with one tap.', 'Keep serving even when the connection is weak.', 'Make ordering easier for parents and children.'],
    problems: ['When tables fill up, staff can lose track of which order belongs where.', 'Customers want a calm café experience without calling staff across the room.', 'Room orders can become mixed up, especially at checkout.', 'Room-service requests need to stay connected to the right room.', 'Small dessert shops need a simple, friendly way to receive orders.', 'New owners need a clear system from the first day.', 'Some customers prefer not to call staff out loud.', 'A weak connection should not stop the local order flow.', 'Parents should not need to leave the table just to place another order.'],
    solutions: ['Track each table, kitchen status, staff request, and combined checkout in one place.', 'Customers scan, order, request help, and ask for the bill from their table.', 'Keep rooms separate in the kitchen and combine the right open orders at checkout.', 'Organize orders by room number and keep service staff informed.', 'Use a clear QR menu and a gentle customer ordering flow.', 'Manage products, staff, orders, and receipts from one simple dashboard.', 'A bell button lets customers request staff or the bill without speaking loudly.', 'Local-friendly workflows keep the shop moving while the connection recovers.', 'Simple, visible buttons make ordering comfortable for families.'],
    images: ['best-for-busy-restaurant.png', 'best-for-cozy-cafe.png', 'best-for-ktv.png', 'best-for-hotel.png', 'best-for-dessert.png', 'best-for-new-shop.png', 'best-for-quiet-service.png', 'best-for-offline.png', 'best-for-family.png'],
  },
  mm: {
    kicker: 'သင့်တော်သောဆိုင်များ',
    heading: 'ဆိုင်အမျိုးအစားမတူပေမယ့် အော်ဒါစီမံမှုတစ်ခုတည်းလိုအပ်ပါသည်',
    sub: 'Shinapp က ဆိုင်အမျိုးအစားမရွေး အော်ဒါများကို ရှင်းလင်းစွာ စီမံပြီး ဝန်ဆောင်မှုပိုမြန်စေပါသည်။',
    labels: ['လူများတဲ့ဆိုင်များ', 'Cozy Café', 'KTV နှင့် Restaurant', 'Hotel / Motel', 'Cozy အအေးဆိုင်များ', 'အသစ်ဖွင့်မည့်ဆိုင်များ', 'အသံမထွက်ဘဲ ဝန်ဆောင်မှု', 'Internet မကောင်းသောဆိုင်များ', 'မိသားစုလာသောဆိုင်များ'],
    overlines: ['လူများတဲ့ဆိုင်', 'COZY အတွေ့အကြုံ', 'ROOM SERVICE', 'ROOM ORDERING', 'အအေးနှင့် DESSERT', 'ဆိုင်အသစ်များ', 'ဝန်ဆောင်မှုခေါ်ရန်', 'LOCAL-FIRST', 'မိသားစုအတွက်'],
    taglines: ['အော်ဒါများလည်း မရောထွေးစေပါ။', 'အေးဆေးသောအတွေ့အကြုံကို မပျက်စေပါ။', 'Room အလိုက် အော်ဒါခွဲပြီး bill စုပါ။', 'Room number အလိုက် order လက်ခံပါ။', 'QR menu ဖြင့် order တင်ရလွယ်ကူစေပါ။', 'စတင်ကတည်းက စနစ်တကျ စီမံပါ။', 'Button တစ်ချက်နှိပ်ပြီး ဝန်ထမ်းခေါ်ပါ။', 'Internet မကောင်းလည်း ဆိုင်အလုပ်မရပ်ပါ။', 'မိသားစုများအတွက် အော်ဒါတင်ရလွယ်ကူစေပါ။'],
    problems: ['လူများလာတဲ့အခါ ဘယ်အော်ဒါက ဘယ်စားပွဲအတွက်လဲ ရောထွေးနိုင်ပါတယ်။', 'Café ရဲ့ အေးဆေးတဲ့အတွေ့အကြုံကို မပျက်စေဘဲ အော်ဒါလက်ခံဖို့လိုပါတယ်။', 'KTV room တွေရဲ့ order တွေ checkout အချိန်မှာ ရောထွေးနိုင်ပါတယ်။', 'Room service order တွေက သက်ဆိုင်ရာ room နဲ့ ချိတ်ဆက်နေဖို့လိုပါတယ်။', 'အအေးနှင့် dessert ဆိုင်တွေက ရိုးရှင်းပြီး ချစ်စရာကောင်းတဲ့ order flow လိုအပ်ပါတယ်။', 'ဆိုင်အသစ်ဖွင့်ချိန်ကတည်းက စနစ်တကျ စီမံဖို့လိုပါတယ်။', 'Customer တချို့က ဝန်ထမ်းကို အသံနဲ့ မခေါ်ချင်ကြပါဘူး။', 'Internet မကောင်းတာကြောင့် ဆိုင်အလုပ်မရပ်သင့်ပါဘူး။', 'မိဘတွေက စားပွဲကနေ မထဘဲ အော်ဒါထပ်တင်နိုင်သင့်ပါတယ်။'],
    solutions: ['စားပွဲ၊ မီးဖိုချောင်၊ ဝန်ထမ်းခေါ်မှုနှင့် checkout ကို တစ်နေရာတည်းမှာ စီမံနိုင်ပါတယ်။', 'Customer က စားပွဲကနေ QR scan လုပ်ပြီး order၊ ဘေလ်နှင့် အကူအညီကို တောင်းနိုင်ပါတယ်။', 'Room တွေကို kitchen မှာ သီးခြားထားပြီး checkout အချိန်မှာ သက်ဆိုင်ရာ bill ကို စုနိုင်ပါတယ်။', 'Room number အလိုက် order ခွဲခြားပြီး ဝန်ထမ်းတွေကို အသိပေးနိုင်ပါတယ်။', 'ရှင်းလင်းသော QR menu နှင့် သက်တောင့်သက်သာ order flow ကို အသုံးပြုနိုင်ပါတယ်။', 'Product၊ staff၊ order နှင့် receipt များကို dashboard တစ်ခုတည်းက စီမံနိုင်ပါတယ်။', 'Bell button တစ်ချက်နှိပ်ပြီး ဝန်ထမ်းခေါ်ခြင်း သို့မဟုတ် ဘေလ်တောင်းခြင်း ပြုလုပ်နိုင်ပါတယ်။', 'Local-friendly workflow ဖြင့် connection ပြန်ကောင်းလာချိန်အထိ ဆိုင်အလုပ်ကို ဆက်လုပ်နိုင်ပါတယ်။', 'ခလုတ်ကြီးပြီး ရှင်းလင်းသော UI ဖြင့် မိသားစုများ အော်ဒါတင်ရလွယ်ကူစေပါတယ်။'],
    images: ['best-for-busy-restaurant.png', 'best-for-cozy-cafe.png', 'best-for-ktv.png', 'best-for-hotel.png', 'best-for-dessert.png', 'best-for-new-shop.png', 'best-for-quiet-service.png', 'best-for-offline.png', 'best-for-family.png'],
  },
};

let bestForIndex = 0;

function renderBestFor() {
  const copy = BEST_FOR_CONTENT[currentLang];
  const image = document.getElementById('bestForImage');
  const overline = document.getElementById('bestForOverline');
  const title = document.getElementById('bestForImageTitle');
  const tagline = document.getElementById('bestForImageTagline');
  const detail = document.getElementById('bestForDetail');
  const tabs = document.getElementById('bestForTabs');
  const oroHeroLabel = document.getElementById('oroHeroLabel');
  if (!image || !tabs || !detail) return;
  if (oroHeroLabel) oroHeroLabel.textContent = currentLang === 'mm' ? 'အော်ဒါတွေကို အလွယ်တကူ ထိန်းချုပ်ပါ' : 'Keep every order moving';
  const kickerEl = document.querySelector('[data-i18n="bestFor.kicker"]');
  const headingEl = document.querySelector('[data-i18n="bestFor.heading"]');
  const subEl = document.querySelector('[data-i18n="bestFor.sub"]');
  if (kickerEl) kickerEl.textContent = copy.kicker;
  if (headingEl) headingEl.textContent = copy.heading;
  if (subEl) subEl.textContent = copy.sub;

  bestForIndex = Math.min(bestForIndex, copy.labels.length - 1);
  tabs.innerHTML = copy.labels.map((label, index) => `
    <button class="best-for-tab ${index === bestForIndex ? 'is-active' : ''}" type="button" role="tab" aria-selected="${index === bestForIndex}" data-best-for-index="${index}">${escapeHtml(label)}</button>
  `).join('');

  const item = (index) => ({ label: copy.labels[index], image: copy.images[index], overline: copy.overlines[index], tagline: copy.taglines[index], problem: copy.problems[index], solution: copy.solutions[index] });
  const selected = item(bestForIndex);
  image.src = `assets/${selected.image}`;
  image.alt = selected.label;
  overline.textContent = selected.overline;
  title.textContent = selected.label;
  tagline.textContent = selected.tagline;
  detail.innerHTML = `
    <div class="best-for-detail-block">
      <span class="best-for-detail-label">${currentLang === 'mm' ? 'ပြဿနာ' : 'THE CHALLENGE'}</span>
      <p>${escapeHtml(selected.problem)}</p>
    </div>
    <div class="best-for-detail-block best-for-detail-solution">
      <span class="best-for-detail-label">${currentLang === 'mm' ? 'Shinapp ဖြေရှင်းချက်' : 'THE SHINNAPP SOLUTION'}</span>
      <p>${escapeHtml(selected.solution)}</p>
    </div>
  `;

  tabs.querySelectorAll('.best-for-tab').forEach((tab) => {
    tab.addEventListener('click', () => selectBestFor(Number(tab.dataset.bestForIndex)));
  });
}

function selectBestFor(index) {
  const copy = BEST_FOR_CONTENT[currentLang];
  bestForIndex = (index + copy.labels.length) % copy.labels.length;
  const image = document.getElementById('bestForImage');
  if (image) {
    image.classList.add('is-changing');
    window.setTimeout(() => image.classList.remove('is-changing'), 260);
  }
  renderBestFor();
  document.querySelector(`.best-for-tab[data-best-for-index="${bestForIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

const ORO_STAGE_ASSETS = [
  'oro-pose-qr-clean.png',
  'oro-pose-order-clean.png',
  'oro-hero-mascot.png',
  'oro-hero-mascot.png',
  'oro-hero-mascot.png',
];

function renderOroStage(index) {
  const mascot = document.getElementById('oroHeroMascot');
  const image = document.getElementById('oroStageImage');
  const card = document.getElementById('oroStageCard');
  if (!mascot || !image || !card) return;
  const stage = Math.max(0, Math.min(4, index));
  const mm = currentLang === 'mm';
  const cards = mm ? [
    ['QR Scan', 'စားပွဲက QR ကို scan လုပ်ပါ'],
    ['Order', 'အော်ဒါကို လွယ်ကူစွာ လက်ခံပါ'],
    ['Kitchen', 'မီးဖိုချောင်ကို ချက်ချင်းအသိပေးပါ'],
    ['Notification', 'ဝန်ထမ်းကို တစ်ချက်နှိပ်ပြီး ခေါ်ပါ'],
    ['Receipt', 'ဘေလ်ကို စုစည်းပြီး စမ်းကြည့်ပါ'],
  ] : [
    ['QR Scan', 'Start with one simple scan'],
    ['Order', 'Keep every order clear'],
    ['Kitchen', 'Send the right order to the kitchen'],
    ['Notification', 'Call staff with one gentle tap'],
    ['Receipt', 'Bring every open order together'],
  ];
  mascot.className = `oro-hero-mascot oro-stage-${stage}`;
  image.classList.add('is-stage-changing');
  image.src = `assets/${ORO_STAGE_ASSETS[stage]}`;
  image.alt = `ORO — ${cards[stage][0]}`;
  window.setTimeout(() => image.classList.remove('is-stage-changing'), 280);
  const [title, message] = cards[stage];
  card.innerHTML = `<span class="oro-stage-card-title">${escapeHtml(title)}</span><span class="oro-stage-card-message">${escapeHtml(message)}</span>`;
  card.setAttribute('aria-hidden', stage === 0 ? 'true' : 'false');
  if (stage === 4) {
    card.innerHTML += `<div class="oro-stage-actions"><a href="https://order.shinnapp.com/?store=a8bd97f5-4354-4145-aa8d-6145edde8e9c&amp;table=10" target="_blank" rel="noopener noreferrer">${mm ? 'အစမ်းကြည့်ရန်' : 'Try the demo'}</a><a href="#adminDownloadLink">${mm ? 'Admin App' : 'Admin app'}</a></div>`;
  }
}

function wireBestForCarousel() {
  const showcase = document.getElementById('bestForShowcase');
  const prev = document.getElementById('bestForPrev');
  const next = document.getElementById('bestForNext');
  if (!showcase || !prev || !next) return;
  prev.addEventListener('click', () => selectBestFor(bestForIndex - 1));
  next.addEventListener('click', () => selectBestFor(bestForIndex + 1));
  let startX = 0;
  showcase.addEventListener('touchstart', (event) => { startX = event.changedTouches[0].clientX; }, { passive: true });
  showcase.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 42) selectBestFor(bestForIndex + (delta < 0 ? 1 : -1));
  }, { passive: true });
}

// ============================================================
// Language
// ============================================================
function detectDefaultLang() {
  const stored = localStorage.getItem('lang');
  if (stored === 'en' || stored === 'mm') return stored;
  return (navigator.language || '').toLowerCase().startsWith('my') ? 'mm' : 'en';
}

let currentLang = detectDefaultLang();

// Dot-path lookup into CONTENT[currentLang], e.g. "story.frames.0.headline".
// Array indices work as plain string keys ('0', '1', ...) same as numeric ones.
function t(path) {
  let node = CONTENT[currentLang];
  for (const part of path.split('.')) {
    if (node == null) return '';
    node = node[part];
  }
  return typeof node === 'string' ? node : '';
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

function renderPricingPlans() {
  const container = document.getElementById('plansContainer');
  const plans = CONTENT[currentLang].pricing.plans;
  container.innerHTML = plans.map((plan) => `
    <div class="plan-card ${plan.featured ? 'is-featured' : ''}">
      <div class="plan-name">${escapeHtml(plan.name)}</div>
      <div class="plan-tagline">${escapeHtml(plan.tagline)}</div>
      <div class="plan-price">
        <span class="plan-price-amount">${escapeHtml(plan.price)}</span>
        <span class="plan-price-period">${escapeHtml(plan.period)}</span>
      </div>
      <ul class="plan-features">
        ${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
      <a class="btn-primary plan-cta" href="${escapeHtml(ADMIN_SIGNUP_URL)}">${escapeHtml(plan.cta)}</a>
    </div>
  `).join('');
}

// "my" is the correct BCP-47 code for Burmese (used for the actual
// lang attribute + :lang() CSS selector) — "mm" is just this file's
// own internal key into CONTENT, kept short to match how you'll edit
// content.js day to day.
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang === 'mm' ? 'my' : 'en';
  applyStaticTranslations();
  renderPricingPlans();
  renderBestFor();
  renderOroStage(0);
  document.querySelectorAll('.lang-toggle .lang-option').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.lang === lang);
  });
  // Story frame copy and pricing cards may now be taller/shorter in
  // the other language — let ScrollTrigger recompute pinned distances.
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}

function wireLanguageToggle() {
  document.getElementById('langToggle').addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'mm' : 'en');
  });
}

function wireStaticLinks() {
  document.getElementById('navSignIn').href = ADMIN_SIGNUP_URL;
  document.getElementById('finalCtaBtn').href = ADMIN_SIGNUP_URL;
  const adminDownloadLink = document.getElementById('adminDownloadLink');
  if (adminDownloadLink && ADMIN_ANDROID_DOWNLOAD_URL && !ADMIN_ANDROID_DOWNLOAD_URL.includes('PASTE_DIRECT_APK')) {
    adminDownloadLink.href = ADMIN_ANDROID_DOWNLOAD_URL;
    adminDownloadLink.hidden = false;
  }
}

// ============================================================
// Story animation
// ============================================================
// Per-frame internal choreography. Each animation is positioned on
// the shared timeline relative to `startAt` (the moment that frame
// is ~settled into view), not as an independent/looping animation —
// everything here is one-shot, scrubbed by scroll position, since a
// scrubbed timeline's playhead is scroll position, not real time, so
// an infinitely-*looping* tween doesn't make sense inside it.
function choreographFrame(tl, frame, index, startAt) {
  // Whatever real photo/video exists for this step (see index.html's
  // assets/step-N.* — absent ones remove themselves via onerror and
  // this is just null, so the CSS scene underneath shows instead).
  const media = frame.querySelector('.scene-media');
  if (media) {
    tl.fromTo(media, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1.02, duration: 0.4, ease: 'power2.out' }, startAt)
      .to(media, { scale: 1.08, duration: 0.6, ease: 'none' }, startAt + 0.4);
  }

  switch (index) {
    case 0: {
      const card = frame.querySelector('.qr-card');
      tl.fromTo(card, { opacity: 0, scale: 0.9, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' }, startAt);
      break;
    }
    case 1: {
      const phone = frame.querySelector('.phone-scan');
      const corners = frame.querySelectorAll('.vf-corner');
      const scanLine = frame.querySelector('.scan-line');
      tl.fromTo(phone, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, startAt);
      tl.to(corners, { opacity: 1, stagger: 0.04, duration: 0.15 }, startAt + 0.2);
      tl.fromTo(scanLine, { opacity: 0, y: 0 }, { opacity: 1, y: 210, duration: 0.5, ease: 'power1.inOut' }, startAt + 0.3);
      tl.to(scanLine, { opacity: 0, duration: 0.1 }, startAt + 0.75);
      break;
    }
    case 2: {
      const rows = frame.querySelectorAll('.menu-row');
      const btn = frame.querySelector('.order-confirm-btn');
      tl.to(rows, { opacity: 1, stagger: 0.12, duration: 0.25, ease: 'power2.out' }, startAt);
      tl.to(btn, { opacity: 1, duration: 0.2 }, startAt + 0.6);
      break;
    }
    case 3: {
      const ticket = frame.querySelector('.ticket');
      const steam = frame.querySelectorAll('.steam');
      tl.fromTo(ticket, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, startAt);
      tl.fromTo(steam, { opacity: 0, y: 0 }, { opacity: 1, y: -14, duration: 0.4, stagger: 0.12, ease: 'power1.out' }, startAt + 0.4);
      tl.to(steam, { opacity: 0, duration: 0.2 }, startAt + 0.85);
      break;
    }
    case 4: {
      const banner = frame.querySelector('.notif-banner');
      const phone = frame.querySelector('.phone-owner');
      tl.fromTo(banner, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.6)' }, startAt);
      tl.fromTo(phone, { rotation: 0 }, { rotation: 1.4, duration: 0.08, yoyo: true, repeat: 5, ease: 'power1.inOut' }, startAt + 0.05);
      break;
    }
  }
}

// Desktop/tablet: one pinned section, horizontally scrubbed by
// scroll, with each frame's internal reveal timed to when it's
// centered — see choreographFrame() above.
function setupPinnedStory() {
  const section = document.getElementById('storySection');
  const track = document.getElementById('storyTrack');
  const frames = gsap.utils.toArray('.story-frame');
  const dots = gsap.utils.toArray('.story-progress .dot');
  const frameCount = frames.length;
  const scrubDuration = frameCount - 1; // frame i lands exactly at timeline time i

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerWidth * (frameCount - 1) * 1.3),
      invalidateOnRefresh: true,
        onUpdate: (self) => {
        const idx = Math.min(frameCount - 1, Math.round(self.progress * scrubDuration));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        renderOroStage(idx);
      },
    },
  });

  tl.to(track, { xPercent: -100 * (frameCount - 1), ease: 'none', duration: scrubDuration });

  frames.forEach((frame, i) => {
    choreographFrame(tl, frame, i, Math.max(0, i - 0.35));
  });

  return tl;
}

// Phone/mobile: no pinning or horizontal scrub (scroll-jacking reads
// as janky on touch, and eats a lot of a phone's scroll budget) —
// frames stack normally (see the max-width: 899px rule in
// styles.css) and each one's internal elements just fade/settle in
// as it crosses into view, non-scrubbed, one-shot.
function setupStackedStoryFallback() {
  const frames = gsap.utils.toArray('.story-frame');
  const dots = gsap.utils.toArray('.story-progress .dot');

  frames.forEach((frame, i) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: frame,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
        onEnter: () => {
          dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
          renderOroStage(i);
        },
      },
    });
    choreographFrame(tl, frame, i, 0);
  });
}

function setupStoryAnimation() {
  if (!window.gsap || !window.ScrollTrigger) return; // CDN blocked/offline — page still reads fine without motion
  gsap.registerPlugin(ScrollTrigger);

  // GSAP's own recommended pattern for responsive ScrollTrigger setups:
  // matchMedia re-runs the right branch automatically on resize across
  // the breakpoint, and tears down the other one's triggers for us.
  ScrollTrigger.matchMedia({
    '(min-width: 900px)': () => setupPinnedStory(),
    '(max-width: 899px)': () => setupStackedStoryFallback(),
  });
}

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  wireLanguageToggle();
  wireStaticLinks();
  wireBestForCarousel();
  renderBestFor();
  renderOroStage(0);
  setupStoryAnimation();
});
