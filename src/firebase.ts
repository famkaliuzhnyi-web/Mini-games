import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const {
  VITE_FIREBASE_API_KEY: apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: authDomain,
  VITE_FIREBASE_DATABASE_URL: databaseURL,
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_STORAGE_BUCKET: storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
  VITE_FIREBASE_APP_ID: appId,
} = import.meta.env;

let firebaseApp: FirebaseApp | null = null;
let firebaseDb: Database | null = null;

if (apiKey && databaseURL) {
  firebaseApp = initializeApp({ apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId });
  firebaseDb = getDatabase(firebaseApp);
}

export const db = firebaseDb;
export const isFirebaseReady = !!firebaseDb;
