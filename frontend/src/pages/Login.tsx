import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Zmenené importy - pridávame signInWithPopup a UserCredential
import { signInWithPopup, getRedirectResult, UserCredential } from 'firebase/auth'; 
import { auth, googleProvider } from '../services/firebase';
import { useAuth } from '../App';
import Loader from '../components/Loader';

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  // Refaktoring stavov (ako si navrhoval):
  // 1. Sleduje, či sme už skontrolovali počiatočný redirect
  const [redirectCheckDone, setRedirectCheckDone] = useState(false);
  // 2. Sleduje, či používateľ práve klikol na tlačidlo
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Táto logika kontroluje, či sme sa nevrátili z redirectu (napr. na mobile)
    if (!loading && !user) {
      getRedirectResult(auth)
        .then((result: UserCredential | null) => {
          if (result) {
            // Úspech z redirectu, premenná 'result' je použitá
            navigate('/');
          }
        })
        .catch((err) => {
          console.error("Authentication error (getRedirectResult):", err);
          setError("Failed to process sign-in. Please try again.");
        })
        .finally(() => {
          // Označíme, že počiatočná kontrola je hotová
          setRedirectCheckDone(true);
        });
    } else if (!loading && user) {
      // Používateľ je už prihlásený, ideme preč
      navigate('/');
      setRedirectCheckDone(true);
    }
  }, [user, loading, navigate]);

  // Používame signInWithPopup na vyriešenie problému so zaseknutím
  const handleSignIn = () => {
    setIsSigningIn(true); // Zobrazí loader pre tlačidlo
    setError(null);
    
    signInWithPopup(auth, googleProvider)
      .then((result: UserCredential) => {
        // ÚSPECH: Premenná 'result' je teraz použitá, chyba TS6133 je opravená
        if (result.user) {
          navigate('/');
        }
      })
      .catch((err) => {
        console.error("Popup Sign-in error:", err);
        // Nezobrazujeme chybu, ak používateľ len zavrel okno
        if (err.code !== 'auth/popup-closed-by-user') {
          setError("Could not complete sign-in. Please try again.");
        }
      })
      .finally(() => {
        // Ukončíme loading tlačidla
        setIsSigningIn(false);
      });
  };
  
  // Zobrazíme full-screen loader, kým App.tsx načíta stav ALEBO kým my kontrolujeme redirect
  if (loading || !redirectCheckDone) {
    return <Loader fullScreen={true} message="Authenticating..." />;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-400">Welcome to Character Studio</h1>
          <p className="mt-2 text-gray-400">Sign in to bring your characters to life.</p>
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
        <button
          onClick={handleSignIn}
          // Tlačidlo je zablokované, iba ak sa reálne prihlasuje cez popup
          disabled={isSigningIn} 
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 transition-transform transform hover:scale-105 disabled:bg-gray-600"
        >
          {isSigningIn ? 'Signing in...' : (
            <>
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574	l6.19,5.238C42.018,35.258,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Login;
