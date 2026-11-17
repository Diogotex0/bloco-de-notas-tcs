import './lib/raf' // precisa vir primeiro: relógio das animações da janela flutuante
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { concluirCarregamento, vigiarAtualizacoes } from './lib/splash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Tira a tela de carregamento depois do primeiro desenho. O setTimeout garante que funcione
// mesmo com a aba em segundo plano (onde o navegador não desenha quadros).
let concluido = false
const concluir = () => {
  if (concluido) return
  concluido = true
  concluirCarregamento()
}
requestAnimationFrame(() => requestAnimationFrame(concluir))
window.setTimeout(concluir, 120)
vigiarAtualizacoes()
