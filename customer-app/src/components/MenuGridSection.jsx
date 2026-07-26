import { Plus } from 'lucide-react';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';
import { sound } from '../lib/sound';

export default function MenuGridSection({ category, sectionRef, activeDishId, onSelectDish }) {
  const { addToCart } = useCart();

  return (
    <div ref={sectionRef} data-category={category.name} className="scroll-mt-24 space-y-3">
      <h4 className="serif-title border-l-2 border-purple-500 pl-2 text-[9px] font-bold tracking-widest text-purple-400 uppercase">
        {category.name}
      </h4>
      <div className="grid grid-cols-2 gap-2.5">
        {category.products.map((product) => {
          const isActive = product.id === activeDishId;
          const soldOut = !product.is_available;
          return (
            <div
              key={product.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (soldOut) return;
                sound.play('select');
                onSelectDish(product);
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !soldOut) onSelectDish(product);
              }}
              className={`glass-panel relative cursor-pointer overflow-hidden rounded-xl transition-all duration-300 active:scale-95 ${
                isActive ? 'bg-white/[0.04] ring-2 ring-purple-500/60' : 'hover:border-purple-500/15'
              } ${soldOut ? 'cursor-default opacity-60' : ''}`}
            >
              <div className="relative flex h-[135px] flex-col justify-between p-3">
                {product.image_url && (
                  <div className="absolute inset-0 z-0 opacity-10">
                    <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="relative z-10 flex items-start justify-between gap-1">
                  <div className="max-w-[75%]">
                    <span className="rounded border border-purple-500/10 bg-purple-950/45 px-1 text-[5.5px] font-bold tracking-widest text-purple-400 uppercase">
                      {category.name}
                    </span>
                    <h3 className="burmese-text mt-1 truncate text-[10px] font-bold tracking-wide text-white">{product.name}</h3>
                  </div>
                  <span className="mt-0.5 shrink-0 text-[9px] font-bold text-purple-300">{formatMMK(product.price)}</span>
                </div>

                {soldOut && (
                  <span className="absolute top-2.5 left-2.5 z-20 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[7.5px] font-bold tracking-wider text-white uppercase">
                    Sold out
                  </span>
                )}

                <div className="relative z-10 mt-1 flex items-center justify-between border-t border-white/[0.05] pt-2">
                  <span className="max-w-[70%] truncate text-[7.5px] font-light text-gray-400">{product.description}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (soldOut) return;
                      sound.play('success');
                      addToCart(product, 1, '');
                    }}
                    disabled={soldOut}
                    aria-label={`Add ${product.name}`}
                    className="flex h-6 min-h-[24px] w-6 min-w-[24px] items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all active:bg-purple-600 active:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
