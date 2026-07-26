import { useMemo } from 'react';
import { useApp, fmt, dayTotals, MONTHS } from '../context/AppContext';
import Topbar from './Topbar';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function MonthlyReport() {
  const { state, dispatch } = useApp();
  const { history, monthCursor, reportMode } = state;

  const year  = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const changeMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    dispatch({ type: 'SET_MONTH_CURSOR', cursor: d });
  };

  const stats = useMemo(() => {
    let entries;
    if (reportMode === 'monthly') {
      entries = history.filter((h) => {
        const d = new Date(h.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      });
    } else {
      entries = history.filter((h) => {
        const d = new Date(h.date + 'T00:00:00');
        return d.getFullYear() === year;
      });
    }
    if (entries.length === 0) return null;

    let totalCash = 0, totalDigital = 0, totalCredit = 0, totalExpense = 0, totalClinical = 0, totalNet = 0, totalExpected = 0;
    let maxDay = null, minDay = null, maxNet = -Infinity, minNet = Infinity;

    entries.forEach((h) => {
      const t = dayTotals(h);
      totalCash += t.cash; totalDigital += t.digital; totalCredit += t.credit;
      totalExpense += t.expense; totalClinical += t.clinical; totalNet += t.net;
      totalExpected += +h.expected || 0;
      if (t.net > maxNet) { maxNet = t.net; maxDay = h.date; }
      if (t.net < minNet) { minNet = t.net; minDay = h.date; }
    });

    const avgNet = totalNet / entries.length;
    const diff   = totalNet - totalExpected;
    return { count: entries.length, totalCash, totalDigital, totalCredit, totalExpense, totalClinical, totalNet, totalExpected, avgNet, diff, maxNet, maxDay, minNet, minDay };
  }, [history, year, month, reportMode]);

  return (
    <div className="min-h-dvh">
      <Topbar title="Monthly Report" />
      <div className="px-5 sm:px-8 lg:px-12 max-w-5xl mx-auto pt-4 pb-10">
        {/* Toggle */}
        <div className="flex glass rounded-full p-1 mb-4 animate-fade-in">
          <button onClick={() => dispatch({ type: 'SET_REPORT_MODE', mode: 'monthly' })}
            className={`flex-1 py-2.5 rounded-full text-[12px] font-semibold cursor-pointer border-none transition-gpu ${
              reportMode === 'monthly' ? 'bg-accent/20 text-accent' : 'bg-transparent text-softer hover:text-soft'
            }`}>Monthly</button>
          <button onClick={() => dispatch({ type: 'SET_REPORT_MODE', mode: 'yearly' })}
            className={`flex-1 py-2.5 rounded-full text-[12px] font-semibold cursor-pointer border-none transition-gpu ${
              reportMode === 'yearly' ? 'bg-accent/20 text-accent' : 'bg-transparent text-softer hover:text-soft'
            }`}>Yearly</button>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between glass rounded-2xl px-4 py-3 mb-4 animate-fade-in [animation-delay:0.05s]">
          <button onClick={() => changeMonth(reportMode === 'monthly' ? -1 : -12)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-white/10 active:scale-90">
            <ChevronLeft size={16} className="text-soft" />
          </button>
          <div className="text-[16px] font-bold text-ink font-serif">
            {reportMode === 'monthly' ? `${MONTHS[month]} ${year}` : `${year}`}
          </div>
          <button onClick={() => changeMonth(reportMode === 'monthly' ? 1 : 12)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-white/10 active:scale-90">
            <ChevronRight size={16} className="text-soft" />
          </button>
        </div>

        {!stats ? (
          <div className="text-center text-softer text-[13px] py-16">Is {reportMode === 'monthly' ? 'mahine' : 'saal'} ka koi record nahi hai</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overview */}
            <div className="glass rounded-2xl p-5 animate-card-in">
              <div className="text-[11px] text-softer uppercase tracking-wider mb-3">Overview — {stats.count} days</div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Cash</span><span className="font-mono text-[13px] font-medium text-amber">{fmt(stats.totalCash)}</span></div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Digital</span><span className="font-mono text-[13px] font-medium text-neon">{fmt(stats.totalDigital)}</span></div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Credit</span><span className="font-mono text-[13px] font-medium text-credit">{fmt(stats.totalCredit)}</span></div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Expense</span><span className="font-mono text-[13px] font-medium text-expense">{fmt(stats.totalExpense)}</span></div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Clinical</span><span className="font-mono text-[13px] font-medium text-clinical">{fmt(stats.totalClinical)}</span></div>
              <div className="flex justify-between py-3 border-t-2 border-accent/30 mt-2"><span className="text-[14px] font-bold text-ink">Total Net</span><span className="font-mono text-[16px] font-bold text-accent">{fmt(stats.totalNet)}</span></div>
              <div className="flex justify-between py-2"><span className="text-[13px] text-soft">Expected</span><span className="font-mono text-[13px] font-medium text-accent">{fmt(stats.totalExpected)}</span></div>
              <div className={`flex justify-between py-3 mt-2 rounded-xl px-3 ${stats.diff === 0 ? 'bg-accent/12' : stats.diff < 0 ? 'bg-red/12' : 'bg-amber/12'}`}>
                <span className={`text-[13px] font-bold ${stats.diff === 0 ? 'text-accent' : stats.diff < 0 ? 'text-red' : 'text-amber'}`}>
                  {stats.diff === 0 ? 'Match ✓' : stats.diff < 0 ? 'Short' : 'Excess'}
                </span>
                <span className={`font-mono text-[15px] font-bold ${stats.diff === 0 ? 'text-accent' : stats.diff < 0 ? 'text-red' : 'text-amber'}`}>{fmt(Math.abs(stats.diff))}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <div className="glass rounded-2xl p-4 animate-card-in [animation-delay:0.08s]">
                <div className="text-[10.5px] text-softer uppercase">Avg / Day</div>
                <div className="text-[18px] font-bold font-mono text-accent mt-1.5">{fmt(stats.avgNet)}</div>
              </div>
              <div className="glass rounded-2xl p-4 animate-card-in [animation-delay:0.12s]">
                <div className="text-[10.5px] text-softer uppercase flex items-center gap-1"><TrendingUp size={12} className="text-accent" /> Best Day</div>
                <div className="text-[18px] font-bold font-mono text-accent mt-1.5">{fmt(stats.maxNet)}</div>
                <div className="text-[10px] text-softer mt-0.5">{stats.maxDay}</div>
              </div>
              <div className="glass rounded-2xl p-4 animate-card-in [animation-delay:0.16s]">
                <div className="text-[10.5px] text-softer uppercase flex items-center gap-1"><TrendingDown size={12} className="text-red" /> Lowest</div>
                <div className="text-[18px] font-bold font-mono text-red mt-1.5">{fmt(stats.minNet)}</div>
                <div className="text-[10px] text-softer mt-0.5">{stats.minDay}</div>
              </div>
              <div className="glass rounded-2xl p-4 animate-card-in [animation-delay:0.2s]">
                <div className="text-[10.5px] text-softer uppercase">Days Closed</div>
                <div className="text-[18px] font-bold font-mono text-accent mt-1.5">{stats.count}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
