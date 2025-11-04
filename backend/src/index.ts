import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import admin from 'firebase-admin';
import { GoogleGenAI, Modality } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { AiplatformServiceClient } from '@google-cloud/aiplatform'; // PRIDANÉ

// --- Konfigurácia ---
dotenv.config();
const PROJECT_ID = 'character-studio-comics';
const LOCATION = 'us-central1'; // Dôležitá lokácia pre Vertex AI
const BUCKET_NAME = 'character-studio-comics.appspot.com';

// --- Klienti ---
const secretManagerClient = new SecretManagerServiceClient();
const aiPlatformClient = new AiplatformServiceClient({ // PRIDANÉ
  apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
});
let ai: GoogleGenAI; // Pre štandardné Gemini volania

// --- Inicializácia Firebase ---
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket(BUCKET_NAME);

// --- Načítanie Gemini API Kľúča (pre simuláciu) ---
async function accessSecretVersion() {
  const name = `projects/${PROJECT_ID}/secrets/gemini-api-key/versions/latest`;
  try {
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) throw new Error('Secret payload is empty');
    return payload;
  } catch (error) {
    console.error('Error accessing secret from Secret Manager:', error);
    process.exit(1);
  }
}

async function initializeGenAI() {
  const apiKey = await accessSecretVersion();
  ai = new GoogleGenAI({ apiKey });
  console.log('Successfully initialized Google GenAI client.');
}

// --- Express Aplikácia ---
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '25mb' })); // Zvýšený limit pre viac obrázkov

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

// --- Auth Middleware (Ponechávame tvoj bypass) ---
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST === "true") { 
    req.user = { uid: "test-user" } as admin.auth.DecodedIdToken;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided.');
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(403).send('Unauthorized: Invalid token.');
  }
};

// --- API Endpoints Fázy 1 ---

/**
 * Endpoint na spustenie trénovacieho jobu pre novú postavu.
 */
