// FIX: The original combined import for express was causing type resolution errors.
// Using the default import and explicitly referencing types via the `express` namespace (e.g., `express.Request`) resolves these conflicts.
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

// Standard way to add properties to the request object in Express with TypeScript.
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket('character-studio-comics.appspot.com');

// Initialize Google GenAI
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
// FIX: Using explicit `express.Request`, `express.Response`, and `express.NextFunction` types to avoid ambiguity.
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

// --- API Endpoints ---

// FIX: Using explicit `express.Request` and `express.Response` types.
app.post('/getCharacterLibrary', authMiddleware, async (req: express.Request, res: express.Response) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(400).send('User ID not found.');

  try {
    const snapshot = await db.collection('characters').where('userId', '==', uid).orderBy('createdAt', 'desc').get();
    const characters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error getting character library:', error);
    res.status(500).send('Internal Server Error');
  }
});

// FIX: Using explicit `express.Request` and `express.Response` types.
app.post('/getCharacterById', authMiddleware, async (req: express.Request, res: express.Response) => {
  const uid = req.user?.uid;
  const { characterId } = req.body;
  if (!uid || !characterId) return res.status(400).send('User ID or Character ID missing.');

  try {
    const docRef = db.collection('characters').doc(characterId);
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

// FIX: Using explicit `express.Request` and `express.Response` types.
app.post('/createCharacterPair', authMiddleware, async (req: express.Request, res: express.Response) => {
    const uid = req.user?.uid;
    const { charA, charB } = req.body; // base64 strings

    if (!uid || !charA || !charB) {
        return res.status(400).send('Missing required data.');
    }

    const processCharacter = async (base64Image: string) => {
        const imagePart = {
            inlineData: { data: base64Image.split(',')[1], mimeType: base64Image.split(';')[0].split(':')[1] }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: "Analyze this character image and describe it. Provide a creative name, a short compelling description, and 5-7 relevant keywords." }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characterName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['characterName', 'description', 'keywords']
                }
            }
        });
        
        let result;
        try {
            result = JSON.parse(response.text);
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', response.text);
            throw new Error('AI response was not valid JSON.');
        }

        const characterId = uuidv4();
        const filePath = `uploads/${uid}/${characterId}.jpg`;
        const imageBuffer = Buffer.from(base64Image.split(',')[1], 'base64');
        
        const file = bucket.file(filePath);
        await file.save(imageBuffer, { contentType: 'image/jpeg' });
        await file.makePublic();
        const imageUrl = file.publicUrl();

        const characterData = {
            ...result,
            userId: uid,
            imageUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('characters').doc(characterId).set(characterData);
        return { id: characterId, ...characterData };
    };

    let resultA: { id: string } | null = null;
    try {
        resultA = await processCharacter(charA);
        const resultB = await processCharacter(charB);
        res.status(201).json([resultA, resultB]);
    } catch (error) {
        console.error('Error creating character pair:', error);
        
        if (resultA) {
            try {
                console.log(`Cleaning up character ${resultA.id} due to failed pair creation.`);
                const filePath = `uploads/${uid}/${resultA.id}.jpg`;
                await db.collection('characters').doc(resultA.id).delete();
                await bucket.file(filePath).delete();
                console.log(`Cleanup successful for character ${resultA.id}.`);
            } catch (cleanupError) {
                console.error(`CRITICAL: Failed to cleanup character ${resultA.id}. Manual cleanup required.`, cleanupError);
            }
        }
        res.status(500).send('Internal Server Error while creating characters.');
    }
});

const downloadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks: Uint8Array[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
            });
        }).on('error', (err) => {
            reject(`Failed to download image: ${err.message}`);
        });
    });
};

// FIX: Using explicit `express.Request` and `express.Response` types.
app.post('/generateCharacterVisualization', authMiddleware, async (req: express.Request, res: express.Response) => {
    const uid = req.user?.uid;
    const { characterId, prompt } = req.body;
    if (!uid || !characterId || !prompt) return res.status(400).send('Missing required data.');

    try {
        const docRef = db.collection('characters').doc(characterId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).send('Character not found.');
        }

        const character = doc.data();

        if (character?.userId !== uid) {
            return res.status(403).send('Forbidden: You do not own this character.');
        }

        // This robust type guard is the fix. The logic that depends on imageUrl is now nested inside.
        if (character && typeof character.imageUrl === 'string') {
            const base64Image = await downloadImageAsBase64(character.imageUrl);
        
            const imagePart = {
              inlineData: { data: base64Image, mimeType: 'image/jpeg' }
            };
            const textPart = { text: prompt };
    
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [imagePart, textPart] },
              config: { responseModalities: [Modality.IMAGE] }
            });
            
            const generatedImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!generatedImagePart || !generatedImagePart.inlineData) {
                throw new Error('No image was generated by the model.');
            }
    
            const newImageBase64 = generatedImagePart.inlineData.data;
            res.status(200).json({ base64Image: newImageBase64 });
        } else {
            return res.status(500).send('Character data is invalid or missing an image URL.');
        }
    } catch (error) {
        console.error('Error generating visualization:', error);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});