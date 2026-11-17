import { copiarAnotacao, focarQuandoExistir } from './actions'
import { tratarEnter } from './teclado'
import { janelaFlutuante } from './janela'
import { useNotes } from '../store/notes'
import { useUi } from '../store/ui'

/** Atalhos de teclado. Valem na aba e na janela flutuante. */
export function aoTeclar(e: KeyboardEvent) {
  if (tratarEnter(e)) return
  const k = e.key.toLowerCase()
  if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'k') {
    if (janelaFlutuante()) return // a busca fica na aba principal
    e.preventDefault()
    useUi.getState().setNav(true)
    const el = document.getElementById('busca') as HTMLInputElement | null
    el?.focus()
    el?.select()
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'n') {
    e.preventDefault()
    useNotes.getState().criar()
    useUi.getState().setMiniAba('etapas')
    focarQuandoExistir('f-cnpj')
  } else if (e.altKey && !e.ctrlKey && !e.metaKey && k === 'c') {
    e.preventDefault()
    void copiarAnotacao().then((r) => window.dispatchEvent(new CustomEvent('copiar-resultado', { detail: r })))
  } else if (k === 'escape' && useUi.getState().navOpen) {
    useUi.getState().setNav(false)
  }
}
