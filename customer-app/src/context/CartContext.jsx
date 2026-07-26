import { createContext, useContext, useMemo, useState, useCallback } from 'react';

const CartContext = createContext(null);

// Same product with different notes is kept as separate line items
// (a customer ordering two of the same dish with different requests
// needs both printed distinctly); same product with matching notes
// just bumps the quantity.
function lineKey(productId, notes) {
  return `${productId}::${notes || ''}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((product, qty = 1, notes = '') => {
    const key = lineKey(product.id, notes);
    setItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) => (item.key === key ? { ...item, qty: item.qty + qty } : item));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          qty,
          notes: notes || '',
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const setQty = useCallback((key, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, qty } : item)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totals = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { totalItems, totalPrice };
  }, [items]);

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, setQty, clearCart, ...totals }),
    [items, addToCart, removeFromCart, setQty, clearCart, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
