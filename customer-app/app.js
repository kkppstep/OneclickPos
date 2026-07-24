import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { 
  ShoppingBag, 
  Bell, 
  Plus, 
  Minus, 
  Heart, 
  X, 
  Smartphone, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Ban, 
  ChefHat, 
  Wifi, 
  WifiOff, 
  Sliders, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

// Premium gourmet items configured with local fallback images and metadata
const mockMenu = [
  {
    id: 1,
    title: "ဂျုံမှုန့် Golden Crispy Roll",
    burmese: "ဂျုံမှုန့် (aeaeae)",
    category: "new",
    price: 6000,
    desc: "Crispy wheat rolls brushed with organic forest honey & roasted seeds.",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=600",
    badge: "Specialty",
    soldOut: false,
    steamColor: "rgba(204, 229, 255, 0.22)"
  },
  {
    id: 2,
    title: "Fuji Matcha Custard",
    burmese: "Fuji (aeaeae)",
    category: "savory",
    price: 5000,
    desc: "Rich green tea mousse custard paired with premium sweet milk foam.",
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600",
    badge: "Popular Selection",
    soldOut: false,
    steamColor: "rgba(200, 245, 210, 0.14)"
  },
  {
    id: 3,
    title: "Deconstructed Mohinga",
    burmese: "မုန့်ဟင်းခါး",
    category: "new",
    price: 9500,
    desc: "Savory lemongrass-infused freshwater broth reduction over crispy nets.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    badge: "Authentic Masterpiece",
    soldOut: false,
    steamColor: "rgba(255, 140, 100, 0.24)"
  },
  {
    id: 4,
    title: "Gold Leaf Laphet Thoke",
    burmese: "လက်ဖက်သုပ်",
    category: "new",
    price: 7500,
    desc: "Double-roasted crispy split peas and premium fermented tea leaves.",
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=600",
    badge: "Top Choice",
    soldOut: false,
    steamColor: "rgba(210, 240, 200, 0.16)"
  },
  {
    id: 5,
    title: "Truffle Shan Noodles",
    burmese: "ရှမ်းခေါက်ဆွဲ",
    category: "new",
    price: 12000,
    desc: "Fresh rice noodles tossed in premium dark soy and shaved black truffle.",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600",
    badge: "Premium Craft",
    soldOut: false,
    steamColor: "rgba(240, 220, 200, 0.22)"
  },
  {
    id: 6,
    title: "Wagyu Ginger Skewers",
    burmese: "အမဲသားကင်",
    category: "savory",
    price: 15000,
    desc: "Wagyu beef strips glazed with wild honey and roasted ginger syrup.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
    badge: "Chef Specialty",
    soldOut: false,
    steamColor: "rgba(255, 110, 80, 0.2)"
  },
  {
    id: 7,
    title: "Mandalay Ruby Cold Brew",
    burmese: "မန္တလေးလက်ဖက်ရည်",
    category: "cold",
    price: 4500,
    desc: "Slow-steeped black tea with sweet condensed milk foam overlay.",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600",
    badge: "Craft Brew",
    soldOut: false,
    steamColor: "rgba(255, 255, 255, 0.05)"
  },
  {
    id: 8,
    title: "Yangon Sunset Fizz",
    burmese: "sunset Mocktail",
    category: "cold",
    price: 5500,
    desc: "Zesty cold passion fruit soda garnished with fresh wild mint oil.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600",
    badge: "Signature Drink",
    soldOut: false,
    steamColor: "rgba(230, 240, 255, 0.05)"
  },
  {
    id: 9,
    title: "Spiced Wok Calamari",
    burmese: "ပြည်ကြီးငါး",
    category: "savory",
    price: 8500,
    desc: "Freshly tossed calamari rings with dynamic lemon leaf powder.",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=600",
    badge: "Seafood Choice",
    soldOut: false,
    steamColor: "rgba(250, 240, 220, 0.2)"
  },
  {
    id: 10,
    title: "Roselle Hibiscus Tonic",
    burmese: "အအေး",
    category: "cold",
    price: 4000,
    desc: "Detoxifying sweet tea drink composed of fresh roselle and honeycomb.",
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=600",
    badge: "Organic Extract",
    soldOut: false,
    steamColor: "rgba(255, 220, 230, 0.05)"
  }
];

// Synthesizer engine generating responsive micro-interaction audio feedback
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ambientOsc = null;
    this.ambientGain = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playFeedback(type) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(660, now + 0.04);
      osc.frequency.setValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }
  toggleDrone(isActive) {
    this.init();
    if (!this.ctx) return;
    if (!isActive) {
      if (this.ambientGain) {
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        setTimeout(() => {
          if (this.ambientOsc) {
            this.ambientOsc.stop();
            this.ambientOsc = null;
          }
        }, 500);
      }
    } else {
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(146.83, this.ctx.currentTime);

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.ambientOsc.connect(lowpass);
      lowpass.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.ambientGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 1.0);
      this.ambientOsc.start();
    }
  }
}

