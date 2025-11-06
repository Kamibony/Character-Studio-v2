import { auth } from './firebase';
import type { TrainedCharacter, Visualization } from '../types';

const callApi = async <T,>(endpoint: string, body: object): Promise<T> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  
  // Pre lokálny vývoj s Vite proxy
  const baseUrl = import.meta.env.DEV ? '' : window.location.origin;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
};

// --- API Funkcie pre Fázu 1 (UPRAVENÉ) ---

/**
 * Získa "podpísanú" URL od backendu na priame nahratie súboru do Storage.
 */
export const getUploadUrl = (characterId: string, fileName: string, contentType: string) => 
  callApi<{ uploadUrl: string, publicUrl: string }>('/getUploadUrl', { characterId, fileName, contentType });

/**
 * Povie backendu, aby začal trénovací proces.
 * Volá sa AŽ PO úspešnom nahratí všetkých obrázkov do Storage.
 */
export const startCharacterTraining = (characterName: string, characterId: string, imageCount: number, thumbnailUrl: string) => 
  callApi<{ id: string, status: string, name: string }>(
    '/startCharacterTraining', 
    { characterName, characterId, imageCount, thumbnailUrl }
  );

export const getTrainedCharacterById = (characterId: string) => 
  callApi<TrainedCharacter>('/getTrainedCharacterById', { characterId });

export const generateImageFromTrainedCharacter = (modelEndpointId: string, prompt: string) => 
  callApi<{ base64Image: string }>('/generateImageFromTrainedCharacter', { modelEndpointId, prompt });

export const saveVisualization = (characterId: string, prompt: string, base64Image: string) => 
  callApi<Visualization>('/saveVisualization', { characterId, prompt, base64Image });
