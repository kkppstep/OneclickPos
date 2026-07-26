import { useState } from 'react';
import { Minus, Plus, Trash2, Check, Banknote, QrCode, ChefHat, X } from 'lucide-react';
import Modal from './Modal';
import { formatMMK } from '../lib/format';
import { useCart } from '../context/CartContext';
import { submitOrder } from '../lib/api';
import { uuid } from '../lib/uuid';
import { sound } from '../lib/sound';

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
      if (stage) sound.play('success');
      setStep('confirmed');
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong placing your order.');
      setStep('error');
    }
  };

  if (stage) {
    const variant = step === 'review' ? 'drawer-right' : 'center';
    return (
      <Modal key={variant} open={open} onClose={close} dark variant={variant} labelledBy="checkout-title">
        <StageCheckoutBody
          step={step}
          setStep={setStep}
          items={items}
          totalPrice={totalPrice}
          removeFromCart={removeFromCart}
          setQty={setQty}
          method={method}
          setMethod={setMethod}
          kbzpayQrUrl={kbzpayQrUrl}
          tableNumber={tableNumber}
          placeOrder={placeOrder}
          errorMessage={errorMessage}
          close={close}
        />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} dark={false} labelledBy="checkout-title">
      <StandardCheckoutBody
        step={step}
        setStep={setStep}
        items={items}
        totalPrice={totalPrice}
        removeFromCart={removeFromCart}
        setQty={setQty}
        method={method}
        setMethod={setMethod}
        kbzpayQrUrl={kbzpayQrUrl}
        tableNumber={tableNumber}
        placeOrder={placeOrder}
        errorMessage={errorMessage}
        close={close}
      />
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Standard layout: everything in one centered modal, light theme.
// ---------------------------------------------------------------------
function StandardCheckoutBody({ step, setStep, items, totalPrice, removeFromCart, setQty, method, setMethod, kbzpayQrUrl, tableNumber, placeOrder, errorMessage, close }) {
  const border = 'border-black/8';
  const textMuted = 'text-[#6B7C72]';

  return (
    <div className="p-5">
      {(step === 'review' || step === 'payment') && (
        <h2 id="checkout-title" className="mb-4 text-[1.15rem] font-bold">
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
            stage={false}
          />
          {kbzpayQrUrl && (
            <PaymentOption
              active={method === 'kbzpay'}
              onClick={() => setMethod('kbzpay')}
              icon={<QrCode size={18} />}
              title="KBZPay"
              hint="Scan the QR code below to pay now"
              stage={false}
            />
          )}
          {method === 'kbzpay' && kbzpayQrUrl && (
            <div className="py-2 text-center">
              <img src={kbzpayQrUrl} alt="KBZPay payment QR code" className={`mx-auto mb-2 h-[200px] w-[200px] rounded-xl border ${border}`} />
              <p className={`text-[0.8rem] ${textMuted}`}>Scan with the KBZPay app, then place your order.</p>
            </div>
          )}

          <div className="mt-4 flex justify-between text-[1rem] font-bold">
            <span>Total</span>
            <span>{formatMMK(totalPrice)}</span>
          </div>

          <button type="button" onClick={placeOrder} className="mt-4 w-full rounded-xl py-3.5 font-bold text-white" style={{ background: 'var(--accent)' }}>
            Place order
          </button>
          <button type="button" onClick={() => setStep('review')} className={`mt-2 w-full rounded-xl border py-3 text-[0.9rem] font-semibold ${border}`}>
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
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: 'var(--accent)' }}>
            <Check size={26} />
          </div>
          <h2 className="mb-1 text-[1.1rem] font-bold">Order placed</h2>
          <p className={`mb-5 text-[0.88rem] ${textMuted}`}>
            {tableNumber ? `We'll bring it out to table ${tableNumber}.` : "We'll have it ready shortly."}
          </p>
          <button type="button" onClick={close} className="w-full rounded-xl py-3.5 font-bold text-white" style={{ background: 'var(--accent)' }}>
            Done
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="py-6 text-center">
          <p className="mb-5 text-[0.9rem] text-[#A6301F]">{errorMessage}</p>
          <button type="button" onClick={placeOrder} className="mb-2 w-full rounded-xl py-3.5 font-bold text-white" style={{ background: 'var(--accent)' }}>
            Try again
          </button>
          <button type="button" onClick={() => setStep('payment')} className={`w-full rounded-xl border py-3 text-[0.9rem] font-semibold ${border}`}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Stage layout: review is a full-height right drawer; every other step
// is a small centered glass panel, matching the reference's separate
// SelectionTray / transmitting-loader / alert-modal treatments.
// ---------------------------------------------------------------------
function StageCheckoutBody({ step, setStep, items, totalPrice, removeFromCart, setQty, method, setMethod, kbzpayQrUrl, tableNumber, placeOrder, errorMessage, close }) {
  if (step === 'review') {
    return (
      <div className="flex h-full flex-col justify-between p-5">
        <div>
          <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-3">
            <h3 id="checkout-title" className="serif-title text-xs font-bold tracking-wider text-white">
              Your Selections
            </h3>
            <button type="button" onClick={close} aria-label="Close" className="flex min-h-[38px] min-w-[38px] items-center justify-center text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="no-scrollbar max-h-[60vh] space-y-2.5 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <ChefHat className="mb-2 h-8 w-8 animate-bounce text-neutral-600" />
                <p className="text-[9px] font-semibold tracking-widest text-gray-500 uppercase">Selection Tray is Empty</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <div className="max-w-[60%]">
                    <h4 className="serif-title truncate text-[10px] font-semibold tracking-wide text-white">{item.name}</h4>
                    {item.notes && <span className="block truncate text-[8px] text-gray-500 italic">&ldquo;{item.notes}&rdquo;</span>}
                    <span className="mt-0.5 block text-[8.5px] text-purple-400">
                      {formatMMK(item.price)} x {item.qty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => (item.qty > 1 ? setQty(item.key, item.qty - 1) : removeFromCart(item.key))}
                      className="flex h-6.5 w-6.5 min-h-[26px] min-w-[26px] items-center justify-center rounded border border-white/10 bg-white/5 text-gray-400 hover:text-white"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-3 text-center text-[10px] font-semibold text-white">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => setQty(item.key, item.qty + 1)}
                      className="flex h-6.5 w-6.5 min-h-[26px] min-w-[26px] items-center justify-center rounded border border-white/10 bg-white/5 text-gray-400 hover:text-white"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/5 pt-3.5">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Subtotal</span>
            <span>{formatMMK(totalPrice)}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.02] pt-1.5 text-xs font-semibold text-white">
            <span className="serif-title tracking-wider">Total</span>
            <span className="font-bold text-amber-300">{formatMMK(totalPrice)}</span>
          </div>
          <button
            type="button"
            onClick={() => setStep('payment')}
            disabled={items.length === 0}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-[9px] font-bold tracking-widest text-white uppercase shadow-lg transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    );
  }

  // payment / submitting / confirmed / error — small centered glass panel
  return (
    <div className="p-5 text-center">
      {step === 'payment' && (
        <>
          <h3 className="serif-title mb-4 text-left text-xs font-bold tracking-wider text-white">Payment</h3>
          <StagePaymentOption
            active={method === 'cash'}
            onClick={() => setMethod('cash')}
            icon={<Banknote className="h-4 w-4" />}
            title="Cash"
            hint="Pay at the table"
          />
          {kbzpayQrUrl && (
            <StagePaymentOption
              active={method === 'kbzpay'}
              onClick={() => setMethod('kbzpay')}
              icon={<QrCode className="h-4 w-4" />}
              title="KBZPay"
              hint="Scan the QR code to pay now"
            />
          )}
          {method === 'kbzpay' && kbzpayQrUrl && (
            <div className="py-2 text-center">
              <img src={kbzpayQrUrl} alt="KBZPay payment QR code" className="mx-auto mb-2 h-[180px] w-[180px] rounded-xl border border-white/10" />
              <p className="text-[9px] text-gray-400">Scan with the KBZPay app, then transmit your order.</p>
            </div>
          )}
          <div className="mt-4 mb-4 flex justify-between text-[11px] font-bold text-white">
            <span>Total</span>
            <span className="text-amber-300">{formatMMK(totalPrice)}</span>
          </div>
          <button
            type="button"
            onClick={placeOrder}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-[9px] font-bold tracking-widest text-white uppercase shadow-lg transition-all hover:from-purple-500 hover:to-indigo-500"
          >
            Transmit Order to POS
          </button>
          <button type="button" onClick={() => setStep('review')} className="mt-2 w-full rounded-lg border border-white/10 py-3 text-[9px] font-bold tracking-widest text-gray-400 uppercase">
            Back
          </button>
        </>
      )}

      {step === 'submitting' && (
        <div className="py-4">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="font-mono text-[10px] tracking-wider text-gray-300">Transmitting Order to POS Terminal&hellip;</p>
        </div>
      )}

      {step === 'confirmed' && (
        <div className="py-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400">
            <Check className="h-6 w-6 animate-bounce text-purple-400" />
          </div>
          <h3 className="serif-title mb-2 text-xs font-bold tracking-wider text-white">Order Transmitted!</h3>
          <p className="mb-4 text-[9.5px] leading-relaxed text-gray-400">
            {tableNumber
              ? `Your selections are on their way to the kitchen at Table ${tableNumber}.`
              : 'Your selections are on their way to the kitchen.'}
          </p>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-[9px] font-bold tracking-widest text-white uppercase transition-all"
          >
            Wonderful
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="py-2">
          <p className="mb-5 text-[9.5px] leading-relaxed text-red-400">{errorMessage}</p>
          <button
            type="button"
            onClick={placeOrder}
            className="mb-2 w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-[9px] font-bold tracking-widest text-white uppercase"
          >
            Try again
          </button>
          <button type="button" onClick={() => setStep('payment')} className="w-full rounded-lg border border-white/10 py-2.5 text-[9px] font-bold tracking-widest text-gray-400 uppercase">
            Back
          </button>
        </div>
      )}
    </div>
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

function StagePaymentOption({ active, onClick, icon, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left ${
        active ? 'border-purple-500 bg-purple-950/20' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <span className="text-purple-400">{icon}</span>
      <span>
        <span className="block text-[0.85rem] font-semibold text-white">{title}</span>
        <span className="block text-[0.72rem] text-gray-500">{hint}</span>
      </span>
    </button>
  );
}