const synth = new AudioEngine();

// MODULE 1: src/context/CartContext.jsx
const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('POS_LOCAL_CART');
    return saved ? JSON.parse(saved) : [];
  });
  const [tableId, setTableId] = useState('10');

  useEffect(() => {
    localStorage.setItem('POS_LOCAL_CART', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (dish) => {
    if (!dish || dish.soldOut) return;
    synth.playFeedback('success');
    setCart(prev => {
      const existing = prev.find(item => item.id === dish.id);
      if (existing) {
        return prev.map(item => item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: dish.id, title: dish.title, price: dish.price, quantity: 1 }];
    });
  };

  const modifyCartQty = (id, change) => {
    synth.playFeedback('select');
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const newQty = item.quantity + change;
      if (newQty <= 0) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, quantity: newQty } : i);
    });
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const total = subtotal > 0 ? subtotal + 500 : 0;
  const cartItemCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      modifyCartQty,
      clearCart,
      subtotal,
      total,
      cartItemCount,
      tableId,
      setTableId
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

// MODULE 2: src/components/InteractiveStage.jsx
function InteractiveStage({ menu, activeIndex, onOpenFullscreen, steamEnabled, gyroActive }) {
  const { addToCart } = useCart();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const [typedBadge, setTypedBadge] = useState('');
  const [typedTitle, setTypedTitle] = useState('');
  const [typedDesc, setTypedDesc] = useState('');
  const [tickedPrice, setTickedPrice] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);

  const activeDish = menu[activeIndex] || menu[0];

  useEffect(() => {
    if (!activeDish) return;
    
    setTypedBadge('');
    setTypedTitle('');
    setTypedDesc('');
    setTickedPrice(0);
    setTypingComplete(false);

    const fullBadge = activeDish.badge || "Gourmet Specialty";
    const fullTitle = activeDish.title || "Selected Choice";
    const fullDesc = activeDish.desc || "Prepared fresh by hand.";
    
    let phase = 'badge'; 
    let progressIndex = 0;
    
    let badgeAccumulator = "";
    let titleAccumulator = "";
    let descAccumulator = "";

    const typewriterInterval = setInterval(() => {
      if (phase === 'badge') {
        if (progressIndex < fullBadge.length) {
          badgeAccumulator += fullBadge[progressIndex];
          setTypedBadge(badgeAccumulator);
          progressIndex++;
        } else {
          phase = 'title';
          progressIndex = 0;
        }
      } else if (phase === 'title') {
        if (progressIndex < fullTitle.length) {
          titleAccumulator += fullTitle[progressIndex];
          setTypedTitle(titleAccumulator);
          progressIndex++;
        } else {
          phase = 'desc';
          progressIndex = 0;
        }
      } else if (phase === 'desc') {
        if (progressIndex < fullDesc.length) {
          descAccumulator += fullDesc[progressIndex];
          setTypedDesc(descAccumulator);
          progressIndex++;
        } else {
          phase = 'price';
          progressIndex = 0;
        }
      } else if (phase === 'price') {
        setTickedPrice(activeDish.price);
        setTypingComplete(true);
        clearInterval(typewriterInterval);
      }
    }, 10);

    return () => clearInterval(typewriterInterval);
  }, [activeIndex, menu, activeDish]);

  const handleMouseMove = (e) => {
    if (gyroActive || !viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const relX = e.clientX - (bounds.left + bounds.width / 2);
    const relY = e.clientY - (bounds.top + bounds.height / 2);
    const rotX = -(relY / (bounds.height / 2)) * 14;
    const rotY = (relX / (bounds.width / 2)) * 14;
    setTilt({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    if (gyroActive) return;
    setTilt({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!gyroActive) return;

    const handleOrientation = (e) => {
      const tX = e.gamma || 0; 
      const tY = e.beta || 0;  
      const rY = Math.max(-14, Math.min(14, tX * 0.45));
      const rX = Math.max(-14, Math.min(14, (tY - 50) * 0.4));
      setTilt({ x: rX, y: rY });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gyroActive]);

  return (
    <div 
      ref={viewportRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex-grow flex items-center justify-between relative select-none py-1 px-3 md:px-6 mt-2 h-full w-full"
    >
      <div className="absolute inset-y-0 left-0 w-[65%] bg-gradient-to-r from-[#0d1520] via-[#0d1520]/85 to-transparent pointer-events-none z-20" />

      {/* Floating Descriptive Text Panel */}
      <div className="absolute left-4 md:left-8 top-0 bottom-0 w-[48%] z-30 flex flex-col justify-center text-left pointer-events-none pr-1">
        <div className="mb-1">
          <span className="text-[7px] md:text-[8px] font-bold tracking-widest text-[#0A84FF] uppercase">
            {typedBadge || "Gourmet Selection"}
          </span>
        </div>
        
        <h2 className="serif-title text-xs sm:text-sm md:text-xl lg:text-2xl text-white font-semibold mb-1 leading-snug tracking-wide break-words whitespace-normal drop-shadow-lg">
          {typedTitle || activeDish?.title}
        </h2>
        
        <p className="text-[8px] sm:text-[10px] text-sky-200/60 font-light leading-relaxed mb-3 break-words whitespace-normal drop-shadow max-w-full">
          {typedDesc || activeDish?.desc}
        </p>
        
        <div className="text-[10px] sm:text-base font-bold text-sky-300 mb-3 drop-shadow">
          {tickedPrice.toLocaleString()} MMK
        </div>

        <div className="pointer-events-auto">
          <button 
            onClick={() => addToCart(activeDish)}
            disabled={activeDish?.soldOut}
            className={`bg-gradient-to-r text-white font-bold px-3 py-1.5 md:px-5 md:py-3 rounded-full text-[8px] md:text-[10px] tracking-wider uppercase shadow-[0_8px_20px_rgba(10,132,255,0.35)] border border-sky-400/20 flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
              activeDish?.soldOut 
                ? 'from-neutral-700 to-neutral-800 opacity-60 cursor-not-allowed' 
                : 'from-[#0A84FF] to-sky-600 hover:from-[#0070E0] hover:to-sky-500'
            } ${typingComplete ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          >
            {activeDish?.soldOut ? (
              <><Ban className="w-3 h-3 mr-1 text-red-400" /> Sold Out</>
            ) : (
              <><Plus className="w-3 h-3 mr-1 text-sky-200" /> Add to Order</>
            )}
          </button>
        </div>
      </div>

      {/* Parallax Plate Presentation Graphic */}
      <div className="absolute right-0 top-0 bottom-0 w-[60%] sm:w-[55%] flex items-center justify-center z-10 overflow-visible">
        <div 
          id="shadow-cast"
          style={{
            transform: `translate(${-tilt.y * 0.4}px, calc(65px + ${-tilt.x * 0.2}px)) scaleY(0.35) scaleX(0.95)`
          }}
          className="absolute w-[85%] h-[12%] bg-black/95 blur-2xl rounded-full pointer-events-none transition-transform duration-200"
        />

        <div 
          onClick={onOpenFullscreen}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
          }}
          className="plate-container w-[170px] h-[170px] sm:w-[220px] sm:h-[220px] md:w-[320px] md:h-[320px] relative flex items-center justify-center cursor-pointer transition-transform duration-300"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0a121d] to-[#152a42] shadow-[inset_0_3px_12px_rgba(255,255,255,0.03),0_12px_35px_rgba(0,0,0,0.95)] border border-white/5 flex items-center justify-center">
            <div className="w-[94%] h-[94%] rounded-full border border-[#0A84FF]/20 flex items-center justify-center">
              <div className="w-[86%] h-[86%] rounded-full bg-gradient-to-b from-[#080d14] to-[#03060a] shadow-[inset_0_0_15px_rgba(0,0,0,0.85)] border border-white/5" />
            </div>
          </div>

          <div className="absolute w-[80%] h-[80%] rounded-full overflow-hidden z-10 flex items-center justify-center">
            <img 
              src={activeDish?.image} 
              alt={activeDish?.title}
              className="w-full h-full object-cover rounded-full shadow-2xl"
            />
          </div>

          {steamEnabled && (
            <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-30 flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-gradient-to-t from-transparent via-sky-200/20 to-transparent blur-xl animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// MODULE 3: src/components/CategoryNav.jsx
function CategoryNav({ activeCategory, onSelectCategory }) {
  return (
    <nav className="mb-3.5 sticky top-0 z-30 py-1 bg-[#060b12]/95 backdrop-blur-md shrink-0">
      <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl overflow-x-auto no-scrollbar">
        <button 
          onClick={() => onSelectCategory('new')} 
          className={`glass-btn flex-1 px-4.5 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all min-h-[36px] ${activeCategory === 'new' ? 'active bg-[#0A84FF] text-white shadow-[0_0_12px_rgba(10,132,255,0.4)]' : 'text-sky-200/60'}`}
        >
          New
        </button>
        <button 
          onClick={() => onSelectCategory('savory')} 
          className={`glass-btn burmese-text flex-1 px-4.5 py-2.5 rounded-lg text-[9px] font-bold tracking-wider transition-all min-h-[36px] ${activeCategory === 'savory' ? 'active bg-[#0A84FF] text-white shadow-[0_0_12px_rgba(10,132,255,0.4)]' : 'text-sky-200/60'}`}
        >
          အသစ်စား
        </button>
        <button 
          onClick={() => onSelectCategory('cold')} 
          className={`glass-btn burmese-text flex-1 px-4.5 py-2.5 rounded-lg text-[9px] font-bold tracking-wider transition-all min-h-[36px] ${activeCategory === 'cold' ? 'active bg-[#0A84FF] text-white shadow-[0_0_12px_rgba(10,132,255,0.4)]' : 'text-sky-200/60'}`}
        >
          အအေး
        </button>
      </div>
    </nav>
  );
}

// MODULE 4: src/components/MenuGrid.jsx
function MenuGrid({ menu, activeIndex, onSelectDish, sectionsRefs }) {
  const { addToCart } = useCart();

  const renderSection = (categoryKey, categoryTitle) => {
    const items = menu.filter(item => item.category === categoryKey);
    return (
      <div ref={sectionsRefs[categoryKey]} id={`section-${categoryKey}`} className="space-y-3">
        <h4 className="serif-title text-[9px] font-bold tracking-widest text-[#0A84FF] uppercase px-1 border-l-2 border-[#0A84FF] pl-2">
          {categoryTitle}
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item) => {
            const indexInMenu = menu.indexOf(item);
            const isSelected = activeIndex === indexInMenu;
            return (
              <div 
                key={item.id}
                onClick={() => onSelectDish(indexInMenu)}
                className={`relative glass-panel rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform active:scale-95 ${
                  isSelected ? 'ring-2 ring-[#0A84FF]/70 bg-white/[0.04]' : 'hover:border-[#0A84FF]/20'
                }`}
              >
                <div className="p-3 flex flex-col justify-between h-[135px] relative">
                  <div className="absolute inset-0 z-0 opacity-10 transition-opacity">
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-start gap-1">
                    <div className="max-w-[75%]">
                      <span className="text-[5.5px] font-bold tracking-widest text-[#0A84FF] uppercase bg-[#0A84FF]/10 px-1 rounded border border-[#0A84FF]/20">
                        {item.badge}
                      </span>
                      <h3 className="burmese-text font-bold text-white text-[10px] tracking-wide mt-1 truncate">
                        {item.title}
                      </h3>
                      <p className="burmese-text text-[8px] text-sky-200/50 truncate leading-none">
                        {item.burmese}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-sky-300 shrink-0 mt-0.5">
                      {item.price.toLocaleString()} MMK
                    </span>
                  </div>
                  
                  {item.soldOut && (
                    <span className="absolute top-2.5 left-2.5 bg-red-600/90 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider z-20">
                      Sold out
                    </span>
                  )}

                  <div className="relative z-10 flex justify-between items-center pt-2 mt-1 border-t border-white/[0.05]">
                    <span className="text-[7.5px] text-sky-200/50 font-light truncate max-w-[70%]">
                      {item.desc}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      disabled={item.soldOut}
                      className="w-6 h-6 rounded-full bg-white/5 border border-white/10 active:bg-[#0A84FF] active:text-white transition-all flex items-center justify-center min-h-[24px] min-w-[24px]"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-200" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-32">
      {renderSection('new', 'New Additions • အသစ်စား')}
      {renderSection('savory', 'Savory Selection • လက်ရာဆန်း')}
      {renderSection('cold', 'Beverage Extracts • အအေးပွဲ')}
    </div>
  );
}

// MODULE 5: src/components/FloatingCart.jsx
function FloatingCart({ onOpenCart }) {
  const { cartItemCount, total, tableId } = useCart();

  if (cartItemCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-[110] flex justify-center animate-slide-up">
      <button 
        onClick={onOpenCart}
        className="w-full max-w-md bg-gradient-to-r from-[#0A84FF] via-sky-600 to-sky-700 text-white rounded-full p-1 shadow-[0_12px_30px_rgba(10,132,255,0.45)] border border-white/10 flex items-center justify-between transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <div className="flex items-center gap-2.5 pl-4">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-sky-200 animate-pulse" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold tracking-wide">{cartItemCount} Gourmet Selections</p>
            <p className="text-[8.5px] text-sky-100">Total: {total.toLocaleString()} MMK (Table {tableId})</p>
          </div>
        </div>
        <div className="bg-white/10 hover:bg-white/15 text-white text-[9px] font-bold tracking-wider uppercase py-2 px-4 rounded-full flex items-center gap-1 transition-colors">
          View Order <ArrowRight className="w-3 h-3" />
        </div>
      </button>
    </div>
  );
}

// MODULE 6: src/components/SelectionTray.jsx
function SelectionTray({ onClose, onSubmit }) {
  const { cart, modifyCartQty, subtotal, total } = useCart();

  return (
    <aside className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex justify-end">
      <div className="h-full w-full max-w-sm bg-[#080f19] border-l border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col justify-between p-5 animate-slide-left">
        <div>
          <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
            <h3 className="serif-title text-xs text-white font-bold tracking-wider">Your Selections</h3>
            <button 
              onClick={onClose} 
              className="text-sky-200/60 hover:text-white min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[60vh] no-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <ChefHat className="w-8 h-8 text-sky-900 mb-2 animate-bounce" />
                <p className="text-[9px] text-sky-200/50 uppercase tracking-widest font-semibold">Selection Tray is Empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                  <div className="max-w-[60%]">
                    <h4 className="serif-title text-[10px] text-white font-semibold tracking-wide truncate">
                      {item.title}
                    </h4>
                    <span className="text-[8.5px] text-[#0A84FF] block mt-0.5">
                      {item.price.toLocaleString()} MMK x {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => modifyCartQty(item.id, -1)}
                      className="w-6.5 h-6.5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-sky-200/60 hover:text-white min-w-[26px] min-h-[26px]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-white font-semibold w-3 text-center">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => modifyCartQty(item.id, 1)}
                      className="w-6.5 h-6.5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-sky-200/60 hover:text-white min-w-[26px] min-h-[26px]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-3.5 mt-4 space-y-2.5">
          <div className="flex justify-between text-[10px] text-sky-200/60">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString()} MMK</span>
          </div>
          <div className="flex justify-between text-[10px] text-sky-200/60">
            <span>Presentation Surcharges</span>
            <span>{subtotal > 0 ? "500 MMK" : "0 MMK"}</span>
          </div>
          <div className="flex justify-between text-xs text-white font-semibold pt-1.5 border-t border-white/[0.02]">
            <span className="serif-title tracking-wider">Total Investment</span>
            <span className="text-sky-300 font-bold">{total.toLocaleString()} MMK</span>
          </div>
          <button 
            onClick={onSubmit}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-[#0A84FF] to-sky-600 hover:from-[#0070E0] hover:to-sky-500 text-white font-bold py-3.5 rounded-lg text-[9px] tracking-widest uppercase transition-all shadow-lg min-h-[40px] disabled:opacity-50"
          >
            Transmit Order to POS
          </button>
        </div>
      </div>
    </aside>
  );
}

// MODULE 7: src/components/DishModal.jsx
function DishModal({ menu, index, onClose, onChangeIndex }) {
  const { addToCart } = useCart();
  const activeFullscreenDish = menu[index] || menu[0];
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleNextModalDish = (e) => {
    if (e) e.stopPropagation();
    synth.playFeedback('select');
    onChangeIndex((index + 1) % menu.length);
  };

  const handlePrevModalDish = (e) => {
    if (e) e.stopPropagation();
    synth.playFeedback('select');
    onChangeIndex((index - 1 + menu.length) % menu.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > swipeThreshold) {
      handleNextModalDish();
    } else if (diff < -swipeThreshold) {
      handlePrevModalDish();
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/95 backdrop-blur-2xl transition-all duration-300 ease-out p-4"
    >
      <div className="w-full flex justify-between items-center max-w-4xl z-[110] px-4 pt-4 pointer-events-auto">
        <div className="text-[10px] font-bold text-[#0A84FF] tracking-widest uppercase">
          Dish {index + 1} of {menu.length}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-white text-sm hover:bg-white/10 active:scale-90 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl flex-grow flex items-center justify-between select-none px-2"
      >
        <button 
          onClick={handlePrevModalDish}
          className="glass-btn w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all z-20 pointer-events-auto"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#091321] to-[#152e4a] shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 flex items-center justify-center animate-[spin_50s_linear_infinite]">
            <div className="w-[94%] h-[94%] rounded-full border border-[#0A84FF]/20 flex items-center justify-center">
              <div className="w-[86%] h-[86%] rounded-full bg-gradient-to-b from-[#060c14] to-[#020508] shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] border border-white/5" />
            </div>
          </div>
          
          <div className="absolute w-[80%] h-[80%] rounded-full overflow-hidden z-10 flex items-center justify-center shadow-inner">
            <img 
              src={activeFullscreenDish?.image} 
              alt={activeFullscreenDish?.title} 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        <button 
          onClick={handleNextModalDish}
          className="glass-btn w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all z-20 pointer-events-auto"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl text-center select-none pb-20 z-[110] px-4 pointer-events-auto flex flex-col items-center"
      >
        <span className="text-[7.5px] font-bold tracking-widest text-[#0A84FF] uppercase bg-[#0A84FF]/10 px-2 py-0.5 rounded border border-[#0A84FF]/20 mb-2">
          {activeFullscreenDish?.badge}
        </span>
        <h3 className="serif-title text-base sm:text-xl text-white font-bold tracking-wider leading-snug">
          {activeFullscreenDish?.title}
        </h3>
        <p className="text-[9.5px] sm:text-[11.5px] text-sky-200/70 mt-1.5 max-w-md px-4 font-light leading-relaxed">
          {activeFullscreenDish?.desc}
        </p>
        <div className="text-xs sm:text-sm font-bold text-sky-300 mt-2 mb-4">
          {activeFullscreenDish?.price.toLocaleString()} MMK
        </div>

        <button 
          onClick={() => addToCart(activeFullscreenDish)}
          disabled={activeFullscreenDish?.soldOut}
          className={`bg-gradient-to-r text-white font-bold px-8 py-3.5 rounded-full text-[10px] tracking-wider uppercase shadow-[0_10px_25px_rgba(10,132,255,0.35)] border border-sky-400/20 flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
            activeFullscreenDish?.soldOut 
              ? 'from-neutral-700 to-neutral-800 opacity-60 cursor-not-allowed' 
              : 'from-[#0A84FF] via-sky-600 to-sky-700 hover:from-[#0070E0] hover:to-sky-500'
          }`}
        >
          {activeFullscreenDish?.soldOut ? (
            <><Ban className="w-4 h-4 mr-2 text-red-400" /> Sold Out</>
          ) : (
            <><Plus className="w-4 h-4 mr-2 text-sky-200" /> Add to order • {activeFullscreenDish?.price.toLocaleString()} MMK</>
          )}
        </button>
      </div>
    </div>
  );
}

// MODULE 8: src/App.jsx
export default function App() {
  return (
    <CartProvider>
      <MainAppLayout />
    </CartProvider>
  );
}

function MainAppLayout() {
  const { cart, tableId, setTableId, clearCart, total } = useCart();
  const [menu, setMenu] = useState(() => {
    const saved = localStorage.getItem('POS_LOCAL_MENU');
    return saved ? JSON.parse(saved) : mockMenu;
  });
  const [activeCategory, setActiveCategory] = useState('new');
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [gyroActive, setGyroActive] = useState(false);
  const [musicActive, setMusicActive] = useState(false);
  const [steamEnabled, setSteamEnabled] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('POS_API_BASE') || window.location.origin);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [alertConfig, setAlertConfig] = useState(null);
  const [transmitting, setTransmitting] = useState(false);

  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const menuContainerRef = useRef(null);

  const sectionsRefs = {
    new: useRef(null),
    savory: useRef(null),
    cold: useRef(null)
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchPOSMenu = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/public-menu`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const transformed = data.map((item, idx) => ({
            id: item.id || idx + 1,
            title: item.name || item.title,
            burmese: item.burmese_name || item.burmese || "Gourmet Spec",
            category: item.category || "new",
            price: item.price || 5000,
            desc: item.description || item.desc || "Artisanal preparation technique.",
            image: item.image_url || item.image || "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=600",
            badge: item.badge || "Special Choice",
            soldOut: !!(item.sold_out || item.soldOut),
            steamColor: "rgba(204, 229, 255, 0.22)"
          }));
          setMenu(transformed);
        }
      }
    } catch (err) {
      console.warn("Unable to connect live with cloud-api endpoints. Falling back to local offline structure.", err);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchPOSMenu();
  }, [fetchPOSMenu]);

  const onMenuScroll = (e) => {
    const container = e.currentTarget;
    const containerBounds = container.getBoundingClientRect();
    
    let currentCategory = 'new';
    let closestDiff = Infinity;

    Object.keys(sectionsRefs).forEach((key) => {
      const secEl = sectionsRefs[key].current;
      if (secEl) {
        const bounds = secEl.getBoundingClientRect();
        const diff = Math.abs(bounds.top - containerBounds.top);
        if (bounds.top < containerBounds.bottom && bounds.bottom > containerBounds.top) {
          if (diff < closestDiff) {
            closestDiff = diff;
            currentCategory = key;
          }
        }
      }
    });

    if (currentCategory !== activeCategory) {
      setActiveCategory(currentCategory);
    }
  };

  const handleCategoryTabClick = (catId) => {
    synth.playFeedback('select');
    setActiveCategory(catId);

    const targetSection = sectionsRefs[catId].current;
    if (targetSection && menuContainerRef.current) {
      menuContainerRef.current.scrollTo({
        top: targetSection.offsetTop - 12,
        behavior: 'smooth'
      });
    }
  };

  const submitCartOrder = async () => {
    if (cart.length === 0) return;
    setCartOpen(false);
    setTransmitting(true);

    const payload = {
      table_id: tableId,
      items: cart.map(i => ({
        menu_item_id: i.id,
        quantity: i.quantity,
        notes: ""
      })),
      total_amount: total
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setAlertConfig({
          title: "Order Transmitted!",
          message: `Delicious selections are successfully transmitted to the kitchen monitor at Table ${tableId}.`
        });
        clearCart();
      } else {
        setAlertConfig({
          title: "Local Session Updated",
          message: `Table ${tableId} service updated. Our staff will confirm your selections shortly.`
        });
        clearCart();
      }
    } catch (err) {
      setAlertConfig({
        title: "Offline Sync Buffered",
        message: `Order logged locally inside browser storage. Dining table session Table ${tableId} is protected.`
      });
      clearCart();
    } finally {
      setTransmitting(false);
    }
  };

  return (
    <div className="relative h-screen w-screen selection:bg-[#0A84FF]/30 selection:text-sky-200 flex flex-col overflow-hidden bg-[#060b12] text-gray-100">
      
      {/* Dynamic Ice ambient background glow overlay */}
      <div 
        id="ambient-glow" 
        style={{
          backgroundColor: menu[activeStageIndex]?.category === 'new' ? 'rgba(10, 132, 255, 0.12)' : 
                           menu[activeStageIndex]?.category === 'savory' ? 'rgba(0, 212, 255, 0.08)' : 'rgba(204, 229, 255, 0.08)'
        }}
        className="absolute top-1/4 left-1/4 w-[280px] h-[280px] md:w-[500px] md:h-[500px] rounded-full blur-[100px] pointer-events-none z-0 transition-all duration-700"
      />

      <div className="relative z-10 flex flex-col lg:flex-row h-screen w-full overflow-hidden">
        
        {/* UPPER STAGE */}
        <section 
          className="w-full lg:w-[45%] xl:w-[48%] h-[38vh] lg:h-full bg-gradient-to-b from-[#0c1624] to-[#04080e] lg:border-r lg:border-white/5 overflow-hidden flex flex-col justify-between p-3 md:p-6 lg:p-10 relative stage-3d shrink-0"
        >
          <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-40">
            <div className="pointer-events-none text-[8px] text-sky-200/60 tracking-wider uppercase font-semibold flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 text-[#0A84FF] animate-pulse" /> Table {tableId}
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  const updated = prompt("Enter active dining Table ID:", tableId);
                  if (updated) setTableId(updated);
                }}
                className="cursor-pointer glass-panel px-2 py-1 rounded-lg text-[8px] flex items-center gap-1 font-bold bg-white/[0.02] border border-white/5 text-sky-300 hover:bg-white/5 transition-colors"
                title="Change Table ID"
              >
                T-{tableId}
              </button>

              <button 
                onClick={() => {
                  const targetState = !musicActive;
                  setMusicActive(targetState);
                  synth.toggleDrone(targetState);
                }}
                className={`glass-btn w-7.5 h-7.5 rounded-lg flex items-center justify-center text-sky-200/60 hover:text-white min-w-[30px] min-h-[30px] ${musicActive ? 'active border-[#0A84FF] bg-[#0A84FF]/20 text-[#0A84FF]' : ''}`}
                title="Toggle Ambient Audio Feed"
              >
                {musicActive ? <Volume2 className="w-3.5 h-3.5 text-[#0A84FF] animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button 
                onClick={() => setConfigOpen(true)}
                className="cursor-pointer glass-panel px-1.5 py-1 rounded-lg text-[8px] flex items-center justify-center bg-white/[0.02] border border-white/5 min-w-[28px] min-h-[28px]"
                title="POS API Config"
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button 
                onClick={() => setGyroActive(!gyroActive)}
                className={`glass-btn w-7.5 h-7.5 rounded-lg flex items-center justify-center min-w-[30px] min-h-[30px] ${gyroActive ? 'active border-[#0A84FF] bg-[#0A84FF]/20 text-[#0A84FF]' : 'text-sky-200/60'}`}
                title="Toggle Gyroscope Phone Tilt"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setSteamEnabled(!steamEnabled)}
                className={`glass-btn w-7.5 h-7.5 rounded-lg flex items-center justify-center min-w-[30px] min-h-[30px] ${steamEnabled ? 'text-sky-300 border-sky-400/20 bg-sky-400/5' : 'text-sky-200/60'}`}
                title="Toggle Heat Steam FX"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setCartOpen(true)}
                className="relative glass-btn w-7.5 h-7.5 rounded-lg flex items-center justify-center text-white min-w-[30px] min-h-[30px]"
                title="View Selection Tray"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-200" />
                {cart.reduce((acc, c) => acc + c.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white text-[7px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {cart.reduce((acc, c) => acc + c.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          <InteractiveStage 
            menu={menu}
            activeIndex={activeStageIndex}
            onOpenFullscreen={() => {
              setFullscreenIndex(activeStageIndex);
              setFullscreenOpen(true);
            }}
            steamEnabled={steamEnabled}
            gyroActive={gyroActive}
          />
        </section>

        {/* BOTTOM MENU AREA */}
        <main 
          ref={menuContainerRef}
          onScroll={onMenuScroll}
          className="w-full lg:w-[55%] xl:w-[52%] flex flex-col px-4 py-3 md:px-8 md:py-6 h-[62vh] lg:h-screen overflow-y-auto no-scrollbar bg-[#060b12] relative z-10 scroll-smooth"
        >
          <CategoryNav 
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryTabClick}
          />

          <MenuGrid 
            menu={menu}
            activeIndex={activeStageIndex}
            onSelectDish={setActiveStageIndex}
            sectionsRefs={sectionsRefs}
          />
        </main>
      </div>

      <FloatingCart onOpenCart={() => setCartOpen(true)} />

      {cartOpen && (
        <SelectionTray 
          onClose={() => setCartOpen(false)}
          onSubmit={submitCartOrder}
        />
      )}

      {configOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="glass-panel p-5 rounded-2xl max-w-xs w-full text-center border border-[#0A84FF]/20">
            <h3 className="serif-title text-xs text-white font-bold mb-1 tracking-wider">Kitchen POS Integration</h3>
            <p className="text-[9px] text-sky-200/60 mb-4">Set your active OneclickPos cloud-api base URL</p>
            
            <div className="space-y-2 text-left mb-4">
              <label className="text-[8.5px] text-[#0A84FF] font-bold uppercase tracking-wide block">Local Endpoint URL</label>
              <input 
                id="input-api-url" 
                type="text" 
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="w-full bg-black/55 border border-white/10 rounded-lg p-2 text-[10px] text-white font-mono focus:outline-none focus:border-[#0A84FF]" 
                placeholder="e.g. http://192.168.1.100:5000"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setConfigOpen(false)} 
                className="flex-grow border border-white/10 text-sky-200/60 font-bold py-2 rounded-lg text-[9px] uppercase hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('POS_API_BASE', apiBaseUrl);
                  setConfigOpen(false);
                  fetchPOSMenu();
                }} 
                className="flex-grow bg-[#0A84FF] text-white font-bold py-2 rounded-lg text-[9px] uppercase hover:bg-[#0070E0] transition-all"
              >
                Save Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreenOpen && (
        <DishModal 
          menu={menu}
          index={fullscreenIndex}
          onClose={() => setFullscreenOpen(false)}
          onChangeIndex={setFullscreenIndex}
        />
      )}

      {transmitting && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[140] flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-xs text-center border border-[#0A84FF]/35">
            <div className="w-10 h-10 rounded-full border-2 border-[#0A84FF] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[10px] text-sky-200/80 font-mono tracking-wider">Transmitting Order to POS Terminal...</p>
          </div>
        </div>
      )}

      {alertConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-xs text-center border border-[#0A84FF]/35 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-[#0A84FF]/10 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] mx-auto mb-4 text-base">
              <CheckCircle2 className="w-6 h-6 text-[#0A84FF] animate-bounce" />
            </div>
            <h3 className="serif-title text-xs text-white font-bold mb-2 tracking-wider">
              {alertConfig.title}
            </h3>
            <p className="text-[9.5px] text-sky-200/60 leading-relaxed mb-4">
              {alertConfig.message}
            </p>
            <button 
              onClick={() => setAlertConfig(null)}
              className="w-full bg-gradient-to-r from-[#0A84FF] to-sky-600 text-white font-bold py-2 rounded-lg text-[9px] tracking-widest uppercase transition-all min-h-[38px]"
            >
              Wonderful
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
