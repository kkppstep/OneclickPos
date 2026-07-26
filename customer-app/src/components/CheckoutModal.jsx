import { useState } from 'react';
import { Minus, Plus, Trash2, Check, Banknote, QrCode } from 'lucide-react';
import Modal from './Modal';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';
import { submitOrder } from '../lib/api';
import { uuid } from '../lib/uuid';

export default function CheckoutModal({ open, onClose, storeId, tableNumber, localHubUrl, kbzpayQrUrl, stage }) {
  const { items, totalPrice, removeFromCart, setQty, clearCart } = useCart();
  const [step, setStep] = useState('review'); // review | payment | submitting | confirmed | error
  const [method, setMethod] = useState('cash');
  const [errorMessage, setErrorMessage] = useState('');

  const close = () => {
    if (step === 'submitting') return; // don't let them dismiss mid-flight
    if (step === 'confirmed') clearCart();
    setStep('review');
    setErrorMessage('');
    onClose();
  };

  const placeOrder = async () => {
    setStep('submitting');
    const order = {
      id: uuid(),
      table_number: tableNumber || null,
      status: 'open',
      subtotal: totalPrice,
      tax_total: 0,
      discount_total: 0,
      total: totalPrice,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name_snapshot: item.name,
        qty: item.qty,
        unit_price: item.price,
        line_total: item.price * item.qty,
        notes: item.notes || undefined,
      })),
      payments: [{ method, amount: totalPrice, status: 'pending' }],
    };

    try {
      await submitOrder({ storeId, order, localHubUrl });
      setStep('confirmed');
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong placing your order.');
      setStep('error');
    }
  };

  const textMuted = stage ? 'text-gray-400' : 'text-[#6B7C72]';
  const border = stage ? 'border-white/8' : 'border-black/8';

  return (
    <Modal open={open} onClose={close} dark={stage} labelledBy="checkout-title">
      <div className="p-5">
        {(step === 'review' || step === 'payment') && (
          <h2 id="checkout-title" className={`mb-4 text-[1.15rem] font-bold ${stage ? 'font-display' : ''}`}>
            {step === 'review' ? 'Your order' : 'Payment'}
          </h2>
        )}

        {step === 'review' && (
          <>
            {items.map((item) => (
              <div key={item.key} className={`flex items-start justify-between gap-3 border-b py-2.5 ${border}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.92rem] font-semibold">{item.name}</div>
                  {item.notes && <div className={`text-[0.78rem] italic ${textMuted}`}>&ldquo;{item.notes}&rdquo;</div>}
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => (item.qty > 1 ? setQty(item.key, item.qty - 1) : removeFromCart(item.key))}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${border}`}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="min-w-4 text-center text-[0.85rem] font-semibold">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => setQty(item.key, item.qty + 1)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${border}`}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeFromCart(item.key)}
                      className={`ml-1 flex h-6 w-6 items-center justify-center rounded-full ${textMuted}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className={`shrink-0 text-[0.8rem] ${textMuted}`}>{formatMMK(item.price * item.qty)}</div>
              </div>
            ))}

            <div className="flex justify-between pt-4 text-[1.1rem] font-bold">
              <span>Total</span>
              <span>{formatMMK(totalPrice)}</span>
            </div>

            <button
              type="button"
              onClick={() => setStep('payment')}
              disabled={items.length === 0}
              className="mt-5 w-full rounded-xl py-3.5 font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              Continue to payment
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <PaymentOption
              active={method === 'cash'}
              onClick={() => setMethod('cash')}
              icon={<Banknote size={18} />}
              title="Cash"
              hint="Pay at the table when your order arrives"
              stage={stage}
            />
            {kbzpayQrUrl && (
              <PaymentOption
                active={method === 'kbzpay'}
                onClick={() => setMethod('kbzpay')}
                icon={<QrCode size={18} />}
                title="KBZPay"
                hint="Scan the QR code below to pay now"
                stage={stage}
              />
            )}
            {method === 'kbzpay' && kbzpayQrUrl && (
              <div className="py-2 text-center">
                <img
                  src={kbzpayQrUrl}
                  alt="KBZPay payment QR code"
                  className={`mx-auto mb-2 h-[200px] w-[200px] rounded-xl border ${border}`}
                />
                <p className={`text-[0.8rem] ${textMuted}`}>Scan with the KBZPay app, then place your order.</p>
              </div>
            )}

            <div className="mt-4 flex justify-between text-[1rem] font-bold">
              <span>Total</span>
              <span>{formatMMK(totalPrice)}</span>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              className="mt-4 w-full rounded-xl py-3.5 font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Place order
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              className={`mt-2 w-full rounded-xl border py-3 text-[0.9rem] font-semibold ${border}`}
            >
              Back
            </button>
          </>
        )}

        {step === 'submitting' && (
          <div className="py-10 text-center">
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            <p className={textMuted}>Sending your order to the kitchen&hellip;</p>
          </div>
        )}

        {step === 'confirmed' && (
          <div className="py-8 text-center">
            <div
              className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: 'var(--accent)' }}
            >
              <Check size={26} />
            </div>
            <h2 className={`mb-1 text-[1.1rem] font-bold ${stage ? 'font-display' : ''}`}>Order placed</h2>
            <p className={`mb-5 text-[0.88rem] ${textMuted}`}>
              {tableNumber ? `We'll bring it out to table ${tableNumber}.` : "We'll have it ready shortly."}
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl py-3.5 font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Done
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-6 text-center">
            <p className="mb-5 text-[0.9rem] text-[#A6301F]">{errorMessage}</p>
            <button
              type="button"
              onClick={placeOrder}
              className="mb-2 w-full rounded-xl py-3.5 font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setStep('payment')}
              className={`w-full rounded-xl border py-3 text-[0.9rem] font-semibold ${border}`}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentOption({ active, onClick, icon, title, hint, stage }) {
  const activeStyle = stage
    ? { borderColor: 'var(--accent)', background: 'rgba(255,255,255,0.06)' }
    : { borderColor: 'var(--accent)', background: 'var(--accent-light)' };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left ${
        active ? '' : stage ? 'border-white/10 bg-white/3' : 'border-gray-200'
      }`}
      style={active ? activeStyle : undefined}
    >
      <span style={{ color: stage ? 'var(--accent)' : 'var(--accent-dark)' }}>{icon}</span>
      <span>
        <span className="block text-[0.92rem] font-semibold">{title}</span>
        <span className={`block text-[0.78rem] ${stage ? 'text-gray-400' : 'text-[#6B7C72]'}`}>{hint}</span>
      </span>
    </button>
  );
}
