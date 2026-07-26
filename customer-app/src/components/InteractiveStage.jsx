import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';

const MAX_TILT_DEG = 8;

export default function InteractiveStage({ dish }) {
  const { addToCart } = useCart();
  const cardRef = useRef(null);
  const frameRef = useRef(null);
  const [typedLength, setTypedLength] = useState(0);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const [showEnableTilt, setShowEnableTilt] = useState(false);

  // Typewriter reveal of the description, restarting whenever the
  // active dish changes (grid tap below swaps `dish`).
  useEffect(() => {
    setTypedLength(0);
    const text = dish?.description || '';
    if (!text) return undefined;
    const id = setInterval(() => {
      setTypedLength((len) => (len >= text.length ? len : len + 1));
    }, 18);
    return () => clearInterval(id);
  }, [dish?.id, dish?.description]);

  // iOS requires a user gesture to grant DeviceOrientationEvent
  // access; Android/desktop don't gate it at all. Feature-detect
  // rather than assume, and only surface the enable button where it's
  // actually needed.
  useEffect(() => {
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    setShowEnableTilt(needsPermission);
    if (!needsPermission && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setOrientationEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!orientationEnabled) return undefined;
    const onOrientation = (e) => {
      if (e.beta == null || e.gamma == null) return;
      const rotateX = clamp(((e.beta - 45) / 45) * -MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      const rotateY = clamp((e.gamma / 45) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      applyTilt(cardRef.current, rotateX, rotateY);
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [orientationEnabled]);

  const enableTilt = async () => {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result === 'granted') setOrientationEnabled(true);
    } catch {
      // ignored — falls back to mouse-move tilt on desktop
    }
  };

  const onMouseMove = (e) => {
    if (orientationEnabled) return; // don't fight the gyroscope on touch devices
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      applyTilt(el, py * -MAX_TILT_DEG, px * MAX_TILT_DEG);
    });
  };

  const onMouseLeave = () => {
    cancelAnimationFrame(frameRef.current);
    applyTilt(cardRef.current, 0, 0);
  };

  if (!dish) return null;
  const description = dish.description || '';

  return (
    <div className="relative px-4 pt-6 pb-8">
      {showEnableTilt && !orientationEnabled && (
        <button
          type="button"
          onClick={enableTilt}
          className="absolute right-6 top-6 z-10 rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-semibold text-gray-300 backdrop-blur"
        >
          Enable tilt
        </button>
      )}

      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.15s ease-out' }}
        className="relative mx-auto flex max-w-sm flex-col items-center rounded-[28px] border border-white/8 bg-gradient-to-b from-white/5 to-transparent px-6 pb-7 pt-10 text-center"
      >
        {dish.category_name && (
          <span
            className="mb-3 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
          >
            {dish.category_name}
          </span>
        )}

        <div className="relative mb-5 h-44 w-44">
          {[0, 1.4].map((delay) => (
            <span
              key={delay}
              className="stage-steam absolute left-1/2 top-0 h-16 w-3 -translate-x-1/2 rounded-full bg-white/25 blur-md"
              style={{ animationDelay: `${delay}s` }}
              aria-hidden="true"
            />
          ))}
          {dish.image_url ? (
            <img
              src={dish.image_url}
              alt={dish.name}
              className="h-44 w-44 rounded-full border-4 border-white/10 object-cover shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <div className="h-44 w-44 rounded-full border-4 border-white/10 bg-white/5" />
          )}
        </div>

        <h1 className="font-display mb-2 text-2xl font-semibold text-gray-50">{dish.name}</h1>

        <p className="mb-4 min-h-10 text-[0.88rem] text-gray-400">
          {description.slice(0, typedLength)}
          {typedLength < description.length && <span className="animate-pulse">|</span>}
        </p>

        <p
          className="mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-xl font-bold text-transparent"
        >
          {formatMMK(dish.price)}
        </p>

        <button
          type="button"
          disabled={!dish.is_available}
          onClick={() => addToCart(dish)}
          className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-dark))` }}
        >
          <Plus size={16} />
          {dish.is_available ? 'Add to order' : 'Sold out'}
        </button>
      </div>
    </div>
  );
}

function applyTilt(el, rotateX, rotateY) {
  if (!el) return;
  el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
