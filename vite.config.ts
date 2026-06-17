import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { apiPlugin } from './vite-plugins/api'

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
})
