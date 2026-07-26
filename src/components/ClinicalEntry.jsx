import { useState } from 'react';
import { useApp, fmt, clinicalT, todayKey } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Plus, Trash2 } from 'lucide-react';

const TYPES = ['BP Check', 'Injection', 'Dressing', 'ECG', 'Nebulization', 'Glucometer', 'Other'];

export default function ClinicalEntry() {
  const { state, dispatch, saveDay, toast } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const [selType, setSelType] = useState(TYPES[0]);
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');

  const addClinical = () => {
    if (!(+amount > 0)) { toast('Amount daalein'); return; }
    const item = { id: Date.now(), type: selType, amount: parseFloat(amount), note: note.trim() };
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: [...(day.clinicals || []), item] } });
    saveDay();
    setAmount(''); setNote('');
    toast(`${selType} entry add ho gayi`);
  };

  const remove = (id) => {
    dispatch({ type: 'UPDATE_DAY', updates: { clinicals: (day.clinicals || []).filter((c) => c.id !== id) } });
    saveDay();
  };

  return (
    <div className="min-h-dvh">
      <Topbar title="Clinical Services" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">
        {!readonly && (
          <div className="glass rounded-2xl p-5 mb-4 flex flex-col gap-3 animate-card-in">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button key={t} onClick={() => setSelType(t)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold cursor-pointer transition-gpu ${
                    selType === t ? 'bg-clinical/25 text-clinical border border-clinical/30' : 'glass text-soft hover:text-ink'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <input type="number" placeholder="Amount" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="flex-1 border border-line rounded-xl px-3.5 py-2.5 font-mono text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
              <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
                className="flex-1 border border-line rounded-xl px-3.5 py-2.5 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors" />
            </div>
            <button onClick={addClinical}
              className="bg-clinical/20 text-clinical border border-clinical/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-clinical/30 active:scale-[0.98]">
              <Plus size={16} /> Clinical Entry Add karein
            </button>
          </div>
        )}

        {(day.clinicals || []).length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.06s]">
            <div className="text-[12px] font-semibold text-clinical uppercase tracking-wider mb-3">Items ({day.clinicals.length})</div>
            {day.clinicals.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink">{c.type}</div>
                  {c.note && <div className="text-[11px] text-softer truncate">{c.note}</div>}
                </div>
                <div className="font-mono text-[13px] font-medium text-clinical whitespace-nowrap">{fmt(c.amount)}</div>
                {!readonly && (
                  <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-xl bg-red-light flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-red/25 active:scale-90">
                    <Trash2 size={14} className="text-red" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center glow-accent animate-slide-up [animation-delay:0.1s]">
          <span className="text-[15px] font-semibold text-ink">Total Clinical</span>
          <span className="text-[22px] font-bold font-mono text-clinical">{fmt(clinicalT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="clinical" />
    </div>
  );
}
