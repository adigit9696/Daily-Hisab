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
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const statusText = diff === 0 ? 'BALANCED ✓' : diff < 0 ? `SHORT ₹${Math.abs(diff).toLocaleString('en-IN')}` : `EXCESS ₹${Math.abs(diff).toLocaleString('en-IN')}`;
    const r = (n) => '₹' + Math.round(((n || 0) + Number.EPSILON) * 100 / 100).toLocaleString('en-IN');

    const credits = (day.credits || []).filter((c) => !c.paid);
    const expenses = day.expenses || [];
    const clinicals = day.clinicals || [];

    let html = `<html><head><title>Daily Hisab — ${dateLbl(viewDate)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px 32px; font-size: 12px; color: #1a1a1a; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 18px; }
  .header h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; margin-bottom: 2px; }
  .header .sub { font-size: 12px; color: #555; }
  .header .status { display: inline-block; margin-top: 8px; padding: 4px 14px; border: 1.5px solid #222; border-radius: 4px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #bbb; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { padding: 6px 10px; border: 1px solid #ccc; text-align: left; font-size: 12px; }
  th { background: #f0f0f0; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td.amt { text-align: right; font-family: 'Consolas', monospace; font-weight: 600; }
  .total-row td { font-weight: 800; font-size: 13px; border-top: 2px solid #222; background: #f8f8f8; }
  .diff-row td { font-weight: 800; font-size: 14px; border-top: 2px solid #222; }
  .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #bbb; font-size: 10px; color: #888; }
  @media print { body { padding: 16px 20px; } }
</style></head><body>`;

    // Header
    html += `<div class="header">
      <h1>SARITA PHARMACY</h1>
      <div class="sub">DAILY HISAB STATEMENT</div>
      <div class="sub">${dateLbl(viewDate)} &nbsp;|&nbsp; Generated at ${timeStr}</div>
      <div class="status">${statusText}</div>
    </div>`;

    // Table 1: Financial Summary
    html += `<div class="section"><div class="section-title">Financial Summary</div>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Cash Denomination</td><td class="amt">${r(cash)}</td></tr>
        <tr><td>Paytm / POS (Digital)</td><td class="amt">${r(digital)}</td></tr>
        <tr><td>Credit Sales</td><td class="amt">${r(credit)}</td></tr>
        <tr><td>Clinical Services</td><td class="amt">${r(clinical)}</td></tr>
        <tr><td>Daily Expenses</td><td class="amt">${r(expense)}</td></tr>
        <tr class="total-row"><td>Net Collection + Expenses</td><td class="amt">${r(net)}</td></tr>
        <tr><td>Expected Sale</td><td class="amt">${r(expected)}</td></tr>
        <tr class="diff-row"><td>${diff === 0 ? 'Match ✓' : diff < 0 ? 'Short ↓' : 'Excess ↑'}</td><td class="amt">${r(Math.abs(diff))}</td></tr>
      </tbody>
    </table></div>`;

    // Table 2: Credit Entries
    if (credits.length > 0) {
      html += `<div class="section"><div class="section-title">Credit Sales Breakdown</div>
      <table>
        <thead><tr><th>Party Name</th><th>Phone</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>`;
      credits.forEach((c) => {
        html += `<tr><td>${c.name || '—'}</td><td>${c.phone ? '+91 ' + c.phone : '—'}</td><td class="amt">${r(c.amount)}</td></tr>`;
      });
      html += `<tr class="total-row"><td colspan="2">Total Credit</td><td class="amt">${r(credit)}</td></tr>`;
      html += `</tbody></table></div>`;
    }

    // Table 3: Expenses
    if (expenses.length > 0) {
      html += `<div class="section"><div class="section-title">Daily Expenses Breakdown</div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>`;
      expenses.forEach((e) => {
        html += `<tr><td>${e.desc || '—'}</td><td class="amt">${r(e.amount)}</td></tr>`;
      });
      html += `<tr class="total-row"><td>Total Expenses</td><td class="amt">${r(expense)}</td></tr>`;
      html += `</tbody></table></div>`;
    }

    // Table 4: Clinical Services
    if (clinicals.length > 0) {
      html += `<div class="section"><div class="section-title">Clinical Services Breakdown</div>
      <table>
        <thead><tr><th>Service</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>`;
      clinicals.forEach((c) => {
        html += `<tr><td>${c.type || '—'}${c.note ? ' — ' + c.note : ''}</td><td class="amt">${r(c.amount)}</td></tr>`;
      });
      html += `<tr class="total-row"><td>Total Clinical</td><td class="amt">${r(clinical)}</td></tr>`;
      html += `</tbody></table></div>`;
    }

    // Footer
    html += `<div class="footer">This is a computer-generated statement from Sarita Pharmacy Daily Hisab System.<br/>Printed on ${now.toLocaleDateString('en-IN')} at ${timeStr}</div>`;
    html += `</body></html>`;

    const printWin = window.open('', '_blank', 'width=700,height=900');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 300);
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
