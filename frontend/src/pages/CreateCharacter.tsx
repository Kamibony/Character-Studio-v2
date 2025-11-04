import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { startCharacterTraining } from '../services/api';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { UploadCloud, X, CheckCircle } from 'lucide-react';

// Pomocná funkcia na čítanie súboru ako base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const CreateCharacter = () => {
  const [characterName, setCharacterName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);

      // Generovanie náhľadov
      const newPreviewsPromises: Promise<string>[] = newFiles.map(fileToBase64);
      Promise.all(newPreviewsPromises).then((base64Files) => {
        setPreviews((prevPreviews) => [...prevPreviews, ...base64Files]);
      });
      // Vyčistí input, aby bolo možné pridať rovnaký súbor znova
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length < 5) {
      setError('Prosím, nahrajte aspoň 5 obrázkov pre trénovanie.');
      return;
    }
    if (!characterName) {
      setError('Prosím, zadajte meno postavy.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Všetky náhľady sú už base64 stringy
      await startCharacterTraining(characterName, previews);
      navigate('/'); // Presmerujeme do knižnice, kde uvidí "trénuje sa"
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader fullScreen={true} message="Spúšťa sa trénovací proces... Obrázky sa nahrávajú." />;
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Trénovať novú postavu</h1>
      <p className="text-center text-gray-400 mb-8">
        Nahrajte 5-10 fotiek postavy. AI sa naučí jej tvár a štýl.
        Pre najlepšie výsledky použite rôzne uhly, výrazy tváre a osvetlenie.
      </p>
      
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-6"><ErrorDisplay message={error} /></div>}
        
        <div className="mb-6">
          <label htmlFor="characterName" className="block text-sm font-medium text-gray-300 mb-2">
            Meno postavy
          </label>
          <input
            type="text"
            id="characterName"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Napr. Tomáš alebo 'Super Koder'"
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trénovacie obrázky ({files.length} nahraných)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={preview} alt={`Náhľad ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-gray-900/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <label htmlFor="file-upload" className="cursor-pointer aspect-square w-full border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-purple-500 transition-colors text-gray-500 hover:text-purple-400">
              <UploadCloud className="mx-auto h-8 w-8" />
              <span className="mt-1 text-xs text-center">Pridať fotky</span>
            </label>
            <input id="file-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          </div>
          {files.length > 0 && files.length < 5 && (
            <p className="text-yellow-400 text-sm">
              Odporúčame aspoň 5 obrázkov. Máte {files.length}.
            </p>
          )}
          {files.length >= 5 && (
             <p className="text-green-400 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" /> Super! Máte dostatok obrázkov na trénovanie.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={files.length < 5 || !characterName || loading}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-all"
        >
          Spustiť trénovanie postavy
        </button>
      </form>
    </div>
  );
};

export default CreateCharacter;
