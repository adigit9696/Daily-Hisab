import { useState, useCallback } from 'react';
import { useApp, fmt, todayKey, emptyDay, NOTES, COINS } from '../context/AppContext';
import Topbar from './Topbar';
import { Key, Shield, Gauge, Download, Trash2, AlertTriangle, FileText } from 'lucide-react';

/* Strict financial rounding — same as AppContext */
const r2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

function computeTotals(h) {
  const cashT    = r2(NOTES.reduce((s, n) => s + n * (+h.notes?.[n] || 0), 0) + COINS.reduce((s, c) => s + c * (+h.coins?.[c] || 0), 0));
  const digitalT = r2((+h.paytm || 0) + (+h.pos || 0));
  const creditT  = r2((h.credits || []).filter((c) => !c.paid).reduce((s, c) => s + (+c.amount || 0), 0));
  const expenseT = r2((h.expenses || []).reduce((s, e) => s + (+e.amount || 0), 0));
  const clinicalT= r2((h.clinicals || []).reduce((s, c) => s + (+c.amount || 0), 0));
  const netT     = r2(cashT + digitalT + creditT + clinicalT + expenseT);
  const diffV    = r2(netT - (+h.expected || 0));
  return { cashT, digitalT, creditT, expenseT, clinicalT, netT, diffV };
}

function fmtNum(n) { return '₹' + r2(n).toLocaleString('en-IN'); }

