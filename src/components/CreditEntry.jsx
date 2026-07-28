import { useState } from 'react';
import { useApp, fmt, creditT, todayKey, capitalizeWords } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Plus, Trash2, Phone } from 'lucide-react';

export default function CreditEntry() {
  const { state, dispatch, saveDay, saveCustomers, toast } = useApp();
  const { day, viewDate, editingReopened, customers } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const [name, setName]     = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone]   = useState('');

  const addCredit = () => {
    if (!name.trim()) { toast('Party name daalein'); return; }
    if (!(+amount > 0)) { toast('Amount daalein'); return; }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) { toast('10-digit WhatsApp number daalein'); return; }

    const parsedAmount = parseFloat(amount);
    const cleanName  = capitalizeWords(name.trim());

    /* ── 1. Add to today's daily credit list ── */
    const creditItem = {
      id: Date.now(),
      name: cleanName,
      amount: parsedAmount,
      phone: cleanPhone,
      paid: false,
    };
    dispatch({ type: 'UPDATE_DAY', updates: { credits: [...(day.credits || []), creditItem] } });
    saveDay();

    /* ── 2. Sync with Udhaar Khata (OkCredit-style customer ledger) ── */
    const txn = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'given',
      amount: parsedAmount,
      note: 'Credit Sale (Daily Hisab)',
      date: todayKey(),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    // Find existing customer by name (case-insensitive) OR phone
    const existingIdx = customers.findIndex((c) => {
      const nameMatch = c.name.trim().toLowerCase() === cleanName.toLowerCase();
      const phoneMatch = cleanPhone && c.phone && c.phone === cleanPhone;
      return nameMatch || phoneMatch;
    });

    let updatedCustomers;
    if (existingIdx >= 0) {
      // Customer exists → append transaction
      updatedCustomers = customers.map((c, i) =>
        i === existingIdx
          ? { ...c, phone: cleanPhone || c.phone, transactions: [...(c.transactions || []), txn] }
          : c
      );
    } else {
      // New customer → auto-create profile + first transaction
      const newCustomer = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: cleanName,
        phone: cleanPhone,
        createdAt: new Date().toISOString(),
        transactions: [txn],
      };
      updatedCustomers = [newCustomer, ...customers];
    }

    dispatch({ type: 'SET_CUSTOMERS', customers: updatedCustomers });
    saveCustomers(updatedCustomers);

    /* ── 3. Reset form ── */
    setName(''); setAmount(''); setPhone('');
    toast(existingIdx >= 0
      ? `${cleanName} ka udhaar update ho gaya ✓`
      : `${cleanName} — naya customer + credit add ✓`
    );
  };

  const remove = (id) => {
    dispatch({ type: 'UPDATE_DAY', updates: { credits: (day.credits || []).filter((c) => c.id !== id) } });
    saveDay();
  };

  const unpaid = (day.credits || []).filter((c) => !c.paid);
  const paid   = (day.credits || []).filter((c) => c.paid);
  const inputCls = "flex-1 border border-line rounded-xl px-3.5 py-2.5 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors";

  return (
    <div className="min-h-dvh">
      <Topbar title="Credit Sales" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">
        {!readonly && (
          <div className="glass rounded-2xl p-5 mb-4 flex flex-col gap-3 animate-card-in">
            <input type="text" placeholder="Party ka naam *" value={name} onChange={(e) => setName(capitalizeWords(e.target.value))} className={inputCls + ' !flex-none w-full'} />
            <input type="number" placeholder="₹ Amount *" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls + ' !flex-none w-full font-mono text-[16px]'} />
            <div className="flex items-center gap-1.5 border border-line rounded-xl px-3.5 py-2.5 bg-bg-input focus-within:border-accent/40 transition-colors w-full">
              <Phone size={14} className="text-softer shrink-0" />
              <input type="tel" placeholder="WhatsApp No. (10 digit) *" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="border-none bg-transparent outline-none text-[14px] font-mono flex-1 min-w-0 text-ink placeholder:text-softer" />
            </div>
            <button onClick={addCredit}
              className="bg-credit/20 text-credit border border-credit/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-credit/30 active:scale-[0.98]">
              <Plus size={16} /> Credit Entry Add karein
            </button>
          </div>
        )}

        {unpaid.length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.06s]">
            <div className="text-[12px] font-semibold text-credit uppercase tracking-wider mb-3">Outstanding ({unpaid.length})</div>
            {unpaid.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink truncate">{c.name}</div>
                  {c.phone && <div className="text-[11px] text-softer truncate flex items-center gap-1"><Phone size={9} /> +91 {c.phone}</div>}
                </div>
                <div className="font-mono text-[13px] font-medium text-credit whitespace-nowrap">{fmt(c.amount)}</div>
                {!readonly && (
                  <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-xl bg-red-light flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-red/25 active:scale-90">
                    <Trash2 size={14} className="text-red" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {paid.length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.12s]">
            <div className="text-[12px] font-semibold text-accent uppercase tracking-wider mb-3">Paid ✓ ({paid.length})</div>
            {paid.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0 opacity-50">
                <div className="flex-1 min-w-0"><div className="text-[13.5px] text-ink truncate line-through">{c.name}</div></div>
                <div className="font-mono text-[13px] text-accent whitespace-nowrap">{fmt(c.amount)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center glow-accent animate-slide-up [animation-delay:0.15s]">
          <span className="text-[15px] font-semibold text-ink">Total Credit (Unpaid)</span>
          <span className="text-[22px] font-bold font-mono text-credit">{fmt(creditT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="credit" />
    </div>
  );
}
