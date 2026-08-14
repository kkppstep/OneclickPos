import { useEffect, useMemo, useState } from 'react';
import { getUrlParams } from './lib/config';
import { useMenu } from './hooks/useMenu';
import { useScrollSpy } from './hooks/useScrollSpy';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAmbientAudio } from './hooks/useAmbientAudio';
import { resolveTheme, applyAccentVars, ensureStageFontsLoaded } from './lib/theme';
import Header from './components/Header';
import MenuSection from './components/MenuSection';
import StageControls from './components/StageControls';
import CategoryPills from './components/CategoryPills';
import MenuGridSection from './components/MenuGridSection';
import InteractiveStage from './components/InteractiveStage';
import DishModal from './components/DishModal';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import CartBar from './components/CartBar';
import AmbientAudioToggle from './components/AmbientAudioToggle';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import StaffCallButton from './components/StaffCallButton';
import { useCart } from './context/CartContext';

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
  const [fullscreenIndex, setFullscreenIndex] = useState(null);
  const [steamEnabled, setSteamEnabled] = useState(true);
  const [gyroActive, setGyroActive] = useState(false);
  const [stageMainEl, setStageMainEl] = useState(null);

  const theme = useMemo(() => resolveTheme(themeConfig), [themeConfig]);
  const stage = theme.layout === 'stage';
  const isOnline = useOnlineStatus();
  const { totalItems } = useCart();
  const ambient = useAmbientAudio(stage ? ambientAudioUrl : null);

  useEffect(() => {
    applyAccentVars(theme.shades);
  }, [theme.shades]);

  useEffect(() => {
    if (stage) ensureStageFontsLoaded();
  }, [stage]);

  // Custom background: an image wins over a gradient if both are set
  // (matches the admin-app hint text). Stage layout ignores this
  // entirely — its dark/glass palette is fixed, not store-recolorable
  // (see lib/theme.js).
  const pageBackgroundStyle = useMemo(() => {
    if (stage || !theme.background) return undefined;
    if (theme.background.type === 'image') {
      return {
        backgroundImage: `url(${theme.background.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return { background: `linear-gradient(160deg, ${theme.background.from}, ${theme.background.to})` };
  }, [theme.background, stage]);

  // Standard layout scroll-spies the whole page; Stage layout scroll-
  // spies within its own independently-scrolling menu panel.
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);
  const { activeCategory: scrollActiveCategory, registerSection, scrollToCategory } = useScrollSpy(
    categoryNames,
    stage ? stageMainEl : null
  );

  // Seed the Stage hero + filter once the menu arrives.
  useEffect(() => {
    if (status !== 'ready' || products.length === 0) return;
    if (!stageDish) setStageDish(products.find((p) => p.is_available) || products[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, products, categoryNames]);

  const handleToggleGyro = async () => {
    if (gyroActive) {
      setGyroActive(false);
      return;
    }
    const needsPermission =
      typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (needsPermission) {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result === 'granted') setGyroActive(true);
      } catch {
        // ignored — stays mouse/static-tilt only
      }
    } else {
      setGyroActive(true);
    }
  };

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <ErrorScreen error={error} onRetry={reload} />;

  if (stage) {
    const fullscreenOpen = fullscreenIndex !== null;

    return (
      <div className="fixed inset-0 overflow-hidden bg-[#0c0a0e] text-gray-100">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-purple-700/10 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-indigo-700/10 blur-[100px]" />

        <div className="relative flex h-full w-full flex-col lg:flex-row">
          <section className="stage-3d relative h-[38vh] shrink-0 overflow-hidden bg-gradient-to-b from-[#120e16] to-[#080709] lg:h-full lg:w-[46%]">
            <StageControls
              tableNumber={tableNumber}
              hasAmbientAudio={Boolean(ambientAudioUrl)}
              musicActive={ambient.playing}
              onToggleMusic={ambient.toggle}
              isOnline={isOnline}
              gyroActive={gyroActive}
              onToggleGyro={handleToggleGyro}
              steamEnabled={steamEnabled}
              onToggleSteam={() => setSteamEnabled((s) => !s)}
              cartCount={totalItems}
              onOpenCart={() => setCheckoutOpen(true)}
            />
            <InteractiveStage
              dish={stageDish}
              steamEnabled={steamEnabled}
              gyroActive={gyroActive}
              onOpenFullscreen={() => {
                const idx = products.findIndex((p) => p.id === stageDish?.id);
                setFullscreenIndex(idx >= 0 ? idx : 0);
              }}
            />
          </section>

          <main ref={setStageMainEl} className="no-scrollbar flex-1 overflow-y-auto px-4 pt-3 lg:px-6 lg:pt-5">
            <CategoryPills categories={categories} activeCategory={scrollActiveCategory} onSelect={scrollToCategory} />
            <div className="space-y-7 pb-36">
              {categories.map((category) => (
                <MenuGridSection
                  key={category.id}
                  category={category}
                  sectionRef={registerSection(category.name)}
                  activeDishId={stageDish?.id}
                  onSelectDish={setStageDish}
                />
              ))}
            </div>
          </main>
        </div>

        <CartBar stage tableNumber={tableNumber} onOpen={() => setCheckoutOpen(true)} />
        <StaffCallButton storeId={storeId} tableNumber={tableNumber} stage />

        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          storeId={storeId}
          tableNumber={tableNumber}
          localHubUrl={localHubUrl}
          kbzpayQrUrl={kbzpayQrUrl}
          stage
        />

        {fullscreenOpen && (
          <DishModal
            products={products}
            index={fullscreenIndex}
            onChangeIndex={setFullscreenIndex}
            onClose={() => setFullscreenIndex(null)}
          />
        )}
      </div>
    );
  }

  const activeCategory = scrollActiveCategory;

  return (
    <div className="min-h-screen bg-white" style={pageBackgroundStyle}>
      <Header
        tableNumber={tableNumber}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={scrollToCategory}
        stage={false}
      />

      {ambientAudioUrl && <AmbientAudioToggle src={ambientAudioUrl} />}

      <main className="pb-8">
        {categories.map((category) => (
          <MenuSection
            key={category.id}
            category={category}
            stage={false}
            sectionRef={registerSection(category.name)}
            onOpenProduct={setSelectedProduct}
          />
        ))}
      </main>

      <CartBar onOpen={() => setCheckoutOpen(true)} />
      <StaffCallButton storeId={storeId} tableNumber={tableNumber} />

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} stage={false} />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        storeId={storeId}
        tableNumber={tableNumber}
        localHubUrl={localHubUrl}
        kbzpayQrUrl={kbzpayQrUrl}
        stage={false}
      />
    </div>
  );
}
