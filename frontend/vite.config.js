import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (y compris sans préfixe VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  // Cible backend : VITE_BACKEND_URL (réseau) ou localhost par défaut
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Toutes les requêtes /api passent par le proxy Vite → CORS éliminé
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        // WebSocket proxifié aussi
        '/ws': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
