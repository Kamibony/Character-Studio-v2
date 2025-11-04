import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- PRIDANÉ

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // --- PRIDANÝ BLOK ---
  build: {
    // Smeruj výstup o úroveň vyššie a do backend/public
    outDir: path.resolve(__dirname, '../backend/public'),
    emptyOutDir: true,
  },
  // --------------------

  server: {
    proxy: {
      // Staré endpointy (môžu ostať pre Fázu 0)
      '/getCharacterLibrary': 'http://localhost:8080',
      '/getCharacterById': 'http://localhost:8080',
      '/createCharacterPair': 'http://localhost:8080',
      '/generateCharacterVisualization': 'http://localhost:8080',
      '/saveVisualization': 'http://localhost:8080',

      // Nové endpointy Fázy 1
      '/startCharacterTraining': 'http://localhost:8080',
      '/getTrainedCharacterById': 'http://localhost:8080',
      '/generateImageFromTrainedCharacter': 'http://localhost:8080',
    }
  }
})
