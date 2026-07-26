import { useCallback, useRef } from 'react';
import { useApp, fmt, cashT, digitalT, creditT, expenseT, clinicalT, netT, diffV, dateLbl, todayKey, emptyDay } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Printer, CheckCircle } from 'lucide-react';

export default function SummaryScreen() {
  const { state, dispatch, storage, updateSync, toast, isToday } = useApp();
  const { day, viewDate, editingReopened, history } = state;
  const printRef = useRef(null);
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;
  const isEditing = editingReopened && viewDate === editingReopened;

  const cash = cashT(day), digital = digitalT(day), credit = creditT(day);
  const expense = expenseT(day), clinical = clinicalT(day);
  const net = netT(day), expected = +day.expected || 0, diff = diffV(day);

  const rows = [
    { label: 'Cash Denomination', value: cash,    color: 'text-amber' },
    { label: 'Paytm / POS',      value: digital, color: 'text-neon' },
    { label: 'Credit Sales',     value: credit,  color: 'text-credit' },
    { label: 'Clinical Services',value: clinical, color: 'text-clinical' },
    { label: 'Daily Expenses',   value: expense, color: 'text-expense' },
  ];

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const printWin = window.open('', '_blank', 'width=400,height=700');
    printWin.document.write('<html><head><title>Daily Hisab — ' + dateLbl(viewDate) + '</title><style>body{font-family:Inter,sans-serif;padding:24px;font-size:13px;color:#1C2B2A}h2{font-size:18px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #DDE5DF}.total{font-weight:bold;font-size:16px}</style></head><body>');
    printWin.document.write(el.innerHTML);
    printWin.document.write('</body></html>');
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  const closeDay = useCallback(async () => {
    if (expected <= 0) { toast('Pehle Expected Sale daalein (₹0 se zyada)'); return; }
    const msg = diff === 0
      ? 'Hisab bilkul match ho raha hai ✓ Aaj ka hisab close karein?'
      : `${Math.abs(diff)} ka ${diff < 0 ? 'short' : 'excess'} hai. Phir bhi close karein?`;
    if (!confirm(msg)) return;

    const closed = { ...JSON.parse(JSON.stringify(day)), closed: true, closedAt: new Date().toISOString() };
    const newHist = [closed, ...history.filter((h) => h.date !== closed.date)];
    dispatch({ type: 'SET_HISTORY', history: newHist });
    await storage.set('history', JSON.stringify(newHist), updateSync).catch(() => {});
    await storage.set('day:' + viewDate, JSON.stringify(closed), updateSync).catch(() => {});

    if (isEditing) {
      dispatch({ type: 'SET_EDITING_REOPENED', date: null });
      const tk = todayKey();
      dispatch({ type: 'SET_VIEW_DATE', date: tk });
      try {
        const r = await storage.get('day:' + tk);
        dispatch({ type: 'SET_DAY', day: r?.value ? Object.assign(emptyDay(), JSON.parse(r.value)) : emptyDay() });
      } catch { dispatch({ type: 'SET_DAY', day: emptyDay() }); }
    } else {
      dispatch({ type: 'SET_DAY', day: emptyDay() });
    }
    dispatch({ type: 'GO_HOME' });
    toast('Aaj ka hisab band ho gaya ✓');
  }, [day, expected, diff, history, viewDate, isEditing, dispatch, storage, updateSync, toast]);

  return (
    <div className="min-h-dvh">
      <Topbar title="Final Hisab" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Summary card */}
          <div className="glass rounded-2xl p-5 animate-card-in" ref={printRef}>
            <div id="print-area">
              <h2 className="text-[17px] font-bold text-ink font-serif mb-0.5">Daily Hisab Summary</h2>
              <div className="text-[12px] text-softer mb-5">{dateLbl(viewDate)}</div>

              <table className="w-full border-collapse">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td className="py-2.5 border-b border-line text-[13px] text-soft">{r.label}</td>
                      <td className={`py-2.5 border-b border-line text-right font-mono text-[14px] font-semibold ${r.color}`}>{fmt(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center py-3 border-b-2 border-accent/30 mt-2">
                <span className="text-[14px] font-bold text-ink">Net Collection + Expenses</span>
                <span className="text-[17px] font-bold font-mono text-accent">{fmt(net)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-line">
                <span className="text-[13px] text-soft">Expected Sale</span>
                <span className="text-[14px] font-mono font-semibold text-accent">{fmt(expected)}</span>
              </div>

              <div className={`flex items-center justify-between rounded-2xl px-4 py-3.5 mt-4 ${
                diff === 0 ? 'bg-accent/12 border border-accent/20' : diff < 0 ? 'bg-red/12 border border-red/20' : 'bg-amber/12 border border-amber/20'
              }`}>
                <span className={`text-[15px] font-bold ${diff === 0 ? 'text-accent' : diff < 0 ? 'text-red' : 'text-amber'}`}>
                  {diff === 0 ? 'Match ✓' : diff < 0 ? 'Short ↓' : 'Excess ↑'}
                </span>
                <span className={`text-[22px] font-bold font-mono ${diff === 0 ? 'text-accent' : diff < 0 ? 'text-red' : 'text-amber'}`}>
                  {fmt(Math.abs(diff))}
                </span>
              </div>
            </div>
          </div>

          {/* Detail breakdowns */}
          <div className="flex flex-col gap-4">
            {(day.credits || []).filter((c) => !c.paid).length > 0 && (
              <div className="glass rounded-2xl p-5 animate-card-in [animation-delay:0.08s]">
                <div className="text-[12px] font-semibold text-credit uppercase tracking-wider mb-2">Credit Entries</div>
                {day.credits.filter((c) => !c.paid).map((c) => (
                  <div key={c.id} className="flex justify-between py-1.5 text-[12.5px]">
                    <span className="text-soft truncate flex-1">{c.name}{c.note ? ` — ${c.note}` : ''}</span>
                    <span className="font-mono text-credit ml-3">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {(day.expenses || []).length > 0 && (
              <div className="glass rounded-2xl p-5 animate-card-in [animation-delay:0.12s]">
                <div className="text-[12px] font-semibold text-expense uppercase tracking-wider mb-2">Expenses</div>
                {day.expenses.map((e) => (
                  <div key={e.id} className="flex justify-between py-1.5 text-[12.5px]">
                    <span className="text-soft truncate flex-1">{e.desc}</span>
                    <span className="font-mono text-expense ml-3">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {(day.clinicals || []).length > 0 && (
              <div className="glass rounded-2xl p-5 animate-card-in [animation-delay:0.16s]">
                <div className="text-[12px] font-semibold text-clinical uppercase tracking-wider mb-2">Clinical Services</div>
                {day.clinicals.map((c) => (
                  <div key={c.id} className="flex justify-between py-1.5 text-[12.5px]">
                    <span className="text-soft truncate flex-1">{c.type}{c.note ? ` — ${c.note}` : ''}</span>
                    <span className="font-mono text-clinical ml-3">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5 animate-slide-up [animation-delay:0.2s]">
          <button onClick={handlePrint}
            className="flex-1 glass border border-accent/20 text-accent rounded-2xl py-3.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-accent/10 active:scale-[0.98]">
            <Printer size={16} /> Print / PDF
          </button>
          {(isToday() || isEditing) && (
            <button onClick={closeDay}
              className="flex-1 bg-gradient-to-r from-accent/25 to-accent/10 border border-accent/30 text-accent rounded-2xl py-3.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:from-accent/35 hover:to-accent/15 active:scale-[0.98]">
              <CheckCircle size={16} /> {isEditing ? 'Save & Close' : 'Aaj ka Hisab Close'}
            </button>
          )}
        </div>
      </div>
      <NavFooter currentPage="summary" />
    </div>
  );
}
