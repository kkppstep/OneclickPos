import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMenu } from '../lib/api';

export function useMenu(storeId) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(() => {
    if (!storeId) {
      setState({ status: 'error', data: null, error: new Error('missing_store') });
      return;
    }
    setState({ status: 'loading', data: null, error: null });
    fetchMenu(storeId)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error) => setState({ status: 'error', data: null, error }));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Flat product list + a Map for O(1) lookups (product modal, stage
  // hero), derived alongside the category-grouped shape the sectioned
  // menu view renders directly from.
  const { products, productsById } = useMemo(() => {
    const categories = state.data?.categories || [];
    const flat = categories.flatMap((cat) => cat.products.map((p) => ({ ...p, category_id: cat.id, category_name: cat.name })));
    return { products: flat, productsById: new Map(flat.map((p) => [p.id, p])) };
  }, [state.data]);

  return {
    status: state.status,
    error: state.error,
    categories: state.data?.categories || [],
    products,
    productsById,
    localHubUrl: state.data?.local_hub_url || null,
    kbzpayQrUrl: state.data?.kbzpay_qr_url || null,
    ambientAudioUrl: state.data?.ambient_audio_url || null,
    themeConfig: state.data?.theme || null,
    reload: load,
  };
}
