import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog, own backdrop + escape/scroll-lock handling — the
// one piece of UI machinery Bootstrap used to provide for free.
export default function Modal({ open, onClose, children, dark = false, labelledBy }) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-default"
      />
      <div
        className={`relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-up ${
          dark ? 'bg-[#14101a] text-gray-100' : 'bg-white text-[#1C2620]'
        }`}
      >
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
        {children}
      </div>
    </div>
  );
}
