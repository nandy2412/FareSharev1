// app/firebaseConfig.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCzwAHJnu-MP__XgIZiqtfrc4-ikjDiqu4",
  authDomain: "carpool-server-148ac.firebaseapp.com",
  projectId: "carpool-server-148ac",
  storageBucket: "carpool-server-148ac.appspot.com",
  messagingSenderId: "768823426481",
  appId: "1:768823426481:web:c1ca0cfa10e70ebb511190",
  measurementId: "G-9X7FSSVPF4"
};

// Prevent reinitialization in dev/hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
