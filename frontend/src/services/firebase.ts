
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';

// Presná Firebase konfigurácia pre projekt 'character-studio-comics'
const firebaseConfig = {
  apiKey: "AIzaSyARuwcn4hMmt7MD5tTTp_r2HVqSu8Zno20",
  authDomain: "character-studio-comics.firebaseapp.com",
  projectId: "character-studio-comics",
  storageBucket: "character-studio-comics.appspot.com",
  messagingSenderId: "673014807195",
  appId: "1:673014807195:web:979046c375fe0b7e26e43e"
};

// Inicializácia Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Nastavenie perzistencie na localStorage
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase Persistence Error: Could not set persistence.", error);
  });

// Export služieb na použitie v aplikácii
export { 
  auth, 
  googleProvider,
  app 
};
