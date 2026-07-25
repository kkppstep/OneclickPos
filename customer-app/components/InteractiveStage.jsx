// MODULE 2: Upgraded InteractiveStage.jsx
// Enables true user interactivity: drag-to-rotate, lighting adjustments, zoom, and interactive steam controls.
function InteractiveStage({ menu, activeIndex, onOpenFullscreen, steamEnabled, gyroActive }) {
  const { addToCart } = useCart();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  // Interactive controls state
  const [manualRotation, setManualRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const startXRef = useRef(0);

  const [typedBadge, setTypedBadge] = useState('');
  const [typedTitle, setTypedTitle] = useState('');
  const [typedDesc, setTypedDesc] = useState('');
  const [tickedPrice, setTickedPrice] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);

  const activeDish = menu[activeIndex] || menu[0];

  // Auto-rotation loop (pauses when user interacts)
  useEffect(() => {
    if (!isSpinning || isDragging) return;
    const interval = setInterval(() => {
      setManualRotation((prev) => (prev + 0.8) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isSpinning, isDragging]);

  // Touch & Drag to Spin Controls
  const handlePointerDown = (e) => {
    setIsDragging(true);
    startXRef.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) {
      handleMouseMove(e);
      return;
    }
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = currentX - startXRef.current;
    setManualRotation((prev) => (prev + deltaX * 0.5) % 360);
    startXRef.current = currentX;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Typewriter effect logic
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
    if (gyroActive || !viewportRef.current || isDragging) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const relX = e.clientX - (bounds.left + bounds.width / 2);
    const relY = e.clientY - (bounds.top + bounds.height / 2);
    const rotX = -(relY / (bounds.height / 2)) * 14;
    const rotY = (relX / (bounds.width / 2)) * 14;
    setTilt({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    if (gyroActive || isDragging) return;
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={viewportRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
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

        <div className="pointer-events-auto flex items-center gap-2">
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

      {/* Interactive 3D Presentation Graphic with Manual Controls */}
      <div className="absolute right-0 top-0 bottom-0 w-[60%] sm:w-[55%] flex items-center justify-center z-10 overflow-visible">
        
        {/* Shadow Casting Effect */}
        <div 
          id="shadow-cast"
          style={{
            transform: `translate(${-tilt.y * 0.4}px, calc(65px + ${-tilt.x * 0.2}px)) scaleY(0.35) scaleX(0.95)`
          }}
          className="absolute w-[85%] h-[12%] bg-black/95 blur-2xl rounded-full pointer-events-none transition-transform duration-200"
        />

        {/* Interactive Interactive Plate Container */}
        <div 
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onDoubleClick={onOpenFullscreen}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoomLevel})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          className="plate-container w-[170px] h-[170px] sm:w-[220px] sm:h-[220px] md:w-[320px] md:h-[320px] relative flex items-center justify-center transition-transform duration-150"
        >
          {/* Outer Ring Plate Base */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#131117] to-[#2d2539] shadow-[inset_0_3px_12px_rgba(255,255,255,0.03),0_12px_35px_rgba(0,0,0,0.95)] border border-white/5 flex items-center justify-center">
            <div className="w-[94%] h-[94%] rounded-full border border-purple-500/10 flex items-center justify-center">
              <div className="w-[86%] h-[86%] rounded-full bg-gradient-to-b from-[#0e0c12] to-[#040405] shadow-[inset_0_0_15px_rgba(0,0,0,0.85)] border border-white/5" />
            </div>
          </div>

          {/* Rotatable Dish Image Driven by Touch/Drag & Speed state */}
          <div 
            style={{ transform: `rotate(${manualRotation}deg)` }}
            className="absolute w-[80%] h-[80%] rounded-full overflow-hidden z-10 flex items-center justify-center transition-transform duration-75"
          >
            <img 
              src={activeDish?.image} 
              alt={activeDish?.title}
              className="w-full h-full object-cover rounded-full shadow-2xl pointer-events-none"
            />
          </div>

          {/* Heat Steam Overlay */}
          {steamEnabled && (
            <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen opacity-30 flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-gradient-to-t from-transparent via-white/10 to-transparent blur-xl animate-pulse" />
            </div>
          )}
        </div>

        {/* Interactive Controls Overlay for the Stage */}
        <div className="absolute bottom-2 right-4 z-40 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
          <button 
            onClick={() => setIsSpinning(!isSpinning)}
            className="text-[8px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-purple-300 hover:bg-white/10"
          >
            {isSpinning ? 'Pause Rotation' : 'Spin Stage'}
          </button>
          <button 
            onClick={() => setZoomLevel(prev => (prev === 1 ? 1.15 : 1))}
            className="text-[8px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-amber-300 hover:bg-white/10"
          >
            {zoomLevel === 1 ? 'Zoom In' : 'Reset Zoom'}
          </button>
        </div>

      </div>
    </div>
  );
}