export default function SettingsScreen() {
  const { state, dispatch, storage, updateSync, toast } = useApp();
  const { pin, autoLock, threshold, history, day } = state;

  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPin, setOldPin]   = useState('');
  const [newPin, setNewPin]   = useState('');
  const [newPin2, setNewPin2] = useState('');

  const changePin = useCallback(async () => {
    if (oldPin !== pin)       { toast('Purana PIN galat hai'); return; }
    if (newPin.length !== 4)  { toast('Naya PIN 4 digit ka hona chahiye'); return; }
    if (newPin !== newPin2)   { toast('Dono naye PIN match nahi kar rahe'); return; }
    dispatch({ type: 'SET_PIN', pin: newPin });
    await storage.set('pin', newPin, updateSync).catch(() => {});
    setShowPinChange(false);
    setOldPin(''); setNewPin(''); setNewPin2('');
    toast('PIN badal diya gaya ✓');
  }, [oldPin, newPin, newPin2, pin, dispatch, storage, updateSync, toast]);

  const toggleLock = useCallback(async () => {
    const next = !autoLock;
    dispatch({ type: 'SET_SETTINGS', autoLock: next });
    await storage.set('settings', JSON.stringify({ autoLock: next, threshold, lastBackup: state.lastBackup }), updateSync).catch(() => {});
    toast(next ? 'Auto-lock ON — 3 min baad lock' : 'Auto-lock OFF');
  }, [autoLock, threshold, state.lastBackup, dispatch, storage, updateSync, toast]);

  const setThreshold = useCallback(async (val) => {
    const n = Math.max(0, parseInt(val) || 0);
    dispatch({ type: 'SET_SETTINGS', threshold: n });
    await storage.set('settings', JSON.stringify({ autoLock, threshold: n, lastBackup: state.lastBackup }), updateSync).catch(() => {});
  }, [autoLock, state.lastBackup, dispatch, storage, updateSync]);

  /* ── Professional PDF Export ── */
  const exportPDF = useCallback(async () => {
    const allDays = [...history];
    if (!day.closed && day.date) allDays.unshift(day);
    if (allDays.length === 0) { toast('Export karne ke liye koi data nahi hai'); return; }

    // Sort by date ascending for the report
    allDays.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Group by month
    const months = {};
    allDays.forEach((h) => {
      const monthKey = (h.date || '').slice(0, 7); // YYYY-MM
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(h);
    });

    let grandCash = 0, grandDigital = 0, grandCredit = 0, grandExpense = 0, grandClinical = 0, grandNet = 0, grandExpected = 0;

    let tableRows = '';
    Object.entries(months).sort(([a],[b]) => a.localeCompare(b)).forEach(([monthKey, days]) => {
      const [yr, mn] = monthKey.split('-');
      const monthName = new Date(+yr, +mn - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      tableRows += `<tr class="month-header"><td colspan="10">📅 ${monthName}</td></tr>`;

      let mCash = 0, mDigital = 0, mCredit = 0, mExpense = 0, mClinical = 0, mNet = 0, mExpected = 0;

      days.forEach((h) => {
        const t = computeTotals(h);
        const status = t.diffV === 0 ? '✓ Match' : t.diffV < 0 ? '⚠ Short' : '↑ Excess';
        const dateStr = new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });

        tableRows += `<tr>
          <td style="padding:6px 10px;border:1px solid #ccc;font-size:11px;">${dateStr}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(t.cashT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(t.digitalT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(t.creditT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(t.expenseT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(t.clinicalT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;font-weight:700;">${fmtNum(t.netT)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(+h.expected || 0)}</td>
          <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(Math.abs(t.diffV))}</td>
          <td style="padding:6px 10px;border:1px solid #ccc;font-size:10px;font-weight:600;">${status}</td>
        </tr>`;

        mCash += t.cashT; mDigital += t.digitalT; mCredit += t.creditT;
        mExpense += t.expenseT; mClinical += t.clinicalT; mNet += t.netT; mExpected += (+h.expected || 0);
      });

      // Month subtotal
      const mDiff = mNet - mExpected;
      tableRows += `<tr class="subtotal-row">
        <td style="padding:6px 10px;border:1px solid #ccc;">Subtotal (${days.length} days)</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mCash)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mDigital)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mCredit)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mExpense)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mClinical)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mNet)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(mExpected)}</td>
        <td class="amt" style="padding:6px 10px;border:1px solid #ccc;">${fmtNum(Math.abs(mDiff))}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;"></td>
      </tr>`;

      grandCash += mCash; grandDigital += mDigital; grandCredit += mCredit;
      grandExpense += mExpense; grandClinical += mClinical; grandNet += mNet; grandExpected += mExpected;
    });

    const grandDiff = grandNet - grandExpected;
    const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    /* ── Udhaar Khata Outstanding Summary ── */
    const customers = state.customers || [];
    const activeCustomers = customers.filter((c) => {
      const bal = (c.transactions || []).reduce((s, t) => s + (t.type === 'given' ? t.amount : -t.amount), 0);
      return bal > 0;
    });
    let totalOutstanding = 0;
    activeCustomers.forEach((c) => {
      totalOutstanding += (c.transactions || []).reduce((s, t) => s + (t.type === 'given' ? t.amount : -t.amount), 0);
    });

    let udhaarRows = '';
    activeCustomers.forEach((c) => {
      const bal = (c.transactions || []).reduce((s, t) => s + (t.type === 'given' ? t.amount : -t.amount), 0);
      udhaarRows += `<tr><td style="padding:6px 10px;border:1px solid #ccc;">${c.name}</td><td style="padding:6px 10px;border:1px solid #ccc;">${c.phone ? '+91 ' + c.phone : '—'}</td><td class="amt" style="padding:6px 10px;border:1px solid #ccc;text-align:right;font-family:Consolas,monospace;font-weight:600;">${fmtNum(bal)}</td></tr>`;
    });

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Sarita Pharmacy — Hisab Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px 32px; font-size: 12px; color: #1a1a1a; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 18px; }
  .header h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; margin-bottom: 2px; }
  .header .sub { font-size: 12px; color: #555; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #bbb; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { padding: 6px 10px; border: 1px solid #ccc; text-align: left; font-size: 11px; }
  th { background: #f0f0f0; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .amt { text-align: right; font-family: 'Consolas', monospace; font-weight: 600; }
  .month-header td { background: #e8e8e8; font-weight: 700; font-size: 12px; }
  .subtotal-row td { font-weight: 700; border-top: 2px solid #999; background: #f5f5f5; }
  .grand-row td { font-weight: 800; font-size: 12px; border-top: 3px solid #222; background: #e8e8e8; }
  .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #bbb; font-size: 10px; color: #888; }
  @media print { @page { size: A4 landscape; margin: 12mm; } body { padding: 16px 20px; } }
</style>
</head><body>
  <div class="header">
    <h1>SARITA PHARMACY</h1>
    <div class="sub">DAILY HISAB — FINANCIAL REPORT</div>
    <div class="sub">Generated: ${printDate} | ${allDays.length} entries</div>
  </div>

  <div class="section"><div class="section-title">Day-wise Financial Breakdown</div>
  <table>
    <thead>
      <tr>
        <th style="width:90px;">Date</th>
        <th class="amt">Cash</th><th class="amt">Digital</th><th class="amt">Credit</th><th class="amt">Expense</th><th class="amt">Clinical</th>
        <th class="amt">Net</th><th class="amt">Expected</th><th class="amt">Diff</th><th style="width:60px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="grand-row">
        <td>GRAND TOTAL</td>
        <td class="amt">${fmtNum(grandCash)}</td>
        <td class="amt">${fmtNum(grandDigital)}</td>
        <td class="amt">${fmtNum(grandCredit)}</td>
        <td class="amt">${fmtNum(grandExpense)}</td>
        <td class="amt">${fmtNum(grandClinical)}</td>
        <td class="amt">${fmtNum(grandNet)}</td>
        <td class="amt">${fmtNum(grandExpected)}</td>
        <td class="amt">${fmtNum(Math.abs(grandDiff))}</td>
        <td>${grandDiff === 0 ? '✓' : grandDiff < 0 ? '⚠ Short' : '↑ Excess'}</td>
      </tr>
    </tbody>
  </table></div>

  ${activeCustomers.length > 0 ? `
  <div class="section"><div class="section-title">Udhaar Khata — Outstanding Balances (${activeCustomers.length} customers)</div>
  <table>
    <thead><tr><th>Customer Name</th><th>Phone</th><th class="amt">Outstanding</th></tr></thead>
    <tbody>
      ${udhaarRows}
      <tr class="grand-row"><td colspan="2">Total Outstanding</td><td class="amt">${fmtNum(totalOutstanding)}</td></tr>
    </tbody>
  </table></div>
  ` : ''}

  <div class="footer">This is a computer-generated report from Sarita Pharmacy Daily Hisab System.<br/>Printed on ${printDate}</div>
  <script>window.onload = () => window.print();<\/script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');
    if (!popup) {
      // Fallback: download HTML file
      const a = document.createElement('a');
      a.href = url; a.download = `sarita_hisab_report_${todayKey()}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    const now = todayKey();
    dispatch({ type: 'SET_SETTINGS', lastBackup: now });
    await storage.set('settings', JSON.stringify({ autoLock, threshold, lastBackup: now }), updateSync).catch(() => {});
    toast('PDF report open ho gaya — Print/Save as PDF karein ✓');
  }, [history, day, autoLock, threshold, dispatch, storage, updateSync, toast]);

  const clearAll = useCallback(async () => {
    if (!confirm('KHATARNAK: Sabhi data permanently delete ho jaayega. Kya aap sure hain?')) return;
    if (!confirm('Dobara confirm karein — ye undo nahi hoga!')) return;
    dispatch({ type: 'SET_HISTORY', history: [] });
    dispatch({ type: 'SET_DAY', day: emptyDay() });
    await storage.set('history', '[]', updateSync).catch(() => {});
    await storage.set('day:' + todayKey(), JSON.stringify(emptyDay()), updateSync).catch(() => {});
    toast('Sabhi data clear ho gaya');
    dispatch({ type: 'GO_HOME' });
  }, [dispatch, storage, updateSync, toast]);

  const inputCls = "w-full border border-line rounded-xl px-3.5 py-2.5 font-mono text-[14px] text-center bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors";

  return (
    <div className="min-h-dvh">
      <Topbar title="Settings" />
      <div className="px-5 sm:px-8 lg:px-12 max-w-3xl mx-auto pt-4 pb-10">
        {/* PIN */}
        <div className="glass rounded-2xl p-5 mb-4 animate-card-in">
          <div className="flex items-center gap-2.5 mb-3">
            <Key size={18} className="text-accent" />
            <div className="text-[14px] font-semibold text-ink">App PIN</div>
          </div>
          {!showPinChange ? (
            <button onClick={() => setShowPinChange(true)}
              className="w-full bg-accent/10 text-accent border border-accent/15 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-accent/20 active:scale-[0.98]">
              PIN Change karein
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              <input type="password" maxLength={4} placeholder="Purana PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} className={inputCls} />
              <input type="password" maxLength={4} placeholder="Naya PIN (4 digit)" value={newPin} onChange={(e) => setNewPin(e.target.value)} className={inputCls} />
              <input type="password" maxLength={4} placeholder="Naya PIN dobara daalein" value={newPin2} onChange={(e) => setNewPin2(e.target.value)} className={inputCls} />
              <div className="flex gap-2.5">
                <button onClick={() => { setShowPinChange(false); setOldPin(''); setNewPin(''); setNewPin2(''); }}
                  className="flex-1 glass text-soft rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-white/10 active:scale-[0.98]">Cancel</button>
                <button onClick={changePin}
                  className="flex-1 bg-accent/20 text-accent border border-accent/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-accent/30 active:scale-[0.98]">Save</button>
              </div>
            </div>
          )}
        </div>

        {/* Auto-lock */}
        <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.06s]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield size={18} className="text-accent" />
              <div>
                <div className="text-[14px] font-semibold text-ink">Auto-Lock</div>
                <div className="text-[11.5px] text-softer">3 min inactivity par lock</div>
              </div>
            </div>
            <button onClick={toggleLock}
              className={`w-[46px] h-[26px] rounded-full cursor-pointer border-none transition-all duration-300 relative ${autoLock ? 'bg-accent/30' : 'bg-white/10'}`}>
              <div className={`w-[20px] h-[20px] rounded-full absolute top-[3px] transition-all duration-300 ${
                autoLock ? 'left-[23px] bg-accent shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'left-[3px] bg-softer'
              }`} />
            </button>
          </div>
        </div>

        {/* Threshold */}
        <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.1s]">
          <div className="flex items-center gap-2.5 mb-3">
            <Gauge size={18} className="text-accent" />
            <div>
              <div className="text-[14px] font-semibold text-ink">Mismatch Threshold</div>
              <div className="text-[11.5px] text-softer">Is se zyada diff par warning</div>
            </div>
          </div>
          <input type="number" min="0" value={threshold || ''} onChange={(e) => setThreshold(e.target.value)} placeholder="100" className={inputCls} />
        </div>

        {/* PDF Export */}
        <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.14s]">
          <div className="flex items-center gap-2.5 mb-3">
            <FileText size={18} className="text-accent" />
            <div>
              <div className="text-[14px] font-semibold text-ink">PDF Report / Export</div>
              <div className="text-[11.5px] text-softer">Professional styled report with tables & totals</div>
            </div>
          </div>
          <button onClick={exportPDF}
            className="w-full bg-accent/15 text-accent border border-accent/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-accent/25 active:scale-[0.98]">
            <Download size={14} className="inline mr-1.5" /> PDF Report Export karein
          </button>
        </div>

        {/* Danger */}
        <div className="glass rounded-2xl p-5 border-red/20 animate-card-in [animation-delay:0.18s]">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle size={18} className="text-red" />
            <div>
              <div className="text-[14px] font-semibold text-red">Danger Zone</div>
              <div className="text-[11.5px] text-softer">Sabhi data hamesha ke liye delete</div>
            </div>
          </div>
          <button onClick={clearAll}
            className="w-full bg-red/15 text-red border border-red/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-red/25 active:scale-[0.98]">
            <Trash2 size={14} className="inline mr-1.5" /> Sabhi Data Clear karein
          </button>
        </div>
      </div>
    </div>
  );
}
