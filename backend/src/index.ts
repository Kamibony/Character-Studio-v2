import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import admin from 'firebase-admin';
import { GoogleGenAI, Modality } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// --- VRÁTENÉ SPÄŤ: IMPORTY PRE OBSLUHU FRONTENDU ---
import path from 'path';
import { fileURLToPath } from 'url';
// ------------------------------------------

// --- Konfigurácia ---
dotenv.config();
const PROJECT_ID = 'character-studio-comics';
const LOCATION = 'us-central1'; // Dôležitá lokácia pre Vertex AI
const BUCKET_NAME = 'character-studio-comics.appspot.com';

// --- VRÁTENÉ SPÄŤ: NÁJDENIE CESTY K SÚBOROM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------------------

// --- Klienti ---
const secretManagerClient = new SecretManagerServiceClient();
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
// --- ZMENA: Odstránený limit, parsujeme bežné JSONy ---
app.use(express.json()); 
// ---------------------------------------------------------

// --- VRÁTENÝ SPÄŤ BLOK NA OBSLUHU FRONTENDU ---
const staticFilesPath = path.join(__dirname, '..', 'public');
app.use(express.static(staticFilesPath));
// ----------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

// --- Auth Middleware ---
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
 * NOVÝ ENDPOINT
 * Generuje podpísanú URL, na ktorú môže klient nahrať súbor.
 */
app.post('/getUploadUrl', authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user?.uid;
  const { characterId, fileName, contentType } = req.body;
  if (!uid || !characterId || !fileName || !contentType) {
    return res.status(400).send('Missing required data (characterId, fileName, contentType).');
  }

  const filePath = `training-data/${uid}/${characterId}/${fileName}`;
  const file = bucket.file(filePath);

  try {
    // Vytvoríme podpísanú URL platnú 15 minút na ZÁPIS (write)
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
      version: 'v4',
    });

    // Vrátime URL na nahrávanie a verejnú URL na čítanie (pre thumbnail)
    res.status(200).json({ uploadUrl: url, publicUrl: file.publicUrl() });
  } catch (error) {
    console.error(`[${characterId}] Error getting signed URL:`, error);
    res.status(500).send('Failed to get upload URL.');
  }
});


/**
 * UPRAVENÝ ENDPOINT
 * Spustí trénovací proces. Už nepríjma obrázky, iba metadáta.
 * Predpokladá, že obrázky sú už nahraté v Storage.
 */
app.post('/startCharacterTraining', authMiddleware, async (req: Request, res: Response) => {
  const uid = req.user?.uid;
  // Zmenené: Prijímame ID, imageCount a thumbnailUrl, už nie pole obrázkov
  const { characterName, characterId, imageCount, thumbnailUrl } = req.body; 

  if (!uid || !characterId || !characterName || !imageCount || imageCount < 5 || !thumbnailUrl) {
    return res.status(400).send('Missing data. Potrebné je characterId, characterName, imageCount >= 5 a thumbnailUrl.');
  }

  const characterRef = db.collection('trainedCharacters').doc(characterId);
  
  console.log(`[${characterId}] Starting training for ${characterName} for user ${uid}`);

  try {
    // Vytvoríme záznam v DB. Obrázky sú už v Storage.
    // Rovno nastavíme status 'training'.
    await characterRef.set({
      userId: uid,
      characterName: characterName,
      status: 'training', // Začíname rovno trénovať
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      imageCount: imageCount,
      thumbnailUrl: thumbnailUrl, // URL získaná z klienta
      visualizations: [], 
    });
    
    console.log(`[${characterId}] DB record created. Starting Vertex AI Job...`);

    // ---
    // !!! TOTO JE SIMULÁCIA TRÉNINGU !!!
    // ---
    console.log(`[${characterId}] SIMULATION: Starting 30-second fake training...`);
    setTimeout(async () => {
      const trainedModelEndpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/fake-endpoint-${characterId}`;
      await characterRef.update({
        status: 'ready',
        modelEndpointId: trainedModelEndpoint 
      });
      console.log(`[${characterId}] SIMULATION: Training finished.`);
    }, 30000); 

    res.status(202).json({ id: characterId, status: 'training', name: characterName });

  } catch (error) {
    console.error(`[${characterId}] Error starting character training:`, error);
    // Ak sa zápis do DB nepodaril, skúsime zmazať priečinok v Storage
    try {
      await bucket.deleteFiles({
        prefix: `training-data/${uid}/${characterId}/`
      });
    } catch (cleanupError) {
      console.error(`[${characterId}] Cleanup failed:`, cleanupError);
    }
    res.status(500).send('Failed to start training job.');
  }
});

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

app.post('/saveVisualization', authMiddleware, async (req: Request, res: Response) => {
    const uid = req.user?.uid;
    const { characterId, prompt, base64Image } = req.body; 

    if (!uid || !characterId || !prompt || !base64Image) {
        return res.status(400).send('Missing required data.');
    }

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

        // Pre ukladanie vizualizácií je base64 v poriadku, je to len 1 obrázok
        const base64Data = base64Image.replace(/^data:image\/(png|jpeg);base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const newImageId = uuidv4();
        const filePath = `visualizations/${uid}/${characterId}/${newImageId}.jpg`;

        const file = bucket.file(filePath);
        await file.save(imageBuffer, { contentType: 'image/jpeg' });
        await file.makePublic();
        const publicUrl = file.publicUrl();

        const newVisualization = {
            id: newImageId, 
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

// --- ZMENENÝ BLOK (OPRAVA LOGIN LOOPU) ---
// Toto je SPA (Single Page App) fallback.
// Pošle späť index.html pre akúkoľvek GET požiadavku, KTORÁ NIE JE API
// a ZÁROVEŇ NIE JE REZERVOVANÁ FIREBASE CESTA (/__/).
// Používame regulárny výraz, ktorý vylúči cesty začínajúce na /__/
app.get(/^(?!\/__).*/, (req, res) => {
  res.sendFile(path.join(staticFilesPath, 'index.html'));
});
// ------------------------------------

// --- Spustenie servera ---
const PORT = Number(process.env.PORT) || 8080;
initializeGenAI().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
