import { create } from 'zustand'
import { anexosPendentes } from './anexos'
import { useNotes } from '../store/notes'
import { toast } from '../store/toast'

const CHAVE = 'bloco-poderes:lembrete'
const INTERVALO = 10 * 60 * 1000 // no máximo um aviso a cada 10 minutos por anotação

const lerPreferencia = () => {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

export const useLembrete = create<{ ativo: boolean }>(() => ({ ativo: lerPreferencia() }))

const suportado = () => typeof Notification !== 'undefined'

export async function alternarLembrete() {
  const ligar = !useLembrete.getState().ativo
  if (ligar) {
    if (!suportado()) {
      toast('Este navegador não permite notificações.', { type: 'warn' })
      return
    }
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      toast('O navegador bloqueou as notificações. Libere nas configurações do site para usar o lembrete.', { type: 'warn', duration: 6000 })
      return
    }
  }
  try {
    localStorage.setItem(CHAVE, ligar ? '1' : '0')
  } catch {
    /* ignora */
  }
  useLembrete.setState({ ativo: ligar })
  toast(ligar ? 'Lembrete ligado: avisamos se você sair com anexo pendente.' : 'Lembrete desligado', { type: 'success' })
}

const ultimoAviso = new Map<string, number>()

/** Chamado quando o usuário sai da tela do bloco (troca de aba ou de programa). */
export function talvezLembrar() {
  if (!useLembrete.getState().ativo || !suportado() || Notification.permission !== 'granted') return
  const s = useNotes.getState()
  const n = s.notes.find((x) => x.id === s.currentId)
  if (!n || n.excluidaEm) return
  const pend = anexosPendentes(n)
  if (!pend.length) return
  const agora = Date.now()
  if (agora - (ultimoAviso.get(n.id) ?? 0) < INTERVALO) return
  ultimoAviso.set(n.id, agora)
  try {
    new Notification('Não esqueça de anexar', {
      body: `${n.razaoSocial.trim() || 'Anotação atual'}: ${pend.map((a) => a.texto.toLowerCase()).join(', ')}`,
      tag: `anexos-${n.id}`,
    })
  } catch {
    /* alguns navegadores só permitem notificação via service worker; nesse caso, ignora */
  }
}
