import ProductCard from './ProductCard';

export default function MenuSection({ category, stage, sectionRef, onOpenProduct }) {
  return (
    <section ref={sectionRef} data-category={category.name} className="scroll-mt-24 px-3.5 pt-5">
      <h2 className={`mb-3 text-[1.1rem] font-bold ${stage ? 'font-display text-gray-100' : 'text-[#1C2620]'}`}>
        {category.name}
      </h2>
      {category.products.map((product) => (
        <ProductCard key={product.id} product={product} stage={stage} onOpen={onOpenProduct} />
      ))}
    </section>
  );
}
