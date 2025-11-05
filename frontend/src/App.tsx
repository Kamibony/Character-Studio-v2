import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// ZMENA: Importujeme getRedirectResult
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth } from './services/firebase';

import Header from './components/Header';
import Loader from './components/Loader';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import CharacterLibrary from './pages/CharacterLibrary';
import CreateCharacter from './pages/CreateCharacter';
import CharacterDetail from './pages/CharacterDetail';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- ZMENENÝ BLOK ---
  useEffect(() => {
    // 1. Najprv spracujeme výsledok presmerovania (ak nejaký je)
    getRedirectResult(auth)
      .catch((error) => {
        // Spracujeme chybu, ak by nastala pri presmerovaní
        console.error("Error processing redirect result:", error);
      })
      .finally(() => {
        // 2. AŽ POTOM nastavíme hlavný listener
        // Ten sa spustí buď s používateľom (ak redirect uspel) alebo s null
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        
        // Vrátim funkciu na odhlásenie listenera
        return () => unsubscribe();
      });
  }, []);
  // --- KONIEC ZMENENÉHO BLOKU ---

  if (loading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <Header />
        <main className="p-4 sm:p-6 md:p-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><CharacterLibrary /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateCharacter /></ProtectedRoute>} />
            <Route path="/character/:id" element={<ProtectedRoute><CharacterDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
