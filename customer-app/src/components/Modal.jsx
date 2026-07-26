import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog or full-height right drawer, own backdrop +
// escape/scroll-lock handling — the one piece of UI machinery
// Bootstrap used to provide for free.
export default function Modal({ open, onClose, children, dark = false, labelledBy, variant = 'center' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isDrawer = variant === 'drawer-right';

  return (
    <div
      className={`fixed inset-0 z-50 animate-fade-in ${isDrawer ? 'flex justify-end' : 'flex items-center justify-center p-4'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
      />
      <div
        className={
          isDrawer
            ? `relative flex h-full w-full max-w-sm animate-slide-left flex-col border-l shadow-2xl ${
                dark ? 'border-white/10 bg-[#110d16] text-gray-100' : 'border-black/10 bg-white text-[#1C2620]'
              }`
            : `relative max-h-[88vh] w-full max-w-md animate-scale-up overflow-y-auto rounded-2xl shadow-2xl ${
                dark ? 'bg-[#14101a] text-gray-100' : 'bg-white text-[#1C2620]'
              }`
        }
      >
        {!isDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full ${
              dark ? 'bg-white/10 text-gray-200 hover:bg-white/20' : 'bg-black/5 text-gray-700 hover:bg-black/10'
            }`}
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
