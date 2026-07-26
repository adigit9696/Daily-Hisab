import { useState, useCallback } from 'react';
import { useApp, fmt, todayKey, emptyDay, NOTES, COINS } from '../context/AppContext';
import Topbar from './Topbar';
import { Key, Shield, Gauge, Download, Trash2, AlertTriangle, FileText } from 'lucide-react';

function computeTotals(h) {
  const cashT    = NOTES.reduce((s, n) => s + n * (+h.notes?.[n] || 0), 0) + COINS.reduce((s, c) => s + c * (+h.coins?.[c] || 0), 0);
  const digitalT = (+h.paytm || 0) + (+h.pos || 0);
  const creditT  = (h.credits || []).filter((c) => !c.paid).reduce((s, c) => s + (+c.amount || 0), 0);
  const expenseT = (h.expenses || []).reduce((s, e) => s + (+e.amount || 0), 0);
  const clinicalT= (h.clinicals || []).reduce((s, c) => s + (+c.amount || 0), 0);
  const netT     = cashT + digitalT + creditT + clinicalT + expenseT;
  const diffV    = netT - (+h.expected || 0);
  return { cashT, digitalT, creditT, expenseT, clinicalT, netT, diffV };
}

function fmtNum(n) { return '₹' + Math.round((n || 0) * 100 / 100).toLocaleString('en-IN'); }

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

      tableRows += `<tr style="background:#1a3a3c;"><td colspan="10" style="padding:10px 12px;font-weight:700;color:#34d399;font-size:14px;border:1px solid #2a5a5c;">📅 ${monthName}</td></tr>`;

      let mCash = 0, mDigital = 0, mCredit = 0, mExpense = 0, mClinical = 0, mNet = 0, mExpected = 0;

      days.forEach((h, i) => {
        const t = computeTotals(h);
        const status = t.diffV === 0 ? '✓ Match' : t.diffV < 0 ? '⚠ Short' : '↑ Excess';
        const statusColor = t.diffV === 0 ? '#34d399' : t.diffV < 0 ? '#ef4444' : '#f59e0b';
        const bg = i % 2 === 0 ? '#0f2a2c' : '#0b1d1e';

        const dateStr = new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });

        tableRows += `<tr style="background:${bg};">
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#8fa3a0;font-size:12px;">${dateStr}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#f59e0b;font-family:monospace;text-align:right;">${fmtNum(t.cashT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#5eead4;font-family:monospace;text-align:right;">${fmtNum(t.digitalT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#c084fc;font-family:monospace;text-align:right;">${fmtNum(t.creditT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#fb923c;font-family:monospace;text-align:right;">${fmtNum(t.expenseT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#60a5fa;font-family:monospace;text-align:right;">${fmtNum(t.clinicalT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#34d399;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(t.netT)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:#8fa3a0;font-family:monospace;text-align:right;">${fmtNum(+h.expected || 0)}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:${statusColor};font-family:monospace;text-align:right;font-weight:600;">${fmtNum(Math.abs(t.diffV))}</td>
          <td style="padding:8px 10px;border:1px solid #1a3a3c;color:${statusColor};font-size:11px;font-weight:600;">${status}</td>
        </tr>`;

        mCash += t.cashT; mDigital += t.digitalT; mCredit += t.creditT;
        mExpense += t.expenseT; mClinical += t.clinicalT; mNet += t.netT; mExpected += (+h.expected || 0);
      });

      // Month subtotal
      const mDiff = mNet - mExpected;
      tableRows += `<tr style="background:#1a3a3c;border-top:2px solid #34d399;">
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#34d399;font-weight:700;font-size:12px;">Subtotal (${days.length} days)</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#f59e0b;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mCash)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#5eead4;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mDigital)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#c084fc;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mCredit)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#fb923c;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mExpense)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#60a5fa;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mClinical)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#34d399;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mNet)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:#8fa3a0;font-family:monospace;text-align:right;font-weight:700;">${fmtNum(mExpected)}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;color:${mDiff === 0 ? '#34d399' : mDiff < 0 ? '#ef4444' : '#f59e0b'};font-family:monospace;text-align:right;font-weight:700;">${fmtNum(Math.abs(mDiff))}</td>
        <td style="padding:8px 10px;border:1px solid #2a5a5c;"></td>
      </tr>`;

      grandCash += mCash; grandDigital += mDigital; grandCredit += mCredit;
      grandExpense += mExpense; grandClinical += mClinical; grandNet += mNet; grandExpected += mExpected;
    });

    const grandDiff = grandNet - grandExpected;
    const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Sarita Pharmacy — Daily Hisab Report</title>
<style>
  @media print {
    @page { size: A4 landscape; margin: 12mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #0b1d1e; color: #e8edec; margin: 0; padding: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f3d3e; color: #34d399; padding: 10px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #2a5a5c; }
  th:not(:first-child) { text-align: right; }
</style>
</head><body>
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:26px;font-weight:800;color:#34d399;letter-spacing:-0.5px;">✚ Sarita Pharmacy</div>
    <div style="font-size:13px;color:#8fa3a0;margin-top:4px;">Daily Hisab — Financial Report</div>
    <div style="font-size:11px;color:#5b7573;margin-top:2px;">Generated: ${printDate} | ${allDays.length} entries</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:100px;">Date</th>
        <th>Cash</th><th>Digital</th><th>Credit</th><th>Expense</th><th>Clinical</th>
        <th>Net</th><th>Expected</th><th>Diff</th><th style="width:70px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr style="background:#0f3d3e;border-top:3px solid #34d399;">
        <td style="padding:12px 10px;border:2px solid #34d399;color:#34d399;font-weight:800;font-size:13px;">GRAND TOTAL</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#f59e0b;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandCash)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#5eead4;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandDigital)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#c084fc;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandCredit)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#fb923c;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandExpense)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#60a5fa;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandClinical)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#34d399;font-family:monospace;text-align:right;font-weight:800;font-size:14px;">${fmtNum(grandNet)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:#8fa3a0;font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(grandExpected)}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:${grandDiff === 0 ? '#34d399' : grandDiff < 0 ? '#ef4444' : '#f59e0b'};font-family:monospace;text-align:right;font-weight:800;font-size:13px;">${fmtNum(Math.abs(grandDiff))}</td>
        <td style="padding:12px 10px;border:2px solid #34d399;color:${grandDiff === 0 ? '#34d399' : grandDiff < 0 ? '#ef4444' : '#f59e0b'};font-weight:800;">${grandDiff === 0 ? '✓' : grandDiff < 0 ? '⚠ Short' : '↑ Excess'}</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:center;margin-top:24px;color:#5b7573;font-size:10px;">This report was generated by Sarita Pharmacy Daily Hisab App</div>
  <script>window.onload = () => window.print();</script>
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
