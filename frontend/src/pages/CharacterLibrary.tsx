
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCharacterLibrary } from '../services/api';
import { UserCharacter } from '../types';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { PlusCircle } from 'lucide-react';

const CharacterCard: React.FC<{ character: UserCharacter }> = ({ character }) => (
  <Link to={`/character/${character.id}`} className="block group">
    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-700">
      <img
        src={character.imageUrl}
        alt={character.characterName}
        className="w-full h-full object-cover object-center group-hover:opacity-75 transition-opacity"
      />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-gray-100">{character.characterName}</h3>
    <p className="mt-1 text-sm text-gray-400 truncate">{character.description}</p>
  </Link>
);


const CharacterLibrary: React.FC = () => {
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedCharacters = await getCharacterLibrary() as UserCharacter[];
      setCharacters(fetchedCharacters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch characters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  if (loading) return <Loader message="Loading library..." />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Characters</h1>
        <Link
          to="/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-transform transform hover:scale-105"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New
        </Link>
      </div>
      {characters.length === 0 ? (
        <div className="text-center py-16 px-6 border-2 border-dashed border-gray-700 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-300">Your library is empty.</h2>
          <p className="mt-2 text-gray-500">Create your first character pair to get started!</p>
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
