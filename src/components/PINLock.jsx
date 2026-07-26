import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PINLock() {
  const { state, dispatch, toast, resetLock } = useApp();
  const [buf, setBuf]     = useState('');
  const [err, setErr]     = useState(false);
  const [shake, setShake] = useState(false);

  const checkPin = useCallback((pin) => {
    if (pin === state.pin) {
      setErr(false);
      setBuf('');
      if (state.pinTarget === 'settings') {
        dispatch({ type: 'SET_PIN_TARGET', target: null });
        dispatch({ type: 'SET_PAGE', page: 'settings' });
      } else {
        dispatch({ type: 'GO_HOME' });
      }
      resetLock();
    } else {
      setShake(true);
      setErr(true);
      setTimeout(() => { setShake(false); setBuf(''); }, 420);
    }
  }, [state.pin, state.pinTarget, dispatch, resetLock]);

  const keyPress = useCallback((k) => {
    if (k === '⌫') { setBuf((b) => b.slice(0, -1)); return; }
    if (k === '' || buf.length >= 4) return;
    const next = buf + k;
    setBuf(next);
    if (next.length === 4) setTimeout(() => checkPin(next), 150);
  }, [buf, checkPin]);

  useEffect(() => {
    const handler = (e) => {
      if (state.page !== 'lock') return;
      if (e.key >= '0' && e.key <= '9') keyPress(e.key);
      else if (e.key === 'Backspace') keyPress('⌫');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.page, keyPress]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-dvh relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[360px] flex flex-col items-center animate-fade-in relative z-10">
        {/* Lock badge */}
        <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center mb-5 glow-accent">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
            <path d="M6 10V8a6 6 0 1112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" stroke="#34D399" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="text-[22px] font-bold text-ink font-serif">Enter PIN</div>
        <div className="text-[13px] text-softer mt-1 mb-7 text-center">Sarita Pharmacy Daily Hisab</div>

        {/* Dots */}
        <div className={`flex gap-4 mb-7 ${shake ? 'animate-shake' : ''}`}>
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-[1.5px] transition-all duration-200 ${
                i < buf.length
                  ? 'bg-accent border-accent scale-110 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                  : 'bg-transparent border-softer'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5">
          {KEYS.map((k, i) => (
            <button
              key={i}
              type="button"
              disabled={k === ''}
              onClick={() => keyPress(k)}
              className={`w-[68px] h-[68px] rounded-2xl flex items-center justify-center font-mono text-[21px] font-medium cursor-pointer transition-gpu ${
                k === ''
                  ? 'bg-transparent shadow-none'
                  : 'glass text-ink hover:bg-white/10 hover:border-accent/20 active:scale-90'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Error */}
        <div className={`text-red text-[13px] h-5 mt-4 transition-opacity duration-200 ${err ? 'opacity-100' : 'opacity-0'}`}>
          Galat PIN, dobara try karein
        </div>
      </div>
    </div>
  );
}
