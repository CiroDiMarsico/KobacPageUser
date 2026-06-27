import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      tailwindcss(),
      react()
    ],
    server: {
      proxy: {
        '/api': env.VITE_LINK,
        '/product-images': env.VITE_LINK,
        '/promo-images': env.VITE_LINK,
        '/carousel-images': env.VITE_LINK,
      }
    }
  }
})