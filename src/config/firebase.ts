import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Replace these values with your own Firebase project config.
// Go to https://console.firebase.google.com → Project Settings → Your apps → Web app config
const firebaseConfig = {
  apiKey: 'AIzaSyDGZDE6_dcR1SAPZxys2aeXFDwCZ5qC4l0',
  authDomain: 'club7o5.firebaseapp.com',
  projectId: 'club7o5',
  storageBucket: 'club7o5.firebasestorage.app',
  messagingSenderId: '1049265598960',
  appId: '1:1049265598960:web:d51a48848c840a1600ed35',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
