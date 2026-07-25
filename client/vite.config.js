import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The TV and the gabbai's phone load this from another device on the LAN. Vite
    // binds to localhost only by default, which they cannot reach.
    host: true,
    // The client asks for a relative '/api' (see src/services/api.js). In production one
    // Express process serves the page and the API together, so that resolves on its own;
    // in development the page is on 5173 and the API on 5000, so the dev server forwards.
    // The point is that both environments run the SAME client code — the alternative was
    // a hardcoded port that only ever worked in one of them.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
