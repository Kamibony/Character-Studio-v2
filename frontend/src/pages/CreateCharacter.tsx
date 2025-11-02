
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCharacterPair } from '../services/api';
import Loader from '../components/Loader';
import ErrorDisplay from '../components/ErrorDisplay';
import { UploadCloud, X } from 'lucide-react';

const ImageUpload: React.FC<{
  image: string | null;
  onImageChange: (file: File | null) => void;
  id: string;
}> = ({ image, onImageChange, id }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onImageChange(null);
  }

  return (
    <div className="w-full">
      <label htmlFor={id} className="cursor-pointer">
        <div className="aspect-square w-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-purple-500 transition-colors relative group">
          {image ? (
            <>
              <img src={image} alt="Preview" className="object-contain h-full w-full rounded-lg" />
              <button onClick={handleRemove} className="absolute top-2 right-2 p-1.5 bg-gray-900/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <UploadCloud className="mx-auto h-12 w-12" />
              <p className="mt-2">Click to upload</p>
            </div>
          )}
        </div>
      </label>
      <input id={id} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
    </div>
  );
};


const CreateCharacter: React.FC = () => {
  const [charA, setCharA] = useState<File | null>(null);
  const [charB, setCharB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleImageChange = (setter: React.Dispatch<React.SetStateAction<File | null>>, previewSetter: React.Dispatch<React.SetStateAction<string | null>>) => (file: File | null) => {
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewA || !previewB) {
      setError('Please upload two character images.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createCharacterPair(previewA, previewB);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create characters.');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Create a Character Pair</h1>
      <p className="text-center text-gray-400 mb-8">Upload two images. Our AI will analyze them, generate profiles, and add them to your library.</p>
      
      {loading && <Loader message="Analyzing images & creating characters... This may take a moment." />}
      
      <form onSubmit={handleSubmit} className={loading ? 'hidden' : 'block'}>
        {error && <div className="mb-6"><ErrorDisplay message={error} /></div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ImageUpload id="charA" image={previewA} onImageChange={handleImageChange(setCharA, setPreviewA)} />
          <ImageUpload id="charB" image={previewB} onImageChange={handleImageChange(setCharB, setPreviewB)} />
        </div>

        <button
          type="submit"
          disabled={!charA || !charB || loading}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-all"
        >
          Generate Character Pair
        </button>
      </form>
    </div>
  );
};

export default CreateCharacter;
