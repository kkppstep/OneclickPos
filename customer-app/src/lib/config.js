// Resolves the cloud-api base URL:
//   1. window.__POS_CONFIG__.CLOUD_API_BASE — set by api/config.js at
//      request time from the real Vercel env var. This is what runs in
//      production, and in `vercel dev` locally.
//   2. VITE_CLOUD_API_BASE from .env.local — fallback for plain
//      `npm run dev`, where no serverless function is running.
export function getCloudApiBase() {
  const injected = typeof window !== 'undefined' ? window.__POS_CONFIG__?.CLOUD_API_BASE : '';
  const fallback = import.meta.env.VITE_CLOUD_API_BASE || '';
  return (injected || fallback || '').replace(/\/$/, '');
}

// ?store=<id>&table=<number> — the two params a table's QR code encodes.
// store is required (it's how we know whose menu to load); table is
// optional (a takeaway/counter QR code might omit it).
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    storeId: params.get('store'),
    tableNumber: params.get('table'),
  };
}
