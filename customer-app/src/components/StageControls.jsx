import { Sliders, Smartphone, Sparkles, ShoppingBag, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';

export default function StageControls({
  tableNumber,
  hasAmbientAudio,
  musicActive,
  onToggleMusic,
  isOnline,
  gyroActive,
  onToggleGyro,
  steamEnabled,
  onToggleSteam,
  cartCount,
  onOpenCart,
}) {
  return (
    <div className="absolute top-3 left-4 right-4 z-40 flex items-center justify-between">
      <div className="pointer-events-none flex items-center gap-1.5 text-[8px] font-semibold tracking-wider text-gray-400 uppercase">
        <Smartphone className="h-3 w-3 animate-pulse text-purple-400" />
        {tableNumber ? `Table ${tableNumber}` : 'Takeaway'}
      </div>

      <div className="flex items-center gap-1.5">
        {hasAmbientAudio && (
          <button
            type="button"
            onClick={onToggleMusic}
            title="Toggle ambient music"
            aria-label={musicActive ? 'Mute ambient music' : 'Play ambient music'}
            className={`glass-btn flex h-[30px] min-h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-lg text-gray-300 hover:text-white ${
              musicActive ? 'border-purple-500 bg-purple-950/30 text-purple-400' : ''
            }`}
          >
            {musicActive ? <Volume2 className="h-3.5 w-3.5 animate-pulse text-purple-400" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        )}

        <span
          title={isOnline ? 'Online' : 'Offline — orders will retry via local hub'}
          className="glass-panel flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg"
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
        </span>

        <button
          type="button"
          onClick={onToggleGyro}
          title="Toggle tilt"
          aria-label={gyroActive ? 'Disable phone-tilt effect' : 'Enable phone-tilt effect'}
          className={`glass-btn flex h-[30px] min-h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-lg ${
            gyroActive ? 'border-purple-500 bg-purple-950/20 text-purple-400' : 'text-gray-400'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleSteam}
          title="Toggle steam effect"
          aria-label={steamEnabled ? 'Disable steam effect' : 'Enable steam effect'}
          className={`glass-btn flex h-[30px] min-h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-lg ${
            steamEnabled ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'text-gray-400'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenCart}
          title="View your order"
          aria-label="View your order"
          className="glass-btn relative flex h-[30px] min-h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-lg text-white"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
