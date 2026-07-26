import { useCallback } from 'react';
import { useApp, NOTES, COINS, fmt, cashT, todayKey } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Minus, Plus } from 'lucide-react';

/* ── Row extracted OUTSIDE the parent component ── */
/* This prevents React from re-creating the DOM node on every keystroke */
function DenomRow({ denom, type, count, readonly, onSet, onInc, onDec }) {
  const total = denom * count;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
      <div className="w-[50px] text-right font-mono text-[14px] font-semibold text-amber">₹{denom}</div>
      <div className="flex items-center gap-1.5">
        <button onClick={onDec} disabled={readonly || count <= 0}
          className="w-8 h-8 rounded-xl glass flex items-center justify-center cursor-pointer disabled:opacity-30 transition-gpu hover:bg-white/10 active:scale-90">
          <Minus size={14} className="text-soft" />
        </button>
        <input
          type="number" min="0"
          value={count || ''}
          onChange={(e) => onSet(e.target.value)}
          placeholder="0"
          disabled={readonly}
          className="w-14 text-center font-mono text-[14px] font-medium bg-bg-input border border-line rounded-xl py-2 outline-none focus:border-accent/40 disabled:opacity-40 text-ink"
        />
        <button onClick={onInc} disabled={readonly}
          className="w-8 h-8 rounded-xl glass flex items-center justify-center cursor-pointer disabled:opacity-30 transition-gpu hover:bg-white/10 active:scale-90">
          <Plus size={14} className="text-soft" />
        </button>
      </div>
      <div className="flex-1 text-right font-mono text-[13px] text-softer">{total > 0 ? fmt(total) : '—'}</div>
    </div>
  );
}

export default function CashEntry() {
  const { state, dispatch, saveDay } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const setVal = useCallback((type, key, val) => {
    const intVal = Math.max(0, parseInt(val) || 0);
    dispatch({ type: 'UPDATE_DAY', updates: { [type]: { ...day[type], [key]: intVal } } });
    saveDay();
  }, [day, dispatch, saveDay]);

  const inc = useCallback((type, key) => {
    setVal(type, key, (+day[type]?.[key] || 0) + 1);
  }, [day, setVal]);

  const dec = useCallback((type, key) => {
    setVal(type, key, (+day[type]?.[key] || 0) - 1);
  }, [day, setVal]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'UPDATE_DAY', updates: {
      notes: Object.fromEntries(NOTES.map((n) => [n, 0])),
      coins: Object.fromEntries(COINS.map((c) => [c, 0])),
    }});
    saveDay();
  }, [dispatch, saveDay]);

  return (
    <div className="min-h-dvh">
      <Topbar title="Cash Denomination" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notes */}
          <div className="glass rounded-2xl p-5 animate-card-in">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold text-accent uppercase tracking-wider">Notes</div>
              {!readonly && (
                <button onClick={clearAll} className="text-[11px] text-red font-medium cursor-pointer border-none bg-transparent hover:text-red/80 transition-colors">Clear All</button>
              )}
            </div>
            {NOTES.map((n) => (
              <DenomRow
                key={n} denom={n} type="notes"
                count={+day.notes?.[n] || 0}
                readonly={readonly}
                onSet={(v) => setVal('notes', n, v)}
                onInc={() => inc('notes', n)}
                onDec={() => dec('notes', n)}
              />
            ))}
          </div>

          {/* Coins */}
          <div className="glass rounded-2xl p-5 animate-card-in [animation-delay:0.08s]">
            <div className="text-[13px] font-semibold text-accent uppercase tracking-wider mb-3">Coins</div>
            {COINS.map((c) => (
              <DenomRow
                key={c} denom={c} type="coins"
                count={+day.coins?.[c] || 0}
                readonly={readonly}
                onSet={(v) => setVal('coins', c, v)}
                onInc={() => inc('coins', c)}
                onDec={() => dec('coins', c)}
              />
            ))}
          </div>
        </div>

        {/* Grand total */}
        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center mt-4 glow-accent animate-slide-up [animation-delay:0.15s]">
          <span className="text-[15px] font-semibold text-ink">Total Cash</span>
          <span className="text-[22px] font-bold font-mono text-accent">{fmt(cashT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="cash" />
    </div>
  );
}
