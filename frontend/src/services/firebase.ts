import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence,
  setPersistence, 
  connectAuthEmulator 
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Presná Firebase konfigurácia pre projekt 'character-studio-comics'
// Ponecháme pôvodný authDomain, pretože App Hosting sa o presmerovanie postará sám.
const firebaseConfig = {
  apiKey: "AIzaSyARuwcn4hMmt7MD5tTTp_r2HVqSu8Zno20",
  authDomain: "character-studio-comics.firebaseapp.com",
  projectId: "character-studio-comics",
  storageBucket: "character-studio-comics.appspot.com",
  messagingSenderId: "673014807195",
  appId: "1:673014807195:web:979046c375fe0b7e26e43e"
};

// --- ODSTRÁNENÁ PREDCHÁDZAJÚCA OPRAVA ---
// Dynamické nastavovanie authDomain spôsobovalo, že App Hosting
// nevedel správne spracovať cestu /__/auth/handler.
// if (!import.meta.env.DEV) {
//   firebaseConfig.authDomain = window.location.hostname;
// }
// ------------------------------------

// Inicializácia Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, 'localhost', 8080);
}

// Nastavenie perzistencie na localStorage (pôvodná metóda)
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase Persistence Error: Could not set persistence.", error);
  });

// Export služieb na použitie v aplikácii
export { 
  auth, 
  googleProvider,
  app,
  db
};
