// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web configuration is intentionally public and is included in the
// browser bundle. Environment variables can override these values for another
// Firebase project, while the fallback keeps the existing ANT Solar deployment
// working when Netlify client variables have not been configured yet.
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyBTBcdZb5FMZpf2kbUx6eWhC2hQXrPb9hU',
  authDomain: 'ant-soler.firebaseapp.com',
  projectId: 'ant-soler',
  messagingSenderId: '859294648883',
  appId: '1:859294648883:web:944270286ecf293614f146',
  measurementId: 'G-VSNNLEK1KG'
};

function configuredValue(value, fallback) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.startsWith('your_') || normalized.startsWith('ci-')) {
    return fallback;
  }
  return normalized;
}

const firebaseConfig = {
  apiKey: configuredValue(process.env.VUE_APP_FIREBASE_API_KEY, defaultFirebaseConfig.apiKey),
  authDomain: configuredValue(process.env.VUE_APP_FIREBASE_AUTH_DOMAIN, defaultFirebaseConfig.authDomain),
  projectId: configuredValue(process.env.VUE_APP_FIREBASE_PROJECT_ID, defaultFirebaseConfig.projectId),
  messagingSenderId: configuredValue(
    process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
    defaultFirebaseConfig.messagingSenderId
  ),
  appId: configuredValue(process.env.VUE_APP_FIREBASE_APP_ID, defaultFirebaseConfig.appId),
  measurementId: configuredValue(
    process.env.VUE_APP_FIREBASE_MEASUREMENT_ID,
    defaultFirebaseConfig.measurementId
  )
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, googleProvider, db };
