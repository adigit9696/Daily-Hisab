import { useState, useCallback } from 'react';
import { useApp, fmt, todayKey, emptyDay } from '../context/AppContext';
import Topbar from './Topbar';
import { Key, Shield, Gauge, Download, Trash2, AlertTriangle } from 'lucide-react';

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

  const exportCSV = useCallback(async () => {
    const allDays = [...history];
    if (!day.closed && day.date) allDays.unshift(day);
    if (allDays.length === 0) { toast('Export karne ke liye koi data nahi hai'); return; }

    const header = 'Date,Cash,Digital,Credit,Expense,Clinical,Net,Expected,Diff,Status\n';
    const rows = allDays.map((h) => {
      const { cashT, digitalT, creditT, expenseT, clinicalT, netT, diffV } = computeTotals(h);
      const status = diffV === 0 ? 'Match' : diffV < 0 ? 'Short' : 'Excess';
      return `${h.date},${cashT},${digitalT},${creditT},${expenseT},${clinicalT},${netT},${h.expected || 0},${diffV},${status}`;
    });

    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `sarita_hisab_backup_${todayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const now = todayKey();
    dispatch({ type: 'SET_SETTINGS', lastBackup: now });
    await storage.set('settings', JSON.stringify({ autoLock, threshold, lastBackup: now }), updateSync).catch(() => {});
    toast('CSV download ho gaya ✓');
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

        {/* CSV */}
        <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.14s]">
          <div className="flex items-center gap-2.5 mb-3">
            <Download size={18} className="text-accent" />
            <div>
              <div className="text-[14px] font-semibold text-ink">CSV Backup / Export</div>
              <div className="text-[11.5px] text-softer">Sabhi history CSV me download</div>
            </div>
          </div>
          <button onClick={exportCSV}
            className="w-full bg-accent/15 text-accent border border-accent/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-accent/25 active:scale-[0.98]">
            CSV Export karein
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

function computeTotals(h) {
  const NOTES = [500, 200, 100, 50, 20, 10];
  const COINS = [20, 10, 5, 2, 1];
  const cashT    = NOTES.reduce((s, n) => s + n * (+h.notes?.[n] || 0), 0) + COINS.reduce((s, c) => s + c * (+h.coins?.[c] || 0), 0);
  const digitalT = (+h.paytm || 0) + (+h.pos || 0);
  const creditT  = (h.credits || []).filter((c) => !c.paid).reduce((s, c) => s + (+c.amount || 0), 0);
  const expenseT = (h.expenses || []).reduce((s, e) => s + (+e.amount || 0), 0);
  const clinicalT= (h.clinicals || []).reduce((s, c) => s + (+c.amount || 0), 0);
  const netT     = cashT + digitalT + creditT + clinicalT + expenseT;
  const diffV    = netT - (+h.expected || 0);
  return { cashT, digitalT, creditT, expenseT, clinicalT, netT, diffV };
}
