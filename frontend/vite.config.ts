
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/getCharacterLibrary': 'http://localhost:8080',
      '/getCharacterById': 'http://localhost:8080',
      '/createCharacterPair': 'http://localhost:8080',
      '/generateCharacterVisualization': 'http://localhost:8080',
    }
  }
})
