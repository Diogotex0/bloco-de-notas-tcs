import { create } from 'zustand'
import { type Modelo, modeloPadrao, normalizarModelo } from '../lib/modelo'

const CHAVE = 'bloco-poderes:modelo'

const ler = (): Modelo => {
  try {
    const raw = localStorage.getItem(CHAVE)
    return raw ? normalizarModelo(JSON.parse(raw)) : modeloPadrao()
  } catch {
    return modeloPadrao()
  }
}

export const useModelo = create<{ modelo: Modelo; editorAberto: boolean }>(() => ({ modelo: ler(), editorAberto: false }))

export function salvarModelo(m: Modelo) {
  const modelo = normalizarModelo(m)
  try {
    localStorage.setItem(CHAVE, JSON.stringify(modelo))
  } catch {
    /* ignora: continua valendo nesta sessão */
  }
  useModelo.setState({ modelo })
}

export const abrirEditorModelo = () => useModelo.setState({ editorAberto: true })

// Mantém abas abertas em sincronia.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) useModelo.setState({ modelo: ler() })
  })
}
