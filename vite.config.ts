import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

// Versão do site (src/novidades.json). Vai também para version.json, usado para avisar quem está com o site aberto.
const { versao } = JSON.parse(readFileSync(new URL('./src/novidades.json', import.meta.url), 'utf-8')) as { versao: string }

// "npm run build:portatil" gera uma versão que abre com dois cliques, sem servidor e sem internet.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'portatil' ? [viteSingleFile()] : []),
    {
      name: 'arquivo-de-versao',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ versao }) })
      },
    },
  ],
  build: { outDir: mode === 'portatil' ? 'dist-portatil' : 'dist' },
}))
