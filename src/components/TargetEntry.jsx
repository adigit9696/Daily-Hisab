import { useApp, fmt, todayKey } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';

export default function TargetEntry() {
  const { state, dispatch, saveDay } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const setExpected = (val) => {
    dispatch({ type: 'UPDATE_DAY', updates: { expected: Math.max(0, parseFloat(val) || 0) } });
    saveDay();
  };

  return (
    <div className="min-h-dvh">
      <Topbar title="Expected Sale" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-3xl mx-auto pt-4 pb-10">
        <div className="glass rounded-2xl p-6 animate-card-in">
          <label className="text-[12px] font-semibold text-accent uppercase tracking-wider block mb-4">Software / Register ka Total Sale</label>
          <input
            type="number" min="0" step="0.01" placeholder="Expected sale amount"
            value={day.expected || ''}
            onChange={(e) => setExpected(e.target.value)}
            disabled={readonly}
            className="w-full border border-line rounded-2xl px-4 py-4 font-mono text-[20px] bg-bg-input outline-none focus:border-accent/40 disabled:opacity-40 text-center text-ink transition-colors"
          />
          <p className="text-[12px] text-softer mt-4 text-center leading-relaxed">
            Ye amount software ya register se aata hai — isse actual collection se compare karte hain.
          </p>
        </div>
        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center mt-4 glow-accent animate-slide-up [animation-delay:0.1s]">
          <span className="text-[15px] font-semibold text-ink">Expected Sale</span>
          <span className="text-[22px] font-bold font-mono text-accent">{fmt(+day.expected || 0)}</span>
        </div>
      </div>
      <NavFooter currentPage="target" />
    </div>
  );
}
