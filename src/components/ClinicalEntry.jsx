import { useState, useCallback } from 'react';
import { useApp, fmt, clinicalT, todayKey, CLINICAL_RATES, CLINICAL_TYPES } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Plus, Minus, Trash2, Stethoscope } from 'lucide-react';

/* Icons per service type */
const TYPE_ICONS = {
  'BP Checkup':   '🩺',
  'Dressing':     '🩹',
  'ECG':          '💓',
  'Nebulization': '💨',
  'RBS Test':     '🩸',
  'Other':        '📝',
};

export default function ClinicalEntry() {
  const { state, dispatch, saveDay, toast } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  /* For "Other" type — manual price + note */
  const [otherAmount, setOtherAmount] = useState('');
  const [otherNote, setOtherNote]     = useState('');

  /* Count how many of each fixed-rate type already exist today */
  const getCount = useCallback((type) => {
    return (day.clinicals || []).filter((c) => c.type === type).length;
  }, [day.clinicals]);

  /* Add one patient for a fixed-rate service */
  const addFixed = useCallback((type) => {
    const rate = CLINICAL_RATES[type];
    const item = {
      id: Date.now() + Math.random(),
      type,
      amount: rate,
      note: '',
    };
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: [...(day.clinicals || []), item] } });
    saveDay();
  }, [day.clinicals, dispatch, saveDay]);

  /* Remove last entry of a fixed-rate type */
  const removeLastOfType = useCallback((type) => {
    const list = [...(day.clinicals || [])];
    const lastIdx = list.map((c, i) => c.type === type ? i : -1).filter(i => i >= 0).pop();
    if (lastIdx !== undefined && lastIdx >= 0) {
      list.splice(lastIdx, 1);
      dispatch({ type: 'UPDATE_DAY', updates: { clinicals: list } });
      saveDay();
    }
  }, [day.clinicals, dispatch, saveDay]);

  /* Add manual "Other" service */
  const addOther = useCallback(() => {
    if (!(+otherAmount > 0)) { toast('Amount daalein'); return; }
    const item = {
      id: Date.now() + Math.random(),
      type: 'Other',
      amount: parseFloat(otherAmount),
      note: otherNote.trim(),
    };
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: [...(day.clinicals || []), item] } });
    saveDay();
    setOtherAmount(''); setOtherNote('');
    toast('Other service add ho gayi');
  }, [otherAmount, otherNote, day.clinicals, dispatch, saveDay, toast]);

  /* Remove specific entry by id */
  const remove = useCallback((id) => {
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: (day.clinicals || []).filter((c) => c.id !== id) } });
    saveDay();
  }, [day.clinicals, dispatch, saveDay]);

  /* Fixed-rate types (not "Other") */
  const fixedTypes = CLINICAL_TYPES.filter((t) => t !== 'Other');

  return (
    <div className="min-h-dvh">
      <Topbar title="Clinical Services" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">

        {/* Fixed-rate services counter grid */}
        {!readonly && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in">
            <div className="text-[12px] font-semibold text-clinical uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Stethoscope size={14} /> Fixed Rate Services
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fixedTypes.map((type) => {
                const rate = CLINICAL_RATES[type];
                const count = getCount(type);
                const total = rate * count;
                return (
                  <div key={type} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[18px]">{TYPE_ICONS[type]}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">{type}</div>
                        <div className="text-[11px] text-softer">₹{rate} / person</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => removeLastOfType(type)} disabled={count <= 0}
                        className="w-7 h-7 rounded-lg glass flex items-center justify-center cursor-pointer disabled:opacity-30 transition-gpu hover:bg-white/10 active:scale-90 border-none">
                        <Minus size={13} className="text-soft" />
                      </button>
                      <div className="w-8 text-center font-mono text-[15px] font-bold text-ink">{count}</div>
                      <button onClick={() => addFixed(type)}
                        className="w-7 h-7 rounded-lg bg-clinical/20 flex items-center justify-center cursor-pointer transition-gpu hover:bg-clinical/30 active:scale-90 border-none">
                        <Plus size={13} className="text-clinical" />
                      </button>
                      <div className="w-[60px] text-right font-mono text-[12px] text-softer">{total > 0 ? fmt(total) : '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* "Other" manual entry */}
        {!readonly && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.06s]">
            <div className="text-[12px] font-semibold text-clinical uppercase tracking-wider mb-3">{TYPE_ICONS['Other']} Other Services (Manual)</div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input type="number" placeholder="Amount (₹)" min="0" step="0.01" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)}
                className="flex-1 min-w-0 border border-line rounded-xl px-3.5 py-2.5 font-mono text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors w-full" />
              <input type="text" placeholder="Note (optional)" value={otherNote} onChange={(e) => setOtherNote(e.target.value)}
                className="flex-1 min-w-0 border border-line rounded-xl px-3.5 py-2.5 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors w-full" />
            </div>
            <button onClick={addOther}
              className="w-full mt-3 bg-clinical/20 text-clinical border border-clinical/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-clinical/30 active:scale-[0.98]">
              <Plus size={16} /> Other Entry Add karein
            </button>
          </div>
        )}

        {/* All entries list */}
        {(day.clinicals || []).length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.1s]">
            <div className="text-[12px] font-semibold text-clinical uppercase tracking-wider mb-3">Today's Entries ({day.clinicals.length})</div>
            {day.clinicals.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <span className="text-[16px]">{TYPE_ICONS[c.type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink">{c.type}</div>
                  {c.note && <div className="text-[11px] text-softer truncate">{c.note}</div>}
                </div>
                <div className="font-mono text-[13px] font-medium text-clinical whitespace-nowrap">{fmt(c.amount)}</div>
                {!readonly && (
                  <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-xl bg-red-light flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-red/25 active:scale-90">
                    <Trash2 size={14} className="text-red" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center glow-accent animate-slide-up [animation-delay:0.15s]">
          <span className="text-[15px] font-semibold text-ink">Total Clinical</span>
          <span className="text-[22px] font-bold font-mono text-clinical">{fmt(clinicalT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="clinical" />
    </div>
  );
}
