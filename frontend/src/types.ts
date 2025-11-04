export interface Visualization {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}

export interface TrainedCharacter {
  id: string;
  characterName: string;
  userId: string;
  status: 'uploading' | 'training' | 'ready' | 'failed';
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  imageCount?: number;
  thumbnailUrl?: string; // URL prvého nahraného obrázku
  modelEndpointId?: string; // ID endpointu modelu z Vertex AI
  visualizations: Visualization[]; // Pole uložených vizualizácií
}