app.post('/startCharacterTraining', authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user?.uid;
  const { images, characterName } = req.body; // images je pole base64 stringov

  if (!uid || !images || !Array.isArray(images) || images.length < 5 || !characterName) {
    return res.status(400).send('Missing data. Potrebných je minimálne 5 obrázkov a meno postavy.');
  }

  const characterId = uuidv4();
  const characterRef = db.collection('trainedCharacters').doc(characterId);
  const trainingDataDir = `training-data/${uid}/${characterId}`;
  
  console.log(`[${characterId}] Starting training for ${characterName} for user ${uid}`);

  try {
    // Krok 1: Vytvoríme záznam vo Firestore
    await characterRef.set({
      userId: uid,
      characterName: characterName,
      status: 'uploading',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      imageCount: images.length,
      visualizations: [], // Pripravíme pole pre uložené obrázky
    });

    // Krok 2: Nahráme všetky trénovacie obrázky do GCS
    let thumbnailUrl = '';
    const uploadPromises = images.map(async (base64Image: string, index: number) => {
      const parts = base64Image.split(',');
      const data = parts[1];
      if (!data) throw new Error(`Invalid base64 string for image ${index}`);
      
      const imageBuffer = Buffer.from(data, 'base64');
      const filePath = `${trainingDataDir}/image_${index}.jpg`;
      const file = bucket.file(filePath);
      await file.save(imageBuffer, { contentType: 'image/jpeg' });
      
      if (index === 0) {
        await file.makePublic();
        thumbnailUrl = file.publicUrl();
      }
    });
    await Promise.all(uploadPromises);

    // Krok 3: Aktualizujeme Firestore o thumbnail a stav "training"
    await characterRef.update({
      status: 'training',
      thumbnailUrl: thumbnailUrl,
    });
    
    console.log(`[${characterId}] Upload complete. Starting Vertex AI Job...`);

    // Krok 4: Spustíme Vertex AI trénovací job (SIMULÁCIA)
    // ---
    // !!! TOTO JE SIMULÁCIA. !!!
    // ---
    console.log(`[${characterId}] SIMULATION: Starting 30-second fake training...`);
    setTimeout(async () => {
      const trainedModelEndpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/fake-endpoint-${characterId}`;
      await characterRef.update({
        status: 'ready',
        modelEndpointId: trainedModelEndpoint 
      });
      console.log(`[${characterId}] SIMULATION: Training finished.`);
    }, 30000); // 30 sekúnd

    res.status(202).json({ id: characterId, status: 'training', name: characterName });

  } catch (error) {
    console.error(`[${characterId}] Error starting character training:`, error);
    await characterRef.delete().catch(); // Cleanup
    res.status(500).send('Failed to start training job.');
  }
});

/**
 * Načíta detaily pre jednu natrénovanú postavu.
 */
app.post('/getTrainedCharacterById', authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user?.uid;
  const { characterId } = req.body;
  if (!uid || !characterId) return res.status(400).send('User ID or Character ID missing.');

  try {
    const docRef = db.collection('trainedCharacters').doc(characterId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send('Character not found.');
    }
    const character = doc.data();
    if (character?.userId !== uid) {
      return res.status(403).send('Forbidden: You do not own this character.');
    }
    res.status(200).json({ id: doc.id, ...character });
  } catch (error) {
    console.error('Error getting character by ID:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Vygeneruje obrázok na základe natrénovaného modelu.
 */
app.post('/generateImageFromTrainedCharacter', authMiddleware, async (req: Request, res: Response) => {
    const uid = req.user?.uid;
    const { modelEndpointId, prompt } = req.body; 
    if (!uid || !modelEndpointId || !prompt) return res.status(400).send('Missing required data.');

    console.log(`Generating image for model ${modelEndpointId} with prompt: ${prompt}`);

    try {
        // ---
        // !!! TOTO JE TIEŽ SIMULÁCIA !!!
        // ---
        const textPart = { text: `(SIMULÁCIA) comic book style, ${prompt}` };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [textPart] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const generatedImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!generatedImagePart || !generatedImagePart.inlineData) {
            throw new Error('No image was generated by the model.');
        }
        const newImageBase64 = generatedImagePart.inlineData.data;
        res.status(200).json({ base64Image: newImageBase64 });
        // --- Koniec simulácie ---

    } catch (error) {
        console.error('Error generating visualization:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Uloží vygenerovanú vizualizáciu (z Fázy 1) do databázy.
 */
app.post('/saveVisualization', authMiddleware, async (req: Request, res: Response) => {
    const uid = req.user?.uid;
    const { characterId, prompt, base64Image } = req.body; // characterId je teraz ID 'trainedCharacters'

    if (!uid || !characterId || !prompt || !base64Image) {
        return res.status(400).send('Missing required data.');
    }

    try {
        const docRef = db.collection('trainedCharacters').doc(characterId); // ZMENA KOLEKCIE
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).send('Character not found.');
        }
        const character = doc.data();
        if (character?.userId !== uid) {
            return res.status(403).send('Forbidden: You do not own this character.');
        }

        const base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const newImageId = uuidv4();
        const filePath = `visualizations/${uid}/${characterId}/${newImageId}.jpg`;

        const file = bucket.file(filePath);
        await file.save(imageBuffer, { contentType: 'image/jpeg' });
        await file.makePublic();
        const publicUrl = file.publicUrl();

        const newVisualization = {
            id: newImageId, // Pridávame ID pre React key
            imageUrl: publicUrl,
            prompt: prompt,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await docRef.update({
            visualizations: admin.firestore.FieldValue.arrayUnion(newVisualization)
        });

        res.status(200).json(newVisualization);

    } catch (error) {
        console.error('Error saving visualization:', error);
        res.status(500).send('Internal Server Error');
    }
});

// --- Spustenie servera ---
const PORT = Number(process.env.PORT) || 8080;
initializeGenAI().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
