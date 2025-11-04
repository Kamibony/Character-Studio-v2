import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrainedCharacter } from '../types';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { PlusCircle, Clock, AlertTriangle } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../App';

const CharacterCard = ({ character }: { character: TrainedCharacter }) => {
  const isReady = character.status === 'ready';
  const isTraining = character.status === 'training' || character.status === 'uploading';
  const isFailed = character.status === 'failed';

  return (
    <Link 
      to={`/character/${character.id}`} 
      className={`block group ${!isReady ? 'cursor-not-allowed' : ''}`}
      onClick={(e) => !isReady && e.preventDefault()}
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-700 relative">
        {character.thumbnailUrl ? (
          <img
            src={character.thumbnailUrl}
            alt={character.characterName}
            className={`w-full h-full object-cover object-center ${isReady ? 'group-hover:opacity-75' : 'opacity-50'} transition-opacity`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
            (No thumbnail)
          </div>
        )}
        {isTraining && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white p-2">
            <Loader message={character.status === 'uploading' ? 'Nahrávam...' : 'Trénuje sa...'} />
            <Clock className="w-5 h-5 mt-2 animate-spin" />
            <p className="text-xs text-center mt-2">(Môže to trvať aj 30+ minút)</p>
          </div>
        )}
         {isFailed && (
          <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white p-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="font-bold mt-2">Tréning zlyhal</p>
          </div>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-100">{character.characterName}</h3>
      <p className={`mt-1 text-sm font-medium ${
        isReady ? 'text-green-400' : 
        isTraining ? 'text-yellow-400' : 'text-red-400'
      } capitalize`}>
        Stav: {character.status}
      </p>
    </Link>
  );
};


const CharacterLibrary = () => {
  const [characters, setCharacters] = useState<TrainedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Počúvame na 'trainedCharacters' kolekciu
    const q = query(
      collection(db, 'trainedCharacters'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCharacters = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as TrainedCharacter[];
      setCharacters(fetchedCharacters);
      setLoading(false);
    }, (err) => {
      console.error("Firestore snapshot error: ", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch characters.');
      setLoading(false);
    });
    
    // Odhlásenie listenera pri odchode z komponentu
    return () => unsubscribe();

  }, [user]);

  if (loading) return <Loader message="Načítavam knižnicu..." />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vaše postavy</h1>
        <Link
          to="/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-transform transform hover:scale-105"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Trénovať novú postavu
        </Link>
      </div>
      {characters.length === 0 ? (
        <div className="text-center py-16 px-6 border-2 border-dashed border-gray-700 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-300">Vaša knižnica je prázdna.</h2>
          <p className="mt-2 text-gray-500">Vytvorte svoju prvú postavu a natrénujte ju!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CharacterLibrary;
