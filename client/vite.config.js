import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The TV and the gabbai's phone load this from another device on the LAN. Vite
  // binds to localhost only by default, which they cannot reach.
  server: { host: true },
})
