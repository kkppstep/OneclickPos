import { useEffect, useState } from 'react';
import { Bell, Check, ChevronDown, Loader2, ReceiptText, UsersRound, X } from 'lucide-react';
import { getCloudApiBase } from '../lib/config';

const COPY = {
  bill: { title: 'ဘေလ်တောင်းမည်', icon: ReceiptText },
  staff: { title: 'ဝန်ထမ်းခေါ်မည်', icon: UsersRound },
};

export default function StaffCallButton({ storeId, tableNumber, stage = false }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState('');
  const [message, setMessage] = useState('');
  const [activeType, setActiveType] = useState(() => localStorage.getItem(`pos-service-request-${storeId}-${tableNumber}`) || '');

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!storeId || !tableNumber) return null;

  async function sendRequest(requestType) {
    if (sending || activeType === requestType) return;
    setSending(requestType);
    try {
      const response = await fetch(`${getCloudApiBase()}/public/stores/${encodeURIComponent(storeId)}/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: String(tableNumber), request_type: requestType }),
      });
      if (!response.ok) throw new Error('request_failed');
      const data = await response.json();
      setActiveType(requestType);
      localStorage.setItem(`pos-service-request-${storeId}-${tableNumber}`, requestType);
      setMessage(data.already_active ? 'အကြောင်းကြားထားပြီးပါပြီ။' : 'အကြောင်းကြားပြီးပါပြီ။ ဝန်ထမ်းတစ်ဦး မကြာမီလာရောက်ပါမည်။');
      setOpen(false);
    } catch {
      setMessage('အကြောင်းကြား၍ မရသေးပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။');
    } finally {
      setSending('');
    }
  }

  const activeLabel = activeType ? COPY[activeType]?.title : '';

  return (
    <div className={`fixed bottom-5 right-4 z-50 ${stage ? 'lg:bottom-7 lg:right-7' : ''}`}>
      {message && (
        <div className="mb-3 max-w-[280px] rounded-2xl border border-amber-200/30 bg-[#241a12]/95 px-4 py-3 text-right text-xs leading-5 text-amber-50 shadow-2xl backdrop-blur-md">
          {message}
        </div>
      )}

      {open && (
        <div className="mb-3 w-[245px] overflow-hidden rounded-3xl border border-amber-200/25 bg-[#17131b]/95 p-3 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-bold text-amber-100">အကူအညီလိုပါသလား?</p>
              <p className="mt-0.5 text-[10px] text-gray-400">စားပွဲ {tableNumber}</p>
            </div>
            <button type="button" aria-label="ပိတ်မည်" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(COPY).map(([type, item]) => {
              const Icon = item.icon;
              const done = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={Boolean(sending) || done}
                  onClick={() => sendRequest(type)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-left transition hover:border-amber-300/60 hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending === type ? <Loader2 className="h-5 w-5 animate-spin text-amber-300" /> : done ? <Check className="h-5 w-5 text-emerald-300" /> : <Icon className="h-5 w-5 text-amber-300" />}
                  <span className="text-xs font-semibold">{done ? 'အကြောင်းကြားပြီးပါပြီ' : item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label="ဝန်ထမ်းခေါ်ရန်"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`group relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-amber-100/50 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-white shadow-[0_12px_35px_rgba(245,158,11,0.42)] transition duration-300 hover:scale-105 hover:shadow-[0_15px_42px_rgba(245,158,11,0.58)] active:scale-95 ${!open && !activeType ? 'animate-[staffPulse_2.8s_ease-in-out_infinite]' : ''}`}
      >
        <span className="absolute inset-1 rounded-full border border-white/35" />
        {activeType ? <Check className="relative h-7 w-7" strokeWidth={2.8} /> : open ? <ChevronDown className="relative h-7 w-7" /> : <Bell className="relative h-7 w-7" strokeWidth={2.4} />}
        {!activeType && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-600" />}
      </button>
      <div className="mt-1 text-center text-[10px] font-bold text-amber-700 drop-shadow-sm">{activeLabel || 'ဝန်ထမ်းခေါ်ရန်'}</div>
    </div>
  );
}
