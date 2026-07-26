import { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import storage, { getSyncState, flushPending, listenToDay, listenToCustomers } from '../services/storage';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
export const NOTES  = [500, 200, 100, 50, 20, 10];
export const COINS  = [20, 10, 5, 2, 1];
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** Sequential entry flow for Next/Prev navigation */
export const ENTRY_FLOW = ['cash', 'digital', 'credit', 'expense', 'clinical', 'target', 'summary'];

/** Clinical fixed rates */
export const CLINICAL_RATES = {
  'BP Checkup':    10,
  'Dressing':      50,
  'ECG':          300,
  'Nebulization':  40,
  'RBS Test':      40,
  'Other':          0,
};
export const CLINICAL_TYPES = Object.keys(CLINICAL_RATES);

export const todayKey = () => new Date().toISOString().slice(0, 10);

/* ── Strict financial rounding (eliminates JS floating-point errors) ── */
const r2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

export const fmt = (n) => '₹' + r2(n).toLocaleString('en-IN');

export const dateLbl = (s) => {
  const d = new Date((s || todayKey()) + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const shortDate = (s) => {
  const d = new Date((s || todayKey()) + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const emptyDay = (date) => ({
  date: date || todayKey(),
  notes:  Object.fromEntries(NOTES.map((n) => [n, 0])),
  coins:  Object.fromEntries(COINS.map((c) => [c, 0])),
  paytm: 0, pos: 0,
  credits: [], expenses: [], clinicals: [],
  expected: 0, closed: false,
});

/* ------------------------------------------------------------------ */
/*  Totals — strict r2() rounding on every calculation                 */
/* ------------------------------------------------------------------ */
export const cashT       = (d) => r2(NOTES.reduce((s, n) => s + n * (+d.notes?.[n] || 0), 0) + COINS.reduce((s, c) => s + c * (+d.coins?.[c] || 0), 0));
export const digitalT    = (d) => r2((+d.paytm || 0) + (+d.pos || 0));
export const creditT     = (d) => r2((d.credits || []).filter((c) => !c.paid).reduce((s, c) => s + (+c.amount || 0), 0));
export const expenseT    = (d) => r2((d.expenses || []).reduce((s, e) => s + (+e.amount || 0), 0));
export const clinicalT   = (d) => r2((d.clinicals || []).reduce((s, c) => s + (+c.amount || 0), 0));
export const collectionT = (d) => r2(cashT(d) + digitalT(d) + creditT(d) + clinicalT(d));
export const netT        = (d) => r2(collectionT(d) + expenseT(d));
export const diffV       = (d) => r2(netT(d) - (+d.expected || 0));

export function dayTotals(h) {
  const cash    = cashT(h);
  const credit  = creditT(h);
  const expense = expenseT(h);
  const clinical= clinicalT(h);
  const digital = digitalT(h);
  const net     = r2(cash + digital + credit + clinical + expense);
  return { cash, credit, expense, clinical, digital, net, diff: r2(net - (+h.expected || 0)) };
}

/* ------------------------------------------------------------------ */
/*  Instant localStorage hydration for customers (zero data loss)      */
/* ------------------------------------------------------------------ */
function loadCustomersSync() {
  try {
    const raw = localStorage.getItem('sarita_customers');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */
const initialState = {
  page: 'splash',
  stack: ['home'],
  pin: '1234',
  autoLock: true,
  threshold: 100,
  lastBackup: null,
  history: [],
  day: emptyDay(),
  viewDate: todayKey(),
  editingReopened: null,
  pinTarget: null,
  syncState: getSyncState(),
  toastMsg: '',
  toastVisible: false,
  monthCursor: new Date(),
  reportMode: 'monthly',
  authFailed: false,
  customers: loadCustomersSync(),
  selectedCustomerId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'PUSH_PAGE':
      return { ...state, page: action.page, stack: [...state.stack, action.page] };
    case 'GO_BACK': {
      const newStack = state.stack.length > 1 ? state.stack.slice(0, -1) : state.stack;
      return { ...state, stack: newStack, page: newStack[newStack.length - 1] };
    }
    case 'GO_HOME':
      return { ...state, page: 'home', stack: ['home'] };
    case 'SET_DAY':
      return { ...state, day: action.day };
    case 'UPDATE_DAY':
      return { ...state, day: { ...state.day, ...action.updates } };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'SET_VIEW_DATE':
      return { ...state, viewDate: action.date };
    case 'SET_PIN':
      return { ...state, pin: action.pin };
    case 'SET_SETTINGS':
      return { ...state, autoLock: action.autoLock ?? state.autoLock, threshold: action.threshold ?? state.threshold, lastBackup: action.lastBackup ?? state.lastBackup };
    case 'SET_EDITING_REOPENED':
      return { ...state, editingReopened: action.date };
    case 'SET_PIN_TARGET':
      return { ...state, pinTarget: action.target };
    case 'SET_SYNC':
      return { ...state, syncState: action.syncState };
    case 'TOAST':
      return { ...state, toastMsg: action.msg, toastVisible: true };
    case 'HIDE_TOAST':
      return { ...state, toastVisible: false };
    case 'SET_MONTH_CURSOR':
      return { ...state, monthCursor: action.cursor };
    case 'SET_REPORT_MODE':
      return { ...state, reportMode: action.mode };
    case 'SET_AUTH_FAILED':
      return { ...state, authFailed: action.failed };
    case 'LOAD_ALL':
      return { ...state, ...action.payload };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.customers };
    case 'SET_SELECTED_CUSTOMER':
      return { ...state, selectedCustomerId: action.id };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimerRef = useRef(null);
  const lockTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const customerSaveRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const isToday = useCallback(() => {
    return state.viewDate === todayKey() || state.viewDate === state.editingReopened;
  }, [state.viewDate, state.editingReopened]);

  /* --- sync badge update ----------------------------------------- */
  const updateSync = useCallback(() => {
    dispatch({ type: 'SET_SYNC', syncState: getSyncState() });
  }, []);

  /* --- toast ------------------------------------------------------ */
  const toast = useCallback((msg) => {
    dispatch({ type: 'TOAST', msg });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2200);
  }, []);

  /* --- auto-lock -------------------------------------------------- */
  const resetLock = useCallback(() => {
    if (!state.autoLock) return;
    clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      const cur = stateRef.current.page;
      if (cur !== 'lock' && cur !== 'splash') {
        dispatch({ type: 'SET_PAGE', page: 'lock' });
        dispatch({ type: 'SET_PIN_TARGET', target: null });
      }
    }, 3 * 60 * 1000);
  }, [state.autoLock]);

  useEffect(() => {
    const handler = () => resetLock();
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
  }, [resetLock]);

  /* --- Scroll to top on every page change (Fix #6) --------------- */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.page]);

  /* --- Mobile hardware back button (Fix #2) ---------------------- */
  useEffect(() => {
    // Push a dummy state so popstate fires instead of closing tab
    const pushDummyState = () => {
      window.history.pushState({ page: stateRef.current.page }, '');
    };

    const handlePopState = (e) => {
      const cur = stateRef.current.page;
      const noBack = ['splash', 'lock', 'home'];
      if (noBack.includes(cur)) {
        // Prevent browser from going back / closing
        pushDummyState();
        return;
      }
      dispatch({ type: 'GO_BACK' });
      pushDummyState();
    };

    // Initial dummy state push
    pushDummyState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /* --- Backspace / Escape keyboard navigation -------------------- */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (isEditable) return;

      const noBack = ['splash', 'lock', 'home'];
      if (noBack.includes(stateRef.current.page)) return;

      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'GO_BACK' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* --- Realtime listeners (Fix #1 & #3) -------------------------- */
  useEffect(() => {
    // Listen for realtime day updates from any device
    const dayKey = state.viewDate || todayKey();
    const unsubDay = listenToDay(dayKey, (data) => {
      // Only merge if we're on the same date — don't overwrite current edits mid-type
      if (stateRef.current.viewDate === dayKey) {
        dispatch({ type: 'SET_DAY', day: { ...emptyDay(dayKey), ...data } });
      }
    });

    return () => unsubDay();
  }, [state.viewDate]);

  useEffect(() => {
    const unsubCustomers = listenToCustomers((list) => {
      dispatch({ type: 'SET_CUSTOMERS', customers: list });
    });
    return () => unsubCustomers();
  }, []);

  /* --- debounced save -------------------------------------------- */
  const saveDay = useCallback(() => {
    if (state.viewDate !== todayKey() && state.viewDate !== state.editingReopened) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await storage.set('day:' + state.viewDate, JSON.stringify(state.day), updateSync);
      } catch { /* already queued */ }
    }, 300);
  }, [state.viewDate, state.editingReopened, state.day, updateSync]);

  /* --- customer save: SYNCHRONOUS localStorage + async Firestore - */
  const saveCustomers = useCallback((customers) => {
    try { localStorage.setItem('sarita_customers', JSON.stringify(customers)); } catch {}
    clearTimeout(customerSaveRef.current);
    customerSaveRef.current = setTimeout(async () => {
      try {
        await storage.set('customers', JSON.stringify(customers), updateSync);
      } catch { /* queued */ }
    }, 300);
  }, [updateSync]);

  /* --- online / offline listeners -------------------------------- */
  useEffect(() => {
    const onOnline  = () => { updateSync(); flushPending(updateSync, toast); };
    const onOffline = () => { updateSync(); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(() => flushPending(updateSync, toast), 20000);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, [updateSync, toast]);

  /* --- context value --------------------------------------------- */
  const value = {
    state, dispatch,
    isToday, toast, saveDay, saveCustomers, updateSync, resetLock,
    storage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
