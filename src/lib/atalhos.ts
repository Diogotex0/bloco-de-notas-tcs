import { copiarAnotacao, focarQuandoExistir } from './actions'
import { tratarEnter } from './teclado'
import { janelaFlutuante } from './janela'
import { useNotes } from '../store/notes'
import { useUi } from '../store/ui'
import { toast } from '../store/toast'
import { abrirRespostas } from '../store/referencia'

/** Atalhos de teclado. Valem na aba e na janela flutuante. */
export function aoTeclar(e: KeyboardEvent) {
  if (tratarEnter(e)) return
  const k = e.key.toLowerCase()
  const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey
  // Ctrl+Z / Ctrl+Y: desfazer e refazer qualquer alteração da anotação.
  if (ctrl && (k === 'z' || k === 'y')) {
    const alvo = (e.target as HTMLElement | null)?.id
    if (alvo === 'busca' || alvo === 'f-filiaisInput') return // esses campos usam o desfazer normal
    if ((e.target as HTMLElement | null)?.closest?.('[data-desfazer-nativo]')) return
    e.preventDefault()
    const refazer = k === 'y' || e.shiftKey
    const ok = refazer ? useNotes.getState().refazer() : useNotes.getState().desfazer()
    if (ok) toast(refazer ? 'Alteração refeita' : 'Alteração desfeita', { duration: 1400 })
    return
  }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'k') {
    if (janelaFlutuante()) return // a busca fica na aba principal
    e.preventDefault()
    useUi.getState().setNav(true)
    const el = document.getElementById('busca') as HTMLInputElement | null
    el?.focus()
    el?.select()
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'm') {
    e.preventDefault()
    if (!janelaFlutuante()) useUi.getState().alternarFoco()
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'n') {
    e.preventDefault()
    useNotes.getState().criar()
    useUi.getState().setMiniAba('etapas')
    focarQuandoExistir('f-cnpj')
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'c') {
    e.preventDefault()
    void copiarAnotacao().then((r) => window.dispatchEvent(new CustomEvent('copiar-resultado', { detail: r })))
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'r') {
    e.preventDefault()
    abrirRespostas()
  } else if (k === 'escape' && useUi.getState().navOpen) {
    useUi.getState().setNav(false)
  }
}
