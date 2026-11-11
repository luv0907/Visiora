import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// The browser never reads Firestore (the backend does), so it isn't bundled here. Analytics
// loads once the page is idle, so it never delays the first screen.
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  const start = () => import('firebase/analytics').then(({ getAnalytics }) => getAnalytics(app)).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 });
  else setTimeout(start, 3000);
}
