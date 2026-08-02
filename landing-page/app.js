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
        onEnter: () => dots.forEach((d, j) => d.classList.toggle('is-active', j === i)),
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
  setupStoryAnimation();
});
