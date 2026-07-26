export default function CategoryPills({ categories, activeCategory, onSelect }) {
  return (
    <nav className="sticky top-0 z-30 mb-3.5 shrink-0 bg-[#0c0a0e]/95 py-1 backdrop-blur-md">
      <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02] p-1">
        {categories.map((cat) => {
          const active = cat.name === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.name)}
              className={`glass-btn burmese-text min-h-[36px] flex-1 rounded-lg px-4.5 py-2.5 text-[9px] font-bold tracking-wider whitespace-nowrap uppercase transition-all ${
                active ? 'bg-purple-600 text-white' : 'text-gray-400'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
