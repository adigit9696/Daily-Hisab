import { useState, useMemo } from 'react';
import { useApp, fmt, dayTotals, dateLbl, NOTES, COINS } from '../context/AppContext';
import Topbar from './Topbar';
import { X, ChevronDown, ChevronUp, Search, Banknote, CreditCard, Users, DollarSign, Activity, Target } from 'lucide-react';

export default function HistoryScreen() {
  const { state } = useApp();
  const { history } = state;
  const [search, setSearch]  = useState('');
  const [detail, setDetail]  = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let arr = [...history];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((h) => {
        if (h.date?.includes(q)) return true;
        if (dateLbl(h.date).toLowerCase().includes(q)) return true;
        if ((h.credits || []).some((c) => c.name?.toLowerCase().includes(q))) return true;
        if ((h.expenses || []).some((e) => e.desc?.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    if (sortAsc) arr.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    else         arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return arr;
  }, [history, search, sortAsc]);

  /* ─── Detailed Sheet Modal ─── */
  const DetailSheet = ({ entry }) => {
    const t = dayTotals(entry);
    const cashTotal = t.cash;

    // Build denomination breakdown
    const noteRows = NOTES.map((n) => ({ denom: n, count: +entry.notes?.[n] || 0, total: n * (+entry.notes?.[n] || 0) })).filter((r) => r.count > 0);
    const coinRows = COINS.map((c) => ({ denom: c, count: +entry.coins?.[c] || 0, total: c * (+entry.coins?.[c] || 0) })).filter((r) => r.count > 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
        <div onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-[600px] rounded-2xl animate-sheet-up max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 glass-strong rounded-t-2xl px-5 py-4 flex justify-between items-center border-b border-line">
            <div>
              <div className="text-[18px] font-extrabold text-ink font-serif">{dateLbl(entry.date)}</div>
              <div className="text-[11px] text-softer">Closed: {entry.closedAt ? new Date(entry.closedAt).toLocaleString('en-IN') : '—'}</div>
            </div>
            <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-xl glass flex items-center justify-center cursor-pointer border-none transition-gpu hover:bg-white/10 active:scale-90">
              <X size={16} className="text-soft" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* ─── Summary Row ─── */}
            <div className={`rounded-2xl px-4 py-4 flex items-center justify-between ${
              t.diff === 0 ? 'bg-accent/10 border border-accent/15' : t.diff < 0 ? 'bg-red/10 border border-red/15' : 'bg-amber/10 border border-amber/15'
            }`}>
              <div>
                <div className="text-[11px] text-softer uppercase tracking-wider">Net Collection</div>
                <div className="text-[24px] font-bold font-mono text-accent mt-0.5">{fmt(t.net)}</div>
              </div>
              <div className="text-right">
                <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${t.diff === 0 ? 'text-accent' : t.diff < 0 ? 'text-red' : 'text-amber'}`}>
                  {t.diff === 0 ? 'Match ✓' : t.diff < 0 ? 'Short ↓' : 'Excess ↑'}
                </div>
                <div className={`text-[20px] font-bold font-mono ${t.diff === 0 ? 'text-accent' : t.diff < 0 ? 'text-red' : 'text-amber'}`}>
                  {fmt(Math.abs(t.diff))}
                </div>
              </div>
            </div>

            {/* ─── Cash Denomination Breakdown ─── */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Banknote size={16} className="text-amber" />
                <span className="text-[12px] font-bold text-amber uppercase tracking-wider">Cash Denomination</span>
                <span className="ml-auto font-mono text-[14px] font-bold text-amber">{fmt(cashTotal)}</span>
              </div>

              {noteRows.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] text-softer uppercase tracking-wider mb-1.5">Notes</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {noteRows.map((r) => (
                      <div key={r.denom} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-bold text-amber">₹{r.denom}</span>
                          <span className="text-[10px] text-softer">×</span>
                          <span className="text-[13px] font-mono font-semibold text-ink">{r.count}</span>
                        </div>
                        <span className="text-[12px] font-mono text-soft">{fmt(r.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {coinRows.length > 0 && (
                <div>
                  <div className="text-[10px] text-softer uppercase tracking-wider mb-1.5">Coins</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {coinRows.map((r) => (
                      <div key={r.denom} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-bold text-amber">₹{r.denom}</span>
                          <span className="text-[10px] text-softer">×</span>
                          <span className="text-[13px] font-mono font-semibold text-ink">{r.count}</span>
                        </div>
                        <span className="text-[12px] font-mono text-soft">{fmt(r.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {noteRows.length === 0 && coinRows.length === 0 && (
                <div className="text-[12px] text-softer italic">No cash counted</div>
              )}
            </div>

            {/* ─── Other Categories ─── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3.5 flex items-center gap-2.5">
                <CreditCard size={15} className="text-neon shrink-0" />
                <div>
                  <div className="text-[10px] text-softer">Digital</div>
                  <div className="font-mono text-[14px] font-bold text-neon">{fmt(t.digital)}</div>
                </div>
              </div>
              <div className="glass rounded-xl p-3.5 flex items-center gap-2.5">
                <Target size={15} className="text-accent shrink-0" />
                <div>
                  <div className="text-[10px] text-softer">Expected</div>
                  <div className="font-mono text-[14px] font-bold text-accent">{fmt(+entry.expected || 0)}</div>
                </div>
              </div>
            </div>

            {/* ─── Credit Entries ─── */}
            {(entry.credits || []).length > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-credit" />
                  <span className="text-[12px] font-bold text-credit uppercase tracking-wider">Credit Sales ({entry.credits.length})</span>
                  <span className="ml-auto font-mono text-[13px] font-bold text-credit">{fmt(t.credit)}</span>
                </div>
                {entry.credits.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.paid ? 'bg-accent' : 'bg-red'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink truncate">{c.name}</div>
                      {c.note && <div className="text-[10px] text-softer truncate">{c.note}</div>}
                    </div>
                    <span className={`font-mono text-[12.5px] font-medium ${c.paid ? 'text-accent line-through' : 'text-credit'}`}>{fmt(c.amount)}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${c.paid ? 'bg-accent/15 text-accent' : 'bg-red/15 text-red'}`}>
                      {c.paid ? 'Paid' : 'Due'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Expenses ─── */}
            {(entry.expenses || []).length > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={16} className="text-expense" />
                  <span className="text-[12px] font-bold text-expense uppercase tracking-wider">Expenses ({entry.expenses.length})</span>
                  <span className="ml-auto font-mono text-[13px] font-bold text-expense">{fmt(t.expense)}</span>
                </div>
                {entry.expenses.map((e) => (
                  <div key={e.id} className="flex justify-between py-2 border-b border-line last:border-0">
                    <span className="text-[13px] text-ink truncate flex-1">{e.desc}</span>
                    <span className="font-mono text-[12.5px] font-medium text-expense ml-3">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Clinical Services ─── */}
            {(entry.clinicals || []).length > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-clinical" />
                  <span className="text-[12px] font-bold text-clinical uppercase tracking-wider">Clinical ({entry.clinicals.length})</span>
                  <span className="ml-auto font-mono text-[13px] font-bold text-clinical">{fmt(t.clinical)}</span>
                </div>
                {entry.clinicals.map((c) => (
                  <div key={c.id} className="flex justify-between py-2 border-b border-line last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-ink">{c.type}</span>
                      {c.note && <span className="text-[10px] text-softer ml-2">— {c.note}</span>}
                    </div>
                    <span className="font-mono text-[12.5px] font-medium text-clinical ml-3">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Paytm / POS Breakdown ─── */}
            {(+entry.paytm > 0 || +entry.pos > 0) && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={16} className="text-neon" />
                  <span className="text-[12px] font-bold text-neon uppercase tracking-wider">Digital Breakdown</span>
                </div>
                {+entry.paytm > 0 && (
                  <div className="flex justify-between py-1.5 text-[13px]">
                    <span className="text-soft">Paytm / UPI</span>
                    <span className="font-mono text-neon font-medium">{fmt(+entry.paytm)}</span>
                  </div>
                )}
                {+entry.pos > 0 && (
                  <div className="flex justify-between py-1.5 text-[13px]">
                    <span className="text-soft">Card / POS</span>
                    <span className="font-mono text-neon font-medium">{fmt(+entry.pos)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh">
      <Topbar title="Hisab History" />
      <div className="px-5 sm:px-8 lg:px-12 max-w-5xl mx-auto pt-4 pb-10">
        <div className="flex items-center gap-2.5 mb-4 animate-fade-in">
          <div className="flex-1 flex items-center gap-2.5 glass rounded-xl px-4 py-2.5">
            <Search size={15} className="text-softer shrink-0" />
            <input type="text" placeholder="Search date, party, expense…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent outline-none text-[13px] flex-1 min-w-0 text-ink placeholder:text-softer" />
          </div>
          <button onClick={() => setSortAsc(!sortAsc)} className="w-10 h-10 rounded-xl glass flex items-center justify-center cursor-pointer transition-gpu hover:bg-white/10 active:scale-90">
            {sortAsc ? <ChevronUp size={16} className="text-soft" /> : <ChevronDown size={16} className="text-soft" />}
          </button>
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-softer text-[13px] py-16">
            {history.length === 0 ? 'Koi history nahi hai — pehle aaj ka hisab close karein' : 'Koi result nahi mila'}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((h, idx) => {
            const t = dayTotals(h);
            return (
              <button key={h.date} onClick={() => setDetail(h)}
                className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-gpu hover-lift text-left w-full animate-card-in"
                style={{ animationDelay: `${Math.min(idx, 10) * 0.04}s` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink">{dateLbl(h.date)}</div>
                  <div className="text-[11px] text-softer mt-1">
                    Cash {fmt(t.cash)} · Digital {fmt(t.digital)} · Credit {fmt(t.credit)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[15px] font-bold text-accent">{fmt(t.net)}</div>
                  <div className={`text-[10.5px] font-semibold mt-0.5 ${t.diff === 0 ? 'text-accent' : t.diff < 0 ? 'text-red' : 'text-amber'}`}>
                    {t.diff === 0 ? 'Match ✓' : (t.diff < 0 ? 'Short ' : 'Excess ') + fmt(Math.abs(t.diff))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {detail && <DetailSheet entry={detail} />}
    </div>
  );
}
