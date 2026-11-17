import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// "npm run build:portatil" gera uma versão que abre com dois cliques, sem servidor e sem internet.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'portatil' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'portatil' ? 'dist-portatil' : 'dist' },
}))
