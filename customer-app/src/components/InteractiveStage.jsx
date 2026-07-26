import { useEffect, useRef, useState } from 'react';
import { Ban, Plus } from 'lucide-react';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';
import { sound } from '../lib/sound';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function InteractiveStage({ dish, onOpenFullscreen, steamEnabled, gyroActive }) {
  const { addToCart } = useCart();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const [typedBadge, setTypedBadge] = useState('');
  const [typedTitle, setTypedTitle] = useState('');
  const [typedDesc, setTypedDesc] = useState('');
  const [priceRevealed, setPriceRevealed] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  // Sequential typewriter — badge, then title, then description, then
  // reveal price + the add button together. Restarts whenever the
  // active dish changes (grid tap, fullscreen nav, or initial load).
  useEffect(() => {
    if (!dish) return undefined;

    setTypedBadge('');
    setTypedTitle('');
    setTypedDesc('');
    setPriceRevealed(false);
    setTypingComplete(false);

    const fullBadge = dish.category_name || 'Gourmet Selection';
    const fullTitle = dish.name || '';
    const fullDesc = dish.description || '';

    let phase = 'badge';
    let i = 0;
    let badgeAcc = '';
    let titleAcc = '';
    let descAcc = '';

    const tick = setInterval(() => {
      if (phase === 'badge') {
        if (i < fullBadge.length) {
          badgeAcc += fullBadge[i++];
          setTypedBadge(badgeAcc);
        } else {
          phase = 'title';
          i = 0;
        }
      } else if (phase === 'title') {
        if (i < fullTitle.length) {
          titleAcc += fullTitle[i++];
          setTypedTitle(titleAcc);
        } else {
          phase = 'desc';
          i = 0;
        }
      } else if (phase === 'desc') {
        if (i < fullDesc.length) {
          descAcc += fullDesc[i++];
          setTypedDesc(descAcc);
        } else {
          phase = 'done';
        }
      } else {
        setPriceRevealed(true);
        setTypingComplete(true);
        clearInterval(tick);
      }
    }, 10);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dish?.id]);

  const handleMouseMove = (e) => {
    if (gyroActive || prefersReducedMotion() || !viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const relX = e.clientX - (bounds.left + bounds.width / 2);
    const relY = e.clientY - (bounds.top + bounds.height / 2);
    setTilt({ x: -(relY / (bounds.height / 2)) * 14, y: (relX / (bounds.width / 2)) * 14 });
  };

  const handleMouseLeave = () => {
    if (gyroActive) return;
    setTilt({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!gyroActive || prefersReducedMotion()) return undefined;
    const handleOrientation = (e) => {
      const gamma = e.gamma || 0;
      const beta = e.beta || 0;
      setTilt({
        x: Math.max(-14, Math.min(14, (beta - 50) * 0.4)),
        y: Math.max(-14, Math.min(14, gamma * 0.45)),
      });
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroActive]);

  if (!dish) return null;
  const soldOut = !dish.is_available;

  return (
    <div
      ref={viewportRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex h-full w-full flex-grow select-none items-center justify-between py-1 px-3 md:px-6"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[65%] bg-gradient-to-r from-[#120e16] via-[#120e16]/85 to-transparent" />

      {/* Floating text panel */}
      <div className="pointer-events-none absolute inset-y-0 left-4 z-30 flex w-[48%] flex-col justify-center pr-1 text-left md:left-8">
        <span className="mb-1 text-[7px] font-bold uppercase tracking-widest text-purple-400 md:text-[8px]">
          {typedBadge || 'Gourmet Selection'}
        </span>

        <h2 className="serif-title mb-1 text-xs leading-snug font-semibold tracking-wide text-white drop-shadow-lg sm:text-sm md:text-xl lg:text-2xl">
          {typedTitle}
        </h2>

        <p className="mb-3 max-w-full text-[8px] font-light leading-relaxed text-gray-400 drop-shadow sm:text-[10px]">
          {typedDesc}
        </p>

        {priceRevealed && <p className="mb-3 text-[10px] font-bold text-amber-300 drop-shadow sm:text-base">{formatMMK(dish.price)}</p>}

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              sound.play('success');
              addToCart(dish);
            }}
            disabled={soldOut}
            className={`flex transform items-center justify-center rounded-full border border-purple-400/20 px-3 py-1.5 text-[8px] font-bold tracking-wider text-white uppercase shadow-[0_8px_20px_rgba(124,58,237,0.35)] transition-all duration-300 active:scale-95 md:px-5 md:py-3 md:text-[10px] ${
              soldOut ? 'cursor-not-allowed from-neutral-700 to-neutral-800 opacity-60' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
            } ${typingComplete ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          >
            {soldOut ? (
              <>
                <Ban className="mr-1 h-3 w-3 text-red-400" /> Sold Out
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3 w-3 text-amber-300" /> Add to Order
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parallax plate */}
      <div className="absolute inset-y-0 right-0 z-10 flex w-[60%] items-center justify-center overflow-visible sm:w-[55%]">
        <div
          style={{ transform: `translate(${-tilt.y * 0.4}px, calc(65px + ${-tilt.x * 0.2}px)) scaleY(0.35) scaleX(0.95)` }}
          className="pointer-events-none absolute h-[12%] w-[85%] rounded-full bg-black/95 blur-2xl transition-transform duration-200"
        />

        <div
          onClick={onOpenFullscreen}
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)` }}
          className="plate-container relative flex h-[170px] w-[170px] cursor-pointer items-center justify-center transition-transform duration-300 sm:h-[220px] sm:w-[220px] md:h-[320px] md:w-[320px]"
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-full border border-white/5 bg-gradient-to-tr from-[#131117] to-[#2d2539] shadow-[inset_0_3px_12px_rgba(255,255,255,0.03),0_12px_35px_rgba(0,0,0,0.95)]">
            <div className="flex h-[94%] w-[94%] items-center justify-center rounded-full border border-purple-500/10">
              <div className="h-[86%] w-[86%] rounded-full border border-white/5 bg-gradient-to-b from-[#0e0c12] to-[#040405] shadow-[inset_0_0_15px_rgba(0,0,0,0.85)]" />
            </div>
          </div>

          <div className="absolute z-10 flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full">
            {dish.image_url ? (
              <img src={dish.image_url} alt={dish.name} className="h-full w-full rounded-full object-cover shadow-2xl" />
            ) : (
              <div className="h-full w-full rounded-full bg-white/5" />
            )}
          </div>

          {steamEnabled && !prefersReducedMotion() && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center mix-blend-screen opacity-30">
              <div className="h-1/2 w-1/2 animate-pulse rounded-full bg-gradient-to-t from-transparent via-white/10 to-transparent blur-xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
