import { useApp } from '../context/AppContext';
import { LogOut } from 'lucide-react';

export default function ExitModal() {
  const { state, dispatch } = useApp();

  if (!state.showExitModal) return null;

  const handleConfirmExit = () => {
    dispatch({ type: 'HIDE_EXIT_MODAL' });
    try {
      window.history.go(-2);
    } catch {
      window.close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fade-in"
      onClick={() => dispatch({ type: 'HIDE_EXIT_MODAL' })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-solid max-w-[380px] w-[90%] rounded-2xl p-6 animate-sheet-up text-center shadow-2xl"
      >
        <div className="w-14 h-14 rounded-full bg-red/15 flex items-center justify-center mx-auto mb-4">
          <LogOut size={26} className="text-red" />
        </div>
        <div className="text-[18px] font-bold text-ink font-serif mb-2">Exit Daily Hisab?</div>
        <div className="text-[13px] text-softer mb-6 leading-relaxed">
          Kya aap Daily Hisab app se bahar jaana chahte hain?
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'HIDE_EXIT_MODAL' })}
            className="flex-1 glass text-soft rounded-xl py-3 text-[13px] font-semibold cursor-pointer transition-gpu hover:bg-white/10 active:scale-[0.98]"
          >
            Home pe rahein
          </button>
          <button
            onClick={handleConfirmExit}
            className="flex-1 bg-red/20 text-red border border-red/20 rounded-xl py-3 text-[13px] font-bold cursor-pointer transition-gpu hover:bg-red/30 active:scale-[0.98]"
          >
            YES — Exit
          </button>
        </div>
      </div>
    </div>
  );
}
