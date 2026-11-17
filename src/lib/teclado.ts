import type { SectionKey } from './types'
import { SECTIONS } from './defaults'
import { useUi } from '../store/ui'
import { porId } from './janela'

/** Campos onde o Enter "para": inputs, selects, textareas e grupos de opções (Sim/Não etc.). */
function paradas(sec: Element): HTMLElement[] {
  return [...sec.querySelectorAll<HTMLElement>('input, select, textarea, [role=radiogroup]')].filter((el) => {
    if (el.hasAttribute('data-pular')) return false
    if ((el as HTMLInputElement).disabled) return false
    if (el.tagName === 'INPUT' && ['hidden', 'file'].includes((el as HTMLInputElement).type)) return false
    if (el.parentElement?.closest('[role=radiogroup]')) return false
    return el.getClientRects().length > 0
  })
}

function focar(el: HTMLElement) {
  if (el.getAttribute('role') === 'radiogroup') {
    const alvo = el.querySelector<HTMLElement>('[aria-checked=true]') ?? el.querySelector<HTMLElement>('button')
    alvo?.focus()
  } else el.focus()
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

/** Abre a etapa e coloca o cursor no primeiro campo dela. */
export function irParaEtapa(k: SectionKey) {
  useUi.getState().abrirEtapa(k, true)
  const inicio = performance.now()
  const tentar = () => {
    const sec = porId(`sec-${k}`)
    const lista = sec ? paradas(sec) : []
    if (lista.length) {
      const el = lista[0]
      const alvo =
        el.getAttribute('role') === 'radiogroup'
          ? (el.querySelector<HTMLElement>('[aria-checked=true]') ?? el.querySelector<HTMLElement>('button'))
          : el
      alvo?.focus({ preventScroll: true })
      return
    }
    // Etapa sem campos ainda (ex.: nenhum grupo): foca o primeiro botão, como "Adicionar grupo".
    if (sec && performance.now() - inicio > 350) {
      const botao = [...sec.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].find(
        (b) => b.parentElement !== sec && !b.closest('[role=radiogroup]') && b.getClientRects().length,
      )
      if (botao) {
        botao.focus({ preventScroll: true })
        return
      }
    }
    if (performance.now() - inicio < 1000) requestAnimationFrame(tentar)
  }
  requestAnimationFrame(tentar)
}

export function proximaEtapa(atual?: SectionKey | null) {
  const k = atual ?? useUi.getState().aberta
  const i = SECTIONS.findIndex((s) => s.key === k)
  const prox = SECTIONS[i + 1]
  if (prox) irParaEtapa(prox.key)
}

/** Trata Enter e Ctrl+Enter dentro das etapas. Devolve true se tratou a tecla. */
export function tratarEnter(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.defaultPrevented) return false
  const t = e.target as HTMLElement
  const sec = t.closest?.('section[id^="sec-"]')
  const chave = (sec?.id.slice(4) ?? null) as SectionKey | null

  if (e.ctrlKey || e.metaKey) {
    if (!chave && !useUi.getState().aberta) return false
    e.preventDefault()
    proximaEtapa(chave)
    return true
  }
  if (!sec) return false
  // Enter em textarea pula linha; em botões comuns, clica. Só avança em campos e grupos de opções.
  if (t.tagName === 'TEXTAREA') return false
  const grupo = t.closest('[role=radiogroup]')
  if (t.tagName === 'BUTTON' && !grupo) return false
  if (t.tagName === 'BUTTON' && t.closest('section > button')) return false

  e.preventDefault()
  const lista = paradas(sec)
  const atual = (grupo as HTMLElement | null) ?? t
  const i = lista.indexOf(atual)
  const prox = i >= 0 ? lista[i + 1] : undefined
  if (prox) focar(prox)
  else proximaEtapa(chave)
  return true
}
