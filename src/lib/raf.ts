import { janelaFlutuante } from './janela'

/**
 * Com a janela flutuante aberta, a aba de origem pode ficar escondida (você troca para o Salesforce)
 * e o Chrome pausa o relógio de animação dela, congelando a tela flutuante.
 * Aqui o relógio passa a vir da própria janela flutuante, que está sempre visível.
 * Este arquivo precisa ser importado antes de qualquer biblioteca de animação.
 */
const original = window.requestAnimationFrame.bind(window)
const cancelarOriginal = window.cancelAnimationFrame.bind(window)

let seq = 0
const pendentes = new Map<number, { w: Window | null; id: number }>()

window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  const meu = ++seq
  const pip = janelaFlutuante()
  const chamar = () => {
    pendentes.delete(meu)
    cb(performance.now()) // sempre o relógio da aba, para as animações não "pularem"
  }
  const id = pip ? pip.requestAnimationFrame(chamar) : original(chamar)
  pendentes.set(meu, { w: pip, id })
  return meu
}

window.cancelAnimationFrame = (meu: number) => {
  const p = pendentes.get(meu)
  if (!p) return
  pendentes.delete(meu)
  if (p.w && !p.w.closed) p.w.cancelAnimationFrame(p.id)
  else cancelarOriginal(p.id)
}
