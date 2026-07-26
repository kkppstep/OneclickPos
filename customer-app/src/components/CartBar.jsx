import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function CartBar({ onOpen }) {
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-[480px] items-center justify-between rounded-2xl px-5 py-4 font-bold text-white shadow-[0_6px_20px_rgba(27,122,61,0.35)]"
      style={{ background: 'var(--accent)' }}
    >
      <span>
        {totalItems} {totalItems === 1 ? 'item' : 'items'}
      </span>
      <span>{formatMMK(totalPrice)}</span>
    </button>
  );
}
