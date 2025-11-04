import { auth } from './firebase';

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

// --- API Funkcie pre Fázu 1 ---

export const startCharacterTraining = (characterName: string, images: string[]) => 
  callApi<{ id: string, status: string, name: string }>('/startCharacterTraining', { characterName, images });

export const getTrainedCharacterById = (characterId: string) => 
  callApi<TrainedCharacter>('/getTrainedCharacterById', { characterId });

export const generateImageFromTrainedCharacter = (modelEndpointId: string, prompt: string) => 
  callApi<{ base64Image: string }>('/generateImageFromTrainedCharacter', { modelEndpointId, prompt });

export const saveVisualization = (characterId: string, prompt: string, base64Image: string) => 
  callApi('/saveVisualization', { characterId, prompt, base64Image });
