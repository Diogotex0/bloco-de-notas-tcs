import { aoTeclar } from './atalhos'
import { aoColar } from './colar'
import { janelaFlutuante, setJanelaFlutuante } from './janela'
import { talvezLembrar } from './lembrete'
import { useUi } from '../store/ui'
import { toast } from '../store/toast'

interface DocumentPiP {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>
}
const api = (): DocumentPiP | undefined => (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture

export const janelaFlutuanteSuportada = () => !!api()

/** Copia o visual (estilos, fontes e tema) da aba para a janela flutuante. */
function copiarVisual(destino: Document) {
  const base = destino.createElement('base')
  base.href = location.href // faz fontes e arquivos com caminho relativo funcionarem lá
  destino.head.appendChild(base)
  const meta = destino.createElement('meta')
  meta.setAttribute('charset', 'utf-8')
  destino.head.appendChild(meta)
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => destino.head.appendChild(n.cloneNode(true)))
  destino.title = 'Bloco de Poderes'
  destino.documentElement.lang = 'pt-BR'
  destino.documentElement.dataset.theme = document.documentElement.dataset.theme ?? 'light'
}

export async function abrirJanelaFlutuante() {
  if (janelaFlutuante()) {
    janelaFlutuante()!.focus()
    return
  }
  const pipApi = api()
  if (!pipApi) {
    toast('Este navegador não tem janela flutuante. Dica: arraste a aba para fora e use Win + → para deixar o bloco ao lado.', {
      type: 'info',
      duration: 9000,
    })
    return
  }
  let w: Window
  try {
    w = await pipApi.requestWindow({ width: 430, height: 720 })
  } catch (err) {
    console.warn('Janela flutuante recusada:', err)
    toast('Não foi possível abrir a janela flutuante. Dica: arraste a aba para fora e use Win + → para deixar o bloco ao lado.', {
      type: 'warn',
      duration: 9000,
    })
    return
  }
  montarJanela(w)
}

/** Prepara uma janela (a flutuante) para receber o bloco. */
export function montarJanela(w: Window) {
  copiarVisual(w.document)
  const raiz = w.document.createElement('div')
  raiz.id = 'raiz-flutuante'
  w.document.body.appendChild(raiz)

  setJanelaFlutuante(w)
  w.addEventListener('keydown', aoTeclar)
  w.document.addEventListener('paste', aoColar)
  w.addEventListener('blur', () => window.setTimeout(() => !w.closed && !w.document.hasFocus() && !document.hasFocus() && talvezLembrar(), 300))
  w.addEventListener('pagehide', () => {
    setJanelaFlutuante(null)
    useUi.getState().setPip(null)
  })
  useUi.getState().setPip(raiz)
}

export function fecharJanelaFlutuante() {
  janelaFlutuante()?.close()
}
