import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCzwAHJnu-MP__XgIZiqtfrc4-ikjDiqu4",
  authDomain: 'carpool-server-148ac.firebaseapp.com',
  projectId: 'carpool-server-148ac',
  storageBucket: 'carpool-server-148ac.appspot.com',
  messagingSenderId: '115890850255070933125',
  appId: "1:768823426481:web:c1ca0cfa10e70ebb511190",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
};