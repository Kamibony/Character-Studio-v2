import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTrainedCharacterById, generateImageFromTrainedCharacter, saveVisualization } from '../services/api';
import { TrainedCharacter, Visualization } from '../types';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { ArrowLeft, Sparkles, CheckCircle, Clock } from 'lucide-react';

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<TrainedCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  
  // Lokálny stav pre vizualizácie, aby sa aktualizovali po uložení
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);

  const fetchCharacter = useCallback(async () => {
    if (!id) {
        setError("No character ID provided.");
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getTrainedCharacterById(id);
      setCharacter(data);
      setVisualizations(data.visualizations || []); // Načítame existujúce
      if (data.status === 'ready') {
        setPrompt(`${data.characterName} as a comic book hero, cinematic lighting`);
      }
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
    if (!character?.modelEndpointId) {
        setGenerationError("Model postavy ešte nie je pripravený.");
        return;
    }
    if (!prompt) {
        setGenerationError("Prompt nemôže byť prázdny.");
        return;
    }
    setGenerating(true);
    setGenerationError(null);
    setGeneratedImage(null);
    setSavingError(null);
    try {
        const result = await generateImageFromTrainedCharacter(character.modelEndpointId, prompt);
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
        const newVisualization = await saveVisualization(id, prompt, generatedImage) as Visualization;
        setVisualizations(prev => [newVisualization, ...prev]);
        setGeneratedImage(null);
        setPrompt(`${character?.characterName} `);
    } catch(err) {
        setSavingError(err instanceof Error ? err.message : 'Failed to save visualization.');
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <Loader message="Načítavam postavu..." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!character) return <div className="text-center">Postava nenájdená.</div>;

  const isReady = character.status === 'ready';

  return (
    <div className="container mx-auto max-w-6xl">
      <Link to="/" className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Späť do knižnice
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {/* Character Info */}
        <div className="md:col-span-1">
          <img src={character.thumbnailUrl} alt={character.characterName} className="w-full rounded-lg shadow-lg mb-6" />
          <h1 className="text-3xl font-bold mb-2">{character.characterName}</h1>
          <div className="flex flex-wrap gap-2">
            {isReady ? (
              <span className="flex items-center px-3 py-1 bg-green-800 text-sm rounded-full text-green-200">
                <CheckCircle className="w-4 h-4 mr-2" /> Model pripravený
              </span>
            ) : (
              <span className="flex items-center px-3 py-1 bg-yellow-800 text-sm rounded-full text-yellow-200">
                <Clock className="w-4 h-4 mr-2 animate-spin" /> Model sa trénuje...
              </span>
            )}
            <span className="px-3 py-1 bg-gray-700 text-sm rounded-full text-gray-300">
              {character.imageCount} fotiek
            </span>
          </div>
        </div>

        {/* AI Visualization Studio */}
        <div className="md:col-span-2 bg-gray-800/50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><Sparkles className="w-6 h-6 mr-3 text-yellow-400"/>AI Visualization Studio</h2>
          
          {!isReady && (
            <div className="text-center text-yellow-300 p-4 bg-gray-900 rounded-md">
              <p>Model sa stále trénuje. Keď bude pripravený, budete môcť generovať obrázky.</p>
            </div>
          )}

          <form onSubmit={handleGeneration}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isReady ? `e.g., "${character.characterName} v komiksovom štýle..."` : "Model sa trénuje..."}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors mb-4"
              rows={3}
              disabled={!isReady || generating}
            />
            <button
              type="submit"
              disabled={generating || !isReady}
              className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-all"
            >
              {generating ? 'Generuje sa...' : 'Generovať obrázok'}
            </button>
          </form>

          {generating && <Loader message="AI vytvára..." />}
          {generationError && <div className="mt-4"><ErrorDisplay message={generationError} /></div>}
          {savingError && <div className="mt-4"><ErrorDisplay message={savingError} /></div>}
          
          {generatedImage && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">Nový obrázok:</h3>
              <img src={generatedImage} alt="AI Generated Visualization" className="w-full rounded-lg shadow-md" />
              <button
                onClick={handleSaveVisualization}
                disabled={saving || generating}
                className="mt-4 w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all"
              >
                {saving ? 'Ukladám...' : 'Uložiť vizualizáciu'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Galéria uložených vizualizácií */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Uložené vizualizácie</h2>
        {visualizations.length === 0 ? (
          <p className="text-gray-400">Zatiaľ ste nevytvorili a neuložili žiadne vizualizácie pre túto postavu.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visualizations.sort((a, b) => b.createdAt._seconds - a.createdAt._seconds).map((vis) => (
              <div key={vis.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <img src={vis.imageUrl} alt={vis.prompt} className="w-full h-64 object-cover" />
                <p className="p-4 text-sm text-gray-300 italic">"{vis.prompt}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterDetail;
