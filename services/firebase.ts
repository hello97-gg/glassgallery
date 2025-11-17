// Fix: Use Firebase v8 compatibility imports to resolve module errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxdzcKYNEywQhK8MpdPpJwV17Ahux0NJQ",
  authDomain: "primn-f0fa8.firebaseapp.com",
  projectId: "primn-f0fa8",
  storageBucket: "primn-f0fa8.appspot.com",
  messagingSenderId: "887421330432",
  appId: "1:887421330432:web:59c1b5c4f77a23521164e5",
  measurementId: "G-KCWQ5S5Q6H"
};

// Fix: Initialize Firebase using the v8 compatibility API.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

const googleProvider = new firebase.auth.GoogleAuthProvider();
const appleProvider = new firebase.auth.OAuthProvider('apple.com');

export const signInWithGoogle = () => {
  // Fix: Use v8 compat syntax for signInWithPopup.
  return auth.signInWithPopup(googleProvider);
};

export const signInWithApple = () => {
    // Fix: Use v8 compat syntax for signInWithPopup.
    return auth.signInWithPopup(appleProvider);
}

export const logOut = () => {
  // Fix: Use v8 compat syntax for signOut.
  return auth.signOut();
};
