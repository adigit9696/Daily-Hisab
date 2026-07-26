import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/**
 * Races anonymous sign-in against a hard timeout so the splash screen
 * NEVER blocks indefinitely. Resolves with user on success, rejects
 * on timeout or auth error.
 */
function ensureAuth(timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unsub   = null;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (unsub) unsub();
      reject(new Error('auth-timeout'));
    }, timeoutMs);

    unsub = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      if (user) {
        settled = true;
        clearTimeout(timer);
        if (unsub) unsub();
        resolve(user);
      } else {
        signInAnonymously(auth).catch((e) => {
          console.error('Anon sign-in failed', e);
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (unsub) unsub();
          reject(e);
        });
      }
    }, (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
  });
}

export { app, auth, db, ensureAuth };
