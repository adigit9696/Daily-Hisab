import { useState } from 'react';
import { useApp, fmt, expenseT, todayKey } from '../context/AppContext';
import Topbar from './Topbar';
import NavFooter from './NavFooter';
import { Plus, Trash2 } from 'lucide-react';

export default function ExpenseEntry() {
  const { state, dispatch, saveDay, toast } = useApp();
  const { day, viewDate, editingReopened } = state;
  const readonly = viewDate !== todayKey() && viewDate !== editingReopened;

  const [desc, setDesc]     = useState('');
  const [amount, setAmount] = useState('');

  const addExpense = () => {
    if (!desc.trim()) { toast('Description daalein'); return; }
    if (!(+amount > 0)) { toast('Amount daalein'); return; }
    const item = { id: Date.now(), desc: desc.trim(), amount: parseFloat(amount) };
    dispatch({ type: 'UPDATE_DAY', updates: { expenses: [...(day.expenses || []), item] } });
    saveDay();
    setDesc(''); setAmount('');
    toast('Expense add ho gaya');
  };

  const remove = (id) => {
    dispatch({ type: 'UPDATE_DAY', updates: { expenses: (day.expenses || []).filter((e) => e.id !== id) } });
    saveDay();
  };

  const inputCls = "w-full border border-line rounded-xl px-3.5 py-2.5 text-[14px] bg-bg-input outline-none focus:border-accent/40 text-ink transition-colors";

  return (
    <div className="min-h-dvh">
      <Topbar title="Daily Expenses" dateStr={viewDate} />
      <div className="px-5 sm:px-8 lg:px-12 max-w-4xl mx-auto pt-4 pb-10">
        {!readonly && (
          <div className="glass rounded-2xl p-5 mb-4 flex flex-col gap-3 animate-card-in">
            <input type="text" placeholder="Kharche ki detail" value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} />
            <input type="number" placeholder="Amount" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls + ' font-mono'} />
            <button onClick={addExpense}
              className="bg-expense/20 text-expense border border-expense/20 rounded-xl py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-gpu hover:bg-expense/30 active:scale-[0.98]">
              <Plus size={16} /> Expense Add karein
            </button>
          </div>
        )}

        {(day.expenses || []).length > 0 && (
          <div className="glass rounded-2xl p-5 mb-4 animate-card-in [animation-delay:0.06s]">
            <div className="text-[12px] font-semibold text-expense uppercase tracking-wider mb-3">Items ({day.expenses.length})</div>
            {day.expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <div className="flex-1 min-w-0 text-[13.5px] text-ink truncate">{e.desc}</div>
                <div className="font-mono text-[13px] font-medium text-expense whitespace-nowrap">{fmt(e.amount)}</div>
                {!readonly && (
                  <button onClick={() => remove(e.id)} className="w-8 h-8 rounded-xl bg-red-light flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-red/25 active:scale-90">
                    <Trash2 size={14} className="text-red" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="glass-strong rounded-2xl px-5 py-4 flex justify-between items-center glow-accent animate-slide-up [animation-delay:0.1s]">
          <span className="text-[15px] font-semibold text-ink">Total Expenses</span>
          <span className="text-[22px] font-bold font-mono text-expense">{fmt(expenseT(day))}</span>
        </div>
      </div>
      <NavFooter currentPage="expense" />
    </div>
  );
}
