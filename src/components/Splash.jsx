import { useEffect, useState, useCallback } from 'react';
import { useApp, todayKey, emptyDay } from '../context/AppContext';
import { ensureAuth } from '../services/firebase';
import { flushPending } from '../services/storage';

export default function Splash() {
  const { state, dispatch, storage, updateSync, toast } = useApp();
  const [loading, setLoading]    = useState(true);
  const [errMsg, setErrMsg]      = useState('');
  const [showErr, setShowErr]    = useState(false);

  const attempt = useCallback(async () => {
    setLoading(true);
    setShowErr(false);
    let authFailed = false;

    try {
      await ensureAuth(9000);
    } catch (e) {
      authFailed = true;
      setErrMsg(
        navigator.onLine
          ? 'Firebase se connect nahi ho paya. App offline mode me chal rahi hai — data device par surakshit hai.'
          : 'Internet connection nahi hai. Offline mode me chal rahi hai.'
      );
      setLoading(false);
      setShowErr(true);
    }

    dispatch({ type: 'SET_AUTH_FAILED', failed: authFailed });

    let pin = '1234', autoLock = true, threshold = 100, lastBackup = null;
    let history = [];
    try { const r = await storage.get('pin'); if (r?.value) pin = r.value; } catch {}
    try {
      const r = await storage.get('settings');
      if (r?.value) { const s = JSON.parse(r.value); autoLock = s.autoLock !== false; threshold = s.threshold || 100; lastBackup = s.lastBackup || null; }
    } catch {}
    try { const r = await storage.get('history'); if (r?.value) history = JSON.parse(r.value); } catch {}

    // Merge remote customers with local (localStorage already loaded in initialState)
    let customers = [];
    try {
      const localCustomers = JSON.parse(localStorage.getItem('sarita_customers') || '[]');
      let remoteCustomers = [];
      try { const r = await storage.get('customers'); if (r?.value) remoteCustomers = JSON.parse(r.value); } catch {}

      // Merge: local takes priority (has newest data), remote fills gaps
      const localIds = new Set(localCustomers.map((c) => c.id));
      customers = [
        ...localCustomers,
        ...remoteCustomers.filter((c) => !localIds.has(c.id)),
      ];

      // Persist merged result back to localStorage
      try { localStorage.setItem('sarita_customers', JSON.stringify(customers)); } catch {}
    } catch {
      customers = JSON.parse(localStorage.getItem('sarita_customers') || '[]');
    }

    let day;
    try {
      const r = await storage.get('day:' + todayKey());
      day = r?.value ? Object.assign(emptyDay(), JSON.parse(r.value)) : emptyDay();
    } catch { day = emptyDay(); }

    dispatch({
      type: 'LOAD_ALL',
      payload: { pin, autoLock, threshold, lastBackup, history, day, viewDate: todayKey(), customers },
    });

    updateSync();
    if (authFailed) flushPending(updateSync, toast);

    setTimeout(() => {
      dispatch({ type: 'SET_PAGE', page: 'lock' });
      if (authFailed) toast('Offline mode — connect hote hi sync hoga');
    }, authFailed ? 1400 : 1200);
  }, [dispatch, storage, updateSync, toast]);

  useEffect(() => { attempt(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-dvh relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-clinical/5 blur-[100px] pointer-events-none" />

      {/* Pharmacy cross */}
      <div className="w-[100px] h-[100px] animate-fade-in">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle className="fill-none stroke-accent/20 stroke-[1.5] origin-center animate-ring-pulse" cx="50" cy="50" r="30" />
          <circle className="fill-none stroke-accent/15 stroke-[1.5] origin-center animate-ring-pulse [animation-delay:1.1s]" cx="50" cy="50" r="30" />
          <path className="fill-accent origin-center animate-cross-breathe" d="M42 18H58V42H82V58H58V82H42V58H18V42H42Z" />
        </svg>
      </div>

      {/* ECG heartbeat line */}
      <div className="w-[220px] h-[36px] overflow-visible animate-fade-in [animation-delay:0.3s]">
        <svg viewBox="0 0 200 36" className="w-full h-full overflow-visible">
          <path
            d="M0 18H60L72 4 86 32 98 18H106L114 8 122 18H200"
            className="fill-none stroke-accent/40 stroke-2 [stroke-linecap:round] [stroke-dasharray:340] animate-ecg-draw"
          />
        </svg>
      </div>

      <div className="text-center animate-slide-up [animation-delay:0.2s]">
        <div className="text-ink text-[30px] font-bold font-serif tracking-tight">Sarita Pharmacy</div>
        <div className="text-accent/60 text-[11.5px] tracking-[0.2em] uppercase mt-1">Daily Hisab</div>
      </div>

      {/* Status area */}
      <div className="flex flex-col items-center gap-3 min-h-[40px] mt-2 animate-fade-in [animation-delay:0.5s]">
        {loading && (
          <div className="w-6 h-6 rounded-full border-[2.5px] border-accent/20 border-t-accent animate-spin" />
        )}
        {showErr && (
          <div className="flex flex-col items-center gap-3 px-8 text-center max-w-sm">
            <p className="text-soft text-[12.5px] leading-relaxed">{errMsg}</p>
            <button
              type="button"
              onClick={attempt}
              className="glass rounded-full px-6 py-2.5 text-[12.5px] font-semibold text-accent cursor-pointer transition-gpu hover:bg-white/10 active:scale-95"
            >
              Dobara try karein
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
