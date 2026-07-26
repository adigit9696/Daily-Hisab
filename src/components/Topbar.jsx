import { useApp, dateLbl } from '../context/AppContext';
import { ChevronLeft, Home } from 'lucide-react';

export default function Topbar({ title, dateStr }) {
  const { dispatch } = useApp();

  return (
    <div className="glass sticky top-0 z-30 px-5 py-4 flex items-center gap-3.5 border-b border-line">
      <button
        onClick={() => dispatch({ type: 'GO_BACK' })}
        className="w-9 h-9 rounded-xl bg-white/5 border border-line flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 hover:border-accent/30 active:scale-90"
      >
        <ChevronLeft size={18} className="text-soft" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[20px] sm:text-[22px] font-extrabold text-ink font-serif tracking-tight">{title}</div>
        {dateStr && <div className="text-[11px] text-softer mt-0.5">{dateLbl(dateStr)}</div>}
      </div>
      <button
        onClick={() => dispatch({ type: 'GO_HOME' })}
        className="w-9 h-9 rounded-xl bg-white/5 border border-line flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 hover:border-accent/30 active:scale-90"
      >
        <Home size={18} className="text-soft" />
      </button>
    </div>
  );
}
