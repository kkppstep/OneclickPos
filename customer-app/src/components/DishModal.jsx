import { useEffect, useRef } from 'react';
import { Ban, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';
import { sound } from '../lib/sound';

export default function DishModal({ products, index, onClose, onChangeIndex }) {
  const { addToCart } = useCart();
  const dish = products[index] || products[0];
  const touchStartX = useRef(0);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChangeIndex((index + 1) % products.length);
      if (e.key === 'ArrowLeft') onChangeIndex((index - 1 + products.length) % products.length);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, products.length, onClose, onChangeIndex]);

  const next = (e) => {
    e?.stopPropagation();
    sound.play('select');
    onChangeIndex((index + 1) % products.length);
  };

  const prev = (e) => {
    e?.stopPropagation();
    sound.play('select');
    onChangeIndex((index - 1 + products.length) % products.length);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const onTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    else if (diff < -50) prev();
  };

  if (!dish) return null;
  const soldOut = !dish.is_available;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={dish.name}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/95 p-4 backdrop-blur-2xl"
    >
      <div className="z-[110] flex w-full max-w-4xl items-center justify-between px-4 pt-4">
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
          Dish {index + 1} of {products.length}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="glass-btn flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-4xl flex-grow select-none items-center justify-between px-2"
      >
        <button
          type="button"
          onClick={prev}
          aria-label="Previous dish"
          className="glass-btn z-20 flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-all hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative flex h-[260px] w-[260px] items-center justify-center sm:h-[380px] sm:w-[380px] md:h-[460px] md:w-[460px]">
          <div className="absolute inset-0 flex animate-[spin_50s_linear_infinite] items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-[#131117] to-[#2d2539] shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
            <div className="flex h-[94%] w-[94%] items-center justify-center rounded-full border border-purple-500/10">
              <div className="h-[86%] w-[86%] rounded-full border border-white/5 bg-gradient-to-b from-[#0e0c12] to-[#040405] shadow-[inset_0_0_25px_rgba(0,0,0,0.9)]" />
            </div>
          </div>

          <div className="absolute z-10 flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full shadow-inner">
            {dish.image_url ? (
              <img src={dish.image_url} alt={dish.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-white/5" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next dish"
          className="glass-btn z-20 flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-all hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="z-[110] flex w-full max-w-xl select-none flex-col items-center px-4 pb-20 text-center"
      >
        {dish.category_name && (
          <span className="mb-2 rounded border border-purple-500/10 bg-purple-950/40 px-2 py-0.5 text-[7.5px] font-bold tracking-widest text-purple-400 uppercase">
            {dish.category_name}
          </span>
        )}
        <h3 className="serif-title text-base leading-snug font-bold tracking-wider text-white sm:text-xl">{dish.name}</h3>
        {dish.description && (
          <p className="mt-1.5 max-w-md px-4 text-[9.5px] leading-relaxed font-light text-gray-300 sm:text-[11.5px]">
            {dish.description}
          </p>
        )}
        <div className="mt-2 mb-4 text-xs font-bold text-amber-300 sm:text-sm">{formatMMK(dish.price)}</div>

        <button
          type="button"
          onClick={() => {
            sound.play('success');
            addToCart(dish);
          }}
          disabled={soldOut}
          className={`flex transform items-center justify-center rounded-full border border-purple-500/20 px-8 py-3.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-[0_10px_25px_rgba(139,92,246,0.35)] transition-all duration-300 active:scale-95 ${
            soldOut ? 'cursor-not-allowed from-neutral-700 to-neutral-800 opacity-60' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500'
          }`}
        >
          {soldOut ? (
            <>
              <Ban className="mr-2 h-4 w-4 text-red-400" /> Sold Out
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4 text-amber-300" /> Add to order • {formatMMK(dish.price)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
