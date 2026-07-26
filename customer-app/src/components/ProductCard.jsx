import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, stage, onOpen }) {
  const { addToCart } = useCart();
  const soldOut = !product.is_available;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !soldOut && onOpen(product)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !soldOut) onOpen(product);
      }}
      className={`relative mb-4 overflow-hidden rounded-2xl shadow-sm cursor-pointer ${
        soldOut ? 'cursor-default opacity-75' : ''
      } ${stage ? 'bg-white/3 border border-white/6' : 'bg-white'}`}
    >
      {soldOut && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#1C2620]/85 px-2.5 py-1 text-[0.72rem] font-bold text-white">
          Sold out
        </span>
      )}
      <div className="h-[180px] w-full" style={{ background: 'var(--accent-light)' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover ${soldOut ? 'grayscale-[0.6]' : ''}`}
          />
        ) : (
          <PlaceholderImage />
        )}
      </div>
      <div className="p-3.5">
        <div className={`text-[1rem] font-bold mb-0.5 ${stage ? 'font-display text-gray-100' : ''}`}>
          {product.name}
        </div>
        {product.description && (
          <div className={`text-[0.85rem] mb-2 ${stage ? 'text-gray-400' : 'text-[#6B7C72]'}`}>
            {product.description}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold" style={{ color: stage ? 'var(--accent)' : 'var(--accent-dark)' }}>
            {formatMMK(product.price)}
          </span>
          {!soldOut && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, 1, '');
              }}
              aria-label={`Add ${product.name} to order`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-white"
              style={{ background: 'var(--accent)' }}
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderImage() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect width="100" height="100" fill="var(--accent-pale)" />
      <path d="M30 65 L45 45 L58 58 L68 42 L78 65 Z" fill="var(--accent-light)" />
      <circle cx="38" cy="38" r="6" fill="var(--accent-light)" />
    </svg>
  );
}
