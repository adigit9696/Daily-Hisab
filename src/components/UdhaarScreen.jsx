import { useState, useMemo, useCallback } from 'react';
import { useApp, fmt, shortDate, capitalizeWords } from '../context/AppContext';
import Topbar from './Topbar';
import { Search, Plus, MessageCircle, ChevronRight, UserPlus } from 'lucide-react';

export default function UdhaarScreen() {
  const { state, dispatch, saveCustomers, toast } = useApp();
  const { customers } = state;
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('balance');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newPhone, setNewPhone] = useState('');

  /* ─── Derived list ─── */
  const filtered = useMemo(() => {
    let arr = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    // Compute balance for each
    arr = arr.map((c) => {
      const given    = (c.transactions || []).filter((t) => t.type === 'given').reduce((s, t) => s + (+t.amount || 0), 0);
      const received = (c.transactions || []).filter((t) => t.type === 'received').reduce((s, t) => s + (+t.amount || 0), 0);
      return { ...c, balance: given - received, given, received };
    });
    if (sortBy === 'balance') arr.sort((a, b) => b.balance - a.balance);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [customers, search, sortBy]);

  const netBalance = filtered.reduce((s, c) => s + c.balance, 0);
  const activeCount = filtered.filter((c) => c.balance > 0).length;

  /* ─── Add customer ─── */
  const addCustomer = useCallback(() => {
    if (!newName.trim()) { toast('Customer ka naam daalein'); return; }
    if (newPhone.trim().replace(/\D/g, '').length !== 10) { toast('10-digit WhatsApp number daalein'); return; }
    const cust = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: capitalizeWords(newName.trim()),
      phone: newPhone.trim(),
      createdAt: new Date().toISOString(),
      transactions: [],
    };
    const updated = [cust, ...customers];
    dispatch({ type: 'SET_CUSTOMERS', customers: updated });
    saveCustomers(updated);
    setNewName(''); setNewPhone(''); setShowAddForm(false);
    toast(`${cust.name} ka account create ho gaya`);
  }, [newName, newPhone, customers, dispatch, saveCustomers, toast]);

  /* ─── Navigate to customer detail ─── */
  const openCustomer = (id) => {
    dispatch({ type: 'SET_SELECTED_CUSTOMER', id });
    dispatch({ type: 'PUSH_PAGE', page: 'udhaar_detail' });
  };

  /* ─── Get initial letter for avatar ─── */
  const avatar = (name) => (name || '?').charAt(0).toUpperCase();

  /* ─── Avatar color based on name hash ─── */
  const avatarColor = (name) => {
    const colors = ['bg-red/25 text-red', 'bg-amber/25 text-amber', 'bg-accent/25 text-accent', 'bg-credit/25 text-credit', 'bg-clinical/25 text-clinical', 'bg-expense/25 text-expense', 'bg-neon/25 text-neon', 'bg-monthly/25 text-monthly'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  };

  /* ─── Last activity label ─── */
  const lastActivity = (transactions) => {
    if (!transactions || transactions.length === 0) return 'Koi transaction nahi';
    const last = transactions[transactions.length - 1];
    const typeLabel = last.type === 'received' ? '✓' : '↑';
    return `${typeLabel} ₹${(+last.amount || 0).toLocaleString('en-IN')} ${last.type === 'received' ? 'Payment' : 'Credit'} on ${shortDate(last.date)}`;
  };

  return (
    <div className="min-h-dvh">
      <Topbar title="Udhaar Khata" />
      <div className="px-5 sm:px-8 lg:px-12 max-w-5xl mx-auto pt-4 pb-28">
        {/* Search + Sort */}
        <div className="flex items-center gap-2.5 mb-4 animate-fade-in">
          <div className="flex-1 flex items-center gap-2.5 glass rounded-xl px-4 py-2.5">
            <Search size={15} className="text-softer shrink-0" />
            <input type="text" placeholder="Customer naam ya number search karein…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent outline-none text-[13px] flex-1 min-w-0 text-ink placeholder:text-softer" />
          </div>
          <button onClick={() => setSortBy(sortBy === 'balance' ? 'name' : 'balance')}
            className="px-3 py-2.5 rounded-xl glass text-[11px] font-semibold text-soft cursor-pointer transition-gpu hover:bg-white/10 active:scale-90 whitespace-nowrap">
            {sortBy === 'balance' ? '₹ Sort' : 'A-Z'}
          </button>
        </div>

        {/* Net Balance Card */}
        <div className="glass-strong rounded-2xl px-5 py-5 mb-4 glow-accent animate-slide-up">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] text-softer uppercase tracking-wider font-medium">Net Balance</div>
              <div className="text-[11px] text-softer mt-0.5">👤 {activeCount} Active Accounts</div>
            </div>
            <div className="text-right">
              <div className={`text-[28px] font-bold font-mono ${netBalance > 0 ? 'text-red' : 'text-accent'}`}>{fmt(Math.abs(netBalance))}</div>
              <div className={`text-[11px] font-semibold ${netBalance > 0 ? 'text-red' : 'text-accent'}`}>{netBalance > 0 ? 'You Get' : netBalance < 0 ? 'You Give' : 'Settled'}</div>
            </div>
          </div>
        </div>

        {/* Customer List */}
        {filtered.length === 0 && !showAddForm && (
          <div className="text-center text-softer text-[13px] py-16 animate-fade-in">
            {customers.length === 0
              ? 'Koi customer nahi hai — "Add Customer" se naya account banayein'
              : 'Koi result nahi mila'}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => openCustomer(c.id)}
              className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-gpu hover-lift text-left w-full animate-card-in"
              style={{ animationDelay: `${Math.min(idx, 12) * 0.04}s` }}
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[18px] font-bold ${avatarColor(c.name)}`}>
                {avatar(c.name)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink truncate">{c.name}</div>
                <div className="text-[11px] text-softer mt-0.5 truncate">
                  {lastActivity(c.transactions)}
                </div>
              </div>
              {/* Balance */}
              <div className="text-right shrink-0 mr-1">
                <div className={`font-mono text-[15px] font-bold ${c.balance > 0 ? 'text-red' : c.balance < 0 ? 'text-accent' : 'text-softer'}`}>
                  {c.balance !== 0 ? fmt(Math.abs(c.balance)) : '₹0'}
                </div>
                <div className={`text-[10px] font-semibold ${c.balance > 0 ? 'text-red' : c.balance < 0 ? 'text-accent' : 'text-softer'}`}>
                  {c.balance > 0 ? 'Due' : c.balance < 0 ? 'Advance' : 'Settled'}
                </div>
              </div>
              <ChevronRight size={16} className="text-softer shrink-0" />
            </button>
          ))}
        </div>

        {/* Add Customer Form (modal-like overlay) */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop animate-fade-in" onClick={() => setShowAddForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="modal-solid w-full max-w-[480px] sm:rounded-2xl rounded-t-[18px] p-6 animate-sheet-up">
              <div className="text-[18px] font-bold text-ink font-serif mb-1">New Customer</div>
              <div className="text-[12px] text-softer mb-5">Customer ka naam aur WhatsApp number daalein</div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-accent uppercase tracking-wider block mb-1.5">Customer Name *</label>
                  <input type="text" placeholder="e.g. Rajesh Kumar" value={newName} onChange={(e) => setNewName(capitalizeWords(e.target.value))} autoFocus
                    className="w-full border border-line rounded-xl px-4 py-3 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-accent uppercase tracking-wider block mb-1.5">WhatsApp Number</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-softer font-mono">+91</span>
                    <input type="tel" placeholder="9876543210" maxLength={10} value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 border border-line rounded-xl px-4 py-3 font-mono text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
                  </div>
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button onClick={() => { setShowAddForm(false); setNewName(''); setNewPhone(''); }}
                    className="flex-1 glass text-soft rounded-xl py-3 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-white/10 active:scale-[0.98]">Cancel</button>
                  <button onClick={addCustomer}
                    className="flex-1 bg-accent/20 text-accent border border-accent/20 rounded-xl py-3 text-[13px] font-bold cursor-pointer transition-gpu hover:bg-accent/30 active:scale-[0.98]">
                    <UserPlus size={15} className="inline mr-1.5" /> Add Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Customer button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 sm:right-10 z-40 bg-accent/20 border border-accent/30 text-accent rounded-2xl px-5 py-3.5 text-[13px] font-bold cursor-pointer flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-gpu hover:bg-accent/30 hover:scale-105 active:scale-95 animate-slide-up"
      >
        <UserPlus size={18} /> Add Customer
      </button>
    </div>
  );
}
