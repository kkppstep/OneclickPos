import React, { useState, useEffect, useRef } from 'react';
import { Plus, Ban } from 'lucide-react';
import { useCart } from '../context/CartContext'; // Adjust import path if needed

export default function InteractiveStage({ menu, activeIndex, onOpenFullscreen, steamEnabled, gyroActive }) {
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
      <div className="absolute inset-y-0 left-0 w-[65%] bg-gradient-to-r from-[#120e16] via-[#120e16]/85 to-transparent pointer-events-none z-20" />

      {/* Floating Descriptive Text Panel */}
      <div className="absolute left-4 md:left-8 top-0 bottom-0 w-[48%] z-30 flex flex-col justify-center text-left pointer-events-none pr-1">
        <div className="mb-1">
          <span className="text-[7px] md:text-[8px] font-bold tracking-widest text-purple-400 uppercase">
            {typedBadge || "Gourmet Selection"}
          </span>
        </div>
        
        <h2 className="serif-title text-xs sm:text-sm md:text-xl lg:text-2xl text-white font-semibold mb-1 leading-snug tracking-wide break-words whitespace-normal drop-shadow-lg">
          {typedTitle || activeDish?.title}
        </h2>
        
        <p className="text-[8px] sm:text-[10px] text-gray-400 font-light leading-relaxed mb-3 break-words whitespace-normal drop-shadow max-w-full">
          {typedDesc || activeDish?.desc}
        </p>
        
        <div className="text-[10px] sm:text-base font-bold text-amber-300 mb-3 drop-shadow">
          {tickedPrice.toLocaleString()} MMK
        </div>

        <div className="pointer-events-auto">
          <button 
            onClick={() => addToCart(activeDish)}
            disabled={activeDish?.soldOut}
            className={`bg-gradient-to-r text-white font-bold px-3 py-1.5 md:px-5 md:py-3 rounded-full text-[8px] md:text-[10px] tracking-wider uppercase shadow-[0_8px_20px_rgba(124,58,237,0.35)] border border-purple-400/20 flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
              activeDish?.soldOut 
                ? 'from-neutral-700 to-neutral-800 opacity-60 cursor-not-allowed' 
                : 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
            } ${typingComplete ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          >
            {activeDish?.soldOut ? (
              <><Ban className="w-3 h-3 mr-1 text-red-400" /> Sold Out</>
            ) : (
              <><Plus className="w-3 h-3 mr-1 text-amber-300" /> Add to Order</>
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#131117] to-[#2d2539] shadow-[inset_0_3px_12px_rgba(255,255,255,0.03),0_12px_35px_rgba(0,0,0,0.95)] border border-white/5 flex items-center justify-center">
            <div className="w-[94%] h-[94%] rounded-full border border-purple-500/10 flex items-center justify-center">
              <div className="w-[86%] h-[86%] rounded-full bg-gradient-to-b from-[#0e0c12] to-[#040405] shadow-[inset_0_0_15px_rgba(0,0,0,0.85)] border border-white/5" />
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
              <div className="w-1/2 h-1/2 bg-gradient-to-t from-transparent via-white/10 to-transparent blur-xl animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
