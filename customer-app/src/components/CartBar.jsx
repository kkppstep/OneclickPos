import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function CartBar({ onOpen, stage, tableNumber }) {
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  if (stage) {
    return (
      <div className="fixed bottom-4 inset-x-4 z-40 flex justify-center animate-slide-up">
        <button
          type="button"
          onClick={onOpen}
          className="w-full max-w-md flex items-center justify-between rounded-full border border-white/10 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 p-1 text-white shadow-[0_12px_30px_rgba(99,102,241,0.45)] transition-transform active:scale-95"
        >
          <div className="flex items-center gap-2.5 pl-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <ShoppingBag className="h-4 w-4 animate-pulse text-amber-300" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-wide">
                {totalItems} {totalItems === 1 ? 'Selection' : 'Selections'}
              </p>
              <p className="text-[8.5px] text-purple-200">
                {formatMMK(totalPrice)}{tableNumber ? ` (Table ${tableNumber})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-[9px] font-bold tracking-wider text-white uppercase transition-colors hover:bg-white/15">
            View Order <ArrowRight className="h-3 w-3" />
          </div>
        </button>
      </div>
    );
  }

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
