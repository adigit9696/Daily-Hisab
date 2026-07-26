import { useApp } from '../context/AppContext';

export default function Toast() {
  const { state } = useApp();
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] pointer-events-none transition-all duration-300 ${
        state.toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="glass-strong rounded-full px-6 py-3 text-[13px] font-medium text-accent whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {state.toastMsg}
      </div>
    </div>
  );
}
