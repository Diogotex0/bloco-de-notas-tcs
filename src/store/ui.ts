import { create } from 'zustand'
import type { SectionKey } from '../lib/types'
import { janela, janelaFlutuante, menosMovimento, porId } from '../lib/janela'

export type Theme = 'light' | 'dark'
export type Filtro = 'abertas' | 'finalizadas' | 'lixeira'
const THEME_KEY = 'bloco-poderes:tema'

const temaInicial = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

interface UiState {
  /** Só uma etapa fica aberta por vez, para a tela não ficar carregada. */
  aberta: SectionKey | null
  navOpen: boolean
  theme: Theme
  filtro: Filtro
  setFiltro: (f: Filtro) => void
  /** Onde a janela flutuante desenha a tela (null = fechada). */
  pip: HTMLElement | null
  setPip: (el: HTMLElement | null) => void
  miniAba: 'etapas' | 'resumo'
  setMiniAba: (a: 'etapas' | 'resumo') => void
  abrirEtapa: (k: SectionKey | null, rolar?: boolean) => void
  alternarEtapa: (k: SectionKey) => void
  setNav: (v: boolean) => void
  toggleTheme: () => void
}

/** Depois que a etapa abre, rola a tela até o topo dela. */
let rolagem = 0
function rolarAte(k: SectionKey) {
  // Espera a etapa anterior terminar de fechar (posição estável) antes de rolar; senão a tela para no lugar errado.
  const id = ++rolagem
  let ultimo = NaN
  let estavel = 0
  const inicio = performance.now()
  const passo = () => {
    if (id !== rolagem) return
    const el = porId(`sec-${k}`)
    if (!el) return
    const abs = el.getBoundingClientRect().top + janela().scrollY
    estavel = Math.abs(abs - ultimo) < 1 ? estavel + 1 : 0
    ultimo = abs
    if (estavel < 3 && performance.now() - inicio < 1200) {
      requestAnimationFrame(passo)
      return
    }
    const top = el.getBoundingClientRect().top
    if (top < 76 || top > janela().innerHeight * 0.45) {
      const reduz = menosMovimento()
      el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' })
    }
  }
  window.setTimeout(passo, 120)
}

export const useUi = create<UiState>()((set, get) => ({
  aberta: null, // o App escolhe qual abrir ao carregar a anotação
  navOpen: false,
  theme: temaInicial(),
  filtro: 'abertas',
  setFiltro: (filtro) => set({ filtro }),
  pip: null,
  setPip: (pip) => set({ pip }),
  miniAba: 'etapas',
  setMiniAba: (miniAba) => set({ miniAba }),
  abrirEtapa: (k, rolar = false) => {
    set({ aberta: k })
    if (k && rolar) rolarAte(k)
  },
  alternarEtapa: (k) => {
    const abrindo = get().aberta !== k
    set({ aberta: abrindo ? k : null })
    if (abrindo) rolarAte(k)
  },
  setNav: (navOpen) => set({ navOpen }),
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.add('theme-anim')
    root.dataset.theme = theme
    const pipDoc = janelaFlutuante()?.document
    if (pipDoc) pipDoc.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignora */
    }
    window.setTimeout(() => root.classList.remove('theme-anim'), 400)
    set({ theme })
  },
}))
