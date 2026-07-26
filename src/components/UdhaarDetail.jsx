import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useApp, fmt, shortDate, todayKey } from '../context/AppContext';
import { ChevronLeft, Home, MessageCircle, Trash2, ArrowDownLeft, ArrowUpRight, Phone, Edit3 } from 'lucide-react';

export default function UdhaarDetail() {
  const { state, dispatch, saveCustomers, toast } = useApp();
  const { customers, selectedCustomerId } = state;
  const scrollRef = useRef(null);

  const customer = useMemo(() => customers.find((c) => c.id === selectedCustomerId), [customers, selectedCustomerId]);

  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnType, setTxnType]         = useState('given');
  const [txnAmount, setTxnAmount]     = useState('');
  const [txnNote, setTxnNote]         = useState('');

  const balance = useMemo(() => {
    if (!customer) return 0;
    const given    = (customer.transactions || []).filter((t) => t.type === 'given').reduce((s, t) => s + (+t.amount || 0), 0);
    const received = (customer.transactions || []).filter((t) => t.type === 'received').reduce((s, t) => s + (+t.amount || 0), 0);
    return given - received;
  }, [customer]);

  /* Group transactions by date */
  const grouped = useMemo(() => {
    if (!customer) return [];
    const txns = [...(customer.transactions || [])];
    txns.sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));

    const groups = [];
    let currentDate = '';
    let runningBalance = 0;

    txns.forEach((t) => {
      const date = t.date || todayKey();
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ type: 'date', date });
      }
      if (t.type === 'given') runningBalance += (+t.amount || 0);
      else runningBalance -= (+t.amount || 0);
      groups.push({ ...t, runningBalance });
    });
    return groups;
  }, [customer]);

  /* Scroll to bottom on load */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [grouped.length]);

  /* Add transaction */
  const addTransaction = useCallback(() => {
    if (!(+txnAmount > 0)) { toast('Amount daalein'); return; }
    const txn = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: txnType,
      amount: parseFloat(txnAmount),
      note: txnNote.trim(),
      date: todayKey(),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = customers.map((c) =>
      c.id === selectedCustomerId
        ? { ...c, transactions: [...(c.transactions || []), txn] }
        : c
    );
    dispatch({ type: 'SET_CUSTOMERS', customers: updated });
    saveCustomers(updated);
    setTxnAmount(''); setTxnNote(''); setShowTxnForm(false);
    toast(txnType === 'given' ? 'Credit entry add ho gayi' : 'Payment received ✓');
  }, [txnAmount, txnNote, txnType, customers, selectedCustomerId, dispatch, saveCustomers, toast]);

  /* Delete transaction */
  const deleteTxn = useCallback((txnId) => {
    if (!confirm('Ye transaction delete karein?')) return;
    const updated = customers.map((c) =>
      c.id === selectedCustomerId
        ? { ...c, transactions: (c.transactions || []).filter((t) => t.id !== txnId) }
        : c
    );
    dispatch({ type: 'SET_CUSTOMERS', customers: updated });
    saveCustomers(updated);
    toast('Transaction delete ho gaya');
  }, [customers, selectedCustomerId, dispatch, saveCustomers, toast]);

  /* Delete customer (only if settled) */
  const deleteCustomer = useCallback(() => {
    if (balance !== 0) { toast('Pehle outstanding clear karein'); return; }
    if (!confirm(`"${customer.name}" ka account permanently delete karein?`)) return;
    const updated = customers.filter((c) => c.id !== selectedCustomerId);
    dispatch({ type: 'SET_CUSTOMERS', customers: updated });
    saveCustomers(updated);
    dispatch({ type: 'GO_BACK' });
    toast('Customer delete ho gaya');
  }, [balance, customer, customers, selectedCustomerId, dispatch, saveCustomers, toast]);

  /* WhatsApp reminder */
  const sendReminder = useCallback(() => {
    if (!customer) return;
    const phone = customer.phone ? `91${customer.phone}` : '';
    const msg = encodeURIComponent(
      `🙏 Namaskar ${customer.name} ji,\n\nAapka Sarita Pharmacy me ₹${Math.abs(balance).toLocaleString('en-IN')} ka udhaar baaki hai.\n\nKripya jaldi se jaldi payment kar dein.\n\nDhanyavaad 🙏\n— Sarita Pharmacy`
    );
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      toast('WhatsApp number nahi hai — manually send karein');
    }
  }, [customer, balance, toast]);

  if (!customer) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-softer text-[14px]">Customer nahi mila</div>
      </div>
    );
  }

  const avatarChar = customer.name.charAt(0).toUpperCase();
  const avatarColors = ['bg-red/25 text-red', 'bg-amber/25 text-amber', 'bg-accent/25 text-accent', 'bg-credit/25 text-credit', 'bg-clinical/25 text-clinical', 'bg-expense/25 text-expense'];
  let hash = 0;
  for (let i = 0; i < customer.name.length; i++) hash = ((hash << 5) - hash + customer.name.charCodeAt(i)) | 0;
  const avatarColor = avatarColors[Math.abs(hash) % avatarColors.length];

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="glass sticky top-0 z-30 px-5 py-4 flex items-center gap-3.5 border-b border-line">
        <button onClick={() => dispatch({ type: 'GO_BACK' })}
          className="w-9 h-9 rounded-xl bg-white/5 border border-line flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 active:scale-90">
          <ChevronLeft size={18} className="text-soft" />
        </button>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[16px] font-bold ${avatarColor}`}>
          {avatarChar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-extrabold text-ink font-serif truncate">{customer.name}</div>
          {customer.phone && (
            <div className="text-[11px] text-softer flex items-center gap-1">
              <Phone size={10} /> +91 {customer.phone}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {balance > 0 && (
            <button onClick={sendReminder} title="WhatsApp Reminder"
              className="w-9 h-9 rounded-xl bg-green-light border border-green/20 flex items-center justify-center cursor-pointer transition-gpu hover:bg-green/25 active:scale-90">
              <MessageCircle size={17} className="text-green" />
            </button>
          )}
          <button onClick={() => dispatch({ type: 'GO_HOME' })}
            className="w-9 h-9 rounded-xl bg-white/5 border border-line flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 active:scale-90">
            <Home size={18} className="text-soft" />
          </button>
        </div>
      </div>

      {/* Balance Bar */}
      <div className={`px-5 sm:px-8 lg:px-12 py-3 flex justify-between items-center border-b border-line ${balance > 0 ? 'bg-red/5' : balance < 0 ? 'bg-accent/5' : 'bg-white/3'}`}>
        <div className="text-[12px] text-softer font-medium">Outstanding Balance</div>
        <div className="text-right">
          <div className={`text-[22px] font-bold font-mono ${balance > 0 ? 'text-red' : balance < 0 ? 'text-accent' : 'text-softer'}`}>
            {fmt(Math.abs(balance))}
          </div>
          <div className={`text-[10px] font-semibold ${balance > 0 ? 'text-red' : balance < 0 ? 'text-accent' : 'text-softer'}`}>
            {balance > 0 ? 'Due' : balance < 0 ? 'Advance' : 'Settled ✓'}
          </div>
        </div>
      </div>

      {/* Transaction Timeline (chat-style like OkCredit) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-12 py-4 max-w-3xl mx-auto w-full">
        {grouped.length === 0 && (
          <div className="text-center text-softer text-[13px] py-16">Koi transaction nahi hai — neeche se add karein</div>
        )}

        {grouped.map((item, idx) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${item.date}-${idx}`} className="flex justify-center my-4">
                <span className="px-4 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">{shortDate(item.date)}</span>
              </div>
            );
          }

          const isGiven = item.type === 'given';
          return (
            <div key={item.id} className={`flex mb-3 ${isGiven ? 'justify-end' : 'justify-start'}`}>
              <div className={`glass rounded-2xl px-4 py-3 max-w-[280px] sm:max-w-[360px] relative group animate-card-in ${isGiven ? 'border-red/15' : 'border-accent/15'}`}
                style={{ animationDelay: `${Math.min(idx, 15) * 0.03}s` }}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-[10px] font-semibold ${isGiven ? 'text-red' : 'text-accent'}`}>
                    {isGiven ? '↑' : '↓'}
                  </span>
                  <span className={`text-[20px] font-bold font-mono ${isGiven ? 'text-red' : 'text-accent'}`}>
                    ₹{(+item.amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-softer">{item.time || ''}</span>
                </div>
                {item.note && <div className="text-[11.5px] text-soft mt-0.5">{item.note}</div>}
                <div className="text-[10px] text-softer mt-1">
                  {fmt(Math.abs(item.runningBalance))} {item.runningBalance > 0 ? 'Due' : item.runningBalance < 0 ? 'Advance' : 'Settled'}
                </div>
                {/* Delete on hover */}
                <button onClick={(e) => { e.stopPropagation(); deleteTxn(item.id); }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red/20 border border-red/30 items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                  <Trash2 size={11} className="text-red" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar (Given / Received) */}
      <div className="sticky bottom-0 z-20 glass border-t border-line px-5 sm:px-8 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={() => { setTxnType('received'); setShowTxnForm(true); }}
            className="flex-1 bg-accent/15 border border-accent/20 text-accent rounded-xl py-3 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-accent/25 active:scale-[0.98]">
            <ArrowDownLeft size={16} /> Received
          </button>
          <button onClick={() => { setTxnType('given'); setShowTxnForm(true); }}
            className="flex-1 bg-red/15 border border-red/20 text-red rounded-xl py-3 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-red/25 active:scale-[0.98]">
            <ArrowUpRight size={16} /> Given
          </button>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTxnForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowTxnForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-[480px] sm:rounded-2xl rounded-t-[18px] p-6 animate-sheet-up">
            <div className={`text-[18px] font-bold font-serif mb-1 ${txnType === 'given' ? 'text-red' : 'text-accent'}`}>
              {txnType === 'given' ? '↑ Credit Given' : '↓ Payment Received'}
            </div>
            <div className="text-[12px] text-softer mb-5">{customer.name} ka transaction</div>

            <div className="flex flex-col gap-3">
              <input type="number" placeholder="₹ Amount" min="0" step="1" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} autoFocus
                className="w-full border border-line rounded-xl px-4 py-3.5 font-mono text-[20px] text-center bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
              <input type="text" placeholder="Note (optional — e.g. phonepe, cash)" value={txnNote} onChange={(e) => setTxnNote(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
              <div className="flex gap-2.5 mt-1">
                <button onClick={() => setShowTxnForm(false)}
                  className="flex-1 glass text-soft rounded-xl py-3 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-white/10 active:scale-[0.98]">Cancel</button>
                <button onClick={addTransaction}
                  className={`flex-1 rounded-xl py-3 text-[13px] font-bold cursor-pointer transition-gpu active:scale-[0.98] ${
                    txnType === 'given'
                      ? 'bg-red/20 text-red border border-red/20 hover:bg-red/30'
                      : 'bg-accent/20 text-accent border border-accent/20 hover:bg-accent/30'
                  }`}>
                  {txnType === 'given' ? '↑ Add Credit' : '↓ Add Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
