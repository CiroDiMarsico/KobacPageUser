import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/product-images': 'http://localhost:3000',
      '/promo-images': 'http://localhost:3000', 
      '/carousel-images': 'http://localhost:3000',
    }
  }
})
