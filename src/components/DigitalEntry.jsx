import { useApp, fmt, digitalT, todayKey } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';

export default function DigitalEntry() {
  const { state, dispatch, saveDay } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const setField = (field, val) => {
    dispatch({ type: 'UPDATE_DAY', updates: { [field]: Math.max(0, parseFloat(val) || 0) } });
    saveDay();
  };

  return (
    <div className="min-h-dvh">
      <Topbar title="Paytm / POS" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-3xl mx-auto pt-4 pb-10">
        <div className="glass rounded-2xl p-5 flex flex-col gap-5 animate-card-in">
          <div>
            <label className="text-[12px] font-semibold text-accent uppercase tracking-wider block mb-2">Paytm / UPI</label>
            <input type="number" min="0" step="0.01" placeholder="0"
              value={day.paytm || ''} onChange={(e) => setField('paytm', e.target.value)} disabled={readonly}
              className="w-full border border-line rounded-2xl px-4 py-3 font-mono text-[16px] bg-bg-input outline-none focus:border-accent/40 disabled:opacity-40 text-ink transition-colors" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-accent uppercase tracking-wider block mb-2">Card / POS Machine</label>
            <input type="number" min="0" step="0.01" placeholder="0"
              value={day.pos || ''} onChange={(e) => setField('pos', e.target.value)} disabled={readonly}
              className="w-full border border-line rounded-2xl px-4 py-3 font-mono text-[16px] bg-bg-input outline-none focus:border-accent/40 disabled:opacity-40 text-ink transition-colors" />
          </div>
        </div>
        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center mt-4 glow-accent animate-slide-up [animation-delay:0.1s]">
          <span className="text-[15px] font-semibold text-ink">Total Digital</span>
          <span className="text-[22px] font-bold font-mono text-neon">{fmt(digitalT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="digital" />
    </div>
  );
}
