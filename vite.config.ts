import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, encaminha /auth para a API (PersonalControl.Api).
    // Assim o navegador não precisa de CORS.
    proxy: {
      '/auth': 'http://localhost:5168',
    },
  },
})
