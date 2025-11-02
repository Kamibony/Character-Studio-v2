
export interface UserCharacter {
  id: string;
  characterName: string;
  description: string;
  keywords: string[];
  imageUrl: string;
  userId: string;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
