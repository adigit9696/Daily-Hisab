import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, writeBatch,
  onSnapshot,
} from 'firebase/firestore';

/* ------------------------------------------------------------------ */
/*  Local cache helpers                                                */
/* ------------------------------------------------------------------ */
const LS_PREFIX  = 'sh_cache_';
const LS_PENDING = 'sh_pending_v1';

function lsGet(key)        { try { const v = localStorage.getItem(LS_PREFIX + key); return v ?? null; } catch { return null; } }
function lsSet(key, value) { try { localStorage.setItem(LS_PREFIX + key, value); } catch { /* quota */ } }

function readPending()     { try { return JSON.parse(localStorage.getItem(LS_PENDING) || '[]'); } catch { return []; } }
function writePending(arr) { try { localStorage.setItem(LS_PENDING, JSON.stringify(arr)); } catch { /* ignore */ } }

function queuePending(key, value, onBadgeUpdate) {
  const arr = readPending().filter((p) => p.key !== key);
  arr.push({ key, value, ts: Date.now() });
  writePending(arr);
  if (onBadgeUpdate) onBadgeUpdate();
}

/* ------------------------------------------------------------------ */
/*  Shared shop path — ALL devices use the SAME Firestore location     */
/* ------------------------------------------------------------------ */
const SHOP_ID = 'sarita_pharmacy';
const shopDoc = (path) => doc(db, 'shops', SHOP_ID, 'data', path);
const daysDoc = (date) => doc(db, 'shops', SHOP_ID, 'days', date);

/* ------------------------------------------------------------------ */
/*  Sync badge state                                                   */
/* ------------------------------------------------------------------ */
export function getSyncState() {
  const pending = readPending().length;
  if (!navigator.onLine) return { status: 'offline', count: pending };
  if (pending > 0)       return { status: 'pending', count: pending };
  return { status: 'synced', count: 0 };
}

/* ------------------------------------------------------------------ */
/*  Firestore write dispatcher                                         */
/* ------------------------------------------------------------------ */
function chunkArr(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function firestoreWrite(key, value) {
  if (key === 'pin') {
    await setDoc(shopDoc('meta'), { pin: value }, { merge: true });
  } else if (key === 'settings') {
    await setDoc(shopDoc('meta'), { settings: JSON.parse(value) }, { merge: true });
  } else if (key === 'customers') {
    await setDoc(shopDoc('customers'), { list: JSON.parse(value) }, { merge: false });
  } else if (key === 'history') {
    const arr = JSON.parse(value);
    for (const group of chunkArr(arr, 450)) {
      const batch = writeBatch(db);
      group.forEach((entry) => {
        if (!entry?.date) return;
        batch.set(daysDoc(entry.date), entry, { merge: true });
      });
      await batch.commit();
    }
  } else if (key.startsWith('day:')) {
    const date = key.slice(4);
    const obj  = JSON.parse(value);
    await setDoc(daysDoc(date), obj, { merge: true });
  } else {
    throw new Error('unknown storage key: ' + key);
  }
}

/* ------------------------------------------------------------------ */
/*  Background flush (retry queued writes)                             */
/* ------------------------------------------------------------------ */
let flushing = false;
export async function flushPending(onBadgeUpdate, onToast) {
  if (flushing) return;
  flushing = true;
  try {
    const arr = readPending();
    if (!arr.length) return;
    const remaining = [];
    for (const item of arr) {
      try   { await firestoreWrite(item.key, item.value); }
      catch { remaining.push(item); }
    }
    writePending(remaining);
    if (onBadgeUpdate) onBadgeUpdate();
    if (remaining.length < arr.length && arr.length > 0 && onToast) {
      onToast('Pending entries Firebase me sync ho gayi ✓');
    }
  } finally { flushing = false; }
}

/* ------------------------------------------------------------------ */
/*  Realtime listeners — multi-device sync                             */
/* ------------------------------------------------------------------ */
export function listenToDay(dateKey, onUpdate) {
  return onSnapshot(daysDoc(dateKey), (snap) => {
    if (snap.exists()) {
      lsSet('day:' + dateKey, JSON.stringify(snap.data()));
      onUpdate(snap.data());
    }
  }, (err) => console.error('day listener error', err));
}

export function listenToCustomers(onUpdate) {
  return onSnapshot(shopDoc('customers'), (snap) => {
    if (snap.exists()) {
      const list = snap.data().list || [];
      try { localStorage.setItem('sarita_customers', JSON.stringify(list)); } catch {}
      lsSet('customers', JSON.stringify(list));
      onUpdate(list);
    }
  }, (err) => console.error('customers listener error', err));
}

export function listenToMeta(onUpdate) {
  return onSnapshot(shopDoc('meta'), (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  }, (err) => console.error('meta listener error', err));
}

/* ------------------------------------------------------------------ */
/*  Public storage API                                                 */
/* ------------------------------------------------------------------ */
const storage = {
  async get(key) {
    try {
      if (key === 'pin') {
        const snap = await getDoc(shopDoc('meta'));
        const v = snap.exists() ? snap.data().pin : null;
        if (v) lsSet('pin', v);
        return v ? { key, value: v } : null;
      }
      if (key === 'settings') {
        const snap = await getDoc(shopDoc('meta'));
        const v = snap.exists() ? snap.data().settings : null;
        if (v) lsSet('settings', JSON.stringify(v));
        return v ? { key, value: JSON.stringify(v) } : null;
      }
      if (key === 'customers') {
        const snap = await getDoc(shopDoc('customers'));
        const list = snap.exists() ? (snap.data().list || []) : [];
        lsSet('customers', JSON.stringify(list));
        return { key, value: JSON.stringify(list) };
      }
      if (key === 'history') {
        const q2 = query(collection(db, 'shops', SHOP_ID, 'days'), where('closed', '==', true));
        const snap = await getDocs(q2);
        const arr = snap.docs.map((d) => d.data());
        arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        lsSet('history', JSON.stringify(arr));
        return { key, value: JSON.stringify(arr) };
      }
      if (key.startsWith('day:')) {
        const date = key.slice(4);
        const snap = await getDoc(daysDoc(date));
        if (snap.exists()) lsSet(key, JSON.stringify(snap.data()));
        return snap.exists() ? { key, value: JSON.stringify(snap.data()) } : null;
      }
      return null;
    } catch (e) {
      console.error('storage.get failed — falling back to local cache', key, e);
      const cached = lsGet(key);
      return cached ? { key, value: cached } : null;
    }
  },

  async set(key, value, onBadgeUpdate) {
    lsSet(key, value);
    try {
      await firestoreWrite(key, value);
      writePending(readPending().filter((p) => p.key !== key));
      if (onBadgeUpdate) onBadgeUpdate();
      return { key, value };
    } catch (e) {
      console.error('storage.set failed — queued for retry', key, e);
      queuePending(key, value, onBadgeUpdate);
      return { key, value };
    }
  },

  async delete(key) {
    return { key, deleted: true };
  },
};

export default storage;
