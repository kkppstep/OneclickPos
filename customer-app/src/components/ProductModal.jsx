import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Modal from './Modal';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function ProductModal({ product, onClose, stage }) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  // Fresh qty/note each time a new product is opened.
  useEffect(() => {
    setQty(1);
    setNote('');
  }, [product?.id]);

  if (!product) return null;

  const confirm = () => {
    addToCart(product, qty, note.trim());
    onClose();
  };

  return (
    <Modal open={Boolean(product)} onClose={onClose} dark={stage} labelledBy="product-modal-title">
      <div className="h-[220px] w-full" style={{ background: 'var(--accent-light)' }}>
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-5">
        <div id="product-modal-title" className={`text-[1.15rem] font-bold mb-1 ${stage ? 'font-display' : ''}`}>
          {product.name}
        </div>
        {product.description && (
          <p className={`text-[0.9rem] mb-3.5 ${stage ? 'text-gray-400' : 'text-[#6B7C72]'}`}>
            {product.description}
          </p>
        )}
        <div className="text-[1.05rem] font-bold mb-4" style={{ color: 'var(--accent-dark)' }}>
          {formatMMK(product.price)}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border font-bold"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent-dark)' }}
          >
            <Minus size={16} />
          </button>
          <span className="min-w-6 text-center text-[1.1rem] font-bold">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border font-bold"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent-dark)' }}
          >
            <Plus size={16} />
          </button>
        </div>

        <label htmlFor="product-note" className="mb-1.5 block text-[0.85rem] font-semibold">
          Special requests / instructions
        </label>
        <textarea
          id="product-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Less spicy, extra sauce..."
          className={`mb-4 w-full resize-none rounded-[10px] border px-3 py-2.5 text-[0.88rem] ${
            stage ? 'bg-white/4 border-white/12 text-gray-100 placeholder:text-gray-500' : 'border-gray-300'
          }`}
        />

        <button
          type="button"
          onClick={confirm}
          className="w-full rounded-xl py-3.5 font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Add to order
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`mt-2 w-full rounded-xl border py-3 text-[0.9rem] font-semibold ${
            stage ? 'border-white/15 text-gray-200' : 'border-gray-300 text-[#1C2620]'
          }`}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
