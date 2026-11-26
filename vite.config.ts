import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = 'http://localhost:5168'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, encaminha as rotas da API (PersonalControl.Api) para o backend.
    // Assim o navegador não precisa de CORS.
    proxy: {
      '/auth': API,
      '/admin': API,
      '/accounts': API,
      '/categories': API,
      '/transactions': API,
      '/budgets': API,
      '/dashboard': API,
      '/cards': API,
      '/goals': API,
      '/open-finance': API,
    },
  },
})
