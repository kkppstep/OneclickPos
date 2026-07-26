import InteractiveStage from './InteractiveStage';
import { formatMMK } from '../lib/format';

export default function StageHero({ products, activeDish, onSelectDish }) {
  return (
    <div>
      <InteractiveStage dish={activeDish} />

      <div className="grid grid-cols-3 gap-2.5 px-4 pb-6">
        {products.map((product) => {
          const isActive = product.id === activeDish?.id;
          const soldOut = !product.is_available;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => !soldOut && onSelectDish(product)}
              disabled={soldOut}
              className={`overflow-hidden rounded-2xl border text-left transition-opacity ${
                isActive ? '' : 'border-white/8'
              } ${soldOut ? 'opacity-40' : ''}`}
              style={isActive ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}
            >
              <div className="h-20 w-full bg-white/5">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="px-2 py-1.5">
                <div className="truncate text-[0.72rem] font-semibold text-gray-200">{product.name}</div>
                <div className="text-[0.68rem] text-gray-500">{formatMMK(product.price)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
