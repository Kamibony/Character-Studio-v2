import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
