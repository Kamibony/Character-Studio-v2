import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCharacterById, generateCharacterVisualization, saveVisualization } from '../services/api';
import { UserCharacter } from '../types';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { ArrowLeft, Sparkles } from 'lucide-react';

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<UserCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  const fetchCharacter = useCallback(async () => {
    if (!id) {
        setError("No character ID provided.");
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getCharacterById(id) as UserCharacter;
      setCharacter(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch character details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  const handleGeneration = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !prompt) {
        setGenerationError("Prompt cannot be empty.");
        return;
    }
    setGenerating(true);
    setGenerationError(null);
    setGeneratedImage(null);
    try {
        const result = await generateCharacterVisualization(id, prompt) as { base64Image: string };
        setGeneratedImage(`data:image/png;base64,${result.base64Image}`);
    } catch(err) {
        setGenerationError(err instanceof Error ? err.message : 'Failed to generate image.');
    } finally {
        setGenerating(false);
    }
  };

  const handleSaveVisualization = async () => {
    if (!id || !prompt || !generatedImage) {
        setSavingError("Missing data to save visualization.");
        return;
    }
    setSaving(true);
    setSavingError(null);
    try {
        await saveVisualization(id, prompt, generatedImage);
        // Optionally, reset state or give user feedback
        setGeneratedImage(null);
        setPrompt('');
    } catch(err) {
        setSavingError(err instanceof Error ? err.message : 'Failed to save visualization.');
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <Loader message="Loading character..." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!character) return <div className="text-center">Character not found.</div>;

  return (
    <div className="container mx-auto max-w-6xl">
      <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Character Info */}
        <div>
          <img src={character.imageUrl} alt={character.characterName} className="w-full rounded-lg shadow-lg mb-6" />
          <h1 className="text-4xl font-bold mb-2">{character.characterName}</h1>
          <p className="text-gray-400 mb-4">{character.description}</p>
          <div className="flex flex-wrap gap-2">
            {character.keywords.map((keyword, index) => (
              <span key={index} className="px-3 py-1 bg-gray-700 text-sm rounded-full text-gray-300">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* AI Visualization */}
        <div className="bg-gray-800/50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><Sparkles className="w-6 h-6 mr-3 text-yellow-400"/>AI Visualization Studio</h2>
          <form onSubmit={handleGeneration}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`e.g., "${character.characterName} in a futuristic city at night, neon lights, cinematic style"`}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors mb-4"
              rows={4}
            />
            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-all"
            >
              {generating ? 'Generating...' : 'Generate New Image'}
            </button>
          </form>

          {generating && <Loader message="AI is creating..." />}
          {generationError && <div className="mt-4"><ErrorDisplay message={generationError} /></div>}
          {savingError && <div className="mt-4"><ErrorDisplay message={savingError} /></div>}
          
          {generatedImage && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">Generated Image:</h3>
              <img src={generatedImage} alt="AI Generated Visualization" className="w-full rounded-lg shadow-md" />
              <button
                onClick={handleSaveVisualization}
                disabled={saving || generating || !generatedImage}
                className="mt-4 w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all"
              >
                {saving ? 'Saving...' : 'Save Visualization'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
