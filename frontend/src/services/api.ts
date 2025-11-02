
import { auth } from './firebase';

const callApi = async <T,>(endpoint: string, body: object): Promise<T> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  
  const response = await fetch(endpoint, {
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

export const getCharacterLibrary = () => callApi('/getCharacterLibrary', {});
export const getCharacterById = (characterId: string) => callApi('/getCharacterById', { characterId });
export const createCharacterPair = (charA: string, charB: string) => callApi('/createCharacterPair', { charA, charB });
export const generateCharacterVisualization = (characterId: string, prompt: string) => callApi('/generateCharacterVisualization', { characterId, prompt });
