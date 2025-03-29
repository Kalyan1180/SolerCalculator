// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// Replace these with your actual config values
const firebaseConfig = {
    apiKey: "AIzaSyBTBcdZb5FMZpf2kbUx6eWhC2hQXrPb9hU",
    authDomain: "ant-soler.firebaseapp.com",
    projectId: "ant-soler",
    storageBucket: "ant-soler.firebasestorage.app",
    messagingSenderId: "859294648883",
    appId: "1:859294648883:web:944270286ecf293614f146",
    measurementId: "G-VSNNLEK1KG"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);


export { auth, googleProvider,db };
