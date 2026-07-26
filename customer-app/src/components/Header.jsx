import { useEffect, useRef } from 'react';

export default function Header({ tableNumber, categories, activeCategory, onSelectCategory, stage }) {
  const pillRefs = useRef({});

  // Keep the active pill scrolled into view as scroll-spy updates it
  // from manual page scrolling, not just from tapping a pill.
  useEffect(() => {
    pillRefs.current[activeCategory]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  return (
    <header
      className={`sticky top-0 z-30 ${
        stage
          ? 'bg-[#0c0a0e]/92 backdrop-blur-md border-b border-white/6'
          : 'bg-white border-b border-black/8'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className={`font-bold text-[1.05rem] ${stage ? 'font-display tracking-wide text-gray-100' : ''}`}
          style={!stage ? { color: 'var(--accent-dark)' } : undefined}
        >
          Order here
        </span>
        <span
          className="text-[0.8rem] rounded-full border px-3 py-0.5"
          style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          {tableNumber ? `Table ${tableNumber}` : 'Takeaway'}
        </span>
      </div>

      <nav className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3">
        {categories.map((cat) => {
          const active = cat.name === activeCategory;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                pillRefs.current[cat.name] = el;
              }}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                active ? 'text-white' : stage ? 'text-gray-300 bg-white/3 border-white/8' : 'bg-white'
              }`}
              style={
                active
                  ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                  : !stage
                    ? { borderColor: 'var(--accent)', color: 'var(--accent-dark)' }
                    : undefined
              }
            >
              {cat.name}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
