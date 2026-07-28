import { useCallback } from 'react';
import { useApp, todayKey, dateLbl, fmt, cashT, digitalT, creditT, expenseT, clinicalT, diffV, emptyDay } from '../context/AppContext';
import { getSyncState } from '../services/storage';
import { Banknote, CreditCard, Users, DollarSign, Activity, Target, CheckSquare, BarChart3, Clock, Settings, Lock, ChevronRight, Calendar, Download, AlertTriangle, Edit3, RefreshCw } from 'lucide-react';

export default function HomeDashboard() {
  const { state, dispatch, toast, storage, updateSync, isToday, refreshData } = useApp();
  const { day, viewDate, history, lastBackup, editingReopened, syncState, refreshing } = state;

  const d = diffV(day);

  const navCards = [
    { id: 'cash',     icon: Banknote,    label: 'Cash Denomination', sub: 'Notes + Coins gin kar daalein', val: fmt(cashT(day)),           color: 'text-amber',    bg: 'bg-amber-light',    border: 'hover:border-amber/30' },
    { id: 'digital',  icon: CreditCard,  label: 'Paytm / POS',      sub: 'UPI aur card transactions',     val: fmt(digitalT(day)),         color: 'text-neon',     bg: 'bg-accent-dim',     border: 'hover:border-accent/30' },
    { id: 'credit',   icon: Users,       label: 'Credit Sales',      sub: 'Party-wise udhaar list',        val: fmt(creditT(day)),          color: 'text-credit',   bg: 'bg-credit-light',   border: 'hover:border-credit/30' },
    { id: 'expense',  icon: DollarSign,  label: 'Daily Expenses',    sub: 'Kharche, proper details ke sath', val: fmt(expenseT(day)),       color: 'text-expense',  bg: 'bg-expense-light',  border: 'hover:border-expense/30' },
    { id: 'clinical', icon: Activity,    label: 'Clinical Services', sub: 'BP, Injection, Dressing, ECG…', val: fmt(clinicalT(day)),        color: 'text-clinical', bg: 'bg-clinical-light', border: 'hover:border-clinical/30' },
    { id: 'target',   icon: Target,      label: 'Expected Sale',     sub: 'Software / register ka total',  val: fmt(+day.expected || 0),    color: 'text-green',    bg: 'bg-green-light',    border: 'hover:border-green/30' },
  ];

  let udTotal = 0;
  [...history, day].forEach((h) => {
    (h.credits || []).filter((c) => !c.paid).forEach((c) => { udTotal += (+c.amount || 0); });
  });

  const handleDateChange = useCallback(async (e) => {
    const val = e.target.value;
    if (!val) return;
    if (editingReopened && val !== editingReopened) {
      toast('Pehle chal rahe edit ko Save/Close karein');
      e.target.value = editingReopened;
      return;
    }
    dispatch({ type: 'SET_VIEW_DATE', date: val });
    const isT = val === todayKey() || val === editingReopened;
    if (isT) {
      try {
        const r = await storage.get('day:' + val);
        dispatch({ type: 'SET_DAY', day: r?.value ? Object.assign(emptyDay(val), JSON.parse(r.value)) : emptyDay(val) });
      } catch { dispatch({ type: 'SET_DAY', day: emptyDay(val) }); }
    } else {
      const found = history.find((h) => h.date === val);
      if (found) dispatch({ type: 'SET_DAY', day: Object.assign(emptyDay(val), JSON.parse(JSON.stringify(found))) });
      else {
        try {
          const r = await storage.get('day:' + val);
          dispatch({ type: 'SET_DAY', day: r?.value ? Object.assign(emptyDay(val), JSON.parse(r.value)) : emptyDay(val) });
        } catch { dispatch({ type: 'SET_DAY', day: emptyDay(val) }); }
      }
    }
  }, [dispatch, storage, history, editingReopened, toast]);

  const goToday = useCallback(async () => {
    if (isToday()) return;
    const tk = todayKey();
    dispatch({ type: 'SET_VIEW_DATE', date: tk });
    try {
      const r = await storage.get('day:' + tk);
      dispatch({ type: 'SET_DAY', day: r?.value ? Object.assign(emptyDay(), JSON.parse(r.value)) : emptyDay() });
    } catch { dispatch({ type: 'SET_DAY', day: emptyDay() }); }
    toast('Aaj ki date par wapas aa gaye');
  }, [dispatch, storage, isToday, toast]);

  const handleReopen = useCallback(async () => {
    const targetDate = viewDate;
    const idx = history.findIndex((h) => h.date === targetDate);
    if (idx === -1) { toast('Ye din history me nahi mila'); return; }
    if (!confirm('Is band ho chuke din ("' + dateLbl(targetDate) + '") ko dobara edit karne ke liye kholein?')) return;
    const copy = JSON.parse(JSON.stringify(history[idx]));
    const newHist = [...history];
    newHist.splice(idx, 1);
    dispatch({ type: 'SET_HISTORY', history: newHist });
    await storage.set('history', JSON.stringify(newHist), updateSync).catch(() => {});
    dispatch({ type: 'SET_EDITING_REOPENED', date: targetDate });
    const newDay = Object.assign(emptyDay(targetDate), copy, { closed: false });
    dispatch({ type: 'SET_DAY', day: newDay });
    await storage.set('day:' + targetDate, JSON.stringify(newDay), updateSync).catch(() => {});
    toast('Edit mode on — changes karke Final Hisab me Save/Close karein');
  }, [viewDate, history, dispatch, storage, updateSync, toast]);

  const backupDays = lastBackup ? Math.floor((new Date(todayKey()) - new Date(lastBackup)) / 86400000) : null;
  const isEditing  = editingReopened && viewDate === editingReopened;
  const readonly   = !isToday();

  return (
    <div className="min-h-dvh">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary via-teal/40 to-bg-primary" />
        <div className="absolute top-[-30%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="relative px-5 sm:px-8 lg:px-12 pt-6 pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="text-[10.5px] tracking-[0.18em] uppercase text-accent/60 font-medium">Sarita Pharmacy</div>
            <div className="text-[28px] sm:text-[34px] font-bold font-serif text-ink mt-1 mb-1 tracking-tight">Daily Hisab</div>
            <div className="text-[13px] text-soft">{dateLbl(viewDate)}</div>
            {/* Sync badge */}
            <div className="inline-flex items-center gap-2 mt-2.5 glass rounded-full px-3 py-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                syncState.status === 'synced'  ? 'bg-accent shadow-[0_0_6px_rgba(52,211,153,0.5)]' :
                syncState.status === 'pending' ? 'bg-amber animate-pulse-dot' : 'bg-red'
              }`} />
              <span className="text-[11px] font-medium text-soft">{
                syncState.status === 'synced'  ? 'Firebase synced ✓' :
                syncState.status === 'pending' ? `${syncState.count} pending sync` :
                'Offline mode'
              }</span>
            </div>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button onClick={() => { refreshData(); toast('Data refresh ho raha hai…'); }}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center cursor-pointer transition-gpu hover:bg-accent/15 hover:border-accent/20 active:scale-90" title="Refresh">
              <RefreshCw size={18} className={`text-accent ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { dispatch({ type: 'SET_PIN_TARGET', target: null }); dispatch({ type: 'SET_PAGE', page: 'lock' }); }}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 hover:border-accent/20 active:scale-90" title="Lock">
              <Lock size={18} className="text-soft" />
            </button>
            <button onClick={() => { dispatch({ type: 'SET_PIN_TARGET', target: 'settings' }); dispatch({ type: 'SET_PAGE', page: 'lock' }); }}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 hover:border-accent/20 active:scale-90">
              <Settings size={18} className="text-soft" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="px-5 sm:px-8 lg:px-12 max-w-7xl mx-auto pb-10">
        {/* Date strip */}
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mt-5 animate-fade-in">
          <Calendar size={17} className="text-accent shrink-0" />
          <input type="date" value={viewDate} max={todayKey()} onChange={handleDateChange}
            className="border-none bg-transparent font-mono text-[13px] text-ink flex-1 min-w-0 outline-none [color-scheme:dark]" />
          <button type="button" onClick={goToday}
            className={`text-[10.5px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 border-none cursor-pointer transition-gpu ${
              isToday() ? 'bg-accent/15 text-accent' : 'bg-amber/15 text-amber'
            }`}>
            {isToday() ? '● Aaj' : '◷ Purana'}
          </button>
        </div>

        {/* Banners */}
        {readonly && !isEditing && (
          <div className="flex items-center gap-2.5 bg-amber-light text-amber text-[12px] font-medium px-4 py-3 rounded-2xl mt-3 border border-amber/10 animate-fade-in">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Purana record — sirf dekhne ke liye</span>
          </div>
        )}
        {readonly && !isEditing && (
          <button type="button" onClick={handleReopen}
            className="flex items-center gap-2.5 bg-red-light text-red text-[12px] font-medium px-4 py-3 rounded-2xl mt-2 cursor-pointer border border-red/10 w-full transition-gpu hover:bg-red/20 animate-fade-in">
            <Edit3 size={16} className="shrink-0" />
            <span>Is din ko edit karne ke liye tap karein</span>
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2.5 bg-amber-light text-amber text-[12px] font-medium px-4 py-3 rounded-2xl mt-3 border border-amber/10 animate-fade-in">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Edit mode — Final Hisab me jaakar Save/Close karein</span>
          </div>
        )}


        {/* ─── Reconciliation Card ─── */}
        <div className="glass-strong rounded-2xl px-5 py-5 mt-4 glow-accent animate-slide-up">
          <div className="text-[11px] text-softer uppercase tracking-[0.12em] font-medium">Aaj ka Reconciliation</div>
          <div className={`text-[36px] sm:text-[42px] font-bold mt-1 font-serif tracking-tight ${d === 0 ? 'text-accent' : d < 0 ? 'text-red' : 'text-amber'}`}>
            {fmt(Math.abs(d))}
          </div>
          <div className={`inline-flex items-center gap-2 mt-2.5 text-[11.5px] font-semibold px-3 py-1 rounded-full ${
            d === 0 ? 'bg-accent/15 text-accent' : d < 0 ? 'bg-red/15 text-red' : 'bg-amber/15 text-amber'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${d === 0 ? 'bg-accent' : d < 0 ? 'bg-red' : 'bg-amber'}`} />
            {d === 0 ? 'Match ✓' : d < 0 ? 'Cash Short' : 'Excess Cash'}
          </div>
        </div>

        {/* ─── Nav Cards Grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {navCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => dispatch({ type: 'PUSH_PAGE', page: card.id })}
              className={`glass rounded-2xl px-4 py-4 flex items-center gap-3.5 cursor-pointer border border-line transition-gpu hover-lift ${card.border} text-left w-full animate-card-in`}
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bg} ${card.color}`}>
                <card.icon size={21} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink">{card.label}</div>
                <div className="text-[11.5px] text-softer mt-0.5">{card.sub}</div>
              </div>
              <div className="text-[13px] font-semibold font-mono whitespace-nowrap text-soft">{card.val}</div>
              <ChevronRight size={16} className="text-softer shrink-0" />
            </button>
          ))}
        </div>

        {/* ─── Summary CTA ─── */}
        <button
          onClick={() => dispatch({ type: 'PUSH_PAGE', page: 'summary' })}
          className="w-full mt-4 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20 rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer transition-gpu hover-lift hover:border-accent/40 animate-slide-up [animation-delay:0.3s]"
        >
          <div className="text-left">
            <div className="text-[15px] font-semibold text-ink">Final Hisab dekhein</div>
            <div className="text-[12px] text-softer mt-0.5">Summary, mismatch aur Print</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <ChevronRight size={18} className="text-accent" />
          </div>
        </button>

        {/* ─── Secondary Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <button onClick={() => dispatch({ type: 'PUSH_PAGE', page: 'udhaar' })}
            className="glass rounded-2xl px-4 py-4 flex items-center gap-3.5 cursor-pointer border border-line transition-gpu hover-lift hover:border-red/30 text-left w-full animate-card-in [animation-delay:0.35s]">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-red-light text-red"><CheckSquare size={21} /></div>
            <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink">Udhaar Khata</div><div className="text-[11.5px] text-softer mt-0.5">Sabhi parties ka outstanding</div></div>
            <div className="text-[13px] font-semibold font-mono text-soft whitespace-nowrap">{fmt(udTotal)}</div>
            <ChevronRight size={16} className="text-softer shrink-0" />
          </button>
          <button onClick={() => dispatch({ type: 'PUSH_PAGE', page: 'monthly' })}
            className="glass rounded-2xl px-4 py-4 flex items-center gap-3.5 cursor-pointer border border-line transition-gpu hover-lift hover:border-monthly/30 text-left w-full animate-card-in [animation-delay:0.4s]">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-monthly-light text-monthly"><BarChart3 size={21} /></div>
            <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink">Monthly Report</div><div className="text-[11.5px] text-softer mt-0.5">Trend, stats aur breakup</div></div>
            <ChevronRight size={16} className="text-softer shrink-0" />
          </button>
          <button onClick={() => dispatch({ type: 'PUSH_PAGE', page: 'history' })}
            className="glass rounded-2xl px-4 py-4 flex items-center gap-3.5 cursor-pointer border border-dashed border-accent/20 transition-gpu hover-lift hover:border-accent/40 text-left w-full animate-card-in [animation-delay:0.45s]">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-accent-dim text-accent"><Clock size={21} /></div>
            <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink">Hisab History</div><div className="text-[11.5px] text-softer mt-0.5">Sabhi purane records</div></div>
            <ChevronRight size={16} className="text-softer shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
