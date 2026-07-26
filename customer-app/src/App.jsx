import { useEffect, useMemo, useState } from 'react';
import { getUrlParams } from './lib/config';
import { useMenu } from './hooks/useMenu';
import { useScrollSpy } from './hooks/useScrollSpy';
import { resolveTheme, applyAccentVars, ensureStageFontsLoaded } from './lib/theme';
import Header from './components/Header';
import MenuSection from './components/MenuSection';
import StageHero from './components/StageHero';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import CartBar from './components/CartBar';
import AmbientAudioToggle from './components/AmbientAudioToggle';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';

export default function App() {
  const { storeId, tableNumber } = useMemo(getUrlParams, []);
  const {
    status,
    error,
    categories,
    products,
    localHubUrl,
    kbzpayQrUrl,
    ambientAudioUrl,
    themeConfig,
    reload,
  } = useMenu(storeId);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [stageDish, setStageDish] = useState(null);
  const [stageCategory, setStageCategory] = useState(null);

  const theme = useMemo(() => resolveTheme(themeConfig), [themeConfig]);
  const stage = theme.layout === 'stage';

  useEffect(() => {
    applyAccentVars(theme.shades);
  }, [theme.shades]);

  useEffect(() => {
    if (stage) ensureStageFontsLoaded();
  }, [stage]);

  // Custom background: an image wins over a gradient if both are set
  // (matches the admin-app hint text), applied to the page root.
  const pageBackgroundStyle = useMemo(() => {
    if (!theme.background) return undefined;
    if (theme.background.type === 'image') {
      return {
        backgroundImage: `url(${theme.background.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return { background: `linear-gradient(160deg, ${theme.background.from}, ${theme.background.to})` };
  }, [theme.background]);

  // Standard layout scroll-spies across all category sections; Stage
  // layout just filters its grid by whichever pill is selected.
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);
  const { activeCategory: scrollActiveCategory, registerSection, scrollToCategory } = useScrollSpy(categoryNames);

  // Seed the Stage hero + filter once the menu arrives.
  useEffect(() => {
    if (status !== 'ready' || products.length === 0) return;
    if (!stageDish) setStageDish(products.find((p) => p.is_available) || products[0]);
    if (!stageCategory) setStageCategory(categoryNames[0] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, products, categoryNames]);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <ErrorScreen error={error} onRetry={reload} />;

  const activeCategory = stage ? stageCategory : scrollActiveCategory;
  const onSelectCategory = stage ? setStageCategory : scrollToCategory;
  // Filtered from the flattened+enriched list (carries category_name),
  // not the raw categories array, so the hero's category badge stays
  // correct no matter which grid item was tapped active.
  const stageProducts = products.filter((p) => p.category_name === stageCategory);

  return (
    <div
      className={stage ? 'min-h-screen bg-[#0c0a0e] text-gray-100' : 'min-h-screen bg-white'}
      style={pageBackgroundStyle}
    >
      <Header
        tableNumber={tableNumber}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
        stage={stage}
      />

      {ambientAudioUrl && <AmbientAudioToggle src={ambientAudioUrl} stage={stage} />}

      {stage ? (
        <StageHero products={stageProducts} activeDish={stageDish} onSelectDish={setStageDish} />
      ) : (
        <main className="pb-8">
          {categories.map((category) => (
            <MenuSection
              key={category.id}
              category={category}
              stage={stage}
              sectionRef={registerSection(category.name)}
              onOpenProduct={setSelectedProduct}
            />
          ))}
        </main>
      )}

      <CartBar onOpen={() => setCheckoutOpen(true)} />

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} stage={stage} />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        storeId={storeId}
        tableNumber={tableNumber}
        localHubUrl={localHubUrl}
        kbzpayQrUrl={kbzpayQrUrl}
        stage={stage}
      />
    </div>
  );
}
