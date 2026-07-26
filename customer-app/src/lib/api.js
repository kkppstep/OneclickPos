import { getCloudApiBase } from './config';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// GET /public/stores/:storeId/menu — categories (each with nested
// products), plus store-level config the page needs: where to fall
// back to if the cloud is unreachable, whether KBZPay is offered, the
// ambient track (if enabled), and the theme.
export async function fetchMenu(storeId) {
  const base = getCloudApiBase();
  if (!base) {
    throw new ApiError('CLOUD_API_BASE is not configured for this deployment.', 0);
  }
  const res = await fetch(`${base}/public/stores/${encodeURIComponent(storeId)}/menu`);
  if (!res.ok) {
    if (res.status === 404) throw new ApiError('store_not_found', 404);
    throw new ApiError(`Menu request failed (${res.status})`, res.status);
  }
  return res.json();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// POST an order. Tries the cloud endpoint first; if that fails
// (offline, cloud down, or just slow) and the store has a local hub
// reachable on the same wifi, retries against the hub with the same
// order id — the backend is idempotent on id either way, so a retry
// after a dropped response never double-books the kitchen.
export async function submitOrder({ storeId, order, localHubUrl }) {
  const base = getCloudApiBase();
  const body = JSON.stringify(order);

  if (base) {
    try {
      const res = await withTimeout(
        fetch(`${base}/public/stores/${encodeURIComponent(storeId)}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        8000
      );
      if (res.ok) {
        const data = await res.json();
        return { ...data, via: 'cloud' };
      }
    } catch {
      // fall through to local-hub attempt below
    }
  }

  if (localHubUrl) {
    try {
      const res = await withTimeout(
        fetch(`${localHubUrl.replace(/\/$/, '')}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        5000
      );
      if (res.ok) {
        const data = await res.json();
        return { ...data, via: 'local_hub' };
      }
    } catch {
      // both paths failed — surface below
    }
  }

  throw new ApiError(
    'Could not reach the kitchen. Check your connection and try again — nothing was charged.',
    0
  );
}
