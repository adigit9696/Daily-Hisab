import { useState, useCallback, useRef } from 'react';
import { useApp, fmt, clinicalT, todayKey, CLINICAL_RATES, CLINICAL_TYPES } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Plus, Minus, Trash2, ArrowRight } from 'lucide-react';

/* Strict rounding — matches AppContext r2() */
const r2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

/* Icons per service type */
const TYPE_ICONS = {
  'BP Checkup':   '🩺',
  'Dressing':     '🩹',
  'ECG':          '💓',
  'Nebulization': '💨',
  'RBS Test':     '🩸',
  'Other':        '📝',
};

/* Fixed-rate types (not "Other") */
const FIXED_TYPES = CLINICAL_TYPES.filter((t) => t !== 'Other');

export default function ClinicalEntry() {
  const { state, dispatch, saveDay, toast } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  /* Local count state — uses refs to avoid stale closures in submit */
  const [counts, setCounts] = useState(() =>
    Object.fromEntries(FIXED_TYPES.map((t) => [t, 0]))
  );
  const countsRef = useRef(counts);
  countsRef.current = counts;

  /* For "Other" type */
  const [otherAmount, setOtherAmount] = useState('');
  const [otherNote, setOtherNote]     = useState('');

  /* Update count for a specific type */
  const setCount = useCallback((type, val) => {
    const n = Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [type]: n }));
  }, []);

  const increment = useCallback((type) => {
    setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
  }, []);

  const decrement = useCallback((type) => {
    setCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
  }, []);

  /* Submit fixed-rate service — reads from ref to guarantee fresh count */
  const submitFixed = useCallback((type) => {
    const count = countsRef.current[type] || 0;
    if (count <= 0) { toast(`${type} ka count daalein`); return; }

    const rate = CLINICAL_RATES[type];
    const totalAmount = r2(count * rate);

    const item = {
      id: Date.now() + Math.random(),
      type,
      count,
      rate,
      amount: totalAmount,
      note: `${count} Patient${count > 1 ? 's' : ''} × ₹${rate}`,
    };

    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: [...(day.clinicals || []), item] } });
    saveDay(true);  /* instant save — prevents onSnapshot rollback */
    setCounts((prev) => ({ ...prev, [type]: 0 }));
    toast(`${type} (${count}) — ${fmt(totalAmount)} add ho gayi`);
  }, [day.clinicals, dispatch, saveDay, toast]);

  /* Add manual "Other" service */
  const addOther = useCallback(() => {
    if (!(+otherAmount > 0)) { toast('Amount daalein'); return; }
    const amt = r2(parseFloat(otherAmount));
    const item = {
      id: Date.now() + Math.random(),
      type: 'Other',
      count: 1,
      rate: amt,
      amount: amt,
      note: otherNote.trim(),
    };
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: [...(day.clinicals || []), item] } });
    saveDay(true);  /* instant save */
    setOtherAmount(''); setOtherNote('');
    toast('Other service add ho gayi');
  }, [otherAmount, otherNote, day.clinicals, dispatch, saveDay, toast]);

  /* Remove entry by id */
  const remove = useCallback((id) => {
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: (day.clinicals || []).filter((c) => c.id !== id) } });
    saveDay(true);  /* instant save — entry MUST NOT reappear */
  }, [day.clinicals, dispatch, saveDay]);

  return (
    <div className="min-h-dvh">
      <Topbar title="Clinical Services" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">

        {/* ── Compact 2-Column Fixed Services Grid ── */}
        {!readonly && (
          <div className="rounded-2xl bg-bg-card border border-line p-4 mb-4 animate-card-in" style={{ contain: 'content' }}>
            <div className="text-[11px] font-semibold text-clinical uppercase tracking-wider mb-3">⚕️ Fixed Rate Services</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FIXED_TYPES.map((type) => {
                const rate = CLINICAL_RATES[type];
                const count = counts[type] || 0;
                const preview = r2(count * rate);
                return (
                  <div key={type} className="rounded-xl bg-bg-input border border-line p-3" style={{ transform: 'translateZ(0)' }}>
                    {/* Header: Icon + Name + Rate badge + Preview */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[16px] leading-none">{TYPE_ICONS[type]}</span>
                      <span className="text-[13px] font-semibold text-ink flex-1 min-w-0 truncate">{type}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-clinical/15 text-clinical shrink-0">₹{rate}/pt</span>
                    </div>
                    {/* Control Row: - | input | + | → Add */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => decrement(type)} disabled={count <= 0}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-line flex items-center justify-center cursor-pointer disabled:opacity-25 active:scale-90 shrink-0">
                        <Minus size={13} className="text-soft" />
                      </button>
                      <input
                        type="number" min="0" inputMode="numeric"
                        value={count || ''}
                        placeholder="0"
                        onChange={(e) => setCount(type, e.target.value)}
                        className="flex-1 min-w-0 w-full border border-line rounded-lg px-2 py-1.5 font-mono text-[15px] text-center bg-bg-primary outline-none focus:border-clinical/40 text-ink"
                      />
                      <button onClick={() => increment(type)}
                        className="w-8 h-8 rounded-lg bg-clinical/15 border border-clinical/20 flex items-center justify-center cursor-pointer active:scale-90 shrink-0">
                        <Plus size={13} className="text-clinical" />
                      </button>
                      <button onClick={() => submitFixed(type)} disabled={count <= 0}
                        className="h-8 px-3 rounded-lg bg-clinical/25 border border-clinical/30 flex items-center gap-1 cursor-pointer disabled:opacity-25 active:scale-95 shrink-0">
                        <ArrowRight size={13} className="text-clinical" />
                      </button>
                    </div>
                    {/* Live preview */}
                    {count > 0 && (
                      <div className="text-[11px] font-mono text-clinical/70 mt-1.5 text-right">
                        {count} × ₹{rate} = <span className="font-bold text-clinical">{fmt(preview)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Other (Manual) ── */}
        {!readonly && (
          <div className="rounded-2xl bg-bg-card border border-line p-4 mb-4 animate-card-in [animation-delay:0.05s]" style={{ contain: 'content' }}>
            <div className="text-[11px] font-semibold text-clinical uppercase tracking-wider mb-3">📝 Other Services (Manual)</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="number" placeholder="Amount (₹)" min="0" inputMode="decimal" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)}
                className="flex-1 min-w-0 border border-line rounded-xl px-3 py-2.5 font-mono text-[14px] bg-bg-input outline-none focus:border-clinical/40 text-ink w-full" />
              <input type="text" placeholder="Note (optional)" value={otherNote} onChange={(e) => setOtherNote(e.target.value)}
                className="flex-1 min-w-0 border border-line rounded-xl px-3 py-2.5 text-[14px] bg-bg-input outline-none focus:border-clinical/40 text-ink w-full" />
            </div>
            <button onClick={addOther}
              className="w-full mt-2.5 bg-clinical/20 text-clinical border border-clinical/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 hover:bg-clinical/30 active:scale-[0.98]">
              <ArrowRight size={15} /> Add Other Entry
            </button>
          </div>
        )}

        {/* ── Today's Entries (lightweight cards, no heavy blur) ── */}
        {(day.clinicals || []).length > 0 && (
          <div className="rounded-2xl bg-bg-card border border-line p-4 mb-4 animate-card-in [animation-delay:0.08s]" style={{ contain: 'content' }}>
            <div className="text-[11px] font-semibold text-clinical uppercase tracking-wider mb-2">Today's Entries ({day.clinicals.length})</div>
            <div className="flex flex-col gap-1">
              {day.clinicals.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-bg-input border border-line" style={{ transform: 'translateZ(0)' }}>
                  <span className="text-[15px] shrink-0">{TYPE_ICONS[c.type] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ink truncate">
                      {c.type}
                      {(c.count || 0) > 1 && (
                        <span className="text-softer font-normal text-[11px] ml-1">({c.count} Patients)</span>
                      )}
                    </div>
                    {c.note && <div className="text-[10.5px] text-softer truncate">{c.note}</div>}
                  </div>
                  <div className="font-mono text-[13px] font-bold text-clinical whitespace-nowrap shrink-0">{fmt(c.amount)}</div>
                  {!readonly && (
                    <button onClick={() => remove(c.id)} className="w-7 h-7 rounded-lg bg-red/10 flex items-center justify-center cursor-pointer border-none active:scale-90 shrink-0">
                      <Trash2 size={13} className="text-red" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Total ── */}
        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center glow-accent animate-slide-up [animation-delay:0.12s]">
          <span className="text-[15px] font-semibold text-ink">Total Clinical</span>
          <span className="text-[22px] font-bold font-mono text-clinical">{fmt(clinicalT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="clinical" />
    </div>
  );
}
