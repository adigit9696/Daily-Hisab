import { useApp, ENTRY_FLOW } from '../context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LABELS = {
  cash: 'Cash', digital: 'Paytm/POS', credit: 'Credit Sales',
  expense: 'Expenses', clinical: 'Clinical', target: 'Expected Sale', summary: 'Final Hisab',
};

export default function NavFooter({ currentPage }) {
  const { dispatch } = useApp();
  const idx = ENTRY_FLOW.indexOf(currentPage);
  if (idx === -1) return null;

  const prev = idx > 0 ? ENTRY_FLOW[idx - 1] : null;
  const next = idx < ENTRY_FLOW.length - 1 ? ENTRY_FLOW[idx + 1] : null;

  const go = (page) => {
    dispatch({ type: 'PUSH_PAGE', page });
  };

  return (
    <div className="sticky bottom-0 z-20 glass border-t border-line px-5 sm:px-8 lg:px-12 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {prev ? (
          <button onClick={() => go(prev)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-line text-soft text-[12.5px] font-semibold cursor-pointer transition-gpu hover:bg-white/10 hover:border-accent/20 active:scale-95">
            <ChevronLeft size={15} /> {LABELS[prev] || prev}
          </button>
        ) : <div />}
        {next ? (
          <button onClick={() => go(next)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent/15 border border-accent/25 text-accent text-[12.5px] font-bold cursor-pointer transition-gpu hover:bg-accent/25 active:scale-95">
            {LABELS[next] || next} <ChevronRight size={15} />
          </button>
        ) : <div />}
      </div>
    </div>
  );
}
